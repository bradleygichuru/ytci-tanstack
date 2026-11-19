# #376 admin integration / release verification — final run

Final admin verification of `release/ytc-explorer-rc1` for
[ytci-mobile#376](https://github.com/bradleygichuru/ytci-mobile/issues/376).
This run supersedes the earlier `b1ad619` report, which tested a build without
the SSR fix (#62) and a contracts mock that shadowed the species literal routes.
The old report is preserved as
[`README-2026-11-19-b1ad619.md`](./README-2026-11-19-b1ad619.md).

**Verdict: gate not met.** 94 of 100 tests pass; one test still fails because
the recognition awards write path has no contract read to exercise, and three
harness tests are fixture-only skips. Species `/review`, `/sources` and
`/rights`, the recognition 200 % specs, #60 and #61 now pass. No P0/P1 product
failure was found.

## Build and runtime

| Item | Value |
| --- | --- |
| Branch | `release/ytc-explorer-rc1` |
| Commit | `246963f` (`Merge remote-tracking branch 'origin/master'`) |
| Includes | SSR fix #62 (`e442b1e`), recognition 200 % fix #63 (`3edc869`), all verify specs |
| Divergence | `git rev-list --count HEAD..origin/master` = **0** |
| Install | `bun install` — 4 packages linked from the existing lock; `bun.lock` unchanged |
| Install re-check | `Checked 593 installs across 706 packages (no changes)` |
| Build | `VITE_CONTRACTS_API_URL=http://127.0.0.1:8130 bun run build` — pass (`✓ built in 5.03s`) |
| Build re-check | post-suite rebuild at the same commit — pass (`✓ built in 4.67s`) |
| App | `vite preview` (Nitro `node-server` from `.output`) on `http://127.0.0.1:3220` |
| Contracts mock | `contracts-mock` built from ytci-go `7421e60` on `127.0.0.1:8131` |
| Mock origin proxy | node origin-echo proxy on `127.0.0.1:8130` (the URL baked into the build) |
| Database | existing disposable `ytci_verify_376_final` on `127.0.0.1:5432` |
| Seed id | `VERIFY_SEED_ID=verify-376-adminfin` |
| Auth | `verify-admin@example.test` and the five other verify users, password `password` |
| Toolchain | bun 1.4.4, node v26.5.0, Playwright 1.62.0 |

`ytci-go` master is `7421e60`, the squash-merge of #54
(`fix(contracts-mock): prefer literal routes over wildcards`). The brief named
`3c0b2af`, which is #54's pre-merge branch commit; it is **not** an ancestor of
master, so the mock was built from `7421e60`. `/health` reports 111 routes, and
the three previously shadowed literals now return list payloads:

| Request through the proxy | Result |
| --- | --- |
| `GET /v1/admin/species/review` | `200`, `{ "items": [...] }` (484 B) |
| `GET /v1/admin/species/sources` | `200`, `{ "items": [...] }` (540 B) |
| `GET /v1/admin/species/rights` | `200`, `{ "items": [...] }` (470 B) |

The proxy still owns `:8130` because the mock answers
`Access-Control-Allow-Origin: *`, which browsers reject for the app's
credentialed fetches. Unknown paths and mutations pass straight through. This is
harness infrastructure only; no product code was changed for it.

The database's Better Auth JWKS was encrypted with the secret in
`.verify-scratch/env.final`. Starting the app without that secret makes
`/api/auth/get-session` return `500` (`Failed to decrypt private key`) even
though password sign-in succeeds. The run used the matching secret; this is a
disposable-DB provisioning detail, not a product defect.

## Test inventory

`bunx playwright test -c playwright.verify.config.ts --list` reports **100 tests
in 12 files**, not 99. Recognition now has 36 tests rather than 35 because #63
added `overview — KPI values stay inside their cards at 200% text`. The extra
test is recorded here rather than dropped to match the expected count.

## Results — honest first pass

Run 1 executed all 100 tests with one worker and `--retries=0` (28.6 min). Skips
are not passes, and a serial-mode cascade is recorded as "did not run", not as
a skip.

| File | Tests | Passed | Failed | Skipped | Did not run | Expected fail |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| `seed-guard.spec.ts` | 8 | 8 | 0 | 0 | 0 | 0 |
| `smoke.spec.ts` | 3 | 0 | 0 | 3 | 0 | 0 |
| `admin-analytics/export-erasure.spec.ts` | 4 | 4 | 0 | 0 | 0 | 0 |
| `admin-analytics/overview.spec.ts` | 6 | 5 | 0 | 0 | 0 | 1 |
| `admin-analytics/responsive.spec.ts` | 5 | 5 | 0 | 0 | 0 | 0 |
| `admin-analytics/sections.spec.ts` | 12 | 11 | 0 | 0 | 0 | 1 |
| `admin-mice/behaviour.spec.ts` | 9 | 9 | 0 | 0 | 0 | 0 |
| `admin-mice/responsive.spec.ts` | 4 | 4 | 0 | 0 | 0 | 0 |
| `admin-mice/screens.spec.ts` | 3 | 3 | 0 | 0 | 0 | 0 |
| `admin-recognition/recognition.spec.ts` | 36 | 32 | 1 | 0 | 3 | 0 |
| `admin-species/recapture.spec.ts` | 1 | 1 | 0 | 0 | 0 | 0 |
| `admin-species/species.live.spec.ts` | 9 | 9 | 0 | 0 | 0 | 0 |
| **Total** | **100** | **91** | **1** | **3** | **3** | **2** |

The 3 skips are `smoke.spec.ts`, which is fixture-mode by design and skipped in
live mode. They are not product evidence.

The 2 expected failures are `test.fail()` annotations for the known P2 #375
defects; they failed as annotated, which is why they are not counted as passes:

- `overview — loading after stale clears the stale banner`
- `suppressed: retention cell names a week the retention table renders`

## Retry of the failing file

`admin-recognition/recognition.spec.ts` was re-run once, alone, with
`--retries=0` (7.6 min). It reproduced the same result: **32 passed, 1 failed,
3 did not run**. Because the file is
`test.describe.configure({ mode: 'serial' })`, the failure aborts the three
tests after it. The three cascaded tests were then run directly and all passed:

| Test | Result |
| --- | --- |
| `seasons — closing needs a reason and a typed confirmation` | pass (7.1 s) |
| `role gating — content editor and reader are redirected to no-access` | pass (27.2 s) |
| `role gating — moderator reads but sees no authoring controls` | pass (14.0 s) |

## Final per-file status

This is the disposition after the file retry and the targeted re-run of the
three cascaded tests.

| File | Tests | Passed | Failed | Skipped | Known-defect expected fail |
| --- | ---: | ---: | ---: | ---: | ---: |
| `seed-guard.spec.ts` | 8 | 8 | 0 | 0 | 0 |
| `smoke.spec.ts` | 3 | 0 | 0 | 3 | 0 |
| `admin-analytics/export-erasure.spec.ts` | 4 | 4 | 0 | 0 | 0 |
| `admin-analytics/overview.spec.ts` | 6 | 5 | 0 | 0 | 1 |
| `admin-analytics/responsive.spec.ts` | 5 | 5 | 0 | 0 | 0 |
| `admin-analytics/sections.spec.ts` | 12 | 11 | 0 | 0 | 1 |
| `admin-mice/behaviour.spec.ts` | 9 | 9 | 0 | 0 | 0 |
| `admin-mice/responsive.spec.ts` | 4 | 4 | 0 | 0 | 0 |
| `admin-mice/screens.spec.ts` | 3 | 3 | 0 | 0 | 0 |
| `admin-recognition/recognition.spec.ts` | 36 | 35 | 1 | 0 | 0 |
| `admin-species/recapture.spec.ts` | 1 | 1 | 0 | 0 | 0 |
| `admin-species/species.live.spec.ts` | 9 | 9 | 0 | 0 | 0 |
| **Total** | **100** | **94** | **1** | **3** | **2** |

- **94 passed** is not "100 green". The one failure below is reproducible.
- **2 expected-fail annotations** are known P2 #375 defects, not green tests.
- **3 skips** are the fixture-only smoke tests, not product evidence.

## Focus areas

| Area | Result | Evidence |
| --- | --- | --- |
| #62 SSR query integration | **pass** | App log has 0 `isDehydrated` throws. Authenticated SSR: `/programme/species` 200 67 KB, `/programme/species/panthera-leo` 200 109 KB, `/programme/species/panthera-leo/languages` 200 96 KB (these were hard 500s on `b1ad619`). |
| #63 recognition at 200 % text | **pass (3/3)** | `overview — 200% text does not force horizontal scrolling` (4.4 s), `overview — KPI values stay inside their cards at 200% text` (8.0 s), `overview — 200% text collapses the sidebar and keeps the nav on one line` (11.9 s). |
| Species contract reads `/review`, `/sources`, `/rights` | **pass** | Fixed mock returns the correct list payloads for all three; all 10 species tests pass, including `recaptures the screens that need the derived data loaded` and `rights withdrawal names blast radius`. |
| #60 species derived data | **pass — close** | The 4 focused tests pass: recapture (`4 shown` on translation), matrix translation/sources, rights blast radius (`1 sources`), and the full species file is 10/10. |
| #61 audit CSV after Rights filter | **pass — close** | `audit filters and CSV export use the same filter` passes and downloads a filtered CSV (`1400-filtered-csv.png`). |
| Recognition awards bulk retry | **fail** | See below. This is a contract/fixture coverage gap, not a product regression. |

### Explicit re-verification for #60 and #61

A targeted run of the four tests named in the two issues produced:

```
✓ recapture → recaptures the screens that need the derived data loaded (40.8s)
✓ species admin → captures translation, sources, readiness and audit across the matrix (1.1m)
✓ species admin → rights withdrawal names blast radius; non-revocable sources cannot be targeted (11.0s)
✓ species admin → audit filters and CSV export use the same filter (12.4s)

4 passed (2.2m)
```

Both issues were filed against `b1ad619` and attributed to the app. The correct
fixture proves both were mock-route shadowing: `/v1/admin/species/review`,
`/sources` and `/rights` were being answered by the `/{id}` wildcard. Both are
closed with this evidence after this commit.

## The one remaining failure

**Test:** `admin-recognition/recognition.spec.ts:507`
`awards — bulk retry asks for scope and never duplicates XP`

**Result:** timed out after 180 s waiting for
`getByRole('button', { name: /retry failed/i })`; the locator resolves to a
`disabled` button. Reproduced on the file retry.

**Cause:** the awards ledger has no contract read in contracts 1.0.0.
`src/lib/recognition/store.tsx` deliberately clears the demo awards when any
recognition read succeeds:

> `// Missions and the awards ledger have no contract read in 1.0.0. Their`
> `// fixtures are demo data, so a reachable API clears them rather than mixing`
> `// invented rows into a live screen.`

The frozen mock has no `/v1/admin/recognition/awards` route, and ytci-go exposes
no such admin read. With a reachable API, `state.awards` is empty, so
`failed.length` is 0 and `Retry failed (0)` is disabled. The write path cannot
be exercised until the contract exposes failed awards or the harness seeds the
store directly.

**Classification:** harness/contract coverage gap. The app's behaviour is
consistent with its data source (no failed awards to retry). **No P0/P1 issue
was filed**, because this is not a product failure and filing one would
misattribute a fixture gap.

**Reproducer:**

```sh
VERIFY_MODE=live VERIFY_SEED_ID=verify-376-adminfin \
  VERIFY_BASE_URL=http://127.0.0.1:3220 VERIFY_ALLOW_PORT=1 \
  VERIFY_ADMIN_PASSWORD=password \
  DATABASE_URL=postgres://postgres@127.0.0.1:5432/ytci_verify_376_final \
  VERIFY_WRITE_PATHS=1 \
  bunx playwright test -c playwright.verify.config.ts \
    admin-recognition/recognition.spec.ts --retries=0 \
    --grep "awards — bulk retry"
```

## Fresh-migrate drift (pre-existing, not changed)

A fresh `drizzle-kit migrate` into a new database still cannot build the schema:

1. `0000_long_captain_midlands.sql` needs PostGIS (`geometry` type); the
   migration does not create the extension.
2. After enabling PostGIS, `0002_brown_hercules.sql` fails at line 29:
   `relation "pending_media_uploads" does not exist`. No journaled migration
   creates that table.

The run therefore used the existing disposable `ytci_verify_376_final` (69
public tables, already migrated, 18 users including all six `verify-*` accounts).
The business suites use the mock for data and Postgres only for auth
users/sessions. No migration was edited. Raw output:
`logs/final-2026-11-20/migrate-drift-0002.log`.

## Commands

```sh
# mock, built from ytci-go master 7421e60 (contains #54)
cd /home/brad/code/ytci-go-release-376
go build -o /home/brad/code/ytci-release-admin/.verify-scratch/contracts-mock-7421e60 ./cmd/contracts-mock
.verify-scratch/contracts-mock-7421e60 -addr 127.0.0.1:8131

# CORS proxy 8130 -> 8131
PROXY_PORT=8130 MOCK_UPSTREAM=http://127.0.0.1:8131 node .verify-scratch/origin-proxy.mjs

# app
VITE_CONTRACTS_API_URL=http://127.0.0.1:8130 bun run build
set -a; . ./.verify-scratch/env.final; set +a
bunx vite preview --port 3220 --host 127.0.0.1

# full suite, honest first pass
VERIFY_MODE=live VERIFY_SEED_ID=verify-376-adminfin \
  VERIFY_BASE_URL=http://127.0.0.1:3220 VERIFY_ALLOW_PORT=1 \
  VERIFY_ADMIN_PASSWORD=password \
  DATABASE_URL=postgres://postgres@127.0.0.1:5432/ytci_verify_376_final \
  VERIFY_WRITE_PATHS=1 EVIDENCE_DIR="$PWD/.verify-scratch/evidence-final2" \
  bunx playwright test -c playwright.verify.config.ts --retries=0
```

All servers were stopped after the run. No tag was created and nothing was
merged to master.

## Evidence

All paths are relative to this directory.

| Path | Contents |
| --- | --- |
| `logs/final-2026-11-20/run1.log` | full 100-test first pass, including raw failure and timing |
| `logs/final-2026-11-20/run1-rows.json` | per-test status for run 1 (parsed from the JSON reporter) |
| `logs/final-2026-11-20/run2-recognition.log` | file retry: same failure, 3 did-not-run |
| `logs/final-2026-11-20/run3-recognition-tails.log` | the 3 cascaded tests, all passed |
| `logs/final-2026-11-20/run4-species-60-61.log` | explicit #60/#61 re-verification, 4 passed |
| `logs/final-2026-11-20/probe-review.json`, `probe-sources.json`, `probe-rights.json` | fixed-mock list payloads |
| `logs/final-2026-11-20/versions-and-toolchain.txt` | commits, versions, ports, mock health |
| `logs/final-2026-11-20/install-postrun.log`, `build-repro.log` | post-run install/build re-check |
| `logs/final-2026-11-20/migrate-drift-0002.log` | exact `pending_media_uploads` failure |
| `logs/final-2026-11-20/app-3220.log` | preview log; no SSR `isDehydrated` throws |
| `screenshots/final-2026-11-20/species-translation-4-shown.png` | translation queue with derived task count |
| `screenshots/final-2026-11-20/species-sources-withdraw-blast-radius.png` | rights withdrawal blast radius |
| `screenshots/final-2026-11-20/species-audit-filtered-csv.png` | audit CSV enabled and filtered |

Playwright's `test-results/` and `playwright-report/` trees are ignored and not
committed.

## Issue disposition

| Issue | Disposition |
| --- | --- |
| [ytci-tanstack#60](https://github.com/bradleygichuru/ytci-tanstack/issues/60) | Re-verified against the fixed mock; all named tests pass; closed with evidence. |
| [ytci-tanstack#61](https://github.com/bradleygichuru/ytci-tanstack/issues/61) | Re-verified; audit CSV downloads after the Rights filter; closed with evidence. |
| [ytci-tanstack#62](https://github.com/bradleygichuru/ytci-tanstack/issues/62) | Fixed on this branch; SSR errors are gone. |
| [ytci-tanstack#63](https://github.com/bradleygichuru/ytci-tanstack/issues/63) | Fixed; all three recognition 200 % tests pass. |
| New P0/P1 | None filed. The remaining failure is a contract/fixture coverage gap. |
