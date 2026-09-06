import { describe, it, expect, vi, beforeEach } from 'vitest';
import { RagPipeline, RAG_CONTEXT_TOKEN_BUDGET } from '../ragPipeline';
import { HybridSearchEngine } from '../hybridSearchEngine';
import { GeminiEmbeddingAdapter } from '../geminiAdapter';
import { HybridSearchResult } from '../../types/search';

describe('Phase 4 — RAG Pipeline & Context Budgeting (P4.9)', () => {
  let mockHybridSearch: HybridSearchEngine;
  let mockEmbeddingAdapter: GeminiEmbeddingAdapter;
  let pipeline: RagPipeline;

  beforeEach(() => {
    mockHybridSearch = {
      search: vi.fn(),
    } as unknown as HybridSearchEngine;

    mockEmbeddingAdapter = {
      generateEmbeddings: vi.fn().mockResolvedValue({
        results: [{ chunkIndex: 0, vector: new Array(768).fill(0.01) }],
      }),
    } as unknown as GeminiEmbeddingAdapter;

    pipeline = new RagPipeline(mockHybridSearch, mockEmbeddingAdapter);
  });

  it('should return empty bundle for blank query', async () => {
    const bundle = await pipeline.buildRagContext('   ');
    expect(bundle.contextItems).toEqual([]);
    expect(bundle.totalTokensEstimate).toBe(0);
    expect(bundle.truncated).toBe(false);
  });

  it('should prioritize active note blocks higher than passive workspace results', async () => {
    const mockHybridResults: HybridSearchResult[] = [
      {
        documentId: 'doc-passive',
        rrfScore: 0.030,
        document: {
          id: 'doc-passive',
          noteId: 'passive-note-99',
          sourceType: 'block_text',
          textContent: 'Passive note text',
          title: 'Passive Note',
          tags: [],
          updatedAt: 100,
          contentHash: 'h1',
          isDeleted: false,
        },
      },
      {
        documentId: 'doc-active',
        rrfScore: 0.025, // Lower raw RRF score, but belonging to activeNoteId
        document: {
          id: 'doc-active',
          noteId: 'active-note-1',
          sourceType: 'block_text',
          textContent: 'Active note text content',
          title: 'Active Note Title',
          tags: [],
          updatedAt: 200,
          contentHash: 'h2',
          isDeleted: false,
        },
      },
    ];

    vi.spyOn(mockHybridSearch, 'search').mockResolvedValue(mockHybridResults);

    const bundle = await pipeline.buildRagContext('search query', {
      activeNoteId: 'active-note-1',
      activeNoteTitle: 'Active Note Title',
    });

    expect(bundle.contextItems).toHaveLength(2);
    // Active note item should be prioritized to index 0 due to 1.5x boost (0.025 * 1.5 = 0.0375 > 0.030)
    expect(bundle.contextItems[0].documentId).toBe('doc-active');
    expect(bundle.contextItems[1].documentId).toBe('doc-passive');
  });

  it('should strictly enforce context token budget limits', async () => {
    const longText1 = 'A'.repeat(400); // ~100 tokens
    const longText2 = 'B'.repeat(400); // ~100 tokens

    const mockHybridResults: HybridSearchResult[] = [
      {
        documentId: 'doc-1',
        rrfScore: 0.03,
        document: {
          id: 'doc-1',
          noteId: 'note-1',
          sourceType: 'block_text',
          textContent: longText1,
          title: 'Note 1',
          tags: [],
          updatedAt: 100,
          contentHash: 'h1',
          isDeleted: false,
        },
      },
      {
        documentId: 'doc-2',
        rrfScore: 0.02,
        document: {
          id: 'doc-2',
          noteId: 'note-2',
          sourceType: 'block_text',
          textContent: longText2,
          title: 'Note 2',
          tags: [],
          updatedAt: 100,
          contentHash: 'h2',
          isDeleted: false,
        },
      },
    ];

    vi.spyOn(mockHybridSearch, 'search').mockResolvedValue(mockHybridResults);

    // Provide a small token budget (e.g. 110 tokens -> ~440 chars)
    const bundle = await pipeline.buildRagContext('query', {
      tokenBudget: 110,
    });

    expect(bundle.truncated).toBe(true);
    expect(bundle.contextItems.length).toBeLessThan(2);
  });
});
