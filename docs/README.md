# Documentation index

Start with the root [README.md](../README.md) for a quick overview. Come
here for depth.

**Read these, they describe the app as it actually is today:**

| Doc | What's in it |
| :--- | :--- |
| [ARCHITECTURE.md](./ARCHITECTURE.md) | Tech stack, data model, sync engine, security, how features are layered onto one `Note.content` string, project structure |
| [DORMANT-CODE.md](./DORMANT-CODE.md) | The block editor / CRDT collaboration / RAG search subsystem that exists in the repo but isn't wired into the live app — what it is and why it's still here |
| [SETUP.md](./SETUP.md) | Clone, install, env vars, dev commands, and how to build for Windows (Tauri) and Android (Capacitor) |
| [ROADMAP.md](./ROADMAP.md) | Status of the student-focused feature roadmap (Phase 0–3), what shipped and what didn't |
| [DECISIONS.md](./DECISIONS.md) | Dated log of *why* things are the way they are — read this when something looks like an odd choice |

**`history/` — superseded documents, kept for the trail, not for current
facts.** Each one has a banner at the top explaining what replaced it.
Notably: `history/NOTE-NIRMAN-2-ARCHITECTURE.md` and
`history/NOTE-NIRMAN-2-ROADMAP.md` describe an earlier, mostly-unshipped
rewrite attempt (their own unrelated "Phase 0–5" numbering) — see
[DORMANT-CODE.md](./DORMANT-CODE.md) for what of that is actually real.

## If you're future-you (or a future contributor) starting cold

1. Read the root README for the pitch and current status.
2. Read [ARCHITECTURE.md](./ARCHITECTURE.md) fully — it's short.
3. Skim [DORMANT-CODE.md](./DORMANT-CODE.md) so you don't mistake unused
   code for live code, or vice versa.
4. Check [DECISIONS.md](./DECISIONS.md) before proposing a big change —
   there's a decent chance something like it was already tried or
   considered and rejected, with the reasoning recorded.
5. When you make your own non-obvious decision, add an entry to
   `DECISIONS.md` (newest first) while the reasoning is still in your
   head. Future-you will not remember it otherwise — that's the entire
   reason this file exists.
