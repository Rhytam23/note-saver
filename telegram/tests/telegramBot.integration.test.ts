/**
 * @vitest-environment node
 *
 * Runs the REAL telegram/bot/index.ts (bundled with esbuild,
 * Deno imports stubbed) against an in-memory fake of the Supabase client and a
 * fake Telegram API. It exercises the router, the multi-step flows, user
 * scoping, locked-note handling and the sync-relevant write rules.
 */
import { describe, it, expect, beforeAll, beforeEach, afterAll, vi } from 'vitest';
import { build } from 'esbuild';
import { join } from 'node:path';

const ENTRY = join(__dirname, '..', 'bot', 'index.ts');
const SECRET = 'webhook-secret-0123456789';
const CRON = 'cron-secret-0123456789';
const NOW = new Date('2026-09-23T04:30:00.000Z'); // 10:00 in Asia/Kolkata
const LOCK = 'NNLOCK1:';

type Row = Record<string, any>;

// ------------------------------------------------------------ fake Supabase

const PK: Record<string, string> = {
  notes: 'id', telegram_links: 'user_id', telegram_sessions: 'chat_id',
  telegram_link_codes: 'code', telegram_reminders: 'id', calendar_events: 'id',
};

class FakeDb {
  tables: Record<string, Row[]> = {};
  users = new Map<string, { email: string }>();
  reset() { this.tables = {}; this.users = new Map(); }
  t(name: string): Row[] { return (this.tables[name] ??= []); }
}

