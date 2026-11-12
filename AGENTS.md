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

- Checkout onboarding requires a confirmed Cloud Auth email matching the server-verified checkout email; never return checkout PII to unauthenticated callers.
- Claim each checkout session once in the private submission ledger before fulfillment; retain failed claims for manual recovery to avoid duplicate external automations.
- Keep checkout validation and submission orchestration in server-only helpers called by typed server functions; never trust URL parameters or client email as identity.
