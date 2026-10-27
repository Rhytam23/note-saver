import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SearchIndexerService } from '../searchIndexer';
import { localSearchService } from '../localSearchService';
import { processingJobQueue } from '../processingJobQueue';
import { Note } from '../../types';

describe('Phase 4 — Incremental Indexing Engine (P4.7)', () => {
  let indexer: SearchIndexerService;

  const sampleNote: Note = {
    id: 'note-idx-1',
    title: 'Indexing Test Note',
    content: '<h1>Title</h1><p>First paragraph block.</p><ul><li>List item block</li></ul>',
    tags: ['test', 'indexer'],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    isPinned: false,
    priority: 'medium',
  };

  beforeEach(async () => {
    await localSearchService.clearAll();
    indexer = new SearchIndexerService({ debounceMs: 50 });
  });

  it('should process note indexing and generate canonical search documents for title and blocks', async () => {
    const res = await indexer.processNoteIndexing(sampleNote);
    expect(res.indexedDocsCount).toBeGreaterThanOrEqual(3); // 1 title + 2 blocks

    const searchResults = await localSearchService.search('paragraph');
    expect(searchResults).toHaveLength(1);
    expect(searchResults[0].document.noteId).toBe('note-idx-1');
  });

  it('should schedule debounced indexing correctly', async () => {
    vi.useFakeTimers();
    const processSpy = vi.spyOn(indexer, 'processNoteIndexing');

    indexer.scheduleNoteIndexing(sampleNote);
    expect(processSpy).not.toHaveBeenCalled();

    vi.advanceTimersByTime(60);
    expect(processSpy).toHaveBeenCalledWith(sampleNote);

    vi.useRealTimers();
  });

  it('should handle soft deletion of notes cleanly', async () => {
    await indexer.processNoteIndexing(sampleNote);
    let results = await localSearchService.search('Indexing');
    expect(results.length).toBeGreaterThan(0);

    await indexer.handleNoteDeleted('note-idx-1');
    results = await localSearchService.search('Indexing');
    expect(results).toHaveLength(0);
  });

  it('should register search_index jobs in Phase 3 processingJobQueue', async () => {
    const queueSpy = vi.spyOn(processingJobQueue, 'enqueueJob');
    await indexer.processNoteIndexing(sampleNote);

    expect(queueSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        noteId: 'note-idx-1',
        jobType: 'search_index',
      })
    );
  });

  it('should purge existing search data and return zero count when a note is locked', async () => {
    // 1. Index plain note first
    await indexer.processNoteIndexing(sampleNote);
    let results = await localSearchService.search('paragraph');
    expect(results).toHaveLength(1);

    // 2. Now lock the note
    const lockedNote: Note = {
      ...sampleNote,
      content: 'NNLOCK1:mockCiphertextEncryptedContentBase64==',
    };

    const res = await indexer.processNoteIndexing(lockedNote);
    expect(res.indexedDocsCount).toBe(0);
    expect(res.skippedCount).toBe(0);

    // 3. Verify plaintext search documents are completely purged
    results = await localSearchService.search('paragraph');
    expect(results).toHaveLength(0);

    const titleResults = await localSearchService.search('Indexing');
    expect(titleResults).toHaveLength(0);
  });

  it('scheduleNoteIndexing immediately purges search data for locked notes', async () => {
    await indexer.processNoteIndexing(sampleNote);
    expect(await localSearchService.search('paragraph')).toHaveLength(1);

    const lockedNote: Note = {
      ...sampleNote,
      content: 'NNLOCK1:someEncryptedPayload',
    };

    await indexer.scheduleNoteIndexing(lockedNote);
    // Purge is completed immediately without waiting for timers
    const results = await localSearchService.search('paragraph');
    expect(results).toHaveLength(0);
  });
});
