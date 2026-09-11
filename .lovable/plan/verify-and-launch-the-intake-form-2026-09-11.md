# Verify and launch the intake form

## Goal
Confirm the client intake form works end to end and make it live for real clients.

## Current state (verified)
- Submissions append one row per submission to the Google Sheet (Timestamp + one column per question + marketing file links). Sheet connection is linked and reachable — header row confirmed.
- Uploaded files are stored in cloud storage and written to the sheet as long-lived download links.
- Build is clean; an end-to-end test submission previously succeeded (test row removed after).

## Steps
1. Run a fresh end-to-end test: submit the form in the preview with sample answers and a test file, then read the sheet to confirm the new row landed correctly (one answer per cell).
2. Remove the test row from the sheet afterward.
3. Fix anything the test surfaces.
4. Publish the app so the live site (including your custom domain) serves the working form.

## Technical notes
- Test uses the existing `submitIntake` server function; the sheet write goes through the linked Google Sheets connection.
- No design or layout changes.
