/**
 * @vitest-environment jsdom
 */
import { describe, it, expect } from 'vitest';
import { lockNoteContent, unlockNoteContent, isLockedContent, isNoteLocked, LOCK_PREFIX } from '../noteLock';

describe('note lock', () => {
  it('round-trips content through lock and unlock', async () => {
    const html = '<p>Exam answers: the mitochondria is the powerhouse of the cell.</p>';
    const locked = await lockNoteContent(html, 'correct horse battery staple');
    expect(isLockedContent(locked)).toBe(true);
    expect(locked.startsWith(LOCK_PREFIX)).toBe(true);
    expect(locked).not.toContain('mitochondria');

    const unlocked = await unlockNoteContent(locked, 'correct horse battery staple');
    expect(unlocked).toBe(html);
  });

  it('rejects the wrong passphrase instead of returning garbage', async () => {
    const locked = await lockNoteContent('<p>secret</p>', 'right-passphrase');
    await expect(unlockNoteContent(locked, 'wrong-passphrase')).rejects.toThrow('wrong-passphrase');
  });

  it('detects tampering rather than silently decrypting corrupted data', async () => {
    const locked = await lockNoteContent('<p>secret</p>', 'a-passphrase');
    const tampered = locked.slice(0, -4) + (locked.slice(-4) === 'AAAA' ? 'BBBB' : 'AAAA');
    await expect(unlockNoteContent(tampered, 'a-passphrase')).rejects.toThrow();
  });

  it('produces a different ciphertext every time even for the same input', async () => {
    const a = await lockNoteContent('<p>same text</p>', 'pw');
    const b = await lockNoteContent('<p>same text</p>', 'pw');
    expect(a).not.toBe(b);
  });

  it('isNoteLocked reads the content field only', () => {
    expect(isNoteLocked({ content: LOCK_PREFIX + 'abc' })).toBe(true);
    expect(isNoteLocked({ content: '<p>hi</p>' })).toBe(false);
    expect(isNoteLocked({ content: '' })).toBe(false);
  });
});
