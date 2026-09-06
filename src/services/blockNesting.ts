import type { Block } from '../types/block';
import type { BlockDocument } from './blockDocument';

/**
 * NoteNirman 2.0 P1.9 Block Nesting & Validation Engine
 * 
 * Manages parent/child hierarchical block relationships and prevents circular dependencies.
 */

export interface NestingValidationResult {
  isValid: boolean;
  error?: string;
  circularBlockId?: string;
}

/**
 * Validate that a BlockDocument contains no self-referencing or circular parent relationships.
 */
export function validateBlockNesting(doc: BlockDocument): NestingValidationResult {
  if (!doc || !doc.blocks) return { isValid: true };

  const blockMap = new Map<string, Block>(doc.blocks.map(b => [b.id, b]));

  for (const block of doc.blocks) {
    if (block.parentId === block.id) {
      return {
        isValid: false,
        error: `Block ${block.id} cannot be its own parent.`,
        circularBlockId: block.id,
      };
    }

    // Trace parent chain for cycles
    const visited = new Set<string>([block.id]);
    let currentParentId = block.parentId;

    while (currentParentId) {
      if (visited.has(currentParentId)) {
        return {
          isValid: false,
          error: `Circular parent relationship detected involving block ${currentParentId}.`,
          circularBlockId: currentParentId,
        };
      }
      visited.add(currentParentId);
      const parent = blockMap.get(currentParentId);
      currentParentId = parent ? parent.parentId : null;
    }
  }

  return { isValid: true };
}

/**
 * Indent a block: sets its parentId to the preceding block at the same root level.
 */
export function indentBlock(doc: BlockDocument, blockId: string): BlockDocument {
  if (!doc || !doc.blocks) return doc;

  const index = doc.blocks.findIndex(b => b.id === blockId);
  if (index <= 0) return doc; // Cannot indent first block

  const targetBlock = doc.blocks[index];
  const previousBlock = doc.blocks[index - 1];

  // Set parent to previous block if they share the same parent level
  if (previousBlock.parentId === targetBlock.parentId) {
    const updatedBlocks = doc.blocks.map(b => {
      if (b.id === blockId) {
        return { ...b, parentId: previousBlock.id, updatedAt: new Date().toISOString() };
      }
      return b;
    });

    const newDoc = { ...doc, blocks: updatedBlocks };
    const validation = validateBlockNesting(newDoc);
    return validation.isValid ? newDoc : doc;
  }

  return doc;
}

/**
 * Outdent a block: sets its parentId to its parent's parentId (moving it up one level).
 */
export function outdentBlock(doc: BlockDocument, blockId: string): BlockDocument {
  if (!doc || !doc.blocks) return doc;

  const targetBlock = doc.blocks.find(b => b.id === blockId);
  if (!targetBlock || !targetBlock.parentId) return doc; // Already at root level

  const parentBlock = doc.blocks.find(b => b.id === targetBlock.parentId);
  const newParentId = parentBlock ? parentBlock.parentId : null;

  const updatedBlocks = doc.blocks.map(b => {
    if (b.id === blockId) {
      return { ...b, parentId: newParentId, updatedAt: new Date().toISOString() };
    }
    return b;
  });

  return { ...doc, blocks: updatedBlocks };
}

/**
 * Return blocks structured into root blocks and a map of children.
 */
export function getStructuredBlockHierarchy(blocks: Block[]): {
  rootBlocks: Block[];
  childrenMap: Map<string, Block[]>;
} {
  const rootBlocks: Block[] = [];
  const childrenMap = new Map<string, Block[]>();

  blocks.forEach(b => {
    if (!b.parentId) {
      rootBlocks.push(b);
    } else {
      if (!childrenMap.has(b.parentId)) {
        childrenMap.set(b.parentId, []);
      }
      childrenMap.get(b.parentId)!.push(b);
    }
  });

  return { rootBlocks, childrenMap };
}
