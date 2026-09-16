# Add "Bringing your own domain?" question

## What the client sees

A new required question appears at the bottom of the intake form, right after the Marketing Content upload:

**"Do you plan on bringing your own domain?"** with two choices: Yes / No.

- **No selected** — a highlighted note appears under the question:
  "Please note: Lead Genisys wants your infrastructure to be yours — you own the domain, we just build on it. By selecting "No", you accept that the price of the domain you requested will still be charged on your next invoice."
- **Yes selected** — the same note area shows a short line plus a button, "Open the DNS access guide", which opens a new page in a new tab explaining how to give DNS access to alex@leadgenisys.com. The choice stays selected; the form is not interrupted.

The answer ("Yes" or "No") is saved with the rest of the submission, so it gets its own column in the Google Sheet and its own entry in the webhook data.

## The DNS access guide page

A new page at `/dns-access` (opens in a new tab), styled like the rest of the funnel:

- Short intro: we need delegated DNS access, not your login password; never share passwords.
- The email to invite: **alex@leadgenisys.com**
- Step-by-step instructions per registrar, each in its own collapsible section: GoDaddy, Namecheap, Cloudflare, Squarespace (former Google Domains), Wix, Hostinger, Bluehost/HostGator, and a generic "my registrar isn't listed" fallback (invite a user/delegate with DNS permissions, or send the exact records we provide).
- Closing note: once the invite is accepted we confirm in Slack.

## Technical notes

- `src/lib/intake-fields.ts`: extend `IntakeField` with a `"radio"` type plus `options`, and append a `bringingOwnDomain` field. Because it is appended after the upload field, `SHEET_HEADERS` must place its label after `FILE_FIELD_LABEL` rather than relying on the current `[Timestamp, ...INTAKE_FIELDS, FILE_FIELD_LABEL]` order — introduce an explicit ordering so the sheet column order matches the on-screen order.
- `src/lib/intake-validation.ts`: radio fields validate as an enum of their options (required).
- `src/lib/intake.server.ts`: row building follows the same explicit ordering as the headers; `ensureHeaderRow` already rewrites the header row when it changes, so the new column appears on the next submission. Range widened past `Z` if needed (`A1:AZ1`).
- `src/components/IntakeForm.tsx`: render radio fields as two styled pill options; conditional note/button block below.
- New route `src/routes/dns-access.tsx` with its own `head()` title/description; link opened with `target="_blank" rel="noopener noreferrer"`.
- Webhook payload picks up the new field automatically (it is keyed off `INTAKE_FIELDS`).
