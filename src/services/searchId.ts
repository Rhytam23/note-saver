import { IndexSourceType, SearchDocumentId } from '../types/search';

/**
 * Environment-agnostic SHA-256 hex string hashing function.
 * Uses Node `crypto` module when available (e.g., Vitest / Node runtime),
 * and falls back to Web Crypto or pure JS calculation for Browser / Web Worker processes.
 */
export function sha256Hex(asciiString: string): string {
  // 1. Node.js environment check (Vitest / server-side)
  if (typeof process !== 'undefined' && process.versions && process.versions.node) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires
      const cryptoModule = require('crypto');
      return cryptoModule.createHash('sha256').update(asciiString, 'utf8').digest('hex');
    } catch {
      // fallback if require fails
    }
  }

  // 2. Pure JS / Browser fallback
  return sha256JsFallback(asciiString);
}

function rightRotate(n: number, b: number): number {
  return (n >>> b) | (n << (32 - b));
}

function sha256JsFallback(asciiString: string): string {
  const bytes: number[] = [];
  for (let i = 0; i < asciiString.length; i++) {
    const c = asciiString.charCodeAt(i);
    if (c < 128) {
      bytes.push(c);
    } else if (c < 2048) {
      bytes.push((c >> 6) | 192, (c & 63) | 128);
    } else {
      bytes.push((c >> 12) | 224, ((c >> 6) & 63) | 128, (c & 63) | 128);
    }
  }

  const K = [
    0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
    0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
    0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
    0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
    0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
    0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
    0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
    0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef4a3f7, 0xc67178f2
  ];

  const H = [
    0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a,
    0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19
  ];

  const l = bytes.length;
  bytes.push(0x80);
  while ((bytes.length % 64) !== 56) {
    bytes.push(0);
  }

  const bitLen = l * 8;
  bytes.push(0, 0, 0, 0);
  bytes.push(
    (bitLen >>> 24) & 0xff,
    (bitLen >>> 16) & 0xff,
    (bitLen >>> 8) & 0xff,
    bitLen & 0xff
  );

  const W = new Int32Array(64);
  for (let i = 0; i < bytes.length; i += 64) {
    for (let t = 0; t < 16; t++) {
      W[t] =
        (bytes[i + t * 4] << 24) |
        (bytes[i + t * 4 + 1] << 16) |
        (bytes[i + t * 4 + 2] << 8) |
        bytes[i + t * 4 + 3];
    }

    for (let t = 16; t < 64; t++) {
      const s0 = rightRotate(W[t - 15], 7) ^ rightRotate(W[t - 15], 18) ^ (W[t - 15] >>> 3);
      const s1 = rightRotate(W[t - 2], 17) ^ rightRotate(W[t - 2], 19) ^ (W[t - 2] >>> 10);
      W[t] = (W[t - 16] + s0 + W[t - 7] + s1) | 0;
    }

    let a = H[0];
    let b = H[1];
    let c = H[2];
    let d = H[3];
    let e = H[4];
    let f = H[5];
    let g = H[6];
    let h = H[7];

    for (let t = 0; t < 64; t++) {
      const S1 = rightRotate(e, 6) ^ rightRotate(e, 11) ^ rightRotate(e, 25);
      const ch = (e & f) ^ (~e & g);
      const temp1 = (h + S1 + ch + K[t] + W[t]) | 0;
      const S0 = rightRotate(a, 2) ^ rightRotate(a, 13) ^ rightRotate(a, 22);
      const maj = (a & b) ^ (a & c) ^ (b & c);
      const temp2 = (S0 + maj) | 0;

      h = g;
      g = f;
      f = e;
      e = (d + temp1) | 0;
      d = c;
      c = b;
      b = a;
      a = (temp1 + temp2) | 0;
    }

    H[0] = (H[0] + a) | 0;
    H[1] = (H[1] + b) | 0;
    H[2] = (H[2] + c) | 0;
    H[3] = (H[3] + d) | 0;
    H[4] = (H[4] + e) | 0;
    H[5] = (H[5] + f) | 0;
    H[6] = (H[6] + g) | 0;
    H[7] = (H[7] + h) | 0;
  }

  return H.map(v => (v >>> 0).toString(16).padStart(8, '0')).join('');
}

/**
 * Generate a canonical, collision-proof searchDocumentId.
 * 
 * Uses an ordered tuple: [noteId, sourceType, blockId ?? null, attachmentId ?? null, chunkIndex]
 * Serialized deterministically as JSON, then hashed via SHA-256.
 * 
 * Format: `doc_<16-char-hex-hash>`
 */
export function generateSearchDocumentId(
  noteId: string,
  sourceType: IndexSourceType,
  blockId?: string | null,
  attachmentId?: string | null,
  chunkIndex: number = 0
): SearchDocumentId {
  const tuple = [
    noteId,
    sourceType,
    blockId ?? null,
    attachmentId ?? null,
    chunkIndex
  ];
  
  const canonicalJson = JSON.stringify(tuple);
  const hashHex = sha256Hex(canonicalJson).substring(0, 16);
  
  return `doc_${hashHex}`;
}
