import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { VectorSearchService } from '../vectorSearchService';
import { supabase } from '../supabase';

vi.mock('../supabase', () => ({
  isSupabaseConfigured: true,
  supabase: {
    rpc: vi.fn(),
    from: vi.fn().mockReturnValue({
      upsert: vi.fn(),
    }),
  },
}));

describe('Phase 4 — Supabase pgvector Search Service (P4.6)', () => {
  let service: VectorSearchService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new VectorSearchService();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should reject invalid query vector dimensions (non-768D)', async () => {
    const invalidQuery = new Array(512).fill(0.1);
    const res = await service.searchVectorSimilarity(invalidQuery);
    expect(res.results).toEqual([]);
    expect(res.error).toContain('Expected 768, got 512');
  });

  it('should handle offline mode gracefully', async () => {
    const originalOnline = navigator.onLine;
    Object.defineProperty(navigator, 'onLine', { value: false, configurable: true });

    const query768 = new Array(768).fill(0.1);
    const res = await service.searchVectorSimilarity(query768);
    expect(res.isOffline).toBe(true);
    expect(res.error).toContain('Offline mode');

    Object.defineProperty(navigator, 'onLine', { value: originalOnline, configurable: true });
  });

  it('should execute match_note_blocks RPC and return mapped VectorSearchResult with canonical searchDocumentId', async () => {
    const query768 = new Array(768).fill(0.05);

    vi.mocked(supabase.rpc).mockResolvedValueOnce({
      data: [
        {
          id: 'embed-uuid-1',
          note_id: 'note-uuid-1',
          block_id: 'blk-uuid-1',
          attachment_id: null,
          source_type: 'block_text',
          text_content: 'Vector content text',
          metadata: { chunkIndex: 0 },
          similarity: 0.89,
        },
      ],
      error: null,
    } as any);

    const res = await service.searchVectorSimilarity(query768, { matchThreshold: 0.5 });

    expect(supabase.rpc).toHaveBeenCalledWith('match_note_blocks', {
      query_embedding: query768,
      match_threshold: 0.5,
      match_count: 20,
      target_model: 'gemini-embedding-2',
      target_config_version: 'v1.0',
    });

    expect(res.results).toHaveLength(1);
    expect(res.results[0].noteId).toBe('note-uuid-1');
    expect(res.results[0].documentId).toMatch(/^doc_[a-f0-9]{16}$/);
    expect(res.results[0].similarity).toBe(0.89);
  });

  it('should save embedding records batch to note_block_embeddings table', async () => {
    const mockUpsert = vi.fn().mockResolvedValue({ error: null, count: 1 });
    vi.mocked(supabase.from).mockReturnValueOnce({ upsert: mockUpsert } as any);

    const mockRecord = {
      userId: 'user-123',
      noteId: 'note-123',
      blockId: 'blk-123',
      sourceType: 'block_text' as const,
      contentHash: 'hash-123',
      chunkIndex: 0,
      textContent: 'Sample block text',
      embedding: new Array(768).fill(0.1),
    };

    const res = await service.saveEmbeddingRecordsBatch([mockRecord]);
    expect(supabase.from).toHaveBeenCalledWith('note_block_embeddings');
    expect(mockUpsert).toHaveBeenCalled();
    expect(res.success).toBe(true);
  });
});
