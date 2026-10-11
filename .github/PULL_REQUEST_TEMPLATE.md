## What does this change?

<!-- A short description and the issue it closes, e.g. "Closes #12". -->

## How was it tested?

<!-- Manual steps and/or new tests. -->

## Checklist

- [ ] `npx tsc --noEmit`, `npm run lint`, `npm test` and `npm run build` pass
- [ ] No secrets, `.env` files or keystores are included
- [ ] Changes touching sync or note storage have regression tests
- [ ] New database tables enable RLS with `auth.uid()` policies
- [ ] Docs updated if behaviour changed
