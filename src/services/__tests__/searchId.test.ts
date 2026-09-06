import { describe, it, expect } from 'vitest';
import { generateSearchDocumentId, sha256Hex } from '../searchId';

describe('Phase 4 — Canonical searchDocumentId Generator', () => {
  it('should generate a valid SHA-256 hex string for sha256Hex', () => {
    // Standard test vectors
    expect(sha256Hex('')).toBe('e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855');
    expect(sha256Hex('test')).toBe('9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08');
  });

  it('should return deterministic IDs for identical arguments', () => {
    const id1 = generateSearchDocumentId('note-123', 'block_text', 'blk-456', null, 0);
    const id2 = generateSearchDocumentId('note-123', 'block_text', 'blk-456', undefined, 0);
    expect(id1).toBe(id2);
    expect(id1).toMatch(/^doc_[a-f0-9]{16}$/);
  });

  it('should differentiate different chunk indices', () => {
    const id0 = generateSearchDocumentId('note-123', 'block_text', 'blk-456', null, 0);
    const id1 = generateSearchDocumentId('note-123', 'block_text', 'blk-456', null, 1);
    expect(id0).not.toBe(id1);
  });

  it('should differentiate different source types', () => {
    const idBlock = generateSearchDocumentId('note-123', 'block_text', 'blk-456', null, 0);
    const idTitle = generateSearchDocumentId('note-123', 'note_title', 'blk-456', null, 0);
    expect(idBlock).not.toBe(idTitle);
  });

  it('should differentiate null vs populated block/attachment IDs', () => {
    const idBlock = generateSearchDocumentId('note-123', 'attachment_pdf', 'blk-1', null, 0);
    const idAtt = generateSearchDocumentId('note-123', 'attachment_pdf', null, 'att-1', 0);
    expect(idBlock).not.toBe(idAtt);
  });

  it('should resist delimiter collisions with underscores, colons, and slashes', () => {
    // Delimiter collision test: "a_b", "c" vs "a", "b_c"
    const id1 = generateSearchDocumentId('a_b', 'block_text', 'c', null, 0);
    const id2 = generateSearchDocumentId('a', 'block_text', 'b_c', null, 0);
    expect(id1).not.toBe(id2);

    const id3 = generateSearchDocumentId('note/1', 'attachment_ocr', 'b:2', 'att/3', 0);
    const id4 = generateSearchDocumentId('note', 'attachment_ocr', '/1_b:2', 'att/3', 0);
    expect(id3).not.toBe(id4);
  });
});
