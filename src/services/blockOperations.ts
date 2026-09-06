import { v4 as uuidv4 } from 'uuid';
import type { Block, BlockType, BlockProperties } from '../types/block';
import type { BlockDocument } from './blockDocument';

/**
 * NoteNirman 2.0 P1.5 Block Editing Operations Engine
 * 
 * Pure, immutable operations for manipulating blocks within a BlockDocument.
 * 
 * Guarantees:
 * 1. Stable Identity: Editing/moving blocks preserves their existing UUIDs.
 * 2. New Identity: Duplicating a block ALWAYS assigns a fresh UUID to the copy.
 * 3. Cascade Deletion: Deleting a block recursively removes its child blocks.
 * 4. Index Stability: Block positions are automatically normalized to 0..N-1.
 */

export interface CreateBlockInput {
  type: BlockType;
  content: string;
  properties?: BlockProperties;
  parentId?: string | null;
  position?: number;
}

/**
 * Create a new block and insert it into a BlockDocument immutably.
 */
export function createBlock(doc: BlockDocument, input: CreateBlockInput): { doc: BlockDocument; newBlock: Block } {
  const now = new Date().toISOString();
  const newBlock: Block = {
    id: uuidv4(),
    noteId: doc.noteId,
    parentId: input.parentId || null,
    type: input.type,
    content: input.content,
    properties: input.properties || {},
    position: 0,
    createdAt: now,
    updatedAt: now,
  };

  const copy = [...doc.blocks];
  const targetPos = (input.position !== undefined && input.position >= 0 && input.position <= copy.length)
    ? input.position
    : copy.length;

  copy.splice(targetPos, 0, newBlock);
  const reindexed = normalizePositions(copy);

  return {
    doc: {
      ...doc,
      blocks: reindexed,
    },
    newBlock,
  };
}

/**
 * Update an existing block by ID immutably. Preserves stable UUID and updates timestamp.
 */
export function updateBlock(
  doc: BlockDocument,
  blockId: string,
  patch: { content?: string; properties?: Partial<BlockProperties>; type?: BlockType; parentId?: string | null }
): BlockDocument {
  if (!doc || !doc.blocks) return doc;

  const now = new Date().toISOString();
  const updatedBlocks = doc.blocks.map(b => {
    if (b.id !== blockId) return b;
    return {
      ...b,
      ...(patch.content !== undefined ? { content: patch.content } : {}),
      ...(patch.type !== undefined ? { type: patch.type } : {}),
      ...(patch.parentId !== undefined ? { parentId: patch.parentId } : {}),
      properties: patch.properties ? { ...b.properties, ...patch.properties } : b.properties,
      updatedAt: now,
    };
  });

  return {
    ...doc,
    blocks: updatedBlocks,
  };
}

/**
 * Delete a block and all its nested child blocks recursively.
 */
export function deleteBlock(doc: BlockDocument, blockId: string): BlockDocument {
  if (!doc || !doc.blocks) return doc;

  const idsToDelete = new Set<string>();
  
  function collectDescendantIds(targetId: string) {
    idsToDelete.add(targetId);
    doc.blocks.forEach(b => {
      if (b.parentId === targetId && !idsToDelete.has(b.id)) {
        collectDescendantIds(b.id);
      }
    });
  }

  collectDescendantIds(blockId);

  const remaining = doc.blocks.filter(b => !idsToDelete.has(b.id));
  return {
    ...doc,
    blocks: normalizePositions(remaining),
  };
}

/**
 * Duplicate a block immutably. Assigns a FRESH UUID to the duplicated block.
 */
export function duplicateBlock(doc: BlockDocument, blockId: string): { doc: BlockDocument; duplicatedBlock: Block | null } {
  if (!doc || !doc.blocks) return { doc, duplicatedBlock: null };

  const targetIndex = doc.blocks.findIndex(b => b.id === blockId);
  if (targetIndex === -1) return { doc, duplicatedBlock: null };

  const sourceBlock = doc.blocks[targetIndex];
  const now = new Date().toISOString();

  const duplicatedBlock: Block = {
    ...sourceBlock,
    id: uuidv4(), // MANDATORY FRESH UUID FOR DUPLICATES
    position: targetIndex + 1,
    createdAt: now,
    updatedAt: now,
    properties: JSON.parse(JSON.stringify(sourceBlock.properties)),
  };

  const copy = [...doc.blocks];
  copy.splice(targetIndex + 1, 0, duplicatedBlock);

  return {
    doc: {
      ...doc,
      blocks: normalizePositions(copy),
    },
    duplicatedBlock,
  };
}

/**
 * Move a block to a new position index. Preserves the block's existing UUID.
 */
export function moveBlock(doc: BlockDocument, blockId: string, targetPosition: number): BlockDocument {
  if (!doc || !doc.blocks) return doc;

  const currentIndex = doc.blocks.findIndex(b => b.id === blockId);
  if (currentIndex === -1) return doc;

  const copy = [...doc.blocks];
  const [movedBlock] = copy.splice(currentIndex, 1);
  const insertPos = Math.max(0, Math.min(targetPosition, copy.length));

  copy.splice(insertPos, 0, movedBlock);

  return {
    ...doc,
    blocks: normalizePositions(copy),
  };
}

/**
 * Reorder blocks according to a target array of block IDs. Preserves all block UUIDs.
 */
export function reorderBlocks(doc: BlockDocument, orderedIds: string[]): BlockDocument {
  if (!doc || !doc.blocks) return doc;

  const blockMap = new Map<string, Block>(doc.blocks.map(b => [b.id, b]));
  const reordered: Block[] = [];

  orderedIds.forEach(id => {
    const block = blockMap.get(id);
    if (block) {
      reordered.push(block);
      blockMap.delete(id);
    }
  });

  // Append any remaining blocks not specified in orderedIds
  blockMap.forEach(block => reordered.push(block));

  return {
    ...doc,
    blocks: normalizePositions(reordered),
  };
}

/**
 * Normalize block positions sequentially to 0..N-1.
 */
function normalizePositions(blocks: Block[]): Block[] {
  return blocks.map((b, idx) => ({
    ...b,
    position: idx,
  }));
}
