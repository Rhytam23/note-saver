import { describe, it, expect } from 'vitest';
import { processingJobQueue } from '../processingJobQueue';

describe('NoteNirman 2.0 P3.2 Suite — Processing Job System', () => {

  it('1. should enqueue job, prevent active duplicate jobs, and update job state', async () => {
    const job1 = await processingJobQueue.enqueueJob({
      attachmentId: 'att-job-1',
      noteId: 'note-job-1',
      jobType: 'pdf_extract',
    });

    expect(job1.jobId).toBeDefined();
    expect(job1.status).toBe('queued');

    // Duplicate check
    const job1Dup = await processingJobQueue.enqueueJob({
      attachmentId: 'att-job-1',
      noteId: 'note-job-1',
      jobType: 'pdf_extract',
    });
    expect(job1Dup.jobId).toBe(job1.jobId);

    // Progress update
    const updated = await processingJobQueue.updateJobStatus(job1.jobId, 'processing', 50);
    expect(updated?.status).toBe('processing');
    expect(updated?.progressPercent).toBe(50);
    expect(updated?.attempts).toBe(1);

    // Complete job
    const completed = await processingJobQueue.updateJobStatus(job1.jobId, 'completed', 100, { extractedPages: 5 });
    expect(completed?.status).toBe('completed');
    expect(completed?.resultData?.extractedPages).toBe(5);
  });

});
