import { v4 as uuidv4 } from 'uuid';
import type { BlockComment, CreateCommentPayload } from '../types/comment';

/**
 * NoteNirman 2.0 — Comments & Annotations Service Layer Foundation
 * 
 * Manages block-anchored comments:
 * - Validates blockId presence.
 * - In-memory foundation supporting future remote backend sync.
 */
export class CommentService {
  private comments: Map<string, BlockComment> = new Map();

  public createComment(payload: CreateCommentPayload): BlockComment {
    if (!payload.noteId || !payload.blockId || !payload.content.trim()) {
      throw new Error('[CommentService] Invalid comment payload: noteId, blockId, and content are required.');
    }

    const now = new Date().toISOString();
    const comment: BlockComment = {
      id: uuidv4(),
      noteId: payload.noteId,
      blockId: payload.blockId,
      authorId: payload.authorId,
      authorName: payload.authorName,
      authorAvatar: payload.authorAvatar,
      content: payload.content.trim(),
      createdAt: now,
      updatedAt: now,
      resolved: false,
    };

    this.comments.set(comment.id, comment);
    return { ...comment };
  }

  public resolveComment(commentId: string, resolvedBy: string): BlockComment | null {
    const comment = this.comments.get(commentId);
    if (!comment) return null;

    const updated: BlockComment = {
      ...comment,
      resolved: true,
      resolvedBy,
      resolvedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    this.comments.set(commentId, updated);
    return { ...updated };
  }

  public deleteComment(commentId: string): boolean {
    return this.comments.delete(commentId);
  }

  public getComment(commentId: string): BlockComment | null {
    const c = this.comments.get(commentId);
    return c ? { ...c } : null;
  }

  public listCommentsForBlock(blockId: string): BlockComment[] {
    const list: BlockComment[] = [];
    this.comments.forEach(c => {
      if (c.blockId === blockId) {
        list.push({ ...c });
      }
    });
    return list.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  }

  public listCommentsForNote(noteId: string): BlockComment[] {
    const list: BlockComment[] = [];
    this.comments.forEach(c => {
      if (c.noteId === noteId) {
        list.push({ ...c });
      }
    });
    return list.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  }

  public clear(): void {
    this.comments.clear();
  }
}
