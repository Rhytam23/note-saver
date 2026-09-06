import * as Y from 'yjs';
import type { BlockDocument } from '../services/blockDocument';
import type { Block } from '../types/block';

export const YJS_ORIGIN_LOCAL = 'local-adapter';
export const YJS_ORIGIN_REMOTE = 'remote-sync';

/**
 * NoteNirman 2.0 — BlockDocument ↔ Yjs CRDT Adapter
 * 
 * Safely converts between local `BlockDocument` and collaborative `Y.Doc` state:
 * - Preserves stable `block.id` UUIDs.
 * - Preserves block type, properties, parentId, position, createdAt, updatedAt.
 * - Employs transaction origins (`YJS_ORIGIN_LOCAL`) to prevent update loops.
 */

/**
 * Initialize or replace a Y.Doc with the contents of a BlockDocument.
 */
export function blockDocumentToYdoc(doc: BlockDocument, ydoc: Y.Doc, origin = YJS_ORIGIN_LOCAL): void {
  const blocksMap = ydoc.getMap<Y.Map<any>>('blocks');
  const blockOrderArray = ydoc.getArray<string>('blockOrder');

  ydoc.transact(() => {
    // Clear existing block order
    if (blockOrderArray.length > 0) {
      blockOrderArray.delete(0, blockOrderArray.length);
    }

    const newOrder: string[] = [];

    doc.blocks.forEach((block, idx) => {
      newOrder.push(block.id);
      let yBlock = blocksMap.get(block.id);
      if (!yBlock) {
        yBlock = new Y.Map<any>();
        blocksMap.set(block.id, yBlock);
      }

      // Populate Y.Map fields
      yBlock.set('id', block.id);
      yBlock.set('noteId', block.noteId || doc.noteId);
      yBlock.set('parentId', block.parentId);
      yBlock.set('type', block.type);
      yBlock.set('content', block.content);
      yBlock.set('properties', block.properties ? JSON.stringify(block.properties) : '{}');
      yBlock.set('position', idx);
      yBlock.set('createdAt', block.createdAt);
      yBlock.set('updatedAt', block.updatedAt);
    });

    if (newOrder.length > 0) {
      blockOrderArray.push(newOrder);
    }
  }, origin);
}

/**
 * Reconstruct a BlockDocument from a Y.Doc collaborative state.
 */
export function ydocToBlockDocument(noteId: string, ydoc: Y.Doc): BlockDocument {
  const blocksMap = ydoc.getMap<Y.Map<any>>('blocks');
  const blockOrderArray = ydoc.getArray<string>('blockOrder');

  const orderedIds = blockOrderArray.toArray();
  const blocks: Block[] = [];

  orderedIds.forEach((id, index) => {
    const yBlock = blocksMap.get(id);
    if (yBlock) {
      let parsedProps = {};
      try {
        const rawProps = yBlock.get('properties');
        parsedProps = typeof rawProps === 'string' ? JSON.parse(rawProps) : (rawProps || {});
      } catch {
        parsedProps = {};
      }

      blocks.push({
        id: yBlock.get('id') || id,
        noteId: yBlock.get('noteId') || noteId,
        parentId: yBlock.get('parentId') || null,
        type: yBlock.get('type') || 'paragraph',
        content: yBlock.get('content') || '',
        properties: parsedProps,
        position: index,
        createdAt: yBlock.get('createdAt') || new Date().toISOString(),
        updatedAt: yBlock.get('updatedAt') || new Date().toISOString(),
      });
    }
  });

  return {
    noteId,
    blocks,
    version: 1,
  };
}

/**
 * Apply incremental local BlockDocument updates into Y.Doc.
 */
export function applyLocalBlockUpdateToYdoc(ydoc: Y.Doc, updatedDoc: BlockDocument, origin = YJS_ORIGIN_LOCAL): void {
  const blocksMap = ydoc.getMap<Y.Map<any>>('blocks');
  const blockOrderArray = ydoc.getArray<string>('blockOrder');

  ydoc.transact(() => {
    const currentOrder = blockOrderArray.toArray();
    const newOrder = updatedDoc.blocks.map(b => b.id);

    // Update or insert blocks
    updatedDoc.blocks.forEach((block, idx) => {
      let yBlock = blocksMap.get(block.id);
      if (!yBlock) {
        yBlock = new Y.Map<any>();
        blocksMap.set(block.id, yBlock);
      }

      if (yBlock.get('content') !== block.content) yBlock.set('content', block.content);
      if (yBlock.get('type') !== block.type) yBlock.set('type', block.type);
      if (yBlock.get('parentId') !== block.parentId) yBlock.set('parentId', block.parentId);
      if (yBlock.get('position') !== idx) yBlock.set('position', idx);
      
      const propsStr = JSON.stringify(block.properties || {});
      if (yBlock.get('properties') !== propsStr) yBlock.set('properties', propsStr);
    });

    // Remove deleted blocks from Y.Map
    const newOrderSet = new Set(newOrder);
    currentOrder.forEach(id => {
      if (!newOrderSet.has(id)) {
        blocksMap.delete(id);
      }
    });

    // Update block ordering if changed
    if (JSON.stringify(currentOrder) !== JSON.stringify(newOrder)) {
      if (blockOrderArray.length > 0) {
        blockOrderArray.delete(0, blockOrderArray.length);
      }
      if (newOrder.length > 0) {
        blockOrderArray.push(newOrder);
      }
    }
  }, origin);
}
