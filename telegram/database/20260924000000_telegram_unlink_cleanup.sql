-- Disconnecting Telegram (in the app, with /unlink, or by deleting the account) must leave no
-- working data behind. The bot's /unlink already cleaned up; the app's Disconnect button only
-- deleted the link row, which left pending reminders that would still be sent to that chat.
-- Doing it in a trigger covers every path, including the cascade from account deletion.

CREATE OR REPLACE FUNCTION public.telegram_link_cleanup()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.telegram_reminders WHERE user_id = OLD.user_id;
  DELETE FROM public.telegram_sessions  WHERE chat_id = OLD.chat_id;
  RETURN OLD;
END;
$$;

REVOKE ALL ON FUNCTION public.telegram_link_cleanup() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS telegram_links_cleanup ON public.telegram_links;
CREATE TRIGGER telegram_links_cleanup
  AFTER DELETE ON public.telegram_links
  FOR EACH ROW EXECUTE FUNCTION public.telegram_link_cleanup();
