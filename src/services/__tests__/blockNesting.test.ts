import { describe, it, expect } from 'vitest';
import { createBlockDocument } from '../blockDocument';
import { validateBlockNesting, indentBlock, outdentBlock, getStructuredBlockHierarchy } from '../blockNesting';

describe('NoteNirman 2.0 P1.9 Suite — Block Nesting & Validation Engine', () => {

  const initialHtml = '<p>Parent</p><p>Child candidate</p><p>Grandchild candidate</p>';

  it('1. should validate a healthy BlockDocument nesting structure', () => {
    const doc = createBlockDocument('note-nest-1', initialHtml);
    const validation = validateBlockNesting(doc);
    expect(validation.isValid).toBe(true);
  });

  it('2. should detect self-referencing parentId as invalid', () => {
    const doc = createBlockDocument('note-nest-2', initialHtml);
    doc.blocks[0].parentId = doc.blocks[0].id; // Self-parenting

    const validation = validateBlockNesting(doc);
    expect(validation.isValid).toBe(false);
    expect(validation.error).toContain('cannot be its own parent');
  });

  it('3. should detect circular parent chains (A -> B -> C -> A)', () => {
    const doc = createBlockDocument('note-nest-3', initialHtml);
    const id0 = doc.blocks[0].id;
    const id1 = doc.blocks[1].id;
    const id2 = doc.blocks[2].id;

    doc.blocks[0].parentId = id2;
    doc.blocks[1].parentId = id0;
    doc.blocks[2].parentId = id1;

    const validation = validateBlockNesting(doc);
    expect(validation.isValid).toBe(false);
    expect(validation.error).toContain('Circular parent relationship');
  });

  it('4. should indent a block under its preceding sibling', () => {
    const doc = createBlockDocument('note-nest-4', initialHtml);
    const parentId = doc.blocks[0].id;
    const childId = doc.blocks[1].id;

    const indented = indentBlock(doc, childId);
    expect(indented.blocks[1].parentId).toBe(parentId);
  });

  it('5. should outdent a nested block back to root level', () => {
    const doc = createBlockDocument('note-nest-5', initialHtml);
    const parentId = doc.blocks[0].id;
    const childId = doc.blocks[1].id;

    const indented = indentBlock(doc, childId);
    expect(indented.blocks[1].parentId).toBe(parentId);

    const outdented = outdentBlock(indented, childId);
    expect(outdented.blocks[1].parentId).toBeNull();
  });

  it('6. should structure blocks into root nodes and children map cleanly', () => {
    const doc = createBlockDocument('note-nest-6', initialHtml);
    const parentId = doc.blocks[0].id;
    const childId = doc.blocks[1].id;

    const indented = indentBlock(doc, childId);
    const { rootBlocks, childrenMap } = getStructuredBlockHierarchy(indented.blocks);

    expect(rootBlocks).toHaveLength(2); // Block 0 and Block 2
    expect(childrenMap.get(parentId)).toHaveLength(1);
    expect(childrenMap.get(parentId)![0].id).toBe(childId);
  });

});
