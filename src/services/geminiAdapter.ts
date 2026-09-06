import { supabase, isSupabaseConfigured } from './supabase';
import { EmbeddingMetadata, RagContextItem } from '../types/search';

export interface GenerateEmbeddingChunk {
  chunkIndex: number;
  textContent: string;
  contentHash: string;
}

export interface GeneratedEmbeddingResult extends EmbeddingMetadata {
  chunkIndex: number;
  vector: number[];
}

export interface CopilotCompletionRequest {
  prompt: string;
  taskType: 'summarize' | 'explain' | 'rewrite' | 'action_items' | 'outline' | 'rag_qa';
  systemInstruction?: string;
  contextItems?: RagContextItem[];
}

export interface CopilotCompletionResponse {
  text: string;
  citationRefIds?: number[];
  tokensUsed?: number;
  error?: string;
}

export interface IGeminiEmbeddingAdapter {
  generateEmbeddings(
    chunks: GenerateEmbeddingChunk[]
  ): Promise<{ results: GeneratedEmbeddingResult[]; isOffline?: boolean; error?: string }>;
}

export interface IGeminiCopilotAdapter {
  generateCompletion(
    request: CopilotCompletionRequest
  ): Promise<CopilotCompletionResponse>;
}

export class GeminiEmbeddingAdapter implements IGeminiEmbeddingAdapter {
  public async generateEmbeddings(
    chunks: GenerateEmbeddingChunk[]
  ): Promise<{ results: GeneratedEmbeddingResult[]; isOffline?: boolean; error?: string }> {
    if (chunks.length === 0) {
      return { results: [] };
    }

    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      return { results: [], isOffline: true, error: 'Offline mode active. Embedding generation deferred.' };
    }

    if (!isSupabaseConfigured) {
      return { results: [], error: 'Supabase client is not configured for Edge Function invocation.' };
    }

    let retries = 3;
    let delayMs = 500;

    while (retries > 0) {
      try {
        const { data, error } = await supabase.functions.invoke('gemini-embed', {
          body: {
            chunks,
            providerId: 'gemini',
            modelName: 'gemini-embedding-2',
            embeddingConfigVersion: 'v1.0',
            dimensions: 768,
          },
        });

        if (error) {
          throw new Error(error.message || 'Edge Function gemini-embed returned an error.');
        }

        if (!data || !Array.isArray(data.results)) {
          throw new Error('Malformed embedding response from gemini-embed Edge Function.');
        }

        // Validate vector dimensions
        const validResults: GeneratedEmbeddingResult[] = data.results.map((item: any) => {
          if (!Array.isArray(item.vector) || item.vector.length !== 768) {
            throw new Error(`Embedding vector dimension mismatch. Expected 768, got ${item?.vector?.length}`);
          }
          return {
            chunkIndex: item.chunkIndex,
            vector: item.vector,
            providerId: 'gemini',
            modelName: 'gemini-embedding-2',
            embeddingConfigVersion: 'v1.0',
            dimensions: 768,
            contentHash: item.contentHash,
          };
        });

        return { results: validResults };
      } catch (err: any) {
        retries--;
        if (retries === 0) {
          return { results: [], error: err.message || 'Failed to generate embeddings after retries.' };
        }
        await new Promise(resolve => setTimeout(resolve, delayMs));
        delayMs *= 2;
      }
    }

    return { results: [], error: 'Embedding request failed.' };
  }
}

export class GeminiCopilotAdapter implements IGeminiCopilotAdapter {
  public async generateCompletion(
    request: CopilotCompletionRequest
  ): Promise<CopilotCompletionResponse> {
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      return { text: '', error: 'Offline mode active. Copilot unavailable offline.' };
    }

    if (!isSupabaseConfigured) {
      return { text: '', error: 'Supabase client is not configured for Copilot Edge Function invocation.' };
    }

    let retries = 3;
    let delayMs = 500;

    while (retries > 0) {
      try {
        const { data, error } = await supabase.functions.invoke('gemini-copilot', {
          body: {
            prompt: request.prompt,
            taskType: request.taskType,
            systemInstruction: request.systemInstruction || 'You are NoteNirman Copilot, an expert AI assistant.',
            contextItems: request.contextItems || [],
          },
        });

        if (error) {
          throw new Error(error.message || 'Edge Function gemini-copilot error.');
        }

        if (!data || typeof data.text !== 'string') {
          throw new Error('Malformed completion response from gemini-copilot Edge Function.');
        }

        return {
          text: data.text,
          citationRefIds: Array.isArray(data.citationRefIds) ? data.citationRefIds : [],
          tokensUsed: data.tokensUsed || 0,
        };
      } catch (err: any) {
        retries--;
        if (retries === 0) {
          return { text: '', error: err.message || 'Failed to generate Copilot completion.' };
        }
        await new Promise(resolve => setTimeout(resolve, delayMs));
        delayMs *= 2;
      }
    }

    return { text: '', error: 'Copilot request failed.' };
  }
}

export const geminiEmbeddingAdapter = new GeminiEmbeddingAdapter();
export const geminiCopilotAdapter = new GeminiCopilotAdapter();
