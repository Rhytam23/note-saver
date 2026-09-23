-- Telegram pairing: the bot shows a code, the signed-in user types it into the app.
--
-- Replaces the earlier flow where the app generated the code. Direction matters
-- for safety: anyone can start the bot and get a code, so the app must show WHOSE
-- Telegram account a code belongs to and make the user confirm before linking,
-- otherwise a stranger could talk someone into typing the stranger's code and
-- gain access to that person's notes.

-- Codes the bot hands out. One live code per chat. Service role writes them;
-- the app only ever touches them through the two functions below.
CREATE TABLE IF NOT EXISTS public.telegram_pairing_codes (
  code        text PRIMARY KEY,
  chat_id     bigint NOT NULL UNIQUE,
  tg_name     text,
  tg_username text,
  expires_at  timestamptz NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS telegram_pairing_codes_expiry_idx ON public.telegram_pairing_codes (expires_at);

-- Brute-force protection for code guessing, per signed-in user.
CREATE TABLE IF NOT EXISTS public.telegram_pairing_attempts (
  user_id      uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  window_start timestamptz NOT NULL DEFAULT now(),
  attempts     integer NOT NULL DEFAULT 0
);

-- Lets the bot send a one-time "you're connected" message after the app links a chat.
ALTER TABLE public.telegram_links ADD COLUMN IF NOT EXISTS welcomed boolean NOT NULL DEFAULT true;

ALTER TABLE public.telegram_pairing_codes    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.telegram_pairing_attempts ENABLE ROW LEVEL SECURITY;
-- No policies: clients cannot read or write these tables directly.

-- The old app-generated code flow is gone (it let any signed-in user insert codes).
DROP POLICY IF EXISTS "telegram_link_codes_insert_own" ON public.telegram_link_codes;
DROP TABLE IF EXISTS public.telegram_link_codes;

-- 10 guesses per 10 minutes per user. Returns false when over the limit. This must
-- RETURN rather than RAISE: an exception would roll back the counter update and the
-- limit would never trip.
CREATE OR REPLACE FUNCTION public.telegram_pairing_allow(p_user uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
  rec public.telegram_pairing_attempts%ROWTYPE;
BEGIN
  INSERT INTO public.telegram_pairing_attempts (user_id, window_start, attempts)
  VALUES (p_user, now(), 0)
  ON CONFLICT (user_id) DO NOTHING;

  SELECT * INTO rec FROM public.telegram_pairing_attempts WHERE user_id = p_user FOR UPDATE;

  IF now() - rec.window_start > interval '10 minutes' THEN
    UPDATE public.telegram_pairing_attempts SET window_start = now(), attempts = 1 WHERE user_id = p_user;
    RETURN true;
  END IF;

  UPDATE public.telegram_pairing_attempts SET attempts = attempts + 1 WHERE user_id = p_user;
  RETURN rec.attempts + 1 <= 10;
END;
$$;

-- Step 1 (no side effects): who is asking to be linked? The app shows this to the user.
CREATE OR REPLACE FUNCTION public.preview_telegram_pairing(p_code text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
  uid uuid := auth.uid();
  clean text := upper(regexp_replace(coalesce(p_code, ''), '[^A-Za-z0-9]', '', 'g'));
  rec public.telegram_pairing_codes%ROWTYPE;
BEGIN
  IF uid IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'not_signed_in');
  END IF;
  IF NOT public.telegram_pairing_allow(uid) THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'rate_limited');
  END IF;

  SELECT * INTO rec FROM public.telegram_pairing_codes WHERE code = clean AND expires_at > now();
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'invalid_or_expired');
  END IF;

  RETURN jsonb_build_object('ok', true, 'name', rec.tg_name, 'username', rec.tg_username);
END;
$$;

-- Step 2: the user confirmed. Link the chat that owns the code to THIS account.
CREATE OR REPLACE FUNCTION public.claim_telegram_pairing(p_code text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
  uid uuid := auth.uid();
  clean text := upper(regexp_replace(coalesce(p_code, ''), '[^A-Za-z0-9]', '', 'g'));
  rec public.telegram_pairing_codes%ROWTYPE;
BEGIN
  IF uid IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'not_signed_in');
  END IF;
  IF NOT public.telegram_pairing_allow(uid) THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'rate_limited');
  END IF;

  SELECT * INTO rec FROM public.telegram_pairing_codes
   WHERE code = clean AND expires_at > now() FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'invalid_or_expired');
  END IF;

  -- One chat per user and one user per chat.
  DELETE FROM public.telegram_links WHERE user_id = uid OR chat_id = rec.chat_id;
  INSERT INTO public.telegram_links (user_id, chat_id, welcomed) VALUES (uid, rec.chat_id, false);
  DELETE FROM public.telegram_pairing_codes WHERE code = rec.code;
  -- Fresh conversation state for the newly linked chat.
  INSERT INTO public.telegram_sessions (chat_id, state) VALUES (rec.chat_id, 'idle')
  ON CONFLICT (chat_id) DO UPDATE SET state = 'idle', pending_title = NULL, pending_priority = NULL,
                                       target_note_id = NULL, last_list = NULL, last_viewed_id = NULL;

  RETURN jsonb_build_object('ok', true);
END;
$$;

-- Only signed-in users may call the two app-facing functions; the rate limiter
-- helper is internal.
REVOKE ALL ON FUNCTION public.telegram_pairing_allow(uuid)      FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.preview_telegram_pairing(text)    FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.claim_telegram_pairing(text)      FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.preview_telegram_pairing(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.claim_telegram_pairing(text)   TO authenticated;