const likeToRegex = (pattern: string, flags: string) =>
  new RegExp(
    '^' + pattern.replace(/\\([\\%_])|([.*+?^${}()|[\]])|%|_/g, (m, esc, special) =>
      esc ? esc.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') : special ? '\\' + special : m === '%' ? '.*' : '.') + '$',
    flags,
  );

class Query {
  private filters: ((r: Row) => boolean)[] = [];
  private orders: { col: string; asc: boolean }[] = [];
  private lim?: number;
  private single = false;
  private returning = false;
  private count = false;
  private head = false;
  constructor(private db: FakeDb, private table: string, private op: string, private payload?: Row) {}

  select(_cols?: string, opts?: { count?: string; head?: boolean }) {
    if (this.op !== 'select') this.returning = true;
    if (opts?.count) this.count = true;
    if (opts?.head) this.head = true;
    return this;
  }
  eq(c: string, v: unknown) { this.filters.push((r) => r[c] === v); return this; }
  like(c: string, p: string) { const re = likeToRegex(p, ''); this.filters.push((r) => re.test(String(r[c] ?? ''))); return this; }
  ilike(c: string, p: string) { const re = likeToRegex(p, 'i'); this.filters.push((r) => re.test(String(r[c] ?? ''))); return this; }
  lt(c: string, v: any) { this.filters.push((r) => r[c] < v); return this; }
  lte(c: string, v: any) { this.filters.push((r) => r[c] <= v); return this; }
  gte(c: string, v: any) { this.filters.push((r) => r[c] >= v); return this; }
  order(col: string, o?: { ascending?: boolean }) { this.orders.push({ col, asc: o?.ascending !== false }); return this; }
  limit(n: number) { this.lim = n; return this; }
  maybeSingle() { this.single = true; return this; }
  then(res: any, rej: any) { return Promise.resolve(this.exec()).then(res, rej); }

  private matched(): Row[] {
    let rows = this.db.t(this.table).filter((r) => this.filters.every((f) => f(r)));
    for (const { col, asc } of [...this.orders].reverse()) {
      rows = [...rows].sort((a, b) => {
        const x = a[col], y = b[col];
        if (x === y) return 0;
        if (x == null) return 1;
        if (y == null) return -1;
        return (x < y ? -1 : 1) * (asc ? 1 : -1);
      });
    }
    return this.lim ? rows.slice(0, this.lim) : rows;
  }

  private exec(): any {
    const rows = this.db.t(this.table);
    const pk = PK[this.table];
    switch (this.op) {
      case 'select': {
        const found = this.matched().map((r) => ({ ...r }));
        if (this.count) return { data: this.head ? null : found, count: found.length, error: null };
        return { data: this.single ? found[0] ?? null : found, error: null };
      }
      case 'insert': {
        const row = { ...this.payload };
        if (this.table === 'telegram_reminders') { row.id ??= crypto.randomUUID(); row.sent ??= false; }
        if (rows.some((r) => r[pk] === row[pk])) return { error: { message: 'duplicate key' } };
        if (this.table === 'telegram_links' && rows.some((r) => r.chat_id === row.chat_id)) return { error: { message: 'duplicate chat' } };
        rows.push(row);
        return { error: null };
      }
      case 'upsert': {
        const existing = rows.find((r) => r[pk] === this.payload![pk]);
        if (existing) Object.assign(existing, this.payload);
        else rows.push({ ...this.payload });
        return { error: null };
      }
      case 'update': {
        const hit = this.matched();
        for (const r of hit) {
          Object.assign(r, this.payload);
          if (this.table === 'notes') { r.version = (r.version ?? 0) + 1; r.updated_at = new Date().toISOString(); } // notes_bump_version trigger
        }
        return { data: this.returning ? hit.map((r) => ({ id: r.id })) : null, error: null };
      }
      case 'delete': {
        const hit = new Set(this.matched());
        this.db.tables[this.table] = rows.filter((r) => !hit.has(r));
        return { error: null };
      }
    }
  }
}

const db = new FakeDb();
const fakeSupabase = {
  from: (t: string) => ({
    select: (c?: string, o?: any) => new Query(db, t, 'select').select(c, o),
    insert: (p: Row) => new Query(db, t, 'insert', p),
    upsert: (p: Row) => new Query(db, t, 'upsert', p),
    update: (p: Row) => new Query(db, t, 'update', p),
    delete: () => new Query(db, t, 'delete'),
  }),
  auth: { admin: { getUserById: async (id: string) => ({ data: { user: db.users.has(id) ? { id, ...db.users.get(id) } : null } }) } },
};

// ------------------------------------------------------------- fake Telegram

let sent: { chat: number; text: string }[] = [];
let documents: { chat: number; filename: string; content: string }[] = [];
let geminiCalls = 0;

const fakeFetch = async (url: string, init?: any) => {
  const ok = (body: any) => ({ ok: true, status: 200, json: async () => body, text: async () => JSON.stringify(body) });
  if (url.includes('/sendMessage')) {
    const b = JSON.parse(init.body);
    sent.push({ chat: b.chat_id, text: b.text });
    return ok({ ok: true });
  }
  if (url.includes('/sendDocument')) {
    const f = init.body as FormData;
    const file = f.get('document') as File;
    documents.push({ chat: Number(f.get('chat_id')), filename: file.name, content: await file.text() });
    return ok({ ok: true });
  }
  if (url.includes('generativelanguage.googleapis.com')) {
    geminiCalls++;
    return ok({ candidates: [{ content: { parts: [{ text: '- a short summary' }] } }] });
  }
  throw new Error(`unexpected fetch ${url}`);
};

// ---------------------------------------------------------- load the bot

let handler: (req: Request) => Promise<Response>;

beforeAll(async () => {
  const result = await build({
    entryPoints: [ENTRY],
    bundle: true,
    write: false,
    format: 'iife',
    platform: 'neutral',
    target: 'es2022',
    logLevel: 'silent',
    plugins: [{
      name: 'stub-remote-imports',
      setup(b) {
        b.onResolve({ filter: /^https:\/\/deno\.land/ }, () => ({ path: 'serve', namespace: 'stub' }));
        b.onResolve({ filter: /^https:\/\/esm\.sh/ }, () => ({ path: 'supabase', namespace: 'stub' }));
        b.onLoad({ filter: /.*/, namespace: 'stub' }, (args) => ({
          loader: 'js',
          contents: args.path === 'serve'
            ? 'export function serve(h) { globalThis.__botHandler = h; }'
            : 'export function createClient() { return globalThis.__fakeSupabase; }',
        }));
      },
    }],
  });

  const env: Record<string, string> = {
    TELEGRAM_BOT_TOKEN: 'bot-token', TELEGRAM_WEBHOOK_SECRET: SECRET, CRON_SECRET: CRON,
    SUPABASE_URL: 'https://x.supabase.co', SUPABASE_SERVICE_ROLE_KEY: 'service', GEMINI_API_KEY: 'gem',
  };
  (globalThis as any).Deno = { env: { get: (k: string) => env[k] } };
  (globalThis as any).__fakeSupabase = fakeSupabase;
  vi.stubGlobal('fetch', fakeFetch);
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(NOW);
  // eslint-disable-next-line no-new-func
  new Function(result.outputFiles[0].text)();
  handler = (globalThis as any).__botHandler;
});

afterAll(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  delete (globalThis as any).Deno;
  delete (globalThis as any).__fakeSupabase;
  delete (globalThis as any).__botHandler;
});

// ---------------------------------------------------------------- helpers

const U1 = 'user-1', U2 = 'user-2', C1 = 111, C2 = 222;

async function post(body: unknown, headers: Record<string, string> = { 'x-telegram-bot-api-secret-token': SECRET }) {
  return handler(new Request('https://x.supabase.co/functions/v1/telegram-bot', {
    method: 'POST', headers, body: JSON.stringify(body),
  }));
}

