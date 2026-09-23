# telegram-bot (deploy copy)

Do not edit anything in this folder. It is generated from `telegram/bot/`
(and the database file from `telegram/database/`) by `npm run bot:sync`,
because Supabase only deploys functions from `supabase/functions/`.

Edit `telegram/`, run `npm run bot:sync`, then deploy:

    supabase functions deploy telegram-bot --no-verify-jwt

See `telegram/README.md`.
