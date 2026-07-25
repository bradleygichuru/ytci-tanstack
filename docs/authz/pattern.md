# Admin Authorization Pattern

Decided by ticket: [#6 — Admin authorization pattern — route gates vs server-fn guards](https://github.com/bradleygichuru/ytci-tanstack/issues/6).  
Inputs: better-auth session model, TanStack Router auth-and-guards skill, TanStack Start middleware skill, RBAC taxonomy at `docs/rbac/taxonomy.md`.

---

## Architecture

Dual-layer authorization — defense in depth:

```
Browser request
    │
    ▼
┌────────────────────────┐
│  Route `beforeLoad`    │  ← UX gate: redirects to /login or /no-access
│  (per-area, typed)     │     Runs on every page navigation.
│  Throws redirect()     │     Prevents flash of protected content.
└────────┬───────────────┘
         │ passes
         ▼
┌────────────────────────┐
│  Server-fn middleware   │  ← Security guard: throws 403
│  (authMiddleware)       │     Runs on every RPC call.
│  Throws forbidden error│     Protects data even if route gate is missed.
└────────┬───────────────┘
         │ passes
         ▼
┌────────────────────────┐
│  Handler code          │  ← No auth check needed. Contract: already authed.
└────────────────────────┘
```

### Failure paths

| Layer | Missing session | Insufficient permission |
|---|---|---|
| Route `beforeLoad` | `throw redirect({ to: '/login', search: { redirect } })` | `throw redirect({ to: '/no-access' })` |
| Server-fn middleware | `throw new Error('Unauthorized')` → HTTP 401 | `throw new Error('Forbidden')` → HTTP 403 |

---

## Session in router context

The root route (`__root.tsx`) fetches the better-auth session from the server once and passes it down. All children inherit it typed.

```tsx
// src/routes/__root.tsx
import { createRootRouteWithContext } from '@tanstack/react-router'
import type { Session, User } from 'better-auth'

interface MyRouterContext {
  queryClient: QueryClient
  user: { session: Session; user: User } | null  // added by beforeLoad
}

export const Route = createRootRouteWithContext<MyRouterContext>()({
  beforeLoad: async ({ context }) => {
    // Session is fetched once at the root — children inherit it
    const { headers } = context  // headers are injected by TanStack Start
    const session = await auth.api.getSession({ headers })
    return { user: session }
  },
  // ...existing shellComponent, head, etc.
})
```

The session is `null` for unauthenticated users. This is a server-side fetch — it reads the cookie from the request headers. On the client, the hydration pass carries the session value.

**Important**: the `beforeLoad` never redirects at root — root is also the home/public page. Redirects happen in `_authenticated.tsx` and area-specific guards.

---

## Default-private perimeter: `_authenticated.tsx`

A pathless layout route at `src/routes/_authenticated.tsx` gates authentication. All 9 area routes live as its children. A new file routed under `_authenticated/` inherits the gate automatically — no way to forget.

```tsx
// src/routes/_authenticated.tsx
import { createFileRoute, redirect, isRedirect } from '@tanstack/react-router'

export const Route = createFileRoute('/_authenticated')({
  beforeLoad: async ({ context, location }) => {
    if (!context.user) {
      throw redirect({
        to: '/login',
        search: { redirect: location.href },
      })
    }
  },
})
```

**Area routes** live under `src/routes/_authenticated/`:

```
src/routes/
  _authenticated.tsx              ← auth gate
  _authenticated/
    analytics.tsx                  ← T12
    destinations.tsx               ← T13
    media.tsx                      ← T14
    lms.tsx                        ← T15
    conservation.tsx               ← T16
    events.tsx                     ← T17
    ai-config.tsx                  ← T18
    campaigns.tsx                  ← T19
    users.tsx                      ← T20
```

Public routes live outside `_authenticated/`:

```
src/routes/
  index.tsx                        ← home/landing (public)
  login.tsx                        ← T9
  forgot-password.tsx              ← T9
  reset-password.tsx               ← T9
  no-access.tsx                    ← insufficient-permission page (T8)
```

---

## `requirePermission()` helper

Lives at `src/lib/authz.ts`. Single call site for all authorization logic — used by both route guards and server-fn middleware.

### Signature

```ts
function requirePermission(
  session: { user: { role: string } } | null,
  resource: ResourceKey,
  actions: Action[],
): asserts session is { user: { role: string } }
```

Where `ResourceKey` and `Action` are the typed enums from the RBAC taxonomy (`docs/rbac/taxonomy.md`):

```ts
type ResourceKey = 'analytics' | 'destinations' | 'media' | 'lms'
  | 'conservation' | 'events' | 'aiConfig' | 'campaigns' | 'users'
type Action = 'read' | 'create' | 'edit' | 'delete' | 'publish'
```

### Behaviour

1. If `session` is null → throw (caller-specific — route guard throws `redirect('/login')`, server-fn middleware throws `Unauthorized`).
2. Read `session.user.role` — look up the `Role` object from the roles map defined alongside `createAccessControl` in `src/lib/auth.ts`.
3. Call `role.authorize({ [resource]: actions })`.
4. If `authorize` returns `{ success: false }` → throw (caller-specific — route guard throws `redirect('/no-access')`, server-fn middleware throws `Forbidden`).
5. Returns void on success. Also narrows the type: after the call, `session` is asserted non-null.

### Stub

```ts
// src/lib/authz.ts — STUB ONLY. Convention is the artifact.
// The implementation lands in T10 (#11 Better Auth server config) and the area builds.
// This stub exists to establish the contract that every area route and server-fn calls.

import type { Role } from 'better-auth/plugins/access'

type ResourceKey = 'analytics' | 'destinations' | 'media' | 'lms'
  | 'conservation' | 'events' | 'aiConfig' | 'campaigns' | 'users'
type Action = 'read' | 'create' | 'edit' | 'delete' | 'publish'

interface AuthSession {
  user: { role: string }
}

// The roles map is populated by T10 with createAccessControl from better-auth's access plugin.
// It lives in src/lib/auth.ts and is imported here.
let roles: Record<string, Role> = {}

export function setRoles(r: Record<string, Role>) {
  roles = r
}

export function requirePermission(
  session: AuthSession | null,
  resource: ResourceKey,
  actions: Action[],
): asserts session is AuthSession {
  if (!session) {
    throw new Error('Unauthorized')
  }
  const role = roles[session.user.role]
  if (!role) {
    throw new Error('Forbidden')
  }
  const result = role.authorize({ [resource]: actions })
  if (!result.success) {
    throw new Error('Forbidden')
  }
}
```

### Usage in a route `beforeLoad`

```tsx
import { createFileRoute, redirect } from '@tanstack/react-router'
import { requirePermission } from '../../lib/authz'

export const Route = createFileRoute('/_authenticated/destinations')({
  beforeLoad: ({ context }) => {
    try {
      requirePermission(context.user, 'destinations', ['read'])
    } catch {
      throw redirect({ to: '/no-access' })
    }
  },
  component: DestinationsComponent,
})
```

### Usage in a server-fn `middleware`

```tsx
import { createServerFn } from '@tanstack/react-start'
import { authMiddleware } from '~/server/auth-middleware'  // provided by T10

const guardDestinationsRead = authMiddleware({
  beforeExecute: async ({ context }) => {
    requirePermission(context.session, 'destinations', ['read'])
  },
})

const getDestinations = createServerFn({ method: 'GET' })
  .middleware([guardDestinationsRead])
  .handler(async ({ context }) => {
    return db.destinations.findMany()  // no auth check needed — contract is enforced
  })
```

### Usage in a component (UI-only, not a gate)

```tsx
import { requirePermission } from '../../lib/authz'

function DestinationsPage() {
  const { user } = Route.useRouteContext()
  const canCreate = useMemo(() => {
    try { requirePermission(user, 'destinations', ['create']); return true }
    catch { return false }
  }, [user])

  return (
    <div>
      {canCreate && <CreateDestinationButton />}
    </div>
  )
}
```

Note: `try/catch` is acceptable for permission checks in rendering code — it's a UI-level toggle, not a security gate. The actual gate is in `beforeLoad` and the server-fn middleware.

---

## Resource keys in the auth context

The router context is extended from the root `MyRouterContext` so that all protected routes have typed access:

```ts
// Augmented in __root.tsx
export type MyRouterContext = {
  queryClient: QueryClient
  user: { session: Session; user: User } | null
}
```

Consumed in routes:

```tsx
const Route = createFileRoute('/_authenticated/destinations')({
  beforeLoad: ({ context }) => {
    // context.user is typed as `{ session: Session; user: User } | null`
    // null when not authenticated
  },
})
```

---

## Cross-references

- RBAC role taxonomy: `docs/rbac/taxonomy.md` — role enum, permission verbs, permission × area matrix
- Better Auth server config: T10 (#11) — wires the actual roles map + session fetching
- Dashboard shell: T8 (#9) — creates `_authenticated.tsx` layout route + `/no-access` page
- Area builds (T12–T20) — each implements its `beforeLoad` against this convention
