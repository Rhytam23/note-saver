# NoteNirman 2.0 — Phase 4: Search, RAG & AI Architecture Audit & Implementation Plan

> **STATUS: PLANNING ONLY — ZERO CODE MODIFICATIONS**  
> **INVARIANTS PRESERVED:** `Note.content` HTML compatibility, `BlockDocument` universal block model, `Y.Doc` collaboration, local-first IndexedDB persistence, single `syncEngine`, external attachment binaries, Gemini-only AI architecture, zero client AI secrets.

---

## 1. Current Architecture Audit

A comprehensive audit of NoteNirman's codebase across Phase 1 (Universal Block Editor), Phase 2 (Collaboration Foundation), and Phase 3 (Rich Capture Pipeline) establishes the baseline for Phase 4:

- **Note Storage**: `Note.content` is the canonical persisted HTML string in IndexedDB (`notenirman-offline` / `notes`) and Supabase `notes` table.
- **Block Representation**: `BlockDocument` (`src/types/block.ts`) is dynamically parsed via `blockParser.ts` or synchronized bidirectionally via `blockPersistence.ts`.
- **Live Collaboration**: `Y.Doc` CRDT in-memory structures synchronized over Supabase Realtime channels (`note_collab:{noteId}`).
- **Binary Attachments**: Attachments stored in IndexedDB (`notenirman-attachments-db`) or Supabase Storage (`note-attachments` bucket).
- **Processing Queue**: Asynchronous media extraction jobs (PDF text, Tesseract OCR, Whisper transcripts, Web clips) managed via `processingQueue.ts` / IndexedDB (`notenirman-jobs-db`), completely separate from `syncQueue`.

---

## 2. Data Sources of Truth

Phase 4 search indexes are **derived secondary representations** and NEVER serve as primary sources of truth.

| Data Category | Authoritative Source of Truth | Format & Location | Synchronization Mechanism |
|---|---|---|---|
| **Note Content & Metadata** | `Note` entity (`src/types.ts`) | HTML string in `Note.content`, stored in IndexedDB (`notenirman-offline`) & Supabase `notes` table. | `syncEngine.ts` via `syncQueue`. |
| **Block Document Structure** | `BlockDocument` (`src/types/block.ts`) | Structured JSON parsed via `blockParser.ts`. | Derived from `Note.content` or updated via `blockPersistence.ts`. |
| **Live Collaboration** | `Y.Doc` & `Y.Map<Block>` | Binary Yjs CRDT in-memory state. | Supabase Realtime broadcast. |
| **Binary Attachments** | `Attachment` (`src/types/attachment.ts`) | IDB `notenirman-attachments-db` / Supabase Storage `note-attachments/` bucket. | Chunked upload pipeline (`attachmentStorage.ts`). |
| **Derived Rich Media Text** | `ExtractionJob` (`src/types/attachment.ts`) | Extracted text in `ExtractionJobStore` (`notenirman-jobs-db`). | `processingQueue.ts` (separate from `syncQueue`). |
| **Search Indexes (Lexical & Vector)** | Derived Index Records | Local Web Worker index & Postgres `pgvector` table. | Asynchronous derived indexing jobs. |

---

## 3. Search Architecture

NoteNirman 2.0 adopts a **Hybrid Layered Search Architecture**:

1. **Local Lexical Search (100% Offline)**: Executed in a dedicated Web Worker (`search.worker.ts`) using an in-memory & IndexedDB-backed inverted index over note titles, tags, block text, and extracted media text. Zero network dependency.
2. **Remote Lexical & Vector Search (Online)**: Executed on PostgreSQL via generated `tsvector` + GIN index (Full-Text Search) and `pgvector` extension (Vector Similarity Search) using Google Gemini embeddings (`gemini-embedding-2`).
3. **Hybrid Rank Fusion**: Results from local lexical and remote vector/lexical engines are merged using Reciprocal Rank Fusion (RRF).

---

## 4. Collision-Proof Canonical Search Identity (`searchDocumentId`)

