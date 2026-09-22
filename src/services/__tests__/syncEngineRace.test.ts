/**
 * Regression: typing while a previous save is still in flight must neither
 * lose the newer text nor flag the user's own earlier save as a conflict.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Note } from '../../types';

const state = vi.hoisted(() => ({
  notes: new Map<string, any>(),
  queue: [] as any[],
  server: new Map<string, any>(),
  onUpsert: null as null | (() => Promise<void>),
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
  getLocalNotes: async () => [...state.notes.values()],
  getQueue: async () => [...state.queue].sort((a, b) => a.createdAt - b.createdAt),
  enqueueOp: async (op: any) => {
    const full = { ...op, opId: `op-${++state.seq}`, attempts: 0, nextRetryAt: 0, createdAt: state.seq };
    state.queue.push(full);
    return full;
  },
  removeOp: async (opId: string) => { state.queue = state.queue.filter(o => o.opId !== opId); },
  updateOp: async (opId: string, patch: any) => {
    state.queue = state.queue.map(o => (o.opId === opId ? { ...o, ...patch } : o));
  },
  dropSupersededOps: async (_u: string, entity: string, entityId: string, keep: string) => {
    state.queue = state.queue.filter(o => !(o.entity === entity && o.entityId === entityId && o.opId !== keep));
  },
  getMeta: async () => undefined,
  setMeta: async () => undefined,
  getLocalTags: async () => [],
}));

vi.mock('../supabase', () => {
  const table = () => {
    let id: string | undefined;
    const chain: any = {
      select: () => chain,
      eq: (_col: string, value: string) => { id = value; return chain; },
      maybeSingle: async () => ({ data: id ? state.server.get(id) ?? null : null, error: null }),
      upsert: (row: any) => ({
        select: () => ({
          maybeSingle: async () => {
            if (state.onUpsert) {
              const hook = state.onUpsert;
              state.onUpsert = null;
              await hook();
            }
            const prev = state.server.get(row.id);
            const stored = { ...row, version: (prev?.version ?? 0) + 1 };
            state.server.set(row.id, stored);
            return { data: { version: stored.version, updated_at: row.updated_at }, error: null };
          },
        }),
      }),
    };
    return chain;
  };
  return { supabase: { from: table } };
});

import { writeNote, processSyncQueue } from '../syncEngine';

const USER = 'user-1';
const makeNote = (content: string): Note => ({
  id: 'note-1',
  title: 'First note',
  content,
  tags: [],
  isPinned: false,
  priority: 'none',
  createdAt: '2026-09-21T00:00:00.000Z',
  updatedAt: '2026-09-21T00:00:00.000Z',
  version: 0,
  syncStatus: 'pending',
} as Note);

describe('sync engine: edits made while a save is in flight', () => {
  beforeEach(() => {
    state.notes.clear();
    state.queue = [];
    state.server.clear();
    state.onUpsert = null;
    state.seq = 0;
  });

  it('keeps the newer text and syncs it without a false conflict', async () => {
    await writeNote(USER, makeNote('draft one'), 'upsert');
    await vi.waitFor(() => expect(state.server.get('note-1')?.content).toBe('draft one'));
    // Let the fire-and-forget sync from writeNote settle before starting the raced write.
    await vi.waitFor(() => expect(state.queue.length).toBe(0));

    // Second save starts; while its upsert is in flight the user types again.
    state.notes.set('note-1', { ...state.notes.get('note-1'), content: 'draft two', syncStatus: 'pending' });
    const first = await (async () => {
      const { enqueueOp } = await import('../localDb');
      return enqueueOp({ userId: USER, entity: 'note', entityId: 'note-1', action: 'upsert', baseVersion: 1 });
    })();
    expect(first.entityId).toBe('note-1');

    state.onUpsert = async () => {
      await writeNote(USER, { ...state.notes.get('note-1'), content: 'draft three' } as Note, 'upsert');
    };
    await processSyncQueue(USER);
    await processSyncQueue(USER);

    const local = state.notes.get('note-1');
    expect(local.content).toBe('draft three');
    expect(local.syncStatus).toBe('synced');
    expect(state.server.get('note-1').content).toBe('draft three');
    expect(state.queue).toHaveLength(0);
  });

  it('does not report a conflict when a queued op has a stale base version', async () => {
    await writeNote(USER, makeNote('hello'), 'upsert');
    await vi.waitFor(() => expect(state.queue.length).toBe(0));
    expect(state.server.get('note-1').version).toBe(1);

    // An op queued before the first save landed still says baseVersion 0.
    state.notes.set('note-1', { ...state.notes.get('note-1'), content: 'hello world', syncStatus: 'pending' });
    const { enqueueOp } = await import('../localDb');
    await enqueueOp({ userId: USER, entity: 'note', entityId: 'note-1', action: 'upsert', baseVersion: 0 });
    await processSyncQueue(USER);

    expect(state.notes.get('note-1').syncStatus).toBe('synced');
    expect(state.server.get('note-1').content).toBe('hello world');
  });
});
