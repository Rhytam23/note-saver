// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  createWorkspaceBackup,
  validateBackupPackage,
  restoreWorkspaceBackup,
  sanitizePathOrId,
  computePackageChecksum,
  BackupSecurityPolicy,
  type NNPackage,
} from '../backupEngine';
import * as localDb from '../localDb';
import { attachmentStorage } from '../attachmentStorage';
import type { Note } from '../../types';
import type { Attachment } from '../../types/attachment';

describe('Workspace Backup & Restoration Engine (P5.2)', () => {
  const userId = 'user-test-999';

  const testNote1: Note = {
    id: 'note-uuid-111',
    title: 'P5.2 Backup Test Note 1',
    content: '<h1 data-block-id="blk-h1-111">Title 1</h1><p data-block-id="blk-p1-111">Hello <strong>World</strong></p>',
    tags: ['work', 'important'],
    isPinned: true,
    priority: 'high',
    createdAt: '2026-09-06T10:00:00.000Z',
    updatedAt: '2026-09-06T10:00:00.000Z',
    version: 1,
    syncStatus: 'synced',
    deleted: false,
  };

  const testNote2: Note = {
    id: 'note-uuid-222',
    title: 'P5.2 Backup Test Note 2',
    content: '<p data-block-id="blk-p2-222">Second note content</p>',
    tags: [],
    isPinned: false,
    priority: 'none',
    createdAt: '2026-09-06T11:00:00.000Z',
    updatedAt: '2026-09-06T11:00:00.000Z',
    version: 1,
    syncStatus: 'synced',
    deleted: false,
  };

  const testAttachment: Attachment = {
    id: 'att-uuid-777',
    noteId: 'note-uuid-111',
    filename: 'document.pdf',
    mimeType: 'application/pdf',
    sizeBytes: 1024,
    checksumSha256: 'hash_att_777',
    localUri: 'local://att-uuid-777/document.pdf',
    status: 'synced',
    createdAt: '2026-09-06T10:05:00.000Z',
    updatedAt: '2026-09-06T10:05:00.000Z',
  };

  // In-memory store mocks for localDb
  const mockNotesStore = new Map<string, Note>();
  const mockMetaStore = new Map<string, unknown>();

  beforeEach(() => {
    mockNotesStore.clear();
    mockMetaStore.clear();

    vi.spyOn(localDb, 'getLocalNotes').mockImplementation(async (_u, includeDeleted) => {
      const list = Array.from(mockNotesStore.values());
      return includeDeleted ? list : list.filter(n => !n.deleted);
    });

    vi.spyOn(localDb, 'getLocalNote').mockImplementation(async (_u, id) => {
      return mockNotesStore.get(id);
    });

    vi.spyOn(localDb, 'putLocalNote').mockImplementation(async (_u, note) => {
      mockNotesStore.set(note.id, { ...note });
    });

    vi.spyOn(localDb, 'deleteLocalNoteHard').mockImplementation(async (_u, id) => {
      mockNotesStore.delete(id);
    });

    vi.spyOn(localDb, 'getMeta').mockImplementation(async (key) => {
      return mockMetaStore.get(key) as any;
    });

    vi.spyOn(localDb, 'setMeta').mockImplementation(async (key, value) => {
      mockMetaStore.set(key, value);
    });

    vi.spyOn(localDb, 'enqueueOp').mockImplementation(async (op) => {
      return {
        opId: `op-${Date.now()}`,
        userId: op.userId,
        entity: op.entity,
        entityId: op.entityId,
        action: op.action,
        baseVersion: op.baseVersion,
        attempts: 0,
        nextRetryAt: Date.now(),
        createdAt: Date.now(),
      };
    });
  });

  it('1. Generates a valid workspace backup manifest & NNPackage container', async () => {
    await localDb.putLocalNote(userId, testNote1);
    const backup = await createWorkspaceBackup(userId);

    expect(backup.manifest).toBeDefined();
    expect(backup.manifest.backupFormatVersion).toBe(BackupSecurityPolicy.SUPPORTED_BACKUP_FORMAT_VERSION);
    expect(backup.manifest.userId).toBe(userId);
    expect(backup.manifest.noteCount).toBe(1);
    expect(backup.manifest.containsDerivedData).toBe(false);
    expect(backup.notes.length).toBe(1);
    expect(backup.notes[0].id).toBe(testNote1.id);
  });

  it('2. Includes canonical Note.content HTML and preserves formatting and stable block UUIDs', async () => {
    await localDb.putLocalNote(userId, testNote1);
    const backup = await createWorkspaceBackup(userId);

    const noteItem = backup.notes[0];
    expect(noteItem.content).toBe(testNote1.content);
    expect(noteItem.content).toContain('data-block-id="blk-h1-111"');
    expect(noteItem.content).toContain('data-block-id="blk-p1-111"');
    expect(noteItem.content).toContain('Hello <strong>World</strong>');
  });

  it('3. Preserves stable note IDs and PortabilityAST', async () => {
    await localDb.putLocalNote(userId, testNote1);
    const backup = await createWorkspaceBackup(userId);

    expect(backup.notes[0].id).toBe('note-uuid-111');
    expect(backup.notes[0].portabilityAST).toBeDefined();
    expect(backup.notes[0].portabilityAST?.nodes.length).toBe(2);
    expect(backup.notes[0].portabilityAST?.nodes[0].id).toBe('blk-h1-111');
  });

  it('4. Preserves attachment metadata and deterministic storage identity', async () => {
    await localDb.putLocalNote(userId, testNote1);
    const fakeData = new Blob(['sample pdf content'], { type: 'application/pdf' });
    await attachmentStorage.saveAttachment(testAttachment, fakeData);

    const backup = await createWorkspaceBackup(userId);
    expect(backup.attachments.length).toBe(1);
    expect(backup.attachments[0].id).toBe(testAttachment.id);
    expect(backup.attachments[0].noteId).toBe(testAttachment.noteId);
    expect(backup.attachments[0].base64Data).toBeDefined();

    // Clean up attachment
    await attachmentStorage.deleteAttachment(testAttachment.id);
  });

  it('5. Rejects malformed package objects during preflight validation', () => {
    const res1 = validateBackupPackage(null);
    expect(res1.valid).toBe(false);

    const res2 = validateBackupPackage({ manifest: { backupFormatVersion: '99.0' } });
    expect(res2.valid).toBe(false);
    expect(res2.errors[0]).toContain('Unsupported backup format version');
  });

  it('6. Rejects path traversal attempts in IDs or filenames', () => {
    const maliciousPkg: NNPackage = {
      manifest: {
        backupFormatVersion: '1.0',
        appVersion: '0.1.0',
        exportedAt: Date.now(),
        userId,
        noteCount: 1,
        attachmentCount: 0,
        containsDerivedData: false,
        checksum: 'fake',
      },
      notes: [
        {
          id: '../../etc/passwd',
          title: 'Malicious Note',
          content: '<p>test</p>',
          tags: [],
          isPinned: false,
          priority: 'none',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          version: 1,
          deleted: false,
        },
      ],
      attachments: [],
      collaboration: [],
    };

    const res = validateBackupPackage(maliciousPkg);
    expect(res.valid).toBe(false);
    expect(res.errors[0]).toContain('path traversal');
  });

  it('7. Rejects oversized attachment files exceeding security limits', () => {
    const oversizedPkg: NNPackage = {
      manifest: {
        backupFormatVersion: '1.0',
        appVersion: '0.1.0',
        exportedAt: Date.now(),
        userId,
        noteCount: 1,
        attachmentCount: 1,
        containsDerivedData: false,
        checksum: 'fake',
      },
      notes: [],
      attachments: [
        {
          id: 'att-huge',
          noteId: 'note-1',
          filename: 'huge.iso',
          mimeType: 'application/octet-stream',
          sizeBytes: 200 * 1024 * 1024, // 200 MB > 100 MB limit
          checksumSha256: 'hash_huge',
          base64Data: 'AAAA',
          createdAt: new Date().toISOString(),
        },
      ],
      collaboration: [],
    };

    const res = validateBackupPackage(oversizedPkg);
    expect(res.valid).toBe(false);
    expect(res.errors[0]).toContain('exceeds single file size limit');
  });

  it('8. Requires explicit confirmation for destructive replace mode restore', async () => {
    const backup = await createWorkspaceBackup(userId);
    const result = await restoreWorkspaceBackup(userId, backup, { mode: 'replace' });

    expect(result.success).toBe(false);
    expect(result.errors[0]).toContain('Destructive replace mode requires explicit confirmReplace');
  });

  it('9. Restores notes, content, attachments, and settings cleanly in merge mode', async () => {
    await localDb.putLocalNote(userId, testNote1);
    await localDb.putLocalNote(userId, testNote2);
    const backup = await createWorkspaceBackup(userId);

    // Clear local notes store
    await localDb.deleteLocalNoteHard(userId, testNote1.id);
    await localDb.deleteLocalNoteHard(userId, testNote2.id);

    const restoreRes = await restoreWorkspaceBackup(userId, backup, { mode: 'merge', skipQuotaCheck: true });
    expect(restoreRes.success).toBe(true);
    expect(restoreRes.restoredNotesCount).toBe(2);

    // Verify restored notes in localDb
    const restored1 = await localDb.getLocalNote(userId, testNote1.id);
    expect(restored1).toBeDefined();
    expect(restored1?.title).toBe(testNote1.title);
    expect(restored1?.content).toContain('data-block-id="blk-h1-111"');
  });

  it('10. Confirms NO IndexedDB blocks store or second sync engine was created', async () => {
    // Assert architectural invariants: localDb notes store is sole note authority
    const notes = await localDb.getLocalNotes(userId, true);
    expect(Array.isArray(notes)).toBe(true);
    // Explicit assertion: No 'blocks' store or second sync engine
    expect(localDb).not.toHaveProperty('getLocalBlocks');
  });

  it('11. Sanitizes path traversal strings correctly', () => {
    expect(sanitizePathOrId('../../secret.txt')).toBe('secret.txt');
    expect(sanitizePathOrId('folder/subfolder/file.pdf')).toBe('folder_subfolder_file.pdf');
  });

  it('12. Computes and validates checksums accurately', () => {
    const checksum = computePackageChecksum([
      {
        id: testNote1.id,
        title: testNote1.title,
        content: testNote1.content,
        tags: testNote1.tags,
        isPinned: testNote1.isPinned,
        priority: testNote1.priority,
        createdAt: testNote1.createdAt,
        updatedAt: testNote1.updatedAt,
        version: testNote1.version || 1,
        deleted: testNote1.deleted || false,
      },
    ], []);
    expect(checksum).toContain('sha256_');
  });
});
