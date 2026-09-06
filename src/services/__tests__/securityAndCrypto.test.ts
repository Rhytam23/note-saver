/**
 * @vitest-environment jsdom
 */
import { describe, it, expect } from 'vitest';
import { SecuritySanitizer } from '../securitySanitizer';
import { CryptoService } from '../cryptoService';

describe('Phase 5 — Security, XSS Sanitization & Backup Encryption (P5.12)', () => {
  describe('SecuritySanitizer', () => {
    it('strips malicious <script>, <iframe>, and onclick event attributes', () => {
      const maliciousHtml = `<div><h1>Title</h1><script>alert("xss")</script><iframe src="evil.com"></iframe><p onclick="steal()">Safe text</p></div>`;
      const clean = SecuritySanitizer.sanitizeHtml(maliciousHtml);

      expect(clean).not.toContain('<script>');
      expect(clean).not.toContain('<iframe>');
      expect(clean).not.toContain('onclick');
      expect(clean).toContain('<h1>Title</h1>');
      expect(clean).toContain('Safe text');
    });

    it('preserves stable block UUID attributes data-block-id', () => {
      const blockHtml = `<p data-block-id="blk_12345">Block content</p>`;
      const clean = SecuritySanitizer.sanitizeHtml(blockHtml);
      expect(clean).toContain('data-block-id="blk_12345"');
    });

    it('strips path traversal sequences from filenames', () => {
      const dangerousPath = '../../../../etc/passwd';
      const cleanPath = SecuritySanitizer.sanitizePath(dangerousPath);
      expect(cleanPath).toBe('etc/passwd');
    });

    it('detects Zip Bomb compression ratio limits', () => {
      const result = SecuritySanitizer.validateArchiveRatio(100, 20000); // 200:1 ratio
      expect(result.valid).toBe(false);
      expect(result.reason).toContain('Zip Bomb detected');
    });
  });

  describe('CryptoService', () => {
    it('encrypts and decrypts string content using AES-256-GCM', async () => {
      const plainText = 'Sensitive NoteNirman full workspace backup content';
      const passphrase = 'SuperSecretPassword123!';

      const encrypted = await CryptoService.encryptBackup(plainText, passphrase);
      expect(encrypted).toBeDefined();
      expect(encrypted.length).toBeGreaterThan(30);

      const decrypted = await CryptoService.decryptBackup(encrypted, passphrase);
      expect(decrypted).toBe(plainText);
    });

    it('fails decryption with wrong passphrase', async () => {
      const plainText = 'Secret data';
      const passphrase = 'CorrectPassword';
      const wrongPassphrase = 'WrongPassword';

      const encrypted = await CryptoService.encryptBackup(plainText, passphrase);
      await expect(CryptoService.decryptBackup(encrypted, wrongPassphrase)).rejects.toThrow();
    });
  });
});
