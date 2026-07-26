import { drizzle } from "drizzle-orm/node-postgres";
import { sql } from "drizzle-orm";
import { Pool } from "pg";

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("FAIL: DATABASE_URL is not set");
  process.exit(1);
}

const pool = new Pool({ connectionString: url });
const db = drizzle(pool);

const AUTH_TABLES = ["users", "sessions", "accounts", "verifications", "jwkss"];

async function main() {
  console.log(`connecting to ${url.replace(/:[^:@]+@/, ":***@")}`);
  console.log("SELECT 1:", (await db.execute(sql`SELECT 1 AS one`)).rows);

  // Verify better-auth schema tables exist
  console.log();
  console.log("--- checking better-auth tables ---");
  for (const table of AUTH_TABLES) {
    const result = await db.execute(sql.raw(`SELECT count(*)::int AS cnt FROM "${table}"`));
    const cnt = result.rows[0]?.cnt ?? -1;
    if (cnt < 0) throw new Error(`Table "${table}" not found`);
    console.log(`  ${table}: ${cnt} rows`);
  }

  // Generic connectivity smoke
  const TABLE = "__smoke";
  console.log();
  console.log("--- connectivity smoke ---");
  await db.execute(sql.raw(`CREATE TABLE IF NOT EXISTS ${TABLE} (id int PRIMARY KEY)`));
  await db.execute(sql.raw(`DELETE FROM ${TABLE}`));
  await db.execute(sql.raw(`INSERT INTO ${TABLE} (id) VALUES (1)`));
  const row = (await db.execute(sql.raw(`SELECT id FROM ${TABLE}`))).rows;
  if (row[0]?.id !== 1) throw new Error(`expected id=1, got ${JSON.stringify(row)}`);
  await db.execute(sql.raw(`DROP TABLE ${TABLE}`));
  console.log("smoke ok: insert/read/drop passed");
}

main()
  .then(() => pool.end())
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("FAIL:", err);
    pool
      .end()
      .finally(() => process.exit(1));
  });
