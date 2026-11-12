# Task Roadmap

## Checkout onboarding
- [x] Add server-only shared-key verification; live missing/wrong keys return 401 and saved key passes auth to invalid-session rejection
- [ ] Confirm successful real sandbox verification; requires a completed sandbox Checkout Session ID
- [x] Restore public form; confirm identity only before acceptance
- [x] Match returning confirmed emails against existing client tracker; verified tracker email column access
- [x] Add customer-level duplicate protection and private resumable drafts; duplicate customer insert rejected
- [x] Verify public form, pre-confirmation submission block, draft reload and 24 authorization/intake tests
- [x] Review verification endpoint authentication and privacy
- [x] Verify checkout unobtrusively and reverify at submission; use verified customer email
- [x] Enforce one submission per session in private database storage; database duplicate insert rejected
- [x] Automated validation tests and desktop/mobile form access for missing/invalid sessions
- [ ] End-to-end valid/reused sandbox checkout with email confirmation and fulfillment — requires a completed sandbox checkout URL
- [x] Secure external verifier — inspected updated checkout source and verified unauthorized requests return 401
- [ ] Verify hosted email confirmation delivery, returning customer draft read-back and submission — no auth users exist to test; a customer must confirm an email first

## Done
- [x] Label CP-575 upload optional but strongly encouraged; limit Google Business Profile answers to Yes/No and test validation
- [x] Intake webhook endpoint at /api/public/intake-webhook (validates, writes to sheet, forwards to INTAKE_WEBHOOK_URL if set)
- [x] INTAKE_WEBHOOK_SECRET saved by user; endpoint verified live (401 without secret)
- [x] Published to live domain
