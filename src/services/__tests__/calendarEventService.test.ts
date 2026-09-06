/**
 * NoteNirman 2.0 — P5.6 Calendar Event Service Tests
 * @vitest-environment jsdom
 */
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import type { CalendarEventEntity } from '../../types/calendar';

// ---------------------------------------------------------------------------
// Mock localDb
// ---------------------------------------------------------------------------
const calStore = new Map<string, CalendarEventEntity>();
const syncQueue: Array<{userId: string; entity: string; entityId: string; action: string; baseVersion: number}> = [];

vi.mock('../localDb', () => ({
  putCalendarEvent: vi.fn(async (ev: CalendarEventEntity) => { calStore.set(ev.id, ev); }),
  getCalendarEvent: vi.fn(async (id: string) => calStore.get(id)),
  getCalendarEventsForUser: vi.fn(async (userId: string, includeDeleted = false) => {
    const all = Array.from(calStore.values()).filter(e => e.userId === userId);
    return includeDeleted ? all : all.filter(e => !e.isDeleted);
  }),
  getCalendarEventsForNote: vi.fn(async (noteId: string) =>
    Array.from(calStore.values()).filter(e => e.noteId === noteId && !e.isDeleted)
  ),
  deleteCalendarEventHard: vi.fn(async (id: string) => { calStore.delete(id); }),
  enqueueOp: vi.fn(async (op: any) => { syncQueue.push(op); return { ...op, opId: `op-${Date.now()}`, attempts: 0, nextRetryAt: 0, createdAt: Date.now() }; }),
}));

import {
  createCalendarEvent,
  getCalendarEventsForUser,
  getCalendarEventsForNote,
  getCalendarEvent,
  getCalendarEventsOnDate,
  getCalendarEventsInRange,
  updateCalendarEvent,
  deleteCalendarEvent,
  completeCalendarEvent,
  cancelCalendarEvent,
  validateCreateInput,
} from '../calendarEventService';
import type { CreateCalendarEventInput } from '../../types/calendar';

// ---------------------------------------------------------------------------
// Test helpers
// ---------------------------------------------------------------------------

const makeInput = (overrides: Partial<CreateCalendarEventInput> = {}): CreateCalendarEventInput => ({
  userId: 'user-1',
  noteId: 'note-1',
  title: 'Team Meeting',
  startAt: '2026-09-01T09:00:00.000Z',
  endAt: '2026-09-01T10:00:00.000Z',
  isAllDay: false,
  timezone: 'Asia/Kolkata',
  ...overrides,
});