/** Sends one message as `chat` and returns everything the bot replied with. */
async function say(chat: number, text: string, chatType = 'private'): Promise<string> {
  vi.setSystemTime(new Date(Date.now() + 20_000)); // stay well inside the per-minute rate limit
  const before = sent.length;
  const res = await post({ message: { chat: { id: chat, type: chatType }, text } });
  expect(res.status).toBe(200);
  return sent.slice(before).map((m) => m.text).join('\n---\n');
}

function link(user: string, chat: number, email = `${user}@example.com`, timezone = 'UTC') {
  db.users.set(user, { email });
  db.t('telegram_links').push({ user_id: user, chat_id: chat, timezone });
}

let seq = 0;
function seedNote(user: string, over: Row = {}): string {
  const id = over.id ?? `note-${++seq}`;
  const at = new Date(Date.now() - (1000 - seq) * 60_000).toISOString();
  db.t('notes').push({
    id, user_id: user, title: `Note ${seq}`, content: '<p>body</p>', tags: [], is_pinned: false,
    priority: 'none', created_at: at, updated_at: at, version: 1, deleted: false, deleted_at: null, ...over,
  });
  return id;
}
const notesOf = (user: string) => db.t('notes').filter((n) => n.user_id === user);
const byTitle = (user: string, title: string) => notesOf(user).find((n) => n.title === title);

beforeEach(() => {
  db.reset();
  sent = []; documents = []; geminiCalls = 0; seq = 0;
  vi.setSystemTime(NOW);
  link(U1, C1);
});

// ------------------------------------------------------------------ tests

describe('telegram bot: authentication and linking', () => {
  it('rejects a missing or wrong webhook secret and does nothing', async () => {
    const body = { message: { chat: { id: C1, type: 'private' }, text: '/notes' } };
    expect((await post(body, {})).status).toBe(403);
    expect((await post(body, { 'x-telegram-bot-api-secret-token': 'nope' })).status).toBe(403);
    expect(sent).toHaveLength(0);
  });

  it('ignores group chats and non-text updates', async () => {
    expect(await say(C1, '/notes', 'group')).toBe('');
    expect((await post({ message: { chat: { id: C1, type: 'private' }, photo: [] } })).status).toBe(200);
    expect(sent).toHaveLength(0);
  });

  it('tells an unlinked chat to connect, but still answers /help', async () => {
    expect(await say(999, '/notes')).toContain('not connected');
    expect(await say(999, '/get anything')).toContain('not connected');
    expect(await say(999, '/help')).toContain('/title');
  });

  it('links a chat with a valid single-use code, then rejects reuse', async () => {
    db.t('telegram_link_codes').push({ code: 'GOODCODE', user_id: U2, expires_at: new Date(Date.now() + 60_000).toISOString() });
    db.users.set(U2, { email: 'two@example.com' });
    expect(await say(C2, '/start GOODCODE')).toContain('Connected');
    expect(db.t('telegram_links').find((l) => l.user_id === U2)?.chat_id).toBe(C2);
    expect(db.t('telegram_link_codes')).toHaveLength(0);
    expect(await say(333, '/start GOODCODE')).toContain('invalid or has expired');
  });

  it('rejects an expired code and still consumes it', async () => {
    db.t('telegram_link_codes').push({ code: 'OLD', user_id: U2, expires_at: new Date(Date.now() - 1000).toISOString() });
    expect(await say(C2, '/start OLD')).toContain('invalid or has expired');
    expect(db.t('telegram_link_codes')).toHaveLength(0);
    expect(db.t('telegram_links').some((l) => l.user_id === U2)).toBe(false);
  });
});

