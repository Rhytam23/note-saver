// Centralized tenant-isolated database access layer for the Telegram bot.
//
// The Telegram bot uses a Supabase service-role client which bypasses PostgreSQL RLS.
// This module guarantees that every database query accessing tenant-owned records
// (notes, calendar events, reminders, user links) is strictly scoped to the authenticated
// user's UUID.
//
// If a user context is missing, malformed, or malicious, queries fail closed immediately.

import { isLocked } from './notesLogic.ts';
import { MAX_TITLE } from './text.ts';
import { LOCK_PREFIX } from './generated/lockPrefix.ts';

export const USER_ID_REGEX = /^[a-zA-Z0-9_-]{3,128}$/;

export class TenantContextError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'TenantContextError';
  }
}

/**
 * Validates that an identifier is a well-formed tenant identifier (e.g. UUID).
 * Rejects empty strings, SQL injection characters, objects, and malformed strings.
 */
export function isValidUserId(userId: unknown): boolean {
  return typeof userId === 'string' && USER_ID_REGEX.test(userId.trim());
}

/**
 * Asserts that a user ID is a valid tenant UUID.
 * Throws TenantContextError if missing, null, undefined, or malformed.
 */
export function assertValidUserId(userId: unknown): string {
  if (!isValidUserId(userId)) {
    throw new TenantContextError('Tenant isolation violation: invalid or missing user_id');
  }
  return (userId as string).trim();
}

export const LIST_COLS = 'id,title,tags,is_pinned,priority,created_at,updated_at,deleted_at';

/**
 * Creates a tenant-isolated database helper bound strictly to a validated user_id.
 */
