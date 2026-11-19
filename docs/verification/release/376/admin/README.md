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

_Filled in after the run._

## Screenshots

`docs/verification/release/376/admin/screenshots/` holds the key captured
screens (compressed). Playwright's own `test-results/` and
`playwright-report/` trees are not committed.

## Known environment follow-ups

- Fresh-database `bun run db:migrate` fails at `0002_brown_hercules.sql`
  (`relation "pending_media_uploads" does not exist`) because no journaled
  migration creates the table. Present on `master`; worked around here with a
  schema clone of `ytci_verify_375`/`ytci_verify_release376`.
