# Recognition admin — implementation notes and parity matrix

Status: implemented for [ytci-mobile#367](https://github.com/bradleygichuru/ytci-mobile/issues/367)
Branch: `feat/recognition-admin`
Prototype: [admin-operations.html](https://github.com/bradleygichuru/ytci-mobile/blob/prototype/admin-operations/docs/prototypes/admin-operations.html) · critique: [admin-operations-critique.md](https://github.com/bradleygichuru/ytci-mobile/blob/prototype/admin-operations/docs/prototypes/admin-operations-critique.md) · checklist: [parity-checklist.md](https://github.com/bradleygichuru/ytci-mobile/blob/prototype/species-admin-scanner/docs/prototypes/parity-checklist.md)

## Route inventory

| Prototype screen     | Route                        | Permission                                                                                                   |
| -------------------- | ---------------------------- | ------------------------------------------------------------------------------------------------------------ |
| `admin-rec-overview` | `/recognition`               | `recognition.read` + admin access                                                                            |
| `admin-rules`        | `/recognition/rules`         | `recognition.read`                                                                                           |
| `admin-rule-editor`  | `/recognition/rules/$ruleId` | author `recognition.author_rule`; publish `recognition.publish_rule`; simulate `recognition.simulate_rule`   |
| `admin-badges`       | `/recognition/badges`        | author `recognition.author_badge`; publish `recognition.publish_badge`                                       |
| `admin-missions`     | `/recognition/missions`      | author `recognition.author_rule`; corrections `recognition.adjust_xp`                                        |
| `admin-seasons`      | `/recognition/seasons`       | prepare `recognition.prepare_season`; publish `recognition.publish_season`; close `recognition.close_season` |
| `admin-leaderboard`  | `/recognition/leaderboard`   | freeze/publish `recognition.publish_season`; hide `recognition.kill_switch`                                  |
| `admin-awards`       | `/recognition/awards`        | retry / correct `recognition.adjust_xp`                                                                      |
| `admin-moderation`   | `/recognition/reports`       | `recognition.moderate`; disqualify `recognition.disqualify`                                                  |
| `admin-backfill`     | `/recognition/backfill`      | request `recognition.backfill`; approve `recognition.approve_backfill`                                       |
| `admin-audit`        | `/recognition/audit`         | `recognition.audit_read`                                                                                     |
| `admin-killswitch`   | `/recognition/kill-switches` | `recognition.kill_switch`                                                                                    |

The shared sidebar has one Recognition entry (`src/lib/navigation/sections.ts`) pointing at
`/recognition`; the surface's internal Govern / Run / Safety groups live in
`src/components/recognition/shared.tsx`. No shared shell component was edited.

## Parity and carry-forwards

| #   | Prototype screen / state                                                           | Implementation                                | Carry-forward                                                                                                                                                            |
| --- | ---------------------------------------------------------------------------------- | --------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 1   | Recognition overview: KPIs, attention list, four switches, recent audit            | `routes/_authenticated/recognition/index.tsx` | Attention is grouped broken → waiting → informational; KPI value and production context are separate                                                                     |
| 2   | Rules: status filter, version, retire gate                                         | `recognition/rules/index.tsx`                 | Retired filter; retire requires a reason; version history on the editor                                                                                                  |
| 3   | Rule editor: staged draft, live diff, simulation, effective date, badge integrity  | `recognition/rules/$ruleId.tsx`               | Simulation from staged inputs with deltas; immutable event contract; per-field invalid state; per-field errors survive as inline text, not only a toast; dirty guard     |
| 4   | Badges: bilingual names, criteria, privacy, status                                 | `recognition/badges.tsx`                      | Used-by graph; published edits are staged; publish needs EN + SW and a second administrator                                                                              |
| 5   | Missions: families, condition, reward, badge, completions                          | `recognition/missions.tsx`                    | Edit/create; completion ledger and correction; pause/resume symmetry                                                                                                     |
| 6   | Seasons: open/scheduled/closed, board size, close + snapshot                       | `recognition/seasons.tsx`                     | Two-person close; typed season key; full snapshot dialog; no countdown                                                                                                   |
| 7   | Leaderboard: season scope, ranks, search, suppression, retract/restore/freeze      | `recognition/leaderboard.tsx`                 | Ranks recomputed on every mutation; retracted rows retained with restore; closed boards read-only; danger styling reserved for Retract                                   |
| 8   | Awards: state tabs, retry, manual credit, version                                  | `recognition/awards.tsx`                      | Failures grouped by cause and explained once; bulk retry preview with count and rule versions; correction requires a support reference; reversal writes a negative entry |
| 9   | Moderation: age/SLA, kind-specific decisions, evidence                             | `recognition/reports.tsx`                     | Case view linked to board / ledger / audit; decision and reopen reasons; disqualification only with `recognition.disqualify`                                             |
| 10  | Backfill: bound rule/window, frozen dry-run, per-row include, CSV, request/approve | `recognition/backfill.tsx`                    | Approver sees the rows; withdraw request keeps the dry-run; parameters-changed notice                                                                                    |
| 11  | Audit: one log, category filters                                                   | `recognition/audit.tsx`                       | Export respects the active filter; actor, role and absolute time on every row                                                                                            |
| 12  | Kill switches: four switches, reason + typed OFF, history                          | `recognition/kill-switches.tsx`               | Current-state attribution with reason/actor/time; dependency summary; typed `OFF` for the global stop                                                                    |

## Data states and provenance

The layout exposes a data-state switcher (`default`, `sample (demo)`, `empty`,
`loading`, `error`, `stale`, `read-only`). Every list uses the shell
`DataStateView` / `DataTable` state grammar.

Reads replace their section with contract rows. A successful read never keeps a
sample row: rules, badges, seasons, moderation, backfill, kill switches, audit
and the leaderboard each become exactly the rows the API returned. A failed read
leaves the last-known rows for that section in place so the operator can see
what is stale.

Sample rows are reachable in two cases only:

1. the explicit **Sample (demo)** data state, or
2. every contract read fails and the whole surface falls back to the
   deterministic sample.

Each row carries a provenance tag (`api` or `sample`). The footer marker is
derived from the rows actually on screen: `Contract API` only when every visible
row is contract data, `Contract API + sample fallback` for a mixed result, and
`Sample data` for the fallback/demo states. A mixed screen is never labelled
`Contract API`.

Missions and the awards ledger have no contract read in 1.0.0, so a reachable
API clears their fixtures rather than mixing invented rows into a live screen.
They remain available in the demo state and in the all-reads-failed fallback.

Writes now call the contract and refetch on success. `createRule`,
`createBadge` and `createSeason` post to their collection endpoints;
`publishRule`, `publishBadge`, `publishSeason`, `freezeSeason` and
`closeSeason` post to the action endpoints. A toast appears only after a 2xx
response, and a rejected write leaves the UI unchanged and shows the error.


## Contract gaps (no contract change made)

The frozen 1.0.0 contract has read/write endpoints for rules, badges, seasons,
moderation, backfill, adjustments, kill switches and audit. It does **not** yet
expose the operations this console needs to finish the job. Each is read-only or
explicitly refused rather than simulated:

1. **Rule definition update** (`PATCH /v1/admin/recognition/rules/{id}`). `POST
   /rules` creates a draft and `POST /rules/{id}/publish` publishes it, but there
   is no way to change the definition after creation. The editor locks the
   definition fields and explains the gap.
2. **Rule retire** (`POST /v1/admin/recognition/rules/{id}/retire`). Retiring is
   disabled; the button carries the contract-gap explanation.
3. **Badge definition update** (`PATCH /v1/admin/recognition/badges/{key}`).
   `POST /badges` creates and `POST /badges/{key}/publish` publishes, but an
   existing badge cannot be edited. The badge dialog opens read-only.
4. **Season identity in the read model.** `POST /seasons/{id}/publish`,
   `/freeze` and `/close` require a UUID, but `Season` exposes only `key`. The
   client sends the UUID when the read model provides one and otherwise refuses
   with an explanation; it never sends the key and never swallows the rejection.
   Either add `id` to `Season` or accept the season key on those endpoints.
5. **Awards ledger read** (`GET /v1/admin/recognition/awards`) and **retry**
   (`POST /v1/admin/recognition/awards/{id}/retry`). The ledger is empty in live
   mode; corrections go through the real adjustments endpoint.
6. **Mission administration** (`GET/POST /v1/admin/recognition/missions`). The
   screen is empty in live mode and populated only by demo data.
7. **Leaderboard administration** (`GET /v1/admin/recognition/leaderboard/{season}`,
   retract, restore). Freeze, public visibility and season close use contract
   endpoints/overlays; retract/restore are audited overlays.
8. **Rule version-history read**. History is derived from the rule list by
   `ruleKey` + `version`; a dedicated endpoint would be cheaper at production
   volume.
9. **Bulk award retry** with a server-side preview. The client preview groups the
   current filter and calls the same idempotent retry path per award.
10. **Backfill approval request / withdrawal** (`POST /backfill/{id}/request`,
    `/withdraw`). The contract creates and approves batches but has no request
    or withdraw operation; those controls are disabled.
11. **Moderation reopen** (`POST /moderation/{id}/reopen`). A decided case cannot
    be reopened; the control is disabled.
12. **Board unfreeze** (`POST /seasons/{id}/unfreeze`). Freeze exists, unfreeze
    does not; the control is disabled.

Adding any of these is an additive contract change in `ytci-go`, a vendored YAML
update, regeneration and fixture/test coverage. The change-control candidates
are 1–4 and 10–12; they are the operations the current UI deliberately disables
instead of pretending to save.

## Tests

```bash
bun run typecheck             # recognition files clean; repo baseline remains
bunx vitest run src/lib/recognition src/components/recognition
bun run build                 # SSR build includes the recognition routes
```

`src/lib/recognition/__tests__/store.test.tsx` covers the provenance contract
(contract-only rows on success, labelled sample fallback when every read fails,
mixed never reported as API) and the write contract (creates call the API and
refetch, rejected writes leave the UI unchanged and never toast, season actions
send the UUID and refuse without one).

Playwright device screens were not run for this stream, per the execution
instruction. The recognition verify spec is live-mode only and skips in the
static fixture harness; it needs a seeded app and `VERIFY_ADMIN_PASSWORD`.