export function createTenantDb(sb: any, rawUserId: unknown) {
  const userId = assertValidUserId(rawUserId);

  return {
    userId,

    /**
     * Lists IDs of notes that are locked with NNLOCK1:
     */
    async fetchLockedIds(): Promise<Set<string>> {
      const { data, error } = await sb
        .from('notes')
        .select('id')
        .eq('user_id', userId)
        .like('content', `${LOCK_PREFIX}%`);
      if (error) throw error;
      return new Set((data ?? []).map((r: any) => r.id));
    },

    /**
     * Lists notes metadata (no content). deleted=true returns the trash.
     */
    async fetchNotes({ deleted = false }: { deleted?: boolean } = {}) {
      const { data, error } = await sb
        .from('notes')
        .select(LIST_COLS)
        .eq('user_id', userId)
        .eq('deleted', deleted)
        .order('updated_at', { ascending: false })
        .limit(1000);
      if (error) throw error;

      const locked = await this.fetchLockedIds();
      return (data ?? []).map((n: any) => ({
        ...n,
        tags: n.tags ?? [],
        is_pinned: !!n.is_pinned,
        locked: locked.has(n.id),
      }));
    },

    /**
     * Fetches a single note with content, scoped strictly to this tenant.
     */
    async fetchOne(id: string, deleted = false) {
      if (!id || typeof id !== 'string') return null;
      const { data, error } = await sb
        .from('notes')
        .select(`${LIST_COLS},content,version`)
        .eq('id', id)
        .eq('user_id', userId)
        .eq('deleted', deleted)
        .maybeSingle();
      if (error || !data) return null;
      return {
        ...data,
        tags: data.tags ?? [],
        is_pinned: !!data.is_pinned,
        locked: isLocked(data.content),
      };
    },

    /**
     * Fetches live notes with content (capped), scoped strictly to this tenant.
     */
    async fetchAllWithContent() {
      const { data, error } = await sb
        .from('notes')
        .select(`${LIST_COLS},content`)
        .eq('user_id', userId)
        .eq('deleted', false)
        .order('updated_at', { ascending: false })
        .limit(500);
      if (error) throw error;
      return (data ?? []).map((n: any) => ({
        ...n,
        tags: n.tags ?? [],
        is_pinned: !!n.is_pinned,
        locked: isLocked(n.content),
      }));
    },

    /**
     * Inserts a note owned by this tenant.
     */
    async insertNote({
      title,
      content = '',
      tags = [],
      priority = 'none',
      is_pinned = false,
    }: {
      title?: string;
      content?: string;
      tags?: string[];
      priority?: string;
      is_pinned?: boolean;
    }) {
      const now = new Date().toISOString();
      const id = crypto.randomUUID();
      const { error } = await sb.from('notes').insert({
        id,
        user_id: userId,
        title: (title || 'Untitled').slice(0, MAX_TITLE),
        content,
        tags,
        is_pinned,
        priority,
        created_at: now,
        updated_at: now,
        version: 1,
        deleted: false,
        deleted_at: null,
      });
      if (error) throw error;
      return id;
    },

    /**
     * Updates a note owned by this tenant.
     */
    async updateNote(id: string, patch: any): Promise<boolean> {
      if (!id || typeof id !== 'string') return false;
      const { data, error } = await sb
        .from('notes')
        .update(patch)
        .eq('id', id)
        .eq('user_id', userId)
        .select('id');
      if (error) throw error;
      return Boolean(data && data.length > 0);
    },

    /**
     * Read-modify-write on content, guarded by note version and user_id.
     */
    async editContent(id: string, transform: (content: string) => string) {
      if (!id || typeof id !== 'string') return { ok: false, reason: 'missing' };
      for (let attempt = 0; attempt < 2; attempt++) {
        const note = await this.fetchOne(id);
        if (!note) return { ok: false, reason: 'missing' };
        if (note.locked) return { ok: false, reason: 'locked', note };
        const { data, error } = await sb
          .from('notes')
          .update({ content: transform(note.content ?? '') })
          .eq('id', id)
          .eq('user_id', userId)
          .eq('version', note.version)
          .select('id');
        if (error) throw error;
        if (data?.length) return { ok: true, note };
      }
      return { ok: false, reason: 'conflict' };
    },

    /**
     * Finds a note by exact title or creates it, scoped strictly to this tenant.
     */
    async ensureNote(title: string, { create = true } = {}) {
      const { data, error } = await sb
        .from('notes')
        .select('id')
        .eq('user_id', userId)
        .eq('deleted', false)
        .ilike('title', title)
        .order('updated_at', { ascending: false })
        .limit(1);
      if (error) throw error;
      if (data?.length) return data[0].id;
      return create ? this.insertNote({ title, content: '' }) : null;
    },

    /**
     * Searches note titles for target matching, scoped strictly to this tenant.
     */
    async searchNotesByTitle(pattern: string, deleted = false) {
      const { data, error } = await sb
        .from('notes')
        .select(LIST_COLS)
        .eq('user_id', userId)
        .eq('deleted', deleted)
        .ilike('title', pattern)
        .order('updated_at', { ascending: false })
        .limit(20);
      if (error) throw error;
      return data ?? [];
    },

    /**
     * Finds the last deleted note for undo, scoped strictly to this tenant.
     */
    async findLastDeletedNote() {
      const { data, error } = await sb
        .from('notes')
        .select('id')
        .eq('user_id', userId)
        .eq('deleted', true)
        .order('deleted_at', { ascending: false, nullsFirst: false })
        .limit(1);
      if (error) throw error;
      return data?.length ? this.fetchOne(data[0].id, true) : null;
    },

    /**
     * Fetches calendar events in date range, scoped strictly to this tenant.
     */
    async fetchCalendarEvents(nowIso: string, limitIso: string) {
      const { data, error } = await sb
        .from('calendar_events')
        .select('title,start_at,is_all_day,status')
        .eq('user_id', userId)
        .eq('is_deleted', false)
        .gte('start_at', nowIso)
        .lte('start_at', limitIso)
        .order('start_at', { ascending: true })
        .limit(20);
      if (error) throw error;
      return data ?? [];
    },

    /**
     * Reminders management scoped strictly to this tenant.
     */
    reminders: {
      async countPending(): Promise<number> {
        const { count, error } = await sb
          .from('telegram_reminders')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', userId)
          .eq('sent', false);
        if (error) throw error;
        return count ?? 0;
      },

      async listPending(limit = 50) {
        const { data, error } = await sb
          .from('telegram_reminders')
          .select('id,body,due_at')
          .eq('user_id', userId)
          .eq('sent', false)
          .order('due_at', { ascending: true })
          .limit(limit);
        if (error) throw error;
        return data ?? [];
      },

      async insert(chatId: number, body: string, dueAt: string) {
        const { error } = await sb.from('telegram_reminders').insert({
          user_id: userId,
          chat_id: chatId,
          body,
          due_at: dueAt,
        });
        if (error) throw error;
      },

      async delete(reminderId: string): Promise<boolean> {
        if (!reminderId) return false;
        const { data, error } = await sb
          .from('telegram_reminders')
          .delete()
          .eq('id', reminderId)
          .eq('user_id', userId)
          .select('id');
        if (error) throw error;
        return Boolean(data && data.length > 0);
      },

      async deleteAllForChat(chatId: number) {
        const { error } = await sb
          .from('telegram_reminders')
          .delete()
          .eq('user_id', userId)
          .eq('chat_id', chatId);
        if (error) throw error;
      },

      async deleteAll() {
        const { error } = await sb
          .from('telegram_reminders')
          .delete()
          .eq('user_id', userId);
        if (error) throw error;
      },
    },

    /**
     * Account linking operations scoped strictly to this tenant.
     */
    link: {
      async updateTimezone(chatId: number, timezone: string) {
        const { error } = await sb
          .from('telegram_links')
          .update({ timezone })
          .eq('user_id', userId)
          .eq('chat_id', chatId);
        if (error) throw error;
      },

      async unlink(chatId: number) {
        const { error } = await sb
          .from('telegram_links')
          .delete()
          .eq('user_id', userId)
          .eq('chat_id', chatId);
        if (error) throw error;
      },
    },

    /**
     * Emergency notes count scoped strictly to this tenant.
     */
    async countRecentEmergencyNotes(sinceIso: string, emergencyTag: string): Promise<number> {
      const { count, error } = await sb
        .from('notes')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', userId)
        .contains('tags', [emergencyTag])
        .gte('created_at', sinceIso);
      if (error) throw error;
      return count ?? 0;
    },
  };
}
