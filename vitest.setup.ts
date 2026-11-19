/**
 * Unit-test environment — ticket #377.
 *
 * Unit tests must never touch Postgres. `src/db/index.ts` builds a lazily
 * connected pool at import time, so modules that import it need a
 * syntactically valid DSN but never open a socket. Provide a placeholder only
 * when the caller has not set one; a real DATABASE_URL still wins.
 */
if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL = 'postgres://verify:verify@127.0.0.1:5432/ytci_unit_placeholder'
}