To guarantee that the local lexical index, remote vector index, RRF merger, RAG context selector, and UI citations reference the exact same logical searchable source without delimiter collisions (e.g. components containing `_`, `:`, `/`), NoteNirman uses a **canonical tuple hash encoding**:

```typescript
// Canonical Tuple Encoding for Collision-Proof Search Document Identifiers
export function generateSearchDocumentId(
  noteId: string,
  sourceType: IndexSourceType,
  blockId?: string,
  attachmentId?: string,
  chunkIndex: number = 0
): string {
  // Canonical ordered tuple representation
  const tuple = [
    noteId,
    sourceType,
    blockId ?? null,
    attachmentId ?? null,
    chunkIndex
  ];
  
  // Deterministic JSON serialization + SHA-256 hash digest
  const canonicalJson = JSON.stringify(tuple);
  const hashHex = sha256Hex(canonicalJson).substring(0, 16);
  
  return `doc_${hashHex}`;
}
```

### Invariants for `searchDocumentId`:
1. **Identical Source → Identical ID**: The same note/block/attachment chunk always yields the exact same `searchDocumentId`.
2. **Distinct Sources → Collision-Resistant ID**: Delimiters in content or IDs cannot cause identity overlap.
3. **Universal Usage**: Local Web Worker index, remote Postgres vector table, RRF fusion buffers, RAG context selectors, and citation renderers use strictly this canonical ID. Zero UI-generated alternative IDs.

---

## 5. Local Lexical Indexing

- **Scope**: Note titles, tags, block-level raw text, and extracted rich media text (PDF, OCR, transcripts).
- **Execution Environment**: Dedicated Web Worker (`search.worker.ts`).
- **Persistence**: IndexedDB store (`notenirman-lexical-index`).
- **Availability**: **100% Offline-Capable**. Returns instant search results (< 50ms engineering target) without server connectivity.

---

## 6. Remote Lexical & Vector Search

- **Lexical Search**: Remote Postgres FTS using a generated `tsvector` column (`fts_vec`) and GIN index over `note_block_embeddings.text_content`. Local lexical search (Web Worker + FlexSearch) remains completely independent from remote PostgreSQL FTS.
- **Vector Search**: PostgreSQL `pgvector` similarity query invoked via an authenticated Supabase RPC (`match_note_blocks`).
- **Access Boundary**: Strictly scoped to `auth.uid() = user_id` and `notes.is_deleted = false`.

---

## 7. Gemini Embedding Architecture (Gemini-Only)

> **MANDATORY**: Google Gemini is the **ONLY** AI provider for NoteNirman. No OpenAI, Anthropic, Cohere, or Ollama implementations exist in NoteNirman.

### Architecture Topology

```
Client App (React / Web Worker)
  ↓ (Auth Token / JWT)
Gemini AI Service Interface (IGeminiEmbeddingAdapter)
  ↓ (HTTPS POST)
Authenticated Supabase Edge Function (/gemini-embed)
  ↓ (Server Secrets: DENO_ENV GEMINI_API_KEY)
Google Gemini API (gemini-embedding-2)
  ↓
768-dimensional embedding output
  ↓
PostgreSQL pgvector vector(768)
```

- **Zero Secrets Client-Side**: No Gemini API keys are accessible to React, Vite environment variables, IndexedDB, Yjs, or `Note.content`.
- **Configured Embedding Output Dimension**: Google Gemini `gemini-embedding-2` is configured for **768-dimensional output**.
- **No Vector Padding**: Zero-padding vectors is strictly prohibited.

---

## 8. Embedding Model, Version & Dimension Strategy

To prevent comparing vectors across incompatible embedding spaces, NoteNirman enforces strict model isolation:

### Vector Space Isolation Principles
1. **Configured 768-Dimensional Output**: `gemini-embedding-2` is configured to output 768 dimensions (`vector(768)`). Embeddings are stored and compared ONLY within this matching space.
2. **Metadata Enclosure**: Every embedding record explicitly stores:
   - `provider_id = 'gemini'`
   - `model_name = 'gemini-embedding-2'`
   - `embedding_config_version = 'v1.0'` (Application-controlled embedding configuration version)
   - `dimensions = 768`
   - `content_hash` (SHA-256)
