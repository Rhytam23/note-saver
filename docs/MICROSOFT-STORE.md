# Publishing to the Microsoft Store

Last verified: 2026-10-12. Status: **the app is published in the Microsoft Store** (confirmed by the maintainer). Every new release must also be submitted there: see [Releasing an update](#releasing-an-update-checklist).

NoteNirman's Windows build is a plain Win32 app (Tauri), not native UWP.
The Store still accepts that via "Desktop Bridge" — you submit an MSIX
that wraps the existing `.exe`, no rewrite needed. This doc splits the
work into what only you can do (your identity, your account) and what's
already built and automated.

## Part 1 — only you can do this (one-time, already done for this app)

### 1. Create a Microsoft Partner Center developer account
Go to [partner.microsoft.com/dashboard](https://partner.microsoft.com/dashboard)
and register. One-time fee: about $19 for an individual account, about $99
for a company account. Requires identity verification (a real name/address
and, for a company account, business registration details) and a payment
method for the fee. Nobody else can do this step for you — it's tied to
your identity.

### 2. Reserve the app name
Once the account is active: **Partner Center → Apps and games → + New
product → MSIX or PWA app**, and reserve the name (try "NoteNirman" first;
if it's taken, a close variant is fine — the display name shown to users
in the Store listing doesn't have to match the reserved technical name
exactly).

This reservation gives you three values, under **Product identity** on
that app's page in Partner Center:

| What Partner Center calls it | What it's used for |
| :--- | :--- |
| Package/Identity/Name | `IdentityName` below |
| Package/Identity/Publisher | `Publisher` below (looks like `CN=...`) |
| Publisher display name | `PublisherDisplayName` below |

Copy all three down — everything in Part 2 needs them.

### 3. Submit the package (after Part 2 produces a real MSIX)
**Partner Center → your app → Store listings** (fill in description,
screenshots, age rating questionnaire, pricing — free) **→ Packages**
(upload the `.msix` — see Part 2) **→ Submit for certification**.
Certification is automated + a manual review pass; Microsoft emails you
the result, typically within a few days. If it's rejected, the email says
why — common first-timer issues are a missing/wrong age rating, or store
listing screenshots that don't match the submitted binary.

## Part 2 — already built, needs your Part 1 values to finish

- **`src-tauri/msix/AppxManifest.template.xml`** — the package manifest,
  with `__IDENTITY_NAME__` / `__PUBLISHER__` / `__PUBLISHER_DISPLAY_NAME__`
  placeholders. Never hand-edit the placeholder values in this file
  directly — they're substituted at build time (next item) so the
  template can stay committed without baking in a fake or leaked identity.
- **`src-tauri/msix/build-msix.ps1`** — packages the already-built
  `src-tauri/target/release/notenirman.exe` into a `.msix`, substituting
  the identity values. Run it locally (Windows, with the Windows 10/11 SDK
  installed — the free "App Certification Kit" component includes
  `makeappx.exe`/`signtool.exe`):
  ```powershell
  npm run tauri:build   # produces the .exe first
  ./src-tauri/msix/build-msix.ps1 `
    -IdentityName "<Package/Identity/Name from Partner Center>" `
    -Publisher "<Package/Identity/Publisher from Partner Center>" `
    -PublisherDisplayName "<Publisher display name from Partner Center>"
  ```
  Output: `src-tauri/msix/dist/NoteNirman_<version>_x64.msix`. Upload that
  file directly in Partner Center's **Packages** step.
- **Icons**: already generated (`src-tauri/icons/Square44x44Logo.png`
  through `Square310x310Logo.png`, `StoreLogo.png`), from the same
  `npx tauri icon` run that produced the app's other platform icons.
  There's no `Wide310x150Logo.png` (the wide Start tile image). The
  manifest only references `Square71x71Logo` on `<uap:DefaultTile>`, not
  `Square310x310Logo` — MSIX validation actually *requires*
  `Wide310x150Logo` whenever `Square310x310Logo` is present (confirmed by
  a real `makeappx` failure: "The DefaultTile element must specify the
  Wide310x150Logo attribute if the Square310x310Logo attribute is
  specified"), so it's left out entirely for now rather than shipping a
  package that fails to build. Add a `Wide310x150Logo.png` asset and both
  attributes together later if you want a larger/wide Start tile.
- **CI**: `.github/workflows/release.yml`'s `build-windows` job now also
  builds an MSIX on every tagged release and uploads it as a separate
  `msix-package` workflow artifact (not attached to the public GitHub
  Release — it stays a manual download until you're ready to submit it).
  It reads identity values from three optional repo secrets:
  `MSIX_IDENTITY_NAME`, `MSIX_PUBLISHER`, `MSIX_PUBLISHER_DISPLAY_NAME`.
  Set those once you've completed Part 1, and every future tagged release
  will produce a submission-ready `.msix` automatically. Until they're
  set, CI still builds one with the placeholder identity (harmless — it's
  just not what you'd submit).

### Testing the MSIX locally before you submit
```powershell
./src-tauri/msix/build-msix.ps1 -SignForTesting <...same identity params...>
```
`-SignForTesting` self-signs the package with a locally-generated
certificate purely so Windows will let you sideload-install it for a test
(the Store re-signs with its own certificate on real submission — this
local cert is never what ships). Enable **Settings → Privacy & security →
For developers → Developer Mode**, or trust the printed `.pfx` into
**Local Machine → Trusted People**, then:
```powershell
Add-AppxPackage -Path .\src-tauri\msix\dist\NoteNirman_<version>_x64.msix
```

## Releasing an update (checklist)

The app ships in three places, and each one updates differently:

| Where | How users get the update | What you do |
| :--- | :--- | :--- |
| Website (`notenirman.vercel.app`) | Automatically, whenever `deployment` changes | Promote `main` into `deployment` |
| Windows installer / Android APK (GitHub Releases) | The in-app "New Update Available" dialog, which reads the website's `version.json` | Nothing extra: the release workflow writes `version.json` to `deployment` |
| **Microsoft Store** | The Store updates the app itself. The in-app dialog is hidden in the Store build | **Submit the new MSIX in Partner Center** (steps below) |

Order for every release:

1. Merge the finished pull requests into `main` and let CI pass.
2. Tag the release from `main` (`git tag vX.Y.Z` and push the tag). The release workflow builds the Windows installer, the Android APK **and the MSIX**, and attaches the installers to the GitHub Release. The MSIX is **not** public: it is a workflow artifact named `msix-package`.
3. Check the GitHub Release: the installers are attached, and write real release notes in its description (the dialog shows them; leave it empty and the dialog just shows the "Full Changelog" link).
4. Promote `main` into `deployment` when you are happy. Only then does the website show the new version and does the in-app dialog start appearing for installed copies of the Windows installer and Android APK. Publishing a release alone does not pop anything up.
5. **Microsoft Store:** download the `msix-package` artifact from the workflow run, then in Partner Center open the app, **Update**, **Packages**, upload the new `.msix`, then **Submit for certification**. Certification usually takes a few days, so the Store lags the website and GitHub. That is normal.

Store rules to remember:

- The MSIX version must go up with every submission. It is derived from the app version (`X.Y.Z` becomes `X.Y.Z.0`). Store packages must keep the last number at 0, so never hand-edit it.
- The MSIX must be built with the real identity values (the `MSIX_IDENTITY_NAME`, `MSIX_PUBLISHER` and `MSIX_PUBLISHER_DISPLAY_NAME` repository secrets). A package built with the placeholder identity cannot be submitted.
- The Store build never shows the in-app update dialog (it detects that it runs from `WindowsApps`). Do not add a download link inside it: the Store's policy does not allow an app to offer its own installer.
- Do not bump the Store version before the website/GitHub one is ready to ship: users of the Store and the installer should end up on the same version.

## Google sign-in and updates in the Store build

The manifest declares the `notenirman://` scheme (packaged apps cannot register it at runtime), the app runs as a single instance so the sign-in callback reaches the open window, and the in-app update banner is hidden (the Store updates apps itself). Before submitting, install the test-signed package and try Google sign-in once.

## Store listing content (draft, reuse when you get to the Store listings step)

- **Short description**: "Offline-first notes app for students — write
  anywhere, sync when you can."
- **Description**: adapt the landing page's feature
  list (`src/components/LandingPage.tsx`'s `FEATURES` array) — both are
  already accurate to what ships, per [DECISIONS.md](./DECISIONS.md).
- **Privacy policy URL**: `https://notenirman.vercel.app/privacy` (Store
  submission requires this field).
- **Support contact**: whatever email you want listed in Support Center
  (`src/components/Support.tsx` / `rhytambiswas@gmail.com` today).
- **Screenshots**: not yet produced. The Store requires at least one
  desktop screenshot at a supported resolution (1366×768 minimum works).
  Grab these from the actual running Windows build once you're ready to
  submit, not from the web version — the Store's automated review checks
  that screenshots represent the submitted package.
- **Age rating**: answer the IARC questionnaire honestly — this is a
  plain notes app with no user-generated public content, ads, or
  in-app purchases, which should land it in the lowest rating tiers, but
  only Partner Center's questionnaire can actually assign it.

## Open questions only you can answer

- Individual or company Partner Center account? Affects the fee ($19 vs
  $99) and what identity documents you'll need.
- Final Store display name, if "NoteNirman" the exact string is taken.
- Whether to eventually add a Wide310x150Logo for a nicer Start tile.