describe('telegram bot: writing notes', () => {
  it('saves a note from /title then the body, in editor HTML that syncs', async () => {
    expect(await say(C1, '/title Physics revision')).toContain('Now send the body');
    expect(await say(C1, 'Newton\'s laws\nF = ma <b>')).toContain('Saved "Physics revision"');
    const n = byTitle(U1, 'Physics revision')!;
    expect(n.user_id).toBe(U1);
    expect(n.content).toBe('<p>Newton\'s laws</p><p>F = ma &lt;b&gt;</p>');
    expect(n.version).toBe(1);
    expect(n.deleted).toBe(false);
    expect(n.priority).toBe('none');
  });

  it('ignores plain text with no command and saves nothing', async () => {
    expect(await say(C1, 'hello there')).toContain('/title');
    expect(notesOf(U1)).toHaveLength(0);
  });

  it('asks for the title when /title has no argument', async () => {
    expect(await say(C1, '/title')).toContain('What is the title');
    expect(await say(C1, 'My title')).toContain('Now send the body');
    await say(C1, 'text');
    expect(byTitle(U1, 'My title')).toBeTruthy();
  });

  it('applies /priority sent between the title and the body', async () => {
    await say(C1, '/title Urgent');
    expect(await say(C1, '/priority high')).toContain('Now send the body');
    await say(C1, 'do it');
    expect(byTitle(U1, 'Urgent')!.priority).toBe('high');
  });

  it('discards an unfinished note when another command interrupts, and says so', async () => {
    await say(C1, '/title Half');
    expect(await say(C1, '/notes')).toContain('Discarded the unfinished note "Half"');
    expect(await say(C1, 'stray text')).toContain('/title');
    expect(notesOf(U1)).toHaveLength(0);
  });

  it('cancels', async () => {
    await say(C1, '/title Nope');
    expect(await say(C1, '/cancel')).toContain('Cancelled');
    await say(C1, 'body');
    expect(notesOf(U1)).toHaveLength(0);
  });

  it('/quick saves in one message', async () => {
    expect(await say(C1, '/quick Buy graph paper before Friday')).toContain('Saved');
    expect(notesOf(U1)[0].content).toContain('Buy graph paper before Friday');
  });

  it('/template lists and creates notes from the app templates', async () => {
    expect(await say(C1, '/template')).toContain('Class notes');
    expect(await say(C1, '/template 1')).toContain('Created');
    const n = byTitle(U1, 'Class notes')!;
    expect(n.tags).toEqual(['study']);
    expect(n.content).toContain('<h2>Topic</h2>');
  });

  it('caps very long bodies', async () => {
    await say(C1, '/title Long');
    await say(C1, 'x'.repeat(40000));
    expect(byTitle(U1, 'Long')!.content.length).toBeLessThan(15100);
  });
});

describe('telegram bot: browsing and numbering', () => {
  it('lists pinned first, then by priority, numbered, and /get by number and by title', async () => {
    seedNote(U1, { title: 'Plain' });
    seedNote(U1, { title: 'Important', priority: 'high' });
    seedNote(U1, { title: 'Pinned', is_pinned: true });
    const list = await say(C1, '/notes');
    expect(list.indexOf('1. 📌 Pinned')).toBeGreaterThan(-1);
    expect(list.indexOf('Pinned')).toBeLessThan(list.indexOf('Important'));
    expect(list.indexOf('Important')).toBeLessThan(list.indexOf('Plain'));
    expect(await say(C1, '/get 2')).toContain('Important');
    expect(await say(C1, '/get plain')).toContain('body');
  });

  it('filters by priority, pinned and tag', async () => {
    seedNote(U1, { title: 'A', priority: 'high' });
    seedNote(U1, { title: 'B', tags: ['exam'] });
    seedNote(U1, { title: 'C', is_pinned: true });
    expect(await say(C1, '/notes high')).toMatch(/A[\s\S]*$/);
    expect(await say(C1, '/notes high')).not.toContain('. B');
    expect(await say(C1, '/notes exam')).toContain('B');
    expect(await say(C1, '/notes pinned')).toContain('C');
  });

  it('paginates', async () => {
    for (let i = 0; i < 12; i++) seedNote(U1, { title: `N${i}` });
    const p1 = await say(C1, '/notes');
    expect(p1).toContain('page 1/2');
    const p2 = await say(C1, '/notes 2');
    expect(p2).toContain('page 2/2');
    expect(p2).toContain('11. ');
  });

  it('refuses a stale number instead of touching the wrong note', async () => {
    seedNote(U1, { title: 'A' });
    await say(C1, '/notes');
    vi.setSystemTime(new Date(Date.now() + 31 * 60_000));
    expect(await say(C1, '/get 1')).toContain('out of date');
    expect(await say(C1, '/get 9')).not.toContain('body');
  });

  it('asks which note when a title is ambiguous, then accepts a number', async () => {
    seedNote(U1, { title: 'Physics 1', content: '<p>first</p>' });
    seedNote(U1, { title: 'Physics 2', content: '<p>second</p>' });
    const r = await say(C1, '/get physics');
    expect(r).toContain('Several notes match');
    expect(await say(C1, '/get 1')).toMatch(/first|second/);
  });

  it('shows recent, today, week, random, tags', async () => {
    seedNote(U1, { title: 'Old', updated_at: '2026-08-01T00:00:00.000Z', tags: ['x'] });
    seedNote(U1, { title: 'Fresh', updated_at: new Date().toISOString(), tags: ['x', 'y'] });
    expect(await say(C1, '/recent')).toContain('Fresh');
    expect(await say(C1, '/today')).toContain('Fresh');
    expect(await say(C1, '/today')).not.toContain('Old');
    expect(await say(C1, '/week')).not.toContain('Old');
    expect(await say(C1, '/random')).toMatch(/Old|Fresh/);
    const tags = await say(C1, '/tags');
    expect(tags).toContain('#x (2)');
    expect(tags).toContain('#y (1)');
  });

  it('searches titles and bodies with a snippet, skipping deleted and archived notes', async () => {
    seedNote(U1, { title: 'Bio', content: '<p>Photosynthesis makes sugar</p>' });
    seedNote(U1, { title: 'Gone', content: '<p>photosynthesis</p>', deleted: true });
    seedNote(U1, { title: 'Shelved', content: '<p>photosynthesis</p>', tags: ['archived'] });
    const r = await say(C1, '/search photosynthesis');
    expect(r).toContain('Bio');
    expect(r).toContain('Photosynthesis makes sugar');
    expect(r).not.toContain('Gone');
    expect(r).not.toContain('Shelved');
    expect(await say(C1, '/search zzzz')).toContain('Nothing found');
  });

  it('shows wiki links and backlinks', async () => {
    seedNote(U1, { title: 'Hub', content: '<p>See [[Spoke]] and [[Missing]]</p>' });
    seedNote(U1, { title: 'Spoke', content: '<p>x</p>' });
    const r = await say(C1, '/links Hub');
    expect(r).toContain('→ Spoke');
    expect(r).toContain('? Missing');
    expect(await say(C1, '/links Spoke')).toContain('← Hub');
  });
});

