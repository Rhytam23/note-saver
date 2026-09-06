import { describe, it, expect, vi, beforeEach } from 'vitest';
import { HybridSearchEngine, RRF_CONSTANT } from '../hybridSearchEngine';
import { LocalSearchService } from '../localSearchService';
import { VectorSearchService } from '../vectorSearchService';
import { LexicalSearchResult, VectorSearchResult } from '../../types/search';

describe('Phase 4 — Hybrid Retrieval & RRF (P4.8)', () => {
  let mockLocalSearch: LocalSearchService;
  let mockVectorSearch: VectorSearchService;
  let hybridEngine: HybridSearchEngine;

  beforeEach(() => {
    mockLocalSearch = {
      search: vi.fn(),
    } as unknown as LocalSearchService;

    mockVectorSearch = {
      searchVectorSimilarity: vi.fn(),
    } as unknown as VectorSearchService;

    hybridEngine = new HybridSearchEngine(mockLocalSearch, mockVectorSearch);
  });

  it('should return empty results for blank query', async () => {
    const results = await hybridEngine.search('   ');
    expect(results).toEqual([]);
  });

  it('should return lexical-only results when no query embedding is provided', async () => {
    const mockLexical: LexicalSearchResult[] = [
      {
        documentId: 'doc-1',
        score: 4.5,
        matches: ['quantum'],
        document: {
          id: 'doc-1',
          noteId: 'note-1',
          sourceType: 'note_title',
          textContent: 'Quantum Computing Overview',
          title: 'Quantum Computing Overview',
          tags: ['tech'],
          updatedAt: 1000,
          contentHash: 'hash-1',
          isDeleted: false,
        },
      },
    ];

    vi.spyOn(mockLocalSearch, 'search').mockResolvedValue(mockLexical);

    const results = await hybridEngine.search('quantum');
    expect(results).toHaveLength(1);
    expect(results[0].documentId).toBe('doc-1');
    expect(results[0].lexicalRank).toBe(1);
    expect(results[0].vectorRank).toBeUndefined();
    expect(results[0].rrfScore).toBeCloseTo(1 / (RRF_CONSTANT + 1));
  });

  it('should fuse lexical and vector results correctly using RRF', async () => {
    const mockLexical: LexicalSearchResult[] = [
      {
        documentId: 'doc-both', // Rank 1 lexical
        score: 5.0,
        matches: ['ai'],
        document: {
          id: 'doc-both',
          noteId: 'note-1',
          sourceType: 'block_text',
          textContent: 'Artificial Intelligence foundations',
          title: 'AI Notes',
          tags: ['ai'],
          updatedAt: 1000,
          contentHash: 'h-both',
          isDeleted: false,
        },
      },
      {
        documentId: 'doc-lex-only', // Rank 2 lexical
        score: 3.0,
        matches: ['ai'],
        document: {
          id: 'doc-lex-only',
          noteId: 'note-2',
          sourceType: 'block_text',
          textContent: 'Lexical match for AI',
          title: 'AI Glossary',
          tags: ['ai'],
          updatedAt: 1000,
          contentHash: 'h-lex',
          isDeleted: false,
        },
      },
    ];

    const mockVector: VectorSearchResult[] = [
      {
        documentId: 'doc-vec-only', // Rank 1 vector
        similarity: 0.92,
        noteId: 'note-3',
        sourceType: 'block_text',
        textContent: 'Deep Neural Networks description',
        metadata: { title: 'Neural Nets' },
      },
      {
        documentId: 'doc-both', // Rank 2 vector
        similarity: 0.88,
        noteId: 'note-1',
        sourceType: 'block_text',
        textContent: 'Artificial Intelligence foundations',
        metadata: { title: 'AI Notes' },
      },
    ];

    vi.spyOn(mockLocalSearch, 'search').mockResolvedValue(mockLexical);
    vi.spyOn(mockVectorSearch, 'searchVectorSimilarity').mockResolvedValue({ results: mockVector });

    const dummy768Embedding = new Array(768).fill(0.01);
    const results = await hybridEngine.search('artificial intelligence', dummy768Embedding);

    expect(results).toHaveLength(3);

    expect(results[0].documentId).toBe('doc-both');
    expect(results[0].lexicalRank).toBe(1);
    expect(results[0].vectorRank).toBe(2);
    expect(results[0].rrfScore).toBeCloseTo(1 / 61 + 1 / 62);

    expect(results[1].documentId).toBe('doc-vec-only');
    expect(results[1].lexicalRank).toBeUndefined();
    expect(results[1].vectorRank).toBe(1);

    expect(results[2].documentId).toBe('doc-lex-only');
    expect(results[2].lexicalRank).toBe(2);
    expect(results[2].vectorRank).toBeUndefined();
  });

  it('should handle deduplication cleanly via canonical searchDocumentId', async () => {
    const docId = 'doc_canonical_123';
    vi.spyOn(mockLocalSearch, 'search').mockResolvedValue([
      {
        documentId: docId,
        score: 1.0,
        matches: ['test'],
        document: {
          id: docId,
          noteId: 'n1',
          sourceType: 'block_text',
          textContent: 'Content text',
          title: 'Title',
          tags: [],
          updatedAt: 100,
          contentHash: 'hash',
          isDeleted: false,
        },
      },
    ]);

    vi.spyOn(mockVectorSearch, 'searchVectorSimilarity').mockResolvedValue({
      results: [
        {
          documentId: docId,
          similarity: 0.95,
          noteId: 'n1',
          sourceType: 'block_text',
          textContent: 'Content text',
          metadata: {},
        },
      ],
    });

    const dummy768Embedding = new Array(768).fill(0.05);
    const results = await hybridEngine.search('test', dummy768Embedding);

    expect(results).toHaveLength(1);
    expect(results[0].documentId).toBe(docId);
    expect(results[0].lexicalRank).toBe(1);
    expect(results[0].vectorRank).toBe(1);
  });
});
