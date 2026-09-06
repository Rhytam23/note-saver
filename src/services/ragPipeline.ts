import { RagContextItem, SearchDocumentId } from '../types/search';
import { hybridSearchEngine, HybridSearchEngine } from './hybridSearchEngine';
import { geminiEmbeddingAdapter, GeminiEmbeddingAdapter } from './geminiAdapter';

/**
 * RAG Context Token Budget configuration.
 * Hard limit: RAG_CONTEXT_TOKEN_BUDGET = 4096 tokens.
 * Character-based estimation (1 token ≈ 3.5 chars) is a conservative client-side heuristic.
 * A safety headroom margin (85% limit) is maintained to guarantee zero prompt truncation or token overflow.
 */
export const RAG_CONTEXT_TOKEN_BUDGET = 4096;
export const CHARS_PER_TOKEN_HEURISTIC = 3.5;
export const SAFETY_MARGIN_FACTOR = 0.85;
export const EFFECTIVE_TOKEN_BUDGET = Math.floor(RAG_CONTEXT_TOKEN_BUDGET * SAFETY_MARGIN_FACTOR); // 3481 tokens
export const MAX_SAFE_CONTEXT_CHARS = Math.floor(EFFECTIVE_TOKEN_BUDGET * CHARS_PER_TOKEN_HEURISTIC); // 12,183 chars

export interface RagPipelineOptions {
  activeNoteId?: string;
  activeNoteTitle?: string;
  maxResults?: number;
  tokenBudget?: number;
}

export interface RagContextBundle {
  query: string;
  contextItems: RagContextItem[];
  totalTokensEstimate: number;
  truncated: boolean;
}

export class RagPipeline {
  private hybridSearch: HybridSearchEngine;
  private embeddingAdapter: GeminiEmbeddingAdapter;

  constructor(
    hybridSearch: HybridSearchEngine = hybridSearchEngine,
    embeddingAdapter: GeminiEmbeddingAdapter = geminiEmbeddingAdapter
  ) {
    this.hybridSearch = hybridSearch;
    this.embeddingAdapter = embeddingAdapter;
  }

  /**
   * Conservative heuristic token estimate (1 token ≈ 3.5 characters).
   */
  public estimateTokens(text: string): number {
    if (!text) return 0;
    return Math.ceil(text.length / CHARS_PER_TOKEN_HEURISTIC);
  }

  public formatContextItem(item: RagContextItem, refId: number): string {
    return `[Ref ${refId}] (DocID: ${item.documentId}, Note: ${item.noteTitle}, Type: ${item.sourceType})\n${item.snippetText}`;
  }

  public async buildRagContext(
    query: string,
    options: RagPipelineOptions = {}
  ): Promise<RagContextBundle> {
    if (!query.trim()) {
      return { query, contextItems: [], totalTokensEstimate: 0, truncated: false };
    }

    const tokenBudget = options.tokenBudget ?? RAG_CONTEXT_TOKEN_BUDGET;
    const maxChars = Math.floor(tokenBudget * SAFETY_MARGIN_FACTOR * CHARS_PER_TOKEN_HEURISTIC);

    let queryEmbedding: number[] | undefined;
    if (typeof navigator === 'undefined' || navigator.onLine) {
      try {
        const embedRes = await this.embeddingAdapter.generateEmbeddings([{ chunkIndex: 0, textContent: query, contentHash: '' }]);
        if (embedRes.results && embedRes.results.length > 0) {
          queryEmbedding = embedRes.results[0].vector;
        }
      } catch (err) {
        console.warn('[RagPipeline] Failed to generate query embedding, degrading to lexical hybrid search:', err);
      }
    }

    const hybridResults = await this.hybridSearch.search(query, queryEmbedding, {
      limit: options.maxResults ?? 20,
    });

    if (hybridResults.length === 0) {
      return { query, contextItems: [], totalTokensEstimate: 0, truncated: false };
    }

    // Score & prioritize candidates: Active note blocks > Note title > RRF Score
    const prioritizedResults = hybridResults.map(item => {
      let priorityScore = item.rrfScore;
      if (options.activeNoteId && item.document.noteId === options.activeNoteId) {
        priorityScore *= 1.5;
      }
      if (item.document.sourceType === 'note_title') {
        priorityScore *= 1.2;
      }
      return { item, priorityScore };
    });

    prioritizedResults.sort((a, b) => b.priorityScore - a.priorityScore);

    const clusteredItems: RagContextItem[] = [];
    const seenDocIds = new Set<SearchDocumentId>();

    for (const entry of prioritizedResults) {
      const doc = entry.item.document;
      if (seenDocIds.has(doc.id)) continue;
      seenDocIds.add(doc.id);

      const priority = options.activeNoteId === doc.noteId ? 1 : (doc.sourceType === 'note_title' ? 2 : 3);
      const snippetText = doc.textContent;
      const tokenEstimate = this.estimateTokens(snippetText);

      clusteredItems.push({
        documentId: doc.id,
        noteId: doc.noteId,
        noteTitle: doc.title || (options.activeNoteId === doc.noteId ? options.activeNoteTitle || 'Active Note' : 'Untitled Note'),
        blockId: doc.blockId,
        attachmentId: doc.attachmentId,
        sourceType: doc.sourceType,
        snippetText,
        pageNumber: doc.pageNumber,
        startTimeSec: doc.startTimeSec,
        siteUrl: doc.siteUrl,
        priority,
        tokenEstimate,
      });
    }

    const contextItems: RagContextItem[] = [];
    let currentChars = 0;
    let truncated = false;

    for (const cItem of clusteredItems) {
      const formattedSnippet = this.formatContextItem(cItem, contextItems.length + 1);
      const itemChars = formattedSnippet.length;

      if (currentChars + itemChars > maxChars) {
        const remainingChars = maxChars - currentChars;
        if (remainingChars > 100) {
          const truncatedSnippet = cItem.snippetText.slice(0, remainingChars - 50) + '... [truncated]';
          contextItems.push({
            ...cItem,
            snippetText: truncatedSnippet,
          });
          currentChars += this.formatContextItem(contextItems[contextItems.length - 1], contextItems.length).length;
        }
        truncated = true;
        break;
      }

      contextItems.push(cItem);
      currentChars += itemChars;
    }

    const totalTokensEstimate = Math.ceil(currentChars / CHARS_PER_TOKEN_HEURISTIC);

    return {
      query,
      contextItems,
      totalTokensEstimate,
      truncated,
    };
  }
}

export const ragPipeline = new RagPipeline();
