import { CitationReference, CitationSource, RagContextItem, SearchDocument } from '../types/search';
import { localSearchService, LocalSearchService } from './localSearchService';

export interface CitationValidationResult {
  validCitations: CitationReference[];
  rejectedCitations: { refId: number; reason: string }[];
}

export class CitationValidator {
  private localSearch: LocalSearchService;

  constructor(localSearch: LocalSearchService = localSearchService) {
    this.localSearch = localSearch;
  }

  public parseCitationRefIds(responseText: string): number[] {
    if (!responseText) return [];
    const matches = responseText.matchAll(/\[(?:Ref\s*)?(\d+)\]/gi);
    const refIds = new Set<number>();
    for (const match of matches) {
      const id = parseInt(match[1], 10);
      if (!isNaN(id) && id > 0) {
        refIds.add(id);
      }
    }
    return Array.from(refIds).sort((a, b) => a - b);
  }

  public async validateCitations(
    copilotResponseText: string,
    contextItems: RagContextItem[]
  ): Promise<CitationValidationResult> {
    const rawRefIds = this.parseCitationRefIds(copilotResponseText);
    const validCitations: CitationReference[] = [];
    const rejectedCitations: { refId: number; reason: string }[] = [];

    const contextMap = new Map<number, RagContextItem>();
    contextItems.forEach((item, index) => {
      contextMap.set(index + 1, item);
    });

    for (const refId of rawRefIds) {
      const contextItem = contextMap.get(refId);

      if (!contextItem) {
        rejectedCitations.push({ refId, reason: `Ref ID ${refId} not found in exact RAG context bundle` });
        continue;
      }

      const authDoc: SearchDocument | null = await this.localSearch.getDocument(contextItem.documentId);
      const isDeleted = authDoc ? authDoc.isDeleted : false;

      if (isDeleted) {
        rejectedCitations.push({ refId, reason: `Ref ID ${refId} points to a deleted note document` });
        continue;
      }

      const source: CitationSource = {
        documentId: contextItem.documentId,
        noteId: contextItem.noteId,
        noteTitle: authDoc?.title || contextItem.noteTitle,
        blockId: contextItem.blockId,
        attachmentId: contextItem.attachmentId,
        sourceType: contextItem.sourceType,
        pageNumber: contextItem.pageNumber,
        startTimeSec: contextItem.startTimeSec,
        siteUrl: contextItem.siteUrl,
        snippetText: authDoc?.textContent || contextItem.snippetText,
      };

      validCitations.push({
        refId,
        documentId: contextItem.documentId,
        source,
        isValidated: true,
      });
    }

    return { validCitations, rejectedCitations };
  }
}

export const citationValidator = new CitationValidator();
