-- NoteNirman 2.0 — Secure Realtime Collaboration Authorization Migration
--
-- Configures Row Level Security (RLS) on realtime.messages to authorize
-- private channel broadcast subscriptions and message publications.
--
-- Requires that authenticated users can only subscribe to (SELECT) or broadcast
-- messages to (INSERT) realtime rooms corresponding to notes they own and that
-- have not been deleted.
--
-- Note: RLS is enabled on realtime.messages by default in Supabase. Do not
-- execute ALTER TABLE realtime.messages ENABLE ROW LEVEL SECURITY.

-- 1. Read / Subscription Authorization Policy
DROP POLICY IF EXISTS "realtime_collab_select_policy" ON realtime.messages;
CREATE POLICY "realtime_collab_select_policy"
ON realtime.messages
FOR SELECT
TO authenticated
USING (
  realtime.messages.extension = 'broadcast'
  AND EXISTS (
    SELECT 1 FROM public.notes
    WHERE ('notenirman-room-' || notes.id::text) = realtime.topic()
      AND notes.user_id = auth.uid()
      AND notes.deleted = false
  )
);

-- 2. Send / Publish Authorization Policy
DROP POLICY IF EXISTS "realtime_collab_insert_policy" ON realtime.messages;
CREATE POLICY "realtime_collab_insert_policy"
ON realtime.messages
FOR INSERT
TO authenticated
WITH CHECK (
  realtime.messages.extension = 'broadcast'
  AND EXISTS (
    SELECT 1 FROM public.notes
    WHERE ('notenirman-room-' || notes.id::text) = realtime.topic()
      AND notes.user_id = auth.uid()
      AND notes.deleted = false
  )
);
