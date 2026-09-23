# Architecture

Last verified against the code: 2026-09-22. If this ever drifts from
reality, trust the code and fix this file — that's the whole point of it
existing.

This describes what the **live app** actually does. For code that exists in
the repo but nothing runs, see [DORMANT-CODE.md](./DORMANT-CODE.md).

## What this app is

NoteNirman is an offline-first notes app aimed at students, for Windows,
Android and the web. The one sentence that matters most: **every note is
written to the device first; syncing to the cloud is a background
convenience, never a requirement to keep working.**

## Tech stack

| Layer | Choice | Where |
| :--- | :--- | :--- |
| UI framework | React 19 + TypeScript 5.8 | `src/` |
| Build tool | Vite 6 | `vite.config.ts` |
| Styling | Tailwind CSS + Framer Motion | `src/index.css`, components |
| Rich text editor | TipTap 3 (StarterKit + custom extensions) | `src/components/NoteEditor.tsx`, `src/extensions/` |
| Local storage | IndexedDB via the `idb` package | `src/services/localDb.ts` |
| Cloud database + auth | Supabase (Postgres, Auth, Edge Functions) | `src/services/supabase.ts`, `supabase/` |
| AI assistant | Google Gemini, called through a Supabase Edge Function proxy (key never reaches the client) | `supabase/functions/gemini-proxy`, `src/services/geminiService.ts` |
| Desktop packaging | Tauri 2 (Rust) | `src-tauri/` |
| Android packaging | Capacitor 8 | `android/` |
| Tests | Vitest | `src/**/__tests__/` |

## Data model

The canonical shape of a note (`src/types.ts`):

```typescript
interface Note {
  id: string;
  title: string;
  content: string;      // HTML string produced by TipTap — the ONE canonical format
  tags: string[];        // also used for notebooks and colour-coding, see below
  createdAt: string;
  updatedAt: string;
  isPinned: boolean;
  priority: 'high' | 'medium' | 'low' | 'none';
  coverImage?: string;
  // + SyncMeta: version, syncStatus, deleted, deletedAt, conflictServerData
}
```

There is deliberately **no separate block/database table**. Every feature
added on top of this app since the original design (notebooks, wiki links,
flashcards, locked notes) was built to fit inside this same shape rather
than changing the schema — see "How features are layered on" below.

## Storage and sync

- **Source of truth on each device**: IndexedDB, database name
  `notenirman-offline` (`src/services/localDb.ts`). Every write goes here
  first, synchronously with the UI, before anything touches the network.
- **Cloud mirror**: Supabase Postgres, one `notes` row per note, isolated
  per user with Row Level Security (`auth.uid() = user_id`). It exists so a
  second device can catch up — it is not where "the real data" lives.
- **Sync engine** (`src/services/syncEngine.ts`):
  1. A local edit enqueues an operation in an on-device `syncQueue` store
     and immediately marks the note `syncStatus: 'pending'`.
  2. Queued operations are pushed to Supabase in the background, with
     retry/backoff when offline.
  3. The engine also **pulls** from Supabase: on `visibilitychange` (tab/app
     regains focus) and on a ~30s timer while active, not just on push. This
     is what makes "write on phone, open on PC later" actually show the
     phone's edits without a restart.
  4. Conflicts use optimistic per-note versioning (a `version` column bumped
     by a Postgres trigger on every write). If the server version has moved
     past what the client last saw, the write is flagged
     `syncStatus: 'conflict'` and the server copy is kept alongside the
     local one for the user to resolve, rather than silently overwriting
     either side.
- **Trash**: a note marked deleted is kept locally (not hard-deleted) for
  30 days (`TRASH_RETENTION_DAYS` in `syncEngine.ts`) so it's recoverable,
  then purged.
- **Offline web**: `public/sw.js` is a service worker that caches only the
  app shell (HTML/JS/CSS/icons) — never note data, which always comes from
  IndexedDB. This is what lets the PWA open with no network at all after
  the first visit.

## How features are layered on top of one `Note.content` HTML string

This is the pattern used repeatedly in the 2026-09-22 feature pass, and
worth understanding before adding another feature:

