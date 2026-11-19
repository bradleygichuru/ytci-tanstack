#!/usr/bin/env node
/**
 * Schema parity: frozen Go execution contracts vs TanStack Drizzle production.
 *
 * The frozen schema gate lives in ytci-go/testdata/migrations (ticket #359,
 * PR #41). A byte-for-byte copy is vendored in src/db/contracts/go so this
 * check is self-contained in CI.
 *
 * The script builds two scratch databases on the same Postgres/PostGIS server:
 *
 *   go       - every Drizzle migration before the contract mirrors, then the
 *              five vendored Go migrations, applied as the reference schema.
 *   drizzle  - the complete Drizzle migration journal, as production runs it.
 *
 * It then compares tables, columns, constraints, indexes and triggers for the
 * contract surface only (the tables created by the frozen migrations, the
 * columns/constraints/indexes those migrations add to `events`, and
 * `users_role_check`). Divergence prints a diff and exits 1.
 *
 * Pre-existing drift outside the frozen contract (for example the text/uuid
 * user-id split between the two codebases) is deliberately out of scope; see
 * ytci-go/docs/execution/contracts.md.
 *
 * Usage:
 *   DATABASE_URL=postgres://user:pass@host:5432/postgres node scripts/schema-parity.mjs
 *   node scripts/schema-parity.mjs --keep   # keep scratch DBs for inspection
 *
 * The connection URL must point at a database the role can create databases
 * from (normally `postgres`). PostGIS is installed by migration 0000.
 */

import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import pg from 'pg'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const migrationsDir = path.join(root, 'src/db/migrations')
const contractsDir = path.join(root, 'src/db/contracts/go')

const MIRRORED_TAGS = [
  '0028_mice_event_contracts',
  '0029_recognition_contracts',
  '0030_species_contracts',
  '0031_analytics_contracts',
  '0032_platform_contracts',
]

const GO_FILES = [
  '0017_mice_event_contracts.sql',
  '0030_recognition_contracts.sql',
  '0043_species_contracts.sql',
  '0056_analytics_contracts.sql',
  '0069_platform_contracts.sql',
]

const keep = process.argv.includes('--keep')
const suffix = `${process.pid}_${Date.now()}`
const goDb = `schema_parity_go_${suffix}`
const drizzleDb = `schema_parity_drizzle_${suffix}`

function usage(message) {
  console.error(`schema-parity: ${message}`)
  process.exit(2)
}

function withDatabase(url, database) {
  const parsed = new URL(url)
  parsed.pathname = `/${database}`
  return parsed.toString()
}

async function applyFile(client, file) {
  const sql = await readFile(file, 'utf8')
  if (!sql.trim()) return
  try {
    await client.query(sql)
  } catch (error) {
    console.error(`\nFailed to apply ${path.relative(root, file)}`)
    console.error(error.message)
    throw error
  }
}

async function applyGoContract(client, baselineTags) {
  for (const tag of baselineTags) {
    await applyFile(client, path.join(migrationsDir, `${tag}.sql`))
  }
  for (const file of GO_FILES) {
    await applyFile(client, path.join(contractsDir, file))
  }
}

async function readText(file) {
  return readFile(file, 'utf8')
}

/** Discover the comparison surface from the vendored Go migrations. */
async function contractScope() {
  const tables = new Set()
  const eventColumns = new Set()
  const eventConstraints = new Set()
  const eventIndexes = new Set()

  for (const file of GO_FILES) {
    const sql = await readText(path.join(contractsDir, file))

    for (const match of sql.matchAll(
      /CREATE TABLE IF NOT EXISTS\s+([a-z_][a-z0-9_]*(?:\.[a-z_][a-z0-9_]*)?)/gi,
    )) {
      const name = match[1].toLowerCase()
      tables.add(name.includes('.') ? name : `public.${name}`)
    }

    for (const match of sql.matchAll(
      /ALTER TABLE\s+events\s+ADD COLUMN IF NOT EXISTS\s+([a-z_][a-z0-9_]*)/gi,
    )) {
      eventColumns.add(match[1].toLowerCase())
    }

    for (const match of sql.matchAll(
      /ALTER TABLE\s+events\s+ADD CONSTRAINT\s+([a-z_][a-z0-9_]*)/gi,
    )) {
      eventConstraints.add(match[1].toLowerCase())
    }

    for (const match of sql.matchAll(
      /CREATE (?:UNIQUE )?INDEX IF NOT EXISTS\s+([a-z_][a-z0-9_]*)\s+ON\s+events/gi,
    )) {
      eventIndexes.add(match[1].toLowerCase())
    }
  }

  return {
    tables,
    eventColumns,
    eventConstraints,
    eventIndexes,
    extraConstraints: [{ table: 'public.users', name: 'users_role_check' }],
  }
}

