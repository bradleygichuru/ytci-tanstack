# MICE operations admin

Status: implemented on `feat/mice-admin` for [ytci-mobile#363](https://github.com/bradleygichuru/ytci-mobile/issues/363).
Owner: `stream:mice`. Surface flag: `VITE_FLAG_MICE` (ships dark).
Contracts: 1.0.0 plus the additive MICE admin operations documented in `ytci-go/docs/execution/mice-admin-ops.md` (operations 112–120). No existing 1.0.0 operation changed.

## Routes

All routes live under `src/routes/_authenticated/programme/events/` and are gated by
the same flag, `events.read` and `platform.admin_access` as the nav registry entry.

| Screen                   | Route                             | Source                                                 |
| ------------------------ | --------------------------------- | ------------------------------------------------------ |
| Overview                 | `/programme/events`               | `index.tsx`                                            |
| Events list              | `/programme/events/list`          | `list.tsx`                                             |
| Event editor             | `/programme/events/$eventId`      | `$eventId.tsx` + `components/mice/EventEditorForm.tsx` |
| Venues                   | `/programme/events/venues`        | `venues.tsx` + `components/mice/VenueDialog.tsx`       |
| Agenda & speakers        | `/programme/events/agenda`        | `agenda.tsx`                                           |
| Registrations & waitlist | `/programme/events/registrations` | `registrations.tsx`                                    |
| Check-in counter         | `/programme/events/check-in`      | `check-in.tsx`                                         |
| Review queue             | `/programme/events/review`        | `review.tsx`                                           |
| Organizer verification   | `/programme/events/organisers`    | `organisers.tsx`                                       |
| Event reports            | `/programme/events/reports`       | `reports.tsx`                                          |
| Audit log                | `/programme/events/audit`         | `audit.tsx`                                            |

Shared MICE chrome (pills, cards, table wrapper, scope bar, fixture-state control,
stale banner) is in `src/components/mice/shared.tsx`. It composes the shell's
`DataTable`, `FilterBar`, `PageHeader` and `FormDialog`; no shell file is forked.

## Data and state

- Reads use `contractsApi` through `src/lib/mice/api.ts`; every query honours the
  fixture state selected in the header (`default`, `empty`, `error`, `stale`).
- `error` is a deterministic 503 with the frozen error copy; `empty` suppresses
  the list panels; `stale` keeps last-known data readable but disables writes.
- Server writes cover event lifecycle, waitlist offers, registration
  corrections, check-in undo, speaker edit/consent/remove and the MICE audit
  read. The store calls the contract endpoints directly and invalidates the
  matching query.
- The browser store under `ytci.mice.workflow.v1` now holds only the work the
  contract does not model yet: staged review revisions, review assignments,
  venue evidence/retirement and organizer request notes. The audit screen
  merges those local review rows with the server audit log and labels the
  source.
- One realistic review item is seeded on first load so the review queue, second
  reviewer and publish gate are demonstrable without hand-building data.

## Server-backed operations

The additive operations are documented in
`ytci-go/docs/execution/mice-admin-ops.md`. The admin calls them directly:

| Job                                       | Endpoint |
| ----------------------------------------- | -------- |
| Event cancel / unpublish / archive / publish / restore | `POST /v1/admin/events/{id}/lifecycle` |
| Registration edit / cancel                | `PATCH /v1/admin/events/{id}/registrations/{registrationId}` |
| Waitlist offer create                     | `POST /v1/admin/events/{id}/waitlist-offers` |
| Waitlist offer accept / withdraw          | `POST /v1/admin/events/{id}/waitlist-offers/{registrationId}/decision` |
| Check-in undo                             | `POST /v1/admin/events/{id}/checkins/{checkInId}/undo` |
| Speaker edit / consent / remove           | `PATCH|DELETE /v1/admin/events/{id}/people/{personId}`, `POST .../consent` |
| MICE audit read                           | `GET /v1/admin/mice/audit` |

Existing writes remain in use: `adminCreateEvent`, `adminUpdateEvent`,
`adminPublishEvent`, `adminCreateEventSession`, `adminUpdateEventSession`,
`adminCreateEventPerson`, `adminLinkSessionSpeaker`, `adminCreateVenue`,
`adminUpdateVenue`, `adminDecideOrganizerVerification`,
`adminDraftEventChangeNotice`, the staff check-in endpoint, and
`adminDecideEventReport`.

## Remaining contract gaps

| Job                              | Behaviour |
| -------------------------------- | --------- |
| Venue evidence / retire / merge  | local evidence and retire/merge with a local audit row |
| Organizer “request more evidence”| local request note; verification decisions use the real endpoint |

Both are documented as out of scope in the change-control note.

## Carry-forwards from the prototype critique

| #   | Requirement                                      | Implementation                                                                                                               |
| --- | ------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------- |
| 1   | Check-in arithmetic reconciles                   | imported = total − recorded; same confirmed total on the counter                                                             |
| 2   | One waitlist offer record                        | `local.offers[eventId]` read by overview and registrations; send only when no offer is open; withdraw returns the place      |
| 3   | Stale is read-only, not unreadable               | `StaleBanner`; reads keep working; write callbacks short-circuit and buttons disable                                         |
| 4   | Sticky publish bar                               | review screen has a sticky bottom bar with blockers, waiting count and the disabled reason beside Publish                    |
| 5   | Queue throughput                                 | previous/next, per-row selection, bulk publish of ready items, assigned-to control                                           |
| 6   | Date entry echoes the formatted value            | `DateEcho` renders “Wed 18 Nov 2026” under both date inputs and validates against it                                         |
| 7   | One dataset marker                               | overview and list carry the production figure once; KPI values hold the current workspace count                              |
| 8   | Agenda conflict resolution and speaker lifecycle | conflicts name the clashing session; Resolve opens the session editor; speakers have consent, remove and create/link actions |
| 9   | Event lifecycle                                  | cancel/restore, unpublish/re-publish, archive and withdraw staged revision, each with a reason                               |

## Test and verification

```bash
bun run typecheck          # 18 known baseline errors; none in MICE files
bunx vitest run src/lib/mice src/components/mice
bun run build
```

- 35 unit/component tests cover the capacity floor, organizer tiers, readiness
  blockers, second reviewer, uploader self-review, event diff, agenda conflicts,
  FIFO waitlist, queue navigation, report target, the simple table states and the
  server write path for lifecycle, waitlist, registration, check-in undo and
  speaker consent/removal.
- SSR smoke (authenticated, against `cmd/contracts-mock`) returned 200 for every
  route; the shared shell's query provider is used, no client fetch wrapper.
- Per the task instruction, no Playwright device runs were made in this
  workspace. The DoD Playwright-per-screen matrix remains open and is listed on
  the PR.

## Implementation critique (self-assessment, post-build)

Target ≥30/40. Scored against the prototype critique's heuristic shape:

| Heuristic                       | Score       | Note                                                                                         |
| ------------------------------- | ----------- | -------------------------------------------------------------------------------------------- |
| Visibility of system status     | 4           | lifecycle/review/stale banners, blockers next to Publish                                     |
| Match to the real world         | 4           | organizer tiers, FIFO, evidence, ticket handoff disclosure                                   |
| User control and freedom        | 3           | withdraw, undo, cancel, next/previous; some local-only jobs cannot be reverted on the server |
| Consistency and standards       | 4           | one table/pill/dialog grammar from the shell                                                 |
| Error prevention                | 4           | capacity floor, uploader ≠ reviewer, tri-state + evidence, required reasons                  |
| Recognition over recall         | 3           | submitted record and diff on the same screen; audit detail expands                           |
| Flexibility and efficiency      | 3           | bulk publish, assigned queues, exports; no saved filters                                     |
| Aesthetic and minimalist design | 3           | calm density, one dataset marker; some screens are long                                      |
| Error recovery                  | 3           | frozen envelope copy, retry, stale is read-only                                              |
| Help and documentation          | 2           | inline hints, no dedicated help panel                                                        |
| **Total**                       | **33 / 40** | passes the ≥30 bar; local-only gaps are documented                                           |

Playwright coverage for the write path lives in `e2e/verify/admin-mice/behaviour.spec.ts` (live mode). Component and unit tests cover the request shapes in CI; the live track owns the seeded end-to-end pass.
