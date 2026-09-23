-- Telegram bot: account linking, conversation state and reminders.
--
-- The bot runs as a Supabase Edge Function using the service-role key, which
-- bypasses RLS. It is therefore the only writer of these tables, apart from
-- the two narrow policies below that let a signed-in user manage THEIR OWN
-- link. Every bot query on public.notes is scoped to the linked user_id in
-- code, because RLS does not protect a service-role client.

-- One row per linked user. A user has at most one Telegram chat, and a chat
-- belongs to at most one user.
CREATE TABLE IF NOT EXISTS public.telegram_links (
  user_id    uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  chat_id    bigint NOT NULL UNIQUE,
  timezone   text NOT NULL DEFAULT 'UTC',
  linked_at  timestamptz NOT NULL DEFAULT now()
);

-- Short-lived, single-use codes the app generates so a Telegram chat can prove
-- which NoteNirman account it belongs to.
CREATE TABLE IF NOT EXISTS public.telegram_link_codes (
  code       text PRIMARY KEY,
  user_id    uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  expires_at timestamptz NOT NULL
);

-- Where each chat is in a multi-step command ("/title", then the body; "/delete", then
-- "/confirm"), plus the numbered list last shown so "/get 3" knows what 3 means.
CREATE TABLE IF NOT EXISTS public.telegram_sessions (
  chat_id            bigint PRIMARY KEY,
  state              text NOT NULL DEFAULT 'idle'
                     CHECK (state IN ('idle', 'awaiting_title', 'awaiting_body', 'awaiting_append',
                                      'awaiting_prepend', 'awaiting_rename', 'awaiting_delete_confirm')),
  pending_title      text,
  pending_priority   text CHECK (pending_priority IN ('high', 'medium', 'low', 'none')),
  target_note_id     uuid,
  last_viewed_id     uuid,
  last_list          jsonb,          -- { "ids": [uuid...], "at": epoch-ms }
  quiz_question      text,
  quiz_answer        text,
  rate_window_start  bigint,
  rate_count         integer NOT NULL DEFAULT 0,
  updated_at         timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.telegram_reminders (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  chat_id    bigint NOT NULL,
  body       text NOT NULL,
  due_at     timestamptz NOT NULL,
  sent       boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS telegram_reminders_due_idx
  ON public.telegram_reminders (due_at) WHERE sent = false;
CREATE INDEX IF NOT EXISTS telegram_reminders_user_idx
  ON public.telegram_reminders (user_id) WHERE sent = false;

ALTER TABLE public.telegram_links      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.telegram_link_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.telegram_sessions   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.telegram_reminders  ENABLE ROW LEVEL SECURITY;

-- Users can see and remove their own link (for the "Connected / Disconnect"
-- control). They cannot create one: only the bot can, after it verifies a code.
DROP POLICY IF EXISTS "telegram_links_select_own" ON public.telegram_links;
CREATE POLICY "telegram_links_select_own" ON public.telegram_links
  FOR SELECT TO authenticated USING (user_id = auth.uid());

DROP POLICY IF EXISTS "telegram_links_delete_own" ON public.telegram_links;
CREATE POLICY "telegram_links_delete_own" ON public.telegram_links
  FOR DELETE TO authenticated USING (user_id = auth.uid());

-- Users can create codes for themselves only; they can never read anyone's back.
DROP POLICY IF EXISTS "telegram_link_codes_insert_own" ON public.telegram_link_codes;
CREATE POLICY "telegram_link_codes_insert_own" ON public.telegram_link_codes
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

-- telegram_sessions and telegram_reminders: no client policies at all
-- (service role only). RLS is on with no policy = deny for every client role.

-- Housekeeping so abandoned link codes don't accumulate.
CREATE INDEX IF NOT EXISTS telegram_link_codes_expiry_idx ON public.telegram_link_codes (expires_at);
