-- NoteNirman 2.0 — Offline Sync Support Migration

ALTER TABLE public.notes ADD COLUMN IF NOT EXISTS version integer NOT NULL DEFAULT 1;
ALTER TABLE public.notes ADD COLUMN IF NOT EXISTS deleted boolean NOT NULL DEFAULT false;
ALTER TABLE public.notes ADD COLUMN IF NOT EXISTS deleted_at timestamptz;

ALTER TABLE public.tags ADD COLUMN IF NOT EXISTS version integer NOT NULL DEFAULT 1;
ALTER TABLE public.tags ADD COLUMN IF NOT EXISTS deleted boolean NOT NULL DEFAULT false;
ALTER TABLE public.tags ADD COLUMN IF NOT EXISTS deleted_at timestamptz;
ALTER TABLE public.tags ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

-- SECURITY: SET search_path explicitly to prevent search_path hijacking.
-- Without this, a malicious database object in a user-controlled schema could
-- shadow pg_catalog or public functions and intercept trigger execution.
-- SECURITY INVOKER (default) is correct here — trigger runs as the invoking user
-- which is the authenticated Supabase user or the service role, both fine for
-- a simple timestamp+version bump with no elevated privileges needed.
CREATE OR REPLACE FUNCTION public.bump_version_and_timestamp()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_catalog
AS $$
BEGIN
  NEW.updated_at := now();
  NEW.version := COALESCE(OLD.version, 0) + 1;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS notes_bump_version ON public.notes;
CREATE TRIGGER notes_bump_version
  BEFORE UPDATE ON public.notes
  FOR EACH ROW
  EXECUTE FUNCTION public.bump_version_and_timestamp();

DROP TRIGGER IF EXISTS tags_bump_version ON public.tags;
CREATE TRIGGER tags_bump_version
  BEFORE UPDATE ON public.tags
  FOR EACH ROW
  EXECUTE FUNCTION public.bump_version_and_timestamp();
