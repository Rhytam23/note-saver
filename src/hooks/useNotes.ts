import { useState, useEffect, useCallback, useMemo } from 'react';
import type { Note, Tag } from "../types";
import * as syncEngine from '../services/syncEngine';
import * as localDb from '../services/localDb';
import { useConnectivity } from './useConnectivity';

export type AggregateSyncStatus =
  | 'offline'
  | 'saved-locally'
  | 'syncing'
  | 'synced'
  | 'conflict'
  | 'sync-failed'
  | 'backend-unavailable'
  | 'auth-expired';

const STUCK_OP_THRESHOLD = 5;

export function useNotes(userId: string | undefined) {
  const [notes, setNotes] = useState<Note[]>([]);
  const [customTags, setCustomTags] = useState<Tag[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const [stuckCount, setStuckCount] = useState(0);
  const connectivity = useConnectivity();

  const refresh = useCallback(async (uid: string) => {
    const { notes: n, tags: t } = await syncEngine.loadLocal(uid);
    setNotes(n);
    setCustomTags(t);
    const queue = await localDb.getQueue(uid);
    setPendingCount(queue.length);
    setStuckCount(queue.filter(op => op.attempts >= STUCK_OP_THRESHOLD).length);
  }, []);

  useEffect(() => {
    syncEngine.startAutoSync();
  }, []);

  useEffect(() => {
    if (!userId) {
      setNotes([]);
      setCustomTags([]);
      setIsInitialized(false);
      setPendingCount(0);
      return;
    }

    let cancelled = false;
    setIsLoading(true);

    (async () => {
      await refresh(userId);
      if (cancelled) return;
      setIsLoading(false);
      setIsInitialized(true);

      await syncEngine.bootstrap(userId);
      if (!cancelled) await refresh(userId);
    })();

    const unsubscribe = syncEngine.subscribeLocalChanges(userId, () => {
      if (!cancelled) refresh(userId);
    });

    return () => {
      cancelled = true;
      unsubscribe();
      syncEngine.deactivateUser(userId);
    };
  }, [userId, refresh]);

  useEffect(() => {
    if (userId && connectivity === 'online') {
      void syncEngine.processSyncQueue(userId);
    }
  }, [userId, connectivity]);

  const addNote = useCallback((note: Note) => {
    if (!userId) return;
    setNotes(prev => [note, ...prev]);
    void syncEngine.writeNote(userId, note, 'upsert');
  }, [userId]);

  const updateNote = useCallback((updatedNote: Note) => {
    if (!userId) return;
    setNotes(prev => prev.map(n => (n.id === updatedNote.id ? updatedNote : n)));
    void syncEngine.writeNote(userId, updatedNote, 'upsert');
  }, [userId]);

  const deleteNote = useCallback((id: string) => {
    if (!userId) return;
    const noteToDelete = notes.find(n => n.id === id);
    setNotes(prev => prev.filter(n => n.id !== id));
    if (noteToDelete) {
      void syncEngine.writeNote(userId, noteToDelete, 'delete');
    }
  }, [notes, userId]);

  const addOrUpdateCustomTag = useCallback((tag: Tag) => {
    if (!userId) return;
    setCustomTags(prev => {
      const index = prev.findIndex(t => t.name === tag.name);
      if (index > -1) {
        const next = [...prev];
        next[index] = { ...next[index], ...tag };
        return next;
      }
      return [...prev, tag];
    });
    void syncEngine.writeTag(userId, tag, 'upsert');
  }, [userId]);

  const deleteCustomTag = useCallback((tagName: string) => {
    if (!userId) return;
    const tagToDelete = customTags.find(t => t.name === tagName);
    setCustomTags(prev => prev.filter(t => t.name !== tagName));
    if (tagToDelete) {
      void syncEngine.writeTag(userId, tagToDelete, 'delete');
    }
  }, [customTags, userId]);

  const conflicts = useMemo(() => notes.filter(n => n.syncStatus === 'conflict'), [notes]);

  const resolveConflict = useCallback((noteId: string, choice: 'local' | 'server' | 'both') => {
    if (!userId) return;
    void syncEngine.resolveNoteConflict(userId, noteId, choice);
  }, [userId]);

  const syncStatus: AggregateSyncStatus = useMemo(() => {
    if (connectivity === 'auth-expired') return 'auth-expired';
    if (connectivity === 'backend-unavailable') return 'backend-unavailable';
    if (connectivity === 'offline') return pendingCount > 0 ? 'saved-locally' : 'offline';
    if (conflicts.length > 0) return 'conflict';
    if (stuckCount > 0) return 'sync-failed';
    if (pendingCount > 0) return 'syncing';
    return 'synced';
  }, [connectivity, pendingCount, stuckCount, conflicts.length]);

  return {
    notes,
    addNote,
    updateNote,
    deleteNote,
    customTags,
    addOrUpdateCustomTag,
    deleteCustomTag,
    isLoading,
    isInitialized,
    syncStatus,
    connectivity,
    pendingCount,
    stuckCount,
    conflicts,
    resolveConflict,
  };
}

