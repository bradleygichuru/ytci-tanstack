# #376 admin integration / release verification

Admin half of the #376 integration run: one build, one app instance, all four
track verify suites against the same disposable seed.

## Build

| Item | Value |
| --- | --- |
| Branch | `release/ytc-explorer-rc1` |
| Build commit | `b1ad619` (`merge: refresh release branch with master fixes`) |
| Includes | four verify branches; recognition P0 #55, CVE fix #56, approver #57 |
| Install | `bun install` — 29 packages, lock unchanged |
| Command | `bun run build` |
| Result | pass (`✓ built in 3.28s`) |

## Runtime

| Item | Value |
| --- | --- |
| App | `vite preview` (built `.output`, Nitro node-server) on `http://127.0.0.1:3220` |
| Contracts mock | `contracts-mock` binary on `127.0.0.1:8121` |
| Mock origin proxy | node origin-echo proxy on `127.0.0.1:8120` (the URL baked into the build) |
| Database | disposable `ytci_verify_376_final` on `127.0.0.1:5432` |
| Seed id | `VERIFY_SEED_ID=verify-376-final` |
| Auth | `VERIFY_ADMIN_PASSWORD=password`, disposable `BETTER_AUTH_SECRET` |

The mock answers `Access-Control-Allow-Origin: *`, which browsers reject for the
app's credentialed fetches, so a pass-through proxy owns `:8120` and echoes the
requesting origin. Unknown paths and mutations pass straight through. This is
infrastructure only; no product code was changed for it.

The database schema is a `pg_dump --schema-only` clone of the #375 verify
database. A fresh `drizzle-kit migrate` cannot build this branch's schema: the
journaled migration `0002_brown_hercules.sql` alters `pending_media_uploads`,
which no migration creates (the table exists in `src/db/schema/business.ts` but
not in `0000`). This drift is pre-existing on `master`, is recorded below, and
does not affect the suites, which use the mock for business data and the
database only for auth users/sessions.

## Seed

Seeded before the run, against `ytci_verify_376_final` only:

```sh
bun --env-file=.verify-scratch/env.final run scripts/seed-test-users.ts
bun --env-file=.verify-scratch/env.final run .verify-scratch/seed-final.ts
```

`seed-test-users.ts` creates `grace@example.com` (MICE) plus
`moderator@example.com` / `editor@example.com` / `alice@example.com` (role
gating, password `password`). `seed-final.ts` creates `verify-admin`,
`verify-moderator`, `verify-viewer`, `verify-editor`, `verify-translator` and
`verify-reviewer` at `@example.test` (password `password`). No write-path test
touches Postgres business tables; recognition mutations go to the disposable
mock.

## Commands

```sh
# services
.verify-scratch/contracts-mock -addr 127.0.0.1:8121
node .verify-scratch/origin-proxy.mjs            # :8120 -> :8121
bun --env-file=.verify-scratch/env.final run vite preview --port 3220 --host 127.0.0.1

# one suite pass (all 99 tests, retries disabled for an honest first result)
VERIFY_MODE=live VERIFY_SEED_ID=verify-376-final \
  VERIFY_BASE_URL=http://127.0.0.1:3220 VERIFY_ALLOW_PORT=1 \
  VERIFY_ADMIN_PASSWORD=password \
  DATABASE_URL=postgres://postgres@127.0.0.1:5432/ytci_verify_376_final \
  VERIFY_WRITE_PATHS=1 \
  bunx playwright test -c playwright.verify.config.ts --retries=0
```

## Results

### Run 1 — all 99 tests, `--retries=0`, one worker

Command as above. Raw output: `logs/run1.log`; per-file counts:
`logs/run1-summary.json`.

| File | Passed | Failed | Timed out | Skipped |
| --- | ---: | ---: | ---: | ---: |
| `seed-guard.spec.ts` | 8 | 0 | 0 | 0 |
| `smoke.spec.ts` | 0 | 0 | 0 | 3 (fixture-only, expected in live mode) |
| `admin-analytics/export-erasure.spec.ts` | 0 | 1 | 0 | 3 (serial cascade) |
| `admin-analytics/overview.spec.ts` | 3 | 1 | 0 | 2 (serial cascade, incl. one P2 known-defect) |
| `admin-analytics/responsive.spec.ts` | 0 | 1 | 0 | 4 (serial cascade) |
| `admin-analytics/sections.spec.ts` | 4 | 0 | 1 | 7 (serial cascade) |
| `admin-mice/behaviour.spec.ts` | 9 | 0 | 0 | 0 |
| `admin-mice/responsive.spec.ts` | 3 | 0 | 1 | 0 |
| `admin-mice/screens.spec.ts` | 1 | 0 | 2 | 0 |
| `admin-recognition/recognition.spec.ts` | 15 | 1 | 0 | 19 (serial cascade) |
| `admin-species/recapture.spec.ts` | 0 | 1 | 0 | 0 |
| `admin-species/species.live.spec.ts` | 3 | 3 | 3 | 0 |
| **Total** | **46** | **8** | **7** | **38** |

The 38 skips are not green. Three are the fixture smoke spec correctly
skipping in live mode; 35 are serial-mode cascades behind the first failure in
their file, so those assertions did not run in run 1. Round 2 re-runs the
failures and the cascaded remainder separately.

Observed product/runtime failures from run 1:

- **Species SSR throws on every request** (`app.log`, 85 occurrences):
  `Error in renderToReadableStream: TypeError: router.serverSsr?.isDehydrated
  is not a function`. Reproduced with a single authenticated `GET
  /programme/species` (200, shell only) and `/programme/species/catalogue`.
  `@tanstack/react-router-ssr-query` 1.167.1 (via `router-ssr-query-core`
  1.169.1) calls `serverSsr.isDehydrated()`, which does not exist in the
  forced `@tanstack/router-core` 1.171.34. The CVE fix (#56) pinned
  react-router/router-core but left ssr-query on its old resolution.
- Recognition `/recognition` at 200 % text overflows horizontally by 25 px
  (threshold 2 px).
- Analytics stale/export/900 px failures: the rollup never left the loading
  state within 60 s in several cases; recorded again in round 2.
- MICE screen and responsive timeouts: pages did not finish loading inside the
  180 s budget.

## Screenshots

`docs/verification/release/376/admin/screenshots/` holds the key captured
screens (compressed). Playwright's own `test-results/` and
`playwright-report/` trees are not committed.

## Known environment follow-ups

- Fresh-database `bun run db:migrate` fails at `0002_brown_hercules.sql`
  (`relation "pending_media_uploads" does not exist`) because no journaled
  migration creates the table. Present on `master`; worked around here with a
  schema clone of `ytci_verify_375`/`ytci_verify_release376`.
