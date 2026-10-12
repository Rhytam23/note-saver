# Decision log

A dated record of *why*, not just *what*. Code and commit messages tell you
what changed; this is for the reasoning that doesn't survive in either of
those. Add to the top of this file (newest first) when you make a decision
future-you will otherwise have to reconstruct from scratch.

This continues the idea started in `docs/history/REFACTORING_LOG.md`, which
was a similar running log for the original mobile-refactor pass and is now
archived.

---

## 2026-10-12 - Vercel only deploys GitHub-verified commits

**Problem.** Pushes to `main` stopped reaching the live site. Vercel showed "Build Canceled: the commit signature couldn't be verified" for every new commit, while GitHub marked those commits as unsigned (commits made with plain `git commit` and no signing key).

**Decision.** Leave Vercel's verified-commits protection on. A commit that should deploy must be signed (an SSH or GPG signing key registered on GitHub) or be created through the GitHub web UI or API, which GitHub signs itself. Unsigned commits still land in the history but do not deploy.

---

## 2026-10-11 - Installers moved out of git; history rewritten before going open source

**Problem.** The release workflow committed the latest `.exe` and `.apk` (about 120 MB together) to `main` on every tagged release, because the repository was private and the website could not link to GitHub Releases. Git keeps every version, so the history grew to about 230 MB and cloning became slow and unreliable.

**Decision.** Installers now live only in GitHub Releases. The release also uploads version-less copies (`NoteNirman-Setup.exe`, `NoteNirman.apk`), and `vercel.json` redirects `/downloads/NoteNirman-Setup.exe` and `/downloads/NoteNirman.apk` to `releases/latest/download/...`. Links on the landing page and the `version.json` format are unchanged, so already-installed apps keep working. CI now commits only the small `public/downloads/version.json`.

**History rewrite.** Previous copies of the installers were stripped from all commits, so commit hashes before this date differ from older clones. This needs the repository to be public for the redirects to work for anonymous users.

---

## 2026-09-26 - Focus timer: custom length that survives closing the panel; Vercel no longer skips the downloads commit

**Focus timer.** Click the time to choose the focus length: type any number of minutes (`90`, `90 min`, `1:30`, 1 to 600) or tap a preset (25, 45, 60, 80, 90, 100, 120). 25 minutes stays the default. Logic lives in `src/components/editor/focusTimer.ts` (unit tested), the UI in `PomodoroTimer.tsx`. Times of an hour or more show as h:mm:ss.

**Bug found while doing it.** The timer lives in the note editor's side panel, so opening another note or closing the editor destroyed the countdown, which matters far more for 60 to 100 minute sessions. The timer is now saved to localStorage (phase, chosen length, and the end time while running) and restored on mount: a running countdown keeps counting while the panel is closed, a paused one keeps its exact time, and one that ran out while away comes back as the break, stopped.

**Vercel.** The release workflow's "publish downloads" commit ended with `[skip ci]`. Vercel honours that marker, so it skipped (showed as canceled) the one deployment that carries the new `version.json` and installers, and the landing page kept serving the previous version until some other commit deployed. It now uses `[skip actions]`, which only stops GitHub Actions. Other "Canceled" entries are normal: a newer push supersedes a build that is still queued.

---

## 2026-09-25 - Google sign-in no longer requests calendar access ("Google hasn't verified this app")

**Symptom.** Signing in with Google showed a red "Google hasn't verified this app - requesting access to sensitive info" screen.

**Cause.** `useAuth.ts` passed `scopes: 'https://www.googleapis.com/auth/calendar.readonly'` on every Google sign-in. That is a Google *sensitive* scope, and apps that request one show the unverified-app warning until they pass Google's verification. Verification needs a domain the developer owns (a *.vercel.app address cannot be verified), a demo video and a scope justification. It also would have needed a Privacy Policy line about calendar access, which did not exist.

**Decision.** Sign in with Google now asks only for the default openid / email / profile scopes (not sensitive, no warning once the consent screen is published). The only use of the calendar was `fetchTodayEvents` in `SeasonalContext`, which picked a festival theme from event titles; without it the theme falls back to the date and location, exactly as it already did for anyone without matching events. `calendarService.ts` is left in place and simply returns no events (Google answers 403 without the scope).

**If calendar access is wanted later.** Add it as an explicit opt-in ("Connect Google Calendar") that requests the scope only then, after getting Google verification and adding the disclosure to the Privacy Policy. Remove the scope from the Google Cloud consent screen's scope list too.

---

## 2026-09-25 - Native apps were embedding the previous release (v0.1.3 came out at 60 MB)

**Symptom.** v0.1.3 .exe / .msi / .apk were 60 MB; v0.1.2 was 27 MB.

