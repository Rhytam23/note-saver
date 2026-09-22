import { describe, it, expect } from 'vitest';
import type { Note } from '../../types';
import { extractWikiLinks, findBacklinks, resolveOutgoingLinks } from '../noteLinks';

const note = (id: string, title: string, content: string, extra: Partial<Note> = {}): Note =>
  ({
    id, title, content, tags: [], isPinned: false, priority: 'none',
    createdAt: '2026-09-21T00:00:00.000Z', updatedAt: '2026-09-21T00:00:00.000Z',
    ...extra,
  } as Note);

describe('extractWikiLinks', () => {
  it('finds links inside HTML and removes duplicates', () => {
    const html = '<p>See [[Photosynthesis]] and <strong>[[Cell Biology]]</strong>, then [[photosynthesis]] again.</p>';
    expect(extractWikiLinks(html)).toEqual(['Photosynthesis', 'Cell Biology']);
  });

  it('ignores empty, nested and unfinished brackets', () => {
    expect(extractWikiLinks('<p>[[ ]] [[a [[b]] [[unfinished</p>')).toEqual(['b']);
    expect(extractWikiLinks('')).toEqual([]);
  });

  it('collapses extra whitespace inside a link', () => {
    expect(extractWikiLinks('<p>[[  Newton   Laws ]]</p>')).toEqual(['Newton Laws']);
  });
});

describe('resolveOutgoingLinks', () => {
  it('points at existing notes case-insensitively and leaves unknown titles unresolved', () => {
    const a = note('a', 'Physics', '<p>[[newton laws]] and [[Optics]]</p>');
    const b = note('b', 'Newton Laws', '<p></p>');
    const links = resolveOutgoingLinks(a, [a, b]);

    expect(links).toHaveLength(2);
    expect(links[0].target?.id).toBe('b');
    expect(links[1].target).toBeUndefined();
  });

  it('does not link a note to itself or to deleted notes', () => {
    const a = note('a', 'Loop', '<p>[[Loop]] [[Gone]]</p>');
    const gone = note('g', 'Gone', '', { deleted: true });
    const links = resolveOutgoingLinks(a, [a, gone]);
    expect(links.every(l => l.target === undefined)).toBe(true);
  });
});

describe('findBacklinks', () => {
  it('lists the notes that link here, excluding itself and deleted notes', () => {
    const target = note('t', 'Photosynthesis', '<p>[[Photosynthesis]]</p>');
    const a = note('a', 'Biology', '<p>read [[photosynthesis]]</p>');
    const b = note('b', 'Chemistry', '<p>nothing</p>');
    const c = note('c', 'Old', '<p>[[Photosynthesis]]</p>', { deleted: true });

    expect(findBacklinks(target, [target, a, b, c]).map(n => n.id)).toEqual(['a']);
  });

  it('returns nothing for an untitled note', () => {
    const untitled = note('u', '  ', '');
    expect(findBacklinks(untitled, [untitled, note('a', 'x', '[[ ]]')])).toEqual([]);
  });
});
