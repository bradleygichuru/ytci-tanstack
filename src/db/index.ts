import { Pool } from "pg"
import { drizzle } from "drizzle-orm/node-postgres"
import * as authSchema from "#/db/schema/auth"
import * as adminSchema from "#/db/schema/admin"
import * as businessSchema from "#/db/schema/business"

const pool = new Pool({
  connectionString: process.env.DATABASE_URL!,
  ssl: process.env.DATABASE_URL!.includes('neon.tech') ? { rejectUnauthorized: false } : undefined,
  max: 1,
  connectionTimeoutMillis: 15000,
})

const schema = { ...authSchema, ...adminSchema, ...businessSchema }

export const db = drizzle(pool, { schema })
