import { openDB, type DBSchema, type IDBPDatabase } from 'idb';
import { v4 as uuidv4 } from 'uuid';
import type { ExtractionJob, CreateJobPayload, JobStatus } from '../types/job';

interface JobsDB extends DBSchema {
  jobs: {
    key: string;
    value: ExtractionJob;
    indexes: { 'by-attachment': string; 'by-status': string };
  };
}

const DB_NAME = 'notenirman-jobs-db';
const DB_VERSION = 1;
const STALE_JOB_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes

let dbPromise: Promise<IDBPDatabase<JobsDB>> | null = null;

function isIndexedDbAvailable(): boolean {
  return typeof window !== 'undefined' && typeof window.indexedDB !== 'undefined';
}

function getDB(): Promise<IDBPDatabase<JobsDB>> {
  if (!dbPromise) {
    dbPromise = openDB<JobsDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains('jobs')) {
          const store = db.createObjectStore('jobs', { keyPath: 'jobId' });
          store.createIndex('by-attachment', 'attachmentId');
          store.createIndex('by-status', 'status');
        }
      },
    });
  }
  return dbPromise;
}

export class ProcessingJobQueue {
  private memJobs: Map<string, ExtractionJob> = new Map();

  public async enqueueJob(payload: CreateJobPayload): Promise<ExtractionJob> {
    const existing = await this.getJobForAttachment(payload.attachmentId, payload.jobType);
    if (existing && (existing.status === 'queued' || existing.status === 'processing')) {
      return existing;
    }

    const now = new Date().toISOString();
    const job: ExtractionJob = {
      jobId: uuidv4(),
      attachmentId: payload.attachmentId,
      noteId: payload.noteId,
      jobType: payload.jobType,
      status: 'queued',
      progressPercent: 0,
      attempts: 0,
      maxAttempts: payload.maxAttempts || 3,
      createdAt: now,
      updatedAt: now,
    };

    if (!isIndexedDbAvailable()) {
      this.memJobs.set(job.jobId, { ...job });
      return { ...job };
    }

    const db = await getDB();
    await db.put('jobs', job);
    return { ...job };
  }

  public async updateJobStatus(
    jobId: string,
    status: JobStatus,
    progressPercent = 0,
    resultData?: Record<string, any>,
    errorMessage?: string
  ): Promise<ExtractionJob | null> {
    const job = await this.getJob(jobId);
    if (!job) return null;

    const updated: ExtractionJob = {
      ...job,
      status,
      progressPercent,
      attempts: status === 'processing' ? job.attempts + 1 : job.attempts,
      resultData: resultData || job.resultData,
      errorMessage: errorMessage || job.errorMessage,
      updatedAt: new Date().toISOString(),
    };

    if (!isIndexedDbAvailable()) {
      this.memJobs.set(jobId, { ...updated });
      return { ...updated };
    }

    const db = await getDB();
    await db.put('jobs', updated);
    return { ...updated };
  }

  public async getJob(jobId: string): Promise<ExtractionJob | null> {
    if (!isIndexedDbAvailable()) {
      const j = this.memJobs.get(jobId);
      return j ? { ...j } : null;
    }
    const db = await getDB();
    const j = await db.get('jobs', jobId);
    return j ? { ...j } : null;
  }

  public async getJobForAttachment(attachmentId: string, jobType: string): Promise<ExtractionJob | null> {
    if (!isIndexedDbAvailable()) {
      let found: ExtractionJob | null = null;
      this.memJobs.forEach(j => {
        if (j.attachmentId === attachmentId && j.jobType === jobType) found = { ...j };
      });
      return found;
    }

    const db = await getDB();
    const list = await db.getAllFromIndex('jobs', 'by-attachment', attachmentId);
    const match = list.find(j => j.jobType === jobType);
    return match ? { ...match } : null;
  }

  public async getPendingJobs(): Promise<ExtractionJob[]> {
    await this.recoverStaleJobs();

    if (!isIndexedDbAvailable()) {
      const list: ExtractionJob[] = [];
      this.memJobs.forEach(j => {
        if (j.status === 'queued' || j.status === 'processing') list.push({ ...j });
      });
      return list;
    }

    const db = await getDB();
    const queued = await db.getAllFromIndex('jobs', 'by-status', 'queued');
    const processing = await db.getAllFromIndex('jobs', 'by-status', 'processing');
    return [...queued, ...processing];
  }

  /**
   * Resets jobs stuck in `processing` state for > STALE_JOB_TIMEOUT_MS back to `queued`
   * or marks them `failed` if max attempts exceeded.
   */
  public async recoverStaleJobs(): Promise<number> {
    const now = Date.now();
    let recoveredCount = 0;

    if (!isIndexedDbAvailable()) {
      this.memJobs.forEach((j, id) => {
        if (j.status === 'processing') {
          const lastUpdate = new Date(j.updatedAt).getTime();
          if (now - lastUpdate > STALE_JOB_TIMEOUT_MS) {
            const nextStatus: JobStatus = j.attempts >= j.maxAttempts ? 'failed' : 'queued';
            this.memJobs.set(id, {
              ...j,
              status: nextStatus,
              errorMessage: nextStatus === 'failed' ? 'Job processing timed out' : j.errorMessage,
              updatedAt: new Date().toISOString(),
            });
            recoveredCount++;
          }
        }
      });
      return recoveredCount;
    }

    const db = await getDB();
    const processingJobs = await db.getAllFromIndex('jobs', 'by-status', 'processing');

    for (const job of processingJobs) {
      const lastUpdate = new Date(job.updatedAt).getTime();
      if (now - lastUpdate > STALE_JOB_TIMEOUT_MS) {
        const nextStatus: JobStatus = job.attempts >= job.maxAttempts ? 'failed' : 'queued';
        await db.put('jobs', {
          ...job,
          status: nextStatus,
          errorMessage: nextStatus === 'failed' ? 'Job processing timed out' : job.errorMessage,
          updatedAt: new Date().toISOString(),
        });
        recoveredCount++;
      }
    }

    return recoveredCount;
  }

  public async _forceSetJobUpdatedAtForTest(jobId: string, timestampIso: string): Promise<void> {
    const job = await this.getJob(jobId);
    if (!job) return;
    const updated = { ...job, updatedAt: timestampIso };
    if (!isIndexedDbAvailable()) {
      this.memJobs.set(jobId, updated);
      return;
    }
    const db = await getDB();
    await db.put('jobs', updated);
  }
}

export const processingJobQueue = new ProcessingJobQueue();
