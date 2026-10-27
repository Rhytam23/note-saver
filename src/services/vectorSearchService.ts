import { supabase, isSupabaseConfigured } from './supabase';
import { VectorSearchResult, EmbeddingRecord, SearchDocumentId } from '../types/search';
import { generateSearchDocumentId } from './searchId';

export interface VectorSearchOptions {
  matchThreshold?: number;
  matchCount?: number;
  modelName?: string;
  configVersion?: string;
}

export class VectorSearchService {
  public async searchVectorSimilarity(
    queryEmbedding: number[],
    options: VectorSearchOptions = {}
  ): Promise<{ results: VectorSearchResult[]; isOffline?: boolean; error?: string }> {
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      return { results: [], isOffline: true, error: 'Offline mode active. Vector search unavailable.' };
    }

    if (!isSupabaseConfigured) {
      return { results: [], error: 'Supabase is not configured.' };
    }

    if (!Array.isArray(queryEmbedding) || queryEmbedding.length !== 768) {
      return { results: [], error: `Invalid query embedding dimension. Expected 768, got ${queryEmbedding?.length}` };
    }

    try {
      const { data, error } = await supabase.rpc('match_note_blocks', {
        query_embedding: queryEmbedding,
        match_threshold: options.matchThreshold ?? 0.3,
        match_count: options.matchCount ?? 20,
        target_model: options.modelName ?? 'gemini-embedding-2',
        target_config_version: options.configVersion ?? 'v1.0',
      });

      if (error) {
        return { results: [], error: error.message };
      }

      if (!Array.isArray(data)) {
        return { results: [] };
      }

      const results: VectorSearchResult[] = data.map((row: any) => {
        const docId: SearchDocumentId = generateSearchDocumentId(
          row.note_id,
          row.source_type,
          row.block_id || null,
          row.attachment_id || null,
          row.metadata?.chunkIndex || 0
        );

        return {
          documentId: docId,
          noteId: row.note_id,
          blockId: row.block_id || undefined,
          attachmentId: row.attachment_id || undefined,
          sourceType: row.source_type,
          textContent: row.text_content,
          metadata: row.metadata || {},
          similarity: Number(row.similarity || 0),
        };
      });

      return { results };
    } catch (err: any) {
      return { results: [], error: err.message || 'Vector RPC execution failed.' };
    }
  }

  public async saveEmbeddingRecordsBatch(
    records: Partial<EmbeddingRecord>[]
  ): Promise<{ success: boolean; count: number; error?: string }> {
    if (records.length === 0) return { success: true, count: 0 };
    if (!isSupabaseConfigured) return { success: false, count: 0, error: 'Supabase unconfigured' };

    try {
      const payload = records.map(r => ({
        user_id: r.userId,
        note_id: r.noteId,
        block_id: r.blockId || null,
        attachment_id: r.attachmentId || null,
        source_type: r.sourceType,
        content_hash: r.contentHash,
        chunk_index: r.chunkIndex || 0,
        text_content: r.textContent,
        metadata: r.metadata || {},
        embedding: r.embedding,
        provider_id: 'gemini',
        model_name: 'gemini-embedding-2',
        embedding_config_version: 'v1.0',
        dimensions: 768,
      }));

      const { error, count } = await supabase
        .from('note_block_embeddings')
        .upsert(payload, { onConflict: 'id' });

      if (error) {
        return { success: false, count: 0, error: error.message };
      }

      return { success: true, count: count || payload.length };
    } catch (err: any) {
      return { success: false, count: 0, error: err.message };
    }
  }

  public async deleteEmbeddingsForNote(
    noteId: string
  ): Promise<{ success: boolean; error?: string }> {
    if (!noteId) return { success: true };
    if (!isSupabaseConfigured) return { success: false, error: 'Supabase unconfigured' };

    try {
      const { error } = await supabase
        .from('note_block_embeddings')
        .delete()
        .eq('note_id', noteId);

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message || 'Failed to delete note embeddings' };
    }
  }
}

export const vectorSearchService = new VectorSearchService();
