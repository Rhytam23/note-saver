> **⚠ Superseded / historical record only — do not treat this as current.**
>
> Describes an early refactor where the project lived under an `app/` subfolder. That layout no longer exists — the project has lived at the repo root since. Superseded by [docs/SETUP.md](../SETUP.md).
>
> Moved here unmodified on 2026-09-22 so the reasoning trail isn't lost.

---

# Environment & Build Configuration

## Capacitor Config
- **appId**: `com.notenirman.app`
- **appName**: `NoteNirman Mobile`
- **webDir**: `dist` (Matches Vite's default output)

## Vite Config Adjustments
- **base**: Set to `./` to ensure asset paths are relative (required for mobile/local file protocols).
- **outDir**: Explicitly set to `dist`.
- **alias**: Adjusted `@` to point to `src/` for cleaner imports.

## Build Command
`npm run build` will now generate a mobile-ready bundle in `app/dist/`.
