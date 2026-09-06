import { v4 as uuidv4 } from 'uuid';
import { supabase } from './supabase';
import * as localDb from './localDb';
import type { SyncOp } from './localDb';
import { checkConnectivityNow, subscribeConnectivity } from './connectivity';
import type { Note, Tag, SyncStatus } from '../types';

const changeListeners = new Map<string, Set<() => void>>();
const syncingUsers = new Set<string>();
const activeUsers = new Set<string>();

function notifyChange(userId: string) {
  changeListeners.get(userId)?.forEach(cb => cb());
}

export function subscribeLocalChanges(userId: string, cb: () => void): () => void {
  if (!changeListeners.has(userId)) changeListeners.set(userId, new Set());
  changeListeners.get(userId)!.add(cb);
  return () => changeListeners.get(userId)?.delete(cb);
}

const dbToNote = (row: any): Note => ({
  id: row.id,
  title: row.title,
  content: row.content,
  tags: row.tags || [],
  isPinned: row.is_pinned,
  priority: row.priority || 'none',
  createdAt: row.created_at,
  updatedAt: row.updated_at,
  coverImage: row.cover_image,
  version: row.version ?? 1,
  syncStatus: 'synced',
  deleted: row.deleted ?? false,
  deletedAt: row.deleted_at ?? null,
});

const noteToDbRow = (note: Note, userId: string, version: number) => ({
  id: note.id,
  user_id: userId,
  title: note.title,
  content: note.content,
  tags: note.tags,
  is_pinned: note.isPinned,
  priority: note.priority,
  cover_image: note.coverImage,
  created_at: note.createdAt,
  updated_at: new Date().toISOString(),
  version,
  deleted: false,
  deleted_at: null,
});

const dbToTag = (row: any): Tag => ({
  name: row.name,
  imageUrl: row.imageUrl ?? row.image_url,
  color: row.color,
  defaultPriority: row.defaultPriority ?? row.default_priority,
  version: row.version ?? 1,
  syncStatus: 'synced',
  deleted: row.deleted ?? false,
  deletedAt: row.deleted_at ?? null,
});

function isNetworkError(err: any): boolean {
  if (!err) return false;
  if (err.name === 'AbortError') return true;
  const msg = String(err.message || '');
  return /fetch|network|Failed to fetch|NetworkError/i.test(msg);
}

async function migrateLegacyLocalStorageIfNeeded(userId: string): Promise<void> {
  const already = await localDb.getMeta<boolean>(`${userId}:legacyMigrated`);
  if (already) return;

  try {
    const localNotesKey = `notenirman-notes-${userId}`;
    const localTagsKey = `notenirman-tags-${userId}`;
    const legacyNotes: Note[] = JSON.parse(window.localStorage.getItem(localNotesKey) || '[]');
    const legacyTags: Tag[] = JSON.parse(window.localStorage.getItem(localTagsKey) || '[]');

    for (const note of legacyNotes) {
      const enriched: Note = { ...note, version: 0, syncStatus: 'pending', deleted: false };
      await localDb.putLocalNote(userId, enriched);
      await localDb.enqueueOp({ userId, entity: 'note', entityId: note.id, action: 'upsert', baseVersion: 0 });
    }
    for (const tag of legacyTags) {
      const enriched: Tag = { ...tag, version: 0, syncStatus: 'pending', deleted: false };
      await localDb.putLocalTag(userId, enriched);
      await localDb.enqueueOp({ userId, entity: 'tag', entityId: tag.name, action: 'upsert', baseVersion: 0 });
    }
  } catch (err) {
    console.warn('Legacy localStorage migration skipped:', err);
  } finally {
    await localDb.setMeta(`${userId}:legacyMigrated`, true);
  }
}

export async function loadLocal(userId: string): Promise<{ notes: Note[]; tags: Tag[] }> {
  const [notes, tags] = await Promise.all([localDb.getLocalNotes(userId), localDb.getLocalTags(userId)]);
  return { notes, tags };
}

export async function bootstrap(userId: string): Promise<void> {
  activeUsers.add(userId);
  await migrateLegacyLocalStorageIfNeeded(userId);
  const lastSync = await localDb.getMeta<string>(`${userId}:lastSync`);
  await pullRemoteChanges(userId, lastSync ?? null).catch(err => console.warn('Initial pull failed (will retry):', err));
  await processSyncQueue(userId);
}

export function deactivateUser(userId: string): void {
  activeUsers.delete(userId);
}

