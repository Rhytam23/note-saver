import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useSeason } from '../contexts/SeasonalContext';
import type { Note } from '../types';
import {
  getCalendarEventsForUser, createCalendarEvent, cancelCalendarEvent, completeCalendarEvent,
} from '../services/calendarEventService';
import { syncRemindersForUser } from '../services/reminderEngine';
import type { CalendarEventEntity } from '../types/calendar';
import { formatEventTime } from '../services/reminderEngine';

interface RemindersModalProps {
  userId: string;
  notes: Note[];
  onClose: () => void;
}

const REMINDER_OFFSETS = [10, 60, 24 * 60];
const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';

const toLocalInputValue = (date: Date): string => {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
};

const RemindersModal: React.FC<RemindersModalProps> = ({ userId, notes, onClose }) => {
  const { colors } = useSeason();
  const [events, setEvents] = useState<CalendarEventEntity[] | null>(null);
  const [title, setTitle] = useState('');
  const [noteId, setNoteId] = useState(notes[0]?.id ?? '');
  const [when, setWhen] = useState(() => toLocalInputValue(new Date(Date.now() + 60 * 60 * 1000)));
  const [notifyPermission, setNotifyPermission] = useState<NotificationPermission | 'unsupported'>(
    typeof Notification === 'undefined' ? 'unsupported' : Notification.permission
  );

  const refresh = useCallback(async () => {
    const all = await getCalendarEventsForUser(userId);
    setEvents(all.filter(e => e.status !== 'cancelled').sort((a, b) => a.startAt.localeCompare(b.startAt)));
  }, [userId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const requestPermission = async () => {
    if (typeof Notification === 'undefined') return;
    const result = await Notification.requestPermission();
    setNotifyPermission(result);
    void syncRemindersForUser(userId);
  };

  const upcoming = useMemo(
    () => (events ?? []).filter(e => e.status === 'scheduled'),
    [events]
  );
  const completed = useMemo(
    () => (events ?? []).filter(e => e.status === 'completed'),
    [events]
  );

  const addReminder = async () => {
    if (!title.trim() || !noteId) return;
    const startAt = new Date(when);
    if (Number.isNaN(startAt.getTime())) return;

    await createCalendarEvent({
      userId,
      noteId,
      title: title.trim(),
      startAt: startAt.toISOString(),
      isAllDay: false,
      timezone,
      reminderMinutesBefore: REMINDER_OFFSETS,
      status: 'scheduled',
    });
    setTitle('');
    await refresh();
    void syncRemindersForUser(userId);
  };

  const inputClass = `w-full px-2 py-1.5 rounded border bg-transparent text-sm ${colors.border}`;
  const buttonClass = `px-2 py-1 rounded border text-xs ${colors.border} ${colors.hover}`;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Reminders"
    >
      <div
        className={`w-full max-w-lg max-h-[85vh] overflow-y-auto rounded-xl border shadow-2xl p-5 ${colors.surface} ${colors.border} ${colors.primaryText}`}
        onClick={e => e.stopPropagation()}
        onKeyDown={e => e.key === 'Escape' && onClose()}
      >
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold">Reminders</h2>
          <button type="button" onClick={onClose} className={`px-2 py-1 rounded ${colors.hover}`} aria-label="Close">
            ✕
          </button>
        </div>

        {notifyPermission !== 'granted' && notifyPermission !== 'unsupported' && (
          <button type="button" onClick={requestPermission} className={`${buttonClass} mb-3`}>
            Turn on notifications
          </button>
        )}
        {notifyPermission === 'unsupported' && (
          <p className={`text-xs mb-3 ${colors.secondaryText}`}>
            This browser cannot show notifications; reminders will still be listed here.
          </p>
        )}
        <p className={`text-xs mb-4 ${colors.secondaryText}`}>
          Reminders fire while NoteNirman is open in a tab or the app. Keep it open, or check this list.
        </p>

        {notes.length > 0 && (
          <div className={`mb-5 p-3 rounded-lg border space-y-2 ${colors.border}`}>
            <p className={`text-sm font-medium ${colors.secondaryText}`}>New reminder</p>
            <input value={title} onChange={e => setTitle(e.target.value)} placeholder="What to remember" className={inputClass} />
            <div className="flex gap-2">
              <select value={noteId} onChange={e => setNoteId(e.target.value)} className={inputClass}>
                {notes.map(n => (
                  <option key={n.id} value={n.id}>{n.title || 'Untitled'}</option>
                ))}
              </select>
              <input type="datetime-local" value={when} onChange={e => setWhen(e.target.value)} className={inputClass} />
            </div>
            <button
              type="button"
              disabled={!title.trim()}
              onClick={() => void addReminder()}
              className="px-3 py-1.5 rounded text-sm font-semibold bg-accent text-primary-bg disabled:opacity-50"
            >
              Add reminder
            </button>
          </div>
        )}

        <h3 className={`text-sm font-semibold mb-2 ${colors.secondaryText}`}>Upcoming</h3>
        {events === null && <p className={colors.secondaryText}>Loading…</p>}
        {events !== null && upcoming.length === 0 && <p className={`text-sm ${colors.secondaryText}`}>Nothing coming up.</p>}
        <ul className="space-y-2 mb-4">
          {upcoming.map(event => (
            <li key={event.id} className={`p-3 rounded-lg border ${colors.border}`}>
              <p className="font-medium">{event.title}</p>
              <p className={`text-xs mb-2 ${colors.secondaryText}`}>{formatEventTime(event.startAt)}</p>
              <div className="flex gap-2">
                <button type="button" className={buttonClass} onClick={() => void completeCalendarEvent(event.id, userId).then(refresh)}>
                  Done
                </button>
                <button type="button" className={buttonClass} onClick={() => void cancelCalendarEvent(event.id, userId).then(refresh)}>
                  Cancel
                </button>
              </div>
            </li>
          ))}
        </ul>

        {completed.length > 0 && (
          <details>
            <summary className={`text-sm cursor-pointer ${colors.secondaryText}`}>Completed ({completed.length})</summary>
            <ul className="mt-2 space-y-1">
              {completed.map(event => (
                <li key={event.id} className={`text-sm line-through ${colors.secondaryText}`}>{event.title}</li>
              ))}
            </ul>
          </details>
        )}
      </div>
    </div>
  );
};

export default RemindersModal;
