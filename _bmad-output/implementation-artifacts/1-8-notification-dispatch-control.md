# Story 1.8: Notification Dispatch Control (Admin Console)

Status: pending

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As an Administrator,
I want a global toggle to mute automatic notifications and an interface to manually dispatch them,
So that I can import data or create accounts silently without spamming users, and choose to trigger notifications when I am fully ready.

## Acceptance Criteria

1. **Given** the GS or President accesses the Admin Settings **When** they toggle the "Global Automatic Notifications" setting to OFF **Then** the system updates a global configuration state.
2. **Given** global notifications are turned OFF **When** the Scheduled Notification Worker (`pg_cron`) fires **Then** it skips execution and leaves all `PENDING` items untouched in the `NotificationQueue` table.
3. **Given** there are pending notifications in the queue **When** the global toggle is turned back ON **Then** the worker resumes processing the backlog during its next cycles.
4. **Given** global notifications are OFF (or ON) **When** an Admin navigates to the "Pending Notifications" console **Then** they can see a list of users who have not yet been notified.
5. **Given** an Admin is on the Pending Notifications console **When** they select one or more users and click "Force Dispatch" **Then** the notifications are immediately dispatched to those selected users (via a direct Server Action), regardless of the global pause setting.

## Tasks / Subtasks

- [ ] Task 1: Global Configuration State
  - [ ] Subtask 1.1: Create a `SystemSettings` table (key/value pair) or environment variable proxy for runtime settings. E.g., `key: 'auto_notifications_enabled', value: 'true'`.
  - [ ] Subtask 1.2: Add Server Actions to `.get()` and `.set()` this configuration flag securely.

- [ ] Task 2: Update the `pg_cron` Queue Worker (from Story 1.7)
  - [ ] Subtask 2.1: The worker must first check `auto_notifications_enabled`. 
  - [ ] Subtask 2.2: If `true`, process `PENDING` queue items normally.
  - [ ] Subtask 2.3: If `false`, gracefully exit with `200 OK` (so the cron doesn't flag an error) but perform `0` dispatches.

- [ ] Task 3: Admin Global Pause UI
  - [ ] Subtask 3.1: Add a toggle switch in `app/admin/settings/page.tsx` (or similar) labeled "Envoi Automatique des Notifications".
  - [ ] Subtask 3.2: Connect the toggle to the `SystemSettings` Server Action with appropriate toast feedback.

- [ ] Task 4: Pending Notifications Dispatch Console
  - [ ] Subtask 4.1: Create a generic UI (Data Table) under `/admin/members/notifications` showing members with `PENDING` items in `NotificationQueue`.
  - [ ] Subtask 4.2: Add checkboxes for multiple execution (Bulk Select).
  - [ ] Subtask 4.3: Create a Server Action `forceDispatchNotifications(queueIds: number[])` that bypasses the global check, processes the Twilio payload for the selected items, and updates their status to `SENT` or `FAILED`.
  - [ ] Subtask 4.4: Add a "Force Dispatch" button to the UI that calls this action and dynamically updates the table state.

## Dev Notes

- **Separation of Concerns:** Story 1.7 handles the underlying routing logic, API calls, and payload generation. Story 1.8 acts purely as the traffic light (Red/Green logic) and manual override switch. 
- **Bulk Action Limits:** Even for manual "Force Dispatch", respect Vercel's Server Action timeout limits (max 10-15s). If an Admin selects 500 members to force dispatch, process them in chunks or warn the user to use the Global Toggle if they wish to send all.
- **Queue Status:** A notification shouldn't be deleted after sending—keep it marked as `SENT` with a timestamp for auditability.

## References

- [Source: _bmad-output/planning-artifacts/prd.md]
- [Source: _bmad-output/planning-artifacts/epics.md]
- [Source: _bmad-output/implementation-artifacts/1-7-twilio-notifications.md]
