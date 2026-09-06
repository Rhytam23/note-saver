/**
 * NoteNirman 2.0 — Block Comment & Annotation Data Model
 * 
 * Invariants:
 * - Comments are strictly anchored to stable `blockId` UUIDs.
 * - Array indexes or text offsets alone are NEVER used as primary anchors.
 * - Designed for future durable persistence without schema breaking changes.
 */

export interface BlockComment {
  id: string;
  noteId: string;
  blockId: string;
  authorId: string;
  authorName: string;
  authorAvatar?: string;
  content: string;
  createdAt: string;
  updatedAt: string;
  resolved: boolean;
  resolvedBy?: string;
  resolvedAt?: string;
  metadata?: Record<string, any>;
}

export interface CreateCommentPayload {
  noteId: string;
  blockId: string;
  authorId: string;
  authorName: string;
  authorAvatar?: string;
  content: string;
}
