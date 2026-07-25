# Bootstrap Super-Admin

Decided by ticket: [#7 — Admin bootstrap — first super-admin creation](https://github.com/bradleygichuru/ytci-tanstack/issues/7).  
Inputs: RBAC taxonomy at `docs/rbac/taxonomy.md`, better-auth `admin` plugin.

---

## When to run

**First cold-start only.** On a fresh database (no `super_admin` role in the `user` table yet), you need to create the first super-admin so you can sign into the admin portal.

## Pre-requisites

- Postgres is running and reachable (see "Database" in README).
- Schema is migrated (T11 — `bun run db:migrate` or the better-auth equivalent).
- `.env.local` has `DATABASE_URL` pointing to the local Postgres.
- Better Auth is fully configured (T10 — `src/lib/auth.ts` has the `admin` and `access` plugins wired).

## Command

```bash
bun run bootstrap:admin
```

This uses `bun --env-file=.env.local` to load env vars, then runs `scripts/bootstrap-admin.ts`.

### Flags (for scripting)

```bash
bun run bootstrap:admin -- --email admin@example.com --password "s3cret!" --name "Admin"
```

The `--` separates bun's flags from the script's flags. You can omit any flag and the script will prompt interactively.

## Idempotency

The script checks the `user` table for any existing row with `role = 'super_admin'`. If one exists, **the script aborts with a non-zero exit** and prints the existing super-admin's email. It will NEVER create a second super-admin.

To add more super-admins: sign in as the first one, go to **User Management** (Area 9, T20), and elevate another user to `super_admin`.

## Audit log

Every run prints an ISO-timestamped line to stdout:

- On success: `BOOTSTRAP_SUPER_ADMIN ok <email> <iso-timestamp>`
- On abort (existing): `BOOTSTRAP_SUPER_ADMIN abort existing <existing-email> <iso-timestamp>`
- On error: `BOOTSTRAP_SUPER_ADMIN fail signup <email> <error>`

There is no persistent audit table — the script is one-shot and its output is transient. Better Auth's built-in event infrastructure (if wired in T10) is the durable audit channel.

## What the script does

1. Checks for an existing `super_admin` → aborts if found.
2. Calls `auth.api.signUpEmail` to create a normal user (properly hashed password, account records, etc.).
3. Updates the user's `role` to `super_admin` directly in the `user` table (bypasses the admin plugin's `defaultRole` override which would set it to `user`).
4. Verifies the update and exits 0.

## After bootstrap

- Sign in at the admin portal login screen (`/login`) with the email and password you just created.
- You will have full access to all 9 admin areas.
- Store the credentials — they are irrecoverable if lost (an admin can reset the password from User Management, but with no admin signed in, that's circular).

## Troubleshooting

| Symptom | Likely cause |
|---|---|
| `DATABASE_URL is not set` | Script needs `bun --env-file=.env.local` (the npm script does this automatically). |
| `relation "user" does not exist` | Schema not migrated. Run T11's migration first. |
| `column "role" does not exist` | Admin plugin not wired in `auth.ts`. T10 must complete first. |
| `Failed to create user: email already exists` | User with that email already signed up (e.g. via the app). Remove the user first, or use a different email. |