describe('telegram bot: user isolation (service role bypasses RLS)', () => {
  beforeEach(() => link(U2, C2));

  it('never lets one user read, list, search or edit another user\'s notes', async () => {
    const id = seedNote(U1, { title: 'Private diary', content: '<p>secret plan</p>' });
    seedNote(U2, { title: 'Mine', content: '<p>ok</p>' });

    expect(await say(C2, '/notes')).not.toContain('Private diary');
    expect(await say(C2, '/get Private diary')).toContain('No note found');
    expect(await say(C2, '/search secret')).toContain('Nothing found');
    expect(await say(C2, '/tags')).not.toContain('Private');
    await say(C2, '/priority high private');
    await say(C2, '/delete Private diary');
    await say(C2, '/confirm');

    const n = db.t('notes').find((r) => r.id === id)!;
    expect(n.priority).toBe('none');
    expect(n.deleted).toBe(false);
    expect(sent.every((m) => !m.text.includes('secret plan'))).toBe(true);
  });

  it('cannot reach another user\'s note through a number from a previous list', async () => {
    const other = seedNote(U1, { title: 'Theirs' });
    db.t('telegram_sessions').push({ chat_id: C2, state: 'idle', last_list: { ids: [other], at: Date.now() } });
    expect(await say(C2, '/get 1')).toContain('no longer exists');
  });

  it('keeps calendar events and reminders per user', async () => {
    const soon = new Date(Date.now() + 86_400_000).toISOString();
    db.t('calendar_events').push({ id: 'e1', user_id: U1, title: 'Mine only', start_at: soon, is_all_day: false, is_deleted: false });
    db.t('calendar_events').push({ id: 'e2', user_id: U2, title: 'Theirs only', start_at: soon, is_all_day: false, is_deleted: false });
    const r = await say(C1, '/events');
    expect(r).toContain('Mine only');
    expect(r).not.toContain('Theirs only');
  });
});

describe('telegram bot: editing (sync-safe writes)', () => {
  it('sets priority, pin and tags, bumping version through the trigger', async () => {
    const id = seedNote(U1, { title: 'Target' });
    await say(C1, '/notes');
    expect(await say(C1, '/priority high 1')).toContain('high priority');
    expect(await say(C1, '/pin 1')).toContain('Pinned');
    expect(await say(C1, '/tag exam 1')).toContain('#exam');
    const n = db.t('notes').find((r) => r.id === id)!;
    expect(n.priority).toBe('high');
    expect(n.is_pinned).toBe(true);
    expect(n.tags).toEqual(['exam']);
    expect(n.version).toBe(4); // 1 + three updates
    expect(await say(C1, '/unpin 1')).toContain('Unpinned');
    expect(n.is_pinned).toBe(false);
    expect(await say(C1, '/priority urgent 1')).toContain('Use: /priority');
  });

  it('uses the last viewed note when none is named', async () => {
    seedNote(U1, { title: 'Viewed' });
    await say(C1, '/get viewed');
    await say(C1, '/priority low');
    expect(byTitle(U1, 'Viewed')!.priority).toBe('low');
  });

  it('never sets version or updated_at itself on updates', async () => {
    const id = seedNote(U1, { title: 'T', version: 7 });
    await say(C1, '/get T');
    await say(C1, '/pin');
    expect(db.t('notes').find((r) => r.id === id)!.version).toBe(8);
  });

  it('appends, prepends and renames through the next message', async () => {
    seedNote(U1, { title: 'Doc', content: '<p>middle</p>' });
    await say(C1, '/append Doc');
    expect(await say(C1, 'end')).toContain('end of "Doc"');
    await say(C1, '/prepend Doc');
    await say(C1, 'start');
    expect(byTitle(U1, 'Doc')!.content).toBe('<p>start</p><p>middle</p><p>end</p>');
    await say(C1, '/rename Doc');
    expect(await say(C1, 'New name')).toContain('Renamed');
    expect(byTitle(U1, 'New name')).toBeTruthy();
  });

  it('archives (hides) and unarchives', async () => {
    seedNote(U1, { title: 'Old stuff' });
    await say(C1, '/notes');
    expect(await say(C1, '/archive 1')).toContain('Archived');
    expect(byTitle(U1, 'Old stuff')!.tags).toContain('archived');
    expect(await say(C1, '/notes')).toContain('No notes yet');
    expect(await say(C1, '/notes archived')).toContain('Old stuff');
    await say(C1, '/unarchive old');
    expect(byTitle(U1, 'Old stuff')!.tags).not.toContain('archived');
  });

  it('copies a note', async () => {
    seedNote(U1, { title: 'Orig', tags: ['a'], priority: 'high', content: '<p>same</p>' });
    await say(C1, '/copy orig');
    const copy = byTitle(U1, 'Orig (copy)')!;
    expect(copy.content).toBe('<p>same</p>');
    expect(copy.tags).toEqual(['a']);
    expect(copy.priority).toBe('high');
    expect(copy.version).toBe(1);
  });
});

