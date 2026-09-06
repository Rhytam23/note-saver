import { describe, it, expect, vi } from 'vitest';
import {
  createBlockDocument,
  serializeBlockDocument,
  findBlock,
  updateBlock,
  removeBlock,
  addBlock,
  reorderBlocks,
  cloneBlockDocument,
} from '../blockDocument';
import * as localDb from '../localDb';
import * as syncEngine from '../syncEngine';

describe('NoteNirman 2.0 P1.1 Suite — Block Document Adapter', () => {

  // Test 1 — Empty Note
  it('1. should create a valid BlockDocument from empty HTML', () => {
    const doc = createBlockDocument('note-empty', '');
    expect(doc.noteId).toBe('note-empty');
    expect(doc.blocks).toEqual([]);
    expect(doc.version).toBe(1);
    expect(serializeBlockDocument(doc)).toBe('');
  });

  // Test 2 — Existing Note
  it('2. should parse existing HTML note content into typed blocks', () => {
    const html = '<h1>Project Notes</h1><p>First paragraph</p><blockquote>Quote text</blockquote>';
    const doc = createBlockDocument('note-101', html);

    expect(doc.noteId).toBe('note-101');
    expect(doc.blocks).toHaveLength(3);
    expect(doc.blocks[0].type).toBe('heading');
    expect(doc.blocks[0].content).toBe('Project Notes');
    expect(doc.blocks[1].type).toBe('paragraph');
    expect(doc.blocks[1].content).toBe('First paragraph');
    expect(doc.blocks[2].type).toBe('quote');
    expect(doc.blocks[2].content).toBe('Quote text');
  });

  // Test 3 — Stable IDs
  it('3. should preserve stable IDs across HTML -> BlockDocument -> HTML -> BlockDocument cycles', () => {
    const html = '<p>Block A</p><p>Block B</p>';
    const doc1 = createBlockDocument('note-stable', html);
    const idA1 = doc1.blocks[0].id;
    const idB1 = doc1.blocks[1].id;

    const serializedHtml = serializeBlockDocument(doc1);
    expect(serializedHtml).toContain(`data-block-id="${idA1}"`);
    expect(serializedHtml).toContain(`data-block-id="${idB1}"`);

    const doc2 = createBlockDocument('note-stable', serializedHtml);
    expect(doc2.blocks[0].id).toBe(idA1);
    expect(doc2.blocks[1].id).toBe(idB1);
  });

  // Test 4 — Reordering
  it('4. should maintain block ID identity when reordering blocks [A, B, C] -> [C, A, B]', () => {
    const html = '<p>Block A</p><p>Block B</p><p>Block C</p>';
    const doc = createBlockDocument('note-reorder', html);
    const idA = doc.blocks[0].id;
    const idB = doc.blocks[1].id;
    const idC = doc.blocks[2].id;

    const reorderedDoc = reorderBlocks(doc, [idC, idA, idB]);
    expect(reorderedDoc.blocks[0].id).toBe(idC);
    expect(reorderedDoc.blocks[0].content).toBe('Block C');
    expect(reorderedDoc.blocks[0].position).toBe(0);

    expect(reorderedDoc.blocks[1].id).toBe(idA);
    expect(reorderedDoc.blocks[1].content).toBe('Block A');
    expect(reorderedDoc.blocks[1].position).toBe(1);

    expect(reorderedDoc.blocks[2].id).toBe(idB);
    expect(reorderedDoc.blocks[2].content).toBe('Block B');
    expect(reorderedDoc.blocks[2].position).toBe(2);
  });

  // Test 5 — Block Lookup
  it('5. should locate a block by its stable UUID using findBlock', () => {
    const html = '<p>Search Target</p>';
    const doc = createBlockDocument('note-lookup', html);
    const blockId = doc.blocks[0].id;

    const found = findBlock(doc, blockId);
    expect(found).toBeDefined();
    expect(found?.id).toBe(blockId);
    expect(found?.content).toBe('Search Target');

    expect(findBlock(doc, 'non-existent-id')).toBeUndefined();
  });

  // Test 6 — Serialization
  it('6. should serialize BlockDocument into valid compatible HTML', () => {
    const doc = createBlockDocument('note-serialize', '');
    const { doc: docWithBlock } = addBlock(doc, { type: 'heading', content: 'Title', properties: { level: 2 } });
    const { doc: finalDoc } = addBlock(docWithBlock, { type: 'paragraph', content: 'Body paragraph' });

    const html = serializeBlockDocument(finalDoc);
    expect(html).toContain('<h2 data-block-id="');
    expect(html).toContain('Title</h2>');
    expect(html).toContain('<p data-block-id="');
    expect(html).toContain('Body paragraph</p>');
  });

  // Test 7 — Fallback
  it('7. should preserve unsupported custom HTML elements via fallback blocks', () => {
    const customHtml = '<my-custom-widget data-config="123">Widget Content</my-custom-widget>';
    const doc = createBlockDocument('note-fallback', customHtml);

    expect(doc.blocks).toHaveLength(1);
    expect(doc.blocks[0].properties.rawHtml).toBe(customHtml);

    const serialized = serializeBlockDocument(doc);
    expect(serialized).toBe(customHtml);
  });

  // Test 8 — Non-Destructive Behavior
  it('8. should verify adapter operations do NOT side-effect IndexedDB or Sync Engine', () => {
    const putNoteSpy = vi.spyOn(localDb, 'putLocalNote');
    const enqueueOpSpy = vi.spyOn(localDb, 'enqueueOp');
    const writeNoteSpy = vi.spyOn(syncEngine, 'writeNote');

    const html = '<p>Pure transformation</p>';
    const doc = createBlockDocument('note-pure', html);
    const updated = updateBlock(doc, doc.blocks[0].id, { content: 'Modified purely' });
    const reordered = reorderBlocks(updated, [doc.blocks[0].id]);
    const cloned = cloneBlockDocument(reordered);
    const serialized = serializeBlockDocument(cloned);

    expect(serialized).toContain('Modified purely');
    expect(putNoteSpy).not.toHaveBeenCalled();
    expect(enqueueOpSpy).not.toHaveBeenCalled();
    expect(writeNoteSpy).not.toHaveBeenCalled();
  });

  it('should support updating and removing blocks immutably', () => {
    const html = '<p>P1</p><p>P2</p>';
    const doc = createBlockDocument('note-crud', html);
    const id1 = doc.blocks[0].id;
    const id2 = doc.blocks[1].id;

    const updated = updateBlock(doc, id1, { content: 'P1 Updated' });
    expect(updated.blocks[0].content).toBe('P1 Updated');
    expect(doc.blocks[0].content).toBe('P1'); // Immutability check

    const removed = removeBlock(updated, id2);
    expect(removed.blocks).toHaveLength(1);
    expect(removed.blocks[0].id).toBe(id1);
  });

});