**Root cause.** The self-updating landing page keeps the latest installers in `public/downloads/` (~57 MB). Vite copies `public/` into `dist/`, and `dist/` is what the native apps embed, so each native build contained the previous release inside itself and every release would have roughly doubled.

**Fix.** Both native jobs in `release.yml` delete `public/downloads` in the runner's checkout right after `npm ci`. The web build on Vercel is unaffected, and the publish job runs in its own checkout. Measured locally: dist is 62 MB with the folder and 7 MB without.

**Note.** v0.1.3 works (its Supabase guard passed) but is bloated; the fix ships from the next tag.

---

## 2026-09-25 - Windows app shipped without its backend URL ("Failed to fetch" on sign up)

**Symptom.** Store certification testers on Windows: Sign up shows "Failed to fetch".

**Root cause.** In `.github/workflows/release.yml` the `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` / `VITE_GOOGLE_CLIENT_ID` values were set only on the "Build Web Application" step. `tauri-action` then runs `beforeBuildCommand` (`npm run build`) again in its own step, and THAT build is the one embedded in the .exe/.msi/.msix. Its environment had only `VITE_TELEGRAM_BOT_USERNAME`, so the app was built with no Supabase URL and fell back to `https://placeholder.supabase.co` (`src/services/supabase.ts`). Every Windows build so far (v0.1.0 to v0.1.2, the landing-page .exe and the .msix) had broken sign-up, sign-in and sync. The web app (Vercel) and the Android APK were built correctly. Confirmed from the CI log of the v0.1.2 run: the tauri step's env lists only `GITHUB_TOKEN` and `VITE_TELEGRAM_BOT_USERNAME`.

**Fix.** The `VITE_*` values are now job-level `env` for the Windows job, so every step sees them. A new "Verify Supabase settings are inside the built web assets" step (Windows and Android) fails the job if the built `dist/` does not contain the Supabase URL. Checked locally: a build with the settings contains the URL, one without does not.

**Still to do after merging.** Cut a new release (v0.1.3) so the landing-page .exe and a new .msix are rebuilt, and resubmit the Store package.

---

## 2026-09-24 - AI crawlers blocked (robots.txt, X-Robots-Tag, Vercel rule); Anubis not used

**Decision.** `public/robots.txt` now Disallows the known AI crawlers (GPTBot, ClaudeBot, PerplexityBot, CCBot, Google-Extended, Applebot-Extended, Bytespider and others) while search engines stay allowed. `vercel.json` sends `X-Robots-Tag: noai, noimageai`. `public/llms.txt` was removed because it existed only to invite AI tools. The Vercel dashboard's AI Bots firewall rule is turned on manually (Project > Firewall > Bot Management).

**Why not Anubis.** Anubis (TecharoHQ/anubis) is a proof-of-work reverse proxy that must run as a server in front of the site. It cannot sit in front of a *.vercel.app address (needs a custom domain and a container host), it makes every first-time visitor wait on a challenge page, and it would need exemptions for the apps' update check (`/downloads/version.json`), installers and search engines. Reconsider if scrapers that ignore robots.txt become a real problem and there is a custom domain.

**Reverses** the earlier decision (SEO/GEO entry) that explicitly allowed AI crawlers so answer engines could cite the site. robots.txt and headers are requests, not enforcement: crawlers that lie about who they are are not stopped by them.

---

## 2026-09-24 - Fonts: Fraunces headings + Poppins body, self-hosted

**Decision.** Headings and the wordmark use Fraunces (a warm serif), body text stays Poppins, and JetBrains Mono is kept only for code and numerals. All three are self-hosted through `@fontsource` packages (imported in `src/index.tsx`) instead of Google Fonts. Tailwind's `font-serif` now maps to Fraunces.

**Why.** `font-serif` was used in 32 places but no serif was ever defined or loaded, so each device showed its own default. In-app titles were JetBrains Mono bold, so the landing page and the app looked like different products. Self-hosting means the fonts work offline in the Windows and Android apps (the product is offline-first) and no request goes to Google on each visit.

**Trade-offs.** Fraunces has no Devanagari, so a Hindi heading falls back to a system serif (Poppins body text covers Devanagari). The CSP still allows fonts.googleapis.com / fonts.gstatic.com; it can be tightened. The note editor body and PDF export are unchanged.

---

## 2026-09-24 - Telegram in the footer and the legal pages; disconnect cleans up

**Decision.** The footer uses the real logo (was a 📄 emoji) and links to the bot (icon + "Telegram Bot" link, shown only when `VITE_TELEGRAM_BOT_USERNAME` is set). Privacy Policy gains a Telegram section (what is stored, where it goes, locked notes, how to disconnect), the Terms gain a Telegram section (code security, Emergency notes, fair use, no guarantees, not affiliated with Telegram), and the FAQ has two Telegram entries.

