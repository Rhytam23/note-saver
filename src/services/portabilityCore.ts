import type { Block } from '../types/block';
import type { BlockDocument } from './blockDocument';
import { createBlockDocument, serializeBlockDocument } from './blockDocument';
import type { PortabilityAST, PortabilityNode, PortabilityOptions } from '../types/portability';

/**
 * NoteNirman 2.0 Phase 5 — Data Portability Core Service (P5.1)
 * 
 * Provides pure, platform-agnostic AST serialization contracts converting:
 * Note.content HTML ↔ BlockDocument AST ↔ PortabilityAST
 * 
 * Invariants Guaranteed:
 * 1. Storage Primacy: Note.content HTML string remains the durable canonical persisted format.
 * 2. Block Identity Preservation: Stable UUIDs (data-block-id) survive full round-trips.
 * 3. Pure Functions: Zero side-effects or direct IndexedDB IO in portability core.
 */

/**
 * Convert a single Block object into a normalized PortabilityNode.
 */
export function blockToPortabilityNode(block: Block): PortabilityNode {
  const metadata: Record<string, string | number | boolean | null> = {};
  if (block.metadata) {
    Object.entries(block.metadata).forEach(([k, v]) => {
      if (typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean' || v === null) {
        metadata[k] = v;
      }
    });
  }

  return {
    id: block.id,
    parentId: block.parentId || null,
    type: block.type,
    content: block.content,
    properties: { ...block.properties },
    position: block.position,
    metadata: Object.keys(metadata).length > 0 ? metadata : undefined,
  };
}

/**
 * Convert a PortabilityNode back into a Universal Block object.
 */
export function portabilityNodeToBlock(node: PortabilityNode, noteId: string): Block {
  const now = new Date().toISOString();
  return {
    id: node.id,
    noteId,
    parentId: node.parentId || null,
    type: node.type,
    content: node.content,
    properties: { ...node.properties },
    position: node.position ?? 0,
    createdAt: now,
    updatedAt: now,
    metadata: node.metadata ? { ...node.metadata } : undefined,
  };
}

/**
 * Convert an in-memory BlockDocument into a normalized PortabilityAST representation.
 */
export function blockDocumentToPortabilityAST(
  doc: BlockDocument,
  title: string = 'Untitled Note',
  options: PortabilityOptions = {}
): PortabilityAST {
  if (!doc) {
    return {
      noteId: '',
      title,
      nodes: [],
      version: 1,
      exportedAt: Date.now(),
    };
  }

  const includeMetadata = options.includeMetadata ?? true;
  const nodes: PortabilityNode[] = (doc.blocks || []).map(b => blockToPortabilityNode(b));

  const metadata: Record<string, string | number | boolean | null> = {};
  if (includeMetadata && doc.metadata) {
    Object.entries(doc.metadata).forEach(([k, v]) => {
      if (typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean' || v === null) {
        metadata[k] = v;
      }
    });
  }

  return {
    noteId: doc.noteId,
    title,
    nodes,
    version: doc.version || 1,
    exportedAt: Date.now(),
    metadata: Object.keys(metadata).length > 0 ? metadata : undefined,
  };
}

/**
 * Convert a PortabilityAST representation back into an in-memory BlockDocument object.
 */
export function portabilityASTToBlockDocument(ast: PortabilityAST): BlockDocument {
  if (!ast || !ast.nodes) {
    return {
      noteId: ast?.noteId || '',
      blocks: [],
      version: ast?.version || 1,
      metadata: {},
    };
  }

  const blocks: Block[] = ast.nodes.map((node, idx) => {
    const block = portabilityNodeToBlock(node, ast.noteId);
    return { ...block, position: idx };
  });

  return {
    noteId: ast.noteId,
    blocks,
    version: ast.version || 1,
    metadata: ast.metadata ? { ...ast.metadata } : {},
  };
}

/**
 * Convenience helper: parse raw Note.content HTML directly into a PortabilityAST.
 */
export function noteContentToPortabilityAST(
  noteId: string,
  htmlContent: string,
  title: string = 'Untitled Note'
): PortabilityAST {
  const doc = createBlockDocument(noteId, htmlContent || '');
  return blockDocumentToPortabilityAST(doc, title);
}

/**
 * Convenience helper: convert a PortabilityAST back into a canonical Note.content HTML string.
 */
export function portabilityASTToNoteContent(ast: PortabilityAST): string {
  const doc = portabilityASTToBlockDocument(ast);
  return serializeBlockDocument(doc);
}
