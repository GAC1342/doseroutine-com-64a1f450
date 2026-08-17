DROP POLICY IF EXISTS "avatars_read_authenticated" ON storage.objects;

CREATE POLICY "avatars_read_own"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'avatars'
  AND auth.uid()::text = (storage.foldername(name))[1]
);