async function collect(client, scope) {
  const rows = []

  const queries = {
    tables: `
      SELECT n.nspname AS schema, c.relname AS name, c.relkind::text AS kind
      FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE c.relkind IN ('r', 'p') AND n.nspname IN ('public', 'recognition')
        AND c.relname NOT LIKE '\\_\\_drizzle%'`,
    columns: `
      SELECT n.nspname AS schema, c.relname AS table_name, a.attname AS name,
             format_type(a.atttypid, a.atttypmod) AS type,
             a.attnotnull AS not_null,
             coalesce(pg_get_expr(d.adbin, d.adrelid), '') AS default_expr
      FROM pg_attribute a
      JOIN pg_class c ON c.oid = a.attrelid
      JOIN pg_namespace n ON n.oid = c.relnamespace
      LEFT JOIN pg_attrdef d ON d.adrelid = a.attrelid AND d.adnum = a.attnum
      WHERE a.attnum > 0 AND NOT a.attisdropped AND c.relkind IN ('r', 'p')
        AND n.nspname IN ('public', 'recognition')`,
    constraints: `
      SELECT n.nspname AS schema, c.relname AS table_name, con.conname AS name,
             con.contype::text AS kind, pg_get_constraintdef(con.oid) AS definition
      FROM pg_constraint con
      JOIN pg_class c ON c.oid = con.conrelid
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname IN ('public', 'recognition')`,
    indexes: `
      SELECT schemaname AS schema, tablename AS table_name, indexname AS name,
             regexp_replace(indexdef, ' TABLESPACE [^ ]+', '') AS definition
      FROM pg_indexes WHERE schemaname IN ('public', 'recognition')`,
    triggers: `
      SELECT n.nspname AS schema, c.relname AS table_name, t.tgname AS name,
             pg_get_triggerdef(t.oid) AS definition
      FROM pg_trigger t
      JOIN pg_class c ON c.oid = t.tgrelid
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE NOT t.tgisinternal AND n.nspname IN ('public', 'recognition')`,
  }

  for (const [kind, sql] of Object.entries(queries)) {
    const { rows: found } = await client.query(sql)
    for (const row of found) {
      if (kind === 'tables') {
        const table = `${row.schema}.${row.name}`
        if (scope.tables.has(table)) rows.push(`table ${table} (${row.kind})`)
        continue
      }

      const table = `${row.schema}.${row.table_name}`
      if (!scope.tables.has(table) && table !== 'public.events') continue

      if (table === 'public.events') {
        if (kind === 'columns' && !scope.eventColumns.has(row.name)) continue
        if (kind === 'constraints' && !scope.eventConstraints.has(row.name)) continue
        if (kind === 'indexes' && !scope.eventIndexes.has(row.name)) continue
      }

      if (kind === 'columns') {
        rows.push(
          `column ${table}.${row.name} ${row.type} notnull=${row.not_null} default=${row.default_expr}`,
        )
      } else if (kind === 'constraints') {
        rows.push(`constraint ${table}.${row.name} ${row.kind} ${row.definition}`)
      } else if (kind === 'indexes') {
        rows.push(`index ${table}.${row.name} ${row.definition}`)
      } else if (kind === 'triggers') {
        rows.push(`trigger ${table}.${row.name} ${row.definition}`)
      }
    }
  }

  for (const extra of scope.extraConstraints) {
    const { rows: found } = await client.query(
      `SELECT pg_get_constraintdef(oid) AS definition
       FROM pg_constraint WHERE conrelid = $1::regclass AND conname = $2`,
      [extra.table, extra.name],
    )
    if (found.length === 0) {
      rows.push(`constraint ${extra.table}.${extra.name} MISSING`)
    } else {
      rows.push(`constraint ${extra.table}.${extra.name} ${found[0].definition}`)
    }
  }

  return rows.sort()
}

