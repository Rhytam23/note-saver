# Dormant code: what's in the repo but not in the app

Last verified: 2026-09-22. Amended 2026-10-27: the realtime collaboration engine and the AI-search
indexer/RAG chain were deleted, see "Removed on 2026-10-27" below.

If you're reading this 20 years from now and wondering "why is there a Yjs
CRDT collaboration engine, an AI RAG pipeline, and a block-based editor in
this codebase when the app is clearly a plain TipTap notes app" — this
document is the answer. It exists specifically so that question has one
place to go instead of forcing you to archaeology your way through git log.

## The short version

In mid-2026 an earlier pass at this project ("NoteNirman 2.0") set out to
rebuild the app around a Notion-style block editor with real-time
collaboration (Yjs CRDTs), a semantic-search/RAG "ask your notes" AI
feature, and a bunch of adjacent infrastructure (attachment dedup, calendar,
portability/export formats, migrations, quota management). A large amount of
that was actually written and has passing tests — but on 2026-09-22 it was
reviewed against what the app actually needed for its real audience
(students), and the redesign was explicitly rejected in favor of keeping the
existing TipTap editor, the 13 seasonal themes, and the existing UI, and
adding features incrementally on top of that instead. See
[DECISIONS.md](./DECISIONS.md) for the full reasoning.

That left a body of code that:
- compiles and has tests that pass,
- is **never imported by anything the running app actually renders**,
- is gated behind `src/config/featureFlags.ts`, where every flag defaults
  to `false` and nothing in the live app ever calls `setFeatureFlag(...)`
  to turn one on.

It was deliberately **not deleted** (the user's explicit choice when asked:
"delete only the parts I've now replaced with real ones," not this). It's
kept in case a future collaborator wants to pick the block-editor/CRDT
direction back up. Just don't mistake its presence for it being live.

## Removed on 2026-10-27

The security fix in PR #47 touched three pieces of this code and, as a side
effect, made the live `src/App.tsx` call the search indexer. Rather than keep
wiring dead code into the live app, the pieces it touched were deleted:

- **Realtime collaboration**: all of `src/collaboration/` (Yjs binding,
  Realtime provider, awareness, comments, history) and its tests.
  `UniversalBlockEditor.tsx` lost its collaboration props and status badge.
- **AI-search chain**: `searchIndexer.ts`, `vectorSearchService.ts`,
  `ragPipeline.ts`, `hybridSearchEngine.ts`, `CopilotDrawer.tsx` and their tests.
  The lock/unlock calls in `App.tsx` were removed.

Left in place on purpose: `localSearchService.ts`, `lexicalIndexDb.ts`,
`citationValidator.ts`, `search.worker.ts`, the `gemini-embed` and
`gemini-copilot` Edge Function sources, the `COLLABORATION`/`CRDT_COLLAB`
feature flags, and the SQL migrations (the realtime policy migration is
already applied to the live project and is harmless without a client). The
`yjs` package stays because `backupEngine.ts` uses it. Git history has the
deleted files if this direction is ever revived. Reasoning is in
[DECISIONS.md](./DECISIONS.md), 2026-10-27.

## How to verify this yourself

```bash
# Nothing outside the block editor's own files imports it:
grep -rn "UniversalBlockEditor" src --include=*.tsx --include=*.ts

# The deleted collaboration and RAG chain should have no references left:
grep -rln "ragPipeline\|hybridSearchEngine\|CopilotDrawer\|searchIndexer\|useCollaboration" src

# All feature flags default false, and only the two dormant modules below
# ever check them:
grep -rn "isFeatureEnabled\|setFeatureFlag" src --include=*.ts --include=*.tsx
```

## Inventory

| Area | Files | Status |
| :--- | :--- | :--- |
| Block editor | `src/components/block/*`, `src/services/blockDocument.ts`, `blockNesting.ts`, `blockOperations.ts`, `blockParser.ts`, `blockPersistence.ts`, `editorBlockAdapter.ts` | Not imported by `App.tsx` or `NoteEditor.tsx`. The live editor is TipTap (`NoteEditor.tsx`), which stores plain HTML in `Note.content` — see [ARCHITECTURE.md](./ARCHITECTURE.md). |
| Realtime collaboration | ~~`src/collaboration/*`~~ | **Deleted 2026-10-27**, see above. |
| AI semantic search / RAG | `src/services/citationValidator.ts`, `lexicalIndexDb.ts`, `localSearchService.ts`, `src/workers/search.worker.ts` (the rest of the chain, `ragPipeline`, `hybridSearchEngine`, `vectorSearchService`, `searchIndexer` and `CopilotDrawer`, was deleted 2026-10-27) | What remains has no live caller. The live Gemini assistant (summarize/proofread/ideas) is `geminiService.ts` + `geminiAdapter.ts`, called directly from `NoteEditor.tsx` — much simpler, no vector search involved. |
| Attachments / multimodal scaffolding | `src/services/attachmentStorage.ts`, `audioRecorder.ts`, `transcriptionService.ts`, `handwritingService.ts`, `webClipper.ts`, `processingJobQueue.ts` | Built for the 2.0 block editor's rich-attachment model. Not called from the live editor. (Voice **dictation**, a different and much simpler feature using the browser's `SpeechRecognition` API, is live — see `useSpeechRecognition.ts`. Don't confuse the two.) |
| Data portability core | `src/services/portabilityCore.ts` | AST-based import/export contracts for the block model. Not used — the live import/export/backup features (`importPipeline.ts`, `exportPipeline.ts`, `exportService.ts`, `backupEngine.ts`) work directly against HTML `Note.content` and are wired into `ProfileModal.tsx`. |
| Migration manager | `src/services/migrationManager.ts` | Journaled schema-migration engine built for the 2.0 data model changes (blocks, calendar, canvases). The live app's only real migration path is `src/services/migration.ts` (note: singular, different file), used for ordinary IndexedDB schema bumps in `localDb.ts`. |
| Calendar (2.0 version) | `src/services/calendarEventService.ts`, `calendarService.ts` | Two calendar services exist. Neither is wired into the UI yet. The live Reminders feature (`reminderEngine.ts`, `RemindersModal.tsx`) is separate and simpler — a flat due-date-on-a-note model, no RFC 5545 recurrence. |
| Quota / recovery / accessibility services | `src/services/quotaManager.ts`, `recoveryService.ts`, `accessibilityService.ts` | Written for the 2.0 initiative's storage/UX guarantees. Not currently called from the live app. |

## If you're picking this back up

Everything above has unit tests (`src/**/__tests__/`, run with `npm test`)
that were passing as of 2026-09-22, so it's a real starting point, not
abandoned pseudocode. But before wiring any of it into the live app:

1. Re-read [DECISIONS.md](./DECISIONS.md) for *why* it was shelved — the
   reasoning (small team, student audience, migration risk to real user
   data) may or may not still apply.
2. Treat `src/config/featureFlags.ts` as the on-ramp: flip one flag at a
   time, verify against real data, don't do a big-bang switch.
3. Anything that touches how notes are stored or synced needs the same
   regression-test rigor as `syncEngine.ts` already has
   (`syncEngineRace.test.ts` is the pattern to copy) — a bug here can lose
   a user's notes.