export async function pullRemoteChanges(userId: string, sinceIso: string | null): Promise<void> {
  let noteQuery = supabase.from('notes').select('*').eq('user_id', userId).order('updated_at', { ascending: true });
  if (sinceIso) noteQuery = noteQuery.gt('updated_at', sinceIso);
  const { data: remoteNotes, error: notesErr } = await noteQuery;
  if (notesErr) throw notesErr;

  const queue = await localDb.getQueue(userId);
  const pendingByEntity = new Map(queue.map(op => [`${op.entity}:${op.entityId}`, op]));

  let latestSeen = sinceIso;
  for (const row of remoteNotes || []) {
    const remote = dbToNote(row);
    const pendingOp = pendingByEntity.get(`note:${remote.id}`);
    const local = await localDb.getLocalNote(userId, remote.id);

    if (!pendingOp) {
      await localDb.putLocalNote(userId, remote);
    } else if (local && (remote.version ?? 0) > pendingOp.baseVersion) {
      await localDb.putLocalNote(userId, { ...local, syncStatus: 'conflict', conflictServerData: remote });
    }

    if (!latestSeen || row.updated_at > latestSeen) latestSeen = row.updated_at;
  }

  const { data: remoteTags, error: tagsErr } = await supabase.from('tags').select('*').eq('user_id', userId);
  if (!tagsErr) {
    for (const row of remoteTags || []) {
      const remote = dbToTag(row);
      const pendingOp = pendingByEntity.get(`tag:${remote.name}`);
      if (!pendingOp) {
        await localDb.putLocalTag(userId, remote);
      }
    }
  }

  if (latestSeen) await localDb.setMeta(`${userId}:lastSync`, latestSeen);
  notifyChange(userId);
}

export async function writeNote(userId: string, note: Note, action: 'upsert' | 'delete'): Promise<void> {
  const existing = await localDb.getLocalNote(userId, note.id);
  const baseVersion = existing?.version ?? 0;

  if (action === 'delete') {
    await localDb.putLocalNote(userId, { ...note, deleted: true, deletedAt: new Date().toISOString(), syncStatus: 'pending' });
  } else {
    await localDb.putLocalNote(userId, { ...note, version: baseVersion, syncStatus: 'pending', conflictServerData: null });
  }

  const op = await localDb.enqueueOp({ userId, entity: 'note', entityId: note.id, action, baseVersion });
  await localDb.dropSupersededOps(userId, 'note', note.id, op.opId);
  notifyChange(userId);
  void processSyncQueue(userId);
}

export async function writeTag(userId: string, tag: Tag, action: 'upsert' | 'delete'): Promise<void> {
  const existing = (await localDb.getLocalTags(userId, true)).find(t => t.name === tag.name);
  const baseVersion = existing?.version ?? 0;

  if (action === 'delete') {
    await localDb.putLocalTag(userId, { ...tag, deleted: true, deletedAt: new Date().toISOString(), syncStatus: 'pending' });
  } else {
    await localDb.putLocalTag(userId, { ...tag, version: baseVersion, syncStatus: 'pending' });
  }

  const op = await localDb.enqueueOp({ userId, entity: 'tag', entityId: tag.name, action, baseVersion });
  await localDb.dropSupersededOps(userId, 'tag', tag.name, op.opId);
  notifyChange(userId);
  void processSyncQueue(userId);
}

function nextBackoff(attempts: number): number {
  const base = Math.min(60000, 1000 * 2 ** attempts);
  return Date.now() + base + Math.floor(Math.random() * 500);
}

export async function processSyncQueue(userId: string): Promise<void> {
  if (syncingUsers.has(userId)) return;
  syncingUsers.add(userId);
  try {
    const status = await checkConnectivityNow();
    if (status !== 'online') return;

    const queue = await localDb.getQueue(userId);
    const now = Date.now();

    for (const op of queue) {
      if (op.nextRetryAt > now) continue;
      try {
        await processOp(userId, op);
      } catch (err) {
        if (isNetworkError(err)) {
          break;
        }
        await localDb.updateOp(op.opId, { attempts: op.attempts + 1, nextRetryAt: nextBackoff(op.attempts + 1) });
      }
    }
  } finally {
    syncingUsers.delete(userId);
    notifyChange(userId);
  }
}

async function processOp(userId: string, op: SyncOp): Promise<void> {
  if (op.entity === 'note') {
    await processNoteOp(userId, op);
  } else if (op.entity === 'calendar_event') {
    await processCalendarEventOp(userId, op);
  } else {
    await processTagOp(userId, op);
  }
}

