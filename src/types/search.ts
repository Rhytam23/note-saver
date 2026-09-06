/**
 * NoteNirman 2.0 — Phase 4: Search, RAG & AI Architecture Type Definitions
 * 
 * Invariants:
 * - Derived search index records (NEVER canonical note storage).
 * - Gemini-only AI architecture (gemini-embedding-2, 768-D configured output).
 * - Canonical `searchDocumentId` for universal cross-layer identity.
 */

export type IndexSourceType = 
  | 'note_title'
  | 'block_text'
  | 'attachment_pdf'
  | 'attachment_ocr'
  | 'attachment_transcript'
  | 'attachment_webclip';

export type SearchDocumentId = string;

export interface SearchDocument {
  id: SearchDocumentId;             // Canonical doc_<hashHex>
  noteId: string;                    // Parent Note UUID
  blockId?: string;                  // Block UUID (if block source)
  attachmentId?: string;             // Attachment UUID (if derived rich media)
  jobId?: string;                    // Extraction job UUID (if derived media)
  sourceType: IndexSourceType;       // Source classification
  
  textContent: string;               // Plain text chunk content
  pageNumber?: number;               // PDF page number (1-indexed)
  startTimeSec?: number;             // Audio/video transcript timestamp offset (sec)
  siteUrl?: string;                  // Web clip original URL
  
  title: string;                     // Parent Note Title (for display/context)
  tags: string[];                    // Parent Note Tags
  updatedAt: number;                 // Timestamp (epoch ms)
  contentHash: string;               // SHA-256 hash of textContent
  isDeleted: boolean;                // Soft deletion mirror flag
}

export interface LexicalSearchResult {
  documentId: SearchDocumentId;
  document: SearchDocument;
  score: number;                     // Lexical BM25/frequency score
  matches: string[];                 // Matched terms/highlights
}

export interface VectorSearchResult {
  documentId: SearchDocumentId;
  noteId: string;
  blockId?: string;
  attachmentId?: string;
  sourceType: IndexSourceType;
  textContent: string;
  metadata: Record<string, any>;
  similarity: number;               // Cosine similarity [0, 1]
}

export interface HybridSearchResult {
  documentId: SearchDocumentId;
  document: SearchDocument;
  lexicalRank?: number;
  vectorRank?: number;
  rrfScore: number;                  // Reciprocal Rank Fusion score
  vectorSimilarity?: number;
}

export interface EmbeddingMetadata {
  providerId: 'gemini';
  modelName: 'gemini-embedding-2';
  embeddingConfigVersion: 'v1.0';
  dimensions: 768;
  contentHash: string;
}

export interface EmbeddingRecord extends EmbeddingMetadata {
  id: string;
  userId: string;
  noteId: string;
  blockId?: string;
  attachmentId?: string;
  sourceType: IndexSourceType;
  chunkIndex: number;
  textContent: string;
  metadata: Record<string, any>;
  embedding: number[];               // 768-D vector
  createdAt: string;
  updatedAt: string;
}

export interface RagContextItem {
  documentId: SearchDocumentId;
  noteId: string;
  noteTitle: string;
  blockId?: string;
  attachmentId?: string;
  sourceType: IndexSourceType;
  snippetText: string;
  pageNumber?: number;
  startTimeSec?: number;
  siteUrl?: string;
  priority: number;                  // 1 = Active Note, 2 = High RRF, 3 = Media
  tokenEstimate: number;
}

export interface CitationSource {
  documentId: SearchDocumentId;
  noteId: string;
  noteTitle: string;
  blockId?: string;
  attachmentId?: string;
  sourceType: IndexSourceType;
  pageNumber?: number;
  startTimeSec?: number;
  siteUrl?: string;
  snippetText: string;
}

export interface CitationReference {
  refId: number;                     // Citation index e.g. [1], [2]
  documentId: SearchDocumentId;
  source: CitationSource;
  isValidated: boolean;
}
