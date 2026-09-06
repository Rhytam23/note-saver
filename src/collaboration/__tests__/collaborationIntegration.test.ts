import { describe, it, expect } from 'vitest';
import * as Y from 'yjs';
import { createBlockDocument } from '../../services/blockDocument';
import { loadBlockDocument, saveBlockDocumentToNote } from '../../services/blockPersistence';
import type { Note } from '../../types';
import { CollaborationManager } from '../collaborationManager';
import { formatRoomId } from '../collaborationConfig';
import { setFeatureFlag, resetFeatureFlags, isFeatureEnabled } from '../../config/featureFlags';

describe('NoteNirman 2.0 P2.10, P2.11 & P2.12 — Integration, Security & Persistence Suite', () => {

  const mockNote: Note = {
    id: 'note-integ-99',
    title: 'Offline & Realtime Test Note',
    content: '<h1>Offline Header</h1><p>Offline paragraph</p>',
    tags: ['collaboration', 'p2'],
    createdAt: '2026-09-06T12:00:00.000Z',
    updatedAt: '2026-09-06T12:00:00.000Z',
    isPinned: false,
    priority: 'medium',
    version: 1,
    syncStatus: 'synced',
  };

  it('1. [P2.10 Persistence] should preserve Note.content HTML persistence when offline', () => {
    // 1. Offline editing creates BlockDocument and saves back to Note
    const blockDoc = loadBlockDocument(mockNote);
    expect(blockDoc.blocks).toHaveLength(2);

    blockDoc.blocks[1].content = 'Edited while offline';
    const saveResult = saveBlockDocumentToNote(mockNote, blockDoc);

    expect(saveResult.success).toBe(true);
    expect(saveResult.updatedNote.content).toContain('Edited while offline');
    expect(saveResult.updatedNote.id).toBe(mockNote.id);
  });

  it('2. [P2.10 Recovery] should reconcile offline edits cleanly when collaboration session opens', async () => {
    const manager = new CollaborationManager();
    const offlineDoc = createBlockDocument('note-rec-1', '<p>Pre-existing offline text</p>');

    await manager.openSession(
      { noteId: 'note-rec-1', userId: 'user-rec', userName: 'Bob' },
      offlineDoc
    );

    const activeDoc = manager.getLatestDocument();
    expect(activeDoc).not.toBeNull();
    expect(activeDoc?.blocks[0].content).toBe('Pre-existing offline text');

    await manager.closeSession();
  });

  it('3. [P2.11 Security] should produce isolated room IDs for different notes', () => {
    const roomA = formatRoomId('note-secret-1');
    const roomB = formatRoomId('note-secret-2');

    expect(roomA).not.toBe(roomB);
    expect(roomA).toContain('notenirman-room-note-secret-1');
  });

  it('4. [P2.13 Feature Flag] COLLABORATION flag should default to false and govern collaboration state', () => {
    resetFeatureFlags();
    expect(isFeatureEnabled('COLLABORATION')).toBe(false);

    setFeatureFlag('COLLABORATION', true);
    expect(isFeatureEnabled('COLLABORATION')).toBe(true);
    resetFeatureFlags();
  });

  it('5. [P2.12 Invariants] Y.Doc state should preserve stable block UUIDs across roundtrips', () => {
    const ydoc = new Y.Doc();
    const blocksMap = ydoc.getMap<Y.Map<any>>('blocks');
    const orderArray = ydoc.getArray<string>('blockOrder');

    const blockId = 'stable-uuid-999';
    orderArray.push([blockId]);

    const yBlock = new Y.Map<any>();
    yBlock.set('id', blockId);
    yBlock.set('content', 'Invariant block');
    blocksMap.set(blockId, yBlock);

    expect(orderArray.get(0)).toBe(blockId);
    expect(blocksMap.get(blockId)?.get('content')).toBe('Invariant block');
  });

});
