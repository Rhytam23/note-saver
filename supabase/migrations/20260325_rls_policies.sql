-- Protect the tags table with Row Level Security
ALTER TABLE public.tags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can crud their own tags" ON public.tags
    FOR ALL
    USING (auth.uid() = user_id);

-- Protect the avatars bucket in storage with proper RLS
-- (Note: bucket 'avatars' must already exist before inserting policies)

-- Allow public read access (if avatars should be visible to others)
CREATE POLICY "Avatar images are publicly accessible" ON storage.objects
    FOR SELECT
    USING (bucket_id = 'avatars');

-- Allow authenticated users to upload their own avatar
CREATE POLICY "Users can upload their own avatar" ON storage.objects
    FOR INSERT
    WITH CHECK (bucket_id = 'avatars' AND auth.uid() = owner);

-- Allow authenticated users to update their own avatar
CREATE POLICY "Users can update their own avatar" ON storage.objects
    FOR UPDATE
    USING (bucket_id = 'avatars' AND auth.uid() = owner);
