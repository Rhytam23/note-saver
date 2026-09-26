/**
 * Pure logic for the focus timer, kept out of the component so it can be unit tested:
 * choosing a session length, formatting the clock, and saving/restoring the timer so a
 * countdown survives the editor panel being closed or another note being opened.
 */

export type Phase = 'focus' | 'break';

export const DEFAULT_FOCUS_MINUTES = 25;
export const BREAK_MINUTES = 5;
export const MIN_FOCUS_MINUTES = 1;
export const MAX_FOCUS_MINUTES = 600; // 10 hours
/** Offered as one-tap choices when the user clicks the clock. */
export const FOCUS_PRESETS = [25, 45, 60, 80, 90, 100, 120];
export const STORAGE_KEY = 'notenirman-focus-timer-v1';

export function durationSeconds(phase: Phase, focusMinutes: number): number {
  return (phase === 'focus' ? focusMinutes : BREAK_MINUTES) * 60;
}

/** mm:ss, or h:mm:ss from one hour up ("1:40:00" reads better than "100:00"). */
export function formatClock(totalSeconds: number): string {
  const t = Math.max(0, Math.floor(totalSeconds));
  const h = Math.floor(t / 3600);
  const m = Math.floor((t % 3600) / 60);
  const s = t % 60;
  const pad = (n: number) => String(n).padStart(2, '0');
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
}

/**
 * Turns what the user typed into whole minutes, or null if it is not a usable length.
 * Accepts "90", "90 min" / "90m" and "1:30" (hours:minutes).
 */
export function parseFocusMinutes(input: string): number | null {
  const text = input.trim().toLowerCase().replace(/\s*(minutes?|mins?|m)$/, '');
  let minutes: number;
  const hm = /^(\d{1,2}):([0-5]?\d)$/.exec(text);
  if (hm) minutes = Number(hm[1]) * 60 + Number(hm[2]);
  else if (/^\d{1,3}$/.test(text)) minutes = Number(text);
  else return null;
  return minutes >= MIN_FOCUS_MINUTES && minutes <= MAX_FOCUS_MINUTES ? minutes : null;
}

export interface TimerSnapshot {
  phase: Phase;
  focusMinutes: number;
  running: boolean;
  /** Epoch ms when the running countdown ends; null while paused. */
  endsAt: number | null;
  /** Seconds left. While running this is recomputed from endsAt. */
  remaining: number;
}

export function freshSnapshot(focusMinutes = DEFAULT_FOCUS_MINUTES): TimerSnapshot {
  return { phase: 'focus', focusMinutes, running: false, endsAt: null, remaining: durationSeconds('focus', focusMinutes) };
}

export function serialiseSnapshot(s: TimerSnapshot): string {
  return JSON.stringify({ phase: s.phase, focusMinutes: s.focusMinutes, endsAt: s.running ? s.endsAt : null, remaining: s.remaining });
}

/**
 * Restores a saved timer. Anything malformed falls back to a fresh 25 minute timer. A countdown that
 * ran out while the panel was closed comes back as the next phase, stopped, so nothing is left ticking.
 */
export function restoreSnapshot(raw: string | null, now: number): TimerSnapshot {
  if (!raw) return freshSnapshot();
  let data: any;
  try {
    data = JSON.parse(raw);
  } catch {
    return freshSnapshot();
  }
  if (!data || typeof data !== 'object') return freshSnapshot();

  const focusMinutes =
    Number.isInteger(data.focusMinutes) && data.focusMinutes >= MIN_FOCUS_MINUTES && data.focusMinutes <= MAX_FOCUS_MINUTES
      ? data.focusMinutes
      : DEFAULT_FOCUS_MINUTES;
  const phase: Phase = data.phase === 'break' ? 'break' : 'focus';
  const full = durationSeconds(phase, focusMinutes);

  if (typeof data.endsAt === 'number' && Number.isFinite(data.endsAt)) {
    const left = Math.round((data.endsAt - now) / 1000);
    if (left > 0) return { phase, focusMinutes, running: true, endsAt: data.endsAt, remaining: Math.min(left, full) };
    const next: Phase = phase === 'focus' ? 'break' : 'focus';
    return { phase: next, focusMinutes, running: false, endsAt: null, remaining: durationSeconds(next, focusMinutes) };
  }

  const remaining = Number.isFinite(data.remaining) ? Math.min(Math.max(1, Math.round(data.remaining)), full) : full;
  return { phase, focusMinutes, running: false, endsAt: null, remaining };
}
