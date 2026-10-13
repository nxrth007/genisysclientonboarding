# Intake form wording updates

- Change the document upload label to **“CP-575 Document (optional but strongly encouraged)”**, keeping the existing IRS document name and leaving the upload optional.
- Remove **“Not sure”** from the Google Business Profile question, leaving **Yes** and **No**. The existing validation uses these same choices, so it will also stop accepting “Not sure.”

## Technical details
- Update the upload label in `src/components/IntakeForm.tsx` and the profile options in `src/lib/intake-fields.ts`.
- Add and run a small validation test confirming that Yes and No are accepted and Not sure is rejected.
- Verify the form displays the revised label and only the two profile choices.