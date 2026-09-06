-- NoteNirman 2.0 — Phase 4: Supabase pgvector & Hardened RPC Search Migration

-- 1. Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- 2. Create note_block_embeddings table
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
    
    -- Generated Materialized Column for Remote Postgres Lexical Full-Text Search
    fts_vec tsvector GENERATED ALWAYS AS (to_tsvector('english', text_content)) STORED,
    
    metadata JSONB DEFAULT '{}'::jsonb,
    
    -- Gemini Embedding Vector (Configured 768 Output Dimensions)
    embedding vector(768),
    provider_id TEXT NOT NULL DEFAULT 'gemini',
    model_name TEXT NOT NULL DEFAULT 'gemini-embedding-2',
    embedding_config_version TEXT NOT NULL DEFAULT 'v1.0',
    dimensions INT NOT NULL DEFAULT 768,
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. Create Indexes
CREATE INDEX IF NOT EXISTS idx_embeddings_user_note ON public.note_block_embeddings(user_id, note_id);
CREATE INDEX IF NOT EXISTS idx_embeddings_vector_hnsw ON public.note_block_embeddings USING hnsw (embedding vector_cosine_ops);
CREATE INDEX IF NOT EXISTS idx_embeddings_fts ON public.note_block_embeddings USING gin (fts_vec);

-- 4. Enable Row Level Security (RLS)
ALTER TABLE public.note_block_embeddings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "User tenant isolation" ON public.note_block_embeddings;
CREATE POLICY "User tenant isolation" ON public.note_block_embeddings FOR ALL USING (auth.uid() = user_id);

-- 5. Hardened SECURITY DEFINER Vector RPC
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
  -- Explicit Authentication Check
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
  WHERE nbe.user_id = auth.uid()                            -- Tenant Isolation
    AND n.user_id = auth.uid()                              -- Note Ownership Validation
    AND n.is_deleted = false                                -- Exclude Deleted Notes
    AND nbe.provider_id = 'gemini'                          -- Provider Isolation
    AND nbe.model_name = target_model                       -- Model Isolation
    AND nbe.embedding_config_version = target_config_version-- Config Version Isolation
    AND nbe.dimensions = 768                                -- Dimension Isolation
    AND 1 - (nbe.embedding <=> query_embedding) > match_threshold
  ORDER BY nbe.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- 6. Schema-Qualified Privilege Hardening using Base Type `vector`
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
