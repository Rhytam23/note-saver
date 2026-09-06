import { supabase } from './supabase';

export const ATTACHMENT_BUCKET = 'note-attachments';

/**
 * Generates the standardized storage path: {user_id}/{note_id}/{attachment_id}
 */
export function getStoragePath(userId: string, noteId: string, attachmentId: string): string {
  if (!userId || !noteId || !attachmentId) {
    throw new Error('[StoragePathHelper] userId, noteId, and attachmentId are required to build a storage path.');
  }
  const sanitize = (str: string) => str.replace(/[^a-zA-Z0-9_-]/g, '');
  return `${sanitize(userId)}/${sanitize(noteId)}/${sanitize(attachmentId)}`;
}

/**
 * Requests a short-lived signed URL for a private attachment asset (default 3600 seconds = 1 hour).
 */
export async function getSignedAttachmentUrl(storagePath: string, expiresInSec = 3600): Promise<string | null> {
  try {
    const { data, error } = await supabase.storage
      .from(ATTACHMENT_BUCKET)
      .createSignedUrl(storagePath, expiresInSec);

    if (error || !data?.signedUrl) {
      console.error('[StoragePathHelper] Failed to create signed URL:', error);
      return null;
    }
    return data.signedUrl;
  } catch (err) {
    console.error('[StoragePathHelper] Exception creating signed URL:', err);
    return null;
  }
}
