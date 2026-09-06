import { v4 as uuidv4 } from 'uuid';
import type { CalendarEventEntity, CreateCalendarEventInput, UpdateCalendarEventInput } from '../types/calendar';
import * as localDb from './localDb';

/**
 * NoteNirman 2.0 Phase 5 — Calendar & Temporal Metadata Service (P5.6)
 *
 * Manages authoritative user-created calendar events, reminders, and due dates
 * attached to notes and blocks.
 *
 * IMPORTANT DISTINCTIONS:
 * - This service manages INTERNAL NoteNirman calendar events persisted locally
 *   and synchronized via syncEngine.ts.
 * - The existing calendarService.ts reads EXTERNAL Google Calendar events via OAuth.
 *   These are separate, complementary concerns. calendarService.ts is NOT replaced.
 *
 * Architecture Invariants Preserved:
 * 1. No second sync engine — mutations enqueue SyncOps into localDb.syncQueue.
 * 2. syncEngine.ts remains the sole synchronization authority.
 * 3. No IDB `blocks` store — Note.content remains canonical.
 * 4. Soft deletion — events are marked isDeleted=true before hard-delete on sync.
 * 5. UTC timestamps — all dates stored as epoch ms (updatedAt) or ISO 8601 UTC (startAt/endAt).
 *
 * RFC 5545 Recurrence:
 * - recurrenceRule stores RRULE strings directly.
 * - Recurrence expansion is derived/computed on-demand and NOT persisted.
 * - The `rrule` npm package handles expansion (installed in P5.9/P5.10 when needed).
 */

// ---------------------------------------------------------------------------
// Event ID generation
// ---------------------------------------------------------------------------

function generateEventId(): string {
  return `evt_${uuidv4()}`;
}

// ---------------------------------------------------------------------------
// Create
// ---------------------------------------------------------------------------

/**
 * Create a new authoritative calendar event and enqueue for sync.
 */
export async function createCalendarEvent(
  input: CreateCalendarEventInput
): Promise<CalendarEventEntity> {
  const now = Date.now();
  const event: CalendarEventEntity = {
    id: generateEventId(),
    userId: input.userId,
    noteId: input.noteId,
    blockId: input.blockId ?? null,
    title: input.title,
    description: input.description ?? null,
    startAt: input.startAt,
    endAt: input.endAt ?? null,
    isAllDay: input.isAllDay,
    timezone: input.timezone,
    recurrenceRule: input.recurrenceRule ?? null,
    reminderMinutesBefore: input.reminderMinutesBefore ?? null,
    status: input.status ?? 'scheduled',
    version: 0,
    createdAt: now,
    updatedAt: now,
    isDeleted: false,
    deletedAt: null,
  };

  await localDb.putCalendarEvent(event);
  await localDb.enqueueOp({
    userId: input.userId,
    entity: 'calendar_event',
    entityId: event.id,
    action: 'upsert',
    baseVersion: 0,
  });

  return event;
}

// ---------------------------------------------------------------------------
// Read
// ---------------------------------------------------------------------------

/**
 * Get all active (non-deleted) calendar events for a user.
 */
export async function getCalendarEventsForUser(
  userId: string
): Promise<CalendarEventEntity[]> {
  return localDb.getCalendarEventsForUser(userId, false);
}

/**
 * Get all active calendar events linked to a specific note.
 */
export async function getCalendarEventsForNote(
  noteId: string
): Promise<CalendarEventEntity[]> {
  return localDb.getCalendarEventsForNote(noteId);
}

/**
 * Get a single calendar event by ID.
 */
export async function getCalendarEvent(
  id: string
): Promise<CalendarEventEntity | undefined> {
  return localDb.getCalendarEvent(id);
}

/**
 * Get active events occurring on a specific date (UTC).
 * Events are included if startAt falls within the given UTC day.
 */
export async function getCalendarEventsOnDate(
  userId: string,
  dateUtc: Date
): Promise<CalendarEventEntity[]> {
  const all = await localDb.getCalendarEventsForUser(userId, false);
  const startOfDay = new Date(dateUtc);
  startOfDay.setUTCHours(0, 0, 0, 0);
  const endOfDay = new Date(dateUtc);
  endOfDay.setUTCHours(23, 59, 59, 999);

  const startMs = startOfDay.getTime();
  const endMs = endOfDay.getTime();

  return all.filter(e => {
    const eventStart = new Date(e.startAt).getTime();
    return eventStart >= startMs && eventStart <= endMs;
  });
}

