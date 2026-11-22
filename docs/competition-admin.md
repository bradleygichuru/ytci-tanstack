# Competition admin

Admin surface for the YTCI competition and award programme. One route,
`/competition`, with eight tabs backed by the Go API at
`/v1/admin/competition`.

Route B is the current legal route: a non-competitive award programme. The
expert panel selects grants, commissions, certificates, repository features, and
recognition. The public vote decides a separate, non-cash People's Choice. The
surface never blends the public vote into a panel award and never uses cash
prize language.

## Access

- Resource: `competition` (legacy RBAC key, also mirrored by
  `competition.read|edit|publish|score` in `roles.v1.yaml`).
- `county_officer` reads only.
- `moderator` reads, edits, and publishes.
- `administrator` and `super_admin` have the full surface.
- Sidebar entry: Programme → Competition.

Write actions are hidden when the role lacks the action. The API is
authoritative and returns `FORBIDDEN` for the same cases.

## Tabs

| Tab | Behaviour |
| --- | --- |
| Editions | Create and edit the edition (name, slug, theme, status, promotion type, ages, vote mode, prize flag, dates, rules version), delete, and manage categories per edition. |
| Entries | List entries, filter by category and eligibility, open a blind-safe eligibility review, record a decision note, and attach published repository entries. |
| Judges | Invite judges, link a user account, change status, assign judges per category, recuse assignments, and declare or remove conflicts. |
| Scoring | Blind entry view, four rubric scores on a 1 to 10 scale, notes, weighted total out of 100, category lock and unlock, and progress per judge. |
| Votes | Aggregate live and invalidated totals per entry, manual review cases, written resolutions, and reason-coded vote invalidation. No vote is removed automatically. |
| Results | Preview ranked results, recount from the ledger, freeze and write the final snapshot, and publish category and overall awards or the People's Choice. |
| Awards | Award record list with form, citation, publication state, edit, publish, and delete. |
| Consultation | Response list with answer detail and CSV export. |

## API endpoints used

All under `/v1/admin/competition`:

- `GET /editions`, `GET /editions/{id}`
- `POST /editions`, `PATCH /editions/{id}`, `DELETE /editions/{id}`
- `GET /editions/{id}/categories`, `POST /editions/{id}/categories`
- `PATCH /categories/{id}`, `DELETE /categories/{id}`
- `GET /editions/{id}/entries`, `GET /entries/{id}`
- `POST /editions/{id}/entries`, `PATCH /entries/{id}`, `DELETE /entries/{id}`
- `POST /entries/{id}/eligibility`
- `GET /editions/{id}/judges`, `POST /editions/{id}/judges`
- `PATCH /judges/{id}`, `DELETE /judges/{id}`
- `GET /editions/{id}/assignments`, `POST /editions/{id}/assignments`
- `PATCH /assignments/{id}`, `DELETE /assignments/{id}`
- `GET /editions/{id}/conflicts`, `POST /editions/{id}/conflicts`
- `DELETE /conflicts/{id}`
- `GET /editions/{id}/scores`, `PUT /scores`
- `POST /editions/{id}/scores/lock`
- `GET /editions/{id}/votes/summary`
- `GET /editions/{id}/vote-review-cases`, `POST /editions/{id}/vote-review-cases`
- `POST /vote-review-cases/{id}/resolve`
- `POST /votes/{id}/invalidate`
- `GET /editions/{id}/results`
- `POST /editions/{id}/freeze`, `POST /editions/{id}/recount`
- `GET /editions/{id}/awards`, `POST /editions/{id}/awards`
- `PATCH /awards/{id}`, `POST /awards/{id}/publish`, `DELETE /awards/{id}`
- `GET /editions/{id}/consultation-responses`
- `GET /editions/{id}/consultation-responses/export` (CSV)

The client is `src/lib/api/competition.ts`, registered on `createApiClient` as
`api.competition`.

## Contract gaps

These are known gaps in the deployed API, not workarounds in the admin:

1. **No per-vote admin list.** The API exposes only aggregate vote totals,
   review cases, and `POST /votes/{voteId}/invalidate`. A reviewer cannot
   browse or search individual votes in the product, so invalidation asks for a
   vote reference from the reviewed case. This is privacy-friendly but blocks a
   complete in-product vote review queue.
2. **No judge progress endpoint.** Progress is computed in the browser from
   assignments, category entries, and scores. A large edition will make extra
   list calls but remains correct.
3. **No score correction reason.** `PUT /scores` is an upsert. Unlocking and
   resaving a score does not capture the written correction reason the
   operations manual asks for.
4. **No lock-state per score.** `POST /scores/lock` returns only
   `{ updated, locked }`. Per-entry lock state comes from `lockedAt` on the
   score list.
5. **Consultation has no page metadata.** The list returns `items` only. The
   admin uses a fixed 50-row limit and manual offset paging.
6. **No appeals records.** The five-day appeals window and its reviewer
   outcomes have no API surface yet.
7. **No award notification or consent state.** Publishing an award sets
   `publishedAt` only. The 14-day recipient response and forfeiture flow is
   outside the API.
8. **No category update UI in the awards editor.** `PATCH /awards/{id}` changes
   the entry, form, and citation, not the category or award type. Those are
   fixed after creation.
9. **Nullable text PATCH semantics.** The edition and judge update handlers treat
   JSON `null` as "field absent". Clearing a theme therefore sends an empty
   string, which the API normalises to null. The same caveat applies to a judge
   email and an award citation.

## Playwright

`e2e/competition-admin.spec.ts` covers edition creation, category creation,
judge invitation and assignment, entry attachment, blind scoring, freeze and
results preview, award publication, and the county officer read-only view. Run
with:

```bash
bun run test:e2e:competition
```

Preconditions:

- admin app running at `PLAYWRIGHT_BASE_URL` (default `http://localhost:3000`);
- competition admin deployed on the API;
- seeded administrator (`COMPETITION_ADMIN_EMAIL`, default
  `grace@example.com`, password `password`);
- seeded county officer (`COMPETITION_OFFICER_EMAIL`, default
  `officer@example.com`);
- at least one published repository entry.

If no published repository entry exists, the spec skips after edition creation
and leaves the disposable edition for manual cleanup. The spec was written but
not executed in this checkout: no app server, database, or API credentials were
available here. Auth fixtures exist; the missing fixture is competition data.