3. **Clear Distinction of Identifiers**:
   - **Gemini Model Name**: `gemini-embedding-2` (the official Google model identifier).
   - **NoteNirman Embedding Config Version**: `embedding_config_version` (e.g. `'v1.0'`), representing NoteNirman's internal chunking and embedding configuration version.
4. **RPC Filtering**: Vector similarity queries explicitly filter by matching model parameters:
   `WHERE provider_id = 'gemini' AND model_name = 'gemini-embedding-2' AND embedding_config_version = 'v1.0' AND dimensions = 768`.

### Re-Embedding & Migration Strategy
When upgrading Gemini embedding models or embedding configuration versions:

```
Old Embedding Config (gemini-embedding-2 / v1.0)
        ↓
New Embedding Config (new-config / v2.0)
        ↓
Background Re-Embedding Job (Edge Function backfills new vectors in parallel)
        ↓
Validation & Quality Audit (Verify vector index coverage)
        ↓
Old Vector Retirement (Purge v1.0 vectors without query disruption)
```

Incompatible vector spaces are NEVER mixed or compared in the same retrieval operation.

---

## 9. Hybrid Retrieval & Reciprocal Rank Fusion (RRF)

Candidate results from local lexical search and remote Gemini vector search are merged into a single ranked list using **Reciprocal Rank Fusion (RRF)** evaluated against `searchDocumentId`:

\[
RRF\_Score(d) = \frac{1}{60 + Rank_{lexical}(d)} + \frac{1}{60 + Rank_{vector}(d)}
\]

### Deduplication & Clustering
- If a candidate `searchDocumentId` exists in both lexical and vector results, its ranks are combined using RRF.
- If multiple chunks belong to the same block or adjacent blocks belong to the same note, they are clustered before context construction to save prompt token budget.

---

## 10. RAG Pipeline

```
User Query -> Intent Classification -> Hybrid RRF Retrieval -> Cluster & Deduplicate -> Context Budgeting -> Gemini Edge Function (/gemini-copilot) -> Response + Citation Validation
```

1. **Configurable Token Budget**: `RAG_CONTEXT_TOKEN_BUDGET = 4096` (Centralized configuration constant, tuneable for Gemini model/request limits).
2. **Untrusted Context Handling**: Retrieved context blocks are passed as raw text data wrapped in XML delimiters (`<user_note_context>`).

---

## 11. Context Budgeting

- **Centralized Budget Constant**: `RAG_CONTEXT_TOKEN_BUDGET = 4096`.
- **Priority**: Active note blocks (Priority 1) > High RRF score blocks (Priority 2) > Attachment transcripts (Priority 3).
- **Contiguous Block Merging**: Adjacent blocks from the same note are merged into unified text blocks to minimize metadata overhead.

---

## 12. Citation & Provenance Architecture

> **MANDATORY REQUIREMENT**: AI responses must be verifiable against original user note blocks and attachments. Model-supplied snippet text is NEVER trusted.

### Strict Citation Validation Chain

```
Model citation Ref ID
        ↓
Response candidate/context set (verify Ref ID exists in exact request context)
        ↓
searchDocumentId
        ↓
authoritative local index / source record
        ↓
authenticated user ownership validation
        ↓
note not deleted validation
        ↓
citation rendered in UI
```

### Invariants for Citation Acceptance:
1. **Candidate Context Set Membership**: A citation is accepted ONLY if its referenced `searchDocumentId` exists in the exact candidate/context set supplied to the Gemini request for that specific response.
2. **Rejection Rules**: Reject unknown Ref IDs, Ref IDs not in the request context set, deleted notes, another user's records, or records whose provenance no longer resolves.
3. **Authoritative Resolution**: The UI resolves title, block ID, attachment ID, PDF page number, and transcript timestamps strictly from local index records using `searchDocumentId`.
4. **Scope Limitation**: Citation ID validation proves identity, context membership, and source lineage; it does not claim automated entailment/truth verification.

