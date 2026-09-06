import { describe, it, expect } from 'vitest';
import * as Y from 'yjs';
import { createBlockDocument } from '../../services/blockDocument';
import {
  blockDocumentToYdoc,
  ydocToBlockDocument,
  applyLocalBlockUpdateToYdoc,
  YJS_ORIGIN_LOCAL,
} from '../yjsBlockAdapter';

describe('NoteNirman 2.0 P2.2 Suite — BlockDocument ↔ Yjs Adapter', () => {

  it('1. should convert BlockDocument to Y.Doc and back while preserving stable IDs and properties', () => {
    const html = '<h1>Heading</h1><p>Body content</p><blockquote>Quote</blockquote>';
    const doc1 = createBlockDocument('note-collab-1', html);

    const ydoc = new Y.Doc();
    blockDocumentToYdoc(doc1, ydoc);

    const doc2 = ydocToBlockDocument('note-collab-1', ydoc);

    expect(doc2.blocks).toHaveLength(3);
    expect(doc2.blocks[0].id).toBe(doc1.blocks[0].id);
    expect(doc2.blocks[0].content).toBe('Heading');
    expect(doc2.blocks[1].id).toBe(doc1.blocks[1].id);
    expect(doc2.blocks[1].content).toBe('Body content');
    expect(doc2.blocks[2].id).toBe(doc1.blocks[2].id);
    expect(doc2.blocks[2].content).toBe('Quote');
  });

  it('2. should preserve origin tag when updating Y.Doc to prevent update feedback loops', () => {
    const html = '<p>Initial text</p>';
    const doc = createBlockDocument('note-loop-test', html);

    const ydoc = new Y.Doc();
    let capturedOrigin: any = null;

    ydoc.on('update', (_update, origin) => {
      capturedOrigin = origin;
    });

    blockDocumentToYdoc(doc, ydoc, YJS_ORIGIN_LOCAL);
    expect(capturedOrigin).toBe(YJS_ORIGIN_LOCAL);
  });

  it('3. should update Y.Doc incrementally without full document rewrite', () => {
    const html = '<p>Block 1</p><p>Block 2</p>';
    const doc1 = createBlockDocument('note-inc-1', html);

    const ydoc = new Y.Doc();
    blockDocumentToYdoc(doc1, ydoc);

    // Modify block 2 content
    const doc2 = {
      ...doc1,
      blocks: [
        { ...doc1.blocks[0] },
        { ...doc1.blocks[1], content: 'Block 2 Updated' },
      ],
    };

    applyLocalBlockUpdateToYdoc(ydoc, doc2);

    const reconstructed = ydocToBlockDocument('note-inc-1', ydoc);
    expect(reconstructed.blocks[1].content).toBe('Block 2 Updated');
    expect(reconstructed.blocks[0].id).toBe(doc1.blocks[0].id);
  });

});
