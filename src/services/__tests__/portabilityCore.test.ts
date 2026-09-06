import { describe, it, expect } from 'vitest';
import {
  blockToPortabilityNode,
  portabilityNodeToBlock,
  blockDocumentToPortabilityAST,
  portabilityASTToBlockDocument,
  noteContentToPortabilityAST,
  portabilityASTToNoteContent,
} from '../portabilityCore';
import { createBlockDocument } from '../blockDocument';
import type { Block } from '../../types/block';

describe('PortabilityCore Service (P5.1)', () => {
  const sampleNoteId = 'note-123456';

  const sampleBlock: Block = {
    id: 'blk-uuid-001',
    noteId: sampleNoteId,
    parentId: null,
    type: 'heading',
    content: 'Phase 5 Data Portability Header',
    properties: { level: 1 },
    position: 0,
    createdAt: '2026-09-06T12:00:00.000Z',
    updatedAt: '2026-09-06T12:00:00.000Z',
    metadata: { source: 'test' },
  };

  it('converts a Block to a PortabilityNode and back cleanly', () => {
    const node = blockToPortabilityNode(sampleBlock);
    expect(node.id).toBe(sampleBlock.id);
    expect(node.type).toBe('heading');
    expect(node.content).toBe('Phase 5 Data Portability Header');
    expect(node.properties.level).toBe(1);

    const restoredBlock = portabilityNodeToBlock(node, sampleNoteId);
    expect(restoredBlock.id).toBe(sampleBlock.id);
    expect(restoredBlock.noteId).toBe(sampleNoteId);
    expect(restoredBlock.type).toBe(sampleBlock.type);
    expect(restoredBlock.content).toBe(sampleBlock.content);
  });

  it('converts a BlockDocument into a PortabilityAST and back', () => {
    const doc = createBlockDocument(
      sampleNoteId,
      '<h1 data-block-id="blk-h1">Title</h1><p data-block-id="blk-p1">Paragraph content</p>'
    );

    const ast = blockDocumentToPortabilityAST(doc, 'Sample Note Title');
    expect(ast.noteId).toBe(sampleNoteId);
    expect(ast.title).toBe('Sample Note Title');
    expect(ast.nodes.length).toBe(2);
    expect(ast.nodes[0].id).toBe('blk-h1');
    expect(ast.nodes[1].id).toBe('blk-p1');

    const restoredDoc = portabilityASTToBlockDocument(ast);
    expect(restoredDoc.noteId).toBe(sampleNoteId);
    expect(restoredDoc.blocks.length).toBe(2);
    expect(restoredDoc.blocks[0].id).toBe('blk-h1');
    expect(restoredDoc.blocks[1].id).toBe('blk-p1');
  });

  it('executes full round-trip: Note.content -> BlockDocument -> PortabilityAST -> BlockDocument -> Note.content', () => {
    const originalHtml = '<p data-block-id="blk-test-01">Hello <strong>World</strong></p>';
    
    // 1. HTML -> PortabilityAST
    const ast = noteContentToPortabilityAST(sampleNoteId, originalHtml, 'Roundtrip Test');
    expect(ast.nodes.length).toBe(1);
    expect(ast.nodes[0].id).toBe('blk-test-01');

    // 2. PortabilityAST -> HTML
    const finalHtml = portabilityASTToNoteContent(ast);
    expect(finalHtml).toContain('data-block-id="blk-test-01"');
    expect(finalHtml).toContain('Hello <strong>World</strong>');
  });

  it('handles empty or malformed inputs gracefully', () => {
    const emptyAst = noteContentToPortabilityAST(sampleNoteId, '');
    expect(emptyAst.nodes).toEqual([]);

    const restoredEmptyDoc = portabilityASTToBlockDocument({
      noteId: sampleNoteId,
      title: 'Empty',
      nodes: [],
      version: 1,
      exportedAt: Date.now(),
    });
    expect(restoredEmptyDoc.blocks).toEqual([]);
  });
});
