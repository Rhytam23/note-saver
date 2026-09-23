import { describe, it, expect } from 'vitest';
import {
  ARCHIVE_TAG,
  LIST_TTL_MS,
  appendTask,
  applyFilter,
  extractOpenTasks,
  formatNoteLine,
  isLocked,
  joinHtml,
  matchTitle,
  normalisePriority,
  normaliseTag,
  paginate,
  parseListArgs,
  parseTarget,
  pickByNumber,
  sortNotes,
  withTag,
  withoutTag,
  type BotNote,
} from '../bot/_shared/notesLogic';
import { LOCK_PREFIX } from '../../src/services/noteLock';
import { NOTE_TEMPLATES, taskList } from '../../src/services/noteTemplates';

const note = (over: Partial<BotNote> & { id: string }): BotNote => ({
  title: over.id,
  tags: [],
  is_pinned: false,
  priority: 'none',
  created_at: '2026-09-01T00:00:00.000Z',
  updated_at: '2026-09-01T00:00:00.000Z',
  locked: false,
  ...over,
});

describe('telegram note ordering and filtering', () => {
  const notes = [
    note({ id: 'plain-old', updated_at: '2026-09-01T00:00:00.000Z' }),
    note({ id: 'plain-new', updated_at: '2026-09-20T00:00:00.000Z' }),
    note({ id: 'high', priority: 'high', updated_at: '2026-09-02T00:00:00.000Z' }),
    note({ id: 'low', priority: 'low', updated_at: '2026-09-25T00:00:00.000Z' }),
    note({ id: 'pinned', is_pinned: true, updated_at: '2026-08-01T00:00:00.000Z' }),
    note({ id: 'arch', tags: [ARCHIVE_TAG, 'exam'], updated_at: '2026-09-30T00:00:00.000Z' }),
  ];

  it('orders pinned, then priority, then recency', () => {
    const order = sortNotes(applyFilter(notes, { kind: 'all' })).map(n => n.id);
    expect(order).toEqual(['pinned', 'high', 'low', 'plain-new', 'plain-old']);
  });

  it('hides archived notes everywhere except the archived filter', () => {
    expect(applyFilter(notes, { kind: 'all' }).some(n => n.id === 'arch')).toBe(false);
    expect(applyFilter(notes, { kind: 'tag', value: 'exam' })).toHaveLength(0);
    expect(applyFilter(notes, { kind: 'archived' }).map(n => n.id)).toEqual(['arch']);
  });

  it('filters by priority, pinned and tag', () => {
    expect(applyFilter(notes, { kind: 'priority', value: 'high' }).map(n => n.id)).toEqual(['high']);
    expect(applyFilter(notes, { kind: 'pinned' }).map(n => n.id)).toEqual(['pinned']);
    const tagged = [...notes, note({ id: 't', tags: ['Exam'] })];
    expect(applyFilter(tagged, { kind: 'tag', value: 'exam' }).map(n => n.id)).toEqual(['t']);
  });

  it('parses /notes arguments', () => {
    expect(parseListArgs('')).toEqual({ filter: { kind: 'all' }, page: 1 });
    expect(parseListArgs('high 2')).toEqual({ filter: { kind: 'priority', value: 'high' }, page: 2 });
    expect(parseListArgs('3')).toEqual({ filter: { kind: 'all' }, page: 3 });
    expect(parseListArgs('pinned')).toEqual({ filter: { kind: 'pinned' }, page: 1 });
    expect(parseListArgs('archived')).toEqual({ filter: { kind: 'archived' }, page: 1 });
    expect(parseListArgs('#Exam')).toEqual({ filter: { kind: 'tag', value: 'exam' }, page: 1 });
  });

  it('paginates and clamps out-of-range pages', () => {
    const items = Array.from({ length: 23 }, (_, i) => i);
    expect(paginate(items, 1)).toMatchObject({ pages: 3, offset: 0 });
    expect(paginate(items, 3).slice).toEqual([20, 21, 22]);
    expect(paginate(items, 99).page).toBe(3);
    expect(paginate([], 1)).toMatchObject({ pages: 1, slice: [] });
  });

  it('formats list lines with pin, priority, lock and archive markers', () => {
    expect(formatNoteLine(1, note({ id: 'a', title: 'Physics', is_pinned: true, priority: 'high' }))).toBe('1. 📌 🔴 Physics');
    expect(formatNoteLine(2, note({ id: 'b', title: 'Secret', locked: true }))).toBe('2. 🔒 Secret');
    expect(formatNoteLine(3, note({ id: 'c', title: '  ' }))).toBe('3. (untitled)');
    expect(formatNoteLine(4, note({ id: 'd', title: 'Old', tags: [ARCHIVE_TAG] }))).toBe('4. 🗄 Old');
  });

  it('understands priority words', () => {
    expect(normalisePriority('HIGH')).toBe('high');
    expect(normalisePriority('med')).toBe('medium');
    expect(normalisePriority('off')).toBe('none');
    expect(normalisePriority('urgent')).toBeNull();
  });
});

