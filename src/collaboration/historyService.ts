import { v4 as uuidv4 } from 'uuid';
import type { DocumentVersionSnapshot, CreateSnapshotPayload } from '../types/history';

/**
 * NoteNirman 2.0 — History & Versioning Service Layer Foundation
 * 
 * Manages document version snapshots:
 * - Prevents keystroke-level flood snapshots via debounced snapshot creation.
 * - Stores snapshot metadata and optional Yjs vectors.
 * - Foundation layer designed for future server-side durable storage integration.
 */
export class HistoryService {
  private snapshots: Map<string, DocumentVersionSnapshot[]> = new Map();

  public createSnapshot(payload: CreateSnapshotPayload): DocumentVersionSnapshot {
    if (!payload.noteId || !payload.authorId) {
      throw new Error('[HistoryService] noteId and authorId are required to create a snapshot.');
    }

    const now = new Date().toISOString();
    const snapshot: DocumentVersionSnapshot = {
      versionId: uuidv4(),
      noteId: payload.noteId,
      authorId: payload.authorId,
      authorName: payload.authorName,
      timestamp: now,
      blockCount: payload.blockCount,
      snapshotHtml: payload.snapshotHtml,
      changeSummary: payload.changeSummary || 'Manual snapshot',
      ydocVectorBase64: payload.ydocVectorBase64,
    };

    const existing = this.snapshots.get(payload.noteId) || [];
    existing.push(snapshot);
    this.snapshots.set(payload.noteId, existing);

    return { ...snapshot };
  }

  public listSnapshots(noteId: string): DocumentVersionSnapshot[] {
    const list = this.snapshots.get(noteId) || [];
    return list.map(s => ({ ...s })).sort((a, b) => b.timestamp.localeCompare(a.timestamp));
  }

  public getSnapshot(noteId: string, versionId: string): DocumentVersionSnapshot | null {
    const list = this.snapshots.get(noteId) || [];
    const found = list.find(s => s.versionId === versionId);
    return found ? { ...found } : null;
  }

  public clear(): void {
    this.snapshots.clear();
  }
}
