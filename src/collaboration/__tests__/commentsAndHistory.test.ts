import { describe, it, expect } from 'vitest';
import { CommentService } from '../commentService';
import { HistoryService } from '../historyService';

describe('NoteNirman 2.0 P2.8 & P2.9 Suite — Comments & History Foundations', () => {

  describe('Comments Foundation (P2.8)', () => {
    it('1. should anchor comments to stable blockId UUIDs and manage lifecycle', () => {
      const commentService = new CommentService();
      const blockId = 'block-uuid-101';

      const comment = commentService.createComment({
        noteId: 'note-comm-1',
        blockId,
        authorId: 'user-alice',
        authorName: 'Alice',
        content: 'Please verify this calculation block.',
      });

      expect(comment.id).toBeDefined();
      expect(comment.blockId).toBe(blockId);
      expect(comment.resolved).toBe(false);

      const blockComments = commentService.listCommentsForBlock(blockId);
      expect(blockComments).toHaveLength(1);
      expect(blockComments[0].content).toBe('Please verify this calculation block.');

      const resolved = commentService.resolveComment(comment.id, 'user-bob');
      expect(resolved?.resolved).toBe(true);
      expect(resolved?.resolvedBy).toBe('user-bob');
    });
  });

  describe('History Foundation (P2.9)', () => {
    it('2. should record version snapshots with author identity and HTML content', () => {
      const historyService = new HistoryService();
      const noteId = 'note-hist-1';

      const snap1 = historyService.createSnapshot({
        noteId,
        authorId: 'user-alice',
        authorName: 'Alice',
        snapshotHtml: '<h1>V1 Title</h1>',
        blockCount: 1,
        changeSummary: 'Initial document creation',
      });

      expect(snap1.versionId).toBeDefined();
      expect(snap1.noteId).toBe(noteId);

      const snapshots = historyService.listSnapshots(noteId);
      expect(snapshots).toHaveLength(1);
      expect(snapshots[0].changeSummary).toBe('Initial document creation');
    });
  });

});
