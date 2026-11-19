# Verification harness — admin

Status: gate for #376 (ticket #377)
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
VITE_CONTRACTS_API_URL=http://127.0.0.1:8099 \
VITE_FLAG_MICE=true VITE_FLAG_SPECIES=true VITE_FLAG_RECOGNITION=true \
VITE_FLAG_ANALYTICS=true \
  bunx vite dev --port 3210
```

Seed the users the track specs sign in as before running:

```sh
bun run scripts/seed-test-users.ts        # MICE: grace@example.com, alice@example.com, moderator@example.com
VERIFY_ADMIN_PASSWORD='<same password>' \
  bun run scripts/seed-verify-372.ts      # species: verify-admin/-editor/-translator/-reviewer@example.test
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
  admin-mice/                      #364  live: screens, behaviour, responsive
  admin-recognition/               #368  live: screened states + governance
  admin-species/                   #372  live: matrix, behaviour, recapture
  admin-analytics/                 #375  live: overview, sections, responsive
```

`playwright.verify.config.ts` runs two projects. `verify-harness` covers the
harness specs in both modes. `verify-live` is added only for
`VERIFY_MODE=live` and collects `admin-*/**/*.spec.ts`, so the product suites
never execute against the static fixture. Add new track specs under a folder
matching `admin-<track>/` or they will not be collected.

## CI

`.github/workflows/verify.yml` is the gate for #376, not a draft. Branch
protection lists `Unit and contract` and `Playwright fixture smoke`; neither has
`continue-on-error`, so a red suite blocks the merge.

| Job | Runs | What it proves |
|---|---|---|
| `Unit and contract` | every PR/push | `vitest` is green and `tsc` reports no error outside the recorded baseline |
| `Playwright fixture smoke` | every PR/push/nightly | the harness starts, navigates and guards the coordination rules |
| `Playwright live (seeded)` | when the live secrets exist | the MICE (#364), recognition (#368), species (#372) and analytics (#375) suites drive the real app on a disposable seed |

A fixture-only run is **not** product evidence. The live job is skipped — never
silently replaced by fixture mode — unless all of these repository secrets are
set:

| Secret | Purpose |
|---|---|
| `VERIFY_DATABASE_URL` | disposable Postgres DSN; must contain `verify` |
| `VERIFY_BETTER_AUTH_SECRET` | Better Auth secret for the throwaway app |
| `VERIFY_ADMIN_PASSWORD` | password for the seeded verification users |

The live job starts a PostGIS service, applies migrations, seeds the
verification users (`seed-test-users.ts`, `seed-verify-372.ts`), starts the Go
contracts mock on `:8099`, starts the admin app on `:3210` with the MICE and
species flags on, and runs `bun run test:e2e:verify:live`. Playwright reports,
traces, screenshots, and videos upload as artifacts
(`playwright-report/verify`, `test-results/verify`).

## Evidence

Admin screenshots for parity go to the **mobile** repo's evidence tree:
`docs/verification/evidence/<ticket>/<track>/<screen>/`. Runner output stays in
the ignored `test-results/verify/` and `playwright-report/verify/` directories.
