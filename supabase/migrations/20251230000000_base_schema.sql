-- NoteNirman base schema: the `notes` and `tags` tables.
--
-- Everything else in supabase/migrations/ builds on these two tables (RLS policies, the
-- offline-sync columns, the Telegram bot). This file is idempotent, so it is safe to run
-- on a project that already has them. Run the migrations in filename order.
--
-- Columns added by later migrations (version, deleted, deleted_at, tags.updated_at) are
-- deliberately not here; see 20260901_offline_sync_support.sql.

CREATE TABLE IF NOT EXISTS public.notes (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid        NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  title       text,
  content     text,
  color       text,
  priority    text,
  tags        text[],
  is_pinned   boolean     DEFAULT false,
  created_at  timestamptz DEFAULT now(),
  updated_at  timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.tags (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid        NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  name        text,
  color       text,
  created_at  timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS notes_user_updated_at_idx ON public.notes (user_id, updated_at);

-- Row Level Security is switched on (and the policies created) in 20260325_rls_policies.sql.
-- Enabling it here as well means a project is never left with open tables if only this file runs.
ALTER TABLE public.notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tags  ENABLE ROW LEVEL SECURITY;
