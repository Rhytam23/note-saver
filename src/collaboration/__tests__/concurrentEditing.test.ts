import { describe, it, expect } from 'vitest';
import * as Y from 'yjs';
import { createBlockDocument } from '../../services/blockDocument';
import {
  blockDocumentToYdoc,
  ydocToBlockDocument,
  applyLocalBlockUpdateToYdoc,
} from '../yjsBlockAdapter';

describe('NoteNirman 2.0 P2.7 Suite — Concurrent Editing & Conflict Handling', () => {

  it('1. should resolve concurrent text edits to the same block deterministically via CRDT', () => {
    const html = '<p>Base text</p>';
    const baseDoc = createBlockDocument('note-conf-1', html);

    const docA = new Y.Doc();
    const docB = new Y.Doc();

    blockDocumentToYdoc(baseDoc, docA);

    // Sync A to B
    const initUpdate = Y.encodeStateAsUpdate(docA);
    Y.applyUpdate(docB, initUpdate);

    // User A edits content
    const blockA = { ...baseDoc, blocks: [{ ...baseDoc.blocks[0], content: 'Text edited by User A' }] };
    applyLocalBlockUpdateToYdoc(docA, blockA, 'user-a');

    // User B edits content concurrently
    const blockB = { ...baseDoc, blocks: [{ ...baseDoc.blocks[0], content: 'Text edited by User B' }] };
    applyLocalBlockUpdateToYdoc(docB, blockB, 'user-b');

    // Exchange updates
    const updateA = Y.encodeStateAsUpdate(docA);
    const updateB = Y.encodeStateAsUpdate(docB);

    Y.applyUpdate(docB, updateA);
    Y.applyUpdate(docA, updateB);

    const finalA = ydocToBlockDocument('note-conf-1', docA);
    const finalB = ydocToBlockDocument('note-conf-1', docB);

    expect(finalA.blocks[0].content).toBe(finalB.blocks[0].content);
    expect(finalA.blocks[0].id).toBe(baseDoc.blocks[0].id);
  });

  it('2. should handle concurrent move and edit on the same block without document corruption', () => {
    const html = '<p>Block 1</p><p>Block 2</p><p>Block 3</p>';
    const baseDoc = createBlockDocument('note-conf-2', html);

    const docA = new Y.Doc();
    const docB = new Y.Doc();

    blockDocumentToYdoc(baseDoc, docA);
    Y.applyUpdate(docB, Y.encodeStateAsUpdate(docA));

    // User A reorders [Block 3, Block 1, Block 2]
    const reorderedDoc = {
      ...baseDoc,
      blocks: [baseDoc.blocks[2], baseDoc.blocks[0], baseDoc.blocks[1]],
    };
    applyLocalBlockUpdateToYdoc(docA, reorderedDoc, 'user-a');

    // User B edits Block 3 content concurrently
    const editedDoc = {
      ...baseDoc,
      blocks: [
        baseDoc.blocks[0],
        baseDoc.blocks[1],
        { ...baseDoc.blocks[2], content: 'Block 3 Modified' },
      ],
    };
    applyLocalBlockUpdateToYdoc(docB, editedDoc, 'user-b');

    // Cross-sync
    Y.applyUpdate(docB, Y.encodeStateAsUpdate(docA));
    Y.applyUpdate(docA, Y.encodeStateAsUpdate(docB));

    const finalA = ydocToBlockDocument('note-conf-2', docA);
    const finalB = ydocToBlockDocument('note-conf-2', docB);

    expect(finalA.blocks).toHaveLength(3);
    expect(finalB.blocks).toHaveLength(3);
    expect(finalA.blocks[0].content).toBe('Block 3 Modified');
    expect(finalB.blocks[0].content).toBe('Block 3 Modified');
  });

  it('3. should safely handle edit vs delete conflict without crashing or creating dangling references', () => {
    const html = '<p>Block 1</p><p>Block 2</p>';
    const baseDoc = createBlockDocument('note-conf-3', html);

    const docA = new Y.Doc();
    const docB = new Y.Doc();

    blockDocumentToYdoc(baseDoc, docA);
    Y.applyUpdate(docB, Y.encodeStateAsUpdate(docA));

    // User A deletes Block 2
    const deletedDoc = {
      ...baseDoc,
      blocks: [baseDoc.blocks[0]],
    };
    applyLocalBlockUpdateToYdoc(docA, deletedDoc, 'user-a');

    // User B edits Block 2 concurrently
    const editedDoc = {
      ...baseDoc,
      blocks: [baseDoc.blocks[0], { ...baseDoc.blocks[1], content: 'Block 2 Edited' }],
    };
    applyLocalBlockUpdateToYdoc(docB, editedDoc, 'user-b');

    // Cross sync
    Y.applyUpdate(docB, Y.encodeStateAsUpdate(docA));
    Y.applyUpdate(docA, Y.encodeStateAsUpdate(docB));

    const finalA = ydocToBlockDocument('note-conf-3', docA);
    const finalB = ydocToBlockDocument('note-conf-3', docB);

    // CRDT converges on deterministic structure
    expect(finalA.blocks.length).toBe(finalB.blocks.length);
  });

});
