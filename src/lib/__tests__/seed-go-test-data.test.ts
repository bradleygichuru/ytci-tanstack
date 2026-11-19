import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const source = readFileSync(resolve(process.cwd(), 'scripts/seed-go-test-data.ts'), 'utf8')

describe('seed-go-test-data destinations', () => {
  it('uses the transport_notes API field', () => {
    expect(source).not.toContain('transportAccessRoute')
    expect(source).toContain('transportNotes')
  })

  it('uses controlled Title Case destination categories', () => {
    expect(source).toContain("category: 'Wildlife'")
    expect(source).toContain("category: 'Beach'")
  })
})
