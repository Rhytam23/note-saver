/**
 * NoteNirman 2.0 — Collaborative Version History Data Model Foundation
 * 
 * Defines history snapshots that bind author identity, timestamp, block document state,
 * and optional Yjs binary update vectors.
 */

export interface DocumentVersionSnapshot {
  versionId: string;
  noteId: string;
  authorId: string;
  authorName: string;
  timestamp: string;
  blockCount: number;
  snapshotHtml: string;
  changeSummary?: string;
  ydocVectorBase64?: string;
  metadata?: Record<string, any>;
}

export interface CreateSnapshotPayload {
  noteId: string;
  authorId: string;
  authorName: string;
  snapshotHtml: string;
  blockCount: number;
  changeSummary?: string;
  ydocVectorBase64?: string;
}