| Feature | How it avoids a schema change |
| :--- | :--- |
| **Notebooks** (`src/services/notebooks.ts`) | A tag with a `notebook:Subject/Chapter` prefix. Notebooks are a *view* over the existing tag system, nothing more. |
| **Wiki links & backlinks** (`src/services/noteLinks.ts`) | `[[Note Title]]` is parsed out of the HTML content string at read time (regex `WIKI_LINK`), resolved against other notes' titles. No link table. |
| **Flashcards** (`src/services/flashcards.ts`) | Any line matching `Question:: Answer` inside a note's HTML is extracted as a card. Review progress is stored separately via `localDb.setMeta('flashcards:' + userId, ...)`. |
| **Per-note lock** (`src/services/noteLock.ts`) | The note's `content` field is replaced with an AES-256-GCM ciphertext prefixed with a marker (`NNLOCK1:`). `isLockedContent()` checks for that prefix. No new field, no schema migration — a locked note is just a `Note` whose `content` happens to be encrypted. |

If you're adding a new feature, prefer this pattern (derive it from
existing fields) over adding a new IndexedDB store or Supabase table, unless
the feature genuinely needs cross-note indexing that can't be done cheaply
at read time.

## AI assistant

`NoteEditor.tsx` calls `geminiService.ts`, which calls the Supabase Edge
Function `gemini-proxy` (`supabase/functions/gemini-proxy/`). The Gemini API
key lives only in the Edge Function's environment — it is never bundled
into client JS. The proxy validates the caller's Supabase JWT and
rate-limits requests. This is a plain request/response flow (summarize,
proofread, generate ideas, detect AI-written text) — it does **not** use
the vector search / RAG pipeline described in
[DORMANT-CODE.md](./DORMANT-CODE.md); that's a separate, unwired subsystem.

## Telegram bot (fourth client)

`telegram/bot/` (deployed as the Edge Function `telegram-bot`) is a Telegram webhook that reads and writes
the same `notes` table as the apps, so notes written in Telegram sync to the
phone, desktop and web through the existing sync engine with no extra sync
code. Everything Telegram-related lives in [`telegram/`](../telegram); setup is in [`telegram/README.md`](../telegram/README.md).

- **Linking:** the bot issues a one-time 10-minute code (`/start`); the signed-in
  user types it into Profile > Telegram (`telegram/app/`) and confirms which
  Telegram account it belongs to. A database function (`claim_telegram_pairing`)
  links the caller's account to that chat and rate-limits guessing. An unlinked
  chat can do nothing; only `/start` and `/help` work.
- **Service role, so scoping is in code.** The function uses the service-role
  key, which bypasses RLS. Every `notes` query is filtered by the linked
  `user_id`; there is no code path that reads a note by id alone.
- **Sync compatibility.** Inserts use `version: 1`. Updates never set
  `version` or `updated_at`; the `notes_bump_version` trigger does, exactly as
  for app writes. Content edits are guarded by the version that was read and
  retried once, so they can't silently overwrite a concurrent app edit.
  Deleting is the same soft delete the app uses (`deleted`, `deleted_at`).
- **Locked notes are opaque to the bot.** Their content is ciphertext
  (`NNLOCK1:`); the bot lists them by title with a lock icon and refuses to
  show, edit, copy, export, search or summarise their content.
- **Archive is a reserved tag** (`archived`), because the app has no archive
  column. The bot hides those notes from its lists; the app shows the tag.
- **One registry, no drift.** `telegram/bot/_shared/commands.ts` drives
  `/help`, routing and Telegram's `setMyCommands` menu. Pure app logic the bot
  needs (`flashcards`, `noteLinks`, `noteTemplates`, the lock prefix) is
  mirrored into `_shared/generated/` by `telegram/scripts/sync-bot-shared.mjs`, which
  also copies `telegram/bot/` to `supabase/functions/telegram-bot/` (Supabase only
  deploys from there). A test fails if any copy is stale.
- **Conversation state** (`/title` then body, `/delete` then `/confirm`, the
  numbered list behind `/get 3`) lives in `telegram_sessions`, service-role
  only. Lists expire after 30 minutes so a stale number can't hit the wrong note.

## Real-content import features

