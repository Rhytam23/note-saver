import { HybridSearchResult, LexicalSearchResult, VectorSearchResult } from '../types/search';
import { localSearchService, LocalSearchService } from './localSearchService';
import { vectorSearchService, VectorSearchService } from './vectorSearchService';

export interface HybridSearchOptions {
  limit?: number;
  noteId?: string;
  tags?: string[];
  includeRemote?: boolean;
}

export const RRF_CONSTANT = 60;

interface DocRankMapItem {
  documentId: string;
  lexicalRank?: number;
  vectorRank?: number;
  lexicalResult?: LexicalSearchResult;
  vectorResult?: VectorSearchResult;
}

export class HybridSearchEngine {
  private localSearch: LocalSearchService;
  private vectorSearch: VectorSearchService;

  constructor(
    localSearch: LocalSearchService = localSearchService,
    vectorSearch: VectorSearchService = vectorSearchService
  ) {
    this.localSearch = localSearch;
    this.vectorSearch = vectorSearch;
  }

  public async search(
    query: string,
    queryEmbedding?: number[],
    options: HybridSearchOptions = {}
  ): Promise<HybridSearchResult[]> {
    if (!query.trim()) return [];

    const isOnline = typeof navigator === 'undefined' || navigator.onLine;
    const allowRemote = options.includeRemote !== false && isOnline;

    // 1. Parallel retrieval
    const lexicalPromise = this.localSearch.search(query, {
      limit: options.limit || 50,
      noteId: options.noteId,
      tags: options.tags,
    });

    const vectorPromise = (allowRemote && queryEmbedding && queryEmbedding.length === 768)
      ? this.vectorSearch.searchVectorSimilarity(queryEmbedding, { matchThreshold: 0.3, matchCount: options.limit || 50 })
      : Promise.resolve({ results: [] });

    const [lexicalResults, vectorResponse] = await Promise.all([lexicalPromise, vectorPromise]);
    const vectorResults = vectorResponse.results || [];

    // 2. Map ranks
    const docMap = new Map<string, DocRankMapItem>();

    // Index lexical ranks (1-based)
    lexicalResults.forEach((lex, idx) => {
      const docId = lex.documentId;
      const existing: DocRankMapItem = docMap.get(docId) || { documentId: docId };
      existing.lexicalRank = idx + 1;
      existing.lexicalResult = lex;
      docMap.set(docId, existing);
    });

    // Index vector ranks (1-based)
    vectorResults.forEach((vec, idx) => {
      const docId = vec.documentId;
      const existing: DocRankMapItem = docMap.get(docId) || { documentId: docId };
      existing.vectorRank = idx + 1;
      existing.vectorResult = vec;
      docMap.set(docId, existing);
    });

    // 3. Compute RRF scores
    const hybridResults: HybridSearchResult[] = [];

    docMap.forEach(item => {
      let rrfScore = 0;
      if (item.lexicalRank !== undefined) {
        rrfScore += 1 / (RRF_CONSTANT + item.lexicalRank);
      }
      if (item.vectorRank !== undefined) {
        rrfScore += 1 / (RRF_CONSTANT + item.vectorRank);
      }

      const lexDoc = item.lexicalResult?.document;
      const vecDoc = item.vectorResult;

      const noteId = lexDoc?.noteId || vecDoc?.noteId || '';
      const blockId = lexDoc?.blockId || vecDoc?.blockId;
      const attachmentId = lexDoc?.attachmentId || vecDoc?.attachmentId;
      const sourceType = lexDoc?.sourceType || vecDoc?.sourceType || 'block_text';
      const textContent = lexDoc?.textContent || vecDoc?.textContent || '';
      const title = lexDoc?.title || (vecDoc?.metadata?.title as string) || '';
      const tags = lexDoc?.tags || (vecDoc?.metadata?.tags as string[]) || [];

      hybridResults.push({
        documentId: item.documentId,
        rrfScore,
        lexicalRank: item.lexicalRank,
        vectorRank: item.vectorRank,
        vectorSimilarity: vecDoc?.similarity,
        document: {
          id: item.documentId,
          noteId,
          blockId,
          attachmentId,
          sourceType,
          textContent,
          title,
          tags,
          updatedAt: lexDoc?.updatedAt || Date.now(),
          contentHash: lexDoc?.contentHash || (vecDoc?.metadata?.contentHash as string) || '',
          isDeleted: false,
        },
      });
    });

    // 4. Sort descending by RRF score
    hybridResults.sort((a, b) => b.rrfScore - a.rrfScore);

    if (options.limit && options.limit > 0) {
      return hybridResults.slice(0, options.limit);
    }

    return hybridResults;
  }
}

export const hybridSearchEngine = new HybridSearchEngine();
