import { describe, it, expect, vi } from 'vitest';
import { geminiEmbeddingAdapter, geminiCopilotAdapter } from '../geminiAdapter';
import { supabase } from '../supabase';

vi.mock('../supabase', () => ({
  isSupabaseConfigured: true,
  supabase: {
    functions: {
      invoke: vi.fn(),
    },
  },
}));

describe('Phase 4 — Gemini Edge Functions Architecture (P4.4 & P4.5)', () => {
  it('P4.4: /gemini-embed should enforce gemini-embedding-2 and 768D configuration', async () => {
    const mockVector = new Array(768).fill(0.05);
    vi.mocked(supabase.functions.invoke).mockResolvedValueOnce({
      data: {
        results: [
          {
            chunkIndex: 0,
            vector: mockVector,
            contentHash: 'hash-123',
          },
        ],
      },
      error: null,
    } as any);

    const res = await geminiEmbeddingAdapter.generateEmbeddings([
      { chunkIndex: 0, textContent: 'Sample block text', contentHash: 'hash-123' },
    ]);

    expect(supabase.functions.invoke).toHaveBeenCalledWith(
      'gemini-embed',
      expect.objectContaining({
        body: expect.objectContaining({
          providerId: 'gemini',
          modelName: 'gemini-embedding-2',
          embeddingConfigVersion: 'v1.0',
          dimensions: 768,
        }),
      })
    );
    expect(res.results[0].dimensions).toBe(768);
  });

  it('P4.5: /gemini-copilot should send untrusted context and parse citation Ref IDs', async () => {
    vi.mocked(supabase.functions.invoke).mockResolvedValueOnce({
      data: {
        text: 'According to note [1] and document [2], NoteNirman uses Yjs.',
        citationRefIds: [1, 2],
        tokensUsed: 80,
      },
      error: null,
    } as any);

    const res = await geminiCopilotAdapter.generateCompletion({
      prompt: 'Explain architecture',
      taskType: 'rag_qa',
      contextItems: [
        {
          documentId: 'doc_1',
          noteId: 'n1',
          noteTitle: 'Note 1',
          sourceType: 'block_text',
          snippetText: 'Sample text 1',
          priority: 1,
          tokenEstimate: 20,
        },
        {
          documentId: 'doc_2',
          noteId: 'n2',
          noteTitle: 'Note 2',
          sourceType: 'attachment_pdf',
          snippetText: 'Sample text 2',
          priority: 2,
          tokenEstimate: 20,
        },
      ],
    });

    expect(supabase.functions.invoke).toHaveBeenCalledWith(
      'gemini-copilot',
      expect.objectContaining({
        body: expect.objectContaining({
          prompt: 'Explain architecture',
          taskType: 'rag_qa',
          contextItems: expect.arrayContaining([
            expect.objectContaining({ snippetText: 'Sample text 1' }),
            expect.objectContaining({ snippetText: 'Sample text 2' }),
          ]),
        }),
      })
    );

    expect(res.text).toContain('[1]');
    expect(res.citationRefIds).toEqual([1, 2]);
  });
});
