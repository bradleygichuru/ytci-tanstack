# Verification specs

`smoke.spec.ts` and `seed-guard.spec.ts` are scaffolded harness specs. They run
in fixture mode on port 3210 and need no backend.

Track folders are reserved by the mobile repo's flow inventory. Each spec is
named `<screen-key>.<state>.spec.ts`:

| Folder | Owner | Runner |
|---|---|---|
| `admin-mice/` | #364 | Playwright |
| `admin-recognition/` | #368 | Playwright |
| `admin-species/` | #372 | Playwright |
| `admin-analytics/` | #375 | Playwright |

Live specs must call `loginAs*` and `assertDisposableTarget()` from
`helpers/`, and must use the fixture ids in `helpers/seed.ts`. They must not
open a database or call a shared deployment.
