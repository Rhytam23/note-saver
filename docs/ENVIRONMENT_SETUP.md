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