**Why.** The bot processes personal data through a third party (Telegram, not end-to-end encrypted) and can auto-trash notes, so the policy has to say so. The text was written from what the code actually stores (chat id, temporary name/username for pairing, messages that become notes, reminders and time zone, working state, rate counter).

**Bug fixed on the way.** The app's Disconnect button deleted only the link row, so pending reminders would still have been sent to that chat and session rows stayed. Migration `20260924000000_telegram_unlink_cleanup.sql` adds a trigger on `telegram_links` delete that removes the user's reminders and the chat's session, which also covers `/unlink` and account-deletion cascades. Verified on the live DB in a rolled-back transaction.

**Not legal advice.** This is a plain-language description of the behaviour, not reviewed by a lawyer. Also not covered by this change: the app calls public IP-geolocation services (ipwho.is, geojs.io, ipapi.co, from `locationService.ts`) and the policy does not mention that; worth adding.

---

## 2026-09-24 - Telegram "Emergency" notes for plain messages

**Decision.** A plain message with no command (and no multi-step input in progress) is saved as a note titled "Emergency" with the reserved tag `emergency`. The bot tells the user to rename it in the app within 24 hours. The scheduler (per-minute cron) moves notes that are still titled "Emergency" after 24 hours to the trash (soft delete, recoverable with /trash and /restore) and messages the user; renamed ones just lose the tag. Limit: 3 per rolling 24 hours per user.

**Why.** Text typed in a hurry should not be lost, and the old "reply with a hint, save nothing" behaviour discarded it. The 24-hour rule and the daily cap stop the inbox from filling with untitled notes or being used as unlimited storage. Soft delete plus a notice keeps the auto-delete recoverable. Code: `telegram/bot/_shared/emergency.ts`.

**Known trade-off.** The rule looks only at the title: if the user edits the body in the app but leaves the title "Emergency", it is still trashed after 24 hours (recoverable).

---

## 2026-09-24 - Store package: Google sign-in link, single instance, no update banner

