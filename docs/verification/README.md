# Verification harness — admin

Status: draft scaffold (ticket #377)
Runner: Playwright 1.62
Default port: **3210**

The mobile repo owns the parity checklist and the
[flow inventory](https://github.com/bradleygichuru/ytci-mobile/blob/prototype/species-admin-scanner/docs/verification/flow-inventory.md).
This folder owns the admin half of that inventory.

## Modes

### Fixture (default, no backend)

```sh
bun run test:e2e:verify
```

`playwright.verify.config.ts` starts `e2e/verify/fixture-server.mjs` on
`127.0.0.1:3210` and runs `e2e/verify/*.spec.ts`. It needs no Postgres, Go API,
auth secret, or `.env.local`. The fixture server refuses to start when the port
is taken, so it cannot accidentally attach to another session's server.

What it proves: the runner starts, navigates, asserts, and guards the
coordination rules. It is **not** a product smoke.

### Live (real admin app, disposable seed)

The admin app cannot start without:

- Postgres 17 + PostGIS (`DATABASE_URL`), migrations applied
- `BETTER_AUTH_SECRET` and `BETTER_AUTH_URL`
- the Go admin API for business data (`docs/api/admin-go-contract.yaml`)
- an admin user and track seed data (`bun run seed:test-users`,
  `bun run seed:go-data`, or a track-specific seed)

Run the app on the verify port, not `:3000`:

```sh
VERIFY_MODE=live \
VERIFY_SEED_ID=verify-local-377 \
VERIFY_BASE_URL=http://127.0.0.1:3210 \
VERIFY_ADMIN_PASSWORD='<seeded password>' \
  bunx vite dev --port 3210
```

Then, in a second shell:

```sh
VERIFY_MODE=live VERIFY_SEED_ID=verify-local-377 \
VERIFY_BASE_URL=http://127.0.0.1:3210 \
VERIFY_ADMIN_PASSWORD='<seeded password>' \
  bun run test:e2e:verify
```

`assertDisposableTarget()` in `e2e/verify/helpers/seed.ts` rejects:

- a missing or non-`verify-` seed id
- a non-local host
- ports `3000`, `8081`, `8082`
- a `DATABASE_URL` that does not contain `verify`

`resetVerifySeed()` only runs when `VERIFY_RESET_URL` is set; the harness never
opens the database directly.

## Auth and seed helpers

| Helper | Purpose |
|---|---|
| `loginAs(page, email)` | Live-mode login with `VERIFY_ADMIN_PASSWORD`; fixture mode throws. |
| `loginAsVerifyAdmin(page)` | Logs in `verify-admin@example.test`. |
| `loginAsVerifyModerator(page)` | Logs in `verify-moderator@example.test`. |
| `logout(page)` | Clears cookies and returns to `/login`. |
| `waitForAdminData(page)` | Waits out the skeleton state. |
| `VERIFY_FIXTURES` | Stable event/recognition/species/analytics ids. |
| `assertDisposableTarget()` | Coordination guard. |

Credentials are environment-only. Do not commit them or bake them into specs.

## Spec layout

```
e2e/verify/
  smoke.spec.ts                    harness fixture smoke (scaffolded)
  seed-guard.spec.ts               coordination guard (scaffolded)
  helpers/seed.ts
  helpers/auth.ts
  fixture-server.mjs
  fixture/index.html
  admin-mice/<screen>.<state>.spec.ts          #364  blocked
  admin-recognition/<screen>.<state>.spec.ts   #368  blocked
  admin-species/<screen>.<state>.spec.ts       #372  blocked
  admin-analytics/<screen>.<state>.spec.ts     #375  blocked
```

Track specs land on their owner ticket. The path is reserved by the mobile
repo's flow inventory.

## CI

`.github/workflows/verify.yml` is a **draft**. It is not required in branch
protection. PRs run unit/contract only; the integration branch and the nightly
schedule run the fixture smoke. Playwright reports, traces, screenshots, and
videos upload as artifacts (`playwright-report/verify`, `test-results/verify`).
Live mode is not wired in CI because it needs a disposable Postgres instance
and seed.

## Evidence

Admin screenshots for parity go to the **mobile** repo's evidence tree:
`docs/verification/evidence/<ticket>/<track>/<screen>/`. Runner output stays in
the ignored `test-results/verify/` and `playwright-report/verify/` directories.
