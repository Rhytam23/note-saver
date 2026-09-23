import React, { useEffect, useState } from 'react';
import { useSeason } from '../../src/contexts/SeasonalContext';
import {
  claimTelegramPairing,
  getTelegramBotLink,
  getTelegramBotUsername,
  isTelegramLinked,
  previewTelegramPairing,
  unlinkTelegram,
  type PairingFailure,
  type PairingPreview,
} from './telegramLink';

const buttonClass =
  'w-full px-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-gray-700 dark:text-gray-200 disabled:opacity-60';
const primaryButtonClass =
  'w-full px-4 py-2 bg-accent text-white rounded-lg hover:opacity-90 transition-opacity disabled:opacity-60';
const inputClass =
  'block w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-accent focus:border-accent text-gray-900 dark:text-white tracking-widest font-mono uppercase';

const FAILURE_TEXT: Record<PairingFailure, string> = {
  invalid_or_expired: 'That code is wrong or has expired. Send /start to the bot for a new one.',
  rate_limited: 'Too many attempts. Please wait a few minutes and try again.',
  not_signed_in: 'Please sign in again and retry.',
  error: 'Something went wrong. Check your connection and try again.',
};

/**
 * Profile > Telegram. The bot shows a code; the user types it here and confirms
 * WHICH Telegram account it belongs to before anything is linked. Renders nothing
 * unless VITE_TELEGRAM_BOT_USERNAME is set, so the feature stays invisible until
 * the bot is actually deployed.
 */
const TelegramSection: React.FC<{ userId: string }> = ({ userId }) => {
  const { colors } = useSeason();
  const enabled = getTelegramBotUsername() !== null;
  const botLink = getTelegramBotLink();
  const [linked, setLinked] = useState<boolean | null>(null);
  const [code, setCode] = useState('');
  const [preview, setPreview] = useState<PairingPreview | null>(null);
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

  if (!enabled) return null;

  const reset = () => {
    setPreview(null);
    setCode('');
    setError(null);
  };

  const check = async () => {
    setBusy(true);
    setError(null);
    const result = await previewTelegramPairing(code);
    setBusy(false);
    if (result.ok) setPreview(result.value);
    else setError(FAILURE_TEXT[result.reason]);
  };

  const confirm = async () => {
    setBusy(true);
    setError(null);
    const result = await claimTelegramPairing(code);
    setBusy(false);
    if (result.ok) {
      setLinked(true);
      reset();
    } else {
      setPreview(null);
      setError(FAILURE_TEXT[result.reason]);
    }
  };

  const disconnect = async () => {
    setBusy(true);
    setError(null);
    try {
      await unlinkTelegram(userId);
      setLinked(false);
    } catch {
      setError('Could not disconnect. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  const bodyText = `text-sm ${colors.secondaryText}`;
  const who = preview
    ? [preview.name, preview.username ? `@${preview.username}` : null].filter(Boolean).join(' ') || 'an unnamed Telegram account'
    : '';

  return (
    <div className="pt-4 border-t border-divider-light dark:border-divider">
      <h3 className={`text-sm font-medium mb-3 ${colors.secondaryText}`}>Telegram</h3>

      {linked ? (
        <div className="space-y-2">
          <p className={bodyText}>Connected. Write and read notes from Telegram. Send /help to the bot to see every command.</p>
          <button onClick={disconnect} disabled={busy} className={buttonClass}>Disconnect Telegram</button>
        </div>
      ) : preview ? (
        <div className="space-y-3">
          <p className={bodyText}>
            This code belongs to <strong>{who}</strong> on Telegram. Connect that account to NoteNirman?
          </p>
          <p className={bodyText}>
            It will be able to read, add and change your notes. Only continue if this is <strong>your</strong> Telegram account.
            If someone else gave you this code, cancel.
          </p>
          <div className="flex gap-2">
            <button onClick={reset} disabled={busy} className={buttonClass}>Cancel</button>
            <button onClick={confirm} disabled={busy} className={primaryButtonClass}>
              {busy ? 'Connecting...' : 'Yes, connect'}
            </button>
          </div>
        </div>
      ) : (
        <form
          className="space-y-2"
          onSubmit={e => { e.preventDefault(); if (code.trim()) void check(); }}
        >
          <p className={bodyText}>
            1. Open{' '}
            {botLink
              ? <a href={botLink} target="_blank" rel="noopener noreferrer" className="underline">@{getTelegramBotUsername()}</a>
              : 'the bot'}{' '}
            in Telegram and send <strong>/start</strong>.<br />
            2. Type the code it sends you here.
          </p>
          <input
            value={code}
            onChange={e => setCode(e.target.value)}
            placeholder="ABCD-EFGH"
            maxLength={12}
            autoComplete="off"
            spellCheck={false}
            aria-label="Telegram connect code"
            className={inputClass}
          />
          <button type="submit" disabled={busy || linked === null || !code.trim()} className={buttonClass}>
            {busy ? 'Checking...' : 'Continue'}
          </button>
          <p className={bodyText}>
            Telegram chats are not end-to-end encrypted, and locked notes are never shown there.
          </p>
        </form>
      )}

      {error && <p className="mt-2 text-sm text-red-500">{error}</p>}
    </div>
  );
};

export default TelegramSection;
