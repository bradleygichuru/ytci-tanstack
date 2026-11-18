# Then & Now admin (v1)

The Then & Now admin area lives at `/then-now` in the TanStack admin. Sites, experiences, and audit now read from the Go API (`/v1/then-now/*`) when it is reachable and non-empty; otherwise the fixture store remains the fallback. The approved interaction reference is the throwaway prototype on `prototype/then-now-admin` in `ytci-tanstack`; the workflow contract is [Then & Now — Admin Authoring, Review, and Publishing Workflow](https://github.com/bradleygichuru/ytci-mobile/blob/docs/then-now-admin-workflow/docs/specs/then-now-admin-workflow.md).

## Routes

| Route | Purpose |
|---|---|
| `/then-now` | Heritage sites list, filters, readiness, audit. |
| `/then-now/sites/new` | Short create-site wizard; creates a draft. |
| `/then-now/sites/$siteId` | Site editor: Identity, Policy, Location, Experiences, Sources; readiness rail. |
| `/then-now/experiences` | Experiences list and filters. |
| `/then-now/experiences/new` | Short create-experience wizard; creates a draft. |
| `/then-now/experiences/$experienceId` | Experience editor: Story, Video & media, Text cards, Accessibility, Rights & review, Preview; readiness rail. |
| `/then-now/review` | Review queue: unassigned, assigned to me, all open. |
| `/then-now/review/$revisionId` | Frozen revision, diff vs live, evidence, assignment, second reviewer, decision, audit. |

Preview and audit are authenticated dialogs, not public routes. Trails and Recognition remain post-v1 and are shown as locked tabs.

## Roles

- `content_editor`: draft, save, submit.
- `administrator`: everything a content editor can do, plus review, assign, schedule, publish, unpublish, and rights.
- `super_admin`: administrator plus archive, revoke, and override.
- `moderator`: read-only.
- `county_officer` / `user`: no Then & Now access.

The route guard uses the `thenNow` RBAC resource. The store actions also enforce permissions; the Go API must remain authoritative when wired.

## Fixture data

- The fixture state is seeded from `src/lib/then-now/fixtures.ts` and persisted to `localStorage` under `ytci.thenNow.fixtures.v1`.
- The **Fixture state** control in the Then & Now header exposes default, empty, loading, error, offline, 409 conflict, and read-only states. **Reset data** restores the four sample sites.
- Site photos in `public/then-now/` are illustrative placeholders, not cleared client assets.
- Media upload is simulated (metadata only). The editor marks the 1080p/720p/540p files ready after a local file is chosen; no bytes leave the browser.
- Readiness is computed locally by `src/lib/then-now/readiness.ts` as a stand-in for the server contract. The UI renders the result and never guesses publishability.

## Tests

```sh
bun run test:unit
bunx playwright test e2e/then-now-admin.spec.ts
```

The Playwright spec needs the standard seeded users (`grace@example.com`, `editor@example.com`, `moderator@example.com`) and uses `PLAYWRIGHT_BASE_URL` when the app is not on port 3000. It covers sites, the full submit → review → approve → publish flow, sensitive second-reviewer gating, content-editor and moderator roles, fixture states, both wizards, the dirty guard, conflict recovery, and 390 px layout.

## Backend wiring status

Track A (read slice) is wired. `src/lib/api/then-now.ts` owns the typed reads and the API → `HeritageSite` / `Experience` mappers:

- `listSites`, `getSite`
- `listExperiences`, `getExperience`
- `reviewQueue`, `getReview` (a revision is read through `/review/{revisionId}`; there is no standalone revision read)
- `listAudit`

`ThenNowProvider` calls `loadThenNowState()` once after hydration. On success it replaces sites, experiences, and (when the audit read succeeds) audit, and exposes `source: 'api'`. On a failed sites read or an empty site list it keeps the fixture state and `source: 'fixtures'`. A failed experiences read still keeps the API sites; a failed audit read keeps the fixture audit. Fixture state is still persisted to `localStorage`; API state is not, so a reload re-reads the server.

Not wired yet (deliberately out of this slice):

- **Site writes:** create, save, publish, unpublish, archive (`POST`/`PATCH /sites`, `/publish`, `/unpublish`, `/archive`).
- **Experience writes:** create, save, submit, assign reviewer, decisions, client approval, external reviewer, schedule, publish, new revision, status changes.
- **Review pages:** `/then-now/review` and `/then-now/review/$revisionId` still render from the shared store, so they show API data only for experiences the read slice mapped. They need `reviewQueue` / `getReview` wired to their own loading and error states.
- **Media:** R2 presign/complete and object-key storage. The editor still simulates upload locally.
- **Mutation feedback:** API writes need request-in-flight, 403/409 (`ApiErrorResponse`) handling, and an audit refresh. Until then, fixture workflow actions mutate only the in-memory store, even when the read source is the API.
- **Optimistic concurrency:** `PATCH` sends the full snapshot, so the UI needs a revision-number guard before saving.
- **Site timestamps:** the Go site read does not expose `updated_at` yet; mapped sites use an empty `updatedAt` and render "Just now". Add it to the API before relying on the Updated column.

## Verification ownership (#293)

#293 owns the integrated Playwright/Maestro gate. This slice adds unit/mapping/build coverage only; it does not add or expand e2e specs.

What #293 needs:

- **Seed:** run the Go seed (`DATABASE_URL=... go run ./cmd/seed-then-now`) so the four sites exist with UUID ids, then set `VITE_API_BASE_URL` to the Go server. Sites: Nairobi Railway Museum, Nairobi War Cemetery, African Heritage House, Nabongo Cultural Centre.
- **Auth:** log in as `grace@example.com` (administrator) so the route context carries a Go-capable token; the existing `loginAs` helper can be reused.
- **Source selector:** the footer badge reads `Live API` (published status) or `Fixture data` (draft status). Assert it to prove which path ran.
- **Sites list:** heading `Heritage sites`, search label `Search sites`, links named after the four sites, filters by county/access/status, and the Updated column.
- **Site editor:** `/then-now/sites/$siteId` where `$siteId` is the API UUID; tabs by role `Identity`, `Policy`, `Location`, `Experiences`, `Sources`; expect the mapped experience title under Experiences.
- **Fallback:** with the API stopped (or pointed at a dead port) the same fixture assertions keep working. For mocked API runs, use `page.route('**/v1/then-now/**')` and return `{ items: [...] }` / `{ site, experiences, readiness }` payloads; keep ids UUID-shaped so the route params are realistic.
- **Do not assert:** fixture deep links such as `/then-now/experiences/railway-exp` only exist in fixture mode. In API mode resolve the experience id from the API list or mock the fixture ids. Also do not assert server-side writes through the UI until Track B lands.
