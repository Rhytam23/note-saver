import { openDB, type DBSchema, type IDBPDatabase } from 'idb';
import { v4 as uuidv4 } from 'uuid';
import type { Note, Tag, SyncStatus } from '../types';
import type { CalendarEventEntity } from '../types/calendar';

export type SyncEntity = 'note' | 'tag' | 'calendar_event' | 'workspace_settings';

export type SyncAction = 'upsert' | 'delete';

export interface SyncOp {
  opId: string;
  userId: string;
  entity: SyncEntity;
  entityId: string;
  action: SyncAction;
  baseVersion: number;
  attempts: number;
  nextRetryAt: number;
  createdAt: number;
}

interface StoredNote extends Note {
  userId: string;
  localKey: string;
}

interface StoredTag extends Tag {
  userId: string;
  localKey: string;
}

interface MetaRow {
  key: string;
  value: unknown;
}

export interface WorkspaceSettingsRow {
  workspaceId: string;
  userId: string;
  workspaceName: string;
  defaultBlockType: string;
  autoIndexSearch: boolean;
  defaultExportFormat: 'markdown' | 'html' | 'json' | 'pdf';
  calendarDefaultTimezone: string;
  version: number;
  updatedAt: number;
}

// CalendarEventEntity is stored directly; id is the keyPath
type StoredCalendarEvent = CalendarEventEntity;


interface NoteNirmanDB extends DBSchema {
  notes: {
    key: string;
    value: StoredNote;
    indexes: { 'by-user': string };
  };
  tags: {
    key: string;
    value: StoredTag;
    indexes: { 'by-user': string };
  };
  syncQueue: {
    key: string;
    value: SyncOp;
    indexes: { 'by-user': string };
  };
  meta: {
    key: string;
    value: MetaRow;
  };
  calendarEvents: {
    key: string;
    value: StoredCalendarEvent;
    indexes: { 'by-user': string; 'by-note': string };
  };
  workspaceSettings: {
    key: string; // workspaceId
    value: WorkspaceSettingsRow;
    indexes: { 'by-user': string };
  };
}

const DB_NAME = 'notenirman-offline';
const DB_VERSION = 2;


let dbPromise: Promise<IDBPDatabase<NoteNirmanDB>> | null = null;

function getDb() {
  if (!dbPromise) {
    dbPromise = openDB<NoteNirmanDB>(DB_NAME, DB_VERSION, {
      upgrade(db, oldVersion) {
        // Version 1: base stores
        if (oldVersion < 1) {
          const notes = db.createObjectStore('notes', { keyPath: 'localKey' });
          notes.createIndex('by-user', 'userId');

          const tags = db.createObjectStore('tags', { keyPath: 'localKey' });
          tags.createIndex('by-user', 'userId');

          const queue = db.createObjectStore('syncQueue', { keyPath: 'opId' });
          queue.createIndex('by-user', 'userId');

          db.createObjectStore('meta', { keyPath: 'key' });
        }
        // Version 2: calendar events + workspace settings (P5.6 / P5.9)
        if (oldVersion < 2) {
          const cal = db.createObjectStore('calendarEvents', { keyPath: 'id' });
          cal.createIndex('by-user', 'userId');
          cal.createIndex('by-note', 'noteId');

          const ws = db.createObjectStore('workspaceSettings', { keyPath: 'workspaceId' });
          ws.createIndex('by-user', 'userId');
        }
      },
    });
  }
  return dbPromise;
}


const noteKey = (userId: string, id: string) => `${userId}::${id}`;
const tagKey = (userId: string, name: string) => `${userId}::${name}`;

export async function getLocalNotes(userId: string, includeDeleted = false): Promise<Note[]> {
  const db = await getDb();
  const rows = await db.getAllFromIndex('notes', 'by-user', userId);
  const filtered = includeDeleted ? rows : rows.filter(r => !r.deleted);
  return filtered.map(stripLocalFields) as Note[];
}

export async function getLocalNote(userId: string, id: string): Promise<Note | undefined> {
  const db = await getDb();
  const row = await db.get('notes', noteKey(userId, id));
  return row ? (stripLocalFields(row) as Note) : undefined;
}

export async function putLocalNote(userId: string, note: Note): Promise<void> {
  const db = await getDb();
  await db.put('notes', { ...note, userId, localKey: noteKey(userId, note.id) });
}

export async function deleteLocalNoteHard(userId: string, id: string): Promise<void> {
  const db = await getDb();
  await db.delete('notes', noteKey(userId, id));
}

