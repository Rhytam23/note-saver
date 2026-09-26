import { describe, it, expect } from 'vitest';
import {
  BREAK_MINUTES,
  DEFAULT_FOCUS_MINUTES,
  FOCUS_PRESETS,
  MAX_FOCUS_MINUTES,
  MIN_FOCUS_MINUTES,
  durationSeconds,
  formatClock,
  freshSnapshot,
  parseFocusMinutes,
  restoreSnapshot,
  serialiseSnapshot,
} from '../focusTimer';

describe('formatClock', () => {
  it('shows mm:ss under an hour and h:mm:ss from an hour up', () => {
    expect(formatClock(25 * 60)).toBe('25:00');
    expect(formatClock(65)).toBe('01:05');
    expect(formatClock(0)).toBe('00:00');
    expect(formatClock(60 * 60)).toBe('1:00:00');
    expect(formatClock(100 * 60)).toBe('1:40:00');
    expect(formatClock(3600 + 5)).toBe('1:00:05');
  });

  it('never shows a negative or fractional time', () => {
    expect(formatClock(-5)).toBe('00:00');
    expect(formatClock(59.9)).toBe('00:59');
  });
});

describe('parseFocusMinutes', () => {
  it('accepts plain minutes, with or without a unit', () => {
    expect(parseFocusMinutes('90')).toBe(90);
    expect(parseFocusMinutes(' 100 ')).toBe(100);
    expect(parseFocusMinutes('45 min')).toBe(45);
    expect(parseFocusMinutes('45m')).toBe(45);
    expect(parseFocusMinutes('60 minutes')).toBe(60);
  });

  it('accepts hours:minutes', () => {
    expect(parseFocusMinutes('1:30')).toBe(90);
    expect(parseFocusMinutes('2:00')).toBe(120);
    expect(parseFocusMinutes('0:45')).toBe(45);
  });

  it('rejects empty, zero, too long and non-numeric input', () => {
    for (const bad of ['', '   ', '0', '0:00', '601', '1:75', 'abc', '-5', '1.5', '9999', '90 hours']) {
      expect(parseFocusMinutes(bad), bad).toBeNull();
    }
    expect(parseFocusMinutes(String(MIN_FOCUS_MINUTES))).toBe(MIN_FOCUS_MINUTES);
    expect(parseFocusMinutes(String(MAX_FOCUS_MINUTES))).toBe(MAX_FOCUS_MINUTES);
  });

  it('every offered preset is itself a valid length, and includes 60, 80, 90 and 100', () => {
    for (const p of FOCUS_PRESETS) expect(parseFocusMinutes(String(p))).toBe(p);
    for (const wanted of [60, 80, 90, 100]) expect(FOCUS_PRESETS).toContain(wanted);
  });
});

describe('durationSeconds', () => {
  it('uses the chosen focus length and a fixed break', () => {
    expect(durationSeconds('focus', 90)).toBe(5400);
    expect(durationSeconds('break', 90)).toBe(BREAK_MINUTES * 60);
  });
});

describe('saving and restoring the timer', () => {
  const NOW = 1_800_000_000_000;

  it('starts fresh with nothing saved, or with junk saved', () => {
    for (const raw of [null, '', 'not json', '42', 'null', '"x"']) {
      expect(restoreSnapshot(raw, NOW)).toEqual(freshSnapshot());
    }
    expect(freshSnapshot().remaining).toBe(DEFAULT_FOCUS_MINUTES * 60);
  });

  it('keeps a paused timer exactly as it was left', () => {
    const raw = serialiseSnapshot({ phase: 'focus', focusMinutes: 90, running: false, endsAt: null, remaining: 4000 });
    expect(restoreSnapshot(raw, NOW)).toEqual({ phase: 'focus', focusMinutes: 90, running: false, endsAt: null, remaining: 4000 });
  });

  it('resumes a running countdown from its end time, so time passes while the panel is closed', () => {
    const raw = serialiseSnapshot({ phase: 'focus', focusMinutes: 90, running: true, endsAt: NOW + 30 * 60_000, remaining: 5000 });
    const s = restoreSnapshot(raw, NOW + 10 * 60_000); // 10 minutes later
    expect(s.running).toBe(true);
    expect(s.endsAt).toBe(NOW + 30 * 60_000);
    expect(s.remaining).toBe(20 * 60);
  });

  it('a countdown that finished while away comes back as the next phase, stopped', () => {
    const raw = serialiseSnapshot({ phase: 'focus', focusMinutes: 60, running: true, endsAt: NOW, remaining: 10 });
    const s = restoreSnapshot(raw, NOW + 5_000);
    expect(s).toEqual({ phase: 'break', focusMinutes: 60, running: false, endsAt: null, remaining: BREAK_MINUTES * 60 });

    const raw2 = serialiseSnapshot({ phase: 'break', focusMinutes: 60, running: true, endsAt: NOW, remaining: 10 });
    expect(restoreSnapshot(raw2, NOW + 5_000)).toEqual({ phase: 'focus', focusMinutes: 60, running: false, endsAt: null, remaining: 3600 });
  });

  it('never trusts saved numbers: out-of-range length, time longer than the phase, or a far-future end', () => {
    expect(restoreSnapshot(JSON.stringify({ phase: 'focus', focusMinutes: 100000, remaining: 60 }), NOW).focusMinutes).toBe(DEFAULT_FOCUS_MINUTES);
    expect(restoreSnapshot(JSON.stringify({ phase: 'focus', focusMinutes: 25, remaining: 999999 }), NOW).remaining).toBe(25 * 60);
    expect(restoreSnapshot(JSON.stringify({ phase: 'focus', focusMinutes: 25, endsAt: NOW + 99 * 3600_000 }), NOW).remaining).toBe(25 * 60);
    expect(restoreSnapshot(JSON.stringify({ phase: 'weird', focusMinutes: 25, remaining: 30 }), NOW).phase).toBe('focus');
  });

  it('does not save an end time for a paused timer', () => {
    const raw = serialiseSnapshot({ phase: 'focus', focusMinutes: 25, running: false, endsAt: NOW + 1000, remaining: 500 });
    expect(JSON.parse(raw).endsAt).toBeNull();
  });
});
