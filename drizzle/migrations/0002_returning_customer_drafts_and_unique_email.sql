ALTER TABLE public.checkout_onboarding_submissions ADD COLUMN customer_email text GENERATED ALWAYS AS (lower(trim(verified_email))) STORED;
CREATE UNIQUE INDEX checkout_onboarding_customer_once ON public.checkout_onboarding_submissions(customer_email);
CREATE TABLE public.onboarding_drafts (
 user_id uuid PRIMARY KEY,
 verified_email text NOT NULL,
 answers jsonb NOT NULL DEFAULT '{}'::jsonb,
 session_id text,
 updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.onboarding_drafts TO service_role;
REVOKE ALL ON public.onboarding_drafts FROM anon, authenticated;
ALTER TABLE public.onboarding_drafts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Confirmed customers upload own intake files" ON storage.objects;
CREATE POLICY "Confirmed customers upload own intake files" ON storage.objects FOR INSERT TO authenticated WITH CHECK (
 bucket_id = 'intake-uploads' AND (storage.foldername(name))[1] = (select auth.uid())::text
 AND ((storage.foldername(name))[2] ~ '^cs_test_[A-Za-z0-9]+$' OR (storage.foldername(name))[2] = 'returning')
);