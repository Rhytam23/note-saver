# Decision log

A dated record of *why*, not just *what*. Code and commit messages tell you
what changed; this is for the reasoning that doesn't survive in either of
those. Add to the top of this file (newest first) when you make a decision
future-you will otherwise have to reconstruct from scratch.

This continues the idea started in `docs/history/REFACTORING_LOG.md`, which
was a similar running log for the original mobile-refactor pass and is now
archived.

---

## 2026-09-22 — Self-updating landing-page downloads + in-app update-check banner

**Decision:** The release pipeline (`.github/workflows/release.yml`) now
copies the freshly-built Windows installer and Android APK into
`public/downloads/` and writes `public/downloads/version.json`, committing
and pushing that straight to `main` after every tagged release. The
installed desktop/Android apps poll that same `version.json` once on
launch and show a dismissible banner ("Download update") when it's newer
than the running build - never a silent auto-install.

**Why:** The landing page's download buttons pointed at static files in
`public/downloads/` that nobody was updating - they were still serving the
`v0.1.0` Windows exe with no Android APK at all, well after `v0.1.1` had
shipped. The repo is private, so client code can't call the GitHub
Releases API directly to fetch the latest build (unauthenticated requests
404 on a private repo) - same-origin files on the already-public
`notenirman.vercel.app` site sidestep that without exposing any token to
the client. A real Tauri auto-updater (code-signed deltas installed
automatically) was considered and rejected for now: it needs a signing-key
+ `latest.json` infrastructure this project doesn't have yet, and the
user explicitly wants a prompt-and-let-them-choose flow instead of a
silent swap.

**Technical detail:** `useUpdateCheck.ts` (new) reads the app's own
installed version via `@tauri-apps/api/app`'s `getVersion()` on desktop or
`@capacitor/app`'s `App.getInfo()` on Android, compares it against
`version.json`, and surfaces the newer one via `UpdateBanner.tsx` (new),
mounted in `App.tsx`. A dismissed version is remembered per-device in
`localStorage` so it doesn't reappear until the *next* release. Web is
untouched (`detectPlatform() === 'web'` short-circuits the whole hook) -
the web app is always current since every push to `main` redeploys it.

**Manual step:** None - this is fully automated from the next tagged
release onward. This session's push also manually re-synced
`public/downloads/` to the already-published `v0.1.1` assets as a one-time
catch-up.

**Verified:** `npx tsc --noEmit` and `npm run lint` clean; confirmed in
the dev server that `/downloads/version.json` and `/downloads/*.apk`
serve correctly and the reported APK size matches the real `v0.1.1`
release asset.

---

## 2026-09-22 — Native Google sign-in on desktop and Android

**Decision:** Google sign-in was previously web-only (`detectPlatform() === 'web'`
gated the button in `AuthScreen.tsx`), because the existing flow
(`supabase.auth.signInWithOAuth` with same-window redirect) navigates the
current window to Google and back — inside a Tauri window or an Android
WebView, that redirect has nowhere sensible to land back on and would
strand the user outside the app shell. Built the standard fix instead of
just re-enabling a broken button: open the OAuth URL in the device's real
system browser (`@tauri-apps/plugin-shell`'s `open()` /
`@capacitor/browser`'s `Browser.open()`), and catch Supabase's redirect
back via a custom URL scheme deep link instead of a normal page load
(`notenirman://auth-callback` on desktop via `@tauri-apps/plugin-deep-link`,
`com.notenirman.app://auth-callback` on Android via `@capacitor/app`'s
`appUrlOpen` — reusing an intent-filter that was already declared in
`AndroidManifest.xml` but never wired to anything).

New `src/services/platform/nativeAuthBridge.ts` holds this, deliberately
kept separate from the existing `PlatformAdapters` bundle
(`platformInterfaces.ts`/`platformAdapterFactory.ts`) rather than folded
into it — auth is a narrow, one-off concern, and this way it can't
regress that already-tested filesystem/notification/storage bundle.

**Real caveat found while building this**: that existing `PlatformAdapters`
bundle's Tauri/Capacitor implementations (`tauriAdapter.ts`,
`capacitorAdapter.ts`) dynamically `import()` packages like
`@tauri-apps/plugin-fs` and `@capacitor/local-notifications` that were
**never actually added to `package.json`** — meaning on a real Tauri/Android
build those dynamic imports always fail and silently fall back to the Web
adapter, so the "native" filesystem/notification code paths documented as
live in `ARCHITECTURE.md` are likely dead in practice today too. Not fixed
here (out of scope for this task) — worth its own pass. For *this* feature
the packages were genuinely `npm install`ed for real, not just referenced.

