// Pairing codes: the bot shows one in Telegram, the user types it into the app.
// Pure (no Deno or Node APIs) so it can be unit-tested. The app and the database
// normalise codes the same way: strip everything but letters and digits, uppercase.

/** No 0/O/1/I/L: people read these off a phone screen and type them elsewhere. */
export const PAIRING_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
export const PAIRING_CODE_LENGTH = 8;
export const PAIRING_TTL_MS = 10 * 60 * 1000;

/**
 * `bytes` must be cryptographically random (crypto.getRandomValues). Bytes at or
 * above the largest multiple of the alphabet size are skipped so no character is
 * more likely than another.
 */
export function codeFromBytes(bytes: Uint8Array): string {
  const limit = 256 - (256 % PAIRING_ALPHABET.length);
  let out = '';
  for (const b of bytes) {
    if (b >= limit) continue;
    out += PAIRING_ALPHABET[b % PAIRING_ALPHABET.length];
    if (out.length === PAIRING_CODE_LENGTH) return out;
  }
  throw new Error('not enough random bytes');
}

/** "ABCD-EFGH" - easier to read and to type. */
export function formatCode(code: string): string {
  return `${code.slice(0, 4)}-${code.slice(4)}`;
}

export function normalisePairingCode(input: string): string {
  return input.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
}

export function isPlausibleCode(input: string): boolean {
  const code = normalisePairingCode(input);
  return code.length === PAIRING_CODE_LENGTH && [...code].every((c) => PAIRING_ALPHABET.includes(c));
}