function diff(reference, actual) {
  const referenceSet = new Set(reference)
  const actualSet = new Set(actual)
  const missing = reference.filter((row) => !actualSet.has(row))
  const extra = actual.filter((row) => !referenceSet.has(row))
  return { missing, extra }
}

async function main() {
  const adminUrl =
    process.env.PARITY_DATABASE_URL ?? process.env.DATABASE_URL ?? ''
  if (!adminUrl) usage('set DATABASE_URL (or PARITY_DATABASE_URL) to a Postgres server URL')

  const journal = JSON.parse(
    await readText(path.join(migrationsDir, 'meta/_journal.json')),
  )
  const tags = journal.entries.map((entry) => entry.tag)

  for (const tag of MIRRORED_TAGS) {
    if (!tags.includes(tag)) usage(`journal is missing mirrored migration ${tag}`)
  }

  const firstMirror = Math.min(...MIRRORED_TAGS.map((tag) => tags.indexOf(tag)))
  const baselineTags = tags.slice(0, firstMirror)
  const scope = await contractScope()

  const admin = new pg.Client({ connectionString: adminUrl })
  await admin.connect()

  let goClient
  let drizzleClient
  try {
    for (const database of [goDb, drizzleDb]) {
      await admin.query(`DROP DATABASE IF EXISTS ${pg.escapeIdentifier(database)}`)
      await admin.query(`CREATE DATABASE ${pg.escapeIdentifier(database)}`)
    }

    goClient = new pg.Client({ connectionString: withDatabase(adminUrl, goDb) })
    drizzleClient = new pg.Client({ connectionString: withDatabase(adminUrl, drizzleDb) })
    await goClient.connect()
    await drizzleClient.connect()

    console.log(
      `reference: Drizzle through ${baselineTags.at(-1)} + ${GO_FILES.length} Go contract migrations`,
    )
    await applyGoContract(goClient, baselineTags)

    console.log(`production: ${tags.length} Drizzle migrations through ${tags.at(-1)}`)
    for (const tag of tags) {
      await applyFile(drizzleClient, path.join(migrationsDir, `${tag}.sql`))
    }

    const reference = await collect(goClient, scope)
    const actual = await collect(drizzleClient, scope)
    const { missing, extra } = diff(reference, actual)

    console.log(
      `contract surface: ${scope.tables.size} tables, ${scope.eventColumns.size} events columns, ` +
        `${scope.eventConstraints.size} events constraints, ${scope.eventIndexes.size} events indexes`,
    )

    if (missing.length === 0 && extra.length === 0) {
      console.log(`parity OK: ${reference.length} schema objects match`)
      return
    }

    console.error(`\nparity FAILED: ${missing.length} missing, ${extra.length} extra in Drizzle`)
    for (const row of missing) console.error(`  missing: ${row}`)
    for (const row of extra) console.error(`  extra:   ${row}`)
    process.exitCode = 1
  } finally {
    if (goClient) await goClient.end().catch(() => {})
    if (drizzleClient) await drizzleClient.end().catch(() => {})
    if (!keep) {
      for (const database of [goDb, drizzleDb]) {
        await admin.query(`DROP DATABASE IF EXISTS ${pg.escapeIdentifier(database)}`)
      }
    } else {
      console.log(`kept scratch databases: ${goDb}, ${drizzleDb}`)
    }
    await admin.end().catch(() => {})
  }
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
