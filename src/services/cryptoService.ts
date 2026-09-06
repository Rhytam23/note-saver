/**
 * NoteNirman 2.0 P5.12 — Web Crypto AES-256-GCM Backup Encryption
 */

export class CryptoService {
  private static SALT_LENGTH_BYTES = 16;
  private static IV_LENGTH_BYTES = 12; // 96 bits for AES-GCM
  private static PBKDF2_ITERATIONS = 100000;

  /**
   * Encrypts plaintext string using AES-256-GCM derived from password via PBKDF2.
   */
  static async encryptBackup(plainText: string, passphrase: string): Promise<Uint8Array> {
    const encoder = new TextEncoder();
    const data = encoder.encode(plainText);

    const salt = crypto.getRandomValues(new Uint8Array(this.SALT_LENGTH_BYTES));
    const iv = crypto.getRandomValues(new Uint8Array(this.IV_LENGTH_BYTES));

    const key = await this.deriveKey(passphrase, salt);
    const encryptedContent = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      key,
      data
    );

    const result = new Uint8Array(salt.length + iv.length + encryptedContent.byteLength);
    result.set(salt, 0);
    result.set(iv, salt.length);
    result.set(new Uint8Array(encryptedContent), salt.length + iv.length);

    return result;
  }

  /**
   * Decrypts AES-256-GCM encrypted Uint8Array backup using passphrase.
   */
  static async decryptBackup(encryptedBuffer: Uint8Array, passphrase: string): Promise<string> {
    const salt = encryptedBuffer.subarray(0, this.SALT_LENGTH_BYTES);
    const iv = encryptedBuffer.subarray(this.SALT_LENGTH_BYTES, this.SALT_LENGTH_BYTES + this.IV_LENGTH_BYTES);
    const cipherText = encryptedBuffer.subarray(this.SALT_LENGTH_BYTES + this.IV_LENGTH_BYTES);

    const key = await this.deriveKey(passphrase, salt);
    const decryptedContent = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv },
      key,
      cipherText
    );

    const decoder = new TextDecoder();
    return decoder.decode(decryptedContent);
  }

  private static async deriveKey(passphrase: string, salt: Uint8Array): Promise<CryptoKey> {
    const encoder = new TextEncoder();
    const passphraseKey = await crypto.subtle.importKey(
      'raw',
      encoder.encode(passphrase),
      { name: 'PBKDF2' },
      false,
      ['deriveKey']
    );

    return crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt,
        iterations: this.PBKDF2_ITERATIONS,
        hash: 'SHA-256',
      },
      passphraseKey,
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt', 'decrypt']
    );
  }
}
