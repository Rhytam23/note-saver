import { v4 as uuidv4 } from 'uuid';
import type { Block, BlockType, BlockProperties } from '../types/block';
import { parseHtmlToBlocks, parseBlocksToHtml } from './blockParser';

/**
 * NoteNirman 2.0 P1.1 Block Document Adapter
 * 
 * Boundary layer between raw TipTap Note HTML content and Universal Block objects.
 * Guarantees:
 * 1. Storage Non-Destructiveness: `Note.content` remains the canonical persisted format.
 * 2. Stable Block Identity: `data-block-id` preserved across parse/serialize cycles.
 * 3. Immutable Operations: All state mutations return fresh BlockDocument objects.
 */

export interface BlockDocument {
  noteId: string;
  blocks: Block[];
  version: number;
  metadata?: Record<string, any>;
}

/**
 * Instantiate a BlockDocument from a Note's HTML content or raw blocks.
 */
export function createBlockDocument(
  noteId: string,
  htmlContent: string = '',
  version: number = 1,
  metadata?: Record<string, any>
): BlockDocument {
  const blocks = parseHtmlToBlocks(htmlContent, noteId);
  return {
    noteId,
    blocks,
    version,
    metadata: metadata || {},
  };
}

/**
 * Serialize a BlockDocument back into a standard compatible HTML string.
 */
export function serializeBlockDocument(doc: BlockDocument): string {
  if (!doc || !doc.blocks) return '';
  return parseBlocksToHtml(doc.blocks);
}

/**
 * Find a specific Block within a BlockDocument by its stable UUID.
 */
export function findBlock(doc: BlockDocument, blockId: string): Block | undefined {
  if (!doc || !doc.blocks) return undefined;
  return doc.blocks.find(b => b.id === blockId);
}

/**
 * Immutably update a Block within a BlockDocument by its ID.
 * Preserves stable block ID and updates timestamp.
 */
export function updateBlock(
  doc: BlockDocument,
  blockId: string,
  patch: Partial<Omit<Block, 'id' | 'noteId'>>
): BlockDocument {
  if (!doc || !doc.blocks) return doc;

  const now = new Date().toISOString();
  const updatedBlocks = doc.blocks.map(b => {
    if (b.id !== blockId) return b;
    return {
      ...b,
      ...patch,
      updatedAt: now,
      properties: patch.properties
        ? { ...b.properties, ...patch.properties }
        : b.properties,
    };
  });

  return {
    ...doc,
    blocks: updatedBlocks,
  };
}

/**
 * Immutably remove a Block by ID and recalculate block positions.
 */
export function removeBlock(doc: BlockDocument, blockId: string): BlockDocument {
  if (!doc || !doc.blocks) return doc;

  const filtered = doc.blocks.filter(b => b.id !== blockId);
  const reindexed = filtered.map((b, idx) => ({ ...b, position: idx }));

  return {
    ...doc,
    blocks: reindexed,
  };
}

/**
 * Immutably add a new Block into a BlockDocument at a target position.
 */
export function addBlock(
  doc: BlockDocument,
  blockInput: {
    type: BlockType;
    content: string;
    properties?: BlockProperties;
    id?: string;
    parentId?: string | null;
  },
  targetIndex?: number
): { doc: BlockDocument; newBlock: Block } {
  const now = new Date().toISOString();
  const newBlock: Block = {
    id: blockInput.id || uuidv4(),
    noteId: doc.noteId,
    parentId: blockInput.parentId || null,
    type: blockInput.type,
    content: blockInput.content,
    properties: blockInput.properties || {},
    position: 0,
    createdAt: now,
    updatedAt: now,
  };

  const copy = [...doc.blocks];
  const insertAt = (targetIndex !== undefined && targetIndex >= 0 && targetIndex <= copy.length)
    ? targetIndex
    : copy.length;

  copy.splice(insertAt, 0, newBlock);
  const reindexed = copy.map((b, idx) => ({ ...b, position: idx }));

  return {
    doc: {
      ...doc,
      blocks: reindexed,
    },
    newBlock,
  };
}

/**
 * Immutably reorder blocks according to a list of block IDs.
 * Stable identity rule: Block IDs remain attached to their respective blocks; only position is updated.
 */
export function reorderBlocks(doc: BlockDocument, newOrderIds: string[]): BlockDocument {
  if (!doc || !doc.blocks) return doc;

  const blockMap = new Map<string, Block>(doc.blocks.map(b => [b.id, b]));
  const reordered: Block[] = [];

  // Add blocks in requested order
  newOrderIds.forEach(id => {
    const block = blockMap.get(id);
    if (block) {
      reordered.push(block);
      blockMap.delete(id);
    }
  });

  // Append any remaining blocks not in newOrderIds list
  blockMap.forEach(block => reordered.push(block));

  // Reindex positions sequentially
  const reindexed = reordered.map((b, idx) => ({ ...b, position: idx }));

  return {
    ...doc,
    blocks: reindexed,
  };
}

/**
 * Deep clone a BlockDocument while preserving block IDs.
 */
export function cloneBlockDocument(doc: BlockDocument): BlockDocument {
  if (!doc) return doc;
  return {
    ...doc,
    blocks: doc.blocks.map(b => ({
      ...b,
      properties: { ...b.properties },
      metadata: b.metadata ? { ...b.metadata } : undefined,
    })),
    metadata: doc.metadata ? { ...doc.metadata } : {},
  };
}
