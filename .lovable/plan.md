# Onboard clients into Slack instead of booking a call

## What changes for the client
1. They submit the intake form as they do now.
2. Step 2 becomes "Join us on Slack". The booking calendar is removed.
3. Right away, our Slack bot:
   - creates a private channel just for them, e.g. `#client-smith-plumbing`
   - adds your team to it
   - emails the client a Slack Connect invite to that channel, using their lead email
   - posts a summary of the submission to your internal channel (e.g. `#new-clients`)
4. Step 2 tells them to check their email and accept the Slack invite. It also has a button that opens Slack.
5. Step 3 ("You're in") is reworded around Slack, with no mention of a booked call.

If Slack can't send the invite (for example, the trial has ended or the email is already in use), the submission still saves to the Google Sheet and webhook. The error is posted in `#new-clients` so your team can invite the client by hand.

## What I need from you
- Your bot token. I'll open a secure form for it.
- The bot needs these permissions: `channels:manage`, `groups:write`, `chat:write`, `conversations.connect:write`, `users:read`, `users:read.email`.
- The name of the internal channel for alerts. The bot must be invited to it.
- Which team members to add to each client channel (their Slack emails).

Note: Slack Connect invites only work on paid plans (Pro and above). Your Pro trial covers this for now. It will stop working if the trial ends without an upgrade.

## Technical details
- New `src/lib/slack.server.ts`: `slackFetch` using `SLACK_BOT_TOKEN`, direct to `https://slack.com/api` (a custom bot token, not a Lovable connector). Uses `conversations.create` (is_private, slugified name, adds a numeric suffix if the name is taken), `users.lookupByEmail` + `conversations.invite` for team members, `conversations.inviteShared` (emails=[leadEmail]), and `chat.postMessage` to the alert channel.
- Secrets: `SLACK_BOT_TOKEN`, `SLACK_ALERT_CHANNEL`, `SLACK_TEAM_EMAILS` (comma-separated).
- `recordIntakeSubmission` calls `onboardToSlack(payload)` after the sheet append. It is wrapped so it never throws and returns `{ channelName, invited }` to the form.
- `IntakeForm` success state links to `/step-2`. `src/routes/step-2.tsx` is rewritten as the Slack join page (head metadata updated). `step-3.tsx` copy is updated. `OnboardingHeader` step labels are updated.
- The inbound webhook route gets the same Slack onboarding for free.
