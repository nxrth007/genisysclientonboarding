CREATE TABLE public.checkout_onboarding_submissions (
 session_id text PRIMARY KEY,
 user_id uuid NOT NULL,
 verified_email text NOT NULL,
 answers jsonb NOT NULL,
 file_paths jsonb NOT NULL DEFAULT '[]'::jsonb,
 status text NOT NULL DEFAULT 'processing',
 created_at timestamptz NOT NULL DEFAULT now(),
 completed_at timestamptz,
 CONSTRAINT checkout_submission_status CHECK (status IN ('processing', 'complete', 'needs_attention'))
);
GRANT ALL ON public.checkout_onboarding_submissions TO service_role;
REVOKE ALL ON public.checkout_onboarding_submissions FROM anon, authenticated;
ALTER TABLE public.checkout_onboarding_submissions ENABLE ROW LEVEL SECURITY;
COMMENT ON TABLE public.checkout_onboarding_submissions IS 'Server-only checkout onboarding ledger. Unique session_id claims a submission before external fulfillment; no customer read endpoint.';