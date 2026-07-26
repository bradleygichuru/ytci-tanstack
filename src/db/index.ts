import { Pool } from "pg"
import { drizzle } from "drizzle-orm/node-postgres"
import * as authSchema from "#/db/schema/auth"
import * as adminSchema from "#/db/schema/admin"

const pool = new Pool({
  connectionString: process.env.DATABASE_URL!,
})

const schema = { ...authSchema, ...adminSchema }

export const db = drizzle(pool, { schema })
