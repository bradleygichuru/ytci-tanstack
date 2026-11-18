# Then & Now admin (v1)

The Then & Now admin area lives at `/then-now` in the TanStack admin. Sites, experiences, review, and audit read from the Go API (`/v1/then-now/*`) when it is reachable and non-empty; writes go to the same API. The fixture store remains the offline/demo fallback. The approved interaction reference is the throwaway prototype on `prototype/then-now-admin` in `ytci-tanstack`; the workflow contract is [Then & Now — Admin Authoring, Review, and Publishing Workflow](https://github.com/bradleygichuru/ytci-mobile/blob/docs/then-now-admin-workflow/docs/specs/then-now-admin-workflow.md).

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
- Media upload is simulated (metadata only). The editor marks the 1080p/720p/540p files ready after a local file is chosen; no bytes leave the browser. In API mode the Go readiness gate also requires R2 object keys, so a simulated upload alone does not clear submit.
- Readiness is computed locally by `src/lib/then-now/readiness.ts` as a stand-in for the server contract. When an experience came from the API it also checks `renditionKeys`, `posterKey`, `captionKeys`, and `transcriptKey`, matching the Go gate. The UI renders the result and never guesses publishability.

## Tests

```sh
bun run test:unit
bunx playwright test e2e/then-now-admin.spec.ts
```

The Playwright spec needs the standard seeded users (`grace@example.com`, `editor@example.com`, `moderator@example.com`) and uses `PLAYWRIGHT_BASE_URL` when the app is not on port 3000. It covers sites, the full submit → review → approve → publish flow, sensitive second-reviewer gating, content-editor and moderator roles, fixture states, both wizards, the dirty guard, conflict recovery, and 390 px layout.

## Backend wiring status

Both read and write slices are wired. `src/lib/api/then-now.ts` owns the typed API surface, the API → `HeritageSite` / `Experience` mappers, and the write payload builders:

- Reads: `listSites`, `getSite`, `listExperiences`, `getExperience`, `reviewQueue`, `getReview`, `listAudit`.
- Site writes: `createSite`, `updateSite`, `publishSite`, `unpublishSite`, `archiveSite`. Unpublish and archive carry the dialog reason; `updateSite` sends the loaded `updatedAt` as `If-Match`.
- Experience writes: `createExperience`, `updateExperience`, `submitExperience`, `assignReviewer`, `unassignReviewer`, `decideExperience`, `recordClientApproval`, `recordExternalReviewer`, `scheduleExperience`, `cancelSchedule`, `publishExperience`, `newRevision`, `changeExperienceStatus`.

`ThenNowProvider` calls `loadThenNowState()` after hydration. On success it replaces sites, experiences, and (when the audit read succeeds) audit, sets `source: 'api'`, and uses the API for every mutation. On a failed sites read or an empty site list it keeps the fixture state and `source: 'fixtures'`; a failed experiences read still keeps the API sites; a failed audit read keeps the previous audit. Fixture state is persisted to `localStorage`; API state is not, so a reload re-reads the server.

Write behaviour:

- Every action is async. In API mode the store sends the documented request, merges the returned site or experience detail into state, then refreshes the audit log and the review queue. In fallback mode the existing local workflow runs unchanged, so the fixture demo keeps working offline.
- A failed mutation throws before any state is written. API mode never applies the local workflow optimistically, so a 403/409 cannot leave the fixture demo or the API view half-mutated.
- `requireOpenRevision()` compares the server's `openRevisionNumber` with the revision the editor loaded before a full-snapshot PATCH or lifecycle action. A mismatch raises a stale-revision error instead of overwriting newer work.
- Site saves send the `updatedAt` the editor loaded as an `If-Match` precondition. A `409 STALE_SITE` becomes a recoverable `ThenNowStaleSiteError`; the site editor opens a conflict dialog that offers **Reload latest** (re-reads the server copy and discards the local form) or Cancel (keep editing). The error carries the current server site, so the dialog can show how recently it changed.
- Unassign reviewer, cancel schedule, and reopening an approved revision to draft are wired to the Go endpoints. Reopening an approval requires review permission and a reason; the reason lands in the audit.
- `unpublish`, `archive`, and `revoke` send the dialog reason to the API. The Go audit event stores it under `metadata.reason`, so the success toast can say it was recorded.
- `thenNowErrorMessage()` maps `403`, `409`, `NOT_READY`, `FROZEN`, `SEPARATION`, `SECOND_REVIEWER`, `RESTRICTED`, `NOT_FOUND`, and `UNAUTHORIZED` to operator-facing copy. `NOT_READY` lists up to four readiness blockers from the server payload.
- The editors show loading skeletons while the first API read settles and surface mutation failures as toasts without closing the dialog.
- Review queue rows carry `revisionId` (not the experience id) and link to `/then-now/review/$revisionId`; the detail page loads through `getReview`. The queue and detail page have their own loading, empty, and retry states.

Known gaps and deliberate limits in the Go contract:

- **Media:** R2 presign/complete and object-key storage remain out of scope. `VideoUploadDialog` still records metadata only; a simulated upload writes the local filename into `videoMaster`, which is a placeholder, not a valid R2 key. API-loaded experiences keep `renditionKeys`, `posterKey`, `captionKeys`, and `transcriptKey` through a save, and readiness now checks those keys when they are present, matching the Go gate. A locally "uploaded" file without real keys will therefore stay blocked at submit — that is intentional.
- **Site publish body:** `publishSite` saves pending edits with a PATCH first, then calls `/publish`; the Go publish endpoint takes no body.
- **Publish order:** publish the experience first, then the site. The Go site readiness gate requires a published experience.
- **Site concurrency:** the precondition covers site PATCH. Experience edits use the open-revision check, and there is no If-Match on the experience PATCH itself.

The experience editor loads `GET /experiences/{id}` on mount before allowing edits. The list read only returns a summary, and saving that summary back would replace the real snapshot with blanks.

## Verification ownership (#293)

#293 owns the integrated Playwright/Maestro gate. This slice adds unit/mapping/build coverage only; it does not add or expand e2e specs.

What #293 needs:

- **Seed:** run the Go seed (`DATABASE_URL=... go run ./cmd/seed-then-now`) so the four sites exist with UUID ids, then set `VITE_API_BASE_URL` to the Go server. Sites: Nairobi Railway Museum, Nairobi War Cemetery, African Heritage House, Nabongo Cultural Centre.
- **Auth:** log in as `grace@example.com` (administrator) so the route context carries a Go-capable token; the existing `loginAs` helper can be reused. Content-editor (`editor@example.com`) write checks cover create/save/submit; administrator checks cover decide/publish.
- **Source selector:** the footer badge reads `Live API` (published status) or `Fixture data` (draft status). Assert it to prove which path ran.
- **Sites list:** heading `Heritage sites`, search label `Search sites`, links named after the four sites, filters by county/access/status, and the Updated column.
- **Site editor:** `/then-now/sites/$siteId` where `$siteId` is the API UUID; tabs by role `Identity`, `Policy`, `Location`, `Experiences`, `Sources`; expect the mapped experience title under Experiences.
- **Create flows:** `/then-now/sites/new` and `/then-now/experiences/new` now await the API. Assert the new UUID appears in the list and the editor URL, not a fixture id.
- **Review queue:** `/then-now/review` links use revision UUIDs from `GET /v1/then-now/review?filter=all`; do not derive the detail URL from the experience id. The detail page shows a skeleton, then the frozen revision; a stale revision id renders the retry state.
- **Write assertions:** after save/submit/approve/publish, assert the status pill and the audit dialog. Approval does not auto-publish; the publish button is a separate step. Sensitive revisions still require the second reviewer before approve.
- **Fallback:** with the API stopped (or pointed at a dead port) the same fixture assertions keep working. For mocked API runs, use `page.route('**/v1/then-now/**')` and return `{ items: [...] }`, `{ site, experiences, readiness }`, or the experience detail payloads; keep ids UUID-shaped so the route params are realistic. Mock mutation responses with the returned detail so the store can merge them.
- **Do not assert:** fixture deep links such as `/then-now/experiences/railway-exp` only exist in fixture mode. In API mode resolve the experience id from the API list or mock the fixture ids.
- **Conflict recovery:** to exercise the site precondition, load a site, save it once in another session (or with a second request), then save the editor again — expect `409 · Version conflict` and **Reload latest**. Mock `409 STALE_SITE` by returning `{ error: { code: 'STALE_SITE', message }, site: {...} }`.
