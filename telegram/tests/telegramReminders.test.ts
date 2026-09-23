import { describe, it, expect } from 'vitest';
import {
  formatLocal,
  isValidTimezone,
  parseWhen,
  startOfLocalDay,
  zonedTimeToUtc,
} from '../bot/_shared/reminderTime';
import { RATE_LIMIT, RATE_WINDOW_MS, checkRate } from '../bot/_shared/rateLimit';

// Wednesday 2026-09-23 10:00 in Asia/Kolkata (UTC+5:30) = 04:30 UTC.
const NOW = new Date('2026-09-23T04:30:00.000Z');
const IST = 'Asia/Kolkata';

describe('timezone helpers', () => {
  it('validates IANA names', () => {
    expect(isValidTimezone('Asia/Kolkata')).toBe(true);
    expect(isValidTimezone('Mars/Olympus')).toBe(false);
  });

  it('converts wall-clock time to UTC', () => {
    expect(zonedTimeToUtc(2026, 9, 23, 10, 0, IST).toISOString()).toBe('2026-09-23T04:30:00.000Z');
    expect(zonedTimeToUtc(2026, 9, 23, 10, 0, 'UTC').toISOString()).toBe('2026-09-23T10:00:00.000Z');
  });

  it('handles daylight saving time', () => {
    // London is UTC+1 in summer (BST) and UTC+0 in winter.
    expect(zonedTimeToUtc(2026, 7, 1, 9, 0, 'Europe/London').toISOString()).toBe('2026-07-01T08:00:00.000Z');
    expect(zonedTimeToUtc(2026, 12, 1, 9, 0, 'Europe/London').toISOString()).toBe('2026-12-01T09:00:00.000Z');
  });

  it('formats local time and finds the start of the local day', () => {
    expect(formatLocal(NOW, IST)).toBe('2026-09-23 10:00');
    expect(startOfLocalDay(NOW, IST).toISOString()).toBe('2026-09-22T18:30:00.000Z');
  });
});

describe('parseWhen', () => {
  const at = (input: string, tz = IST) => parseWhen(input, NOW, tz);

  it('parses relative times', () => {
    expect(at('in 30m call mom')).toEqual({ due: new Date('2026-09-23T05:00:00.000Z'), text: 'call mom' });
    expect(at('in 2 hours revise')?.due.toISOString()).toBe('2026-09-23T06:30:00.000Z');
    expect(at('in 3d exam')?.due.toISOString()).toBe('2026-09-26T04:30:00.000Z');
    expect(at('in 1 week x')?.due.toISOString()).toBe('2026-09-30T04:30:00.000Z');
  });

  it('parses tomorrow with and without a time', () => {
    expect(at('tomorrow 9am revise chapter 3')).toEqual({
      due: new Date('2026-09-24T03:30:00.000Z'),
      text: 'revise chapter 3',
    });
    expect(at('tomorrow 9:30pm x')?.due.toISOString()).toBe('2026-09-24T16:00:00.000Z');
    expect(at('tomorrow revise')).toEqual({ due: new Date('2026-09-24T03:30:00.000Z'), text: 'revise' });
  });

  it('parses today only when the time is still ahead', () => {
    expect(at('today 18:30 gym')?.due.toISOString()).toBe('2026-09-23T13:00:00.000Z');
    expect(at('today 9am too late')).toBeNull();
  });

  it('parses "at HH:mm" as today, or tomorrow if it has passed', () => {
    expect(at('at 21:00 dinner')?.due.toISOString()).toBe('2026-09-23T15:30:00.000Z');
    expect(at('at 8am breakfast')?.due.toISOString()).toBe('2026-09-24T02:30:00.000Z');
  });

  it('parses weekdays as the NEXT occurrence, never today', () => {
    expect(at('friday 5pm party')?.due.toISOString()).toBe('2026-09-25T11:30:00.000Z');
    expect(at('wed 5pm next week')?.due.toISOString()).toBe('2026-09-30T11:30:00.000Z');
  });

  it('parses ISO dates', () => {
    expect(at('2026-10-01 14:00 submit')).toEqual({ due: new Date('2026-10-01T08:30:00.000Z'), text: 'submit' });
    expect(at('2026-10-01 submit')?.due.toISOString()).toBe('2026-10-01T03:30:00.000Z');
    expect(at('2026-13-01 nope')).toBeNull();
  });

  it('does not mistake words for weekdays or numbers for times', () => {
    expect(at('monitor the lab')).toBeNull();
    expect(at('tomorrow 3 books')).toEqual({ due: new Date('2026-09-24T03:30:00.000Z'), text: '3 books' });
  });

  it('rejects the past, the unparseable, and reminders more than a year out', () => {
    expect(at('2020-01-01 10:00 old')).toBeNull();
    expect(at('')).toBeNull();
    expect(at('whenever')).toBeNull();
    expect(at('in 5x thing')).toBeNull();
    expect(at('2030-01-01 10:00 far')).toBeNull();
  });

  it('respects the user\'s timezone', () => {
    expect(at('tomorrow 9am x', 'UTC')?.due.toISOString()).toBe('2026-09-24T09:00:00.000Z');
  });
});

describe('rate limit', () => {
  it('allows up to the limit within a window, then blocks', () => {
    let state = null;
    for (let i = 0; i < RATE_LIMIT; i++) {
      const r = checkRate(state, 1000 + i);
      expect(r.allowed).toBe(true);
      state = r.next;
    }
    const blocked = checkRate(state, 2000);
    expect(blocked.allowed).toBe(false);
    expect(blocked.firstBlock).toBe(true);
    // The warning is sent once, not on every blocked message.
    expect(checkRate(blocked.next, 2001).firstBlock).toBe(false);
  });

  it('starts a fresh window after it expires', () => {
    let state = null;
    for (let i = 0; i < RATE_LIMIT + 5; i++) state = checkRate(state, 1000).next;
    const later = checkRate(state, 1000 + RATE_WINDOW_MS);
    expect(later.allowed).toBe(true);
    expect(later.next.count).toBe(1);
  });
});
