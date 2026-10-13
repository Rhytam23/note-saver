// Pure note-list logic for the Telegram bot: ordering, filtering, numbering,
// target resolution and the HTML edits. No Deno or Node APIs.
import { LOCK_PREFIX } from './generated/lockPrefix.ts';
import { stripTags } from './text.ts';
import { taskList } from './generated/noteTemplates.ts';

export type Priority = 'high' | 'medium' | 'low' | 'none';

/** Row shape the bot reads for lists (content is fetched separately, only when needed). */
export interface BotNote {
  id: string;
  title: string;
  tags: string[];
  is_pinned: boolean;
  priority: Priority | null;
  created_at: string;
  updated_at: string;
  locked: boolean;
}

export const ARCHIVE_TAG = 'archived';
export const PAGE_SIZE = 10;
export const LIST_TTL_MS = 30 * 60 * 1000;
export const INBOX_TITLE = 'Inbox';
export const FLASHCARDS_TITLE = 'Flashcards';

const PRIORITY_RANK: Record<Priority, number> = { high: 3, medium: 2, low: 1, none: 0 };
const PRIORITY_ICON: Record<Priority, string> = { high: '🔴', medium: '🟠', low: '🟡', none: '' };

export const isLocked = (content: string | null | undefined): boolean =>
  typeof content === 'string' && content.startsWith(LOCK_PREFIX);

export const isArchived = (note: Pick<BotNote, 'tags'>): boolean => (note.tags ?? []).includes(ARCHIVE_TAG);

export function normalisePriority(input: string): Priority | null {
  const v = input.trim().toLowerCase();
  if (v === 'high' || v === 'h') return 'high';
  if (v === 'medium' || v === 'med' || v === 'm') return 'medium';
  if (v === 'low' || v === 'l') return 'low';
  if (v === 'none' || v === 'n' || v === 'off') return 'none';
  return null;
}

/** Pinned first, then priority high > none, then most recently updated. */
export function sortNotes<T extends Pick<BotNote, 'is_pinned' | 'priority' | 'updated_at'>>(notes: T[]): T[] {
  return [...notes].sort((a, b) => {
    if (a.is_pinned !== b.is_pinned) return a.is_pinned ? -1 : 1;
    const pa = PRIORITY_RANK[a.priority ?? 'none'];
    const pb = PRIORITY_RANK[b.priority ?? 'none'];
    if (pa !== pb) return pb - pa;
    return b.updated_at.localeCompare(a.updated_at);
  });
}

export type NoteFilter =
  | { kind: 'all' }
  | { kind: 'priority'; value: Priority }
  | { kind: 'pinned' }
  | { kind: 'archived' }
  | { kind: 'tag'; value: string };

