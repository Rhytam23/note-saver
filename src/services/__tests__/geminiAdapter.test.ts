import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { GeminiEmbeddingAdapter, GeminiCopilotAdapter } from '../geminiAdapter';
import { supabase } from '../supabase';

vi.mock('../supabase', () => ({
  isSupabaseConfigured: true,
  supabase: {
    functions: {
      invoke: vi.fn(),
    },
  },
}));

describe('Phase 4 — Gemini AI Service Adapters (P4.3)', () => {
  let embeddingAdapter: GeminiEmbeddingAdapter;
  let copilotAdapter: GeminiCopilotAdapter;

  beforeEach(() => {
    vi.clearAllMocks();
    embeddingAdapter = new GeminiEmbeddingAdapter();
    copilotAdapter = new GeminiCopilotAdapter();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should return empty results for empty chunk array without invoking Edge Function', async () => {
    const res = await embeddingAdapter.generateEmbeddings([]);
    expect(res.results).toEqual([]);
    expect(supabase.functions.invoke).not.toHaveBeenCalled();
  });

  it('should handle offline status gracefully', async () => {
    const originalOnline = navigator.onLine;
    Object.defineProperty(navigator, 'onLine', { value: false, configurable: true });

    const embedRes = await embeddingAdapter.generateEmbeddings([
      { chunkIndex: 0, textContent: 'hello', contentHash: 'h1' },
    ]);
    expect(embedRes.isOffline).toBe(true);
    expect(embedRes.error).toContain('Offline mode');

    const copilotRes = await copilotAdapter.generateCompletion({
      prompt: 'summarize',
      taskType: 'summarize',
    });
    expect(copilotRes.error).toContain('Offline mode');

    Object.defineProperty(navigator, 'onLine', { value: originalOnline, configurable: true });
  });

  it('should invoke /gemini-embed Edge Function and validate 768-D vectors', async () => {
    const mockVector = new Array(768).fill(0.1);
    vi.mocked(supabase.functions.invoke).mockResolvedValueOnce({
      data: {
        results: [
          {
            chunkIndex: 0,
            vector: mockVector,
            contentHash: 'hash-abc',
          },
        ],
      },
      error: null,
    } as any);

    const res = await embeddingAdapter.generateEmbeddings([
      { chunkIndex: 0, textContent: 'Test text', contentHash: 'hash-abc' },
    ]);

    expect(supabase.functions.invoke).toHaveBeenCalledWith('gemini-embed', {
      body: expect.objectContaining({
        providerId: 'gemini',
        modelName: 'gemini-embedding-2',
        dimensions: 768,
      }),
    });
    expect(res.results).toHaveLength(1);
    expect(res.results[0].dimensions).toBe(768);
    expect(res.results[0].modelName).toBe('gemini-embedding-2');
  });

  it('should reject vector dimension mismatch if returned vector is not 768D', async () => {
    const badVector = new Array(1536).fill(0.1); // Bad dimension
    vi.mocked(supabase.functions.invoke).mockResolvedValue({
      data: {
        results: [
          {
            chunkIndex: 0,
            vector: badVector,
            contentHash: 'hash-bad',
          },
        ],
      },
      error: null,
    } as any);

    const res = await embeddingAdapter.generateEmbeddings([
      { chunkIndex: 0, textContent: 'Test text', contentHash: 'hash-bad' },
    ]);

    expect(res.results).toEqual([]);
    expect(res.error).toContain('Expected 768, got 1536');
  });

  it('should invoke /gemini-copilot Edge Function and return structured response', async () => {
    vi.mocked(supabase.functions.invoke).mockResolvedValueOnce({
      data: {
        text: 'This is a generated summary [1].',
        citationRefIds: [1],
        tokensUsed: 150,
      },
      error: null,
    } as any);

    const res = await copilotAdapter.generateCompletion({
      prompt: 'Summarize note',
      taskType: 'summarize',
      contextItems: [],
    });

    expect(supabase.functions.invoke).toHaveBeenCalledWith('gemini-copilot', {
      body: expect.objectContaining({
        prompt: 'Summarize note',
        taskType: 'summarize',
      }),
    });
    expect(res.text).toContain('generated summary');
    expect(res.citationRefIds).toEqual([1]);
    expect(res.tokensUsed).toBe(150);
  });
});