describe('telegram note targets', () => {
  const now = 1_000_000_000_000;

  it('parses numbers and titles', () => {
    expect(parseTarget('  3 ')).toEqual({ kind: 'number', n: 3 });
    expect(parseTarget('Physics 101')).toEqual({ kind: 'title', text: 'Physics 101' });
    expect(parseTarget('')).toEqual({ kind: 'none' });
  });

  it('resolves a number against the last list', () => {
    const memory = { ids: ['a', 'b', 'c'], at: now };
    expect(pickByNumber(memory, 2, now + 1000)).toEqual({ ok: true, id: 'b' });
    expect(pickByNumber(memory, 4, now)).toEqual({ ok: false, reason: 'range' });
    expect(pickByNumber(memory, 0, now)).toEqual({ ok: false, reason: 'range' });
  });

  it('refuses a stale or missing list instead of acting on the wrong note', () => {
    expect(pickByNumber(null, 1, now)).toEqual({ ok: false, reason: 'no-list' });
    expect(pickByNumber({ ids: [], at: now }, 1, now)).toEqual({ ok: false, reason: 'no-list' });
    expect(pickByNumber({ ids: ['a'], at: now }, 1, now + LIST_TTL_MS + 1)).toEqual({ ok: false, reason: 'expired' });
  });

  it('prefers an exact title, then a single partial match, otherwise reports ambiguity', () => {
    const cands = [{ title: 'Physics' }, { title: 'Physics revision' }, { title: 'Chemistry' }];
    expect(matchTitle(cands, 'physics')).toEqual({ kind: 'one', note: cands[0] });
    expect(matchTitle(cands, 'chem')).toEqual({ kind: 'one', note: cands[2] });
    expect(matchTitle(cands, 'revision')).toEqual({ kind: 'one', note: cands[1] });
    expect(matchTitle(cands, 'phys').kind).toBe('many');
    expect(matchTitle(cands, 'biology')).toEqual({ kind: 'none' });
    expect(matchTitle(cands, '  ')).toEqual({ kind: 'none' });
  });
});

describe('telegram tags', () => {
  it('normalises and rejects bad tags', () => {
    expect(normaliseTag('#Exam')).toBe('exam');
    expect(normaliseTag('two words')).toBeNull();
    expect(normaliseTag('x'.repeat(31))).toBeNull();
    expect(normaliseTag('')).toBeNull();
  });

  it('adds and removes tags without duplicating', () => {
    expect(withTag(['a'], 'b')).toEqual(['a', 'b']);
    expect(withTag(['Exam'], 'exam')).toEqual(['Exam']);
    expect(withoutTag(['a', 'Archived', 'b'], 'archived')).toEqual(['a', 'b']);
  });
});

describe('telegram HTML edits', () => {
  it('detects locked notes with the same prefix the app uses', () => {
    expect(isLocked(`${LOCK_PREFIX}abc`)).toBe(true);
    expect(isLocked('<p>hello</p>')).toBe(false);
    expect(isLocked(null)).toBe(false);
  });

  it('writes task items in the exact shape the editor expects', () => {
    expect(appendTask('', 'Finish worksheet')).toBe(taskList(['Finish worksheet']));
  });

  it('extends a trailing task list instead of starting a second one', () => {
    const once = appendTask('<p>Intro</p>', 'one');
    const twice = appendTask(once, 'two');
    expect(twice.match(/<ul data-type="taskList">/g)).toHaveLength(1);
    expect(extractOpenTasks(twice)).toEqual(['one', 'two']);
  });

  it('starts a new task list when the note does not end with one', () => {
    const html = appendTask(appendTask('', 'one') + '<p>Notes</p>', 'two');
    expect(html.match(/<ul data-type="taskList">/g)).toHaveLength(2);
  });

  it('escapes task text', () => {
    expect(appendTask('', '<img src=x onerror=alert(1)>')).not.toContain('<img');
  });

  it('only lists unchecked tasks', () => {
    const html =
      '<ul data-type="taskList"><li data-type="taskItem" data-checked="true"><p>done</p></li>' +
      '<li data-type="taskItem" data-checked="false"><p>open &amp; more</p></li></ul>';
    expect(extractOpenTasks(html)).toEqual(['open & more']);
  });

  it('joins text at the start or end', () => {
    expect(joinHtml('<p>b</p>', '<p>a</p>', 'start')).toBe('<p>a</p><p>b</p>');
    expect(joinHtml('<p>a</p>', '<p>b</p>', 'end')).toBe('<p>a</p><p>b</p>');
    expect(joinHtml('', '<p>a</p>', 'end')).toBe('<p>a</p>');
  });

  it('exposes the app templates the /template command lists', () => {
    expect(NOTE_TEMPLATES.length).toBeGreaterThan(0);
    for (const t of NOTE_TEMPLATES) expect(t.title.length).toBeGreaterThan(0);
  });
});
