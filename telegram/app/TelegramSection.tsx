import React, { useEffect, useState } from 'react';
import { useSeason } from '../../src/contexts/SeasonalContext';
import { openInSystemBrowser } from '../../src/services/platform/nativeAuthBridge';
import { createTelegramLinkUrl, getTelegramBotUsername, isTelegramLinked, unlinkTelegram } from './telegramLink';

const POLL_MS = 4000;
const CODE_LIFETIME_MS = 10 * 60 * 1000;

const buttonClass =
  'w-full px-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-gray-700 dark:text-gray-200 disabled:opacity-60';

/**
 * "Connect Telegram" control for the Profile modal. Renders nothing unless
 * VITE_TELEGRAM_BOT_USERNAME is set, so the feature stays invisible until the
 * bot is actually deployed.
 */
const TelegramSection: React.FC<{ userId: string }> = ({ userId }) => {
  const { colors } = useSeason();
  const enabled = getTelegramBotUsername() !== null;
  const [linked, setLinked] = useState<boolean | null>(null);
  const [url, setUrl] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    isTelegramLinked(userId)
      .then(value => { if (!cancelled) setLinked(value); })
      .catch(() => { if (!cancelled) setLinked(false); });
    return () => { cancelled = true; };
  }, [enabled, userId]);

  // While the connect link is open, watch for the bot to finish linking.
  useEffect(() => {
    if (!url || linked) return;
    const started = Date.now();
    const timer = window.setInterval(async () => {
      if (Date.now() - started > CODE_LIFETIME_MS) { window.clearInterval(timer); return; }
      try {
        if (await isTelegramLinked(userId)) {
          setLinked(true);
          setUrl(null);
        }
      } catch { /* keep polling */ }
    }, POLL_MS);
    return () => window.clearInterval(timer);
  }, [url, linked, userId]);

  if (!enabled) return null;

  const connect = async () => {
    setBusy(true);
    setError(null);
    try {
      const link = await createTelegramLinkUrl(userId);
      setUrl(link);
      await openInSystemBrowser(link);
    } catch {
      setError('Could not create a connect link. Check your connection and try again.');
    } finally {
      setBusy(false);
    }
  };

  const disconnect = async () => {
    setBusy(true);
    setError(null);
    try {
      await unlinkTelegram(userId);
      setLinked(false);
      setUrl(null);
    } catch {
      setError('Could not disconnect. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  const bodyText = `text-sm ${colors.secondaryText}`;

  return (
    <div className="pt-4 border-t border-divider-light dark:border-divider">
      <h3 className={`text-sm font-medium mb-3 ${colors.secondaryText}`}>Telegram</h3>
      {linked ? (
        <div className="space-y-2">
          <p className={bodyText}>Connected. Write and read notes from Telegram. Send /help to the bot to see every command.</p>
          <button onClick={disconnect} disabled={busy} className={buttonClass}>Disconnect Telegram</button>
        </div>
      ) : (
        <div className="space-y-2">
          <p className={bodyText}>
            Add notes and look them up from Telegram; they sync to every device. Telegram chats are not end-to-end
            encrypted, and locked notes are never shown there.
          </p>
          <button onClick={connect} disabled={busy || linked === null} className={buttonClass}>
            {busy ? 'Preparing link...' : 'Connect Telegram'}
          </button>
          {url && (
            <p className={bodyText}>
              Tap Start in Telegram to finish. Didn't open?{' '}
              <a href={url} target="_blank" rel="noopener noreferrer" className="underline">Open Telegram</a>
            </p>
          )}
        </div>
      )}
      {error && <p className="mt-2 text-sm text-red-500">{error}</p>}
    </div>
  );
};

export default TelegramSection;
