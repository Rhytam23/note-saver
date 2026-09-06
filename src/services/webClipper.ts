import { v4 as uuidv4 } from 'uuid';
import type { Block } from '../types/block';

export interface WebClipData {
  url: string;
  title: string;
  excerpt?: string;
  siteName?: string;
  coverImageUrl?: string;
  selectedText?: string;
}

/**
 * NoteNirman 2.0 — Safe Web Clipper Engine
 * 
 * Comprehensive SSRF Protection Rules:
 * 1. Protocol must be strictly http: or https:.
 * 2. User info / credentials (user:pass@) strictly rejected.
 * 3. Localhost, loopback (127.x.x.x, 0.x.x.x), link-local (169.254.x.x AWS metadata) rejected.
 * 4. Private IPv4 ranges (10.x, 172.16-31.x, 192.168.x) rejected.
 * 5. Internal domain TLDs (.local, .internal, .lan, .test) rejected.
 * 6. Numeric/decimal IP encodings rejected.
 */
export function isValidPublicUrl(rawUrl: string): boolean {
  if (!rawUrl || typeof rawUrl !== 'string') return false;

  try {
    const parsed = new URL(rawUrl);

    // Rule 1: Protocol must be http or https
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return false;

    // Rule 2: Reject embedded credentials in URL
    if (parsed.username || parsed.password) return false;

    const hostname = parsed.hostname.toLowerCase();

    // Rule 3: Reject localhost and internal hostnames
    if (
      hostname === 'localhost' ||
      hostname.endsWith('.local') ||
      hostname.endsWith('.internal') ||
      hostname.endsWith('.lan') ||
      hostname.endsWith('.test') ||
      hostname.endsWith('.invalid')
    ) {
      return false;
    }

    // Rule 4: Reject pure decimal or hex IP representations (e.g., 2130706433)
    if (/^\d+$/.test(hostname) || /^0x[0-9a-f]+$/i.test(hostname)) {
      return false;
    }

    // Rule 5: Validate IPv4 ranges
    const ipv4Match = hostname.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
    if (ipv4Match) {
      const [, p1, p2, p3, p4] = ipv4Match.map(Number);

      if (p1 > 255 || p2 > 255 || p3 > 255 || p4 > 255) return false;

      // 0.0.0.0/8 (Broadcast/Current network)
      if (p1 === 0) return false;

      // 127.0.0.0/8 (Loopback)
      if (p1 === 127) return false;

      // 10.0.0.0/8 (Private)
      if (p1 === 10) return false;

      // 172.16.0.0/12 (Private 172.16.0.0 - 172.31.255.255)
      if (p1 === 172 && p2 >= 16 && p2 <= 31) return false;

      // 192.168.0.0/16 (Private)
      if (p1 === 192 && p2 === 168) return false;

      // 169.254.0.0/16 (Link-local / AWS metadata endpoint 169.254.169.254)
      if (p1 === 169 && p2 === 254) return false;
    }

    // Rule 6: Validate IPv6 loopback / link-local
    if (hostname === '[::1]' || hostname === '::1' || hostname.startsWith('fe80:')) {
      return false;
    }

    return true;
  } catch {
    return false;
  }
}

export function createBookmarkBlockFromClip(noteId: string, clip: WebClipData): Block {
  if (!isValidPublicUrl(clip.url)) {
    throw new Error('[WebClipper] Security validation failed: Restricted or unsafe URL rejected.');
  }

  const now = new Date().toISOString();
  const bookmarkBlockId = uuidv4();

  return {
    id: bookmarkBlockId,
    noteId,
    parentId: null,
    type: 'bookmark',
    content: clip.url,
    properties: {
      url: clip.url,
      title: clip.title || clip.url,
      excerpt: clip.excerpt || '',
      siteName: clip.siteName || new URL(clip.url).hostname,
      coverImageUrl: clip.coverImageUrl || '',
      selectedText: clip.selectedText || '',
    },
    position: 0,
    createdAt: now,
    updatedAt: now,
  };
}
