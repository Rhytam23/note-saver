# Contributing to NoteNirman

Thanks for wanting to help. NoteNirman is an offline-first notes app for
students, so the bar for any change is: **it must never lose a user's notes**.

## Getting started

```bash
git clone https://github.com/Rhytam23/note-saver.git
cd note-saver
npm install
cp .env.example .env   # fill in your own Supabase project details
npm run dev            # http://localhost:3000
```

The app works offline without a backend for most things; Supabase is only
needed for sync, auth and the optional AI assistant. Full setup (Windows,
Android, Supabase, Telegram bot) is in [docs/SETUP.md](docs/SETUP.md).

Use your own Supabase project and your own keys. Never commit `.env` files,
API keys, bot tokens or signing keystores.

## Before you open a PR

Run all of these and make sure they pass:

```bash
npx tsc --noEmit   # type check
npm run lint       # eslint
npm test           # vitest
npm run build      # production build
```

## Finding something to work on

- Look for issues labelled **good first issue** or **help wanted**.
- Check [docs/ROADMAP.md](docs/ROADMAP.md) for planned features.
- For anything larger than a small fix, open an issue first so we can agree
  on the approach before you spend time on it.

## Things worth knowing

- **Not everything in `src/` is live.** A block editor, real-time
  collaboration and semantic search were built earlier and are not wired in.
  Read [docs/DORMANT-CODE.md](docs/DORMANT-CODE.md) before assuming a file is
  used, and [docs/DECISIONS.md](docs/DECISIONS.md) for why the app is shaped
  the way it is.
- **Sync changes need regression tests.** Anything touching `syncEngine.ts`
  or how notes are stored should follow the pattern in
  `syncEngineRace.test.ts`.
- **Database changes** go in a new file under `supabase/migrations/`. Every
  new table must enable Row Level Security and have policies that scope rows
  to `auth.uid()`. `SECURITY DEFINER` functions must set `search_path` and
  revoke `PUBLIC`/`anon` execute unless they are meant to be public.
- Keep pull requests focused: one change per PR, with tests where it makes
  sense.

## Reporting bugs and security issues

Use the issue templates for bugs and feature requests. For security
vulnerabilities, **do not open a public issue**; follow
[SECURITY.md](SECURITY.md).

## Code of conduct

By participating you agree to follow the [Code of Conduct](CODE_OF_CONDUCT.md).

## License and your contributions

NoteNirman is licensed under the [PolyForm Noncommercial License 1.0.0](LICENSE.md) (see [LICENSE-ASSETS.md](LICENSE-ASSETS.md) for a summary). By submitting a contribution (a pull request, patch or other code) you agree that:

1. it is licensed under the same PolyForm Noncommercial License as the rest of the project;
2. you grant the project author, Rhytam Biswas, a perpetual, worldwide, irrevocable, royalty-free licence to use, modify, sublicense and distribute your contribution in any way, including commercially and under other licence terms. This is what keeps commercial use of the project reserved to the author; and
3. you wrote the contribution or have the right to submit it.

If you cannot agree to this, please do not submit code.
