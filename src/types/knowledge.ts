/**
 * NoteNirman 2.0 Knowledge Graph & Entity Link Contracts
 */

export type EntityType = 'note' | 'block' | 'tag' | 'canvas' | 'database' | 'task' | 'attachment';

export interface EntityId {
  id: string;
  type: EntityType;
}

export type LinkType = 'wikilink' | 'tag' | 'mention' | 'relation' | 'backlink';

export interface KnowledgeLink {
  id: string; // Unique link UUID
  sourceNoteId: string;
  targetNoteId: string;
  sourceBlockId?: string;
  targetBlockId?: string;
  anchorText?: string;
  type: LinkType;
  createdAt: string;
  updatedAt?: string;
}

export interface WikiLinkMention {
  rawText: string;
  targetTitleOrId: string;
  alias?: string;
  position: {
    start: number;
    end: number;
  };
}

export interface GraphNode {
  id: string; // Note ID
  label: string; // Note title
  type: EntityType;
  tags: string[];
  linkCount: number;
  val?: number; // Visual size weight
}

export interface GraphEdge {
  id: string;
  source: string; // Source Node ID
  target: string; // Target Node ID
  type: LinkType;
}

export interface KnowledgeGraphData {
  nodes: GraphNode[];
  edges: GraphEdge[];
}