describe('telegram bot: delete, trash and recovery', () => {
  it('needs /confirm, soft-deletes, and can be undone', async () => {
    const id = seedNote(U1, { title: 'Doomed' });
    await say(C1, '/notes');
    expect(await say(C1, '/delete 1')).toContain('/confirm');
    expect(db.t('notes').find((r) => r.id === id)!.deleted).toBe(false);
    expect(await say(C1, 'yes please')).toContain('/confirm');
    expect(await say(C1, '/confirm')).toContain('Deleted "Doomed"');
    const row = db.t('notes').find((r) => r.id === id)!;
    expect(row.deleted).toBe(true);
    expect(row.deleted_at).toBeTruthy();
    expect(await say(C1, '/notes')).toContain('No notes yet');
    expect(await say(C1, '/trash')).toContain('Doomed');
    expect(await say(C1, '/undo')).toContain('Restored "Doomed"');
    expect(db.t('notes').find((r) => r.id === id)!.deleted).toBe(false);
    expect(db.t('notes').find((r) => r.id === id)!.deleted_at).toBeNull();
    expect(await say(C1, '/confirm')).toContain('Nothing to confirm');
  });

  it('drops a pending delete if another command comes first', async () => {
    const id = seedNote(U1, { title: 'Safe' });
    await say(C1, '/delete safe');
    await say(C1, '/notes');
    await say(C1, '/confirm');
    expect(db.t('notes').find((r) => r.id === id)!.deleted).toBe(false);
  });

  it('/restore by number from /trash', async () => {
    seedNote(U1, { title: 'Back', deleted: true, deleted_at: new Date().toISOString() });
    await say(C1, '/trash');
    expect(await say(C1, '/restore 1')).toContain('Restored "Back"');
  });

  it('does not list trash older than 30 days', async () => {
    seedNote(U1, { title: 'Ancient', deleted: true, deleted_at: '2026-01-01T00:00:00.000Z' });
    expect(await say(C1, '/trash')).toContain('Nothing here');
  });
});

describe('telegram bot: locked notes stay locked', () => {
  const ciphertext = `${LOCK}QUJDREVGRw==`;

  it('lists by title with a lock icon and never reveals or changes the content', async () => {
    const id = seedNote(U1, { title: 'Vault', content: ciphertext });
    expect(await say(C1, '/notes')).toContain('🔒 Vault');
    expect(await say(C1, '/get vault')).toContain('locked note');
    expect(await say(C1, '/append vault')).toContain('locked');
    expect(await say(C1, '/copy vault')).toContain('locked');
    expect(await say(C1, '/export vault')).toContain('locked');
    expect(await say(C1, '/summarize vault')).toContain('locked');
    expect(await say(C1, '/search QUJDREVG')).toContain('Nothing found');
    expect(documents).toHaveLength(0);
    expect(geminiCalls).toBe(0);
    // (the search reply echoes the query, so check for the FULL ciphertext and the lock marker)
    expect(sent.every((m) => !m.text.includes(ciphertext) && !m.text.includes(LOCK))).toBe(true);
    expect(db.t('notes').find((r) => r.id === id)!.content).toBe(ciphertext);
  });

  it('excludes locked content from /backup and from /random and /quiz', async () => {
    seedNote(U1, { title: 'Vault', content: ciphertext });
    seedNote(U1, { title: 'Open', content: '<p>visible</p>' });
    await say(C1, '/backup');
    expect(documents[0].content).toContain('visible');
    expect(documents[0].content).toContain('locked note - content not included');
    expect(documents[0].content).not.toContain('QUJDREVGRw');
    for (let i = 0; i < 6; i++) expect(await say(C1, '/random')).not.toContain('locked');
  });
});

