import { supabase } from '../../src/services/supabase';

/**
 * Pairing works in the direction: the bot shows a code, the signed-in user types
 * it here. The two SQL functions below do the real work server-side (see
 * telegram/database/20260923120000_telegram_pairing.sql); the app never reads or
 * writes the pairing tables directly.
 */

export function getTelegramBotUsername(): string | null {
  const name = (import.meta.env.VITE_TELEGRAM_BOT_USERNAME as string | undefined)?.replace(/^@/, '').trim();
  return name || null;
}

/** Plain link to the bot's chat (no code in it). */
export function getTelegramBotLink(): string | null {
  const name = getTelegramBotUsername();
  return name ? `https://t.me/${name}` : null;
}

/** Same rule as the database: keep letters and digits, uppercase. */
export function normalisePairingCode(input: string): string {
  return input.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
}

export type PairingFailure = 'invalid_or_expired' | 'rate_limited' | 'not_signed_in' | 'error';

export interface PairingPreview {
  name: string | null;
  username: string | null;
}

// `reason`/`value` are declared on both branches: this project isn't in strict mode, where
// TypeScript can't narrow a union on a boolean `ok`.
export type PairingResult<T> =
  | { ok: true; value: T; reason?: undefined }
  | { ok: false; reason: PairingFailure; value?: undefined };

function failure(reason: unknown): { ok: false; reason: PairingFailure } {
  return {
    ok: false,
    reason: reason === 'invalid_or_expired' || reason === 'rate_limited' || reason === 'not_signed_in' ? reason : 'error',
  };
}

export async function isTelegramLinked(userId: string): Promise<boolean> {
  const { data, error } = await supabase.from('telegram_links').select('user_id').eq('user_id', userId).maybeSingle();
  if (error) throw error;
  return !!data;
}

/** Step 1, no side effects: which Telegram account is this code from? */
export async function previewTelegramPairing(code: string): Promise<PairingResult<PairingPreview>> {
  const { data, error } = await supabase.rpc('preview_telegram_pairing', { p_code: normalisePairingCode(code) });
  if (error || !data) return failure('error');
  if (!data.ok) return failure(data.reason);
  return { ok: true, value: { name: data.name ?? null, username: data.username ?? null } };
}

/** Step 2, after the user confirmed: link that Telegram chat to the signed-in account. */
export async function claimTelegramPairing(code: string): Promise<PairingResult<null>> {
  const { data, error } = await supabase.rpc('claim_telegram_pairing', { p_code: normalisePairingCode(code) });
  if (error || !data) return failure('error');
  if (!data.ok) return failure(data.reason);
  return { ok: true, value: null };
}

export async function unlinkTelegram(userId: string): Promise<void> {
  const { error } = await supabase.from('telegram_links').delete().eq('user_id', userId);
  if (error) throw error;
}
