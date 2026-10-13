import type { Note } from '../types';

const WIKI_LINK = /\[\[([^[\]\n]{1,120}?)\]\]/g;

function stripTags(html: string, replacement: string): string {
  let out = html;
  let prev: string;
  do {
    prev = out;
    out = out.replace(/<[^>]*>/g, replacement);
  } while (out !== prev);
  return out;
}

function htmlToText(html: string): string {
  return stripTags(html, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, '&');
}

const normalise = (title: string): string => title.trim().replace(/\s+/g, ' ').toLowerCase();

/** Titles written as [[Title]] in a note, without duplicates, in order of first appearance. */
export function extractWikiLinks(html: string): string[] {
  const seen = new Set<string>();
  const titles: string[] = [];
  const text = htmlToText(html || '');

  for (const match of text.matchAll(WIKI_LINK)) {
    const title = match[1].trim().replace(/\s+/g, ' ');
    const key = normalise(title);
    if (key && !seen.has(key)) {
      seen.add(key);
      titles.push(title);
    }
  }
  return titles;
}

export interface OutgoingLink {
  title: string;
  /** The note this title points to, or undefined if no note has that title yet. */
  target?: Note;
}

function liveNotes(notes: Note[]): Note[] {
  return notes.filter(n => !n.deleted);
}

export function resolveOutgoingLinks(note: Note, notes: Note[]): OutgoingLink[] {
  const candidates = liveNotes(notes).filter(n => n.id !== note.id);
  return extractWikiLinks(note.content).map(title => ({
    title,
    target: candidates.find(n => normalise(n.title) === normalise(title)),
  }));
}

/** Notes that link to this note's title with [[Title]]. */
export function findBacklinks(note: Note, notes: Note[]): Note[] {
  const key = normalise(note.title);
  if (!key) return [];
  return liveNotes(notes).filter(
    other => other.id !== note.id && extractWikiLinks(other.content).some(title => normalise(title) === key)
  );
}
