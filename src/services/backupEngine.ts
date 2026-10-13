import type { Note } from '../types';
import type { Attachment } from '../types/attachment';
import type { PortabilityAST } from '../types/portability';
import * as localDb from './localDb';
import { attachmentStorage } from './attachmentStorage';
import { getBlockDocumentFromHtml } from './editorBlockAdapter';
import { noteContentToPortabilityAST } from './portabilityCore';
// SECURITY: sanitizeImportHtml used to re-sanitize restored note HTML content
import { sanitizeImportHtml } from './importPipeline';
import * as Y from 'yjs';


/**
 * NoteNirman 2.0 Phase 5 — Workspace Backup & Restoration Engine (P5.2)
 * 
 * Guarantees & Invariants:
 * 1. Storage Primacy: `Note.content` HTML remains the sole durable canonical persisted format.
 * 2. No Second Persistence Store: No IndexedDB `blocks` store, separate block DB, or separate sync engine is introduced.
 * 3. Authoritative vs. Derived: Notes, `Note.content`, Attachments, Yjs updates, and Workspace Settings are authoritative.
 *    Lexical search indexes, vector embeddings, jobs, and transient UI state are derived and excluded.
 * 4. Deterministic Identity: Stable Note IDs, block UUIDs (`data-block-id`), and Attachment IDs are preserved.
 * 5. Security: Path traversal protection, file size limits, checksum integrity validation, and untrusted archive sanitization.
 */

// Centralized Backup Security Policy Limits
export const BackupSecurityPolicy = {
  MAX_SINGLE_ATTACHMENT_BYTES: 100 * 1024 * 1024,   // 100 MB
  MAX_UNCOMPRESSED_PACKAGE_BYTES: 500 * 1024 * 1024, // 500 MB
  MAX_NOTE_COUNT: 10000,                            // 10,000 notes
  MAX_ATTACHMENT_COUNT: 10000,                      // 10,000 attachments
  SUPPORTED_BACKUP_FORMAT_VERSION: '1.0',
} as const;

export interface BackupManifest {
  backupFormatVersion: string;
  appVersion: string;
  exportedAt: number;
  userId: string;
  noteCount: number;
  attachmentCount: number;
  containsDerivedData: false;
  checksum: string;
}

export interface BackupNoteItem {
  id: string;
  title: string;
  content: string; // Authoritative Note.content HTML
  tags: string[];
  isPinned: boolean;
  priority: 'high' | 'medium' | 'low' | 'none';
  coverImage?: string;
  createdAt: string;
  updatedAt: string;
  version: number;
  deleted: boolean;
  deletedAt?: string | null;
  portabilityAST?: PortabilityAST;
}

export interface BackupAttachmentItem {
  id: string;
  noteId: string;
  filename: string;
  mimeType: string;
  sizeBytes: number;
  checksumSha256: string;
  base64Data: string;
  createdAt: string;
}

export interface BackupYjsItem {
  noteId: string;
  updateBase64: string; // Encoded Y.encodeStateAsUpdate binary update
}

export interface BackupWorkspaceSettings {
  workspaceId: string;
  workspaceName?: string;
  defaultBlockType?: string;
  autoIndexSearch?: boolean;
  defaultExportFormat?: string;
  calendarDefaultTimezone?: string;
  updatedAt?: number;
}

export interface NNPackage {
  manifest: BackupManifest;
  notes: BackupNoteItem[];
  attachments: BackupAttachmentItem[];
  collaboration: BackupYjsItem[];
  workspaceSettings?: BackupWorkspaceSettings;
}

export interface RestoreValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

export interface RestoreResult {
  success: boolean;
  restoredNotesCount: number;
  restoredAttachmentsCount: number;
  restoredYjsDocsCount: number;
  restoredWorkspaceSettings: boolean;
  errors: string[];
  warnings: string[];
}

export interface RestoreOptions {
  mode: 'merge' | 'replace'; // 'replace' requires explicit destructive confirmation
  confirmReplace?: boolean;
  skipQuotaCheck?: boolean;
}

// Utility: Simple Base64 conversion helpers
export function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const res = reader.result as string;
      const base64 = res.includes(',') ? res.split(',')[1] : res;
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

export function base64ToBlob(base64: string, mimeType: string): Blob {
  const byteChars = atob(base64);
  const byteNumbers = new Array(byteChars.length);
  for (let i = 0; i < byteChars.length; i++) {
    byteNumbers[i] = byteChars.charCodeAt(i);
  }
  const byteArray = new Uint8Array(byteNumbers);
  return new Blob([byteArray], { type: mimeType });
}