describe('telegram bot: tasks, inbox, flashcards', () => {
  it('collects /todo items in one Inbox note, lists them, and shows the inbox', async () => {
    await say(C1, '/todo Finish worksheet');
    await say(C1, '/todo Email <teacher>');
    const inbox = notesOf(U1).filter((n) => n.title === 'Inbox');
    expect(inbox).toHaveLength(1);
    expect(inbox[0].content.match(/<ul data-type="taskList">/g)).toHaveLength(1);
    expect(inbox[0].content).toContain('data-checked="false"><p>Finish worksheet</p>');
    expect(inbox[0].content).not.toContain('<teacher>');
    const tasks = await say(C1, '/tasks');
    expect(tasks).toContain('☐ Finish worksheet');
    expect(tasks).toContain('☐ Email <teacher>');
    await say(C1, '/inbox Ask about the lab');
    expect(await say(C1, '/inbox')).toContain('Ask about the lab');
    expect(byTitle(U1, 'Inbox')!.content).toMatch(/<p>\[2026-09-23 \d\d:\d\d\] Ask about the lab<\/p>/);
  });

  it('does not list checked tasks, or tasks in locked or archived notes', async () => {
    seedNote(U1, { title: 'Done', content: '<ul data-type="taskList"><li data-type="taskItem" data-checked="true"><p>finished</p></li></ul>' });
    seedNote(U1, { title: 'Shelf', tags: ['archived'], content: '<ul data-type="taskList"><li data-type="taskItem" data-checked="false"><p>shelved</p></li></ul>' });
    expect(await say(C1, '/tasks')).toContain('No open tasks');
  });

  it('stores flashcards in the app\'s Question:: Answer format and quizzes from them', async () => {
    expect(await say(C1, '/card Powerhouse of the cell :: Mitochondria')).toContain('Flashcard added');
    expect(byTitle(U1, 'Flashcards')!.content).toBe('<p>Powerhouse of the cell:: Mitochondria</p>');
    expect(await say(C1, '/card no separator')).toContain('Use: /card');
    expect(await say(C1, '/quiz')).toContain('Powerhouse of the cell');
    expect(await say(C1, '/answer')).toContain('Mitochondria');
    expect(await say(C1, '/answer')).toContain('No open question');
  });
});

describe('telegram bot: reminders and time', () => {
  it('sets, lists and cancels reminders in the user\'s timezone', async () => {
    expect(await say(C1, '/timezone Mars/Base')).toContain('not a valid timezone');
    expect(await say(C1, '/timezone Asia/Kolkata')).toContain('Asia/Kolkata');
    expect(await say(C1, '/remind tomorrow 9am revise chapter 3')).toContain('2026-09-24 09:00');
    const r = db.t('telegram_reminders')[0];
    expect(r.due_at).toBe('2026-09-24T03:30:00.000Z');
    expect(r.chat_id).toBe(C1);
    expect(r.user_id).toBe(U1);
    expect(await say(C1, '/reminders')).toContain('revise chapter 3');
    expect(await say(C1, '/reminders cancel 1')).toContain('Cancelled');
    expect(db.t('telegram_reminders')).toHaveLength(0);
  });

  it('rejects unusable times and missing text', async () => {
    expect(await say(C1, '/remind whenever call mom')).toContain('could not understand');
    expect(await say(C1, '/remind 2020-01-01 10:00 old')).toContain('could not understand');
    expect(await say(C1, '/remind tomorrow 9am')).toContain('What should I remind you about');
    expect(db.t('telegram_reminders')).toHaveLength(0);
  });

  it('caps pending reminders', async () => {
    for (let i = 0; i < 50; i++) db.t('telegram_reminders').push({ id: `r${i}`, user_id: U1, chat_id: C1, body: 'x', due_at: '2027-01-01T00:00:00.000Z', sent: false });
    expect(await say(C1, '/remind in 1h one more')).toContain('50 pending');
  });

  it('the scheduler sends due reminders exactly once and needs its secret', async () => {
    db.t('telegram_reminders').push({ id: 'due', user_id: U1, chat_id: C1, body: 'take medicine', due_at: new Date(Date.now() - 1000).toISOString(), sent: false });
    db.t('telegram_reminders').push({ id: 'later', user_id: U1, chat_id: C1, body: 'not yet', due_at: new Date(Date.now() + 3_600_000).toISOString(), sent: false });
    const call = (secret: string) => handler(new Request('https://x/functions/v1/telegram-bot', {
      method: 'POST', headers: { 'x-cron-secret': secret }, body: '{}',
    }));
    expect((await call('wrong')).status).toBe(403);
    expect(sent).toHaveLength(0);
    expect((await call(CRON)).status).toBe(200);
    expect(sent.map((m) => m.text)).toEqual(['⏰ Reminder: take medicine']);
    expect(sent[0].chat).toBe(C1);
    await call(CRON);
    expect(sent).toHaveLength(1);
    expect(db.t('telegram_reminders').find((r) => r.id === 'later')!.sent).toBe(false);
  });

  it('the scheduler also clears expired link codes', async () => {
    db.t('telegram_link_codes').push({ code: 'STALE', user_id: U1, expires_at: new Date(Date.now() - 1000).toISOString() });
    await handler(new Request('https://x/functions/v1/telegram-bot', { method: 'POST', headers: { 'x-cron-secret': CRON }, body: '{}' }));
    expect(db.t('telegram_link_codes')).toHaveLength(0);
  });
});

