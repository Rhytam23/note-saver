ALTER TABLE public.notes ADD COLUMN IF NOT EXISTS version integer NOT NULL DEFAULT 1;
ALTER TABLE public.notes ADD COLUMN IF NOT EXISTS deleted boolean NOT NULL DEFAULT false;
ALTER TABLE public.notes ADD COLUMN IF NOT EXISTS deleted_at timestamptz;

ALTER TABLE public.tags ADD COLUMN IF NOT EXISTS version integer NOT NULL DEFAULT 1;
ALTER TABLE public.tags ADD COLUMN IF NOT EXISTS deleted boolean NOT NULL DEFAULT false;
ALTER TABLE public.tags ADD COLUMN IF NOT EXISTS deleted_at timestamptz;
ALTER TABLE public.tags ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

CREATE OR REPLACE FUNCTION public.bump_version_and_timestamp()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at := now();
  NEW.version := COALESCE(OLD.version, 0) + 1;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

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

CREATE INDEX IF NOT EXISTS notes_user_updated_at_idx ON public.notes (user_id, updated_at);

