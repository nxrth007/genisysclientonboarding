<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

- Display the public intake form immediately; require confirmed Cloud Auth email ownership at acceptance, matched to server-verified checkout or existing customer records, without exposing checkout PII to public callers.
- Claim each customer and optional checkout session once in a private submission ledger before fulfillment; retain failed claims for manual recovery to avoid duplicate external automations.
- Keep checkout validation and submission orchestration in server-only helpers called by typed server functions; never trust URL parameters or client email as identity.
- Send checkout verification through the server-only helper with ONBOARDING_VERIFICATION_KEY in x-onboarding-key; fail closed and sanitize failures so credentials and provider details never reach browsers or logs.
- Store resumable drafts only for an authorized confirmed user, read by that user's server identity; keep pre-confirmation drafts in tab-scoped session storage rather than permanent browser storage.