**Manual step only the account owner can do:** add both redirect URLs to
the Supabase project's **Authentication → URL Configuration → Redirect
URLs** allowlist:
- `notenirman://auth-callback`
- `com.notenirman.app://auth-callback`

Supabase rejects a redirect to anything not on that list, so native Google
sign-in will fail with a redirect error until this is done. No dashboard
API access was available to do this from here.

**Verified:** `tsc --noEmit`, `eslint`, and the full `vitest` suite (463
tests) all clean; production build shows the new platform-bridge code
split into its own small lazy chunk (~8KB), not bloating the main bundle;
`npx cap sync android` picked up both new Capacitor plugins correctly. Not
yet verified end-to-end on a real device/desktop install (needs the
Supabase redirect URLs added first, then a real OAuth round-trip) — that's
the next real-world check once the account owner does the manual step
above.

---

## 2026-09-22 — Microsoft Store packaging pipeline built, submission not started

**Decision:** Added an MSIX packaging pipeline (`src-tauri/msix/`) that
wraps the existing Tauri `.exe` for Microsoft Store submission
("Desktop Bridge" style — no rewrite to native UWP), plus a CI step in
`.github/workflows/release.yml` that builds one on every tagged release.
Documented the full path in [MICROSOFT-STORE.md](./MICROSOFT-STORE.md).

**Why now:** asked directly whether Store publishing was possible. It is,
but it splits cleanly into two halves: creating a Microsoft Partner Center
developer account and reserving the app's identity there (a one-time paid,
identity-verified step only the account owner can do — not something that
can be automated or done on someone's behalf), versus the technical
packaging work (fully automatable, no identity required to build and test
a package, only to submit one).

**What shipped:** the manifest, build script, icon wiring (reused the
Store tile icons already generated back when the new logo was applied
site-wide), and CI integration — all built against a placeholder identity
so nothing here is blocked on Partner Center. The placeholder package
builds and can be sideload-tested locally right now.

**What's still open, and can only be closed by the account owner:**
creating the Partner Center account, reserving the app name, and doing the
actual Store submission (listing content, screenshots, age rating,
upload). Once that identity exists, it plugs in via three GitHub secrets
(`MSIX_IDENTITY_NAME`, `MSIX_PUBLISHER`, `MSIX_PUBLISHER_DISPLAY_NAME`) —
no code changes needed at that point, CI will start producing a
submission-ready package automatically.

## 2026-09-22 — Every `React.lazy()` chunk load gets a timeout + retry

**Decision:** Added `src/utils/lazyWithRetry.ts` and routed every
`React.lazy()` call in `App.tsx` (NoteEditor, ProfileModal, TutorialModal,
and all the seasonal intro animations) through it instead of calling
`React.lazy()` directly.

