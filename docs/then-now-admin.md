# Then & Now admin (v1)

The Then & Now admin area lives at `/then-now` in the TanStack admin. It is built against local fixtures until the Go API slice lands. The approved interaction reference is the throwaway prototype on `prototype/then-now-admin` in `ytci-tanstack`; the workflow contract is [Then & Now — Admin Authoring, Review, and Publishing Workflow](https://github.com/bradleygichuru/ytci-mobile/blob/docs/then-now-admin-workflow/docs/specs/then-now-admin-workflow.md).

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

## Backend wiring

Replace the fixture store actions with the Go API when the schema/API ticket lands. Keep the same readiness contract (server-computed blocking vs warning items), reviewer ≠ uploader, sensitive second reviewer, atomic revision promotion, EAT scheduling, and append-only audit. Real media goes through the dedicated R2 presigned uploader; do not route AR assets through the generic Media Library.
