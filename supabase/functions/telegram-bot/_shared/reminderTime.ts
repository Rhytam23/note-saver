// Natural-language reminder times for /remind, resolved in the user's IANA
// timezone. Pure (Intl only), so it can be unit-tested under Vitest.

export interface ParsedWhen {
  due: Date;
  /** Whatever followed the time expression: the reminder text. */
  text: string;
}

export function isValidTimezone(tz: string): boolean {
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

interface LocalParts {
  y: number;
  m: number;
  d: number;
  h: number;
  mi: number;
  weekday: number; // 0 = Sunday
}

const WEEKDAYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];

function localParts(date: Date, tz: string): LocalParts {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: tz,
    hourCycle: 'h23',
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
    weekday: 'short',
  }).formatToParts(date);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? '0';
  return {
    y: parseInt(get('year'), 10),
    m: parseInt(get('month'), 10),
    d: parseInt(get('day'), 10),
    h: parseInt(get('hour'), 10) % 24,
    mi: parseInt(get('minute'), 10),
    weekday: WEEKDAYS.indexOf(get('weekday').slice(0, 3).toLowerCase()),
  };
}

function tzOffsetMs(at: Date, tz: string): number {
  const p = localParts(at, tz);
  const asUtc = Date.UTC(p.y, p.m - 1, p.d, p.h, p.mi);
  return asUtc - Math.floor(at.getTime() / 60000) * 60000;
}

/** Wall-clock time in `tz` -> UTC instant. Handles DST by re-checking the offset once. */
export function zonedTimeToUtc(y: number, m: number, d: number, h: number, mi: number, tz: string): Date {
  const guess = Date.UTC(y, m - 1, d, h, mi);
  const first = guess - tzOffsetMs(new Date(guess), tz);
  return new Date(guess - tzOffsetMs(new Date(first), tz));
}

/** "YYYY-MM-DD HH:mm" in the given timezone. */
export function formatLocal(date: Date, tz: string): string {
  const p = localParts(date, tz);
  const two = (n: number) => String(n).padStart(2, '0');
  return `${p.y}-${two(p.m)}-${two(p.d)} ${two(p.h)}:${two(p.mi)}`;
}

/** Start of "today" (00:00 in tz) as a UTC instant. */
export function startOfLocalDay(now: Date, tz: string): Date {
  const p = localParts(now, tz);
  return zonedTimeToUtc(p.y, p.m, p.d, 0, 0, tz);
}

interface TimeOfDay {
  h: number;
  mi: number;
  rest: string;
}

/** "9am", "9:30pm", "21:00". A bare number is NOT a time (too easy to confuse with text). */
function parseTimeOfDay(input: string): TimeOfDay | null {
  const m = input.trim().match(/^(\d{1,2})(?::(\d{2}))?\s*(am|pm)?(?=\s|$)\s*([\s\S]*)$/i);
  if (!m) return null;
  const meridiem = m[3]?.toLowerCase();
  if (!meridiem && m[2] === undefined) return null;
  let h = parseInt(m[1], 10);
  const mi = m[2] ? parseInt(m[2], 10) : 0;
  if (mi > 59) return null;
  if (meridiem) {
    if (h < 1 || h > 12) return null;
    if (meridiem === 'pm' && h < 12) h += 12;
    if (meridiem === 'am' && h === 12) h = 0;
  } else if (h > 23) {
    return null;
  }
  return { h, mi, rest: m[4].trim() };
}

const UNIT_MS: Record<string, number> = {
  m: 60_000, min: 60_000, mins: 60_000, minute: 60_000, minutes: 60_000,
  h: 3_600_000, hr: 3_600_000, hrs: 3_600_000, hour: 3_600_000, hours: 3_600_000,
  d: 86_400_000, day: 86_400_000, days: 86_400_000,
  w: 604_800_000, week: 604_800_000, weeks: 604_800_000,
};

export const MAX_REMINDER_AHEAD_MS = 366 * 86_400_000;

/**
 * Returns null when the time can't be understood or is already in the past.
 * The caller asks the user to rephrase in either case.
 */
export function parseWhen(input: string, now: Date, tz: string): ParsedWhen | null {
  const text = input.trim();
  if (!text) return null;

  const done = (due: Date, rest: string): ParsedWhen | null =>
    due.getTime() > now.getTime() && due.getTime() - now.getTime() <= MAX_REMINDER_AHEAD_MS
      ? { due, text: rest.trim() }
      : null;

  // in 30m / in 2 hours / in 3d
  const rel = text.match(/^in\s+(\d{1,4})\s*([a-z]+)\b\s*([\s\S]*)$/i);
  if (rel) {
    const unit = UNIT_MS[rel[2].toLowerCase()];
    if (!unit) return null;
    return done(new Date(now.getTime() + parseInt(rel[1], 10) * unit), rel[3]);
  }

  // 2026-10-01 or 2026-10-01 14:00
  const iso = text.match(/^(\d{4})-(\d{2})-(\d{2})(?:[ t](\d{1,2}:\d{2}))?\s*([\s\S]*)$/i);
  if (iso) {
    const y = parseInt(iso[1], 10);
    const m = parseInt(iso[2], 10);
    const d = parseInt(iso[3], 10);
    if (m < 1 || m > 12 || d < 1 || d > 31) return null;
    let h = 9;
    let mi = 0;
    const rest = iso[5];
    if (iso[4]) {
      const t = parseTimeOfDay(iso[4]);
      if (!t) return null;
      h = t.h;
      mi = t.mi;
    }
    return done(zonedTimeToUtc(y, m, d, h, mi, tz), rest);
  }

  const local = localParts(now, tz);
  const atDay = (offsetDays: number, h: number, mi: number): Date => {
    const shifted = new Date(Date.UTC(local.y, local.m - 1, local.d + offsetDays));
    return zonedTimeToUtc(shifted.getUTCFullYear(), shifted.getUTCMonth() + 1, shifted.getUTCDate(), h, mi, tz);
  };

  // today / tomorrow / friday [at] 5pm
  // Whole words only: "monitor the lab" must not be read as Monday.
  const day = text.match(
    /^(today|tomorrow|sunday|sun|monday|mon|tuesday|tues|tue|wednesday|wed|thursday|thurs|thu|friday|fri|saturday|sat)\b\s*(?:at\s+)?([\s\S]*)$/i,
  );
  if (day) {
    const word = day[1].toLowerCase();
    let h = 9;
    let mi = 0;
    let rest = day[2];
    const t = parseTimeOfDay(day[2]);
    if (t) {
      h = t.h;
      mi = t.mi;
      rest = t.rest;
    }
    let offset: number;
    if (word === 'today') offset = 0;
    else if (word === 'tomorrow') offset = 1;
    else {
      offset = (WEEKDAYS.indexOf(word.slice(0, 3)) - local.weekday + 7) % 7;
      if (offset === 0) offset = 7;
    }
    return done(atDay(offset, h, mi), rest);
  }

  // at 21:00 -> today if still ahead, otherwise tomorrow
  const at = text.match(/^at\s+([\s\S]*)$/i);
  if (at) {
    const t = parseTimeOfDay(at[1]);
    if (!t) return null;
    let due = atDay(0, t.h, t.mi);
    if (due.getTime() <= now.getTime()) due = atDay(1, t.h, t.mi);
    return done(due, t.rest);
  }

  return null;
}
