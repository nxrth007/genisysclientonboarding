# Task Roadmap

## Checkout onboarding
- [x] Review verification endpoint authentication and privacy
- [x] Gate form and reverify at submission; use verified customer email
- [x] Enforce one submission per session in private database storage; database duplicate insert rejected
- [x] Automated validation tests and desktop/mobile missing/invalid session checks
- [ ] End-to-end valid/reused sandbox checkout with email confirmation and fulfillment — requires a completed sandbox checkout URL
- [ ] Secure external verifier before publishing — its public endpoint exposes checkout customer details; change must happen in checkout project
- [ ] Verify hosted email confirmation delivery and redirect allowlist — hosted settings and a real email confirmation flow not verified

## Done
- [x] Label CP-575 upload optional but strongly encouraged; limit Google Business Profile answers to Yes/No and test validation
- [x] Intake webhook endpoint at /api/public/intake-webhook (validates, writes to sheet, forwards to INTAKE_WEBHOOK_URL if set)
- [x] INTAKE_WEBHOOK_SECRET saved by user; endpoint verified live (401 without secret)
- [x] Published to live domain
