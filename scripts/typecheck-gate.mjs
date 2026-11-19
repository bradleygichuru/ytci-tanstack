#!/usr/bin/env node
/**
 * Blocking typecheck gate — ticket #377.
 *
 * `tsc` has a documented pre-existing error baseline (see
 * `docs/execution-shell.md:124`, `docs/mice-admin.md:83`): the repo is held to
 * "no new errors", not "zero errors". This script keeps the CI step blocking
 * without pretending the old debt is green — any error that is not in
 * `scripts/typecheck-baseline.txt` fails the build.
 *
 *   bun run typecheck:gate          # compare against the baseline
 *   bun run typecheck:gate --update # rewrite the baseline (only when debt is
 *                                   # deliberately accepted and documented)
 */
import { spawnSync } from 'node:child_process'
import { readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'

const root = path.resolve(import.meta.dirname, '..')
const baselinePath = path.join(root, 'scripts/typecheck-baseline.txt')
const tscBin = path.join(root, 'node_modules', '.bin', 'tsc')

const update = process.argv.includes('--update')

const result = spawnSync(tscBin, ['--noEmit', '--pretty', 'false'], {
  cwd: root,
  encoding: 'utf8',
})

if (result.error) {
  console.error(`typecheck: could not run tsc — ${result.error.message}`)
  process.exit(1)
}

const output = `${result.stdout ?? ''}\n${result.stderr ?? ''}`

// `path(line,col): error TSxxxx: message` — the line/column is dropped so a
// moved line does not churn the baseline.
const ERROR_LINE = /^(.+?)\(\d+,\d+\): error (TS\d+): (.*)$/gm
const current = new Map()
for (const match of output.matchAll(ERROR_LINE)) {
  const key = `${match[1]} ${match[2]} ${match[3].trim()}`
  current.set(key, (current.get(key) ?? 0) + 1)
}

if (update) {
  const occurrences = [...current].flatMap(([key, count]) => Array.from({ length: count }, () => key))
  const body = [
    '# Pre-existing tsc errors accepted by scripts/typecheck-gate.mjs (#377).',
    '# Format: <file> <code> <message>, one line per occurrence. Remove a line',
    '# when the error is fixed; never add one without recording why in',
    '# docs/execution-shell.md.',
    ...occurrences.sort(),
  ].join('\n')
  writeFileSync(baselinePath, `${body}\n`)
  console.log(`typecheck: baseline updated with ${occurrences.length} error(s)`)
  process.exit(0)
}

const baseline = new Map()
for (const line of readFileSync(baselinePath, 'utf8').split('\n')) {
  const key = line.trim()
  if (!key || key.startsWith('#')) continue
  baseline.set(key, (baseline.get(key) ?? 0) + 1)
}

if (result.status === 0) {
  console.log('typecheck: clean')
  process.exit(0)
}

if (current.size === 0) {
  console.error(output.trim())
  console.error('typecheck: failed without parseable TS errors')
  process.exit(1)
}

const added = []
const fixed = []
for (const [key, count] of current) {
  const known = baseline.get(key) ?? 0
  if (count > known) added.push(`${key} (${count - known} new)`)
}
for (const [key, count] of baseline) {
  const now = current.get(key) ?? 0
  if (now < count) fixed.push(`${key} (${count - now} fixed)`)
}
added.sort()
fixed.sort()

if (fixed.length > 0) {
  console.log(
    `typecheck: ${fixed.length} baseline error(s) no longer occur — prune scripts/typecheck-baseline.txt:\n  ${fixed.join('\n  ')}`,
  )
}

if (added.length > 0) {
  console.error(`typecheck: ${added.length} new error(s) not in the baseline:`)
  for (const error of added) console.error(`  ${error}`)
  process.exit(1)
}

console.log(`typecheck: ${[...current.values()].reduce((a, b) => a + b, 0)} known baseline error(s), no new errors`)
