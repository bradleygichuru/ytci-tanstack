import { Pool } from 'pg'
import { drizzle } from 'drizzle-orm/node-postgres'

// The admin portal authenticates against the platform database, while the
// catalog lives in the program database. They can be the same Postgres, but
// keeping the connection explicit lets curation tooling run against the
// catalog without mixing it into the auth pool.
const connectionString = process.env.CATALOG_DATABASE_URL ?? process.env.DATABASE_URL!

if (!connectionString) {
  throw new Error('CATALOG_DATABASE_URL or DATABASE_URL must be set')
}

const pool = new Pool({
  connectionString,
  ssl: connectionString.includes('neon.tech') ? { rejectUnauthorized: false } : undefined,
  max: 1,
  connectionTimeoutMillis: 15000,
})

export const catalogDb = drizzle(pool)
