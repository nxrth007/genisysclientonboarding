CREATE POLICY "Anyone can upload intake files"
ON storage.objects FOR INSERT
TO anon, authenticated
WITH CHECK (bucket_id = 'intake-uploads');