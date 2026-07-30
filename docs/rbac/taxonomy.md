# RBAC Role Taxonomy

Decided by ticket: [#5 — RBAC role taxonomy for the admin portal](https://github.com/bradleygichuru/ytci-tanstack/issues/5).  
Inputs: spec §2 user types, §10.2 admin-function verbs, extracted role hints at `docs/spec/ytci-extract.md#5-role-hints`.

---

## Roles

| Role | Permanent | Rationale |
|---|---|---|
| `super-admin` | yes | Bootstrap-only initiator that holds the separable power of role assignment and user suspension (§10.2 "Users and roles"). Lives alongside Administrator indefinitely. First one created by T6 (Admin bootstrap). |
| `administrator` | yes | Full operational access to all 9 admin areas per spec §2: "Manage users, destinations, modules, campaigns, analytics and system settings". |
| `moderator` | yes | Spec §2: "Review stories, images, videos, comments and reported content". Limited to the Media Library & UGC Moderation area plus read-only Analytics. |
| `county_officer` | yes | Spec §2: "Submit and update destination information and media". Limited to create/edit on Destinations CMS and upload on Media Library. No publish authority. |

### Can `administrator` change roles?

**Deferred to T10** ([#11 — Better Auth server config + plugin wiring](https://github.com/bradleygichuru/ytci-tanstack/issues/11)).  
Option A: only `super-admin` can assign roles / suspend users (pure separation).  
Option B: `administrator` can also assign roles, making `super-admin` purely a bootstrap marker.

The matrix below assumes **Option A** (pure separation). T10 resolves it.

---

## Permission verbs

`read`, `create`, `edit`, `delete`, `publish`

Mapped from spec language:
- **read** = view, browse
- **create** = add, upload, submit, import
- **edit** = update, modify, tag, caption, crop, schedule, verify
- **delete** = remove, archive (soft-delete)
- **publish** = approve, verify-then-live, set status to published, manage-status-to-published

---

## Permission × area matrix

| Area | `super-admin` | `administrator` | `moderator` | `county_officer` |
|---|---|---|---|---|
| 1. Analytics & Metrics Dashboard | read, create, edit, delete, publish | read, create, edit, delete, publish | read | — |
| 2. Destination CMS | read, create, edit, delete, publish | read, create, edit, delete, publish | — | read, create, edit |
| 3. Media Library & UGC Moderation | read, create, edit, delete, publish | read, create, edit, delete, publish | read, edit, delete, publish | read, create |
| 4. Learning Hub (LMS) & Course Builder | read, create, edit, delete, publish | read, create, edit, delete, publish | — | — |
| 5. Conservation Tracker Admin | read, create, edit, delete, publish | read, create, edit, delete, publish | — | — |
| 6. Events Calendar Admin | read, create, edit, delete, publish | read, create, edit, delete, publish | — | — |
| 7. AI Engine Configuration & Guardrails | read, create, edit, delete, publish | read, create, edit, delete, publish | — | — |
| 8. Campaigns | read, create, edit, delete, publish | read, create, edit, delete, publish | — | — |
| 9. User Management & Security† | read, create, edit, delete, publish + `assign-role` + `suspend-user` | read, create, edit, delete, publish | — | — |

† `assign-role` and `suspend-user` are `super-admin`-only custom actions, not part of the shared 5‑verb set.

### Notes

- **county_officer on Media Library**: `create` only (upload media for their destinations). It is a UX question whether this upload flow lives in the Media Library area directly or inside the Destination CMS area; the area-build ticket T13 ([#14 — Destination CMS](https://github.com/bradleygichuru/ytci-tanstack/issues/14)) decides and the authz model accommodates both (the permission grants access regardless of which page triggers the upload).
- **Moderator publish on Media Library**: "publish" = "approve" in the UGC workflow. Moderators approve stories, photos, and reels. They do not create UGC themselves (that's the mobile app's job).

---

## Storage convention

**Role string on user table; permission statements in TypeScript code.**

Leverages the installed `admin` and `access` plugins in `better-auth`:

- The `admin` plugin adds a `role` (string) field to the `user` table, plus `banned`, `banReason`, `banExpires`, and `impersonatedBy` on session.
- The `access` plugin (`createAccessControl`) defines roles as **in-memory statement maps**: `{ [resource]: [...actions] }`.
- Authorization flow: read the user's `role` string from the DB → look up the `Role` object from the code-defined roles map → call `role.authorize({ [resource]: [requested-actions] })`.
- **No permission or role join tables.** The DB stores only the label; the permission logic is in TypeScript and ships with the app.

### Code sketch (for T10 to implement in `src/lib/auth.ts`)

```ts
import { createAccessControl } from "better-auth/plugins/access"

const ac = createAccessControl({
  analytics: ["read", "create", "edit", "delete", "publish"],
  destinations: ["read", "create", "edit", "delete", "publish"],
  media: ["read", "create", "edit", "delete", "publish"],
  lms: ["read", "create", "edit", "delete", "publish"],
  conservation: ["read", "create", "edit", "delete", "publish"],
  events: ["read", "create", "edit", "delete", "publish"],
  aiConfig: ["read", "create", "edit", "delete", "publish"],
  campaigns: ["read", "create", "edit", "delete", "publish"],
  users: ["read", "create", "edit", "delete", "publish", "assign-role", "suspend-user"],
})

const roles = {
  superAdmin: ac.newRole({
    analytics: ["read", "create", "edit", "delete", "publish"],
    destinations: ["read", "create", "edit", "delete", "publish"],
    media: ["read", "create", "edit", "delete", "publish"],
    lms: ["read", "create", "edit", "delete", "publish"],
    conservation: ["read", "create", "edit", "delete", "publish"],
    events: ["read", "create", "edit", "delete", "publish"],
    aiConfig: ["read", "create", "edit", "delete", "publish"],
    campaigns: ["read", "create", "edit", "delete", "publish"],
    users: ["read", "create", "edit", "delete", "publish", "assign-role", "suspend-user"],
  }),
  administrator: ac.newRole({
    analytics: ["read", "create", "edit", "delete", "publish"],
    destinations: ["read", "create", "edit", "delete", "publish"],
    media: ["read", "create", "edit", "delete", "publish"],
    lms: ["read", "create", "edit", "delete", "publish"],
    conservation: ["read", "create", "edit", "delete", "publish"],
    events: ["read", "create", "edit", "delete", "publish"],
    aiConfig: ["read", "create", "edit", "delete", "publish"],
    campaigns: ["read", "create", "edit", "delete", "publish"],
    users: ["read", "create", "edit", "delete", "publish"],
  }),
  moderator: ac.newRole({
    analytics: ["read"],
    media: ["read", "edit", "delete", "publish"],
  }),
  county_officer: ac.newRole({
    destinations: ["read", "create", "edit"],
    media: ["read", "create"],
  }),
}
```

---

## Role name in the DB

The `role` field on the `user` table stores one of:

| DB value (string) | Pretty name |
|---|---|---|
| `super_admin` | Super Admin |
| `administrator` | Administrator |
| `moderator` | Moderator |
| `county_officer` | County Content Officer |
| `user` | End User |

Note: snake_case for `super_admin` in the DB (the `administrator` and `moderator` strings are already DB-friendly; `county_officer` and `user` use underscore convention).
