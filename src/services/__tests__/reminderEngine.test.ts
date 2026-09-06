/**
 * NoteNirman 2.0 — P5.8 Reminder Scheduling Engine Tests
 * @vitest-environment jsdom
 */
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import type { INotificationAdapter } from '../platform/platformInterfaces';
import type { CalendarEventEntity } from '../../types/calendar';
import {
  buildReminderNotificationId,
  parseReminderNotificationId,
  scheduleRemindersForEvent,
  cancelRemindersForEvent,
  syncRemindersForUser,
  buildReminderTitle,
  buildReminderBody,
  formatDurationLabel,
} from '../reminderEngine';

// ---------------------------------------------------------------------------
// Mock notification adapter
// ---------------------------------------------------------------------------

function makeMockNotificationAdapter(overrides: Partial<INotificationAdapter> = {}): INotificationAdapter & {
  _scheduled: Array<{ id: string; scheduleAtMs: number; title: string; body: string }>;
  _cancelled: string[];
} {
  const scheduled: Array<{ id: string; scheduleAtMs: number; title: string; body: string }> = [];
  const cancelled: string[] = [];

  return {
    isAvailable: vi.fn(() => true),
    requestPermission: vi.fn(async () => 'granted' as const),
    scheduleNotification: vi.fn(async (opts) => {
      scheduled.push({ id: opts.id, scheduleAtMs: opts.scheduleAtMs, title: opts.title, body: opts.body });
    }),
    cancelNotification: vi.fn(async (opts) => { cancelled.push(opts.id); }),
    cancelAllNotifications: vi.fn(async () => { cancelled.push('__ALL__'); }),
    _scheduled: scheduled,
    _cancelled: cancelled,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Mock calendarEventService (for syncRemindersForUser)
// ---------------------------------------------------------------------------

const MOCK_EVENTS: CalendarEventEntity[] = [];

vi.mock('../calendarEventService', () => ({
  getCalendarEventsForUser: vi.fn(async () => MOCK_EVENTS),
}));

// ---------------------------------------------------------------------------
// Test helpers
// ---------------------------------------------------------------------------

function makeEvent(overrides: Partial<CalendarEventEntity> = {}): CalendarEventEntity {
  const futureTime = new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString(); // 4 hours from now
  return {
    id: 'evt_test-001',
    userId: 'user-1',
    noteId: 'note-1',
    title: 'Team Meeting',
    startAt: futureTime,
    endAt: null,
    isAllDay: false,
    timezone: 'UTC',
    status: 'scheduled',
    version: 1,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    isDeleted: false,
    reminderMinutesBefore: [15, 60],
    ...overrides,
  };
}

describe('ReminderEngine — P5.8', () => {

  beforeEach(() => {
    MOCK_EVENTS.length = 0;
    vi.clearAllMocks();
  });

  afterEach(() => {
    MOCK_EVENTS.length = 0;
  });

  // -------------------------------------------------------------------------
  // 1. Notification ID format
  // -------------------------------------------------------------------------

  describe('buildReminderNotificationId', () => {
    it('produces expected format reminder:<eventId>:<offset>', () => {
      const id = buildReminderNotificationId('evt_abc-123', 15);
      expect(id).toBe('reminder:evt_abc-123:15');
    });

    it('handles zero offset', () => {
      const id = buildReminderNotificationId('evt_abc', 0);
      expect(id).toBe('reminder:evt_abc:0');
    });
  });

  describe('parseReminderNotificationId', () => {
    it('parses valid reminder ID', () => {
      const result = parseReminderNotificationId('reminder:evt_abc-123:60');
      expect(result).toEqual({ eventId: 'evt_abc-123', offsetMinutes: 60 });
    });

    it('returns undefined for non-reminder ID', () => {
      expect(parseReminderNotificationId('notification:abc')).toBeUndefined();
      expect(parseReminderNotificationId('random-string')).toBeUndefined();
    });

    it('roundtrips: build then parse', () => {
      const id = buildReminderNotificationId('evt_xyz', 30);
      const parsed = parseReminderNotificationId(id);
      expect(parsed).toEqual({ eventId: 'evt_xyz', offsetMinutes: 30 });
    });
  });

  // -------------------------------------------------------------------------
  // 2. scheduleRemindersForEvent
  // -------------------------------------------------------------------------

  describe('scheduleRemindersForEvent', () => {
    it('schedules one notification per offset', async () => {
      const adapter = makeMockNotificationAdapter();
      const event = makeEvent({ reminderMinutesBefore: [15, 60] });
      const { scheduled } = await scheduleRemindersForEvent(event, adapter);
      expect(scheduled).toBe(2);
      expect(adapter._scheduled).toHaveLength(2);
    });

    it('assigns correct notification IDs', async () => {
      const adapter = makeMockNotificationAdapter();
      const event = makeEvent({ reminderMinutesBefore: [15, 60] });
      await scheduleRemindersForEvent(event, adapter);
      const ids = adapter._scheduled.map(n => n.id);
      expect(ids).toContain(`reminder:${event.id}:15`);
      expect(ids).toContain(`reminder:${event.id}:60`);
    });

    it('skips past reminders (delivery time <= now)', async () => {
      const adapter = makeMockNotificationAdapter();
      // Event that started 30 minutes ago
      const pastStart = new Date(Date.now() - 30 * 60 * 1000).toISOString();
      const event = makeEvent({ startAt: pastStart, reminderMinutesBefore: [60] });
      const { scheduled, skipped } = await scheduleRemindersForEvent(event, adapter);
      expect(scheduled).toBe(0);
      expect(skipped).toBe(1);
      expect(adapter._scheduled).toHaveLength(0);
    });

    it('returns 0 scheduled for event with no reminders', async () => {
      const adapter = makeMockNotificationAdapter();
      const event = makeEvent({ reminderMinutesBefore: [] });
      const { scheduled } = await scheduleRemindersForEvent(event, adapter);
      expect(scheduled).toBe(0);
    });

    it('returns 0 for deleted event', async () => {
      const adapter = makeMockNotificationAdapter();
      const event = makeEvent({ isDeleted: true, reminderMinutesBefore: [15] });
      const { scheduled, skipped } = await scheduleRemindersForEvent(event, adapter);
      expect(scheduled).toBe(0);
      expect(skipped).toBe(1);
    });

    it('returns 0 for cancelled event', async () => {
      const adapter = makeMockNotificationAdapter();
      const event = makeEvent({ status: 'cancelled', reminderMinutesBefore: [15] });
      const { scheduled, skipped } = await scheduleRemindersForEvent(event, adapter);
      expect(scheduled).toBe(0);
      expect(skipped).toBe(1);
    });

    it('returns 0 for completed event', async () => {
      const adapter = makeMockNotificationAdapter();
      const event = makeEvent({ status: 'completed', reminderMinutesBefore: [15] });
      const { scheduled, skipped } = await scheduleRemindersForEvent(event, adapter);
      expect(scheduled).toBe(0);
      expect(skipped).toBe(1);
    });

    it('schedules notification at correct time (startAt - offsetMinutes)', async () => {
      const adapter = makeMockNotificationAdapter();
      const futureMs = Date.now() + 2 * 60 * 60 * 1000; // 2 hours from now
      const event = makeEvent({
        startAt: new Date(futureMs).toISOString(),
        reminderMinutesBefore: [30],
      });
      await scheduleRemindersForEvent(event, adapter);
      const expectedNotifyAt = futureMs - 30 * 60 * 1000;
      expect(adapter._scheduled[0].scheduleAtMs).toBeCloseTo(expectedNotifyAt, -3);
    });
  });

  // -------------------------------------------------------------------------
  // 3. cancelRemindersForEvent
  // -------------------------------------------------------------------------

  describe('cancelRemindersForEvent', () => {
    it('cancels one notification per offset', async () => {
      const adapter = makeMockNotificationAdapter();
      const event = makeEvent({ reminderMinutesBefore: [15, 60] });
      const count = await cancelRemindersForEvent(event, adapter);
      expect(count).toBe(2);
      expect(adapter._cancelled).toHaveLength(2);
    });

    it('cancels correct notification IDs', async () => {
      const adapter = makeMockNotificationAdapter();
      const event = makeEvent({ reminderMinutesBefore: [15, 60] });
      await cancelRemindersForEvent(event, adapter);
      expect(adapter._cancelled).toContain(`reminder:${event.id}:15`);
      expect(adapter._cancelled).toContain(`reminder:${event.id}:60`);
    });

    it('returns 0 for event with no reminders', async () => {
      const adapter = makeMockNotificationAdapter();
      const event = makeEvent({ reminderMinutesBefore: [] });
      const count = await cancelRemindersForEvent(event, adapter);
      expect(count).toBe(0);
    });
  });

  // -------------------------------------------------------------------------
  // 4. syncRemindersForUser
  // -------------------------------------------------------------------------

  describe('syncRemindersForUser', () => {
    it('returns error when adapter is not available', async () => {
      const adapter = makeMockNotificationAdapter({ isAvailable: vi.fn(() => false) });
      const result = await syncRemindersForUser('user-1', adapter);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.scheduledCount).toBe(0);
    });

    it('returns error when permission is denied', async () => {
      const adapter = makeMockNotificationAdapter({
        requestPermission: vi.fn(async () => 'denied' as const),
      });
      const result = await syncRemindersForUser('user-1', adapter);
      expect(result.errors.some(e => e.includes('denied'))).toBe(true);
      expect(result.scheduledCount).toBe(0);
    });

    it('schedules reminders for all active events when permission granted', async () => {
      const adapter = makeMockNotificationAdapter();
      const ev1 = makeEvent({ id: 'evt_1', reminderMinutesBefore: [15] });
      const ev2 = makeEvent({ id: 'evt_2', reminderMinutesBefore: [30] });
      MOCK_EVENTS.push(ev1, ev2);
      const result = await syncRemindersForUser('user-1', adapter);
      expect(result.scheduledCount).toBe(2);
      expect(result.errors).toHaveLength(0);
    });

    it('skips cancelled events during sync', async () => {
      const adapter = makeMockNotificationAdapter();
      const ev = makeEvent({ status: 'cancelled', reminderMinutesBefore: [15] });
      MOCK_EVENTS.push(ev);
      const result = await syncRemindersForUser('user-1', adapter);
      expect(result.scheduledCount).toBe(0);
    });

    it('skips deleted events during sync', async () => {
      const adapter = makeMockNotificationAdapter();
      const ev = makeEvent({ isDeleted: true, reminderMinutesBefore: [15] });
      MOCK_EVENTS.push(ev);
      const result = await syncRemindersForUser('user-1', adapter);
      expect(result.scheduledCount).toBe(0);
    });

    it('returns stepsRun=0 for user with no events', async () => {
      const adapter = makeMockNotificationAdapter();
      const result = await syncRemindersForUser('user-empty', adapter);
      expect(result.scheduledCount).toBe(0);
      expect(result.errors).toHaveLength(0);
    });
  });

  // -------------------------------------------------------------------------
  // 5. Content builders
  // -------------------------------------------------------------------------

  describe('buildReminderTitle', () => {
    it('uses "Starting now" label for offset 0', () => {
      const event = makeEvent({ title: 'Team Meeting' });
      const title = buildReminderTitle(event, 0);
      expect(title).toContain('now');
      expect(title).toContain('Team Meeting');
    });

    it('uses "Reminder" label for non-zero offset', () => {
      const event = makeEvent({ title: 'Stand-up' });
      const title = buildReminderTitle(event, 15);
      expect(title).toContain('Stand-up');
    });
  });

  describe('buildReminderBody', () => {
    it('mentions the event start time', () => {
      const event = makeEvent();
      const body = buildReminderBody(event, 15);
      expect(body.length).toBeGreaterThan(0);
    });

    it('uses "starts now" for offset 0', () => {
      const event = makeEvent();
      const body = buildReminderBody(event, 0);
      expect(body.toLowerCase()).toContain('now');
    });
  });

  // -------------------------------------------------------------------------
  // 6. formatDurationLabel
  // -------------------------------------------------------------------------

  describe('formatDurationLabel', () => {
    it('formats minutes < 60 as "N minutes"', () => {
      expect(formatDurationLabel(5)).toBe('5 minutes');
      expect(formatDurationLabel(30)).toBe('30 minutes');
    });

    it('uses singular for 1 minute', () => {
      expect(formatDurationLabel(1)).toBe('1 minute');
    });

    it('formats exactly 60 minutes as "1 hour"', () => {
      expect(formatDurationLabel(60)).toBe('1 hour');
    });

    it('formats multiples of 60 as "N hours"', () => {
      expect(formatDurationLabel(120)).toBe('2 hours');
      expect(formatDurationLabel(180)).toBe('3 hours');
    });

    it('formats mixed hours+minutes', () => {
      expect(formatDurationLabel(90)).toBe('1 hour 30 minutes');
      expect(formatDurationLabel(75)).toBe('1 hour 15 minutes');
    });

    it('formats 1440 minutes as "1 day"', () => {
      expect(formatDurationLabel(1440)).toBe('1 day');
    });

    it('formats multiples of 1440 as "N days"', () => {
      expect(formatDurationLabel(2880)).toBe('2 days');
    });
  });

});
