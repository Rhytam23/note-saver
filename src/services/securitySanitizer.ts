import DOMPurify from 'dompurify';

export const ImportSecurityPolicy = {
  MAX_SINGLE_TEXT_FILE_BYTES: 50 * 1024 * 1024,       // 50 MB
  MAX_SINGLE_ATTACHMENT_BYTES: 100 * 1024 * 1024,    // 100 MB
  MAX_UNCOMPRESSED_ARCHIVE_BYTES: 500 * 1024 * 1024, // 500 MB
  MAX_ZIP_COMPRESSION_RATIO: 100,                    // 100:1 max ratio
  MAX_BATCH_DOCUMENT_COUNT: 50,
  ALLOWED_HTML_TAGS: [
    'p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
    'ul', 'ol', 'li', 'blockquote', 'table',
    'tr', 'td', 'th', 'a', 'span', 'b', 'i',
    'strong', 'em', 'img', 'code', 'pre', 'hr'
  ],
  STRIP_ELEMENTS: [
    'script', 'iframe', 'object', 'embed',
    'style', 'link', 'form', 'input', 'button', 'svg'
  ],
} as const;

export class SecuritySanitizer {
  /**
   * Sanitizes input HTML string removing dangerous tags and XSS vectors.
   */
  static sanitizeHtml(rawHtml: string): string {
    if (!rawHtml) return '';
    return DOMPurify.sanitize(rawHtml, {
      ALLOWED_TAGS: [...ImportSecurityPolicy.ALLOWED_HTML_TAGS],
      FORBID_TAGS: [...ImportSecurityPolicy.STRIP_ELEMENTS],
      ADD_ATTR: ['data-block-id'], // Preserve stable block UUIDs
    });
  }

  /**
   * Prevents directory traversal attacks in filenames / paths.
   */
  static sanitizePath(filepath: string): string {
    if (!filepath) return '';
    // Strip leading slashes, backslashes, and path traversal sequences (../ or ..\)
    return filepath
      .replace(/\\/g, '/')
      .replace(/(\.\.\/)+/g, '')
      .replace(/^\/+/, '');
  }

  /**
   * Validates archive zip bomb ratio safety.
   */
  static validateArchiveRatio(compressedSize: number, uncompressedSize: number): { valid: boolean; reason?: string } {
    if (compressedSize <= 0) return { valid: true };
    const ratio = uncompressedSize / compressedSize;
    if (ratio > ImportSecurityPolicy.MAX_ZIP_COMPRESSION_RATIO) {
      return {
        valid: false,
        reason: `Potential Zip Bomb detected. Compression ratio (${Math.round(ratio)}:1) exceeds maximum allowed limit (${ImportSecurityPolicy.MAX_ZIP_COMPRESSION_RATIO}:1).`,
      };
    }
    if (uncompressedSize > ImportSecurityPolicy.MAX_UNCOMPRESSED_ARCHIVE_BYTES) {
      return {
        valid: false,
        reason: `Archive exceeds maximum uncompressed size limit of 500 MB.`,
      };
    }
    return { valid: true };
  }
}