async function processNoteOp(userId: string, op: SyncOp): Promise<void> {
  const local = await localDb.getLocalNote(userId, op.entityId);
  if (!local) {
    await localDb.removeOp(op.opId);
    return;
  }

  const { data: serverRow, error: fetchErr } = await supabase
    .from('notes')
    .select('id, version, updated_at')
    .eq('id', op.entityId)
    .maybeSingle();
  if (fetchErr) throw fetchErr;

  if (op.action === 'delete') {
    if (serverRow && (serverRow.version ?? 0) > op.baseVersion) {
      const { data: fullServerRow } = await supabase.from('notes').select('*').eq('id', op.entityId).maybeSingle();
      if (fullServerRow) {
        await localDb.putLocalNote(userId, dbToNote(fullServerRow));
      }
      await localDb.removeOp(op.opId);
      notifyChange(userId);
      return;
    }
    if (serverRow) {
      const { error } = await supabase
        .from('notes')
        .update({ deleted: true, deleted_at: new Date().toISOString(), updated_at: new Date().toISOString() })
        .eq('id', op.entityId);
      if (error) throw error;
    }
    await localDb.deleteLocalNoteHard(userId, op.entityId);
    await localDb.removeOp(op.opId);
    return;
  }

  if (serverRow && (serverRow.version ?? 0) > op.baseVersion) {
    const { data: fullServerRow } = await supabase.from('notes').select('*').eq('id', op.entityId).maybeSingle();
    await localDb.putLocalNote(userId, {
      ...local,
      syncStatus: 'conflict',
      conflictServerData: fullServerRow ? dbToNote(fullServerRow) : null,
    });
    await localDb.removeOp(op.opId);
    return;
  }

  const optimisticVersion = (serverRow?.version ?? 0) + 1;
  const row = noteToDbRow(local, userId, optimisticVersion);
  const { data: written, error: upsertErr } = await supabase.from('notes').upsert(row).select('version, updated_at').maybeSingle();
  if (upsertErr) throw upsertErr;

  await localDb.putLocalNote(userId, {
    ...local,
    version: written?.version ?? optimisticVersion,
    updatedAt: written?.updated_at ?? local.updatedAt,
    syncStatus: 'synced',
    conflictServerData: null,
  });
  await localDb.removeOp(op.opId);
}

async function processTagOp(userId: string, op: SyncOp): Promise<void> {
  const localTags = await localDb.getLocalTags(userId, true);
  const local = localTags.find(t => t.name === op.entityId);
  if (!local) {
    await localDb.removeOp(op.opId);
    return;
  }

  if (op.action === 'delete') {
    const { error } = await supabase.from('tags').delete().eq('name', op.entityId).eq('user_id', userId);
    if (error) throw error;
    await localDb.deleteLocalTagHard(userId, op.entityId);
    await localDb.removeOp(op.opId);
    return;
  }

  const { data: written, error } = await supabase
    .from('tags')
    .upsert({ ...stripSyncMeta(local), user_id: userId })
    .select('version')
    .maybeSingle();
  if (error) throw error;

  await localDb.putLocalTag(userId, { ...local, version: written?.version ?? local.version, syncStatus: 'synced' });
  await localDb.removeOp(op.opId);
}

function stripSyncMeta<T extends { version?: number; syncStatus?: SyncStatus; deleted?: boolean; deletedAt?: string | null; conflictServerData?: any }>(obj: T) {
  const { version, syncStatus, deleted, deletedAt, conflictServerData, ...rest } = obj;
  return rest;
}

export async function resolveNoteConflict(userId: string, noteId: string, choice: 'local' | 'server' | 'both'): Promise<void> {
  const local = await localDb.getLocalNote(userId, noteId);
  if (!local || !local.conflictServerData) return;
  const server = local.conflictServerData as Note;

  if (choice === 'server') {
    await localDb.putLocalNote(userId, { ...server, syncStatus: 'synced', conflictServerData: null });
  } else if (choice === 'local') {
    const resolved: Note = { ...local, version: server.version ?? local.version, syncStatus: 'pending', conflictServerData: null };
    await localDb.putLocalNote(userId, resolved);
    const op = await localDb.enqueueOp({ userId, entity: 'note', entityId: noteId, action: 'upsert', baseVersion: server.version ?? 0 });
    await localDb.dropSupersededOps(userId, 'note', noteId, op.opId);
  } else {
    const forked: Note = { ...local, id: uuidv4(), version: 0, syncStatus: 'pending', conflictServerData: null, createdAt: new Date().toISOString() };
    await localDb.putLocalNote(userId, { ...server, syncStatus: 'synced', conflictServerData: null });
    await localDb.putLocalNote(userId, forked);
    const op = await localDb.enqueueOp({ userId, entity: 'note', entityId: forked.id, action: 'upsert', baseVersion: 0 });
    await localDb.dropSupersededOps(userId, 'note', forked.id, op.opId);
  }

  notifyChange(userId);
  void processSyncQueue(userId);
}

