# Analytics admin — implementation notes and parity matrix

Status: implemented for [ytci-mobile#374](https://github.com/bradleygichuru/ytci-mobile/issues/374)
Branch: `feat/analytics-admin`
Base: `origin/master` (shared shell merged)
Prototype: [species-analytics.html](https://github.com/bradleygichuru/ytci-mobile/blob/prototype/species-analytics/docs/prototypes/species-analytics.html) · critique: [species-analytics-critique.md](https://github.com/bradleygichuru/ytci-mobile/blob/prototype/species-analytics/docs/prototypes/species-analytics-critique.md) · checklist: [parity-checklist.md](https://github.com/bradleygichuru/ytci-mobile/blob/prototype/species-admin-scanner/docs/prototypes/parity-checklist.md)

## Route inventory

| Prototype screen | Route | Contract read | Permission |
| --- | --- | --- | --- |
| `overview` | `/analytics` | `GET /v1/admin/analytics/overview` + `quality` | `analytics.read` + `platform.admin_access` |
| `journeys` | `/analytics/journeys` | `GET /v1/admin/analytics/journeys` | `analytics.read` |
| `funnels` | `/analytics/funnels` | `GET /v1/admin/analytics/funnels` + `journeys` | `analytics.read` |
| `retention` | `/analytics/retention` | `GET /v1/admin/analytics/retention` | `analytics.read` |
| `adoption` | `/analytics/adoption` | `GET /v1/admin/analytics/adoption` | `analytics.read` |
| `search` | `/analytics/search` | `quality` signals; aggregate not in contract | `analytics.read` |
| `content` | `/analytics/content` | `journeys` (content journeys), labelled overlay otherwise | `analytics.read` |
| `programme` | `/analytics/programme` | none — domain tables are not read here | `analytics.read` |
| `quality` | `/analytics/quality` | `GET /v1/admin/analytics/quality` | `analytics.read` |
| `admin-suppressed` | `/analytics/suppressed` | `quality` + suppressed rows from every read | `analytics.read` |
| export | header action on every route | `POST /v1/admin/analytics/export` | `analytics.export` |
| erasure | Quality panel | `POST /v1/admin/analytics/erasure` | `analytics.erasure` |

The shared sidebar has one Analytics entry (`src/lib/navigation/sections.ts`). The
entry now carries `permission: 'analytics.read'`, `requiresAdmin: true` and the
`analytics` surface flag. Its four internal groups live in
`src/components/analytics/shared.tsx`. No shared shell component was edited.

## Filter contract

Carry-forward P1s #2 and #3 are fixed by making the filter model match the
contract, not by copying the prototype's county/platform selectors.

| Filter | Where it is offered | Where it is applied |
| --- | --- | --- |
| Date window (`30d`, `90d`, `season`) | Every section | Every contract read (`from`/`to`) |
| Journey | Journeys only | Journeys read only (`journey` query) |
| County | Not offered | No contract dimension exists |
| Platform | Not offered | No contract dimension exists |

- `SECTION_FILTERS` in `src/lib/analytics/filters.ts` is the single table the
  request, the scope sentence and the "Not applied here" badge read. A filter
  cannot be shown without being applied, or applied without being shown.
- The store sends the journey query to the journeys read only. Sending it to the
  other reads would make the badge a lie.
- A journey set on Journeys and then carried to Overview shows a gold
  "Not applied here: …" badge and a one-click Reset; Overview still reads global
  data, and says so.
- `normaliseRange` / `normaliseJourney` coerce untrusted values before a
  request; the API never receives an unknown journey.

## As-of and last-success stamps

- `quality.rollups` is the only source. `lastSuccess` is the latest `lastDay`
  with `status: "ok"`; it is kept across a failed refetch so the error state can
  still say "last successful rollup …".
- Successful: `Data through 18 Nov 2026 · nightly rollup`.
- Empty: `Last successful rollup 18 Nov 2026 · no data for …`. The empty range
  has a successful rollup behind it.
- Failed: `No rollup loaded · last successful rollup 18 Nov 2026`. No partial
  numbers are rendered.
- Stale (`X-Data-Stale: true`): data stays visible, the stamp says
  `Showing last-known data`, and export/erasure are disabled.
- The request window is anchored to today, not to `lastSuccess`, so a successful
  quality read cannot change the window and trigger a second read.

## Empty versus failed rollup

| State | Trigger | Copy | Action |
| --- | --- | --- | --- |
| Empty | `empty` fixture, or every cell suppressed/absent | “No data for these filters” + last-success | Reset filters |
| Failed | 503 / any read failure | “We couldn't load the rollup” + last-success + no partial numbers | Retry |
| Stale | `X-Data-Stale` | Last-known data banner + stale marker | Use live data |
| Loading | initial read | “Loading the rollup” | — |

The analytics surface deliberately has **no sample fallback** for contract
reads. Recognition can fall back to a sample because it is an operator overlay;
analytics numbers are evidence, so a failed rollup stays failed.

## Suppression and privacy

- Every suppressed value renders `—`, never `0`, with an `sr-only` reason.
- The Suppressed cells screen lists the real suppressed rows from overview,
  journeys, funnels, retention and adoption, plus `quality.suppression`.
- The county × feature table is a labelled sample and has no total row: a total
  plus one visible cell would reveal the hidden value.
- No per-user timelines. No raw search text. The Search screen names the missing
  contract metrics instead of inventing a zero.
- Programme impact is never proxied from telemetry; the screen links to the
  domain surfaces instead.

## Contract gaps (no contract change made)

The frozen analytics 1.0.0 contract exposes overview, journeys, funnels,
retention, adoption, quality, export and erasure. It does **not** expose:

1. **Search aggregates** — zero-result rate, external selection, median results
   and editor-assigned clusters. ADR 0016 requires them; the screen documents
   the gap and the data-quality signals that prove search events arrive.
2. **Content aggregates** — destination view → save → plan and course
   start → complete. Content journeys in the journeys read are used when
   present; otherwise the table is a labelled sample of the intended shape.
3. **Programme domain counts** — conservation check-ins, event attendance,
   course completions and badges. These must come from domain tables, never
   telemetry. The screen links to Conservation, Events, LMS and Recognition.
4. **County and platform dimensions** on every analytics read. These were
   dropped from the filter bar rather than faked.

Adding any of these is an additive contract change in `ytci-go`, a vendored YAML
update, regeneration and fixture/test coverage.

## Carry-forward fixes (critique → implementation)

| P1 | Fix |
| --- | --- |
| Chart peak and DAU told different population stories | Chart bars, peak caption and DAU KPI all come from `overview.daily`. The caption says “same DAU population as the KPI”; suppressed days are not plotted. |
| Rates were labelled baselines but still moved with some filters | Every KPI is read from the same filtered rollup. There are no invariant cards; county/platform were removed rather than partially applied. |
| Keep the filter model honest | `SECTION_FILTERS` drives the request, the scope line and the badge. Journey is offered on Journeys only and is never sent to another read. |
| Empty vs failed rollup | Distinct copy, distinct actions, distinct last-success sentences; no sample fallback; tests cover both. |
| Last-success stamp | Derived from `quality.rollups`, preserved across a failed refetch, and rendered on every section. |

## Data states and evidence matrix

The layout exposes a data-state switcher (`default`, `empty`, `loading`,
`error`, `stale`). The fixtures come from `cmd/contracts-mock` on `:8099`;
`empty`, `error` and `stale` exercise the mock's fixture states. `quality` has
no `empty` fixture, so the empty scenario is enforced by the surface (every
section renders the empty state) while the last-success stamp still reads the
last quality response.

| # | Prototype screen / state | Implementation | Evidence |
| --- | --- | --- | --- |
| 1 | `overview` default 1400/1180/900 | `routes/_authenticated/analytics/index.tsx` | Component tests + build; no Playwright device run per stream instruction |
| 2 | `journeys` sorted, same source as Overview | `analytics/journeys.tsx` | `derive.test.ts` (single source, ordering, suppression) |
| 3 | `funnels` step bars, largest-drop caption | `analytics/funnels.tsx` | `derive.test.ts` (largest drop names real steps) |
| 4 | `retention` W0–W7, elapsed only, ARIA | `analytics/retention.tsx` | `derive.test.ts` + `shared.test.tsx` (caption lists elapsed only) |
| 5 | `adoption` reach/depth/repeat, denominators | `analytics/adoption.tsx` | `derive.test.ts` (sort and denominators) |
| 6 | `search` gap, clusters | `analytics/search.tsx` | `filters.test.ts` (no fake filter), contract-gap copy |
| 7 | `content` view→save→plan / start→complete | `analytics/content.tsx` | Live journeys when present; labelled overlay otherwise |
| 8 | `programme` domain-table impact | `analytics/programme.tsx` | No telemetry proxy; links to domain surfaces |
| 9 | `quality` ingest/consent/unknown/queue/rollups | `analytics/quality.tsx` | `derive.test.ts` (coverage, last success, failed job) |
| 10 | `admin-suppressed` small cells, no total | `analytics/suppressed.tsx` | Real suppressed rows + no-total sample |
| 11 | Empty / error / stale | Layout + `SectionFrame` | `derive.test.ts` (`rollupStatusLine`, `sectionState`) |
| 12 | Export and erasure role gates | `ExportDialog`, Quality erasure panel | `api.test.ts`; permission copy in components |

## Tests

```bash
bunx vitest run src/lib/analytics src/components/analytics
bun run typecheck      # no new errors from this ticket (repo baseline remains)
bun run build
```

Playwright device runs were not performed for this stream, per the execution
instruction. The unit and component tests cover the filter contract, chart/KPI
population, journey reconciliation, funnel caption, elapsed retention, empty vs
failed distinction, suppression markers, the API envelope and stale marker.
