# Slack onboarding funnel — plan

Replace the "book a launch call" step with a Slack-based onboarding flow, powered by the user's Slack bot token (saved as a secret).

## Flow

1. **Step 1 — Intake form** (unchanged): client fills out the form; answers go to the Google Sheet and files to storage as today.
2. **Step 2 — Slack invite**: after submitting, the client lands on a page that invites them into the Lead Genisys Slack workspace instead of showing the booking calendar.
3. **Step 3 — You're in**: confirmation page explaining what happens next (accept the Slack invite, join the channel, that's where communication happens).

## Slack integration (server-side)

New `src/lib/slack.server.ts` using the Slack Web API with the bot token:

- **On every intake submission** (in `recordIntakeSubmission`, fire-and-forget so sheet writes never break):
  - Look up the alerts channel `#internal-alerts`; if it doesn't exist, the bot **creates it** (public channel) on first submission.
  - Post a "new client onboarded" alert to `#internal-alerts` with the client's name, business, email, and phone.
  - Invite the client to the workspace via `admin.users.invite`-style flow where the plan allows; if the workspace plan doesn't support programmatic invites, the alert in `#internal-alerts` tells the team to send the client an invite link manually.
- Bot token is read from the `SLACK_BOT_TOKEN` secret inside the handler (never in browser code).

## UI changes

- `src/routes/step-2.tsx`: remove the booking calendar iframe; show a "Join us on Slack" panel with a button linking to the workspace invite URL, same pill-button style.
- `src/routes/step-3.tsx`: confirmation copy focused on Slack — accept the invite, open Slack, say hello in the channel.
- Progress header labels updated (Intake → Join Slack → Done).

## What I need from you

- `SLACK_BOT_TOKEN` — requested via the secure secrets form.
- The Slack workspace invite link to show clients on Step 2 (or I use a placeholder you can swap).

## Verification

- Typecheck + build.
- Test submission end-to-end: sheet row written, `#internal-alerts` created (first time), alert posted.
