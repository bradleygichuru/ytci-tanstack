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

const TABLE = "__smoke";

async function main() {
  console.log(`connecting to ${url.replace(/:[^:@]+@/, ":***@")}`);
  console.log("SELECT 1:", (await db.execute(sql`SELECT 1 AS one`)).rows);

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