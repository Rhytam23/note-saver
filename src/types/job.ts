/**
 * NoteNirman 2.0 — Processing Job Queue Data Model
 * 
 * Invariants:
 * - Dedicated processing queue decoupled from database `syncQueue`.
 * - Processing state survives application restart.
 * - Failed extraction MUST NOT delete or corrupt original attachment.
 */

export type JobType = 'pdf_extract' | 'audio_transcribe' | 'image_ocr' | 'web_clip' | 'search_index';

export type JobStatus = 'queued' | 'processing' | 'completed' | 'failed' | 'cancelled';

export interface ExtractionJob {
  jobId: string; // UUID
  attachmentId: string;
  noteId: string;
  jobType: JobType;
  status: JobStatus;
  progressPercent: number;
  attempts: number;
  maxAttempts: number;
  errorMessage?: string;
  resultData?: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

export interface CreateJobPayload {
  attachmentId: string;
  noteId: string;
  jobType: JobType;
  maxAttempts?: number;
}
