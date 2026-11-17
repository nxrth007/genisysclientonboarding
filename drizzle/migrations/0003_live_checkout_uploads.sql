-- The signup at leadgenisys.com switched its trial checkout to Stripe live mode on
-- 2026-11-16, so clients now arrive with cs_live_ checkout ids and their photos go in a
-- folder named after that id. Test ids keep working for rehearsals.
DROP POLICY IF EXISTS "Confirmed customers upload own intake files" ON storage.objects;
CREATE POLICY "Confirmed customers upload own intake files" ON storage.objects FOR INSERT TO authenticated WITH CHECK (
 bucket_id = 'intake-uploads' AND (storage.foldername(name))[1] = (select auth.uid())::text
 AND ((storage.foldername(name))[2] ~ '^cs_(test|live)_[A-Za-z0-9]+$' OR (storage.foldername(name))[2] = 'returning')
);
