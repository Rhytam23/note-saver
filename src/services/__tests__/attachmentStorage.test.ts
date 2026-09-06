import { describe, it, expect } from 'vitest';
import { attachmentStorage } from '../attachmentStorage';
import { validateAttachmentSize, type Attachment } from '../../types/attachment';

describe('NoteNirman 2.0 P3.1 Suite — Attachment Model & Storage Boundary', () => {

  it('1. should validate attachment size limits correctly according to platform policy', () => {
    const valid = validateAttachmentSize(10 * 1024 * 1024, 'application/pdf', false);
    expect(valid.valid).toBe(true);

    const invalidPdf = validateAttachmentSize(60 * 1024 * 1024, 'application/pdf', false);
    expect(invalidPdf.valid).toBe(false);
    expect(invalidPdf.error).toContain('PDF file size exceeds');
  });

  it('2. should save, read, and list attachments in dedicated storage', async () => {
    const sampleAttachment: Attachment = {
      id: 'att-uuid-101',
      noteId: 'note-att-1',
      filename: 'sample.pdf',
      mimeType: 'application/pdf',
      sizeBytes: 1024,
      checksumSha256: 'mock-sha-256',
      localUri: 'att-uuid-101',
      status: 'local_only',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const dummyBlob = new Blob(['sample pdf content'], { type: 'application/pdf' });
    await attachmentStorage.saveAttachment(sampleAttachment, dummyBlob);

    const meta = await attachmentStorage.getAttachmentMeta('att-uuid-101');
    expect(meta).not.toBeNull();
    expect(meta?.filename).toBe('sample.pdf');

    const readBlob = await attachmentStorage.readAttachmentData('att-uuid-101');
    expect(readBlob).not.toBeNull();

    const list = await attachmentStorage.listAttachmentsForNote('note-att-1');
    expect(list).toHaveLength(1);
    expect(list[0].id).toBe('att-uuid-101');

    await attachmentStorage.deleteAttachment('att-uuid-101');
    const deletedMeta = await attachmentStorage.getAttachmentMeta('att-uuid-101');
    expect(deletedMeta).toBeNull();
  });

});
