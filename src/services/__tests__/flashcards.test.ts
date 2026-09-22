import { describe, it, expect } from 'vitest';
import type { Note } from '../../types';
import {
  extractFlashcards, extractAllFlashcards, newCardState, scheduleReview, selectSession, type CardState,
} from '../flashcards';

const note = (id: string, content: string, extra: Partial<Note> = {}): Note =>
  ({
    id, title: 'Biology', content, tags: [], isPinned: false, priority: 'none',
    createdAt: '2026-09-21T00:00:00.000Z', updatedAt: '2026-09-21T00:00:00.000Z', ...extra,
  } as Note);

const NOW = new Date('2026-09-22T09:00:00.000Z').getTime();
const DAY = 24 * 60 * 60 * 1000;

describe('extractFlashcards', () => {
  it('reads Question:: Answer lines from paragraphs and list items', () => {
    const cards = extractFlashcards(note('n1',
      '<p>Powerhouse of the cell:: Mitochondria</p><ul><li><p>Unit of heredity:: Gene</p></li></ul><p>just a sentence</p>'));
    expect(cards.map(c => [c.question, c.answer])).toEqual([
      ['Powerhouse of the cell', 'Mitochondria'],
      ['Unit of heredity', 'Gene'],
    ]);
  });

  it('keeps answers that contain colons and skips incomplete lines', () => {
    const cards = extractFlashcards(note('n1', '<p>Ratio:: 3:1</p><p>:: no question</p><p>No answer::</p>'));
    expect(cards).toHaveLength(1);
    expect(cards[0].answer).toBe('3:1');
  });

  it('gives the same card the same id every time, and skips duplicates and deleted notes', () => {
    const n = note('n1', '<p>A:: 1</p><p>a:: 2</p>');
    expect(extractFlashcards(n)).toHaveLength(1);
    expect(extractFlashcards(n)[0].id).toBe(extractFlashcards(n)[0].id);
    expect(extractAllFlashcards([note('d', '<p>Q:: A</p>', { deleted: true })])).toEqual([]);
  });
});

describe('scheduleReview', () => {
  it('sends a forgotten card back within minutes and lowers its ease', () => {
    const next = scheduleReview({ ease: 2.5, intervalDays: 10, reps: 5, dueAt: NOW }, 'again', NOW);
    expect(next.reps).toBe(0);
    expect(next.dueAt - NOW).toBeLessThan(DAY);
    expect(next.ease).toBeCloseTo(2.3);
  });

  it('spaces a remembered card further apart each time', () => {
    let state: CardState = newCardState(NOW);
    const gaps: number[] = [];
    for (let i = 0; i < 4; i++) {
      state = scheduleReview(state, 'good', NOW);
      gaps.push(state.intervalDays);
    }
    expect(gaps[0]).toBe(1);
    expect(gaps[1]).toBe(6);
    expect(gaps[2]).toBeGreaterThan(gaps[1]);
    expect(gaps[3]).toBeGreaterThan(gaps[2]);
  });

  it('never lets ease fall below the floor', () => {
    let state: CardState = newCardState(NOW);
    for (let i = 0; i < 20; i++) state = scheduleReview(state, 'again', NOW);
    expect(state.ease).toBeGreaterThanOrEqual(1.3);
  });

  it('easy grows intervals faster than good, hard slower', () => {
    const base: CardState = { ease: 2.5, intervalDays: 10, reps: 3, dueAt: NOW };
    const hard = scheduleReview(base, 'hard', NOW).intervalDays;
    const good = scheduleReview(base, 'good', NOW).intervalDays;
    const easy = scheduleReview(base, 'easy', NOW).intervalDays;
    expect(hard).toBeLessThan(good);
    expect(good).toBeLessThan(easy);
  });
});

describe('selectSession', () => {
  const card = (n: number) => ({ id: `c${n}`, noteId: 'n', noteTitle: 't', question: `q${n}`, answer: `a${n}` });

  it('returns due cards first, then new cards, and skips cards not yet due', () => {
    const cards = [card(1), card(2), card(3)];
    const states: Record<string, CardState> = {
      c1: { ease: 2.5, intervalDays: 1, reps: 1, dueAt: NOW - DAY },
      c2: { ease: 2.5, intervalDays: 6, reps: 2, dueAt: NOW + 3 * DAY },
    };
    expect(selectSession(cards, states, NOW).map(c => c.id)).toEqual(['c1', 'c3']);
  });

  it('limits new cards per session', () => {
    const cards = Array.from({ length: 50 }, (_, i) => card(i));
    expect(selectSession(cards, {}, NOW)).toHaveLength(20);
  });
});
