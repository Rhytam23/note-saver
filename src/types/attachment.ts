/**
 * NoteNirman 2.0 — Attachment Data Model & Limits Policy
 * 
 * Invariants:
 * - Attachment binary data is stored OUTSIDE Note.content, syncQueue, and Y.Doc.
 * - Centralized attachment limit policy prevents memory exhaustion.
 */

export type AttachmentStatus = 'local_only' | 'uploading' | 'synced' | 'error';

export interface AttachmentMetadata {
  dimensions?: { width: number; height: number };
  durationSec?: number;
  pageCount?: number;
  author?: string;
  waveform?: number[];
  [key: string]: any;
}

export interface Attachment {
  id: string; // UUID primary key
  noteId: string;
  blockId?: string;
  filename: string;
  mimeType: string;
  sizeBytes: number;
  checksumSha256: string;
  localUri: string;
  remoteUrl?: string;
  status: AttachmentStatus;
  createdAt: string;
  updatedAt: string;
  metadata?: AttachmentMetadata;
}

export interface AttachmentLimitsPolicy {
  webMaxBytes: number;
  nativeMaxBytes: number;
  pdfMaxBytes: number;
  audioMaxBytes: number;
  imageMaxBytes: number;
}

export const ATTACHMENT_LIMITS: Readonly<AttachmentLimitsPolicy> = Object.freeze({
  webMaxBytes: 50 * 1024 * 1024,      // 50 MB for Web/PWA
  nativeMaxBytes: 200 * 1024 * 1024,  // 200 MB for Android/Tauri
  pdfMaxBytes: 50 * 1024 * 1024,     // 50 MB
  audioMaxBytes: 100 * 1024 * 1024,   // 100 MB
  imageMaxBytes: 25 * 1024 * 1024,    // 25 MB
});

export function validateAttachmentSize(sizeBytes: number, mimeType: string, isNative = false): { valid: boolean; error?: string } {
  if (mimeType.startsWith('application/pdf') && sizeBytes > ATTACHMENT_LIMITS.pdfMaxBytes) {
    return { valid: false, error: `PDF file size exceeds maximum limit of ${Math.round(ATTACHMENT_LIMITS.pdfMaxBytes / (1024 * 1024))}MB.` };
  }

  if (mimeType.startsWith('audio/') && sizeBytes > ATTACHMENT_LIMITS.audioMaxBytes) {
    return { valid: false, error: `Audio file size exceeds maximum limit of ${Math.round(ATTACHMENT_LIMITS.audioMaxBytes / (1024 * 1024))}MB.` };
  }

  if (mimeType.startsWith('image/') && sizeBytes > ATTACHMENT_LIMITS.imageMaxBytes) {
    return { valid: false, error: `Image file size exceeds maximum limit of ${Math.round(ATTACHMENT_LIMITS.imageMaxBytes / (1024 * 1024))}MB.` };
  }

  const maxLimit = isNative ? ATTACHMENT_LIMITS.nativeMaxBytes : ATTACHMENT_LIMITS.webMaxBytes;
  if (sizeBytes > maxLimit) {
    return { valid: false, error: `File size exceeds platform limit of ${Math.round(maxLimit / (1024 * 1024))}MB.` };
  }

  return { valid: true };
}