Two features do real, on-device processing rather than being wired to a
server:
- **PDF text extraction** — `src/services/pdfTextImport.ts`, using
  `pdfjs-dist`. Runs in the browser; the file is never uploaded.
- **OCR** (photo/screenshot → text) — `src/services/imageTextImport.ts`,
  using `tesseract.js`. Also fully on-device.

(These replaced two earlier files, `pdfPipeline.ts` and
`imageOcrPipeline.ts`, that were scaffolding for the dormant block editor
and returned hardcoded placeholder text instead of real extraction. They
were deleted 2026-09-22 — see [DECISIONS.md](./DECISIONS.md).)

## Security

- **Gemini API key**: server-side only (Edge Function secret), see above.
- **Row Level Security**: every Supabase table scoping user data enforces
  `auth.uid() = user_id`.
- **Per-note lock**: AES-256-GCM via the Web Crypto API, key derived from
  the user's passphrase with PBKDF2 (150,000 iterations). The passphrase is
  never stored or transmitted — losing it means the note is unrecoverable
  by design.
- **Backup encryption**: `cryptoService.ts` offers optional AES-256-GCM
  encryption of exported workspace backups (PBKDF2, 100,000 iterations).
- **Import sanitization**: `securitySanitizer.ts` runs imported
  Markdown/HTML through DOMPurify and guards against zip-bomb style
  decompression when importing archives.

## Platforms

One codebase, three shells:

| Platform | Shell | Storage adapter fallback |
| :--- | :--- | :--- |
| Web / PWA | Vite build served as static files | IndexedDB directly, service worker for offline shell |
| Windows desktop | Tauri 2 (Rust), `src-tauri/` | Same IndexedDB-backed web code inside a native window; Tauri filesystem/notification plugins used where available, web APIs as fallback |
| Android | Capacitor 8, `android/` | Same web code inside a native WebView; Capacitor filesystem/notifications/preferences plugins where available |

The three platform adapters live under `src/services/platform/` behind a
common interface, so feature code doesn't need to branch on platform
directly.

## Project structure (live code only)

```text
note-nirman/
├── src/
│   ├── App.tsx                # App shell: routing between landing/auth/notes, modal wiring
│   ├── components/            # UI. NoteEditor.tsx (TipTap) is the actual editor.
│   │   └── editor/            # Editor toolbar add-ons: find bar, math dialog, table controls, etc.
│   ├── config/featureFlags.ts # Flags for the DORMANT subsystem — see DORMANT-CODE.md
│   ├── contexts/               # AuthContext, ThemeContext, SeasonalContext
│   ├── extensions/             # TipTap extensions (SlashCommand, Callout, EmojiSuggestion, FindInNote)
│   ├── hooks/                  # useAuth, useNotes, useConnectivity, useSpeechRecognition, ...
│   ├── services/                # Business logic — see the table above for which files are live
│   │   ├── localDb.ts          # IndexedDB authority
│   │   ├── syncEngine.ts       # The sync authority described above
│   │   ├── noteLock.ts, notebooks.ts, noteLinks.ts, flashcards.ts  # feature layers, see above
│   │   ├── pdfTextImport.ts, imageTextImport.ts                    # real on-device extraction
│   │   ├── exportService.ts, exportPipeline.ts, importPipeline.ts, backupEngine.ts
│   │   ├── geminiService.ts, geminiAdapter.ts                      # live AI assistant
│   │   └── platform/                                               # cross-platform adapters
│   └── types.ts                # Note, Tag, User, SeasonalTheme, etc.
├── supabase/
│   ├── functions/               # gemini-proxy (live), gemini-embed/gemini-copilot (dormant, see DORMANT-CODE.md)
│   └── migrations/               # Postgres schema + RLS policies
├── src-tauri/                    # Windows desktop shell
├── android/                       # Android shell
├── public/                        # Static assets, PWA manifest/service worker, SEO files (robots.txt, sitemap.xml, llms.txt)
└── docs/                          # You are here
```

## Testing

`npm test` runs the Vitest suite (463 tests as of 2026-09-22, including the
dormant subsystem's own tests, which still pass — they're just not called
by anything live). `npx tsc --noEmit` and `npm run lint` should both be
clean before anything is considered done; the project has no CI gate
enforcing this yet, so it's on the honor system.
