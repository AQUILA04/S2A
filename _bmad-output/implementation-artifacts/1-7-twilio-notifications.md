# Story 1.7: Scalable User Notifications & Activation

Status: pending

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As the System,
I want to asynchronously notify newly created members (single or mass import) via WhatsApp or SMS,
So that they receive a secure activation link to set their password without overloading third-party API rate limits or sending clear-text passwords.

## Acceptance Criteria

1. **Given** a new member is created individually or via bulk import **When** the transaction commits **Then** the system inserts a task into a new `NotificationQueue` table rather than making synchronous calls to Twilio.
2. **Given** the `NotificationQueue` has pending records **When** the scheduled Supabase worker runs (`pg_cron`) **Then** it processes up to a safe batch limit (e.g., 50) and formats the target phone number strictly as `+228XXXXXXXX` at runtime.
3. **Given** a queued notification is being processed **When** the notification template is dispatched **Then** the system attempts to send a rich WhatsApp message first. If it fails or is un-deliverable immediately, it falls back to a concise SMS message that is strictly under 160 GSM-7 characters.
4. **Given** the notification message **When** it is constructed **Then** it must contain a secure, one-time activation magic link (or token) allowing the user to set their password, and it must NEVER include a generated password in clear text.
5. **Given** a user clicks the activation link **When** they submit their new custom password **Then** their password is hashed, the token is invalidated, and their `account_status` goes from `PENDING_ACTIVATION` to `ACTIVE`.

## Tasks / Subtasks

- [ ] Task 1: Database Updates (NotificationQueue & Tokens)
  - [ ] Subtask 1.1: Create `V003__notification_queue_and_tokens.sql` migration.
  - [ ] Subtask 1.2: Add a `NotificationQueue` table (columns: `id`, `member_id_ref`, `status` [PENDING, SENT, FAILED], `channel_used`, `error_log`, `created_at`).
  - [ ] Subtask 1.3: Add a `member_activation_tokens` table or column (token string, expiry timestamp, member_id).

- [ ] Task 2: Refactor Create Actions (Story 1.2 & 1.6)
  - [ ] Subtask 2.1: Update `createMember` to no longer generate/set a clear-text password immediately. Instead, generate a secure random token.
  - [ ] Subtask 2.2: Update `bulkImportMembers` to generate tokens for all users in the batch.
  - [ ] Subtask 2.3: In both actions, insert a corresponding row into `NotificationQueue` after member creation.
  - [ ] Subtask 2.4: Update Zod `phone` schemas to rigorously validate Togo numbers. If the number starts with `228`, the next two digits must be a valid carrier prefix (`90|91|92|93|70|71|99|98|97|96|79|78`), followed by 6 digits. (Regex: `^228(90|91|92|93|70|71|99|98|97|96|79|78)\d{6}$`). If it does not start with `228`, standard numeric validation applies.

- [ ] Task 3: Twilio Integration & Templates
  - [ ] Subtask 3.1: Install `twilio` NPM package and add `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_PHONE_NUMBER` to environment validation.
  - [ ] Subtask 3.2: Create message template functions. WhatsApp: rich template with the full platform URL. SMS: lean template strictly under 160 characters (e.g., using a short route like `s2a.tg/a/[token]`).
  - [ ] Subtask 3.3: Implement the `+228` prepend logic at runtime for Twilio payload compilation.

- [ ] Task 4: Supabase Worker / Route Handler
  - [ ] Subtask 4.1: Create a Next.js API route `POST /api/cron/process-notifications` (or an equivalent Edge Function logic).
  - [ ] Subtask 4.2: Implement logic to select 50 `PENDING` queue items, attempt Twilio WhatsApp -> SMS fallback, and update the queue status to `SENT` or `FAILED`.
  - [ ] Subtask 4.3: Secure the cron endpoint so it can only be hit by the registered Supabase `pg_cron` IP or an internal secret.

- [ ] Task 5: Activation UI Flow
  - [ ] Subtask 5.1: Create `app/activate/page.tsx` that reads the `?token=` parameter.
  - [ ] Subtask 5.2: Provide a form to input and confirm the new password.
  - [ ] Subtask 5.3: Create server action `activateAccount(token, newPassword)` that hashes password, sets `account_status = 'ACTIVE'`, and invalidates the token.

## Dev Notes

- **Architecture:** Keep Twilio completely out of the front-end boundaries. This ensures credentials cannot be leaked.
- **Queue System:** If deployed on Vercel, free tier doesn't support 1-minute crons, so setting up `pg_cron` in the Supabase Dashboard to ping the Next.js API route is the architecture of choice. You can trigger the api endpoint manually for development testing.
- **SMS Limit:** Remember GSM-7 charset limitations. Some standard accents (like `é` or `è`) might force Unicode encoding, dropping the character limit to 70. Either strip accents in the SMS tier or ensure the SMS is extremely short.
- **Security:** Do not log full phone numbers in standard Vercel logs to respect PII policies (`console.log()` should mask the number strings). Only full numbers reside in the `NotificationQueue` table.

## References

- [Source: _bmad-output/planning-artifacts/prd.md]
- [Source: _bmad-output/planning-artifacts/epics.md]
- [Source: _bmad-output/implementation-artifacts/1-2-member-management-crud.md]
- [Source: _bmad-output/implementation-artifacts/1-6-mass-member-import.md]
