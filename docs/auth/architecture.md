# Auth Architecture

Decided by ticket: [#11 — Better Auth server config + plugin wiring](https://github.com/bradleygichuru/ytci-tanstack/issues/11).  
Dependencies: #3 (DB), #4 (env vars), #5 (RBAC taxonomy), #6 (authz pattern).

---

## Auth instance

Lives at `src/lib/auth.ts`. Configures a `betterAuth` instance with:

- **Database**: PostgreSQL via Drizzle adapter
- **Authentication**: email/password only (OAuth deferred)
- **Plugins**: JWT → Admin + RBAC → Expo → tanstackStartCookies

## Plugins (in order)

### 1. `jwt()` — JWT token issuance

Configures the JWT plugin with **RS256** (RSA-SHA256) signing. The Go backend verifies these tokens via JWKS at `/api/auth/jwks` — an endpoint automatically published by the JWT plugin and mounted via the existing `$.ts` catch-all route.

```ts
jwt({
  jwks: {
    keyPairConfig: { alg: "RS256" },
  },
})
```

**No explicit JWKS endpoint declaration needed.** The JWT plugin registers its own route prefix on the better-auth handler, which is mounted at `/api/auth/*` via `src/routes/api/auth/$.ts`.

### 2. `admin()` — RBAC + user management

Provides:
- `role` string field on the `user` table
- `banned`, `banReason`, `banExpires` fields on `user`
- `impersonatedBy` field on `session`
- Admin API endpoints (`setRole`, `listUsers`, `createUser`, `banUser`, etc.)

```ts
admin({
  defaultRole: "moderator",     // role assigned to new users if not specified
  adminRoles: ["super_admin", "administrator"],  // roles considered admin
  roles,                        // from createAccessControl
  ac,                           // the access control instance
})
```

**defaultRole**: new users who sign up via the sign-up endpoint get `moderator`. The bootstrap script (#7) overrides this by creating a user and then updating the role to `super_admin` via a direct DB write (bypassing the admin plugin's database hook).

**adminRoles**: users with either `super_admin` or `administrator` role can access admin API endpoints (setRole, listUsers, etc.). The actual area-level permissions are gated by the `ac` (access control) object, not by `adminRoles` — the `adminRoles` option controls access to the admin's meta-endpoints (like `setRole` and `impersonateUser`).

### 3. `expo()` — Expo deep-linking support

Handles the `myapp://` authorization callback scheme for the Expo mobile client. Registers `trustedOrigins` for the Expo scheme and provides the `/expo-authorization-proxy` endpoint.

The Expo client (`@better-auth/expo/client` in the Expo repo) points to this server's URL as its `baseURL`.

### 4. `tanstackStartCookies()` — SSR cookie handling

**Must be the last plugin in the array.** Handles setting/clearing session cookies when better-auth server functions are called from TanStack Start's SSR context. Without it, cookies set by better-auth on the server side wouldn't be forwarded to the client in SSR responses.

## Session cookies

| Property | Dev value | Prod value | Rationale |
|---|---|---|---|
| `HttpOnly` | `true` | `true` | Prevents XSS access to the session token |
| `Secure` | `false` | `true` | Off in dev (localhost is HTTP); on in prod (HTTPS) |
| `SameSite` | `Lax` | `Lax` | Allows same-origin navigation; blocks cross-site CSRF |

Session cookies are only used by the **admin web app** (same-origin). The Expo mobile app uses the JWT token directly (stored in `expo-secure-store`), not cookies.

Secure is controlled by env: in dev, `process.env.NODE_ENV !== 'production'` is used to set it to `false`.

## CORS

Controlled via the `trustedOrigins` option:

```ts
trustedOrigins: [
  "http://localhost:3000",   // admin dev origin
  "http://localhost:8081",   // Expo dev server
  "exp://",                   // Expo Go scheme
  "myapp://",                 // Production Expo app scheme
]
```

Explicit origins only — no wildcards. The Expo plugin automatically registers these for its endpoints.

## Database

Uses `drizzleAdapter` with `pg` provider:

```ts
import { Pool } from "pg"
import { drizzle } from "drizzle-orm/node-postgres"

const pool = new Pool({
  connectionString: process.env.DATABASE_URL!,
})
const db = drizzle(pool)

database: drizzleAdapter(db, {
  provider: "pg",
  usePlural: true,
})
```

The `usePlural: true` setting matches the table naming convention used by the better-auth schema generator (`users`, `sessions`, `accounts`, etc.).

## Auth client

Lives at `src/lib/auth-client.ts`. No changes from scaffold:

```ts
import { createAuthClient } from "better-auth/react"
export const authClient = createAuthClient()
```

The client auto-resolves to the same origin for API calls. The admin plugin's client methods (`authClient.admin.setRole`, etc.) are available automatically.

## Authz helper

Lives at `src/lib/authz.ts`. The `requirePermission` helper:

```ts
function requirePermission(
  session: AuthSession | null,
  resource: ResourceKey,
  actions: Action[],
): asserts session is AuthSession
```

Imports the `roles` map from `auth.ts` and calls `role.authorize()` from the access plugin. Used by both route `beforeLoad` guards (throw redirect) and server-fn middleware (throw 401/403). See `docs/authz/pattern.md` for usage.

## OAuth providers

Deferred — no Google/Apple OAuth in this map. When added, the OAuth plugin will be mounted in the same `plugins` array, the callback URL will be added to `trustedOrigins`, and the Expo plugin will handle the deep-link redirect.

## Deployment considerations

- The JWKS endpoint at `/api/auth/jwks` must be publicly reachable for Go backend token verification.
- In production, ensure `BETTER_AUTH_URL` is set to the deployed domain (e.g. `https://admin.yourdomain.com`).
- The `BETTER_AUTH_SECRET` must be rotated via a secret manager, not a `.env` file in the repository.
- Session cookies will be `Secure` in production — the deployment must serve HTTPS.