export async function getLocalTags(userId: string, includeDeleted = false): Promise<Tag[]> {
  const db = await getDb();
  const rows = await db.getAllFromIndex('tags', 'by-user', userId);
  const filtered = includeDeleted ? rows : rows.filter(r => !r.deleted);
  return filtered.map(stripLocalFields) as Tag[];
}

export async function putLocalTag(userId: string, tag: Tag): Promise<void> {
  const db = await getDb();
  await db.put('tags', { ...tag, userId, localKey: tagKey(userId, tag.name) });
}

export async function deleteLocalTagHard(userId: string, name: string): Promise<void> {
  const db = await getDb();
  await db.delete('tags', tagKey(userId, name));
}

/**
 * SECURITY: Clears all IndexedDB data scoped to a specific user.
 * MUST be called on logout/account-switch to prevent cross-user data leakage
 * on shared or multi-user devices (e.g., family PC, school computer).
 *
 * This removes only the specified user's rows — not other users' data.
 */
export async function clearUserLocalData(userId: string): Promise<void> {
  const db = await getDb();

  // Clear notes
  const notes = await db.getAllFromIndex('notes', 'by-user', userId);
  const noteTx = db.transaction('notes', 'readwrite');
  await Promise.all(notes.map(n => noteTx.store.delete(n.localKey)));
  await noteTx.done;

  // Clear tags
  const tags = await db.getAllFromIndex('tags', 'by-user', userId);
  const tagTx = db.transaction('tags', 'readwrite');
  await Promise.all(tags.map(t => tagTx.store.delete(t.localKey)));
  await tagTx.done;

  // Clear syncQueue
  const queue = await db.getAllFromIndex('syncQueue', 'by-user', userId);
  const queueTx = db.transaction('syncQueue', 'readwrite');
  await Promise.all(queue.map(op => queueTx.store.delete(op.opId)));
  await queueTx.done;

  // Clear calendarEvents
  const events = await db.getAllFromIndex('calendarEvents', 'by-user', userId);
  const calTx = db.transaction('calendarEvents', 'readwrite');
  await Promise.all(events.map(ev => calTx.store.delete(ev.id)));
  await calTx.done;

  // Clear workspaceSettings
  const settings = await db.getAllFromIndex('workspaceSettings', 'by-user', userId);
  const wsTx = db.transaction('workspaceSettings', 'readwrite');
  await Promise.all(settings.map(s => wsTx.store.delete(s.workspaceId)));
  await wsTx.done;

  // Clear userId-prefixed meta entries (e.g., lastSync, legacyMigrated)
  const allMeta = await db.getAll('meta');
  const userMetaKeys = allMeta.filter(m => String(m.key).startsWith(`${userId}:`)).map(m => m.key);
  if (userMetaKeys.length > 0) {
    const metaTx = db.transaction('meta', 'readwrite');
    await Promise.all(userMetaKeys.map(k => metaTx.store.delete(k)));
    await metaTx.done;
  }
}



function stripLocalFields<T extends { userId: string; localKey: string }>(row: T): Omit<T, 'userId' | 'localKey'> {
  const { userId: _userId, localKey: _localKey, ...rest } = row;
  return rest;
}

export async function enqueueOp(op: Omit<SyncOp, 'opId' | 'attempts' | 'nextRetryAt' | 'createdAt'>): Promise<SyncOp> {
  const db = await getDb();
  const full: SyncOp = {
    ...op,
    opId: `${op.entity}:${op.entityId}:${uuidv4()}`,
    attempts: 0,
    nextRetryAt: Date.now(),
    createdAt: Date.now(),
  };
  await db.put('syncQueue', full);
  return full;
}

export async function getQueue(userId: string): Promise<SyncOp[]> {
  const db = await getDb();
  const rows = await db.getAllFromIndex('syncQueue', 'by-user', userId);
  return rows.sort((a, b) => a.createdAt - b.createdAt);
}

export async function removeOp(opId: string): Promise<void> {
  const db = await getDb();
  await db.delete('syncQueue', opId);
}

export async function updateOp(opId: string, patch: Partial<SyncOp>): Promise<void> {
  const db = await getDb();
  const existing = await db.get('syncQueue', opId);
  if (!existing) return;
  await db.put('syncQueue', { ...existing, ...patch });
}

