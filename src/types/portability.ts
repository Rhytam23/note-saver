/**
 * NoteNirman 2.0 Phase 5 Data Portability Core Types
 * 
 * Defines normalized, platform-agnostic AST contracts for cross-format import, export, and full-fidelity backup.
 */

import type { BlockType, BlockProperties } from './block';

export interface PortabilityNode {
  id: string; // Stable UUID (data-block-id)
  parentId?: string | null;
  type: BlockType;
  content: string;
  properties: BlockProperties;
  position: number;
  children?: PortabilityNode[];
  metadata?: Record<string, string | number | boolean | null>;
}

export interface PortabilityAST {
  noteId: string;
  title: string;
  nodes: PortabilityNode[];
  version: number;
  exportedAt: number; // Epoch ms
  metadata?: Record<string, string | number | boolean | null>;
}

export interface PortabilityOptions {
  preserveBlockIds?: boolean; // Default true
  includeMetadata?: boolean;  // Default true
}
