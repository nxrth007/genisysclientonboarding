# Task Roadmap

## Checkout onboarding
- [ ] Review verification endpoint authentication and privacy
- [ ] Gate form and reverify at submission; use verified customer email
- [ ] Enforce one submission per session in private database storage
- [ ] Test valid, invalid, missing and reused sandbox sessions

## Done
- [x] Label CP-575 upload optional but strongly encouraged; limit Google Business Profile answers to Yes/No and test validation
- [x] Intake webhook endpoint at /api/public/intake-webhook (validates, writes to sheet, forwards to INTAKE_WEBHOOK_URL if set)
- [x] INTAKE_WEBHOOK_SECRET saved by user; endpoint verified live (401 without secret)
- [x] Published to live domain
