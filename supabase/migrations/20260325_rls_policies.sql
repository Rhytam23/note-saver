ALTER TABLE public.notes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can only select own notes" ON public.notes;
CREATE POLICY "Users can only select own notes" ON public.notes
    FOR SELECT
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can only insert own notes" ON public.notes;
CREATE POLICY "Users can only insert own notes" ON public.notes
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can only update own notes" ON public.notes;
CREATE POLICY "Users can only update own notes" ON public.notes
    FOR UPDATE
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can only delete own notes" ON public.notes;
CREATE POLICY "Users can only delete own notes" ON public.notes
    FOR DELETE
    USING (auth.uid() = user_id);

ALTER TABLE public.tags ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can crud their own tags" ON public.tags;
CREATE POLICY "Users can crud their own tags" ON public.tags
    FOR ALL
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Avatar images are publicly accessible" ON storage.objects;
CREATE POLICY "Avatar images are publicly accessible" ON storage.objects
    FOR SELECT
    USING (bucket_id = 'avatars');

DROP POLICY IF EXISTS "Users can upload their own avatar" ON storage.objects;
CREATE POLICY "Users can upload their own avatar" ON storage.objects
    FOR INSERT
    WITH CHECK (bucket_id = 'avatars' AND auth.uid() = owner);

DROP POLICY IF EXISTS "Users can update their own avatar" ON storage.objects;
CREATE POLICY "Users can update their own avatar" ON storage.objects
    FOR UPDATE
    USING (bucket_id = 'avatars' AND auth.uid() = owner);



