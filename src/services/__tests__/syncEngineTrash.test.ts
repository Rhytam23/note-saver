/**
 * Trash: deleting keeps the note restorable, restoring syncs without a false
 * conflict, and old trash is purged after the retention period.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Note } from '../../types';

const state = vi.hoisted(() => ({
  notes: new Map<string, any>(),
  queue: [] as any[],
  server: new Map<string, any>(),
  seq: 0,
}));

vi.mock('../connectivity', () => ({
  checkConnectivityNow: async () => 'online',
  subscribeConnectivity: () => () => undefined,
}));

vi.mock('../localDb', () => ({
  getLocalNote: async (_u: string, id: string) => state.notes.get(id),
  putLocalNote: async (_u: string, note: any) => { state.notes.set(note.id, { ...note }); },
  deleteLocalNoteHard: async (_u: string, id: string) => { state.notes.delete(id); },
  getLocalNotes: async (_u: string, includeDeleted = false) =>
    [...state.notes.values()].filter(n => includeDeleted || !n.deleted),
  getQueue: async () => [...state.queue].sort((a, b) => a.createdAt - b.createdAt),
  enqueueOp: async (op: any) => {
    const full = { ...op, opId: `op-${++state.seq}`, attempts: 0, nextRetryAt: 0, createdAt: state.seq };
    state.queue.push(full);
    return full;
  },
  removeOp: async (opId: string) => { state.queue = state.queue.filter(o => o.opId !== opId); },
  updateOp: async () => undefined,
  dropSupersededOps: async (_u: string, entity: string, entityId: string, keep: string) => {
    state.queue = state.queue.filter(o => !(o.entity === entity && o.entityId === entityId && o.opId !== keep));
  },
  getMeta: async () => undefined,
  setMeta: async () => undefined,
  getLocalTags: async () => [],
}));

vi.mock('../supabase', () => ({
  supabase: {
    from: () => {
      let id: string | undefined;
      let patch: any = null;
      const chain: any = {
        select: () => chain,
        eq: (_c: string, v: string) => { id = v; return chain; },
        update: (p: any) => { patch = p; return chain; },
        maybeSingle: async () => {
          if (patch && id) {
            const prev = state.server.get(id);
            // The database trigger bumps the version on every update.
            const next = { ...prev, ...patch, version: (prev?.version ?? 0) + 1 };
            state.server.set(id, next);
            return { data: { version: next.version }, error: null };
          }
          return { data: id ? state.server.get(id) ?? null : null, error: null };
        },
        upsert: (row: any) => ({
          select: () => ({
            maybeSingle: async () => {
              const prev = state.server.get(row.id);
              const stored = { ...row, version: (prev?.version ?? 0) + 1 };
              state.server.set(row.id, stored);
              return { data: { version: stored.version, updated_at: row.updated_at }, error: null };
            },
          }),
        }),
      };
      return chain;
    },
  },
}));

import { writeNote, processSyncQueue, getTrash, restoreNote, purgeNote, purgeExpiredTrash, TRASH_RETENTION_DAYS } from '../syncEngine';

const USER = 'user-1';
const note = (over: Partial<Note> = {}): Note => ({
  id: 'note-1', title: 'Physics', content: '<p>Newton</p>', tags: [], isPinned: false, priority: 'none',
  createdAt: '2026-09-21T00:00:00.000Z', updatedAt: '2026-09-21T00:00:00.000Z', version: 0, syncStatus: 'pending',
  ...over,
} as Note);

const settle = async () => {
  await vi.waitFor(async () => {
    await processSyncQueue(USER);
    expect(state.queue.length).toBe(0);
  });
};

describe('trash', () => {
  beforeEach(() => {
    state.notes.clear();
    state.queue = [];
    state.server.clear();
    state.seq = 0;
  });

  it('keeps a deleted note in Trash after it syncs', async () => {
    await writeNote(USER, note(), 'upsert');
    await settle();
    await writeNote(USER, state.notes.get('note-1'), 'delete');
    await settle();

    expect(state.server.get('note-1').deleted).toBe(true);
    const trash = await getTrash(USER);
    expect(trash.map(n => n.id)).toEqual(['note-1']);
    expect(trash[0].syncStatus).toBe('synced');
    // Local version matches what the server assigned, so a later restore is not a conflict.
    expect(trash[0].version).toBe(state.server.get('note-1').version);
  });

  it('restores a deleted note to the server without a conflict', async () => {
    await writeNote(USER, note(), 'upsert');
    await settle();
    await writeNote(USER, state.notes.get('note-1'), 'delete');
    await settle();

    await restoreNote(USER, 'note-1');
    await settle();

    const local = state.notes.get('note-1');
    expect(local.deleted).toBe(false);
    expect(local.syncStatus).toBe('synced');
    expect(state.server.get('note-1').deleted).toBe(false);
    expect(await getTrash(USER)).toHaveLength(0);
  });

  it('deletes forever on this device', async () => {
    state.notes.set('note-1', { ...note(), deleted: true, deletedAt: new Date().toISOString() });
    await purgeNote(USER, 'note-1');
    expect(state.notes.has('note-1')).toBe(false);
  });

  it('purges only trash older than the retention period', async () => {
    const now = new Date('2026-10-30T00:00:00.000Z').getTime();
    const old = new Date(now - (TRASH_RETENTION_DAYS + 1) * 86400000).toISOString();
    const recent = new Date(now - 2 * 86400000).toISOString();
    state.notes.set('old', { ...note({ id: 'old' }), deleted: true, deletedAt: old });
    state.notes.set('recent', { ...note({ id: 'recent' }), deleted: true, deletedAt: recent });
    state.notes.set('live', { ...note({ id: 'live' }), deleted: false });

    expect(await purgeExpiredTrash(USER, now)).toBe(1);
    expect([...state.notes.keys()].sort()).toEqual(['live', 'recent']);
  });
});
