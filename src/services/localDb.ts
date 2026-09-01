import { openDB, type DBSchema, type IDBPDatabase } from 'idb';
import { v4 as uuidv4 } from 'uuid';
import type { Note, Tag, SyncStatus } from '../types';

export type SyncEntity = 'note' | 'tag';
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
}

const DB_NAME = 'notenirman-offline';
const DB_VERSION = 1;

let dbPromise: Promise<IDBPDatabase<NoteNirmanDB>> | null = null;

function getDb() {
  if (!dbPromise) {
    dbPromise = openDB<NoteNirmanDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        const notes = db.createObjectStore('notes', { keyPath: 'localKey' });
        notes.createIndex('by-user', 'userId');

        const tags = db.createObjectStore('tags', { keyPath: 'localKey' });
        tags.createIndex('by-user', 'userId');

        const queue = db.createObjectStore('syncQueue', { keyPath: 'opId' });
        queue.createIndex('by-user', 'userId');

        db.createObjectStore('meta', { keyPath: 'key' });
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

function stripLocalFields<T extends { userId: string; localKey: string }>(row: T): Omit<T, 'userId' | 'localKey'> {
  const { userId, localKey, ...rest } = row;
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

