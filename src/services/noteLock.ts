import type { Note } from '../types';

/**
 * Per-note lock. A locked note's `content` field is replaced with this prefix
 * followed by base64(salt + iv + ciphertext), so it needs no new database
 * column and syncs through the existing pipeline as an ordinary string.
 *
 * There is no passphrase recovery: forgetting it makes the note unreadable
 * forever. Every UI that sets a passphrase must say so before locking.
 */
export const LOCK_PREFIX = 'NNLOCK1:';

const SALT_BYTES = 16;
const IV_BYTES = 12;
const PBKDF2_ITERATIONS = 150000;

export function isLockedContent(content: string | null | undefined): boolean {
  return typeof content === 'string' && content.startsWith(LOCK_PREFIX);
}

export function isNoteLocked(note: Pick<Note, 'content'>): boolean {
  return isLockedContent(note.content);
}

function toBase64(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}

function fromBase64(b64: string): Uint8Array {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

async function deriveKey(passphrase: string, salt: Uint8Array): Promise<CryptoKey> {
  const material = await crypto.subtle.importKey('raw', new TextEncoder().encode(passphrase), 'PBKDF2', false, [
    'deriveKey',
  ]);
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt: salt as BufferSource, iterations: PBKDF2_ITERATIONS, hash: 'SHA-256' },
    material,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

/** Encrypts note HTML with a passphrase. The result is safe to store as Note.content. */
export async function lockNoteContent(plainHtml: string, passphrase: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(SALT_BYTES));
  const iv = crypto.getRandomValues(new Uint8Array(IV_BYTES));
  const key = await deriveKey(passphrase, salt);
  const cipher = await crypto.subtle.encrypt({ name: 'AES-GCM', iv: iv as BufferSource }, key, new TextEncoder().encode(plainHtml));

  const combined = new Uint8Array(salt.length + iv.length + cipher.byteLength);
  combined.set(salt, 0);
  combined.set(iv, salt.length);
  combined.set(new Uint8Array(cipher), salt.length + iv.length);
  return LOCK_PREFIX + toBase64(combined);
}

/**
 * Decrypts content produced by lockNoteContent.
 * @throws Error('wrong-passphrase') when the passphrase is incorrect or the data is corrupt.
 */
export async function unlockNoteContent(lockedContent: string, passphrase: string): Promise<string> {
  if (!isLockedContent(lockedContent)) throw new Error('not-locked');
  const combined = fromBase64(lockedContent.slice(LOCK_PREFIX.length));
  const salt = combined.slice(0, SALT_BYTES);
  const iv = combined.slice(SALT_BYTES, SALT_BYTES + IV_BYTES);
  const cipher = combined.slice(SALT_BYTES + IV_BYTES);

  const key = await deriveKey(passphrase, salt);
  try {
    const plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: iv as BufferSource }, key, cipher as BufferSource);
    return new TextDecoder().decode(plain);
  } catch {
    // AES-GCM's authentication tag fails to verify for any wrong key or tampered data.
    throw new Error('wrong-passphrase');
  }
}