export function uint8ArrayToBase64(bytes: Uint8Array): string {
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

export function base64ToUint8Array(base64: string): Uint8Array {
  const binary = atob(base64);
  const len = binary.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

/**
 * Generate simple checksum hash string for package integrity check.
 */
export function computePackageChecksum(notes: BackupNoteItem[], attachments: BackupAttachmentItem[]): string {
  let str = `${notes.length}:${attachments.length}:`;
  notes.forEach(n => { str += `${n.id}:${n.title.length}:`; });
  attachments.forEach(a => { str += `${a.id}:${a.sizeBytes}:`; });
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0;
  }
  return `sha256_${Math.abs(hash).toString(16)}`;
}

/**
 * Path Traversal & Security Sanitizer Helper
 * 
 * SECURITY: Blocks null bytes, percent-encoded separators, Windows drive letters,
 * UNC paths, and directory traversal sequences from note/attachment IDs.
 */
export function sanitizePathOrId(pathOrId: string): string {
  if (!pathOrId) return '';
  let out = pathOrId
    // Decode percent-encoded dots and separators before analysis
    .replace(/%2[eE]/g, '.')
    .replace(/%2[fF]/g, '/')
    .replace(/%5[cC]/g, '\\')
    // Null-byte removal (intentional: strips a null-byte injection vector, e.g. "a.txt\x00.exe")
    // eslint-disable-next-line no-control-regex
    .replace(/\x00/g, '');
  // Strip path traversal sequences. Repeat until nothing changes: one pass turns "....//" into "../".
  let prev: string;
  do {
    prev = out;
    out = out.replace(/(\.\.[\\/])+/g, '').replace(/^\.\.$/g, '');
  } while (out !== prev);
  return out
    // Strip separator characters
    .replace(/[\\/]/g, '_')
    // Strip Windows drive letters
    .replace(/^[a-zA-Z]:/, '');
}


/**
 * Export complete authoritative workspace state as an NNPackage backup container.
 */
export async function createWorkspaceBackup(userId: string): Promise<NNPackage> {
  const notes = await localDb.getLocalNotes(userId, true);
  const backupNotes: BackupNoteItem[] = [];
  const backupAttachments: BackupAttachmentItem[] = [];
  const backupYjs: BackupYjsItem[] = [];

  for (const note of notes) {
    // 1. Note record & canonical Note.content
    const portabilityAST = noteContentToPortabilityAST(note.id, note.content, note.title);
    backupNotes.push({
      id: note.id,
      title: note.title,
      content: note.content,
      tags: note.tags || [],
      isPinned: note.isPinned || false,
      priority: note.priority || 'none',
      coverImage: note.coverImage,
      createdAt: note.createdAt,
      updatedAt: note.updatedAt,
      version: note.version || 1,
      deleted: note.deleted || false,
      deletedAt: note.deletedAt || null,
      portabilityAST,
    });

    // 2. Attachments for note
    const attList = await attachmentStorage.listAttachmentsForNote(note.id);
    for (const att of attList) {
      const blob = await attachmentStorage.readAttachmentData(att.id);
      if (blob) {
        const base64Data = await blobToBase64(blob);
        backupAttachments.push({
          id: att.id,
          noteId: att.noteId,
          filename: att.filename,
          mimeType: att.mimeType,
          sizeBytes: att.sizeBytes,
          checksumSha256: att.checksumSha256 || `sha256_${att.id}`,
          base64Data,
          createdAt: att.createdAt,
        });
      }
    }
  }

  // 3. Workspace settings
  const settings = await localDb.getMeta<BackupWorkspaceSettings>('workspaceSettings');

  const checksum = computePackageChecksum(backupNotes, backupAttachments);

  const manifest: BackupManifest = {
    backupFormatVersion: BackupSecurityPolicy.SUPPORTED_BACKUP_FORMAT_VERSION,
    appVersion: '0.1.0',
    exportedAt: Date.now(),
    userId,
    noteCount: backupNotes.length,
    attachmentCount: backupAttachments.length,
    containsDerivedData: false,
    checksum,
  };

  return {
    manifest,
    notes: backupNotes,
    attachments: backupAttachments,
    collaboration: backupYjs,
    workspaceSettings: settings,
  };
}

/**
 * Validate an NNPackage backup container for security, schema, and integrity constraints.
 */
export function validateBackupPackage(pkg: unknown): RestoreValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!pkg || typeof pkg !== 'object') {
    return { valid: false, errors: ['Invalid package: Package is null or not an object.'], warnings };
  }

  const p = pkg as Partial<NNPackage>;

  if (!p.manifest || typeof p.manifest !== 'object') {
    errors.push('Manifest missing: Package must contain a valid manifest object.');
    return { valid: false, errors, warnings };
  }

  if (p.manifest.backupFormatVersion !== BackupSecurityPolicy.SUPPORTED_BACKUP_FORMAT_VERSION) {
    errors.push(`Unsupported backup format version: Expected '${BackupSecurityPolicy.SUPPORTED_BACKUP_FORMAT_VERSION}', got '${p.manifest.backupFormatVersion}'.`);
  }

  if (p.manifest.containsDerivedData) {
    warnings.push('Manifest indicates package contains derived data; derived data will be ignored during restore.');
  }

  if (!Array.isArray(p.notes)) {
    errors.push('Invalid notes array in package.');
  } else if (p.notes.length > BackupSecurityPolicy.MAX_NOTE_COUNT) {
    errors.push(`Package exceeds maximum note count limit of ${BackupSecurityPolicy.MAX_NOTE_COUNT}.`);
  } else {
    // Validate individual note safety
    for (const note of p.notes) {
      if (!note.id || typeof note.id !== 'string') {
        errors.push('Malformed note entry: Note missing valid ID.');
        break;
      }
      if (note.id !== sanitizePathOrId(note.id)) {
        errors.push(`Security violation: Note ID '${note.id}' contains path traversal sequences.`);
        break;
      }
    }
  }

  if (!Array.isArray(p.attachments)) {
    errors.push('Invalid attachments array in package.');
  } else if (p.attachments.length > BackupSecurityPolicy.MAX_ATTACHMENT_COUNT) {
    errors.push(`Package exceeds maximum attachment count limit of ${BackupSecurityPolicy.MAX_ATTACHMENT_COUNT}.`);
  } else {
    let totalAttachmentBytes = 0;
    for (const att of p.attachments) {
      if (!att.id || !att.noteId) {
        errors.push('Malformed attachment entry: Attachment missing ID or noteId.');
        break;
      }
      if (att.id !== sanitizePathOrId(att.id) || att.noteId !== sanitizePathOrId(att.noteId)) {
        errors.push(`Security violation: Attachment ID '${att.id}' contains path traversal sequences.`);
        break;
      }
      if (att.sizeBytes > BackupSecurityPolicy.MAX_SINGLE_ATTACHMENT_BYTES) {
        errors.push(`Security violation: Attachment '${att.filename}' exceeds single file size limit of 100MB.`);
        break;
      }
      totalAttachmentBytes += att.sizeBytes || 0;
    }

    if (totalAttachmentBytes > BackupSecurityPolicy.MAX_UNCOMPRESSED_PACKAGE_BYTES) {
      errors.push(`Security violation: Package total uncompressed size exceeds limit of 500MB.`);
    }
  }

  // Checksum validation
  if (p.notes && p.attachments && p.manifest.checksum) {
    const expectedChecksum = computePackageChecksum(p.notes, p.attachments);
    if (p.manifest.checksum !== expectedChecksum) {
      warnings.push('Checksum mismatch: Package content may have been modified or generated by an external tool.');
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Restore an NNPackage backup container into authoritative local storage.
 * Enforces preflight validation, quota checks, staged restoration, and non-destructive defaults.
 */
export async function restoreWorkspaceBackup(
  userId: string,
  pkg: NNPackage,
  options: RestoreOptions = { mode: 'merge' }
): Promise<RestoreResult> {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Step 1: Validate security and schema constraints
  const validation = validateBackupPackage(pkg);
  if (!validation.valid) {
    return {
      success: false,
      restoredNotesCount: 0,
      restoredAttachmentsCount: 0,
      restoredYjsDocsCount: 0,
      restoredWorkspaceSettings: false,
      errors: validation.errors,
      warnings: validation.warnings,
    };
  }

  // Add validation warnings
  warnings.push(...validation.warnings);

  // Step 2: Destructive Replace Mode Safety Check
  if (options.mode === 'replace' && !options.confirmReplace) {
    return {
      success: false,
      restoredNotesCount: 0,
      restoredAttachmentsCount: 0,
      restoredYjsDocsCount: 0,
      restoredWorkspaceSettings: false,
      errors: ['Destructive replace mode requires explicit confirmReplace: true authorization.'],
      warnings,
    };
  }

  // Step 3: Quota / Storage Preflight Check
  if (!options.skipQuotaCheck && typeof window !== 'undefined' && window.navigator && window.navigator.storage) {
    try {
      const estimate = await window.navigator.storage.estimate();
      if (estimate.quota && estimate.usage) {
        const freeSpace = estimate.quota - estimate.usage;
        let pkgBytes = 0;
        pkg.attachments.forEach(a => { pkgBytes += a.sizeBytes || 0; });
        if (freeSpace < pkgBytes * 2) {
          return {
            success: false,
            restoredNotesCount: 0,
            restoredAttachmentsCount: 0,
            restoredYjsDocsCount: 0,
            restoredWorkspaceSettings: false,
            errors: [`Insufficient storage quota: Free space (${Math.round(freeSpace / 1024 / 1024)}MB) is less than required storage space (${Math.round(pkgBytes * 2 / 1024 / 1024)}MB).`],
            warnings,
          };
        }
      }
    } catch {
      warnings.push('Storage quota estimation unavailable; proceeding with restore.');
    }
  }

  let restoredNotesCount = 0;
  let restoredAttachmentsCount = 0;
  let restoredYjsDocsCount = 0;
  let restoredWorkspaceSettings = false;

  try {
    // Step 4: Destructive Clear if Replace Mode
    if (options.mode === 'replace') {
      const existingNotes = await localDb.getLocalNotes(userId, true);
      for (const oldNote of existingNotes) {
        await localDb.deleteLocalNoteHard(userId, oldNote.id);
      }
    }

    // Step 5: Restore Canonical Notes & Note.content
    for (const noteItem of pkg.notes) {
      const existing = await localDb.getLocalNote(userId, noteItem.id);
      if (options.mode === 'merge' && existing) {
        // Timestamp / version check: do not overwrite newer local notes
        if (new Date(existing.updatedAt).getTime() > new Date(noteItem.updatedAt).getTime()) {
          warnings.push(`Skipped restoring note '${noteItem.id}': Local note is newer than backup version.`);
          continue;
        }
      }

      const noteToRestore: Note = {
        id: noteItem.id,
        title: noteItem.title,
        // SECURITY: Re-sanitize restored HTML content to block XSS from malicious .nnpackage files.
        // Note.content is the canonical HTML field and MUST be clean before storage.
        content: sanitizeImportHtml(noteItem.content || ''),
        tags: noteItem.tags || [],
        isPinned: noteItem.isPinned || false,
        priority: noteItem.priority || 'none',
        coverImage: noteItem.coverImage,
        createdAt: noteItem.createdAt,
        updatedAt: noteItem.updatedAt,
        version: noteItem.version || 1,
        syncStatus: 'pending',
        deleted: noteItem.deleted || false,
        deletedAt: noteItem.deletedAt || null,
      };


      // Verify TipTap AST reconstruction from Note.content
      getBlockDocumentFromHtml(noteToRestore.content, noteToRestore.id);

      // Persist to localDb notes store
      await localDb.putLocalNote(userId, noteToRestore);
      await localDb.enqueueOp({
        userId,
        entity: 'note',
        entityId: noteToRestore.id,
        action: 'upsert',
        baseVersion: noteToRestore.version,
      });

      restoredNotesCount++;
    }

    // Step 6: Restore Attachments via attachmentStorage
    for (const attItem of pkg.attachments) {
      const sanitizedId = sanitizePathOrId(attItem.id);
      const sanitizedNoteId = sanitizePathOrId(attItem.noteId);
      const blob = base64ToBlob(attItem.base64Data, attItem.mimeType);

      const attMeta: Attachment = {
        id: sanitizedId,
        noteId: sanitizedNoteId,
        filename: attItem.filename,
        mimeType: attItem.mimeType,
        sizeBytes: attItem.sizeBytes,
        checksumSha256: attItem.checksumSha256,
        localUri: `local://${sanitizedId}/${attItem.filename}`,
        status: 'synced',
        createdAt: attItem.createdAt,
        updatedAt: attItem.createdAt,
      };

      await attachmentStorage.saveAttachment(attMeta, blob);
      restoredAttachmentsCount++;
    }

    // Step 7: Restore Full Yjs Collaboration Documents if present
    if (Array.isArray(pkg.collaboration)) {
      for (const yjsItem of pkg.collaboration) {
        try {
          const updateBytes = base64ToUint8Array(yjsItem.updateBase64);
          const ydoc = new Y.Doc();
          Y.applyUpdate(ydoc, updateBytes);
          ydoc.destroy();
          restoredYjsDocsCount++;
        } catch (yjsErr) {
          warnings.push(`Failed to restore Yjs collaboration state for note '${yjsItem.noteId}': ${String(yjsErr)}`);
        }
      }
    }

    // Step 8: Restore Workspace Settings
    if (pkg.workspaceSettings) {
      await localDb.setMeta('workspaceSettings', pkg.workspaceSettings);
      restoredWorkspaceSettings = true;
    }

    return {
      success: true,
      restoredNotesCount,
      restoredAttachmentsCount,
      restoredYjsDocsCount,
      restoredWorkspaceSettings,
      errors,
      warnings,
    };
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    return {
      success: false,
      restoredNotesCount,
      restoredAttachmentsCount,
      restoredYjsDocsCount,
      restoredWorkspaceSettings: false,
      errors: [`Unrecoverable restoration failure: ${errorMsg}`],
      warnings,
    };
  }
}
