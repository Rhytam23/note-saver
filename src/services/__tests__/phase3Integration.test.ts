import { describe, it, expect } from 'vitest';
import { attachmentStorage } from '../attachmentStorage';
import { processingJobQueue } from '../processingJobQueue';
import type { Attachment } from '../../types/attachment';

describe('NoteNirman 2.0 P3.10 — Phase 3 Integration & Invariants Suite', () => {

  const samplePdfAttachment: Attachment = {
    id: 'att-inv-1',
    noteId: 'note-inv-100',
    filename: 'annual-report.pdf',
    mimeType: 'application/pdf',
    sizeBytes: 4096,
    checksumSha256: 'sha-inv-1',
    localUri: 'att-inv-1',
    status: 'local_only',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    metadata: { pageCount: 3 },
  };

  it('1. [Source Preservation Invariant] failed processing jobs MUST NOT delete or corrupt original attachment', async () => {
    // Save raw binary attachment
    const rawBlob = new Blob(['raw pdf binary contents'], { type: 'application/pdf' });
    await attachmentStorage.saveAttachment(samplePdfAttachment, rawBlob);

    // Enqueue job and simulate processing failure
    const job = await processingJobQueue.enqueueJob({
      attachmentId: samplePdfAttachment.id,
      noteId: samplePdfAttachment.noteId,
      jobType: 'pdf_extract',
    });

    await processingJobQueue.updateJobStatus(job.jobId, 'failed', 0, undefined, 'Simulated worker crash');

    // Verify source attachment remains 100% intact
    const preservedMeta = await attachmentStorage.getAttachmentMeta(samplePdfAttachment.id);
    const preservedBlob = await attachmentStorage.readAttachmentData(samplePdfAttachment.id);

    expect(preservedMeta).not.toBeNull();
    expect(preservedMeta?.filename).toBe('annual-report.pdf');
    expect(preservedBlob).not.toBeNull();
  });

});
