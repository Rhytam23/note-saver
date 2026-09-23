# NoteNirman Telegram bot

Write, read and manage your notes from Telegram. The bot reads and writes the
same Supabase `notes` table as the apps, so anything written in Telegram syncs
to the phone, desktop and web apps through the existing sync engine.

Everything Telegram-related lives in this folder:

| Folder | What it is |
| :--- | :--- |
| `bot/` | The Supabase Edge Function. `index.ts` is the webhook and command handlers; `_shared/` holds the command list and the pure logic (ordering, reminder times, text, rate limit). |
| `bot/_shared/generated/` | Copies of a few app modules the bot reuses (`flashcards`, `noteLinks`, `noteTemplates`, lock prefix, types). Generated from `src/`; do not edit. |
| `database/` | The SQL migrations (link, session, reminder and pairing tables, plus the pairing functions). |
| `app/` | The in-app part: `TelegramSection.tsx` (Profile > Telegram) and `telegramLink.ts`. |
| `scripts/` | `register-telegram-bot.mjs` (webhook and command menu) and `sync-bot-shared.mjs`. |
| `tests/` | Unit tests plus an integration test that runs the real bot against a fake Supabase and Telegram. |

## Why `supabase/` also has a copy

Supabase only deploys functions from `supabase/functions/<name>/` and only
applies migrations from `supabase/migrations/`. So `npm run bot:sync` copies
`telegram/bot/` to `supabase/functions/telegram-bot/` and `telegram/database/`
to `supabase/migrations/`. **Always edit here in `telegram/`, never the copies.**
A test fails if a copy is out of date.

```bash
npm run bot:sync      # refresh the generated and deploy copies
npm test              # includes the bot tests
```

## Commands

The full list, with usage and examples, is in `bot/_shared/commands.ts`. That
one file also drives the bot's `/help` and Telegram's `/` menu, so they can't
drift apart. In short:

- **Write:** `/title` (then send the body), `/quick`, `/template`, `/inbox`
- **Browse:** `/notes`, `/recent`, `/get`, `/search`, `/today`, `/week`, `/random`, `/tags`, `/links`
- **Edit:** `/priority`, `/pin`, `/unpin`, `/append`, `/prepend`, `/rename`, `/tag`, `/archive`, `/unarchive`, `/copy`
- **Tasks and study:** `/todo`, `/tasks`, `/card`, `/quiz`, `/answer`
- **Calendar and reminders:** `/events`, `/remind`, `/reminders`, `/timezone`
- **Trash and recovery:** `/delete` then `/confirm`, `/trash`, `/restore`, `/undo`
- **Export and AI:** `/export`, `/backup`, `/summarize`
- **Account:** `/status`, `/cancel`, `/unlink`, `/help [command]`

A plain message with no command is saved as a note titled **Emergency** (reserved tag `emergency`) and the bot tells the user to rename it in the app within 24 hours, or the scheduler moves it to the trash (recoverable with `/trash` and `/restore`). Limit: 3 per rolling 24 hours per user. Renamed notes lose the tag and are never touched. Multi-step input (`/title`, `/append`, ...) always takes priority.

## Setup

**The bot token and the two random strings are secrets. Never put them in a
commit, a chat, or a `VITE_` variable.**

1. In Telegram, message **@BotFather**, send `/newbot`, and keep the token.
2. Make two long random strings (16-256 characters of `A-Z a-z 0-9 _ -`), e.g.
   `openssl rand -hex 32`: one for the webhook, one for the reminder scheduler.
3. Set the function secrets (`GEMINI_API_KEY`, already set for `gemini-proxy`,
   is reused by `/summarize`):
   ```bash
   supabase secrets set TELEGRAM_BOT_TOKEN=... TELEGRAM_WEBHOOK_SECRET=... CRON_SECRET=...
   ```
4. Apply the migration and deploy. `--no-verify-jwt` is required because
   Telegram doesn't send a Supabase login token; the function checks the
   webhook secret itself.
   ```bash
   supabase db push
   supabase functions deploy telegram-bot --no-verify-jwt
   ```
5. Register the webhook and the full command menu (run on your own machine,
   Node 22.18+):
   ```bash
   TELEGRAM_BOT_TOKEN=... TELEGRAM_WEBHOOK_SECRET=... \
   TELEGRAM_FUNCTION_URL=https://<project-ref>.supabase.co/functions/v1/telegram-bot \
   npm run bot:register
   ```
   Re-run it whenever you add or change a command. `npm run bot:register -- --dry-run`
   prints the menu without calling Telegram.
6. Set `VITE_TELEGRAM_BOT_USERNAME` (username, no `@`) in your environment and
   in Vercel, then redeploy. **Profile > Telegram** then appears (see "Connecting
   an account" below).
7. **Reminders (optional).** `/remind` needs something to call the function
   every minute. In the Supabase SQL editor (fill in the two placeholders):
   ```sql
   create extension if not exists pg_cron;
   create extension if not exists pg_net;
   select cron.schedule('telegram-reminders', '* * * * *', $$
     select net.http_post(
       url := 'https://<project-ref>.supabase.co/functions/v1/telegram-bot',
       headers := '{"Content-Type":"application/json","x-cron-secret":"<CRON_SECRET>"}'::jsonb,
       body := '{}'::jsonb
     );
   $$);
   ```
   Without this, every other command works; reminders are stored but never sent.

## Connecting an account

1. In Telegram, send `/start` to the bot. It replies with a one-time code like `ABCD-EFGH` (valid 10 minutes).
2. In NoteNirman, open **Profile > Telegram**, type the code and press **Continue**.
3. The app shows **which Telegram account** the code belongs to (name and username). Confirm only if it is yours.
4. The bot then messages the chat "Connected" (within a minute, sent by the reminder scheduler).

The code is generated by the bot, so the app has to confirm the owner before
linking. Otherwise a stranger could start the bot, get *their* code, and talk you
into typing it in, which would give their Telegram access to your notes. Guessing
is limited to 10 attempts per 10 minutes per user (enforced in the database).

## How it stays safe

- **Linking.** The bot issues a single-use, 10-minute pairing code; the signed-in
  user enters it in the app and confirms whose Telegram account it is. The link is
  created by a database function (`claim_telegram_pairing`) that only signed-in
  users can call and that links the **caller's** account, never one named by the
  client. An unlinked chat can only use `/start` and `/help`.
- **Service role, so scoping is in code.** The function uses the service-role
  key, which bypasses row-level security. Every `notes` query is filtered by
  the linked `user_id`. Tests check that one user can't read, search, edit or
  delete another user's notes.
- **Sync-safe writes.** Inserts use `version: 1`. Updates never set `version`
  or `updated_at`; the `notes_bump_version` trigger does, as for app writes.
  Content edits are guarded by the version that was read and retried once.
  Deleting is the app's soft delete.
- **Locked notes stay locked.** Their content is encrypted in the app
  (`NNLOCK1:`); the bot shows only the title and a lock icon and never reads,
  edits, copies, exports, searches or summarises the content.
- **Archive** is the reserved tag `archived` (the app has no archive column).
- **Webhook and scheduler** are authenticated by their own secrets, compared in
  constant time. Each chat is limited to 30 messages a minute.
- Telegram chats are not end-to-end encrypted; the app says so next to the
  connect button.

## Limits

List commands read up to 1000 notes and content-searching commands up to 500
(newest first). Not built: photo or voice notes, ticking tasks from Telegram,
semantic Q&A over notes.
