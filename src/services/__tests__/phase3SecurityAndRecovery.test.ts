import { describe, it, expect } from 'vitest';
import { isValidPublicUrl, createBookmarkBlockFromClip } from '../webClipper';
import { getStoragePath } from '../storagePathHelper';
import { processingJobQueue } from '../processingJobQueue';
import { createSamplePoint } from '../handwritingService';

describe('NoteNirman 2.0 P3 Security, Storage Paths & Job Recovery Suite', () => {

  describe('SSRF Protection Rules (P3.8)', () => {
    it('1. should reject unsafe protocols, credentials, loopback, link-local, and private IP addresses', () => {
      // Valid URLs
      expect(isValidPublicUrl('https://example.com/article')).toBe(true);
      expect(isValidPublicUrl('http://subdomain.domain.org/path?q=1')).toBe(true);

      // Rule 1: Invalid protocols
      expect(isValidPublicUrl('ftp://example.com/file')).toBe(false);
      expect(isValidPublicUrl('file:///etc/passwd')).toBe(false);
      expect(isValidPublicUrl('gopher://example.com')).toBe(false);

      // Rule 2: Embedded credentials
      expect(isValidPublicUrl('https://admin:secret@example.com')).toBe(false);

      // Rule 3 & 4: Localhost and local TLDs
      expect(isValidPublicUrl('http://localhost:3000')).toBe(false);
      expect(isValidPublicUrl('http://app.local')).toBe(false);
      expect(isValidPublicUrl('http://internal.lan')).toBe(false);

      // Rule 5: IPv4 loopback, private, and link-local (AWS metadata 169.254.169.254)
      expect(isValidPublicUrl('http://127.0.0.1/admin')).toBe(false);
      expect(isValidPublicUrl('http://10.0.0.1')).toBe(false);
      expect(isValidPublicUrl('http://172.16.0.1')).toBe(false);
      expect(isValidPublicUrl('http://192.168.1.1')).toBe(false);
      expect(isValidPublicUrl('http://169.254.169.254/latest/meta-data/')).toBe(false);

      // Rule 6: Decimal IP encodings
      expect(isValidPublicUrl('http://2130706433')).toBe(false);
    });

    it('2. createBookmarkBlockFromClip should throw error on SSRF URL', () => {
      expect(() => createBookmarkBlockFromClip('note-sec-1', {
        url: 'http://169.254.169.254/latest/meta-data/',
        title: 'Malicious Metadata Fetch',
      })).toThrowError('Security validation failed');
    });
  });

  describe('Supabase Storage Path Helper (P3.11)', () => {
    it('3. getStoragePath should construct sanitized {user_id}/{note_id}/{attachment_id} path', () => {
      const path = getStoragePath('user-abc-123', 'note-xyz-789', 'att-uuid-555');
      expect(path).toBe('user-abc-123/note-xyz-789/att-uuid-555');
    });

    it('4. getStoragePath should throw error if required parameters are missing', () => {
      expect(() => getStoragePath('', 'note-1', 'att-1')).toThrowError();
    });
  });

  describe('Stale Job Timeout Recovery (P3.2)', () => {
    it('5. recoverStaleJobs should recover jobs stuck in processing state', async () => {
      const job = await processingJobQueue.enqueueJob({
        attachmentId: 'att-stale-1',
        noteId: 'note-stale-1',
        jobType: 'image_ocr',
      });

      // Update to processing with old timestamp
      await processingJobQueue.updateJobStatus(job.jobId, 'processing', 10);
      await processingJobQueue._forceSetJobUpdatedAtForTest(
        job.jobId,
        new Date(Date.now() - 10 * 60 * 1000).toISOString()
      );

      const recoveredCount = await processingJobQueue.recoverStaleJobs();
      expect(recoveredCount).toBeGreaterThanOrEqual(1);

      const recoveredJob = await processingJobQueue.getJob(job.jobId);
      expect(recoveredJob?.status).toBe('queued');
    });
  });

  describe('Handwriting Immutability (P3.7)', () => {
    it('6. createSamplePoint should return an immutable VectorPoint with pressure and timeOffsetMs', () => {
      const pt = createSamplePoint(100, 200, 0.8, 150);
      expect(pt.x).toBe(100);
      expect(pt.y).toBe(200);
      expect(pt.pressure).toBe(0.8);
      expect(pt.timeOffsetMs).toBe(150);
      expect(Object.isFrozen(pt)).toBe(true);
    });
  });

});
