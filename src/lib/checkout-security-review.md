# Checkout onboarding security review

## Implemented
- Public form is always visible. Sandbox checkout IDs are checked unobtrusively on entry and verified server-side before accepting new customer submissions.
- The public entry probe returns only a boolean. Protected authorization compares the checkout email to a confirmed Cloud Auth user.
- Returning customers confirm mailbox ownership and are matched to the existing client tracker; no new checkout is required. Unmatched accounts get a support option.
- Private ledger has session and normalized email uniqueness, no browser grants or read policies. Insert claims the customer before any Sheets, Slack or webhook fulfillment.
- Authorized users can save and restore incomplete answers from user-scoped private drafts. Pre-confirmation drafts stay in tab session storage. Files must be reattached on a later visit.
- Browser responses contain no saved answers, uploaded file links or Slack metadata. Uploaded paths must belong to the authenticated user and checkout.
- Manually entered lead-communication email is retained in the saved original answers; verified checkout email replaces it for all fulfillment destinations.
- Failed external processing retains the saved submission with needs_attention for manual recovery; automatic retry is deliberately blocked to prevent duplicate automations.
- Existing secret-authenticated inbound webhook remains available to trusted integration callers; it is not a customer checkout access path.

## Secured connection
The external verifier now requires POST with x-onboarding-key. Onboarding reads ONBOARDING_VERIFICATION_KEY only during server execution and never returns or logs it. Missing/incorrect key probes returned 401; the saved key with a nonexistent sandbox session returned 403, matching the verifier's authenticated subscription-rejection path. This establishes key acceptance, not successful checkout verification. The secured endpoint omits livemode; onboarding continues to reject non-cs_test_ session IDs and any explicit livemode:true response. Possession of session_id never establishes mailbox ownership.

## Validation
Automated tests cover missing/malformed/live IDs, valid mocked sandbox verification including the secured minimal response, authenticated POST headers, missing/incorrect keys, sanitized transport failures, invalid endpoint response, noneligible subscriptions, mismatched/unconfirmed identity, verified-email binding, returning customer matching and customer duplicates. Browser verification confirms the original form remains visible and makes no direct requests to the external verifier.

Real completed sandbox session + emailed confirmation + successful intake + read-back in Sheets/Hub/Slack remains unverified: no completed sandbox checkout URL was provided. Email redirect allowlist and actual confirmation delivery must also be checked in hosted settings before release. No live payments were enabled and no checkout source was changed.