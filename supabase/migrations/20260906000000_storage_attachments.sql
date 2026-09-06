-- NoteNirman 2.0 — Supabase Storage Migration for Attachment Security & RLS
-- 
-- Bucket: note-attachments (Private)
-- Object path schema: {user_id}/{note_id}/{attachment_id}

-- 1. Create Private Storage Bucket for Attachments
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'note-attachments',
  'note-attachments',
  false, -- PRIVATE BUCKET: Requires Signed URLs or Authenticated Downloads
  209715200, -- 200MB Max File Size Limit
  ARRAY[
    'application/pdf',
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/gif',
    'audio/webm',
    'audio/mpeg',
    'audio/wav',
    'audio/aac',
    'audio/mp4',
    'application/json'
  ]
) ON CONFLICT (id) DO UPDATE SET
  public = false,
  file_size_limit = 209715200;

-- 2. Storage RLS Policies: Authenticated User Access Only
-- Path enforcement: {user_id}/{note_id}/{attachment_id}

-- Policy A: INSERT (Upload object to user's own folder)
CREATE POLICY "Users can upload attachments to their own folder"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'note-attachments' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Policy B: SELECT (Read objects from user's own folder)
CREATE POLICY "Users can read attachments from their own folder"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'note-attachments' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Policy C: UPDATE (Update objects in user's own folder)
CREATE POLICY "Users can update attachments in their own folder"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'note-attachments' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Policy D: DELETE (Delete objects in user's own folder)
CREATE POLICY "Users can delete attachments in their own folder"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'note-attachments' AND
  (storage.foldername(name))[1] = auth.uid()::text
);
