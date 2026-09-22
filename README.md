# NoteNirman 🪔

[![License](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![React](https://img.shields.io/badge/React-19.2-blue)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8-blue)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-6.2-purple)](https://vitejs.dev/)
[![Supabase](https://img.shields.io/badge/Supabase-Auth%20%26%20Postgres-green)](https://supabase.com/)

An offline-first notes app for students, for Windows, Android and the web.
Notes save to the device first; syncing to the cloud is a background
convenience, never a requirement — write on your phone, and it's waiting
for you on your desktop next time you have a connection, even if the phone
died in between. Free to use. Themed around the four seasons and Indian
festivals (Diwali, Holi, Navratri, Pongal, Independence Day, and more).

> **Where this stands right now:** the code here works and its test suite
> passes, but the GitHub repository is currently **private**, no build has
> been deployed publicly, and there's no signed Android APK yet. None of
> this is reachable by a real user today. See
> [docs/DECISIONS.md](docs/DECISIONS.md) for the full, current status.

## Features

- **Offline-first**: every note is written to the device first (IndexedDB),
  synced to Supabase in the background when online. The web app is
  installable as a PWA and keeps working fully offline after the first
  visit.
- **Editor**: TipTap-based rich text — headings, lists, checklists, tables,
  LaTeX equations, code blocks, callouts, cover images, voice dictation,
  find-in-note, focus mode, a Pomodoro timer.
- **Study tools**: flashcards with spaced repetition (write
  `Question:: Answer` in any note), five starter templates, notebooks
  grouped by subject/chapter, `[[wiki links]]` with backlinks and a visual
  connections graph.
- **Real import, not a stub**: on-device PDF text extraction and on-device
  OCR (photo/screenshot → text) — files are never uploaded to a server for
  this.
- **Optional AI assistant** (Google Gemini): summarize, proofread, generate
  ideas, detect AI-written text. The app works fully without it, and the
  API key never reaches the client — it's proxied through a Supabase Edge
  Function.
- **Security**: per-note passphrase lock (AES-256-GCM); sync over an
  encrypted connection to a private, per-user database (Postgres Row Level
  Security). A forgotten note passphrase cannot be recovered — that's by
  design.
- **Data control**: export any note as PDF/Markdown/text, back up the whole
  workspace to one file and restore it later, import from Markdown, HTML,
  text or CSV.
- **13 seasonal themes**, switched automatically by date/location or picked
  manually.

## Platforms

| Platform | How | Status |
| :--- | :--- | :--- |
| Web | Vite build, installable as a PWA | Works |
| Windows | Tauri 2 desktop app | Installer builds locally; not code-signed |
| Android | Capacitor 8 app | No signed APK exists yet — see [docs/SETUP.md](docs/SETUP.md) |

## Quick start

```bash
git clone https://github.com/Rhytam23/note-saver.git
cd note-saver
npm install
cp .env.example .env   # fill in your Supabase project details
npm run dev              # http://localhost:3000
```

```bash
npx tsc --noEmit   # type check
npm run lint        # eslint
npm test             # vitest — 463 tests as of 2026-09-22
npm run build         # production build
```

Full setup, including the Windows and Android builds and the Supabase
backend, is in [docs/SETUP.md](docs/SETUP.md).

## Project structure

```text
note-nirman/
├── src/
│   ├── App.tsx           # app shell
│   ├── components/        # UI — NoteEditor.tsx is the live TipTap editor
│   ├── services/            # business logic — sync engine, local storage, features
│   ├── contexts/, hooks/, extensions/, config/, types.ts
├── supabase/                # Postgres migrations + Edge Functions
├── src-tauri/                 # Windows desktop shell (Tauri)
├── android/                    # Android shell (Capacitor)
├── public/                      # static assets, PWA manifest/service worker, SEO files
└── docs/                          # architecture, setup, roadmap, decision log — see below
```

Not everything under `src/` is live — a sizeable subsystem (block editor,
real-time collaboration, semantic search) was built in an earlier pass and
kept but never wired in. Before assuming a file is used just because it
exists, see [docs/DORMANT-CODE.md](docs/DORMANT-CODE.md).

## Documentation

Start at [docs/README.md](docs/README.md) — it's the index and reading
order for everything below:

- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) — how the app actually works
- [docs/DORMANT-CODE.md](docs/DORMANT-CODE.md) — what's in the repo but not running
- [docs/SETUP.md](docs/SETUP.md) — full build/dev/deploy guide, all platforms
- [docs/ROADMAP.md](docs/ROADMAP.md) — feature roadmap status
- [docs/DECISIONS.md](docs/DECISIONS.md) — dated log of why things are the way they are
- [docs/history/](docs/history/) — superseded documents, kept for the trail

## License

MIT — see [LICENSE](LICENSE).
