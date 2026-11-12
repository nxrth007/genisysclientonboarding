DROP POLICY IF EXISTS "Anyone can upload intake files" ON storage.objects;
CREATE POLICY "Confirmed customers upload own intake files" ON storage.objects FOR INSERT TO authenticated WITH CHECK (
 bucket_id = 'intake-uploads'
 AND (storage.foldername(name))[1] = (select auth.uid())::text
 AND (storage.foldername(name))[2] ~ '^cs_test_[A-Za-z0-9]+$'
 AND (select auth.jwt()->>'email') IS NOT NULL
);