let watcherStarted = false;
export function startAutoSync(): void {
  if (watcherStarted) return;
  watcherStarted = true;
  subscribeConnectivity(status => {
    if (status === 'online') {
      activeUsers.forEach(userId => void processSyncQueue(userId));
    }
  });
  setInterval(() => {
    activeUsers.forEach(userId => void processSyncQueue(userId));
  }, 20000);
}

// ---------------------------------------------------------------------------
// Calendar Event Sync Handler (P5.6)
// Extends syncEngine.ts without introducing a second sync engine or queue.
// Existing Note and Tag synchronization remains 100% unchanged.
// ---------------------------------------------------------------------------

async function processCalendarEventOp(userId: string, op: SyncOp): Promise<void> {
  const local = await localDb.getCalendarEvent(op.entityId);
  if (!local) {
    await localDb.removeOp(op.opId);
    return;
  }

  if (op.action === 'delete') {
    // Propagate soft delete to Supabase, then hard-delete locally
    const { error } = await supabase
      .from('calendar_events')
      .update({
        is_deleted: true,
        deleted_at: local.deletedAt ?? Date.now(),
        updated_at: Date.now(),
      })
      .eq('id', op.entityId);
    if (error) throw error;
    await localDb.deleteCalendarEventHard(op.entityId);
    await localDb.removeOp(op.opId);
    return;
  }

  // LWW: fetch remote version
  const { data: serverRow, error: fetchErr } = await supabase
    .from('calendar_events')
    .select('id, version, updated_at')
    .eq('id', op.entityId)
    .maybeSingle();
  if (fetchErr) throw fetchErr;

  const localVersion = local.version ?? 0;
  const serverVersion = (serverRow as any)?.version ?? 0;

  if (serverVersion > op.baseVersion && serverVersion > localVersion) {
    // Server is newer — pull full remote record, apply locally (LWW)
    const { data: fullRow } = await supabase
      .from('calendar_events')
      .select('*')
      .eq('id', op.entityId)
      .maybeSingle();
    if (fullRow) {
      await localDb.putCalendarEvent(dbToCalendarEvent(fullRow));
    }
    await localDb.removeOp(op.opId);
    return;
  }

  // Local is newer — push to Supabase
  const { error: upsertErr } = await supabase
    .from('calendar_events')
    .upsert(calendarEventToDbRow(local, userId))
    .select('version')
    .maybeSingle();
  if (upsertErr) throw upsertErr;

  // Update local version after successful push
  await localDb.putCalendarEvent({ ...local, version: localVersion + 1 });
  await localDb.removeOp(op.opId);
  notifyChange(userId);
}

// ---------------------------------------------------------------------------
// Calendar Event row converters (snake_case ↔ camelCase)
// ---------------------------------------------------------------------------

function dbToCalendarEvent(row: any): import('../types/calendar').CalendarEventEntity {
  return {
    id: row.id,
    userId: row.user_id,
    noteId: row.note_id,
    blockId: row.block_id ?? null,
    title: row.title,
    description: row.description ?? null,
    startAt: row.start_at,
    endAt: row.end_at ?? null,
    isAllDay: row.is_all_day ?? false,
    timezone: row.timezone ?? 'UTC',
    recurrenceRule: row.recurrence_rule ?? null,
    reminderMinutesBefore: row.reminder_minutes_before ?? null,
    status: row.status ?? 'scheduled',
    version: row.version ?? 1,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    isDeleted: row.is_deleted ?? false,
    deletedAt: row.deleted_at ?? null,
  };
}

function calendarEventToDbRow(event: import('../types/calendar').CalendarEventEntity, userId: string): Record<string, unknown> {
  return {
    id: event.id,
    user_id: userId,
    note_id: event.noteId,
    block_id: event.blockId ?? null,
    title: event.title,
    description: event.description ?? null,
    start_at: event.startAt,
    end_at: event.endAt ?? null,
    is_all_day: event.isAllDay,
    timezone: event.timezone,
    recurrence_rule: event.recurrenceRule ?? null,
    reminder_minutes_before: event.reminderMinutesBefore ?? null,
    status: event.status,
    version: event.version,
    created_at: event.createdAt,
    updated_at: event.updatedAt,
    is_deleted: event.isDeleted,
    deleted_at: event.deletedAt ?? null,
  };
}
