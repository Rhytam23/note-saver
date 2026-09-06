/**
 * NoteNirman 2.0 Universal Block Model
 */

export type BlockType =
  | 'paragraph'
  | 'heading'
  | 'quote'
  | 'callout'
  | 'bulletList'
  | 'numberedList'
  | 'checklist'
  | 'task'
  | 'code'
  | 'table'
  | 'image'
  | 'video'
  | 'audio'
  | 'file'
  | 'pdf'
  | 'math'
  | 'diagram'
  | 'bookmark'
  | 'embed'
  | 'database'
  | 'ai'
  | 'divider'
  | 'toggle';

export interface BlockProperties {
  level?: 1 | 2 | 3 | 4 | 5 | 6;
  language?: string;
  checked?: boolean;
  status?: string;
  priority?: 'high' | 'medium' | 'low' | 'none';
  dueDate?: string | null;
  assigneeId?: string | null;
  url?: string;
  caption?: string;
  emoji?: string;
  rawHtml?: string;
  style?: Record<string, any>;
  [key: string]: any;
}

export interface BlockMetadata {
  version?: number;
  authorId?: string;
  lastEditedBy?: string;
  [key: string]: any;
}

export interface Block {
  id: string; // Stable UUID
  noteId: string; // Parent note stable ID
  parentId?: string | null; // Supports block nesting
  type: BlockType;
  content: string; // Text content or serialized body
  properties: BlockProperties;
  position: number;
  createdAt: string;
  updatedAt: string;
  metadata?: BlockMetadata;
}
