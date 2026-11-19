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

Six runner invocations were needed because the host restarted repeatedly
mid-run: it killed the preview (exit 143), once wiped `.output` (rebuilt at the
same commit, `✓ built in 9.84s`), and wedged the app under load. Run 1 is the
honest first pass. Runs 2-6 re-ran every failing file and every test a
serial-mode cascade had skipped, so the final column is the best evidence
available, not a single green run.

### Final status on this build

| Surface | Tests | Passed | Failed | Skipped | Known-defect (expected fail) |
| --- | ---: | ---: | ---: | ---: | ---: |
| Harness (`seed-guard`, `smoke`) | 11 | 8 | 0 | 3 | 0 |
| Analytics (#375) | 27 | 25 | 0 | 0 | 2 |
| MICE (#364) | 16 | 16 | 0 | 0 | 0 |
| Recognition (#368) | 35 | 33 | 2 | 0 | 0 |
| Species (#372) | 10 | 5 | 5 | 0 | 0 |
| **Total** | **99** | **87** | **7** | **3** | **2** |

- The 3 skips are `smoke.spec.ts` only; it is fixture-mode by design and is
  skipped in live mode. They are not product evidence.
- The 2 known-defect tests are `test.fail()` annotations for P2 #375 (stale
  flag survives Loading; suppressed retention labels W8 while the table stops
  at W7). Both reproduced as expected; they are not green.
- 7 failures: 6 product failures and 1 fixture gap (details below).
- 87 passed is not "99 green". The gate is not met.

### Run 1 — all 99 tests, `--retries=0`, one worker

Raw output: `logs/run1.log`; per-file counts: `logs/run1-summary.json`.

| File | Passed | Failed | Timed out | Skipped |
| --- | ---: | ---: | ---: | ---: |
| `seed-guard.spec.ts` | 8 | 0 | 0 | 0 |
| `smoke.spec.ts` | 0 | 0 | 0 | 3 (expected, fixture-only) |
| `admin-analytics/export-erasure.spec.ts` | 0 | 1 | 0 | 3 (serial cascade) |
| `admin-analytics/overview.spec.ts` | 3 | 1 | 0 | 2 (serial cascade) |
| `admin-analytics/responsive.spec.ts` | 0 | 1 | 0 | 4 (serial cascade) |
| `admin-analytics/sections.spec.ts` | 4 | 0 | 1 | 7 (serial cascade) |
| `admin-mice/behaviour.spec.ts` | 9 | 0 | 0 | 0 |
| `admin-mice/responsive.spec.ts` | 3 | 0 | 1 | 0 |
| `admin-mice/screens.spec.ts` | 1 | 0 | 2 | 0 |
| `admin-recognition/recognition.spec.ts` | 15 | 1 | 0 | 19 (serial cascade) |
| `admin-species/recapture.spec.ts` | 0 | 1 | 0 | 0 |
| `admin-species/species.live.spec.ts` | 3 | 3 | 3 | 0 |
| **Total** | **46** | **8** | **7** | **38** |

The 35 serial-cascade skips were re-run in later passes (recognition with
`--grep-invert`, then the three remaining tests directly; analytics responsive
a third time; MICE screens/responsive again).

### Run 2 — per-file re-runs

| File | Result |
| --- | --- |
| `admin-analytics/export-erasure.spec.ts` | 4 passed |
| `admin-analytics/overview.spec.ts` | 5 passed, 1 known P2 expected |
| `admin-analytics/responsive.spec.ts` | 2 passed, 1 failed (`ERR_ABORTED` navigating to `/analytics/journeys`), 2 did not run |
| `admin-analytics/sections.spec.ts` | 11 passed, 1 failed (beforeEach sign-in timed out at 120 s) |
| `admin-mice/responsive.spec.ts` | 4 passed |
| `admin-mice/screens.spec.ts` | 3 passed |
| `admin-recognition/recognition.spec.ts` | 15 passed, 1 failed (200 % overflow), 19 cascaded |
| `admin-species/recapture.spec.ts` | 1 failed (`4 shown` not found) |
| `admin-species/species.live.spec.ts` | 5 passed, 4 failed |

### Run 3-6 — coverage of cascaded tests

- Recognition, `--grep-invert "200% text does not force horizontal scrolling"`:
  30 passed, 1 failed (`awards — bulk retry`, fixture gap), 3 cascaded.
- Recognition, the 3 remaining tests (`seasons — closing`, both role-gating
  tests): 3 passed.
- Recognition, `awards — bulk retry` alone: failed again (button disabled for
  the full 180 s).
- Analytics responsive, full file: 5 passed.
- Analytics `suppressed: retention cell names ...`: expected P2 failure, as
  annotated.

### Reproducible product failures

| # | Test | Result in run 1 | Result in re-run | Evidence |
| --- | --- | --- | --- | --- |
| 1 | recognition `overview — 200% text does not force horizontal scrolling` | failed, 25 px overflow | failed again, 25 px overflow | `screenshots/recognition-200percent-overflow.png` |
| 2 | species `recaptures the screens that need the derived data loaded` (`4 shown` on translation) | failed | failed again | `screenshots/species-translation.png` |
| 3 | species `captures overview, catalogue, editor and languages across the matrix` | timed out at `page.goto` | failed: H1 never visible, error boundary | error page `Something went wrong!` |
| 4 | species `rights withdrawal names blast radius ...` (`1 sources`) | failed | failed again | sources screen |
| 5 | species `audit filters and CSV export use the same filter` | timed out waiting for download | failed again: Export CSV disabled after Rights filter | audit screen |
| 6 | species `editor dirty guard keeps the draft on cancel` | H1 timeout | H1 timeout, error boundary | editor screen |

### Root cause found: SSR query integration is broken

`app.log` shows **95** occurrences of:

```
Error in renderToReadableStream: TypeError: router.serverSsr?.isDehydrated is not a function
    at @tanstack/react-router-ssr-query
```

Stack saved in `logs/ssr-isdehydrated.txt`. Installed versions:

| Package | Version |
| --- | --- |
| `@tanstack/react-router` | 1.170.41 |
| `@tanstack/router-core` (forced override) | 1.171.34 |
| `@tanstack/react-router-ssr-query` | 1.167.1 |
| `router-ssr-query-core` | 1.169.1 |

`router-ssr-query-core` calls `serverSsr.isDehydrated()`, which router-core
1.171.34 does not implement. The CVE fix (#56) pinned react-router/router-core
but left ssr-query at its older resolution; the mismatch throws on every SSR
query notification. Species routes hit an error boundary
(`Something went wrong!`) under Playwright, and the same defect is the likely
cause of the species data not appearing.

### Fixture gap (not a product failure)

`recognition awards — bulk retry asks for scope and never duplicates XP`: the
`Retry failed` button is disabled because the frozen mock's awards ledger
returns **0 awards / engine off** on that screen, while the overview fixture
reports 7 failed deliveries. Verified directly in the browser: the awards
ledger renders `0`, `UNDELIVERED 0`, `FAILED GROUPS 0`, and the button is
disabled with no timeout. The test cannot exercise the write path until the
mock provides failed awards under the same conditions as the overview.

### Filed issues

| Issue | Severity | Failure |
| --- | --- | --- |
| [ytci-tanstack#58](https://github.com/bradleygichuru/ytci-tanstack/issues/58) | P0 | SSR query integration throws (`isDehydrated`); species error boundary |
| [ytci-tanstack#59](https://github.com/bradleygichuru/ytci-tanstack/issues/59) | P1 | recognition 200 % overflow (25 px) |
| [ytci-tanstack#60](https://github.com/bradleygichuru/ytci-tanstack/issues/60) | P1 | species translation/sources missing derived data |
| [ytci-tanstack#61](https://github.com/bradleygichuru/ytci-tanstack/issues/61) | P1 | species audit CSV disabled after Rights filter |

Results commented on [ytci-mobile#376](https://github.com/bradleygichuru/ytci-mobile/issues/376#issuecomment-7019406241).

### Environment flakes (not counted as defects)

These failed in run 1 and passed on re-run, with the failure mode being a
timeout/abort rather than an assertion about product behaviour:

- analytics export queue, stale rollup, 900 px viewport (rollup stuck on
  "Loading the rollup" for 60 s; passed in run 2);
- analytics retention section (120 s timeout; passed in run 2);
- MICE screens at 1400/1180/900 (180 s timeouts; all 3 passed in run 2);
- MICE responsive 1400/900 (180 s timeout; all 4 passed in run 2);
- species catalogue search/bulk assignment (browser launch timeout; passed in
  run 2).

## Screenshots

`docs/verification/release/376/admin/screenshots/` holds the key captured
screens: MICE overview/registrations/check-in/agenda, analytics
overview/funnels/retention, species overview/catalogue/translation/readiness,
recognition overview/rules, the 200 % overflow evidence, and the awards ledger
showing the fixture gap. Playwright's own `test-results/` (traces, videos) and
`playwright-report/` trees are not committed. Raw runner output is in `logs/`.

## Second-pass corrections (fresh instance, same build)

A later verification pass on the same code (`b1ad619`; branch HEAD was
`14d7272`, docs only) rebuilt from scratch and reproduced the failures. It
corrects the attribution above. Evidence: `logs/install.log`,
`logs/build2.log`, `logs/ssr-isdehydrated-rc-final.txt`,
`logs/retry-union.json`, `logs/retries/`, `screenshots/*-http500.png`.

### Build and install verified again

- `bun install`: exit 0, "Checked 593 installs across 706 packages (no
  changes)", `bun.lock` unchanged.
- `bun run build`: exit 0, client/server/nitro bundles emitted,
  `.output/nitro.json` written (32.72 s / 18.26 s / 9.91 s).
- One fresh `vite preview` on `:3220`, mock upstream `:8121`, origin proxy
  `:8120`, DB `ytci_verify_376_final`, seed `verify-376-final`.
- Recognition 200 % overflow reproduced a third time: 25 px against a 2 px
  threshold (`logs/retries/confirm-recognition-200.log`). Awards bulk retry
  reproduced again: the `Retry failed` control is absent/disabled.

### The release branch is one commit behind master

`origin/master` contains `e442b1e` (#62), which pins
`@tanstack/react-router-ssr-query` 1.167.3 / `router-ssr-query-core` 1.169.3 and
`@tanstack/react-query` 5.108.1, removing the `isDehydrated` call. The release
branch is **exactly one commit behind** that fix (`git rev-list --count
HEAD..origin/master` = 1). Testing `b1ad619` therefore tests the known-broken
SSR path.

Measured on this build (authenticated requests):

| Route | HTTP | Body | SSR error |
| --- | ---: | ---: | --- |
| `/programme/species` | 200 | 9.7 KB shell | 1 throw |
| `/programme/species/panthera-leo` | **500** | error page | 1 throw |
| `/programme/species/panthera-leo/languages` | **500** | error page | 1 throw |
| `/analytics` | 200 | 62.9 KB | 0 throws |

So the two species editor screens are hard 500s, not merely a client error
boundary. Other species routes return a shell and hydrate with a React #419
server-suspense error. Merging master (or cherry-picking #62) is the release
action; it was **not** done here.

### Translation/sources/audit failures are a contracts-mock defect

The mock shipped in `.verify-scratch` was stale (77 routes at `/__fixtures`;
the `ytci-go` checkout at `61562a7` serves 111). More importantly,
`fixtures/routes.go` matches first-match-wins and registers
`GET /v1/admin/species/{id}` **before** `/review`, `/sources` and `/rights`, so
the wildcard shadows all three literals:

```
GET /v1/admin/species/review        -> species/detail fixture (200)
GET /v1/admin/species/sources       -> species/detail fixture (200)
GET /v1/admin/species/rights        -> species/detail fixture (200)
GET /v1/admin/species/zzz-nonsense  -> species/detail fixture (200)
```

The app therefore receives a species object where it expects `{ items: [...] }`:
the translation queue loses its review task (3 tasks instead of 4), and sources
and rights render from the wrong payload. **This is harness infrastructure, not
app code.**

Diagnostic (no product code changed): a copy of `ytci-go-release-376@61562a7`
with the three literal routes moved above `/{id}` was rebuilt and served on
`:8121`. `/review`, `/sources` and `/rights` then returned their proper list
fixtures. Re-running the species files against it:

| Species result with correct fixtures | Count |
| --- | ---: |
| Passed | 8 (1 of them after a retry) |
| Failed | 2 — both at the routes that 500 without #62 |
| Skipped | 0 |

`recaptures the screens` passed, and `audit filters and CSV export use the same
filter` passed, so **#61 is not reproducible with the correct fixture**. The
recapture and rights failures above are mock attribution errors, not product
failures. Raw evidence: `logs/retries/diag2-species.log`.

### Corrected retry union

| Disposition | Tests |
| --- | ---: |
| Passed (best result across passes) | 87 |
| Failed for a product reason | 1 (recognition 200 % overflow) |
| Failed only because the build lacks #62 (500) | 2 |
| Failed only because of the mock defect | 2 |
| Timed out (species audit: mock/500; recognition awards: fixture gap) | 2 |
| Known-defect `test.fail()` annotations that now pass | 2 |
| Skipped, fixture mode only (`smoke.spec.ts`) | 3 |

No single invocation was green, and 87/99 best-of-pass is not a green gate.

## Known environment follow-ups

- Fresh-database `bun run db:migrate` fails at `0002_brown_hercules.sql`
  (`relation "pending_media_uploads" does not exist`) because no journaled
  migration creates the table. Present on `master`; worked around here with a
  schema clone of `ytci_verify_375`/`ytci_verify_release376`.
