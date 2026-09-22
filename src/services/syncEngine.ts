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

/** For code that writes to local storage directly (e.g. backup restore) and needs the UI to refresh. */
export function announceLocalChange(userId: string): void {
  notifyChange(userId);
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
  await purgeExpiredTrash(userId).catch(err => console.warn('Trash cleanup skipped:', err));
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

  let changed = false;
  let latestSeen = sinceIso;
  for (const row of remoteNotes || []) {
    const remote = dbToNote(row);
    // Re-read the queue per row: the user may have edited this note since the pull started.
    const queue = await localDb.getQueue(userId);
    const pendingOp = queue.find(op => op.entity === 'note' && op.entityId === remote.id);
    const local = await localDb.getLocalNote(userId, remote.id);
    const localIsDirty = local?.syncStatus === 'pending' || local?.syncStatus === 'conflict';

    if (!pendingOp && !localIsDirty) {
      const alreadyCurrent = local && (local.version ?? 0) === (remote.version ?? 0) && local.updatedAt === remote.updatedAt && !!local.deleted === !!remote.deleted;
      if (!alreadyCurrent) {
        await localDb.putLocalNote(userId, remote);
        changed = true;
      }
    } else if (local && local.syncStatus !== 'conflict' && (remote.version ?? 0) > Math.max(pendingOp?.baseVersion ?? 0, local.version ?? 0)) {
      await localDb.putLocalNote(userId, { ...local, syncStatus: 'conflict', conflictServerData: remote });
      changed = true;
    }

    if (!latestSeen || row.updated_at > latestSeen) latestSeen = row.updated_at;
  }

  const { data: remoteTags, error: tagsErr } = await supabase.from('tags').select('*').eq('user_id', userId);
  if (!tagsErr) {
    const queue = await localDb.getQueue(userId);
    const pendingTags = new Set(queue.filter(op => op.entity === 'tag').map(op => op.entityId));
    const localTags = await localDb.getLocalTags(userId, true);
    for (const row of remoteTags || []) {
      const remote = dbToTag(row);
      if (pendingTags.has(remote.name)) continue;
      const local = localTags.find(t => t.name === remote.name);
      const alreadyCurrent = local && sameTag(local, remote);
      if (!alreadyCurrent) {
        await localDb.putLocalTag(userId, remote);
        changed = true;
      }
    }
  }

  if (latestSeen) await localDb.setMeta(`${userId}:lastSync`, latestSeen);
  if (changed) notifyChange(userId);
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

export const TRASH_RETENTION_DAYS = 30;

/** Notes the user deleted, newest deletion first. */
export async function getTrash(userId: string): Promise<Note[]> {
  const all = await localDb.getLocalNotes(userId, true);
  return all
    .filter(n => n.deleted)
    .sort((a, b) => String(b.deletedAt ?? '').localeCompare(String(a.deletedAt ?? '')));
}

/** Bring a deleted note back. It syncs like any other edit. */
export async function restoreNote(userId: string, id: string): Promise<void> {
  const note = await localDb.getLocalNote(userId, id);
  if (!note || !note.deleted) return;
  await writeNote(userId, { ...note, deleted: false, deletedAt: null }, 'upsert');
}

/** Remove a note from Trash for good on this device. */
export async function purgeNote(userId: string, id: string): Promise<void> {
  await localDb.deleteLocalNoteHard(userId, id);
  notifyChange(userId);
}

/** Drop trash older than the retention period. Returns how many notes were removed. */
export async function purgeExpiredTrash(userId: string, now: number = Date.now()): Promise<number> {
  const cutoff = now - TRASH_RETENTION_DAYS * 24 * 60 * 60 * 1000;
  const trash = await getTrash(userId);
  const expired = trash.filter(n => n.deletedAt && new Date(n.deletedAt).getTime() < cutoff);
  for (const note of expired) {
    await localDb.deleteLocalNoteHard(userId, note.id);
  }
  return expired.length;
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

function sameTag(a: Tag, b: Tag): boolean {
  return (
    a.name === b.name &&
    (a.color ?? null) === (b.color ?? null) &&
    (a.imageUrl ?? null) === (b.imageUrl ?? null) &&
    (a.defaultPriority ?? null) === (b.defaultPriority ?? null) &&
    (a.version ?? 0) === (b.version ?? 0) &&
    !!a.deleted === !!b.deleted
  );
}

function nextBackoff(attempts: number): number {
  const base = Math.min(60000, 1000 * 2 ** attempts);
  return Date.now() + base + Math.floor(Math.random() * 500);
}

export async function processSyncQueue(userId: string): Promise<void> {
  if (syncingUsers.has(userId)) return;
  syncingUsers.add(userId);
  let attemptedAny = false;
  try {
    const status = await checkConnectivityNow();
    if (status !== 'online') return;

    const queue = await localDb.getQueue(userId);
    const now = Date.now();

    for (const op of queue) {
      if (op.nextRetryAt > now) continue;
      attemptedAny = true;
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
    // A refresh hands the open editor a new note object, so only announce real work.
    if (attemptedAny) notifyChange(userId);
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

function sameNoteContent(a: Note, b: Note): boolean {
  return (
    a.title === b.title &&
    a.content === b.content &&
    a.isPinned === b.isPinned &&
    a.priority === b.priority &&
    a.coverImage === b.coverImage &&
    JSON.stringify(a.tags ?? []) === JSON.stringify(b.tags ?? [])
  );
}

async function processNoteOp(userId: string, op: SyncOp): Promise<void> {
  const local = await localDb.getLocalNote(userId, op.entityId);
  if (!local) {
    await localDb.removeOp(op.opId);
    return;
  }

  // local.version is the last server version this device has seen. An op queued
  // before an earlier save of the same note landed carries a stale baseVersion,
  // which would flag the user's own earlier save as a conflict.
  const baseVersion = Math.max(op.baseVersion, local.version ?? 0);

  const { data: serverRow, error: fetchErr } = await supabase
    .from('notes')
    .select('id, version, updated_at')
    .eq('id', op.entityId)
    .maybeSingle();
  if (fetchErr) throw fetchErr;

  if (op.action === 'delete') {
    if (serverRow && (serverRow.version ?? 0) > baseVersion) {
      const { data: fullServerRow } = await supabase.from('notes').select('*').eq('id', op.entityId).maybeSingle();
      if (fullServerRow) {
        await localDb.putLocalNote(userId, dbToNote(fullServerRow));
      }
      await localDb.removeOp(op.opId);
      notifyChange(userId);
      return;
    }
    let serverVersion = local.version ?? 0;
    if (serverRow) {
      const { data: updated, error } = await supabase
        .from('notes')
        .update({ deleted: true, deleted_at: new Date().toISOString(), updated_at: new Date().toISOString() })
        .eq('id', op.entityId)
        .select('version')
        .maybeSingle();
      if (error) throw error;
      serverVersion = updated?.version ?? serverVersion + 1;
    }
    // Keep the deleted note on this device so it can be restored from Trash.
    await localDb.putLocalNote(userId, { ...local, version: serverVersion, deleted: true, syncStatus: 'synced', conflictServerData: null });
    await localDb.removeOp(op.opId);
    return;
  }

  if (serverRow && (serverRow.version ?? 0) > baseVersion) {
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

  const newVersion = written?.version ?? optimisticVersion;
  const latest = await localDb.getLocalNote(userId, op.entityId);
  const queue = await localDb.getQueue(userId);
  const followUps = queue.filter(o => o.entity === 'note' && o.entityId === op.entityId && o.opId !== op.opId);

  if (latest && (followUps.length > 0 || !sameNoteContent(latest, local))) {
    // The user kept typing while this save was in flight. Keep their newer
    // content, only advance the version, and rebase the follow-up save.
    await localDb.putLocalNote(userId, { ...latest, version: newVersion, syncStatus: 'pending' });
    for (const followUp of followUps) {
      await localDb.updateOp(followUp.opId, { baseVersion: newVersion });
    }
    if (followUps.length === 0) {
      const followUp = await localDb.enqueueOp({ userId, entity: 'note', entityId: op.entityId, action: 'upsert', baseVersion: newVersion });
      await localDb.dropSupersededOps(userId, 'note', op.entityId, followUp.opId);
    }
  } else {
    await localDb.putLocalNote(userId, {
      ...local,
      version: newVersion,
      updatedAt: written?.updated_at ?? local.updatedAt,
      syncStatus: 'synced',
      conflictServerData: null,
    });
  }
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
  const { version: _version, syncStatus: _syncStatus, deleted: _deleted, deletedAt: _deletedAt, conflictServerData: _conflictServerData, ...rest } = obj;
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

const pullingUsers = new Set<string>();

/** Fetch changes made on other devices. Safe to call often; overlapping calls are dropped. */
export async function pullNow(userId: string): Promise<void> {
  if (pullingUsers.has(userId)) return;
  pullingUsers.add(userId);
  try {
    if ((await checkConnectivityNow()) !== 'online') return;
    const lastSync = await localDb.getMeta<string>(`${userId}:lastSync`);
    await pullRemoteChanges(userId, lastSync ?? null);
  } catch (err) {
    console.warn('Background pull failed (will retry):', err);
  } finally {
    pullingUsers.delete(userId);
  }
}

/** Push local changes first so they are never overwritten, then pull what changed elsewhere. */
async function syncUser(userId: string): Promise<void> {
  await processSyncQueue(userId);
  await pullNow(userId);
}

const BACKGROUND_SYNC_INTERVAL_MS = 30000;

let watcherStarted = false;
export function startAutoSync(): void {
  if (watcherStarted) return;
  watcherStarted = true;
  subscribeConnectivity(status => {
    if (status === 'online') {
      activeUsers.forEach(userId => void syncUser(userId));
    }
  });
  setInterval(() => {
    activeUsers.forEach(userId => void syncUser(userId));
  }, BACKGROUND_SYNC_INTERVAL_MS);

  if (typeof document !== 'undefined') {
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        // Back in the app: pick up what changed on the other device.
        activeUsers.forEach(userId => void syncUser(userId));
      } else {
        // Leaving the app: get unsaved work to the server while we still can.
        activeUsers.forEach(userId => void processSyncQueue(userId));
      }
    });
  }
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