**Decision.** (1) The MSIX manifest declares the `notenirman` URL scheme. (2) The desktop app uses `tauri-plugin-single-instance` (with its deep-link feature). (3) The update banner is hidden when the app runs from the Microsoft Store (exe path contains `\WindowsApps\`, exposed as the `is_store_package` command). (4) `register_all()` failures are ignored.

**Why.** A Store (MSIX) app cannot register a URL scheme at runtime, so Google sign-in would finish in the browser and never return. Separately, Windows starts a second copy of the app for every `notenirman://` link; without single-instance handling the sign-in result lands in that second copy (this also affected the plain .exe). The Store updates apps itself and its policy does not allow an app to offer its own installer download, so the banner is web/.exe/Android only.

**Not verified locally.** No Rust toolchain on the dev machine; CI compiles it. The end-to-end Google sign-in inside an installed .msix needs a manual test (build-msix.ps1 -SignForTesting).

---

## 2026-09-23 — Telegram pairing: the bot shows the code, the app takes it

**Decision:** Linking now works in the direction *Telegram gives a code, the user
types it into NoteNirman* (`/start` in the bot, then Profile > Telegram). This
replaced the first version, where the app generated a code and opened a `t.me`
link.

**Why:** The user asked for it. It also works when Telegram's app link doesn't
open (no `tg://` handler, embedded browsers), because the user just copies a code.

**The risk this direction adds, and the fix:** anyone can start the bot and get a
code, so a stranger could talk someone into typing the stranger's code and gain
access to that person's notes. The app therefore previews the code first and shows
the Telegram name and username that requested it, and the user must confirm. Also:
codes are single-use, expire in 10 minutes, one live code per chat, and guessing
is limited to 10 attempts per 10 minutes per user.

**Where the security lives:** two Postgres functions
(`preview_telegram_pairing`, `claim_telegram_pairing`), SECURITY DEFINER,
callable only by signed-in users, that use `auth.uid()` so a client can never name
which account to link. The rate limiter returns `rate_limited` instead of raising,
because an exception would roll back the counter and the limit would never trip.
The old `telegram_link_codes` table (which let any signed-in user insert codes) was dropped.

**Verified on the live database** (in a transaction that always rolls back): not
signed in is refused; preview shows the asker and links nothing; wrong, reused and
expired codes fail; claim links the *caller* to the chat; repeated guessing is
blocked even for a valid code; anon cannot call the functions. The deployed bot
was also driven with a real update and wrote its code row correctly.

---

## 2026-09-23 — Telegram bot as a fourth client

**Decision:** A Telegram bot (Supabase Edge Function `telegram-bot`) that
writes, lists, searches and manages notes, syncing through the existing
`notes` table and sync engine. Notes are started explicitly with
`/title <title>` and the next message is the body; plain messages with no
command are ignored with a hint.

**Why:** The user wanted to capture and look up notes from Telegram and have
them appear on phone, desktop and web. Because the sync engine already pulls
server changes by `version`/`updated_at`, the bot only has to write correct
rows; it adds no sync logic.

**Choices worth remembering:**
- *Explicit commands, not "any text is a title".* The first design treated any
  message as a title, so a typo or a stray "ok" became a note. Requiring
  `/title` costs one word and removes that whole class of accident.
- *Service-role key, scoped in code.* The bot has no user JWT (Telegram sends
  none), so it must use the service role, which bypasses RLS. Safety is
  therefore enforced by filtering every query on the linked `user_id` and by
  the account-linking flow (single-use 10-minute codes, `telegram_links`).
- *Locked notes stay locked.* Their content is client-side encrypted; the
  server has no key, so the bot only shows a lock icon and the title.
- *Archive is a reserved `archived` tag.* The app has no archive concept.
  Adding a column would have meant changing the sync schema, local DB and every
  client for a Telegram-side feature. Follow-up: a real archive view in the app.
- *Reuse over rewrite.* `flashcards.ts`, `noteLinks.ts`, `noteTemplates.ts`
  and the lock prefix are mirrored into the function by a script (the Supabase
  bundler can't reliably import from `src/`); a parity test fails if stale.
  `taskList` in `noteTemplates.ts` is now exported so the bot writes task
  items in exactly the editor's markup.
- *Reminders need a scheduler.* They use `pg_cron` + `pg_net` (manual SQL in
  SETUP.md). Without it every other command still works.
- *Not built:* photo/voice notes, ticking tasks from Telegram (editing task
  HTML remotely is easy to corrupt), semantic Q&A over notes.

**Layout:** every Telegram file lives in the top-level `telegram/` folder
(`bot/`, `database/`, `app/`, `scripts/`, `tests/`, `README.md`). Supabase
only deploys functions from `supabase/functions/` and migrations from
`supabase/migrations/`, so `npm run bot:sync` copies `telegram/bot` and
`telegram/database` there; those copies are generated and parity-tested.
`ProfileModal` only imports `telegram/app/TelegramSection`.

**Manual steps:** create the bot with @BotFather, set secrets, deploy with
`--no-verify-jwt`, run `npm run bot:register`, set `VITE_TELEGRAM_BOT_USERNAME`
(see `docs/SETUP.md`). The desktop app's `shell:allow-open` scope gained
`https://t.me/*` for the connect link.

**Verified:** `tsc`, `lint`, `npm test` (569 tests) and `npm run build` pass.
New suites cover the command registry, text helpers, list ordering and target
resolution, reminder time parsing (incl. DST) and rate limiting. A 52-test
integration suite (`telegram/tests/telegramBot.integration.test.ts`) bundles the REAL
`telegram/bot/index.ts` with esbuild and runs it against an in-memory fake
Supabase and fake Telegram: linking, every multi-step flow, user isolation,
locked notes, version/soft-delete rules, the reminder scheduler and the rate
limit. It caught a real bug (the save confirmation printed `Saved "null"`).

**Not verified (needs your Telegram + Supabase):** the function has not run on
real Deno, real PostgREST, or real Telegram. The fake mirrors the query
methods the bot uses, but real-world behaviour (e.g. `like` on very large
tables, Telegram delivery) is only proven by the end-to-end checks in
`docs/SETUP.md` once deployed. Limits worth knowing: list commands read up to
1000 notes and content-searching commands up to 500 (newest first).

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

**Follow-up (same day) - found by actually testing the live site:**
pushing a disposable `v0.1.2-1` test tag through the full pipeline and
then checking `https://notenirman.vercel.app/downloads/` directly showed
`version.json` and the new `.apk` both came back as `text/html` (the
SPA's `index.html`), not the real file - `vercel.json`'s catch-all SPA
rewrite (`"source": "/(.*)" -> "/index.html"`) was swallowing those paths
in production even though the Vite dev server served them fine (dev and
Vercel resolve static files vs. rewrites differently). The pre-existing
`.exe` route happened to still work, which is why this had gone
unnoticed. Fixed by excluding `downloads/` from the rewrite with a
negative-lookahead source pattern (`"/((?!downloads/).*)"`), so anything
under `/downloads/` always resolves to the real static file instead of
falling through to the app shell.

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