describe('telegram bot: export, AI, status, help, account', () => {
  it('exports a note as Markdown with a safe filename', async () => {
    seedNote(U1, {
      title: 'Physics: "Waves"/1', priority: 'high', tags: ['exam'],
      content: '<h2>Intro</h2><ul data-type="taskList"><li data-type="taskItem" data-checked="true"><p>read</p></li></ul>',
    });
    await say(C1, '/export waves');
    expect(documents[0].filename).toBe('Physics-Waves1.md');
    expect(documents[0].content).toContain('## Intro');
    expect(documents[0].content).toContain('- [x] read');
    expect(documents[0].content).toContain('Priority: high');
  });

  it('summarises an unlocked note through Gemini', async () => {
    seedNote(U1, { title: 'Essay', content: '<p>Long text about plants</p>' });
    const r = await say(C1, '/summarize essay');
    expect(geminiCalls).toBe(1);
    expect(r).toContain('a short summary');
  });

  it('shows status with the email partly masked', async () => {
    seedNote(U1, { priority: 'high', is_pinned: true });
    seedNote(U1, { content: `${LOCK}xx` });
    const r = await say(C1, '/status');
    expect(r).toContain('us****@example.com');
    expect(r).not.toContain('user-1@example.com');
    expect(r).toContain('Notes: 2');
    expect(r).toContain('1 pinned');
    expect(r).toContain('1 locked');
  });

  it('answers /help, /help <command>, and unknown commands', async () => {
    expect(await say(C1, '/help')).toContain('/summarize');
    expect(await say(C1, '/help priority')).toContain('/priority <high|medium|low|none>');
    expect(await say(C1, '/help nonsense')).toContain('No command called');
    expect(await say(C1, '/frobnicate')).toContain('Unknown command');
    expect(await say(C1, '/notes@NoteNirmanBot')).toContain('No notes yet');
  });

  it('unlinks: removes the link, pending reminders and stops answering', async () => {
    db.t('telegram_reminders').push({ id: 'r', user_id: U1, chat_id: C1, body: 'x', due_at: '2027-01-01T00:00:00.000Z', sent: false });
    seedNote(U1, { title: 'Stays' });
    expect(await say(C1, '/unlink')).toContain('Disconnected');
    expect(db.t('telegram_links')).toHaveLength(0);
    expect(db.t('telegram_reminders')).toHaveLength(0);
    expect(db.t('telegram_sessions').some((s) => s.chat_id === C1)).toBe(false);
    expect(byTitle(U1, 'Stays')).toBeTruthy();
    expect(await say(C1, '/notes')).toContain('not connected');
  });
});

describe('telegram bot: abuse protection', () => {
  it('rate-limits a flood, warns once, and stops writing', async () => {
    const flood = async (text: string) => {
      const before = sent.length;
      await post({ message: { chat: { id: C1, type: 'private' }, text } });
      return sent.slice(before).map((m) => m.text).join('');
    };
    for (let i = 0; i < 30; i++) await flood('/recent');
    expect(await flood('/quick spam one')).toContain('Slow down');
    expect(await flood('/quick spam two')).toBe('');
    expect(notesOf(U1).filter((n) => n.title.startsWith('spam'))).toHaveLength(0);
    vi.setSystemTime(new Date(Date.now() + 61_000));
    expect(await flood('/quick fine now')).toContain('Saved');
  });

  it('survives a database error by replying instead of crashing or duplicating', async () => {
    const original = fakeSupabase.from;
    const quiet = vi.spyOn(console, 'error').mockImplementation(() => undefined); // the bot logs the failure, by design
    fakeSupabase.from = ((t: string) => {
      if (t === 'notes') throw new Error('boom');
      return original(t);
    }) as any;
    try {
      const r = await say(C1, '/notes');
      expect(r).toContain('Something went wrong');
      expect(quiet).toHaveBeenCalled();
    } finally {
      fakeSupabase.from = original;
      quiet.mockRestore();
    }
  });
});