/** "/notes high 2" -> filter + page. The last numeric token is the page. */
export function parseListArgs(arg: string): { filter: NoteFilter; page: number } {
  const tokens = arg.trim().split(/\s+/).filter(Boolean);
  let page = 1;
  if (tokens.length && /^\d+$/.test(tokens[tokens.length - 1])) {
    page = Math.max(1, parseInt(tokens.pop() as string, 10));
  }
  const word = (tokens[0] ?? '').replace(/^#/, '').toLowerCase();
  if (!word) return { filter: { kind: 'all' }, page };
  if (word === 'pinned') return { filter: { kind: 'pinned' }, page };
  if (word === ARCHIVE_TAG || word === 'archive') return { filter: { kind: 'archived' }, page };
  const priority = word === 'h' || word === 'm' || word === 'l' ? null : normalisePriority(word);
  if (priority && priority !== 'none') return { filter: { kind: 'priority', value: priority }, page };
  return { filter: { kind: 'tag', value: word }, page };
}

export function applyFilter(notes: BotNote[], filter: NoteFilter): BotNote[] {
  switch (filter.kind) {
    case 'archived':
      return notes.filter(isArchived);
    case 'pinned':
      return notes.filter((n) => n.is_pinned && !isArchived(n));
    case 'priority':
      return notes.filter((n) => n.priority === filter.value && !isArchived(n));
    case 'tag':
      return notes.filter((n) => (n.tags ?? []).some((t) => t.toLowerCase() === filter.value) && !isArchived(n));
    default:
      return notes.filter((n) => !isArchived(n));
  }
}

export function paginate<T>(items: T[], page: number, size = PAGE_SIZE): { slice: T[]; page: number; pages: number; offset: number } {
  const pages = Math.max(1, Math.ceil(items.length / size));
  const safePage = Math.min(Math.max(1, page), pages);
  const offset = (safePage - 1) * size;
  return { slice: items.slice(offset, offset + size), page: safePage, pages, offset };
}

export function formatNoteLine(number: number, note: BotNote): string {
  const parts = [
    note.is_pinned ? '📌 ' : '',
    PRIORITY_ICON[note.priority ?? 'none'] ? PRIORITY_ICON[note.priority ?? 'none'] + ' ' : '',
    note.locked ? '🔒 ' : '',
    isArchived(note) ? '🗄 ' : '',
  ];
  return `${number}. ${parts.join('')}${note.title?.trim() || '(untitled)'}`;
}

export function priorityLabel(p: Priority | null): string {
  const v = p ?? 'none';
  return v === 'none' ? 'no priority' : `${PRIORITY_ICON[v]} ${v} priority`;
}

// ---------- targets: "3" (from the last list) or a title ----------

export type ListMemory = { ids: string[]; at: number } | null;

export type TargetParse = { kind: 'number'; n: number } | { kind: 'title'; text: string } | { kind: 'none' };

export function parseTarget(arg: string): TargetParse {
  const text = arg.trim();
  if (!text) return { kind: 'none' };
  if (/^\d{1,4}$/.test(text)) return { kind: 'number', n: parseInt(text, 10) };
  return { kind: 'title', text };
}

export type PickResult = { ok: true; id: string } | { ok: false; reason: 'no-list' | 'expired' | 'range' };

export function pickByNumber(memory: ListMemory, n: number, now: number): PickResult {
  if (!memory || memory.ids.length === 0) return { ok: false, reason: 'no-list' };
  if (now - memory.at > LIST_TTL_MS) return { ok: false, reason: 'expired' };
  if (n < 1 || n > memory.ids.length) return { ok: false, reason: 'range' };
  return { ok: true, id: memory.ids[n - 1] };
}

export type TitleMatch<T> = { kind: 'none' } | { kind: 'one'; note: T } | { kind: 'many'; notes: T[] };

/** Exact (case-insensitive) title wins; otherwise a single partial match; otherwise ambiguous. */
export function matchTitle<T extends { title: string }>(candidates: T[], query: string): TitleMatch<T> {
  const q = query.trim().toLowerCase();
  if (!q) return { kind: 'none' };
  const exact = candidates.filter((n) => (n.title ?? '').trim().toLowerCase() === q);
  if (exact.length === 1) return { kind: 'one', note: exact[0] };
  const pool = exact.length > 1 ? exact : candidates.filter((n) => (n.title ?? '').toLowerCase().includes(q));
  if (pool.length === 0) return { kind: 'none' };
  if (pool.length === 1) return { kind: 'one', note: pool[0] };
  return { kind: 'many', notes: pool };
}

// ---------- tags ----------

export function normaliseTag(input: string): string | null {
  const tag = input.trim().replace(/^#/, '').toLowerCase();
  if (!tag || tag.length > 30 || /\s/.test(tag)) return null;
  return tag;
}

export function withTag(tags: string[], tag: string): string[] {
  return tags.some((t) => t.toLowerCase() === tag) ? tags : [...tags, tag];
}

export function withoutTag(tags: string[], tag: string): string[] {
  return tags.filter((t) => t.toLowerCase() !== tag);
}

// ---------- HTML edits ----------

const TASK_LIST_OPEN = '<ul data-type="taskList">';

/** Adds an unchecked task, extending a trailing task list instead of starting a new one. */
export function appendTask(html: string, text: string): string {
  const safe = text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const item = taskList([safe]).slice(TASK_LIST_OPEN.length, -'</ul>'.length);
  const current = html || '';
  const endsWithTaskList = current.endsWith('</li></ul>') && current.lastIndexOf('<ul') === current.lastIndexOf(TASK_LIST_OPEN);
  if (endsWithTaskList) return current.slice(0, -'</ul>'.length) + item + '</ul>';
  return current + taskList([safe]);
}

/** Unchecked task texts in a note, in order. */
export function extractOpenTasks(html: string): string[] {
  const out: string[] = [];
  const re = /<li[^>]*data-type="taskItem"[^>]*data-checked="false"[^>]*>([\s\S]*?)<\/li>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html || ''))) {
    const text = stripTags(m[1]).replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&').trim();
    if (text) out.push(text);
  }
  return out;
}

/** Insert already-escaped HTML at the start or end of a note's body. */
export function joinHtml(existing: string, addition: string, where: 'start' | 'end'): string {
  if (!existing) return addition;
  return where === 'start' ? addition + existing : existing + addition;
}

/** "[2026-09-23 14:05] text" line for /inbox, in the given wall-clock time. */
export function stampedLine(text: string, when: string): string {
  return `[${when}] ${text}`;
}
