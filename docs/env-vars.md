# Environment Variables

This document lives at `docs/env-vars.md` and is the canonical reference for environment variables used by this project.

## Current variables

| Variable | Dev value location | Prod source | Owner ticket |
|---|---|---|---|
| `BETTER_AUTH_URL` | `.env.local` | production env (process manager) | scaffold |
| `BETTER_AUTH_SECRET` | `.env.local` | secret manager | #4 |
| `DATABASE_URL` | `.env.local` | production env (process manager) | #3 |

Variables are auto-loaded by Vite for `bun run dev` (reads `.env.local`). Standalone scripts (e.g. `scripts/db-smoke.ts`) use `bun --env-file=.env.local`.

A committed template with placeholders lives at `.env.local.example`.

## Where secrets live in dev

- All local env vars go in `.env.local` (repo root), which is gitignored by the `.gitignore` `*.local` rule.
- Vite automatically loads `.env.local` for `bun run dev` — no explicit load call needed.
- For standalone scripts that run outside Vite, pass the file explicitly: `bun --env-file=.env.local run scripts/<name>.ts` (see the `db:smoke` npm script).
- Template for new contributors: `.env.local.example` (committed, never contains real secrets). Copy it as `.env.local` and fill in the values.

## Where secrets live in production

This project deploys as a Node/Bun long-running process. It reads env vars from `process.env`, which are injected by whatever runs the process. Options include:

- **Process manager env config** — systemd `EnvironmentFile=`, Docker `--env-file`, pm2 ecosystem config, supervisord environment directives.
- **Railway / Render / Fly** — built-in environment variable config panels. No file needed.
- **Dedicated secret managers** (recommended for production):
  - AWS Secrets Manager or SSM Parameter Store
  - Google Secret Manager
  - HashiCorp Vault
  - Doppler
  - Infisical

Bun also supports `bunfig.toml` with an `[env]` block, but this is **not recommended for secrets** — the file is often checked into version control. Use a real secret manager instead.

**Which to pick?** This project doesn't mandate one — the deployment target (Railway, VPS, etc.) typically determines the available option. Deploy by deploy, the operator chooses the mechanism that matches their infrastructure.

## Rotation policy for `BETTER_AUTH_SECRET`

`BETTER_AUTH_SECRET` is the signing key for Better Auth sessions. Rotating it **invalidates every existing session immediately** — all users are logged out and must re-authenticate.

### How to rotate

1. Generate a new secret: `bunx @better-auth/cli secret`
2. Replace the value in your env source (`.env.local` for dev, the secret manager / config file for production).
3. Restart the Node/Bun process.
4. (Dev only) Verify: existing sessions fail; new login works.

### Schedule

- **No mandated schedule** — rotate per your org's security policy.
- **Rotate on suspicion**: if the secret is exposed (e.g. committed by accident, leaked in logs), rotate immediately.
- **Dev rotations are harmless** — as long as you're logged in with a session, you'll be logged out and need to re-authenticate. No real users affected.

## Rule: commits must never contain `.env` or `.local` env files

- `.gitignore` covers `.env` (exact match) and `*.local` (every file ending in `.local`).
- Any new env file added to the repo root must:
  - Be named such that it's covered by an existing `.gitignore` pattern, **or**
  - Be explicitly added to `.gitignore` before the commit.
- The committed twin for each env file is always `<name>.example` (e.g. `.env.local.example`). That file contains only placeholder values.

### Adding a new env var

1. Add the key-value pair to `.env.local` with your real dev value.
2. Add the same key with a `CHANGE_ME` placeholder to `.env.local.example`.
3. (Optional) Add a row to the table in this document.