---

## 13. Gemini AI Copilot Boundary

### In-Scope Capabilities (Phase 4):
- Current note summarization
- Selected block explanation & rewriting
- Action item extraction & outline generation
- Current note and workspace-wide RAG Q&A
- Inline citation rendering & source navigation

### Explicitly Excluded (Reserved for Phase 5+):
- Autonomous agents acting independently
- Unsupervised tool execution (file creation, calendar modifications, external emails)
- Autonomous web research or background crawling
- Multi-agent delegation loops

---

## 14. Prompt-Injection Threat Model

> **CRITICAL SECURITY DEFINITION**: XML formatting tags like `<user_note_context>` are formatting aids ONLY, **NOT** a security boundary. All retrieved content is treated as **UNTRUSTED DATA**.

### Security Rules for Untrusted Context:
1. **No System Instruction Modification**: Retrieved text inside notes, web clips, PDFs, or OCR output can NEVER modify system instructions or alter model persona.
2. **No Tool Authorization**: Retrieved text cannot grant permissions, authorize tool calls, or trigger external network actions.
3. **Output & Citation Validation**: All model outputs pass through client-side structural validation before rendering.

---

## 15. Supabase, RLS & Security Architecture

- **Authentication**: All server requests require a valid Supabase JWT (`auth.uid()`).
- **Row Level Security (RLS)**: Enforced on `note_block_embeddings`:
  `CREATE POLICY "Tenant isolation" ON note_block_embeddings FOR ALL USING (auth.uid() = user_id);`
- **Secrets Management**: `GEMINI_API_KEY` stored exclusively in Supabase Edge Function environment secrets (`DENO_ENV`).

---

## 16. HARDENED SECURITY DEFINER RPC & PRIVILEGE DESIGN

The vector search RPC `match_note_blocks` executes with `SECURITY DEFINER`. To prevent authorization bypass or search_path hijacking, it is hardened with explicit controls.

### Function Parameter vs. Privilege Reference Distinction
- `vector(768)` in the SQL function parameter definition enforces that stored vector columns match the expected 768-D embedding output dimension.
- `vector` (without dimension modifier) in PostgreSQL `REVOKE` and `GRANT` statements correctly identifies the function's input base type per PostgreSQL syntax.

```sql
CREATE OR REPLACE FUNCTION public.match_note_blocks (
  query_embedding vector(768),
  match_threshold double precision,
  match_count integer,
  target_model text DEFAULT 'gemini-embedding-2',
  target_config_version text DEFAULT 'v1.0'
)
RETURNS TABLE (
  id UUID,
  note_id UUID,
  block_id TEXT,
  attachment_id UUID,
  source_type TEXT,
  text_content TEXT,
  metadata JSONB,
  similarity double precision
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp -- Prevents search_path hijacking
AS $$
BEGIN
  -- 1. Explicit Authentication Check
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  RETURN QUERY
  SELECT
    nbe.id,
    nbe.note_id,
    nbe.block_id,
    nbe.attachment_id,
    nbe.source_type,
    nbe.text_content,
    nbe.metadata,
    (1 - (nbe.embedding <=> query_embedding))::double precision AS similarity
  FROM public.note_block_embeddings nbe
  INNER JOIN public.notes n ON n.id = nbe.note_id
  WHERE nbe.user_id = auth.uid()                            -- 2. Strict Tenant Isolation
    AND n.user_id = auth.uid()                              -- 3. Strict Note Ownership Check
    AND n.is_deleted = false                                -- 4. Exclude Deleted Notes
    AND nbe.provider_id = 'gemini'                          -- 5. Model Provider Isolation
    AND nbe.model_name = target_model                       -- 6. Model Family Isolation
    AND nbe.embedding_config_version = target_config_version-- 7. Config Version Isolation
    AND nbe.dimensions = 768                                -- 8. Dimension Isolation
    AND 1 - (nbe.embedding <=> query_embedding) > match_threshold
  ORDER BY nbe.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- Schema-Qualified Privilege Hardening using Base Type `vector`
REVOKE ALL ON FUNCTION public.match_note_blocks(
  vector,
  double precision,
  integer,
  text,
  text
) FROM PUBLIC;

REVOKE ALL ON FUNCTION public.match_note_blocks(
  vector,
  double precision,
  integer,
  text,
  text
) FROM anon;

GRANT EXECUTE ON FUNCTION public.match_note_blocks(
  vector,
  double precision,
  integer,
  text,
  text
) TO authenticated;
```