**Why:** reported bug - clicking a note in the web app sometimes just spun
forever instead of opening the editor. Plain `React.lazy()` has no
recovery path if the dynamic `import()` never settles, and that's more
common than it sounds: a backgrounded browser tab can have its network
I/O suspended mid-fetch (Chrome's `ERR_NETWORK_IO_SUSPENDED`, which showed
up in this session's own test console while investigating), a connection
can just hang, or a tab left open across a redeploy can reference a chunk
hash that no longer exists on the server. In every one of those cases the
promise doesn't reject, it just never resolves - so the `Suspense`
fallback spins forever with nothing to catch it. This was a latent gap
introduced back when `NoteEditor` was first made lazy (see the bundle-size
entry below) and never revisited.

**Fix:** a 15s timeout plus one automatic retry on every lazy import. On
repeated failure it now rejects for real, which the existing top-level
`ErrorBoundary` (`App.tsx:736`) catches and turns into a visible "Reload
NoteNirman" screen instead of an infinite spinner.

**Note for next time:** I could not reproduce the exact trigger locally
(plain note, locked note, and a full reload all opened correctly in
testing) - this fixes the gap that *would* cause the reported symptom
regardless of which specific network hiccup triggered it, rather than a
root-caused single trigger. If it recurs, the next thing to check is
whether it's tied to backgrounding the tab specifically.

---

## 2026-09-22 — Repo stays private; GitHub release history deleted

**Decision:** Deleted the two existing GitHub releases (`v1.0.1`,
`v1.0.0`) from `Rhytam23/note-saver`, and changed the landing page's
download buttons to serve a real installer file directly from the site
instead of linking to GitHub Releases.

**Why:** The repository is private, so both the release-listing links and
the GitHub API calls the download page relied on were dead ends for any
real visitor — they'd hit a 404/auth wall. Rather than leave a broken
"View downloads on GitHub" button, Windows now downloads
`public/downloads/NoteNirman-Setup.exe` (a real, already-built v0.1.0
installer) directly. Android shows "Coming soon" — see the next entry.

**Status this leaves open:** the repo being private is still the root
blocker for this app being reachable by real users, or for any of the SEO
work below actually getting indexed. Making it public (or moving releases
to a separate public repo) is a decision only the repo owner can make.

## 2026-09-22 — No fake Android APK

**Decision:** Did not fabricate or stub an Android APK for the download
page, even though it was asked for directly. Confirmed first, and
documented here so it isn't re-litigated: no Java/Android SDK is available
in the environment this was worked in, and neither of the two past GitHub
releases (nor any local build) ever actually contained a real `.apk` file
— the CI Android build job likely never succeeded, most plausibly because
the signing secrets below were never set.

**Why:** a broken or fake download is worse than an honest "not yet."

**To actually produce one:** set `ANDROID_KEYSTORE_BASE64`,
`ANDROID_KEYSTORE_PASSWORD`, `ANDROID_KEY_ALIAS`, `ANDROID_KEY_PASSWORD` as
GitHub Actions secrets (see [SETUP.md](./SETUP.md#7-android-build-capacitor)),
then push a `v*` tag or run the release workflow manually.

## 2026-09-22 — Real PDF/OCR extraction replaces placeholder stubs

**Decision:** Deleted `src/services/pdfPipeline.ts` and
`imageOcrPipeline.ts`, which were scaffolding for the dormant block editor
(see [DORMANT-CODE.md](./DORMANT-CODE.md)) and returned hardcoded
placeholder text instead of doing anything real. Replaced them with
`pdfTextImport.ts` (pdfjs-dist) and `imageTextImport.ts` (tesseract.js),
both wired directly into the TipTap editor's toolbar and doing genuine
on-device extraction.

**Why:** the landing/FAQ copy claimed real PDF import and OCR; the code
behind those claims was fake. Fixed the code to match the claim rather than
softening the claim.

## 2026-09-22 — Student-focused roadmap, additive only, existing app preserved

**Decision:** When asked to plan a feature roadmap drawing on Google Docs,
Notion, Obsidian and similar tools for a student audience, the plan was
reviewed and explicitly constrained before implementation:

> "Preserve the existing NoteNirman architecture, 13 seasonal themes,
> UI/UX, TipTap editor, and working features. Do not redesign or replace
> anything unless required. First inspect the existing code, then
> implement the roadmap incrementally without breaking existing
> functionality."

**Why this matters going forward:** this is the second time in this
project's history that a rewrite was proposed (block editor / CRDT
collaboration in 2026-09-06 was the first — see
[DORMANT-CODE.md](./DORMANT-CODE.md)) and the second time it was rejected
in favor of incremental, additive change on the existing TipTap +
IndexedDB + Supabase foundation. If you're a future contributor tempted to
propose a third rewrite, know that this has a track record: the additive
approach is the one that's actually shipped features. That doesn't mean
never rewrite — it means the bar for doing so should be "the current
approach concretely can't do X," not "this would be architecturally
cleaner."

**What shipped as a result** (full detail in [ROADMAP.md](./ROADMAP.md)):
sync-freshness fixes (pull on focus + every 30s), Trash with 30-day
recovery, tables, LaTeX equations, find-in-note, focus mode, Pomodoro
timer, flashcards with spaced repetition, notebooks (built on the existing
tag system), wiki links + backlinks + a graph view, starter templates,
reminders, backup/restore, multi-format import, per-note passphrase lock,
a PWA service worker, share-to-app, and a new logo.

**On the side:** dead code and dead files were removed, the main JS bundle
was cut from 1.46MB to 462KB (lazy-loading the editor and dynamically
importing PDF-export libraries), all 65 ESLint findings were fixed, and
`FAQ.tsx` was corrected — it had claimed the app requires internet access
and only supports Google sign-in, both false.

**What was explicitly kept but not deleted:** a large "2.0" subsystem
(block editor, Yjs collaboration, RAG/semantic search) that predates this
decision and was already built, tested, but never wired into the app. When
asked how aggressively to clean up dead code, the choice made was
conservative: delete only the parts that had just been replaced with real
implementations (the fake PDF/OCR stubs above), not this larger unused-but-
intentional subsystem. See [DORMANT-CODE.md](./DORMANT-CODE.md) for the
full inventory and reasoning for why it's still here.

## 2026-09-22 — SEO / "answer engine" discoverability added

**Decision:** Added `robots.txt` (with an explicit allowlist for AI
crawlers — GPTBot, ClaudeBot, PerplexityBot, etc.), `sitemap.xml`,
`llms.txt`, structured data (`SoftwareApplication` and `FAQPage`
schema.org JSON-LD) and static crawlable fallback content inside
`index.html`'s `#root`, so non-JS-executing crawlers see real content
instead of an empty shell.

**Why now, not earlier:** doing this before fixing `FAQ.tsx`'s factual
errors would have baked false claims into structured data that search
engines and AI answer engines treat as authoritative. Content accuracy was
fixed first, then encoded into the structured data.

**Known limitation:** none of this helps until the site is actually
deployed somewhere public and the repo (or a hosted build) is reachable —
see the repo-visibility entry above.

## 2026-09-06 — "NoteNirman 2.0": block editor, CRDT collaboration, RAG search

**Decision:** A prior pass at this project (not the same session as the
entries above) set out to rebuild the editor around a block-based document
model with Yjs CRDT real-time collaboration and a semantic-search/RAG "ask
your notes" AI feature, tracked in
`docs/history/NOTE-NIRMAN-2-ARCHITECTURE.md` and
`docs/history/NOTE-NIRMAN-2-ROADMAP.md`. A large amount of it was built and
tested.

**What happened to it:** none of it was ever wired into the live app —
every feature flag controlling it defaults to `false`
(`src/config/featureFlags.ts`), and nothing in `App.tsx` or `NoteEditor.tsx`
imports it. On 2026-09-22, when planning the next round of features, this
direction was reviewed and explicitly not continued (see the entry above).
The code was kept rather than deleted, in case it's picked back up later.
Full inventory: [DORMANT-CODE.md](./DORMANT-CODE.md).

## 2026-09-01 — Offline-first sync engine, v1

**Decision:** Built the original `syncEngine.ts` — local IndexedDB as the
write-ahead store, a sync queue, optimistic per-note versioning for
conflict detection. This is the foundation everything above still sits on;
the 2026-09-22 changes extended it (pull-on-focus, periodic pull, Trash)
rather than replacing it.

## 2026-01-06 — Project genesis

The earliest commits in this repository's history. If you need anything
from before this file existed, the git log itself is the only remaining
record — there was no decision log kept this early on.
