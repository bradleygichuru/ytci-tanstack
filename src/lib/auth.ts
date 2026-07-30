import { betterAuth } from "better-auth";
import { tanstackStartCookies } from "better-auth/tanstack-start";
import { jwt, admin } from "better-auth/plugins";
import { expo } from "@better-auth/expo";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import * as schema from "#/db/schema/auth";
import { ac, roles } from "#/lib/rbac";

// ──────────────────────── Database ────────────────────────

const pool = new Pool({
  connectionString: process.env.DATABASE_URL!,
})

export const db = drizzle(pool)

// ──────────────────────── Auth Instance ────────────────────────

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    schema,
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
    "ytci://",
    "http://192.168.100.15:3000",
    "http://192.168.100.15:8081",
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
