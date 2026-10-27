# Student roadmap (Phase 0–3) — status

Completed and last verified: 2026-09-22.

This is the roadmap actually approved and implemented on 2026-09-22 — see
[DECISIONS.md](./DECISIONS.md) for how it was scoped. It uses its own
Phase 0–3 numbering, which is **unrelated** to the Phase 0–5 numbering in
`docs/history/NOTE-NIRMAN-2-ROADMAP.md` (an earlier, different, and mostly
unshipped initiative — see [DORMANT-CODE.md](./DORMANT-CODE.md)). Two
different roadmaps used the word "Phase" for two different things; this
note exists so that's not a trap for later.

Ground rule the whole roadmap was built under: additive only. Keep the
existing architecture, the 13 seasonal themes, the TipTap editor, and every
already-working feature. Nothing redesigned unless a feature strictly
required it.

## Phase 0 — make what we say true, and unblock users

| Item | Status |
| :--- | :--- |
| Correct landing-page claims to match real features | Done |
| Sync freshness: pull on focus + every ~30s, don't clobber unsynced local edits | Done (`syncEngine.ts`) |
| Trash instead of hard delete, 30-day recovery | Done (`TrashModal.tsx`, `syncEngine.ts`) |
| Release pipeline (public repo/releases decision, Android signing secrets, `v0.1.0` tag) | **Not done** — open decision, see [DECISIONS.md](./DECISIONS.md) |

## Phase 1 — wire up what was already built

| Item | Status |
| :--- | :--- |
| Backup/restore + JSON/HTML/Markdown export | Done — wired into `ProfileModal.tsx` via `backupEngine.ts`, `exportPipeline.ts` |
| Import from Markdown/HTML/Text/CSV | Done — `importPipeline.ts`, wired into `ProfileModal.tsx` |
| Real PDF text extraction | Done — `pdfTextImport.ts` (pdfjs-dist), editor toolbar |
| Real on-device OCR | Done — `imageTextImport.ts` (tesseract.js), editor toolbar |
| Version history / trash / restore | Trash: done. Full version history: **not done** (`historyService.ts` exists but is part of the dormant collaboration subsystem — see [DORMANT-CODE.md](./DORMANT-CODE.md)) |
| App lock / encrypted notes | Done — per-note passphrase lock, AES-256-GCM (`noteLock.ts`) |
| "Ask your notes" semantic search + Q&A | **Not done** — the dormant implementation (`ragPipeline.ts`, `CopilotDrawer.tsx`) was deleted on 2026-10-27, recoverable from git history; would need Gemini cost controls (`quotaManager.ts`) before enabling for everyone |
| Voice notes with transcription | **Not done** — only plain voice dictation shipped (`useSpeechRecognition.ts`), not recording+transcription (`audioRecorder.ts`/`transcriptionService.ts` are dormant) |
| Reminders and study calendar | Reminders: done (`reminderEngine.ts`, `RemindersModal.tsx`). Full calendar view: **not done** |

## Phase 2 — new student-focused features

| Item | Status |
| :--- | :--- |
| Tables | Done — TipTap table extension + slash menu |
| Maths / LaTeX | Done — KaTeX, inline and block |
| Templates | Done — `noteTemplates.ts`, `TemplatePicker.tsx` |
| Notebooks / folders | Done — built on the existing tag system (`notebook:` prefix), no schema change |
| `[[Wiki links]]` + backlinks + graph view | Done — `noteLinks.ts`, `linkGraph.ts`, `LinkGraphModal.tsx` |
| Flashcards with spaced repetition | Done — `flashcards.ts`, simplified SM-2 |
| Find-in-note, word count, focus mode, Pomodoro timer | Done — editor toolbar additions |
| Quick capture (share-to-app) | Done — PWA `share_target`, `sharedContent.ts` |
| Handwriting / stylus canvas | **Not done** — explicitly deferred in the original plan; `handwritingService.ts` exists but has no canvas UI, and is part of the dormant subsystem regardless |

## Phase 3 — India-specific and growth features

| Item | Status |
| :--- | :--- |
| Offline web app (service worker, install prompt) | Done — `public/sw.js`, app-shell caching |
| New logo with Indian iconographic meaning | Done — `public/logo.svg`, applied across web/PWA/Android/Windows icons |
| SEO / GEO (structured data, robots.txt, sitemap, llms.txt) | Done (added slightly after the rest of Phase 3, same day) |
| Hindi / regional-language UI | **Not done** |
| Low-data mode | **Not done** |
| Share a note by link (read-only) | **Not done** |
| Real-time collaboration / study groups | **Not done** — would build on the dormant Yjs subsystem, needs an RLS design review first per the original plan |
| Google Calendar / Classroom integration | **Not done** |

## Not part of this roadmap at all

The block editor migration (`UniversalBlockEditor`) was explicitly out of
scope from the start of this roadmap, independent of its dormant status —
see [DECISIONS.md](./DECISIONS.md).

## Next candidates, if picking this back up

In rough priority order, based on what's marked "not done" above and has
the best payoff-to-risk ratio:
1. Release pipeline: decide repo visibility, add Android signing secrets,
   tag `v0.1.0`. Nothing above matters to real users until this is done —
   see [SETUP.md](./SETUP.md) and [DECISIONS.md](./DECISIONS.md).
2. "Ask your notes" — the dormant RAG pipeline is the single most-built,
   most-differentiating unused feature. Needs Gemini quota enforcement
   server-side before it's safe to turn on for everyone.
3. Voice recording + transcription (distinct from the dictation that
   already ships).
4. Hindi/regional-language UI — check Devanagari and other script
   rendering in the editor fonts first.
