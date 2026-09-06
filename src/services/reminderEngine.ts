import type { INotificationAdapter, ScheduleNotificationOptions } from './platform/platformInterfaces';
import type { CalendarEventEntity } from '../types/calendar';
import { getPlatformAdapters } from './platform/platformAdapterFactory';
import { getCalendarEventsForUser } from './calendarEventService';

/**
 * NoteNirman 2.0 Phase 5 — Reminder Scheduling Engine (P5.8)
 *
 * Schedules and manages reminders for authoritative CalendarEventEntity events.
 *
 * Architecture:
 * - Uses INotificationAdapter from P5.7 (platform-agnostic, injectable for testing)
 * - Schedules one notification per (event, offset) pair from reminderMinutesBefore
 * - Notification IDs are deterministic: `reminder:<eventId>:<offsetMinutes>`
 * - Prevents duplicate scheduling through deduplication by notification ID
 * - Provides a user-level sync operation: syncRemindersForUser() reconciles all
 *   active events with scheduled notifications
 *
 * Web Limitation:
 * - The Web Notification API / setTimeout approach only fires while the browser
 *   tab is open. For persistent background reminders, Tauri (OS notifications)
 *   or Capacitor (@capacitor/local-notifications) is required.
 *
 * Invariants:
 * - Does NOT persist reminder state to IDB or Supabase (reminders are derived,
 *   reconstructable from CalendarEventEntity.reminderMinutesBefore)
 * - Does NOT introduce a new sync mechanism or IDB store
 * - CalendarEventEntity.reminderMinutesBefore is the authoritative source of truth
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ReminderSyncResult {
  scheduledCount: number;
  skippedPastCount: number;
  cancelledCount: number;
  errors: string[];
}

export interface ReminderNotificationId {
  eventId: string;
  offsetMinutes: number;
}

// ---------------------------------------------------------------------------
// Notification ID Format
// ---------------------------------------------------------------------------

/**
 * Generate a deterministic notification ID for a specific (event, offset) pair.
 * Format: `reminder:<eventId>:<offsetMinutes>`
 *
 * This ID is stable — re-scheduling the same reminder produces the same ID,
 * enabling deduplication and cancellation by ID.
 */
export function buildReminderNotificationId(eventId: string, offsetMinutes: number): string {
  return `reminder:${eventId}:${offsetMinutes}`;
}

/**
 * Parse a reminder notification ID back into its components.
 * Returns undefined if the format is not recognized.
 */
export function parseReminderNotificationId(id: string): ReminderNotificationId | undefined {
  const match = /^reminder:(.+):(\d+)$/.exec(id);
  if (!match) return undefined;
  return {
    eventId: match[1],
    offsetMinutes: parseInt(match[2], 10),
  };
}

// ---------------------------------------------------------------------------
// Reminder Scheduling
// ---------------------------------------------------------------------------

/**
 * Schedule all reminders for a single CalendarEventEntity.
 *
 * For each offset in event.reminderMinutesBefore, a notification is scheduled
 * at (event.startAt - offsetMinutes). Past notifications (delivery time < now)
 * are skipped silently.
 *
 * @returns Number of reminders actually scheduled
 */
export async function scheduleRemindersForEvent(
  event: CalendarEventEntity,
  adapter?: INotificationAdapter
): Promise<{ scheduled: number; skipped: number }> {
  const notificationAdapter = adapter ?? getPlatformAdapters().notification;

  if (!event.reminderMinutesBefore || event.reminderMinutesBefore.length === 0) {
    return { scheduled: 0, skipped: 0 };
  }

  if (event.isDeleted || event.status === 'cancelled' || event.status === 'completed') {
    return { scheduled: 0, skipped: event.reminderMinutesBefore.length };
  }

  const eventStartMs = Date.parse(event.startAt);
  if (isNaN(eventStartMs)) {
    return { scheduled: 0, skipped: event.reminderMinutesBefore.length };
  }

  const now = Date.now();
  let scheduled = 0;
  let skipped = 0;

  for (const offsetMinutes of event.reminderMinutesBefore) {
    const notifyAtMs = eventStartMs - offsetMinutes * 60 * 1000;

    if (notifyAtMs <= now) {
      // Past reminder — skip silently
      skipped++;
      continue;
    }

    const notificationId = buildReminderNotificationId(event.id, offsetMinutes);
    const options: ScheduleNotificationOptions = {
      id: notificationId,
      title: buildReminderTitle(event, offsetMinutes),
      body: buildReminderBody(event, offsetMinutes),
      scheduleAtMs: notifyAtMs,
      tag: `notenirman-reminder`,
    };

    try {
      await notificationAdapter.scheduleNotification(options);
      scheduled++;
    } catch (err) {
      // Per-event failure should not block other reminders
      console.warn(`[ReminderEngine] Failed to schedule reminder ${notificationId}:`, err);
      skipped++;
    }
  }

  return { scheduled, skipped };
}

