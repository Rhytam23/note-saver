import React, { useEffect, useRef, useState } from 'react';
import { useSeason } from '../../contexts/SeasonalContext';

type Phase = 'focus' | 'break';
const DURATION_SECONDS: Record<Phase, number> = { focus: 25 * 60, break: 5 * 60 };

export function formatClock(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

/** 25 minute focus and 5 minute break timer. Uses wall-clock time so background throttling cannot slow it. */
const PomodoroTimer: React.FC = () => {
  const { colors } = useSeason();
  const [phase, setPhase] = useState<Phase>('focus');
  const [remaining, setRemaining] = useState(DURATION_SECONDS.focus);
  const [running, setRunning] = useState(false);
  const endsAtRef = useRef<number>(0);
  const phaseRef = useRef<Phase>('focus');
  phaseRef.current = phase;

  useEffect(() => {
    if (!running) return;
    endsAtRef.current = Date.now() + remaining * 1000;

    const id = window.setInterval(() => {
      const left = Math.max(0, Math.round((endsAtRef.current - Date.now()) / 1000));
      setRemaining(left);
      if (left === 0) {
        window.clearInterval(id);
        setRunning(false);
        const finished = phaseRef.current;
        const next: Phase = finished === 'focus' ? 'break' : 'focus';
        setPhase(next);
        setRemaining(DURATION_SECONDS[next]);
        try {
          if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
            new Notification(finished === 'focus' ? 'Focus session done. Take a break.' : 'Break over. Ready to focus?');
          }
        } catch {
          // Notifications are optional.
        }
      }
    }, 500);
    return () => window.clearInterval(id);
    // Restart the interval only when the run state flips, not on every tick.
    // (remaining is intentionally excluded from the dependency array for that reason.)
  }, [running]);

  const reset = () => {
    setRunning(false);
    setRemaining(DURATION_SECONDS[phase]);
  };

  const buttonClass = `px-3 py-1.5 rounded border text-sm ${colors.border} ${colors.hover}`;

  return (
    <div>
      <h3 className={`text-sm font-semibold mb-2 ${colors.secondaryText}`}>Focus timer</h3>
      <div className={`flex items-center justify-between gap-3 p-3 rounded-lg border ${colors.border}`}>
        <div>
          <p className={`text-2xl font-mono tabular-nums ${colors.primaryText}`}>{formatClock(remaining)}</p>
          <p className={`text-xs ${colors.secondaryText}`}>{phase === 'focus' ? 'Focus' : 'Break'}</p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            className={buttonClass}
            onClick={() => {
              if (!running && typeof Notification !== 'undefined' && Notification.permission === 'default') {
                void Notification.requestPermission();
              }
              setRunning(r => !r);
            }}
          >
            {running ? 'Pause' : 'Start'}
          </button>
          <button type="button" className={buttonClass} onClick={reset}>Reset</button>
        </div>
      </div>
    </div>
  );
};

export default PomodoroTimer;
