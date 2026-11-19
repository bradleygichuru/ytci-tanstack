# #376 admin integration / release verification

Admin half of the #376 integration run: one build, one app, all four track
verify suites against the same instance.

## Build

| Item | Value |
| --- | --- |
| Branch | `release/ytc-explorer-rc1` |
| Build commit | `3480986` (merge of `verify/analytics-375`; all four verify branches merged) |
| Base | `master` @ `00286a9` |
| Command | `bun run build` |
| Result | pass (`✓ built in 4.55s`) |

## Runtime

| Item | Value |
| --- | --- |
| App | `vite preview` (built `.output`, Nitro node-server) on `http://127.0.0.1:3220` |
| Contracts mock | `cmd/contracts-mock` (from `ytci-go` @ `30217b0`) on `127.0.0.1:8121` |
| Mock origin proxy | node origin-echo proxy on `127.0.0.1:8120` (the URL baked into the build) |
| Database | disposable `ytci_verify_release376` (clone of the #375 verify schema) |
| Seed id | `VERIFY_SEED_ID=verify-376-release` |
| Auth | `VERIFY_ADMIN_PASSWORD=password`, disposable `BETTER_AUTH_SECRET` |

The mock answers `Access-Control-Allow-Origin: *`, which browsers reject for the
app's credentialed fetches, so a pass-through proxy owns `:8120` and echoes the
requesting origin. Unknown paths and mutations pass straight through. This is
infrastructure only; no product code was changed for it.

## Commands

```sh
# services
.verify-scratch/contracts-mock -addr 127.0.0.1:8121
node .verify-scratch/origin-proxy.mjs            # :8120 -> :8121
bun --env-file=.env.local run vite preview --port 3220 --host 127.0.0.1

# suites (one app instance)
export VERIFY_MODE=live VERIFY_SEED_ID=verify-376-release \
  VERIFY_BASE_URL=http://127.0.0.1:3220 VERIFY_ALLOW_PORT=1 \
  VERIFY_ADMIN_PASSWORD=password \
  DATABASE_URL=postgres://postgres@127.0.0.1:5432/ytci_verify_release376

bunx playwright test -c playwright.verify.config.ts e2e/verify/admin-mice
bunx playwright test -c playwright.verify.config.ts e2e/verify/admin-species
bunx playwright test -c playwright.verify.config.ts e2e/verify/admin-analytics
VERIFY_WRITE_PATHS=1 \
  bunx playwright test -c playwright.verify.config.ts e2e/verify/admin-recognition
```

## Results

_Filled in after the run._

## Screenshots

`docs/verification/release/376/admin/screenshots/` holds the key captured
screens (compressed). Playwright's own `test-results/` and
`playwright-report/` trees are not committed.

## Known follow-ups

- `verify/species-372` adds a verification-only trusted origin
  (`http://127.0.0.1:3213`, `http://localhost:3213`) to `src/lib/auth.ts`, marked
  "Revert before any merge". It is harmless in the release branch but must be
  removed before `master`.
