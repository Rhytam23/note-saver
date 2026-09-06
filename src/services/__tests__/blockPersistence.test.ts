import { describe, it, expect, vi } from 'vitest';
import {
  loadBlockDocument,
  saveBlockDocumentToNote,
  saveBlockDocumentAndPersist,
} from '../blockPersistence';
import { reorderBlocks } from '../blockDocument';
import type { Note } from '../../types';
import * as syncEngine from '../syncEngine';
import * as localDb from '../localDb';

describe('NoteNirman 2.0 P1.3 Suite — Block Persistence Strategy Adapter', () => {

  const sampleNote: Note = {
    id: 'note-pers-1',
    title: 'Architecture Review',
    content: '<h1>Title</h1><p>First paragraph</p><p>Second paragraph</p>',
    tags: ['engineering', 'p1-3'],
    createdAt: '2026-09-06T10:00:00.000Z',
    updatedAt: '2026-09-06T10:00:00.000Z',
    isPinned: true,
    priority: 'high',
    coverImage: 'linear-gradient(to right, #4facfe, #00f2fe)',
    version: 3,
    syncStatus: 'synced',
  };

  // Test 1 — Load
  it('1. should derive a valid BlockDocument from a Note object', () => {
    const doc = loadBlockDocument(sampleNote);
    expect(doc.noteId).toBe(sampleNote.id);
    expect(doc.blocks).toHaveLength(3);
    expect(doc.blocks[0].content).toBe('Title');
    expect(doc.blocks[1].content).toBe('First paragraph');
    expect(doc.blocks[2].content).toBe('Second paragraph');
  });

  // Test 2 — Save
  it('2. should serialize BlockDocument to HTML and update Note content cleanly', () => {
    const doc = loadBlockDocument(sampleNote);
    doc.blocks[1].content = 'Updated paragraph content';

    const result = saveBlockDocumentToNote(sampleNote, doc);
    expect(result.success).toBe(true);
    expect(result.updatedNote.content).toContain('Updated paragraph content');
    expect(result.updatedNote.title).toBe(sampleNote.title);
  });

  // Test 3 — Note metadata
  it('3. should preserve all existing Note metadata properties upon save', () => {
    const doc = loadBlockDocument(sampleNote);
    const result = saveBlockDocumentToNote(sampleNote, doc);

    expect(result.updatedNote.id).toBe(sampleNote.id);
    expect(result.updatedNote.title).toBe(sampleNote.title);
    expect(result.updatedNote.tags).toEqual(sampleNote.tags);
    expect(result.updatedNote.isPinned).toBe(sampleNote.isPinned);
    expect(result.updatedNote.priority).toBe(sampleNote.priority);
    expect(result.updatedNote.coverImage).toBe(sampleNote.coverImage);
    expect(result.updatedNote.version).toBe(sampleNote.version);
    expect(result.updatedNote.syncStatus).toBe(sampleNote.syncStatus);
    expect(result.updatedNote.createdAt).toBe(sampleNote.createdAt);
  });

  // Test 4 — Stable IDs
  it('4. should preserve stable block UUIDs across load -> save -> load cycle', () => {
    const doc1 = loadBlockDocument(sampleNote);
    const id0 = doc1.blocks[0].id;
    const id1 = doc1.blocks[1].id;

    const saveResult = saveBlockDocumentToNote(sampleNote, doc1);
    const doc2 = loadBlockDocument(saveResult.updatedNote);

    expect(doc2.blocks[0].id).toBe(id0);
    expect(doc2.blocks[1].id).toBe(id1);
  });

  // Test 5 — Reordering
  it('5. should retain block identity when reordering blocks prior to saving', () => {
    const doc = loadBlockDocument(sampleNote);
    const id0 = doc.blocks[0].id;
    const id1 = doc.blocks[1].id;
    const id2 = doc.blocks[2].id;

    const reorderedDoc = reorderBlocks(doc, [id2, id0, id1]);
    const saveResult = saveBlockDocumentToNote(sampleNote, reorderedDoc);

    const reloadedDoc = loadBlockDocument(saveResult.updatedNote);
    expect(reloadedDoc.blocks[0].id).toBe(id2);
    expect(reloadedDoc.blocks[0].content).toBe('Second paragraph');
    expect(reloadedDoc.blocks[1].id).toBe(id0);
    expect(reloadedDoc.blocks[2].id).toBe(id1);
  });

  // Test 6 — Fallback HTML
  it('6. should preserve unsupported custom HTML in fallback blocks across load/save', () => {
    const noteWithCustom: Note = {
      ...sampleNote,
      content: '<custom-embed-element src="data">Embed</custom-embed-element>',
    };

    const doc = loadBlockDocument(noteWithCustom);
    expect(doc.blocks[0].properties.rawHtml).toBe('<custom-embed-element src="data">Embed</custom-embed-element>');

    const saveResult = saveBlockDocumentToNote(noteWithCustom, doc);
    expect(saveResult.updatedNote.content).toBe('<custom-embed-element src="data">Embed</custom-embed-element>');
  });

  // Test 7 — Serialization failure
  it('7. should isolate serialization failures without corrupting existing Note content', () => {
    const result = saveBlockDocumentToNote(null as any, loadBlockDocument(sampleNote));
    expect(result.success).toBe(false);
    expect(result.error).not.toBeNull();
    expect(result.updatedNote).toBeNull();
  });

  // Test 8 — Existing note compatibility
  it('8. should read existing HTML notes seamlessly without modification', () => {
    const legacyHtml = '<p>Legacy text without data-block-id</p>';
    const legacyNote: Note = { ...sampleNote, content: legacyHtml };

    const doc = loadBlockDocument(legacyNote);
    expect(doc.blocks).toHaveLength(1);
    expect(doc.blocks[0].content).toBe('Legacy text without data-block-id');
    expect(legacyNote.content).toBe(legacyHtml); // Untouched
  });

  // Test 9 — No automatic migration
  it('9. should verify loading a note does NOT automatically invoke persistence updates', () => {
    const writeNoteSpy = vi.spyOn(syncEngine, 'writeNote');
    const putNoteSpy = vi.spyOn(localDb, 'putLocalNote');

    const doc = loadBlockDocument(sampleNote);
    expect(doc).toBeDefined();

    expect(writeNoteSpy).not.toHaveBeenCalled();
    expect(putNoteSpy).not.toHaveBeenCalled();
  });

  // Test 10 — Persistence isolation
  it('10. should delegate saveBlockDocumentAndPersist directly to syncEngine.writeNote', async () => {
    const writeNoteSpy = vi.spyOn(syncEngine, 'writeNote').mockResolvedValue(undefined);

    const doc = loadBlockDocument(sampleNote);
    doc.blocks[0].content = 'Title Updated';

    const result = await saveBlockDocumentAndPersist('user-123', sampleNote, doc);

    expect(result.success).toBe(true);
    expect(writeNoteSpy).toHaveBeenCalledTimes(1);
    expect(writeNoteSpy).toHaveBeenCalledWith('user-123', expect.objectContaining({
      id: sampleNote.id,
      content: expect.stringContaining('Title Updated'),
    }), 'upsert');
  });

});
