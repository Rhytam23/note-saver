-- NoteNirman 2.0 — Purge Search Data for Passphrase-Locked Notes Migration
--
-- 1. Cleans up any existing embeddings for locked or deleted notes.
-- 2. Creates a database trigger on public.notes to purge embeddings on note lock/deletion.
-- 3. Hardens the match_note_blocks RPC to exclude locked notes and locked ciphertext chunks.

-- 1. Purge any existing plaintext embeddings for locked or deleted notes
DELETE FROM public.note_block_embeddings
WHERE note_id IN (
  SELECT id FROM public.notes
  WHERE (content IS NOT NULL AND content LIKE 'NNLOCK1:%')
     OR (deleted = true)
) OR (text_content LIKE 'NNLOCK1:%');

-- 2. Trigger function to purge embeddings on note lock or deletion
CREATE OR REPLACE FUNCTION public.purge_locked_or_deleted_note_embeddings()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF (NEW.deleted = true) OR (NEW.content IS NOT NULL AND NEW.content LIKE 'NNLOCK1:%') THEN
    DELETE FROM public.note_block_embeddings WHERE note_id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_purge_note_embeddings ON public.notes;
CREATE TRIGGER trg_purge_note_embeddings
  AFTER UPDATE OF content, deleted ON public.notes
  FOR EACH ROW
  EXECUTE FUNCTION public.purge_locked_or_deleted_note_embeddings();

-- 3. Hardened match_note_blocks vector search RPC
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
SET search_path = public, pg_temp
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
    AND COALESCE(n.deleted, false) = false                  -- Exclude Deleted Notes
    AND (n.content IS NULL OR NOT (n.content LIKE 'NNLOCK1:%')) -- Exclude Locked Notes
    AND NOT (nbe.text_content LIKE 'NNLOCK1:%')             -- Exclude Locked Chunks
    AND nbe.provider_id = 'gemini'                          -- Provider Isolation
    AND nbe.model_name = target_model                       -- Model Isolation
    AND nbe.embedding_config_version = target_config_version-- Config Version Isolation
    AND nbe.dimensions = 768                                -- Dimension Isolation
    AND 1 - (nbe.embedding <=> query_embedding) > match_threshold
  ORDER BY nbe.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

REVOKE ALL ON FUNCTION public.match_note_blocks(vector, double precision, integer, text, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.match_note_blocks(vector, double precision, integer, text, text) FROM anon;
GRANT EXECUTE ON FUNCTION public.match_note_blocks(vector, double precision, integer, text, text) TO authenticated;