---

## 17. Offline Behavior & Degradation Matrix

| Feature | Online Mode | Offline Mode |
|---|---|---|
| **Local Lexical Search** | Fully Active (Worker) | **Fully Active (100% Offline)** |
| **Remote Vector Search** | Fully Active (`pgvector`) | Gracefully Disabled (UI Notice) |
| **Gemini AI Copilot** | Fully Active (Edge Function) | Disabled (Graceful Offline Notice) |
| **Indexing Job Queue** | Processed Locally & Embeddings Uploaded | Processed Locally; Vector Uploads Queued in IDB |

---

## 18. Incremental Indexing Architecture

Indexing is triggered asynchronously on document updates:
- **Edit Debounce**: 2,000ms pause after last keypress before enqueuing an indexing task.
- **Content Hash Guard**: Compute `sha256(blockText)`. If hash matches existing index record, indexing is skipped (0 cost).

---

## 19. Queue Architecture (Extending Phase 3 `processingQueue.ts`)

> **DECISION**: Rather than inventing a new queue system (`indexingQueue.ts`), Phase 4 **extends Phase 3's existing `processingQueue.ts` / `ProcessingJob` abstraction** with a new job category `jobType: 'search_index'`.

### Architectural Rationale:
- Reuses established IndexedDB queue persistence (`notenirman-jobs-db`).
- Reuses retry logic, priority scheduling, concurrency controls, and stale-job recovery.
- Maintains strict compliance with **Invariant 5, 6, & 7**: `syncQueue` remains completely untouched.

---

## 20. Collaboration Compatibility (Yjs)

- Indexing attaches a debounced observer (2,000ms idle threshold) to `Y.Doc`.
- Indexing NEVER runs on intermediate cursor movements or transient awareness updates.
- Stable block IDs (`blk_...`) ensure index records remain aligned across CRDT merges.

---

## 21. Attachment-Derived Text Integration

Phase 4 indexes derived textual content extracted by Phase 3 jobs:
- PDF page text
- OCR image text
- Audio transcripts
- Web clip text/metadata

Every derived record maintains full provenance to `noteId`, `attachmentId`, `jobId`, `pageNumber`, `startTimeSec`, and `siteUrl`. Binary media files themselves remain strictly outside the search index.

---

## 22. Database & Supabase `pgvector` Design

```sql
CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE IF NOT EXISTS public.note_block_embeddings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    note_id UUID NOT NULL REFERENCES public.notes(id) ON DELETE CASCADE,
    block_id TEXT,
    attachment_id UUID,
    
    source_type TEXT NOT NULL,
    content_hash TEXT NOT NULL,
    chunk_index INT NOT NULL DEFAULT 0,
    text_content TEXT NOT NULL,
    
    -- Generated Materialized Column for Remote Postgres Lexical FTS
    fts_vec tsvector GENERATED ALWAYS AS (to_tsvector('english', text_content)) STORED,
    
    metadata JSONB DEFAULT '{}'::jsonb,
    
    -- Gemini Embedding Vector (Configured 768 Dimensions)
    embedding vector(768),
    provider_id TEXT NOT NULL DEFAULT 'gemini',
    model_name TEXT NOT NULL DEFAULT 'gemini-embedding-2',
    embedding_config_version TEXT NOT NULL DEFAULT 'v1.0',
    dimensions INT NOT NULL DEFAULT 768,
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for Fast Query Performance
CREATE INDEX IF NOT EXISTS idx_embeddings_user_note ON public.note_block_embeddings(user_id, note_id);
CREATE INDEX IF NOT EXISTS idx_embeddings_vector_hnsw ON public.note_block_embeddings USING hnsw (embedding vector_cosine_ops);

-- GIN Index for Remote PostgreSQL Full-Text Search
CREATE INDEX IF NOT EXISTS idx_embeddings_fts ON public.note_block_embeddings USING gin (fts_vec);

ALTER TABLE public.note_block_embeddings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "User tenant isolation" ON public.note_block_embeddings FOR ALL USING (auth.uid() = user_id);
```

