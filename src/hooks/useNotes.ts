
import { useState, useEffect, useCallback } from 'react';
import type { Note, Tag } from '../types.ts';
import { supabase } from '../services/supabase.ts';

// Helper: Convert DB row (snake_case) to App Note (camelCase)
const dbToNote = (dbNote: any): Note => ({
  id: dbNote.id,
  title: dbNote.title,
  content: dbNote.content,
  tags: dbNote.tags || [],
  isPinned: dbNote.is_pinned,
  priority: dbNote.priority || 'none',
  createdAt: dbNote.created_at,
  updatedAt: dbNote.updated_at,
  coverImage: dbNote.cover_image,
});

// Helper: Convert App Note (camelCase) to DB row (snake_case)
const noteToDb = (note: Note, userId: string) => ({
  id: note.id,
  user_id: userId,
  title: note.title,
  content: note.content,
  tags: note.tags,
  is_pinned: note.isPinned,
  priority: note.priority,
  created_at: note.createdAt,
  updated_at: note.updatedAt,
  cover_image: note.coverImage,
});

export function useNotes(userId: string | undefined) {
  const [notes, setNotes] = useState<Note[]>([]);
  const [customTags, setCustomTags] = useState<Tag[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);

  // Fetch data from Supabase on mount/user change
  useEffect(() => {
    if (!userId) {
      setNotes([]);
      setCustomTags([]);
      setIsInitialized(false);
      return;
    }

    const fetchData = async () => {
      setIsLoading(true);
      try {
        // 1. Fetch Notes
        const { data: notesData, error: notesError } = await supabase
          .from('notes')
          .select('*')
          .eq('user_id', userId);

        if (notesError) throw notesError;

        // 2. Fetch Tags
        const { data: tagsData, error: tagsError } = await supabase
          .from('tags')
          .select('*')
          .eq('user_id', userId);

        if (tagsError) throw tagsError;

        // 3. Migration: If Supabase is empty but LocalStorage has data, upload it.
        const localNotesKey = `notenirman-notes-${userId}`;
        const localTagsKey = `notenirman-tags-${userId}`;
        const localNotes = JSON.parse(window.localStorage.getItem(localNotesKey) || '[]');
        const localTags = JSON.parse(window.localStorage.getItem(localTagsKey) || '[]');

        let finalNotes: Note[] = notesData ? notesData.map(dbToNote) : [];
        let finalTags: Tag[] = tagsData || [];

        if ((!notesData || notesData.length === 0) && localNotes.length > 0) {
          // Optimistically show local notes
          finalNotes = localNotes;

          // Try to upload in background (Mapping local notes to DB format)
          const notesToUpload = localNotes.map((n: Note) => noteToDb(n, userId));
          const { data: uploadedNotes } = await supabase.from('notes').insert(notesToUpload).select();

          if (uploadedNotes) {
            finalNotes = uploadedNotes.map(dbToNote);
          }
        }

        if ((!tagsData || tagsData.length === 0) && localTags.length > 0) {
          finalTags = localTags;
          const tagsToUpload = localTags.map((t: Tag) => ({ ...t, user_id: userId }));
          const { data: uploadedTags } = await supabase.from('tags').insert(tagsToUpload).select();

          if (uploadedTags) {
            finalTags = uploadedTags;
          }
        }

        setNotes(finalNotes);
        setCustomTags(finalTags);

      } catch (error) {
        console.error('Error fetching data from Supabase:', error);
        // Fallback to LocalStorage if Supabase fails entirely
        const localNotesKey = `notenirman-notes-${userId}`;
        const localTagsKey = `notenirman-tags-${userId}`;
        const localNotes = JSON.parse(window.localStorage.getItem(localNotesKey) || '[]');
        const localTags = JSON.parse(window.localStorage.getItem(localTagsKey) || '[]');

        if (localNotes.length > 0) setNotes(localNotes);
        if (localTags.length > 0) setCustomTags(localTags);
      } finally {
        setIsLoading(false);
        setIsInitialized(true);
      }
    };

    fetchData();
  }, [userId]);

  // Persist to LocalStorage as Backup (Offline Support)
  useEffect(() => {
    if (!userId || !isInitialized) return;
    const localNotesKey = `notenirman-notes-${userId}`;
    window.localStorage.setItem(localNotesKey, JSON.stringify(notes));
  }, [notes, userId, isInitialized]);

  useEffect(() => {
    if (!userId || !isInitialized) return;
    const localTagsKey = `notenirman-tags-${userId}`;
    window.localStorage.setItem(localTagsKey, JSON.stringify(customTags));
  }, [customTags, userId, isInitialized]);

  // Sync helpers
  const syncNoteToSupabase = async (note: Note, action: 'INSERT' | 'UPDATE' | 'DELETE') => {
    if (!userId) return;
    try {
      if (action === 'DELETE') {
        await supabase.from('notes').delete().eq('id', note.id).eq('user_id', userId);
      } else if (action === 'INSERT') {
        const dbRow = noteToDb(note, userId);
        await supabase.from('notes').insert(dbRow);
      } else {
        const dbRow = noteToDb(note, userId);
        await supabase.from('notes').update({ ...dbRow, updated_at: new Date().toISOString() }).eq('id', note.id).eq('user_id', userId);
      }
    } catch (err) {
      console.error('Failed to sync note:', err);
    }
  };

  const syncTagToSupabase = async (tag: Tag, action: 'INSERT' | 'UPDATE' | 'DELETE') => {
    if (!userId) return;
    try {
      if (action === 'DELETE') {
        await supabase.from('tags').delete().eq('name', tag.name).eq('user_id', userId);
      } else if (action === 'INSERT') {
        await supabase.from('tags').insert({ ...tag, user_id: userId });
      } else {
        await supabase.from('tags').upsert({ ...tag, user_id: userId });
      }
    } catch (err) {
      console.error('Failed to sync tag:', err);
    }
  };


  const addNote = useCallback((note: Note) => {
    setNotes(prev => [note, ...prev]);
    syncNoteToSupabase(note, 'INSERT');
  }, [userId]);

  const updateNote = useCallback((updatedNote: Note) => {
    setNotes(prev => prev.map(n => (n.id === updatedNote.id ? updatedNote : n)));
    syncNoteToSupabase(updatedNote, 'UPDATE');
  }, [userId]);

  const deleteNote = useCallback((id: string) => {
    const noteToDelete = notes.find(n => n.id === id);
    setNotes(prev => prev.filter(n => n.id !== id));
    if (noteToDelete) {
      syncNoteToSupabase(noteToDelete, 'DELETE');
    }
  }, [notes, userId]);

  const addOrUpdateCustomTag = useCallback((tag: Tag) => {
    setCustomTags(prev => {
      const index = prev.findIndex(t => t.name === tag.name);
      let newTags;
      if (index > -1) {
        newTags = [...prev];
        newTags[index] = { ...newTags[index], ...tag };
      } else {
        newTags = [...prev, tag];
      }
      return newTags;
    });
    syncTagToSupabase(tag, 'UPDATE');
  }, [userId]);

  const deleteCustomTag = useCallback((tagName: string) => {
    const tagToDelete = customTags.find(t => t.name === tagName);
    setCustomTags(prev => prev.filter(t => t.name !== tagName));
    if (tagToDelete) {
      syncTagToSupabase(tagToDelete, 'DELETE');
    }
  }, [customTags, userId]);

  return {
    notes,
    addNote,
    updateNote,
    deleteNote,
    customTags,
    addOrUpdateCustomTag,
    deleteCustomTag,
    isLoading
  };
}