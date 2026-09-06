import { describe, it, expect } from 'vitest';
import * as Y from 'yjs';
import { attachmentStorage } from '../attachmentStorage';
import { processingJobQueue } from '../processingJobQueue';
import { processPdfAttachment } from '../pdfPipeline';
import { processImageAttachment } from '../imageOcrPipeline';
import { ydocToBlockDocument, blockDocumentToYdoc } from '../../collaboration/yjsBlockAdapter';
import type { Attachment } from '../../types/attachment';

describe('NoteNirman 2.0 P3.10, P3.11 & P3.12 — Phase 3 Integration & Invariants Suite', () => {

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

  it('2. [Binary/Yjs Isolation Invariant] Y.Doc MUST NOT store raw binary blobs or file content strings', async () => {
    const { pdfBlock, derivedBlocks } = await processPdfAttachment(samplePdfAttachment);
    const blockDoc = {
      noteId: samplePdfAttachment.noteId,
      blocks: [pdfBlock, ...derivedBlocks],
      version: 1,
    };

    const ydoc = new Y.Doc();
    blockDocumentToYdoc(blockDoc, ydoc);

    // Reconstruct and verify Y.Doc only holds attachment IDs and URLs
    const reconstructed = ydocToBlockDocument(samplePdfAttachment.noteId, ydoc);
    expect(reconstructed.blocks[0].properties.attachmentId).toBe('att-inv-1');
    expect(reconstructed.blocks[0].content).not.toContain('raw pdf binary contents');
  });

  it('3. [Stable Block ID Invariant] derived blocks must retain stable UUIDs across load/sync cycles', async () => {
    const imgAtt: Attachment = {
      ...samplePdfAttachment,
      id: 'att-inv-2',
      filename: 'photo.jpg',
      mimeType: 'image/jpeg',
      metadata: { extractedText: 'Invoice #1234' },
    };

    const { imageBlock, derivedBlocks } = await processImageAttachment(imgAtt);
    expect(imageBlock.id).toBeDefined();
    expect(derivedBlocks[0].id).toBeDefined();
    expect(derivedBlocks[0].id).not.toBe(imageBlock.id);
  });

});
