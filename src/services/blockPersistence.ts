import type { Note } from '../types';
import type { BlockDocument } from './blockDocument';
import { createBlockDocument, serializeBlockDocument } from './blockDocument';
import { writeNote } from './syncEngine';

/**
 * NoteNirman 2.0 P1.3 Block Persistence Strategy Adapter
 * 
 * Boundary layer between derived BlockDocument structures and existing Note persistence.
 * 
 * Rules:
 * 1. Absolute Primacy: `Note.content` HTML string is canonical. `BlockDocument` is derived.
 * 2. Database Isolation: ZERO new IndexedDB object stores or Supabase tables are created.
 * 3. Existing Persistence Pipeline: Delegated directly to `syncEngine.writeNote()`.
 * 4. Metadata Integrity: All note properties (title, tags, priority, etc.) are strictly preserved.
 * 5. Error Isolation: Serialization failures return safe errors without writing broken data.
 */

export interface SaveBlockDocumentResult {
  updatedNote: Note;
  serializedHtml: string;
  success: boolean;
  error: Error | null;
}

/**
 * Load a derived BlockDocument from an existing Note object.
 * Does NOT mutate local database or remote records.
 */
export function loadBlockDocument(note: Note): BlockDocument {
  if (!note) {
    return createBlockDocument('unknown-note', '');
  }
  return createBlockDocument(note.id, note.content || '');
}

/**
 * Serialize a BlockDocument into HTML and apply it to an existing Note object.
 * Returns an updated Note object ready for standard persistence while preserving all metadata.
 * Does NOT invoke storage APIs directly (pure transformation).
 */
export function saveBlockDocumentToNote(note: Note, doc: BlockDocument): SaveBlockDocumentResult {
  if (!note) {
    const err = new Error('[BlockPersistence] Cannot save BlockDocument to a null or undefined Note.');
    return {
      updatedNote: note,
      serializedHtml: '',
      success: false,
      error: err,
    };
  }

  try {
    const serializedHtml = serializeBlockDocument(doc);
    const updatedNote: Note = {
      ...note,
      content: serializedHtml,
      updatedAt: new Date().toISOString(),
    };

    return {
      updatedNote,
      serializedHtml,
      success: true,
      error: null,
    };
  } catch (err) {
    const parseErr = err instanceof Error ? err : new Error(String(err));
    console.error(`[BlockPersistence] Failed to serialize BlockDocument for note ${note.id}:`, parseErr);
    return {
      updatedNote: note, // Untouched original note
      serializedHtml: note.content || '',
      success: false,
      error: parseErr,
    };
  }
}

/**
 * Serialize a BlockDocument and persist it via the existing Note persistence engine.
 * Leverages `syncEngine.writeNote()` to maintain offline-first IndexedDB storage & sync queue.
 */
export async function saveBlockDocumentAndPersist(
  userId: string,
  note: Note,
  doc: BlockDocument
): Promise<SaveBlockDocumentResult> {
  const result = saveBlockDocumentToNote(note, doc);

  if (!result.success || !result.updatedNote) {
    return result;
  }

  try {
    await writeNote(userId, result.updatedNote, 'upsert');
    return result;
  } catch (err) {
    const persistErr = err instanceof Error ? err : new Error(String(err));
    console.error(`[BlockPersistence] Failed to persist updated note ${note.id}:`, persistErr);
    return {
      ...result,
      success: false,
      error: persistErr,
    };
  }
}
