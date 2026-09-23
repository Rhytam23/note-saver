import { supabase } from '../../src/services/supabase';

const CODE_TTL_MS = 10 * 60 * 1000;
// Unambiguous characters only (no 0/O/1/I/l) - the code travels in a URL, but
// people do sometimes read it off a screen.
const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const CODE_LENGTH = 16;

export function getTelegramBotUsername(): string | null {
  const name = (import.meta.env.VITE_TELEGRAM_BOT_USERNAME as string | undefined)?.replace(/^@/, '').trim();
  return name || null;
}

function generateCode(): string {
  const bytes = new Uint8Array(CODE_LENGTH);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, b => CODE_ALPHABET[b % CODE_ALPHABET.length]).join('');
}

export async function isTelegramLinked(userId: string): Promise<boolean> {
  const { data, error } = await supabase.from('telegram_links').select('user_id').eq('user_id', userId).maybeSingle();
  if (error) throw error;
  return !!data;
}

/**
 * Creates a single-use, 10-minute code and returns the t.me deep link that
 * hands it to the bot. The bot proves which account a Telegram chat belongs
 * to by looking this code up - the link itself carries no credentials.
 */
export async function createTelegramLinkUrl(userId: string): Promise<string> {
  const botUsername = getTelegramBotUsername();
  if (!botUsername) throw new Error('telegram-not-configured');

  const code = generateCode();
  const { error } = await supabase.from('telegram_link_codes').insert({
    code,
    user_id: userId,
    expires_at: new Date(Date.now() + CODE_TTL_MS).toISOString(),
  });
  if (error) throw error;
  return `https://t.me/${botUsername}?start=${code}`;
}

export async function unlinkTelegram(userId: string): Promise<void> {
  const { error } = await supabase.from('telegram_links').delete().eq('user_id', userId);
  if (error) throw error;
}
