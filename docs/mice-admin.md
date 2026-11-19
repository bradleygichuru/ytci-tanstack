# MICE operations admin

Status: implemented on `feat/mice-admin` for [ytci-mobile#363](https://github.com/bradleygichuru/ytci-mobile/issues/363).
Owner: `stream:mice`. Surface flag: `VITE_FLAG_MICE` (ships dark).
Contracts: frozen 1.0.0. This stream did not change the contract, generated types or the shared shell.

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
- Local workflow (staged revisions, review assignments, waitlist offers,
  registration corrections, local check-in undo, speaker consent, venue evidence,
  report assignments and the audit trail) is persisted under
  `ytci.mice.workflow.v1`. The audit screen can reset it.
- One realistic review item is seeded on first load so the review queue, second
  reviewer and publish gate are demonstrable without hand-building data.

## Contract gaps (no contract change in this ticket)

The frozen 1.0.0 contract has no admin operation for these. The UI still exposes
the job, records it in the audit log, and labels it as local:

| Job                                       | Gap                             | Behaviour                                                                                     |
| ----------------------------------------- | ------------------------------- | --------------------------------------------------------------------------------------------- |
| Event cancel / unpublish / archive        | no lifecycle write              | local lifecycle override, reason required, audit row                                          |
| Registration edit / cancel                | no admin registration write     | local correction, audit row                                                                   |
| Waitlist offer create / accept / withdraw | no offer operation              | one local offer per event, same record on overview and registrations                          |
| Check-in undo                             | no delete operation             | local correction; the staff check-in endpoint is used for check-in/override                   |
| Speaker edit / consent / remove           | no speaker update operation     | local lifecycle; `adminCreateEventPerson` and `adminLinkSessionSpeaker` are used for creation |
| Venue evidence / retire / merge           | no evidence or retire operation | local evidence and retire/merge with audit row                                                |
| Organizer “request more evidence”         | no request operation            | local request note; verification decisions use the real endpoint                              |
| MICE audit read                           | no admin audit endpoint         | append-only browser-local log for every stream action                                         |

Server writes that do exist are used directly: `adminCreateEvent`, `adminUpdateEvent`,
`adminPublishEvent`, `adminCreateEventSession`, `adminUpdateEventSession`,
`adminCreateEventPerson`, `adminLinkSessionSpeaker`, `adminCreateVenue`,
`adminUpdateVenue`, `adminDecideOrganizerVerification`,
`adminDraftEventChangeNotice`, the staff check-in endpoint, and
`adminDecideEventReport`.

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

- 23 unit/component tests cover the capacity floor, organizer tiers, readiness
  blockers, second reviewer, uploader self-review, event diff, agenda conflicts,
  FIFO waitlist, queue navigation, report target and the simple table states.
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

No screenshot pack is committed because Playwright device runs were out of scope
for this execution. Component tests and typecheck replace them in this branch.