export async function dropSupersededOps(userId: string, entity: SyncEntity, entityId: string, keepOpId: string): Promise<void> {
  const db = await getDb();
  const rows = await db.getAllFromIndex('syncQueue', 'by-user', userId);
  const tx = db.transaction('syncQueue', 'readwrite');
  await Promise.all(
    rows
      .filter(r => r.entity === entity && r.entityId === entityId && r.opId !== keepOpId)
      .map(r => tx.store.delete(r.opId))
  );
  await tx.done;
}

export async function getMeta<T>(key: string): Promise<T | undefined> {
  const db = await getDb();
  const row = await db.get('meta', key);
  return row?.value as T | undefined;
}

export async function setMeta(key: string, value: unknown): Promise<void> {
  const db = await getDb();
  await db.put('meta', { key, value });
}

export function computeSyncStatus(hasPendingOps: boolean, hasConflict: boolean, currentStatus: SyncStatus | undefined): SyncStatus {
  if (hasConflict) return 'conflict';
  if (hasPendingOps) return currentStatus === 'syncing' ? 'syncing' : 'pending';
  return 'synced';
}

// ---------------------------------------------------------------------------
// Calendar Events CRUD (P5.6)
// ---------------------------------------------------------------------------

export async function getCalendarEventsForUser(
  userId: string,
  includeDeleted = false
): Promise<CalendarEventEntity[]> {
  const db = await getDb();
  const rows = await db.getAllFromIndex('calendarEvents', 'by-user', userId);
  return includeDeleted ? rows : rows.filter(r => !r.isDeleted);
}

export async function getCalendarEventsForNote(
  noteId: string
): Promise<CalendarEventEntity[]> {
  const db = await getDb();
  const rows = await db.getAllFromIndex('calendarEvents', 'by-note', noteId);
  return rows.filter(r => !r.isDeleted);
}

export async function getCalendarEvent(
  id: string
): Promise<CalendarEventEntity | undefined> {
  const db = await getDb();
  return db.get('calendarEvents', id);
}

export async function putCalendarEvent(
  event: CalendarEventEntity
): Promise<void> {
  const db = await getDb();
  await db.put('calendarEvents', event);
}

export async function deleteCalendarEventHard(id: string): Promise<void> {
  const db = await getDb();
  await db.delete('calendarEvents', id);
}

// ---------------------------------------------------------------------------
// Workspace Settings CRUD (P5.9)
// ---------------------------------------------------------------------------

export async function getWorkspaceSettings(
  workspaceId: string
): Promise<WorkspaceSettingsRow | undefined> {
  const db = await getDb();
  return db.get('workspaceSettings', workspaceId);
}

export async function putWorkspaceSettings(
  settings: WorkspaceSettingsRow
): Promise<void> {
  const db = await getDb();
  await db.put('workspaceSettings', settings);
}

export async function getWorkspaceSettingsForUser(
  userId: string
): Promise<WorkspaceSettingsRow[]> {
  const db = await getDb();
  return db.getAllFromIndex('workspaceSettings', 'by-user', userId);
}

// ---------------------------------------------------------------------------
// Pre-Migration Snapshot Dump & Restore Helpers (P5.5)
// ---------------------------------------------------------------------------

export async function getAllNotesRaw(): Promise<StoredNote[]> {
  const db = await getDb();
  return db.getAll('notes');
}

export async function getAllCalendarEventsRaw(): Promise<StoredCalendarEvent[]> {
  const db = await getDb();
  return db.getAll('calendarEvents');
}

export async function getAllWorkspaceSettingsRaw(): Promise<WorkspaceSettingsRow[]> {
  const db = await getDb();
  return db.getAll('workspaceSettings');
}

export async function getAllMetaRaw(): Promise<MetaRow[]> {
  const db = await getDb();
  return db.getAll('meta');
}

export async function restoreNotesRaw(notes: StoredNote[]): Promise<void> {
  const db = await getDb();
  const tx = db.transaction('notes', 'readwrite');
  await tx.store.clear();
  for (const n of notes) {
    await tx.store.put(n);
  }
  await tx.done;
}

export async function restoreCalendarEventsRaw(events: StoredCalendarEvent[]): Promise<void> {
  const db = await getDb();
  const tx = db.transaction('calendarEvents', 'readwrite');
  await tx.store.clear();
  for (const e of events) {
    await tx.store.put(e);
  }
  await tx.done;
}

export async function restoreWorkspaceSettingsRaw(settings: WorkspaceSettingsRow[]): Promise<void> {
  const db = await getDb();
  const tx = db.transaction('workspaceSettings', 'readwrite');
  await tx.store.clear();
  for (const s of settings) {
    await tx.store.put(s);
  }
  await tx.done;
}


