# Setup and build guide

Last verified against the code: 2026-09-22. Supersedes
`docs/history/ENVIRONMENT_SETUP.md` and `docs/history/ANDROID_SETUP.md`
(both described an old `app/` subfolder layout that no longer exists — the
project has lived at the repo root since).

## Prerequisites

- **Node.js** 18+ (20+ recommended) and npm 9+
- For the Windows desktop build: **Rust** + the Tauri CLI prerequisites
  (see [tauri.app/start/prerequisites](https://tauri.app/start/prerequisites/))
- For the Android build: **JDK 21**, **Android Studio** or the Android SDK
  command-line tools (SDK Platform 33+, Build-Tools), and a device or
  emulator to test on
- A Supabase project (free tier is enough) if you want auth/sync to work
  against your own backend rather than reading the app in local-only mode

## 1. Clone and install

```bash
git clone https://github.com/Rhytam23/note-saver.git
cd note-saver
npm install
```

## 2. Environment variables

Copy `.env.example` to `.env` and fill in real values — **never commit
`.env`**:

```env
VITE_SUPABASE_URL=https://your-supabase-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
VITE_GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
```

- `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY`: from your Supabase
  project's API settings. The anon key is safe to expose client-side by
  design (RLS does the real access control — see
  [ARCHITECTURE.md](./ARCHITECTURE.md#security)).
- `VITE_GOOGLE_CLIENT_ID`: only needed if you want "Sign in with Google" to
  work; email/password auth works without it.
- The Gemini API key is **not** a `VITE_` variable and does not go in this
  file — it's a Supabase Edge Function secret (step 5).

## 3. Run the web app

```bash
npm run dev       # Vite dev server on http://localhost:3000
npm run build      # production build to dist/
npm run preview    # serve the production build locally
```

## 4. Everyday checks

```bash
npx tsc --noEmit    # type check
npm run lint         # eslint src --ext .ts,.tsx
npm test              # vitest run (622 tests as of 2026-10-27)
```

## 5. Supabase backend (auth, sync, AI proxy)

The app works in local-only mode with no Supabase project at all (notes
just never leave the device). To get sync and the AI assistant working:

1. Create a Supabase project.
2. Apply the SQL migrations in `supabase/migrations/` in filename order
   (via the Supabase SQL editor, or `supabase db push` if you have the CLI
   linked).
   Two of them are special: `20261027000000_realtime_collaboration_authorization.sql`
   locks collaboration channels to the note owner and is cheap to apply;
   `20261027010000_purge_locked_notes_search.sql` needs the pgvector search
   tables from `20260906000000_phase4_pgvector_search.sql` and only makes sense
   if you turn semantic search on (it will fail without them). See
   [DECISIONS.md](./DECISIONS.md), 2026-10-27, for what is applied on the live
   project.
3. Deploy the Edge Functions actually used by the live app:
   ```bash
   supabase functions deploy gemini-proxy
   ```
   (`gemini-embed` and `gemini-copilot` also exist but back the dormant
   RAG/semantic-search feature — see
   [DORMANT-CODE.md](./DORMANT-CODE.md) — you don't need them for the app
   to work.)
4. Set the Gemini key as a function secret, not a client env var:
   ```bash
   supabase secrets set GEMINI_API_KEY=your-key
   ```
5. Put the project's URL/anon key into `.env` as in step 2.

### Telegram bot (optional)

Write, read and manage notes from Telegram; everything syncs through the same
`notes` table. All of it lives in the top-level [`telegram/`](../telegram)
folder, and the full setup (BotFather, secrets, deploy, webhook, reminders) is
in [`telegram/README.md`](../telegram/README.md). In short:

```bash
supabase secrets set TELEGRAM_BOT_TOKEN=... TELEGRAM_WEBHOOK_SECRET=... CRON_SECRET=...
supabase db push
supabase functions deploy telegram-bot --no-verify-jwt
npm run bot:register      # webhook + command menu, run on your machine
```

then set `VITE_TELEGRAM_BOT_USERNAME` and redeploy the web app.

## 6. Windows desktop build (Tauri)

```bash
npm run tauri:dev     # run the desktop shell against the dev server
npm run tauri:build    # produce release artifacts
```

Build output lands in `src-tauri/target/release/bundle/`:
- `nsis/NoteNirman_<version>_x64-setup.exe` — the installer
- `msi/NoteNirman_<version>_x64_en-US.msi` — alternative MSI installer

The installer is not code-signed. Windows SmartScreen will warn on first
run; users need to choose "More info" → "Run anyway."

### Microsoft Store package (MSIX)

A separate, optional packaging step wraps the same `.exe` into an MSIX for
Store submission: `src-tauri/msix/build-msix.ps1`. Full walkthrough,
including the Partner Center account/identity-reservation steps only the
account owner can do, is in [MICROSOFT-STORE.md](./MICROSOFT-STORE.md).

## 7. Android build (Capacitor)

```bash
npm run build              # build the web assets first
npx cap sync android         # copy web assets + plugins into the Android project
npx cap open android          # open android/ in Android Studio
```

From Android Studio: **Build → Generate Signed Bundle / APK**. For local
testing on a device without signing, **Build → Build APK(s)** produces a
debug APK you can sideload directly.

**Keep any release keystore and its passwords somewhere safe outside the
repo.** Losing it means you can never publish an update to an app that
used it — Android treats a different signing key as a different app.

### CI release build

`.github/workflows/release.yml` builds both the Windows installer and an
Android APK/AAB on every `v*` tag push, and publishes them as GitHub
release assets. The Android job needs these repository secrets to produce a
*signed* release APK — without them it falls back to a throwaway debug key,
which cannot receive future updates in place:

- `ANDROID_KEYSTORE_BASE64` (the keystore file, base64-encoded)
- `ANDROID_KEYSTORE_PASSWORD`
- `ANDROID_KEY_ALIAS`
- `ANDROID_KEY_PASSWORD`

As of 2026-09-22 these secrets are not set, and no `v0.1.0` tag has been
pushed — see [DECISIONS.md](./DECISIONS.md) for the current state of the
release/repo-visibility question.

## Known gaps as of 2026-10-12

- The AI assistant needs the Supabase Edge Functions (`gemini-proxy`, `gemini-copilot`,
  `gemini-embed`) deployed to your own project with `GEMINI_API_KEY` and the Upstash Redis
  secrets set (see above). Without them the app works fully, but the AI features return an error.
- Android APKs are sideloaded (there is no Play Store listing), and the Android signing
  secrets above must be set in your own fork for CI to build a signed release.
- A real, working Windows installer *has* been built locally
  (`src-tauri/target/release/bundle/nsis/...-setup.exe`, v0.1.0). Installers
  are no longer committed to the repo: releases upload them to GitHub
  Releases, and the website's `/downloads/*` links redirect there (see
  `vercel.json` and the 2026-10-11 entry in
  [DECISIONS.md](./DECISIONS.md)). Those redirects only work for visitors
  once the repository is public.
