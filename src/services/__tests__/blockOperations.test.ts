import { describe, it, expect } from 'vitest';
import { createBlockDocument } from '../blockDocument';
import {
  createBlock,
  updateBlock,
  deleteBlock,
  duplicateBlock,
  moveBlock,
  reorderBlocks,
} from '../blockOperations';

describe('NoteNirman 2.0 P1.5 Suite — Block Operations Engine', () => {

  const initialHtml = '<h1>Heading</h1><p>Paragraph 1</p><p>Paragraph 2</p>';

  it('1. should create a new block at target position and reindex positions', () => {
    const doc = createBlockDocument('note-ops-1', initialHtml);
    const { doc: updated, newBlock } = createBlock(doc, {
      type: 'quote',
      content: 'New Quote',
      position: 1,
    });

    expect(updated.blocks).toHaveLength(4);
    expect(updated.blocks[1].id).toBe(newBlock.id);
    expect(updated.blocks[1].type).toBe('quote');
    expect(updated.blocks[1].position).toBe(1);
    expect(updated.blocks[2].position).toBe(2);
  });

  it('2. should update block content/properties immutably while preserving UUID', () => {
    const doc = createBlockDocument('note-ops-2', initialHtml);
    const targetId = doc.blocks[0].id;

    const updated = updateBlock(doc, targetId, { content: 'Updated Heading', properties: { level: 2 } });
    expect(updated.blocks[0].id).toBe(targetId);
    expect(updated.blocks[0].content).toBe('Updated Heading');
    expect(updated.blocks[0].properties.level).toBe(2);
  });

  it('3. should delete a block and reindex positions cleanly', () => {
    const doc = createBlockDocument('note-ops-3', initialHtml);
    const deleteId = doc.blocks[1].id;

    const updated = deleteBlock(doc, deleteId);
    expect(updated.blocks).toHaveLength(2);
    expect(updated.blocks.find(b => b.id === deleteId)).toBeUndefined();
    expect(updated.blocks[0].position).toBe(0);
    expect(updated.blocks[1].position).toBe(1);
  });

  it('4. should duplicate a block with a FRESH UUID', () => {
    const doc = createBlockDocument('note-ops-4', initialHtml);
    const sourceId = doc.blocks[0].id;

    const { doc: updated, duplicatedBlock } = duplicateBlock(doc, sourceId);
    expect(duplicatedBlock).not.toBeNull();
    expect(duplicatedBlock?.id).not.toBe(sourceId); // MUST BE FRESH UUID
    expect(duplicatedBlock?.content).toBe(doc.blocks[0].content);
    expect(updated.blocks).toHaveLength(4);
    expect(updated.blocks[1].id).toBe(duplicatedBlock?.id);
  });

  it('5. should move a block to a new position preserving its UUID', () => {
    const doc = createBlockDocument('note-ops-5', initialHtml);
    const moveId = doc.blocks[0].id; // Heading

    const updated = moveBlock(doc, moveId, 2);
    expect(updated.blocks[2].id).toBe(moveId);
    expect(updated.blocks[2].content).toBe('Heading');
  });

  it('6. should reorder blocks according to ID list preserving UUID identity', () => {
    const doc = createBlockDocument('note-ops-6', initialHtml);
    const id0 = doc.blocks[0].id;
    const id1 = doc.blocks[1].id;
    const id2 = doc.blocks[2].id;

    const updated = reorderBlocks(doc, [id2, id0, id1]);
    expect(updated.blocks[0].id).toBe(id2);
    expect(updated.blocks[1].id).toBe(id0);
    expect(updated.blocks[2].id).toBe(id1);
  });

});
