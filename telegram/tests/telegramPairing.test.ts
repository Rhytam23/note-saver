import { describe, it, expect } from 'vitest';
import {
  PAIRING_ALPHABET,
  PAIRING_CODE_LENGTH,
  PAIRING_TTL_MS,
  codeFromBytes,
  formatCode,
  isPlausibleCode,
  normalisePairingCode,
} from '../bot/_shared/pairing';
import { normalisePairingCode as appNormalise } from '../app/telegramLink';

describe('telegram pairing codes', () => {
  it('makes codes from the unambiguous alphabet, at the right length', () => {
    const code = codeFromBytes(crypto.getRandomValues(new Uint8Array(32)));
    expect(code).toHaveLength(PAIRING_CODE_LENGTH);
    for (const c of code) expect(PAIRING_ALPHABET).toContain(c);
  });

  it('never uses look-alike characters', () => {
    for (const bad of ['0', 'O', '1', 'I', 'L']) expect(PAIRING_ALPHABET).not.toContain(bad);
  });

  it('is unbiased: bytes past the last full multiple of the alphabet are skipped', () => {
    const limit = 256 - (256 % PAIRING_ALPHABET.length);
    const bytes = new Uint8Array([255, 254, limit, 0, 1, 2, 3, 4, 5, 6, 7]);
    // The first three are skipped; the rest map straight onto the alphabet.
    expect(codeFromBytes(bytes)).toBe([0, 1, 2, 3, 4, 5, 6, 7].map(i => PAIRING_ALPHABET[i]).join(''));
  });

  it('fails loudly instead of returning a short code', () => {
    expect(() => codeFromBytes(new Uint8Array([255, 255, 255]))).toThrow();
    expect(() => codeFromBytes(new Uint8Array([0, 1, 2]))).toThrow();
  });

  it('generates plenty of distinct codes', () => {
    const seen = new Set<string>();
    for (let i = 0; i < 500; i++) seen.add(codeFromBytes(crypto.getRandomValues(new Uint8Array(32))));
    expect(seen.size).toBe(500);
  });

  it('formats for reading and normalises whatever the user types', () => {
    expect(formatCode('ABCDEFGH')).toBe('ABCD-EFGH');
    expect(normalisePairingCode(' abcd - efgh ')).toBe('ABCDEFGH');
    expect(normalisePairingCode('abcd_efgh!')).toBe('ABCDEFGH');
  });

  it('the app and the bot normalise codes identically (the database does the same)', () => {
    for (const input of ['abcd-efgh', ' ABCD EFGH ', 'ab-cd-ef-gh', 'a1b2c3d4', '']) {
      expect(appNormalise(input)).toBe(normalisePairingCode(input));
    }
  });

  it('recognises plausible codes only', () => {
    expect(isPlausibleCode('abcd-efgh')).toBe(true);
    expect(isPlausibleCode('ABCD-EFG')).toBe(false);
    expect(isPlausibleCode('ABCD-EFG0')).toBe(false); // 0 is not in the alphabet
    expect(isPlausibleCode('')).toBe(false);
  });

  it('expires after 10 minutes', () => {
    expect(PAIRING_TTL_MS).toBe(600_000);
  });
});
