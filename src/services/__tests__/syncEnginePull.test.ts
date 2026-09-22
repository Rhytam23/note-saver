/**
 * Background pull: picks up changes from other devices, never overwrites
 * unsynced local edits, and stays quiet (no UI refresh) when nothing changed.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

const state = vi.hoisted(() => ({
  notes: new Map<string, any>(),
  tags: [] as any[],
  queue: [] as any[],
  meta: new Map<string, unknown>(),
  remoteNotes: [] as any[],
  remoteTags: [] as any[],
}));

vi.mock('../connectivity', () => ({
  checkConnectivityNow: async () => 'online',
  subscribeConnectivity: () => () => undefined,
}));

vi.mock('../localDb', () => ({
  getLocalNote: async (_u: string, id: string) => state.notes.get(id),
  putLocalNote: async (_u: string, note: any) => { state.notes.set(note.id, { ...note }); },
  getLocalNotes: async () => [...state.notes.values()],
  getLocalTags: async () => state.tags,
  putLocalTag: async (_u: string, tag: any) => {
    state.tags = [...state.tags.filter(t => t.name !== tag.name), { ...tag }];
  },
  getQueue: async () => state.queue,
  getMeta: async (key: string) => state.meta.get(key),
  setMeta: async (key: string, value: unknown) => { state.meta.set(key, value); },
}));

vi.mock('../supabase', () => ({
  supabase: {
    from: (table: string) => {
      const rows = () => (table === 'notes' ? state.remoteNotes : state.remoteTags);
      const chain: any = {
        select: () => chain,
        eq: () => chain,
        order: () => chain,
        gt: () => chain,
        then: (resolve: any) => resolve({ data: rows(), error: null }),
      };
      return chain;
    },
  },
}));

import { pullNow, subscribeLocalChanges } from '../syncEngine';

const USER = 'user-1';
const remoteRow = (over: Record<string, unknown> = {}) => ({
  id: 'note-1', title: 'From phone', content: '<p>typed on phone</p>', tags: [], is_pinned: false,
  priority: 'none', created_at: '2026-09-21T00:00:00.000Z', updated_at: '2026-09-21T10:00:00.000Z',
  version: 2, deleted: false, ...over,
});

describe('sync engine: background pull', () => {
  let notified: number;

  beforeEach(() => {
    state.notes.clear();
    state.tags = [];
    state.queue = [];
    state.meta.clear();
    state.remoteNotes = [];
    state.remoteTags = [];
    notified = 0;
    subscribeLocalChanges(USER, () => { notified += 1; });
  });

  it('brings in a note written on another device', async () => {
    state.remoteNotes = [remoteRow()];
    await pullNow(USER);

    expect(state.notes.get('note-1').content).toBe('<p>typed on phone</p>');
    expect(notified).toBe(1);
    expect(state.meta.get(`${USER}:lastSync`)).toBe('2026-09-21T10:00:00.000Z');
  });

  it('does not announce a change when the server copy is already local', async () => {
    state.remoteNotes = [remoteRow()];
    await pullNow(USER);
    notified = 0;

    await pullNow(USER);
    expect(notified).toBe(0);
  });

  it('never overwrites an unsynced local edit', async () => {
    state.notes.set('note-1', { id: 'note-1', title: 'Mine', content: '<p>my newer text</p>', version: 2, syncStatus: 'pending', updatedAt: '2026-09-21T10:00:00.000Z' });
    state.queue = [{ opId: 'op-1', entity: 'note', entityId: 'note-1', action: 'upsert', baseVersion: 2 }];
    state.remoteNotes = [remoteRow({ version: 2 })];

    await pullNow(USER);
    expect(state.notes.get('note-1').content).toBe('<p>my newer text</p>');
    expect(state.notes.get('note-1').syncStatus).toBe('pending');
  });

  it('flags a conflict when another device changed a note that has unsynced local edits', async () => {
    state.notes.set('note-1', { id: 'note-1', title: 'Mine', content: '<p>my text</p>', version: 1, syncStatus: 'pending', updatedAt: '2026-09-20T10:00:00.000Z' });
    state.queue = [{ opId: 'op-1', entity: 'note', entityId: 'note-1', action: 'upsert', baseVersion: 1 }];
    state.remoteNotes = [remoteRow({ version: 3 })];

    await pullNow(USER);
    const local = state.notes.get('note-1');
    expect(local.syncStatus).toBe('conflict');
    expect(local.content).toBe('<p>my text</p>');
    expect(local.conflictServerData.content).toBe('<p>typed on phone</p>');
  });
});