/**
 * Cancel all scheduled reminders for a specific event.
 */
export async function cancelRemindersForEvent(
  event: CalendarEventEntity,
  adapter?: INotificationAdapter
): Promise<number> {
  const notificationAdapter = adapter ?? getPlatformAdapters().notification;

  if (!event.reminderMinutesBefore || event.reminderMinutesBefore.length === 0) {
    return 0;
  }

  let cancelled = 0;
  for (const offsetMinutes of event.reminderMinutesBefore) {
    const notificationId = buildReminderNotificationId(event.id, offsetMinutes);
    try {
      await notificationAdapter.cancelNotification({ id: notificationId });
      cancelled++;
    } catch (err) {
      console.warn(`[ReminderEngine] Failed to cancel reminder ${notificationId}:`, err);
    }
  }

  return cancelled;
}

// ---------------------------------------------------------------------------
// User-Level Reminder Sync
// ---------------------------------------------------------------------------

/**
 * Synchronize reminders for all active events belonging to a user.
 *
 * This operation:
 * 1. Requests notification permission (if not already granted)
 * 2. Loads all non-deleted, non-cancelled CalendarEvents for the user
 * 3. Schedules future reminders, skipping past ones
 *
 * Safe to call on app bootstrap or when coming back online.
 * Deduplication is handled by the adapter (re-scheduling same ID replaces existing).
 */
export async function syncRemindersForUser(
  userId: string,
  adapter?: INotificationAdapter
): Promise<ReminderSyncResult> {
  const notificationAdapter = adapter ?? getPlatformAdapters().notification;
  const result: ReminderSyncResult = {
    scheduledCount: 0,
    skippedPastCount: 0,
    cancelledCount: 0,
    errors: [],
  };

  if (!notificationAdapter.isAvailable()) {
    result.errors.push('Notification API not available on this platform');
    return result;
  }

  // Request permission if not already granted
  const permission = await notificationAdapter.requestPermission();
  if (permission !== 'granted') {
    result.errors.push(`Notification permission not granted (status: ${permission})`);
    return result;
  }

  // Load active events
  let events: CalendarEventEntity[];
  try {
    events = await getCalendarEventsForUser(userId);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    result.errors.push(`Failed to load calendar events: ${msg}`);
    return result;
  }

  // Schedule reminders for each active scheduled event
  for (const event of events) {
    if (event.status !== 'scheduled' || event.isDeleted) continue;
    try {
      const { scheduled, skipped } = await scheduleRemindersForEvent(event, notificationAdapter);
      result.scheduledCount += scheduled;
      result.skippedPastCount += skipped;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      result.errors.push(`Event ${event.id}: ${msg}`);
    }
  }

  return result;
}

// ---------------------------------------------------------------------------
// Notification Content Builders
// ---------------------------------------------------------------------------

/**
 * Build the notification title for a reminder.
 */
export function buildReminderTitle(
  event: CalendarEventEntity,
  offsetMinutes: number
): string {
  if (offsetMinutes === 0) {
    return `🔔 Starting now: ${event.title}`;
  }
  const label = formatDurationLabel(offsetMinutes);
  return `⏰ Reminder: ${event.title}`;
  // eslint-disable-next-line @typescript-eslint/no-unused-expressions
  void label; // label is used in body
}

/**
 * Build the notification body for a reminder.
 */
export function buildReminderBody(
  event: CalendarEventEntity,
  offsetMinutes: number
): string {
  const timeStr = formatEventTime(event.startAt);
  if (offsetMinutes === 0) {
    return `Your event starts now at ${timeStr}.`;
  }
  const label = formatDurationLabel(offsetMinutes);
  return `Starts in ${label} at ${timeStr}.`;
}

// ---------------------------------------------------------------------------
// Formatting Utilities
// ---------------------------------------------------------------------------

/**
 * Format an offset in minutes to a human-readable label.
 * Examples: 5 → "5 minutes", 60 → "1 hour", 90 → "1 hour 30 minutes", 1440 → "1 day"
 */
export function formatDurationLabel(minutes: number): string {
  if (minutes < 60) return `${minutes} minute${minutes === 1 ? '' : 's'}`;
  if (minutes >= 1440 && minutes % 1440 === 0) {
    const days = minutes / 1440;
    return `${days} day${days === 1 ? '' : 's'}`;
  }
  if (minutes === 60) return '1 hour';
  if (minutes % 60 === 0) return `${minutes / 60} hours`;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours} hour${hours > 1 ? 's' : ''} ${mins} minute${mins === 1 ? '' : 's'}`;
}

/**
 * Format a UTC ISO string to a short human-readable local time.
 * Example: "2026-09-01T09:00:00.000Z" → "9:00 AM"
 */
export function formatEventTime(isoString: string): string {
  try {
    const date = new Date(isoString);
    return date.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
  } catch {
    return isoString;
  }
}
