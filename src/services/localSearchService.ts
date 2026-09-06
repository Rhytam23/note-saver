import { SearchDocument, LexicalSearchResult, SearchDocumentId } from '../types/search';
import { lexicalIndexDb, LexicalIndexDbStore } from './lexicalIndexDb';

export interface SearchOptions {
  limit?: number;
  tags?: string[];
  noteId?: string;
  sourceTypes?: string[];
}

/**
 * Tokenizes plain text into normalized searchable terms.
 */
export function tokenizeText(text: string): string[] {
  if (!text) return [];
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\w\s#]/gi, ' ')
    .split(/\s+/)
    .filter(term => term.length > 1);
}

/**
 * Computes a lexical match score for a document against a tokenized query.
 * Weights: Note Title (3.0), Tags (2.5), Block/Media Text (1.0).
 */
export function calculateLexicalScore(doc: SearchDocument, queryTokens: string[]): { score: number; matches: string[] } {
  if (queryTokens.length === 0 || doc.isDeleted) {
    return { score: 0, matches: [] };
  }

  const titleTokens = tokenizeText(doc.title);
  const tagTokens = doc.tags.flatMap(t => tokenizeText(t));
  const contentTokens = tokenizeText(doc.textContent);

  let totalScore = 0;
  const matchedTerms = new Set<string>();

  for (const qTerm of queryTokens) {
    let termMatched = false;

    // Title match
    for (const tTerm of titleTokens) {
      if (tTerm === qTerm) {
        totalScore += 3.0;
        termMatched = true;
      } else if (tTerm.includes(qTerm)) {
        totalScore += 1.5;
        termMatched = true;
      }
    }

    // Tag match
    for (const tagTerm of tagTokens) {
      if (tagTerm === qTerm || tagTerm.replace(/^#/, '') === qTerm.replace(/^#/, '')) {
        totalScore += 2.5;
        termMatched = true;
      } else if (tagTerm.includes(qTerm)) {
        totalScore += 1.25;
        termMatched = true;
      }
    }

    // Content match
    for (const cTerm of contentTokens) {
      if (cTerm === qTerm) {
        totalScore += 1.0;
        termMatched = true;
      } else if (cTerm.includes(qTerm)) {
        totalScore += 0.5;
        termMatched = true;
      }
    }

    if (termMatched) {
      matchedTerms.add(qTerm);
    }
  }

  return {
    score: totalScore,
    matches: Array.from(matchedTerms),
  };
}

export class LocalSearchService {
  private dbStore: LexicalIndexDbStore;

  constructor(dbStore: LexicalIndexDbStore = lexicalIndexDb) {
    this.dbStore = dbStore;
  }

  public async getDocument(id: SearchDocumentId): Promise<SearchDocument | null> {
    return this.dbStore.getDocument(id);
  }

  public async saveDocument(doc: SearchDocument): Promise<void> {
    await this.dbStore.saveDocument(doc);
  }

  public async saveDocuments(docs: SearchDocument[]): Promise<void> {
    await this.dbStore.saveDocuments(docs);
  }

  public async removeDocument(id: SearchDocumentId): Promise<void> {
    await this.dbStore.deleteDocument(id);
  }

  public async removeNote(noteId: string): Promise<void> {
    await this.dbStore.deleteDocumentsForNote(noteId);
  }

  public async markNoteDeleted(noteId: string, isDeleted: boolean): Promise<void> {
    const docs = await this.dbStore.getDocumentsForNote(noteId);
    if (docs.length === 0) return;
    const updatedDocs = docs.map(d => ({ ...d, isDeleted }));
    await this.dbStore.saveDocuments(updatedDocs);
  }

  public async search(query: string, options: SearchOptions = {}): Promise<LexicalSearchResult[]> {
    const queryTokens = tokenizeText(query);
    if (queryTokens.length === 0 && (!options.tags || options.tags.length === 0)) {
      return [];
    }

    const allDocs = await this.dbStore.getAllDocuments();
    const results: LexicalSearchResult[] = [];

    for (const doc of allDocs) {
      // 1. Soft-delete check
      if (doc.isDeleted) continue;

      // 2. NoteId filter (if specified)
      if (options.noteId && doc.noteId !== options.noteId) continue;

      // 3. SourceTypes filter (if specified)
      if (options.sourceTypes && options.sourceTypes.length > 0 && !options.sourceTypes.includes(doc.sourceType)) {
        continue;
      }

      // 4. Tags filter (if specified)
      if (options.tags && options.tags.length > 0) {
        const hasTag = options.tags.some(t => doc.tags.map(x => x.toLowerCase()).includes(t.toLowerCase()));
        if (!hasTag) continue;
      }

      // 5. Score calculation
      const { score, matches } = calculateLexicalScore(doc, queryTokens);
      if (score > 0 || (queryTokens.length === 0 && options.tags && options.tags.length > 0)) {
        results.push({
          documentId: doc.id,
          document: doc,
          score: score > 0 ? score : 1.0,
          matches,
        });
      }
    }

    // Rank descending by score, then by note_title priority, then by updatedAt
    results.sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      if (a.document.sourceType === 'note_title' && b.document.sourceType !== 'note_title') return -1;
      if (b.document.sourceType === 'note_title' && a.document.sourceType !== 'note_title') return 1;
      return b.document.updatedAt - a.document.updatedAt;
    });

    const limit = options.limit || 50;
    return results.slice(0, limit);
  }

  public async clearAll(): Promise<void> {
    await this.dbStore.clearAll();
  }
}

export const localSearchService = new LocalSearchService();
