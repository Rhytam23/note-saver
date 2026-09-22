import type { Note } from '../types';

export interface Flashcard {
  id: string;
  noteId: string;
  noteTitle: string;
  question: string;
  answer: string;
}

export interface CardState {
  ease: number;
  intervalDays: number;
  reps: number;
  dueAt: number;
}

export type Grade = 'again' | 'hard' | 'good' | 'easy';

const DAY_MS = 24 * 60 * 60 * 1000;
const AGAIN_DELAY_MS = 10 * 60 * 1000;
const MIN_EASE = 1.3;
const NEW_CARDS_PER_SESSION = 20;

function htmlToLines(html: string): string[] {
  return (html || '')
    .replace(/<\/(p|li|h[1-6]|div|tr|blockquote)>/gi, '\n')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .split('\n')
    .map(line => line.trim())
    .filter(Boolean);
}

function hash(text: string): string {
  let h = 5381;
  for (let i = 0; i < text.length; i++) h = ((h << 5) + h + text.charCodeAt(i)) | 0;
  return (h >>> 0).toString(36);
}

/** Cards written as "Question:: Answer", one per line. */
export function extractFlashcards(note: Note): Flashcard[] {
  if (note.deleted) return [];
  const cards: Flashcard[] = [];
  const seen = new Set<string>();

  for (const line of htmlToLines(note.content)) {
    const split = line.indexOf('::');
    if (split <= 0) continue;
    const question = line.slice(0, split).trim();
    const answer = line.slice(split + 2).trim();
    if (!question || !answer) continue;

    const id = `${note.id}:${hash(question.toLowerCase())}`;
    if (seen.has(id)) continue;
    seen.add(id);
    cards.push({ id, noteId: note.id, noteTitle: note.title, question, answer });
  }
  return cards;
}

export function extractAllFlashcards(notes: Note[]): Flashcard[] {
  return notes.flatMap(extractFlashcards);
}

export function newCardState(now: number): CardState {
  return { ease: 2.5, intervalDays: 0, reps: 0, dueAt: now };
}

/** A simplified SM-2 schedule: forgetting resets the card, remembering pushes it further out. */
export function scheduleReview(state: CardState, grade: Grade, now: number): CardState {
  if (grade === 'again') {
    return { ease: Math.max(MIN_EASE, state.ease - 0.2), intervalDays: 0, reps: 0, dueAt: now + AGAIN_DELAY_MS };
  }

  let intervalDays: number;
  if (state.reps === 0) {
    intervalDays = grade === 'easy' ? 4 : 1;
  } else if (state.reps === 1) {
    intervalDays = grade === 'hard' ? 3 : grade === 'easy' ? 8 : 6;
  } else if (grade === 'hard') {
    intervalDays = Math.max(1, Math.round(state.intervalDays * 1.2));
  } else if (grade === 'good') {
    intervalDays = Math.max(1, Math.round(state.intervalDays * state.ease));
  } else {
    intervalDays = Math.max(1, Math.round(state.intervalDays * state.ease * 1.3));
  }

  const easeChange = grade === 'hard' ? -0.15 : grade === 'easy' ? 0.15 : 0;
  return {
    ease: Math.max(MIN_EASE, state.ease + easeChange),
    intervalDays,
    reps: state.reps + 1,
    dueAt: now + intervalDays * DAY_MS,
  };
}

/** Cards to study now: everything due, plus a limited number of new cards. */
export function selectSession(cards: Flashcard[], states: Record<string, CardState>, now: number): Flashcard[] {
  const due: Flashcard[] = [];
  const fresh: Flashcard[] = [];
  for (const card of cards) {
    const state = states[card.id];
    if (!state) fresh.push(card);
    else if (state.dueAt <= now) due.push(card);
  }
  due.sort((a, b) => states[a.id].dueAt - states[b.id].dueAt);
  return [...due, ...fresh.slice(0, NEW_CARDS_PER_SESSION)];
}
