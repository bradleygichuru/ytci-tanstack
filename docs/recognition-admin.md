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

## Data states

The layout exposes a data-state switcher (`default`, `empty`, `loading`, `error`,
`stale`, `read-only`). Every list uses the shell `DataStateView` / `DataTable`
state grammar. The contracts client is configured with the matching fixture
state, so `empty`, `error` and `stale` exercise the mock where a fixture exists.

When the contracts mock is not running the surface falls back to the
deterministic sample and the footer says `Sample data`. Actions that write to
the contract still call the API and fail with an explanation rather than
pretending the write succeeded (for example `publishBadge`, `correctAward`,
`setKillSwitch`).

## Contract gaps (no contract change made)

The frozen 1.0.0 contract has read/write endpoints for rules, badges, seasons,
moderation, backfill, adjustments, kill switches and audit. It does **not** yet
expose:

1. **Awards ledger read** (`GET /v1/admin/recognition/awards`) and **retry**
   (`POST /v1/admin/recognition/awards/{id}/retry`). The ledger is an operator
   overlay over the sample; corrections go through the real adjustments endpoint.
2. **Mission administration** (`GET/POST /v1/admin/recognition/missions`). The
   screen uses the sample catalogue; pause/resume and completion correction are
   audited overlays.
3. **Leaderboard administration** (`GET /v1/admin/recognition/leaderboard/{season}`,
   retract, restore). Freeze, public visibility and season close use contract
   endpoints/overlays; retract/restore are audited overlays.
4. **Rule version-history read**. History is derived from the rule list by
   `ruleKey` + `version`; a dedicated endpoint would be cheaper at production
   volume.
5. **Bulk award retry** with a server-side preview. The client preview groups the
   current filter and calls the same idempotent retry path per award.

Adding any of these is an additive contract change in `ytci-go`, a vendored YAML
update, regeneration and fixture/test coverage. Until then the UI labels the
overlay behaviour in the footer and the audit entry, and keeps the contract
writes real.

## Tests

```bash
bun run typecheck             # recognition files clean; repo baseline remains
bunx vitest run src/lib/recognition src/components/recognition
bun run build                 # SSR build includes the recognition routes
```

Playwright device screens were not run for this stream, per the execution
instruction. The component tests cover the rule diff, validation, simulation
gate, rank recomputation, failure grouping, contract reconciliation and the
retracted-row restore path.
