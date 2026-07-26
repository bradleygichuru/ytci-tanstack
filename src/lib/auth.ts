import { betterAuth } from "better-auth";
import { tanstackStartCookies } from "better-auth/tanstack-start";
import { jwt, admin } from "better-auth/plugins";
import { createAccessControl } from "better-auth/plugins/access";
import { expo } from "@better-auth/expo";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";

// ──────────────────────── RBAC ────────────────────────

export const ac = createAccessControl({
  analytics: ["read", "create", "edit", "delete", "publish"],
  destinations: ["read", "create", "edit", "delete", "publish"],
  media: ["read", "create", "edit", "delete", "publish"],
  lms: ["read", "create", "edit", "delete", "publish"],
  conservation: ["read", "create", "edit", "delete", "publish"],
  events: ["read", "create", "edit", "delete", "publish"],
  aiConfig: ["read", "create", "edit", "delete", "publish"],
  campaigns: ["read", "create", "edit", "delete", "publish"],
  users: ["read", "create", "edit", "delete", "publish", "assign-role", "suspend-user"],
});

export const roles = {
  super_admin: ac.newRole({
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

// ──────────────────────── Database ────────────────────────

const pool = new Pool({
  connectionString: process.env.DATABASE_URL!,
})

const db = drizzle(pool)

// ──────────────────────── Auth Instance ────────────────────────

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "pg",
    usePlural: true,
  }),
  emailAndPassword: {
    enabled: true,
  },
  trustedOrigins: [
    "http://localhost:3000",
    "http://localhost:8081",
    "exp://",
    "myapp://",
  ],
  plugins: [
    jwt({
      jwks: {
        keyPairConfig: {
          alg: "RS256",
        },
      },
    }),
    admin({
      defaultRole: "moderator",
      adminRoles: ["super_admin", "administrator"],
      roles,
      ac,
    }),
    expo(),
    tanstackStartCookies(),
  ],
})
