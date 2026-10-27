import { Note } from '../types';
import { SearchDocument } from '../types/search';
import { parseHtmlToBlocks } from './blockParser';
import { generateSearchDocumentId, sha256Hex } from './searchId';
import { localSearchService } from './localSearchService';
import { geminiEmbeddingAdapter } from './geminiAdapter';
import { vectorSearchService } from './vectorSearchService';
import { processingJobQueue } from './processingJobQueue';
import { isNoteLocked } from './noteLock';

export interface IndexerOptions {
  debounceMs?: number;
}

export class SearchIndexerService {
  private debounceTimers: Map<string, ReturnType<typeof setTimeout>> = new Map();
  private debounceMs: number;

  constructor(options: IndexerOptions = {}) {
    this.debounceMs = options.debounceMs ?? 2000;
  }

  /**
   * Enqueues an asynchronous debounced indexing task for a note.
   * If note is locked, cancels pending timers and immediately purges search data.
   */
  public async scheduleNoteIndexing(note: Note): Promise<void> {
    if (!note) return;

    if (this.debounceTimers.has(note.id)) {
      clearTimeout(this.debounceTimers.get(note.id));
      this.debounceTimers.delete(note.id);
    }

    if (isNoteLocked(note)) {
      await this.purgeNoteSearchData(note.id);
      return;
    }

    const timer = setTimeout(async () => {
      this.debounceTimers.delete(note.id);
      await this.processNoteIndexing(note);
    }, this.debounceMs);

    this.debounceTimers.set(note.id, timer);
  }

  /**
   * Immediately processes indexing for a note (idempotent, content-hash guarded).
   * Automatically purges search records and aborts if note is locked or deleted.
   */
  public async processNoteIndexing(note: Note): Promise<{ indexedDocsCount: number; skippedCount: number }> {
    if (!note || note.deleted || note.syncStatus === 'failed') {
      if (note?.deleted) {
        await this.handleNoteDeleted(note.id);
      }
      return { indexedDocsCount: 0, skippedCount: 0 };
    }

    if (isNoteLocked(note)) {
      await this.purgeNoteSearchData(note.id);
      return { indexedDocsCount: 0, skippedCount: 0 };
    }

    // Also register job in Phase 3 processingJobQueue for audit/retry tracking
    await processingJobQueue.enqueueJob({
      attachmentId: `idx_${note.id}`,
      noteId: note.id,
      jobType: 'search_index',
    });

    const parsedBlocks = parseHtmlToBlocks(note.content || '');
    const now = Date.now();

    const searchDocsToSave: SearchDocument[] = [];
    const embeddingChunksToGenerate: Array<{
      documentId: string;
      chunkIndex: number;
      textContent: string;
      contentHash: string;
      noteId: string;
      blockId?: string;
      sourceType: any;
    }> = [];

    const skippedCount = 0;

    // 1. Note Title Document
    const titleDocId = generateSearchDocumentId(note.id, 'note_title', null, null, 0);
    const titleHash = sha256Hex(note.title || '');
    const titleDoc: SearchDocument = {
      id: titleDocId,
      noteId: note.id,
      sourceType: 'note_title',
      textContent: note.title || '',
      title: note.title || '',
      tags: note.tags || [],
      updatedAt: now,
      contentHash: titleHash,
      isDeleted: false,
    };
    searchDocsToSave.push(titleDoc);
    embeddingChunksToGenerate.push({
      documentId: titleDocId,
      chunkIndex: 0,
      textContent: note.title || '',
      contentHash: titleHash,
      noteId: note.id,
      sourceType: 'note_title',
    });

    // 2. Document Blocks
    for (let i = 0; i < parsedBlocks.length; i++) {
      const block = parsedBlocks[i];
      const blockText = block.content || '';
      if (!blockText.trim()) continue;

      const blockDocId = generateSearchDocumentId(note.id, 'block_text', block.id, null, 0);
      const blockHash = sha256Hex(blockText);

      const blockDoc: SearchDocument = {
        id: blockDocId,
        noteId: note.id,
        blockId: block.id,
        sourceType: 'block_text',
        textContent: blockText,
        title: note.title || '',
        tags: note.tags || [],
        updatedAt: now,
        contentHash: blockHash,
        isDeleted: false,
      };

      searchDocsToSave.push(blockDoc);
      embeddingChunksToGenerate.push({
        documentId: blockDocId,
        chunkIndex: 0,
        textContent: blockText,
        contentHash: blockHash,
        noteId: note.id,
        blockId: block.id,
        sourceType: 'block_text',
      });
    }

    // Save lexical index documents locally (Web Worker / IDB)
    await localSearchService.saveDocuments(searchDocsToSave);

    // Generate remote vector embeddings if online
    if (embeddingChunksToGenerate.length > 0 && typeof navigator !== 'undefined' && navigator.onLine) {
      const chunksForEmbed = embeddingChunksToGenerate.map((c, idx) => ({
        chunkIndex: idx,
        textContent: c.textContent,
        contentHash: c.contentHash,
      }));

      const embedRes = await geminiEmbeddingAdapter.generateEmbeddings(chunksForEmbed);
      if (embedRes.results && embedRes.results.length > 0) {
        const recordsToSave = embedRes.results.map(resItem => {
          const original = embeddingChunksToGenerate[resItem.chunkIndex];
          return {
            id: original.documentId,
            userId: 'local_user',
            noteId: original.noteId,
            blockId: original.blockId,
            sourceType: original.sourceType,
            contentHash: original.contentHash,
            chunkIndex: 0,
            textContent: original.textContent,
            metadata: { title: note.title, tags: note.tags },
            embedding: resItem.vector,
          };
        });

        await vectorSearchService.saveEmbeddingRecordsBatch(recordsToSave);
      }
    }

    return { indexedDocsCount: searchDocsToSave.length, skippedCount };
  }

  public async handleNoteDeleted(noteId: string): Promise<void> {
    this.cancelPending(noteId);
    await localSearchService.removeNote(noteId);
    await vectorSearchService.deleteEmbeddingsForNote(noteId);
  }

  /**
   * Purges all existing embeddings and search documents across local and remote stores.
   */
  public async purgeNoteSearchData(noteId: string): Promise<void> {
    await this.handleNoteDeleted(noteId);
  }

  public cancelPending(noteId: string): void {
    if (this.debounceTimers.has(noteId)) {
      clearTimeout(this.debounceTimers.get(noteId));
      this.debounceTimers.delete(noteId);
    }
  }
}

export const searchIndexer = new SearchIndexerService();
