/**
 * NoteNirman 2.0 Phase 5 — Calendar & Temporal Metadata Types (P5.6)
 *
 * Defines the authoritative CalendarEventEntity data model.
 *
 * CLASSIFICATION:
 * - CalendarEventEntity is AUTHORITATIVE domain data (user-created events,
 *   reminders, and due dates attached to notes/blocks).
 * - Vector embeddings, search index entries, notification registrations,
 *   and recurrence expansion results are DERIVED (excluded from backups,
 *   reconstructable from CalendarEventEntity records).
 *
 * EXTERNAL vs. INTERNAL:
 * - The existing calendarService.ts reads EXTERNAL Google Calendar events
 *   via OAuth. That is a separate, read-only integration concern.
 * - CalendarEventEntity is an INTERNAL NoteNirman entity persisted locally
 *   and synchronized via syncEngine.ts.
 */

/**
 * Authoritative user-created calendar event / reminder / due date.
 *
 * Sync identity: entity='calendar_event', entityId=id
 * Storage: IDB 'calendarEvents' store (keyed by id), Supabase 'calendar_events' table
 * Conflict resolution: LWW (last-write-wins) via version counter matching syncEngine.ts pattern
 * Deletion: Soft-delete (isDeleted=true, deletedAt set) propagated via syncQueue SyncOp
 */
export interface CalendarEventEntity {
  /** Primary key — deterministic prefix format: evt_<uuid> */
  id: string;
  /** Owner user ID (matches Supabase auth.uid) */
  userId: string;
  /** Linked parent note ID */
  noteId: string;
  /** Optional linked block UUID within the note (stable data-block-id value) */
  blockId?: string | null;
  /** Short event title / summary */
  title: string;
  /** Optional longer description / body */
  description?: string | null;
  /** Event start time — ISO 8601 UTC string */
  startAt: string;
  /** Event end time — ISO 8601 UTC string (optional for point-in-time events) */
  endAt?: string | null;
  /** Whether this is a full-day event (time portion ignored if true) */
  isAllDay: boolean;
  /** IANA timezone identifier, e.g. 'Asia/Kolkata', 'UTC' */
  timezone: string;
  /**
   * RFC 5545 RRULE string for recurring events, e.g.:
   * 'FREQ=WEEKLY;BYDAY=MO,WE,FR;COUNT=10'
   * Undefined for non-recurring events.
   */
  recurrenceRule?: string | null;
  /**
   * Reminder offsets in minutes before startAt.
   * E.g. [15, 60] = notify 15 minutes and 60 minutes before.
   */
  reminderMinutesBefore?: number[] | null;
  /** Lifecycle status */
  status: CalendarEventStatus;
  /** Monotonically increasing version counter (LWW tie-breaking) */
  version: number;
  /** Creation timestamp — epoch milliseconds */
  createdAt: number;
  /** Last update timestamp — epoch milliseconds (LWW authority field) */
  updatedAt: number;
  /**
   * Soft deletion flag for sync propagation.
   * Deleted events are kept in IDB until confirmed sync to Supabase,
   * then hard-deleted locally.
   */
  isDeleted: boolean;
  /** Soft deletion timestamp — epoch ms (undefined if not deleted) */
  deletedAt?: number | null;
}

export type CalendarEventStatus = 'scheduled' | 'completed' | 'cancelled';

/**
 * Subset of CalendarEventEntity fields required to create a new event.
 * The service generates id, version, createdAt, updatedAt, isDeleted automatically.
 */
export interface CreateCalendarEventInput {
  userId: string;
  noteId: string;
  blockId?: string | null;
  title: string;
  description?: string | null;
  startAt: string;
  endAt?: string | null;
  isAllDay: boolean;
  timezone: string;
  recurrenceRule?: string | null;
  reminderMinutesBefore?: number[] | null;
  status?: CalendarEventStatus;
}

/**
 * Fields that can be updated on an existing event.
 * userId, noteId, id, createdAt are immutable after creation.
 */
export type UpdateCalendarEventInput = Partial<Omit<
  CalendarEventEntity,
  'id' | 'userId' | 'noteId' | 'createdAt' | 'version' | 'isDeleted' | 'deletedAt'
>>;
