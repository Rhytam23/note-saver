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
      // SECURITY: Explicitly restrict allowed URI protocols.
      // Blocks javascript:, vbscript:, and data: URIs in href/src attributes.
      // Only http, https, and data-image URLs (for inline images) are permitted.
      ALLOWED_URI_REGEXP: /^(?:https?:|data:image\/(?:png|jpg|jpeg|gif|webp|svg\+xml);base64)/i,
      // SECURITY: Forbid style attribute to block CSS expression() injection and
      // CSS-based data exfiltration attacks. Note content does not require inline styles.
      FORBID_ATTR: ['style', 'onerror', 'onload', 'onclick', 'onmouseover', 'onfocus', 'onblur', 'onchange'],
    }) as string;
  }

  /**
   * Prevents directory traversal attacks in filenames / paths.
   * 
   * SECURITY: Blocks:
   *   - ../  and ..\  (literal and URL-encoded %2F, %5C variants)
   *   - Absolute paths (/, \, C:\)
   *   - Windows UNC paths (\\server\share)
   *   - Null bytes (\x00) which truncate paths on some systems
   *   - Colons in names (Windows drive letter prefix C:)
   */
  static sanitizePath(filepath: string): string {
    if (!filepath) return '';
    let out = filepath
      // Decode any percent-encoded dots and separators before analysis
      .replace(/%2[eE]/g, '.')
      .replace(/%2[fF]/g, '/')
      .replace(/%5[cC]/g, '\\')
      // Null-byte removal (intentional: strips a null-byte injection vector, e.g. "a.txt\x00.exe")
      // eslint-disable-next-line no-control-regex
      .replace(/\x00/g, '')
      // Normalize to forward slashes
      .replace(/\\/g, '/');
    // Drop every ".." path segment. Working on whole segments (not a text pattern) means input like
    // "....//" or a trailing ".." cannot be rebuilt into a traversal.
    out = out.split('/').filter((segment) => segment !== '..').join('/');
    return out
      // Strip leading slashes (absolute path protection)
      .replace(/^\/+/, '')
      // Strip Windows drive letters (e.g. C:)
      .replace(/^[a-zA-Z]:/, '')
      // Strip UNC prefix
      .replace(/^\/\//, '');
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
