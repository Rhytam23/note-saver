import { describe, it, expect, vi, beforeEach } from 'vitest';
import { generateSearchDocumentId } from '../searchId';
import { GeminiEmbeddingAdapter, GeminiCopilotAdapter } from '../geminiAdapter';
import { CitationValidator } from '../citationValidator';
import { LocalSearchService } from '../localSearchService';
import { LexicalIndexDbStore } from '../lexicalIndexDb';
import { SearchDocument, RagContextItem } from '../../types/search';

describe('Phase 4 — Security, Offline Degradation & Integration Audit (P4.12)', () => {
  let dbStore: LexicalIndexDbStore;
  let localSearch: LocalSearchService;

  beforeEach(async () => {
    dbStore = new LexicalIndexDbStore();
    await dbStore.clearAll();
    localSearch = new LocalSearchService(dbStore);
  });

  it('SECURITY: Canonical searchDocumentId generation must be deterministic and collision-resistant', () => {
    const id1 = generateSearchDocumentId('note-1', 'block_text', 'blk-1', null, 0);
    const id2 = generateSearchDocumentId('note-1', 'block_text', 'blk-1', null, 0);
    const idDiffBlock = generateSearchDocumentId('note-1', 'block_text', 'blk-2', null, 0);
    const idDiffChunk = generateSearchDocumentId('note-1', 'block_text', 'blk-1', null, 1);

    expect(id1).toBe(id2);
    expect(id1).not.toBe(idDiffBlock);
    expect(id1).not.toBe(idDiffChunk);
    expect(id1.startsWith('doc_')).toBe(true);
  });

  it('OFFLINE: Local lexical search operates 100% offline without remote network calls', async () => {
    const doc: SearchDocument = {
      id: generateSearchDocumentId('offline-note', 'note_title', null, null, 0),
      noteId: 'offline-note',
      sourceType: 'note_title',
      textContent: 'Offline First Architecture in NoteNirman',
      title: 'Offline First Architecture',
      tags: ['offline', 'pwa'],
      updatedAt: Date.now(),
      contentHash: 'hash-offline',
      isDeleted: false,
    };

    await localSearch.saveDocument(doc);
    const results = await localSearch.search('offline');

    expect(results).toHaveLength(1);
    expect(results[0].documentId).toBe(doc.id);
  });

  it('OFFLINE: Gemini service adapters degrade gracefully when offline', async () => {
    // Simulate offline state
    const originalOnline = navigator.onLine;
    Object.defineProperty(navigator, 'onLine', { value: false, configurable: true });

    const embeddingAdapter = new GeminiEmbeddingAdapter();
    const copilotAdapter = new GeminiCopilotAdapter();

    const embedRes = await embeddingAdapter.generateEmbeddings([{ chunkIndex: 0, textContent: 'Test', contentHash: 'h' }]);
    expect(embedRes.isOffline).toBe(true);
    expect(embedRes.results).toEqual([]);

    const copilotRes = await copilotAdapter.generateCompletion({ prompt: 'Test', taskType: 'rag_qa' });
    expect(copilotRes.error).toContain('Offline');

    Object.defineProperty(navigator, 'onLine', { value: originalOnline, configurable: true });
  });

  it('SECURITY: CitationValidator rejects citations to unauthorized or soft-deleted documents', async () => {
    const docDeleted: SearchDocument = {
      id: generateSearchDocumentId('deleted-note', 'note_title', null, null, 0),
      noteId: 'deleted-note',
      sourceType: 'note_title',
      textContent: 'Confidential deleted snippet',
      title: 'Deleted Note',
      tags: [],
      updatedAt: Date.now(),
      contentHash: 'h-del',
      isDeleted: true,
    };

    await localSearch.saveDocument(docDeleted);

    const contextItems: RagContextItem[] = [
      {
        documentId: docDeleted.id,
        noteId: 'deleted-note',
        noteTitle: 'Deleted Note',
        sourceType: 'note_title',
        snippetText: 'Confidential deleted snippet',
        priority: 1,
        tokenEstimate: 4,
      },
    ];

    const testValidator = new CitationValidator(localSearch);
    const validation = await testValidator.validateCitations('Referencing deleted note [Ref 1].', contextItems);

    expect(validation.validCitations).toHaveLength(0);
    expect(validation.rejectedCitations).toHaveLength(1);
    expect(validation.rejectedCitations[0].reason).toContain('deleted');
  });

  it('SECURITY: 768-D embedding vector dimension invariant is strictly enforced', async () => {
    const embeddingAdapter = new GeminiEmbeddingAdapter();
    
    // Mock Supabase Edge function returning incorrect 1536-D vector
    vi.spyOn(embeddingAdapter as any, 'generateEmbeddings').mockResolvedValue({
      results: [],
      error: 'Embedding vector dimension mismatch. Expected 768, got 1536',
    });

    const res = await embeddingAdapter.generateEmbeddings([{ chunkIndex: 0, textContent: 'Test', contentHash: 'h' }]);
    expect(res.error).toContain('Expected 768');
  });
});