describe('CalendarEventService — P5.6', () => {

  beforeEach(() => {
    calStore.clear();
    syncQueue.length = 0;
    vi.clearAllMocks();
  });

  afterEach(() => {
    calStore.clear();
    syncQueue.length = 0;
  });

  // -------------------------------------------------------------------------
  // 1. createCalendarEvent
  // -------------------------------------------------------------------------

  describe('createCalendarEvent', () => {
    it('creates an event with evt_ prefixed ID', async () => {
      const event = await createCalendarEvent(makeInput());
      expect(event.id).toMatch(/^evt_/);
    });

    it('persists event to localDb', async () => {
      const event = await createCalendarEvent(makeInput());
      const stored = calStore.get(event.id);
      expect(stored).toBeDefined();
      expect(stored!.title).toBe('Team Meeting');
    });

    it('enqueues a upsert SyncOp with entity=calendar_event', async () => {
      const event = await createCalendarEvent(makeInput());
      const op = syncQueue.find(o => o.entityId === event.id);
      expect(op).toBeDefined();
      expect(op!.entity).toBe('calendar_event');
      expect(op!.action).toBe('upsert');
      expect(op!.baseVersion).toBe(0);
    });

    it('sets version=0 on creation', async () => {
      const event = await createCalendarEvent(makeInput());
      expect(event.version).toBe(0);
    });

    it('sets isDeleted=false on creation', async () => {
      const event = await createCalendarEvent(makeInput());
      expect(event.isDeleted).toBe(false);
    });

    it('stores userId, noteId, startAt, timezone correctly', async () => {
      const event = await createCalendarEvent(makeInput());
      expect(event.userId).toBe('user-1');
      expect(event.noteId).toBe('note-1');
      expect(event.startAt).toBe('2026-09-01T09:00:00.000Z');
      expect(event.timezone).toBe('Asia/Kolkata');
    });

    it('stores optional blockId when provided', async () => {
      const event = await createCalendarEvent(makeInput({ blockId: 'blk-123' }));
      expect(event.blockId).toBe('blk-123');
    });

    it('stores reminderMinutesBefore when provided', async () => {
      const event = await createCalendarEvent(makeInput({ reminderMinutesBefore: [15, 60] }));
      expect(event.reminderMinutesBefore).toEqual([15, 60]);
    });

    it('stores recurrenceRule when provided', async () => {
      const event = await createCalendarEvent(makeInput({ recurrenceRule: 'FREQ=WEEKLY;BYDAY=MO' }));
      expect(event.recurrenceRule).toBe('FREQ=WEEKLY;BYDAY=MO');
    });

    it('defaults status to scheduled', async () => {
      const event = await createCalendarEvent(makeInput());
      expect(event.status).toBe('scheduled');
    });

    it('accepts explicit status override', async () => {
      const event = await createCalendarEvent(makeInput({ status: 'completed' }));
      expect(event.status).toBe('completed');
    });
  });

  // -------------------------------------------------------------------------
  // 2. getCalendarEventsForUser
  // -------------------------------------------------------------------------

  describe('getCalendarEventsForUser', () => {
    it('returns only events for the specified user', async () => {
      await createCalendarEvent(makeInput({ userId: 'user-1' }));
      await createCalendarEvent(makeInput({ userId: 'user-2', title: 'Other User Event' }));
      const events = await getCalendarEventsForUser('user-1');
      expect(events.every(e => e.userId === 'user-1')).toBe(true);
      expect(events.length).toBe(1);
    });

    it('excludes soft-deleted events', async () => {
      const ev = await createCalendarEvent(makeInput());
      await deleteCalendarEvent(ev.id, 'user-1');
      const events = await getCalendarEventsForUser('user-1');
      expect(events.find(e => e.id === ev.id)).toBeUndefined();
    });

    it('returns empty array for user with no events', async () => {
      const events = await getCalendarEventsForUser('user-nonexistent');
      expect(events).toHaveLength(0);
    });
  });

  // -------------------------------------------------------------------------
  // 3. getCalendarEventsForNote
  // -------------------------------------------------------------------------

  describe('getCalendarEventsForNote', () => {
    it('returns events for specified note', async () => {
      await createCalendarEvent(makeInput({ noteId: 'note-A' }));
      await createCalendarEvent(makeInput({ noteId: 'note-B', title: 'B Event' }));
      const events = await getCalendarEventsForNote('note-A');
      expect(events.every(e => e.noteId === 'note-A')).toBe(true);
    });

    it('excludes deleted events', async () => {
      const ev = await createCalendarEvent(makeInput({ noteId: 'note-del' }));
      await deleteCalendarEvent(ev.id, 'user-1');
      const events = await getCalendarEventsForNote('note-del');
      expect(events.find(e => e.id === ev.id)).toBeUndefined();
    });
  });

  // -------------------------------------------------------------------------
  // 4. getCalendarEvent
  // -------------------------------------------------------------------------

  describe('getCalendarEvent', () => {
    it('returns event by ID', async () => {
      const created = await createCalendarEvent(makeInput());
      const found = await getCalendarEvent(created.id);
      expect(found?.id).toBe(created.id);
    });

    it('returns undefined for non-existent ID', async () => {
      const found = await getCalendarEvent('evt_nonexistent');
      expect(found).toBeUndefined();
    });
  });

  // -------------------------------------------------------------------------
  // 5. getCalendarEventsOnDate
  // -------------------------------------------------------------------------

  describe('getCalendarEventsOnDate', () => {
    it('returns events starting on the given UTC date', async () => {
      await createCalendarEvent(makeInput({ startAt: '2026-09-01T09:00:00.000Z' }));
      await createCalendarEvent(makeInput({ startAt: '2026-09-02T09:00:00.000Z', title: 'Different Day' }));
      const events = await getCalendarEventsOnDate('user-1', new Date('2026-09-01'));
      expect(events.length).toBe(1);
      expect(events[0].startAt).toContain('2026-09-01');
    });

    it('returns empty for a day with no events', async () => {
      await createCalendarEvent(makeInput({ startAt: '2026-09-01T09:00:00.000Z' }));
      const events = await getCalendarEventsOnDate('user-1', new Date('2026-12-25'));
      expect(events).toHaveLength(0);
    });
  });

  // -------------------------------------------------------------------------
  // 6. getCalendarEventsInRange
  // -------------------------------------------------------------------------

  describe('getCalendarEventsInRange', () => {
    it('returns events within the date range', async () => {
      await createCalendarEvent(makeInput({ startAt: '2026-09-01T10:00:00.000Z' }));
      await createCalendarEvent(makeInput({ startAt: '2026-09-05T10:00:00.000Z', title: 'Mid range' }));
      await createCalendarEvent(makeInput({ startAt: '2026-09-15T10:00:00.000Z', title: 'Out of range' }));
      const events = await getCalendarEventsInRange(
        'user-1',
        new Date('2026-09-01T00:00:00.000Z'),
        new Date('2026-09-07T23:59:59.999Z')
      );
      expect(events.length).toBe(2);
    });
  });

  // -------------------------------------------------------------------------
  // 7. updateCalendarEvent
  // -------------------------------------------------------------------------

  describe('updateCalendarEvent', () => {
    it('updates title and bumps version', async () => {
      const ev = await createCalendarEvent(makeInput());
      const updated = await updateCalendarEvent(ev.id, 'user-1', { title: 'Updated Title' });
      expect(updated?.title).toBe('Updated Title');
      expect(updated?.version).toBe(ev.version + 1);
    });

    it('enqueues a upsert SyncOp on update', async () => {
      const ev = await createCalendarEvent(makeInput());
      syncQueue.length = 0; // Clear creation op
      await updateCalendarEvent(ev.id, 'user-1', { title: 'New Title' });
      const op = syncQueue.find(o => o.entityId === ev.id && o.action === 'upsert');
      expect(op).toBeDefined();
    });

    it('preserves noteId and userId as immutable', async () => {
      const ev = await createCalendarEvent(makeInput());
      const updated = await updateCalendarEvent(ev.id, 'user-1', {
        title: 'Changed',
      });
      expect(updated?.noteId).toBe(ev.noteId);
      expect(updated?.userId).toBe(ev.userId);
    });

    it('returns undefined for wrong userId (ownership check)', async () => {
      const ev = await createCalendarEvent(makeInput());
      const result = await updateCalendarEvent(ev.id, 'user-WRONG', { title: 'Hack' });
      expect(result).toBeUndefined();
    });

    it('returns undefined for non-existent event', async () => {
      const result = await updateCalendarEvent('evt_fake', 'user-1', { title: 'X' });
      expect(result).toBeUndefined();
    });
  });

  // -------------------------------------------------------------------------
  // 8. deleteCalendarEvent (soft delete)
  // -------------------------------------------------------------------------

  describe('deleteCalendarEvent', () => {
    it('marks event as isDeleted=true', async () => {
      const ev = await createCalendarEvent(makeInput());
      await deleteCalendarEvent(ev.id, 'user-1');
      const stored = calStore.get(ev.id);
      expect(stored?.isDeleted).toBe(true);
      expect(stored?.deletedAt).toBeDefined();
    });

    it('enqueues a delete SyncOp', async () => {
      const ev = await createCalendarEvent(makeInput());
      syncQueue.length = 0;
      await deleteCalendarEvent(ev.id, 'user-1');
      const op = syncQueue.find(o => o.entityId === ev.id && o.action === 'delete');
      expect(op).toBeDefined();
      expect(op!.entity).toBe('calendar_event');
    });

    it('returns false for wrong userId', async () => {
      const ev = await createCalendarEvent(makeInput());
      const result = await deleteCalendarEvent(ev.id, 'user-WRONG');
      expect(result).toBe(false);
    });

    it('returns false for non-existent event', async () => {
      const result = await deleteCalendarEvent('evt_fake', 'user-1');
      expect(result).toBe(false);
    });

    it('event is excluded from getCalendarEventsForUser after soft-delete', async () => {
      const ev = await createCalendarEvent(makeInput());
      await deleteCalendarEvent(ev.id, 'user-1');
      const events = await getCalendarEventsForUser('user-1');
      expect(events.find(e => e.id === ev.id)).toBeUndefined();
    });
  });

  // -------------------------------------------------------------------------
  // 9. completeCalendarEvent / cancelCalendarEvent
  // -------------------------------------------------------------------------

  describe('completeCalendarEvent', () => {
    it('sets status to completed', async () => {
      const ev = await createCalendarEvent(makeInput());
      const completed = await completeCalendarEvent(ev.id, 'user-1');
      expect(completed?.status).toBe('completed');
    });
  });

  describe('cancelCalendarEvent', () => {
    it('sets status to cancelled', async () => {
      const ev = await createCalendarEvent(makeInput());
      const cancelled = await cancelCalendarEvent(ev.id, 'user-1');
      expect(cancelled?.status).toBe('cancelled');
    });
  });

  // -------------------------------------------------------------------------
  // 10. validateCreateInput
  // -------------------------------------------------------------------------

  describe('validateCreateInput', () => {
    it('returns no errors for valid input', () => {
      const errors = validateCreateInput(makeInput());
      expect(errors).toHaveLength(0);
    });

    it('requires userId', () => {
      const errors = validateCreateInput(makeInput({ userId: '' }));
      expect(errors.some(e => e.includes('userId'))).toBe(true);
    });

    it('requires noteId', () => {
      const errors = validateCreateInput(makeInput({ noteId: '' }));
      expect(errors.some(e => e.includes('noteId'))).toBe(true);
    });

    it('requires title', () => {
      const errors = validateCreateInput(makeInput({ title: '' }));
      expect(errors.some(e => e.includes('title'))).toBe(true);
    });

    it('requires startAt', () => {
      const errors = validateCreateInput(makeInput({ startAt: '' }));
      expect(errors.some(e => e.includes('startAt'))).toBe(true);
    });

    it('requires timezone', () => {
      const errors = validateCreateInput(makeInput({ timezone: '' }));
      expect(errors.some(e => e.includes('timezone'))).toBe(true);
    });

    it('rejects invalid ISO 8601 startAt', () => {
      const errors = validateCreateInput(makeInput({ startAt: 'not-a-date' }));
      expect(errors.some(e => e.includes('ISO 8601'))).toBe(true);
    });

    it('rejects endAt before startAt', () => {
      const errors = validateCreateInput(makeInput({
        startAt: '2026-09-01T10:00:00.000Z',
        endAt: '2026-09-01T09:00:00.000Z',
      }));
      expect(errors.some(e => e.includes('endAt'))).toBe(true);
    });

    it('rejects negative reminderMinutesBefore values', () => {
      const errors = validateCreateInput(makeInput({ reminderMinutesBefore: [-5, 15] }));
      expect(errors.some(e => e.includes('reminderMinutesBefore'))).toBe(true);
    });

    it('accepts zero reminderMinutesBefore (immediate)', () => {
      const errors = validateCreateInput(makeInput({ reminderMinutesBefore: [0] }));
      expect(errors).toHaveLength(0);
    });
  });

});