/**
 * Get active events in a date range [fromUtc, toUtc] inclusive.
 */
export async function getCalendarEventsInRange(
  userId: string,
  fromUtc: Date,
  toUtc: Date
): Promise<CalendarEventEntity[]> {
  const all = await localDb.getCalendarEventsForUser(userId, false);
  const fromMs = fromUtc.getTime();
  const toMs = toUtc.getTime();

  return all.filter(e => {
    const eventStart = new Date(e.startAt).getTime();
    return eventStart >= fromMs && eventStart <= toMs;
  });
}

// ---------------------------------------------------------------------------
// Update
// ---------------------------------------------------------------------------

/**
 * Update an existing calendar event and enqueue for sync.
 * Version is bumped atomically. userId and noteId are immutable.
 */
export async function updateCalendarEvent(
  id: string,
  userId: string,
  updates: UpdateCalendarEventInput
): Promise<CalendarEventEntity | undefined> {
  const existing = await localDb.getCalendarEvent(id);
  if (!existing || existing.userId !== userId) return undefined;

  const updated: CalendarEventEntity = {
    ...existing,
    ...updates,
    id: existing.id,         // immutable
    userId: existing.userId,  // immutable
    noteId: existing.noteId,  // immutable
    createdAt: existing.createdAt, // immutable
    version: existing.version + 1,
    updatedAt: Date.now(),
    isDeleted: false,
  };

  await localDb.putCalendarEvent(updated);
  await localDb.enqueueOp({
    userId,
    entity: 'calendar_event',
    entityId: id,
    action: 'upsert',
    baseVersion: existing.version,
  });

  return updated;
}

// ---------------------------------------------------------------------------
// Soft Delete
// ---------------------------------------------------------------------------

/**
 * Soft-delete a calendar event.
 * Sets isDeleted=true and enqueues a delete SyncOp.
 * The event is hard-deleted locally after successful sync propagation.
 */
export async function deleteCalendarEvent(
  id: string,
  userId: string
): Promise<boolean> {
  const existing = await localDb.getCalendarEvent(id);
  if (!existing || existing.userId !== userId) return false;

  const deleted: CalendarEventEntity = {
    ...existing,
    isDeleted: true,
    deletedAt: Date.now(),
    updatedAt: Date.now(),
    version: existing.version + 1,
  };

  await localDb.putCalendarEvent(deleted);
  await localDb.enqueueOp({
    userId,
    entity: 'calendar_event',
    entityId: id,
    action: 'delete',
    baseVersion: existing.version,
  });

  return true;
}

// ---------------------------------------------------------------------------
// Mark Complete / Reschedule
// ---------------------------------------------------------------------------

/**
 * Mark a calendar event as completed.
 */
export async function completeCalendarEvent(
  id: string,
  userId: string
): Promise<CalendarEventEntity | undefined> {
  return updateCalendarEvent(id, userId, { status: 'completed' });
}

/**
 * Cancel a calendar event without deleting it.
 */
export async function cancelCalendarEvent(
  id: string,
  userId: string
): Promise<CalendarEventEntity | undefined> {
  return updateCalendarEvent(id, userId, { status: 'cancelled' });
}

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

/**
 * Validate a CreateCalendarEventInput for required field completeness.
 * Returns an array of error strings (empty if valid).
 */
export function validateCreateInput(input: CreateCalendarEventInput): string[] {
  const errors: string[] = [];

  if (!input.userId) errors.push('userId is required');
  if (!input.noteId) errors.push('noteId is required');
  if (!input.title || input.title.trim().length === 0) errors.push('title must not be empty');
  if (!input.startAt) errors.push('startAt is required');
  if (!input.timezone) errors.push('timezone is required');

  // Validate startAt is parseable ISO 8601
  if (input.startAt && isNaN(Date.parse(input.startAt))) {
    errors.push('startAt must be a valid ISO 8601 date string');
  }

  // Validate endAt > startAt when provided
  if (input.endAt && input.startAt) {
    if (Date.parse(input.endAt) < Date.parse(input.startAt)) {
      errors.push('endAt must not be before startAt');
    }
  }

  // Validate reminderMinutesBefore values are non-negative integers
  if (input.reminderMinutesBefore) {
    for (const mins of input.reminderMinutesBefore) {
      if (!Number.isInteger(mins) || mins < 0) {
        errors.push('reminderMinutesBefore values must be non-negative integers');
        break;
      }
    }
  }

  return errors;
}