---

## 23. Cross-Platform Design

- **Web / PWA**: IndexedDB + Web Worker lexical index + Supabase Edge Functions.
- **Android (Capacitor)**: Runs in WebView; local lexical index capped at 50MB RAM.
- **Windows (Tauri)**: Web Worker in renderer process; local lexical index persisted to IDB.

---

## 24. Performance Targets (Engineering Targets)

> **NOTE**: The metrics below represent **ENGINEERING TARGETS** to be validated during implementation testing, not measured baseline results.

- Local Lexical Search Query Latency: < 50 ms SLA target.
- Remote Vector Query Latency (HNSW): < 200 ms SLA target.
- Local Index Memory Allocation Cap: < 100 MB RAM target for 100,000 blocks.

---

## 25. Dependency Analysis

No dependencies installed during planning. Future implementation will use:
- `@supabase/supabase-js` (Already installed v2.105.0) for Edge Function calls and vector RPC.
- `flexsearch` (~8 KB) for Web Worker local lexical indexing.
- `pgvector` (Server-side Postgres extension).

---

## 26. Testing Strategy

1. **SECURITY DEFINER & Privilege Tests**: Verify schema-qualified base type (`vector`) function privileges restrict execution to `authenticated` users and reject `anon`/`public`.
2. **Untrusted Context Injection Tests**: Verify prompt injection strings inside note blocks cannot alter system instructions.
3. **Citation Authenticity & Context Set Tests**: Verify client parser rejects Ref IDs not present in the candidate request context set and resolves authoritative text from IDB records.
4. **Offline Search Tests**: Verify search degrades seamlessly to Web Worker lexical search when `navigator.onLine = false`.

---

## 27. Implementation Roadmap (P4.1 – P4.12)

```
P4.1: Types, Schemas & Collision-Proof Canonical searchDocumentId
  ↓
P4.2: Web Worker Local Lexical Search Engine
  ↓
P4.3: Gemini AI Service Interfaces & Gemini Adapters (gemini-embedding-2)
  ↓
P4.4: Gemini Embedding Edge Function (/gemini-embed)
  ↓
P4.5: Gemini Copilot Edge Function (/gemini-copilot)
  ↓
P4.6: Vector Database / Supabase pgvector Schema & Hardened RPC
  ↓
P4.7: Incremental Indexing (Extending Phase 3 processingQueue.ts)
  ↓
P4.8: Hybrid Retrieval & RRF Fusion Engine
  ↓
P4.9: RAG Pipeline & Configurable Context Budgeting (RAG_CONTEXT_TOKEN_BUDGET = 4096)
  ↓
P4.10: Citation & Provenance Architecture
  ↓
P4.11: AI Copilot UI Component & Citation Renderer
  ↓
P4.12: Offline Degradation & Reconnection + Final Security Audit
```

---

## 28. Risks and Mitigations

- **Edge Function API Cost**: Mitigation via debounced content-hash checking (skip unchanged blocks) and batching vector requests.
- **Main Thread Lockup**: Mitigation by executing lexical indexing and search in a dedicated Web Worker.
- **Prompt Injection**: Mitigation by treating all note context as untrusted data and validating outputs client-side.

---

## 29. Explicit Phase 5 Boundary

- **Phase 4 Deliverables**: Lexical/vector search, Gemini RAG, AI Copilot Q&A, block rewriting, citations, offline degradation.
- **Reserved for Phase 5+**: Autonomous AI agents, unsupervised file/calendar tool execution, background autonomous web crawling, multi-agent delegation.

---

PHASE 4 PLAN READY
