import React, { useEffect, useRef, useState } from 'react';
import { useSeason } from '../../contexts/SeasonalContext';
import {
  BREAK_MINUTES,
  FOCUS_PRESETS,
  MAX_FOCUS_MINUTES,
  MIN_FOCUS_MINUTES,
  STORAGE_KEY,
  durationSeconds,
  formatClock,
  parseFocusMinutes,
  restoreSnapshot,
  serialiseSnapshot,
  type Phase,
} from './focusTimer';

export { formatClock };

function readSaved(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

function writeSaved(value: string): void {
  try {
    localStorage.setItem(STORAGE_KEY, value);
  } catch {
    // Private mode or full storage: the timer still works, it just will not survive closing the panel.
  }
}

/**
 * Focus and break timer. Click the time to choose how long to focus (25 by default; 60, 80, 90, 100 and
 * more are one tap away, or type any number of minutes). It counts against the wall clock, so background
 * throttling cannot slow it, and it is saved so a countdown survives closing the panel or opening another note.
 */
const PomodoroTimer: React.FC = () => {
  const { colors } = useSeason();
  const [saved] = useState(() => restoreSnapshot(readSaved(), Date.now()));
  const [phase, setPhase] = useState<Phase>(saved.phase);
  const [focusMinutes, setFocusMinutes] = useState(saved.focusMinutes);
  const [remaining, setRemaining] = useState(saved.remaining);
  const [running, setRunning] = useState(saved.running);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');
  const [error, setError] = useState('');

  // A restored countdown keeps its original end time; a fresh start computes one when it begins.
  const endsAtRef = useRef<number | null>(saved.endsAt);
  const phaseRef = useRef<Phase>(phase);
  phaseRef.current = phase;
  const focusMinutesRef = useRef(focusMinutes);
  focusMinutesRef.current = focusMinutes;

  useEffect(() => {
    if (!running) return;
    if (endsAtRef.current === null) endsAtRef.current = Date.now() + remaining * 1000;

    const tick = () => {
      const left = Math.max(0, Math.round(((endsAtRef.current ?? 0) - Date.now()) / 1000));
      setRemaining(left);
      if (left === 0) {
        window.clearInterval(id);
        endsAtRef.current = null;
        setRunning(false);
        const finished = phaseRef.current;
        const next: Phase = finished === 'focus' ? 'break' : 'focus';
        setPhase(next);
        setRemaining(durationSeconds(next, focusMinutesRef.current));
        try {
          if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
            new Notification(finished === 'focus' ? 'Focus session done. Take a break.' : 'Break over. Ready to focus?');
          }
        } catch {
          // Notifications are optional.
        }
      }
    };
    const id = window.setInterval(tick, 500);
    return () => window.clearInterval(id);
    // Restart the interval only when the run state flips, not on every tick.
    // (remaining is intentionally excluded from the dependency array for that reason.)
  }, [running]);

  // Save whenever something the user did changes. While running, the end time (not the per-second
  // remaining value) is what is stored, so this does not write to storage every tick.
  useEffect(() => {
    writeSaved(serialiseSnapshot({ phase, focusMinutes, running, endsAt: endsAtRef.current, remaining }));
  }, [phase, focusMinutes, running, running ? 0 : remaining]);

  const canEdit = !running && phase === 'focus';

  const applyMinutes = (minutes: number) => {
    endsAtRef.current = null;
    setFocusMinutes(minutes);
    setRemaining(minutes * 60);
    setEditing(false);
    setError('');
  };

  const submitDraft = () => {
    const minutes = parseFocusMinutes(draft);
    if (minutes === null) {
      setError(`Enter ${MIN_FOCUS_MINUTES} to ${MAX_FOCUS_MINUTES} minutes, for example 90 or 1:30.`);
      return;
    }
    applyMinutes(minutes);
  };

  const toggleRun = () => {
    if (!running && typeof Notification !== 'undefined' && Notification.permission === 'default') {
      void Notification.requestPermission();
    }
    if (running) {
      // Pausing: freeze the exact time left, then forget the end time.
      const left = Math.max(1, Math.round(((endsAtRef.current ?? Date.now()) - Date.now()) / 1000));
      endsAtRef.current = null;
      setRemaining(left);
    } else {
      setEditing(false);
    }
    setRunning(r => !r);
  };

  const reset = () => {
    endsAtRef.current = null;
    setRunning(false);
    setRemaining(durationSeconds(phase, focusMinutes));
  };

  const buttonClass = `px-3 py-1.5 rounded border text-sm ${colors.border} ${colors.hover}`;
  const chipClass = (active: boolean) =>
    `px-2.5 py-1 rounded-full border text-xs ${colors.border} ${active ? 'bg-accent text-gray-950 border-transparent' : colors.hover}`;

  return (
    <div>
      <h3 className={`text-sm font-semibold mb-2 ${colors.secondaryText}`}>Focus timer</h3>
      <div className={`p-3 rounded-lg border ${colors.border}`}>
        <div className="flex items-center justify-between gap-3">
          <div>
            <button
              type="button"
              disabled={!canEdit}
              onClick={() => {
                setDraft(String(focusMinutes));
                setError('');
                setEditing(e => !e);
              }}
              title={canEdit ? 'Click to set how long you want to focus' : undefined}
              aria-label={canEdit ? `${formatClock(remaining)}. Click to change the focus length` : formatClock(remaining)}
              className={`text-2xl font-mono tabular-nums text-left ${colors.primaryText} ${
                canEdit ? 'underline decoration-dotted underline-offset-4 cursor-pointer' : 'cursor-default'
              }`}
            >
              {formatClock(remaining)}
            </button>
            <p className={`text-xs ${colors.secondaryText}`}>
              {phase === 'focus' ? `Focus · ${focusMinutes} min` : `Break · ${BREAK_MINUTES} min`}
            </p>
          </div>
          <div className="flex gap-2">
            <button type="button" className={buttonClass} onClick={toggleRun}>
              {running ? 'Pause' : 'Start'}
            </button>
            <button type="button" className={buttonClass} onClick={reset}>Reset</button>
          </div>
        </div>

        {editing && canEdit && (
          <div className="mt-3 pt-3 border-t border-inherit space-y-2">
            <label className={`block text-xs ${colors.secondaryText}`} htmlFor="focus-minutes">
              Focus length in minutes
            </label>
            <div className="flex gap-2">
              <input
                id="focus-minutes"
                autoFocus
                inputMode="numeric"
                autoComplete="off"
                value={draft}
                onChange={e => {
                  setDraft(e.target.value);
                  setError('');
                }}
                onKeyDown={e => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    submitDraft();
                  } else if (e.key === 'Escape') {
                    setEditing(false);
                  }
                }}
                placeholder="e.g. 90"
                className={`w-24 px-2 py-1.5 rounded border bg-transparent font-mono text-sm ${colors.border} ${colors.primaryText}`}
              />
              <button type="button" className={buttonClass} onClick={submitDraft}>Set</button>
            </div>
            <div className="flex flex-wrap gap-1.5" role="group" aria-label="Common focus lengths">
              {FOCUS_PRESETS.map(m => (
                <button key={m} type="button" className={chipClass(m === focusMinutes)} onClick={() => applyMinutes(m)}>
                  {m}
                </button>
              ))}
            </div>
            {error && <p className="text-xs text-red-500" role="alert">{error}</p>}
          </div>
        )}
      </div>
    </div>
  );
};

export default PomodoroTimer;
