import { describe, it, expect } from 'vitest'
import { destinationSchema } from '../destination.schema'

describe('destinationSchema', () => {
  it('accepts valid minimal input', () => {
    const result = destinationSchema.safeParse({ name: 'Test Place', slug: 'test-place', county: 'Nairobi', category: 'wildlife' })
    expect(result.success).toBe(true)
  })

  it('rejects empty name', () => {
    const result = destinationSchema.safeParse({ name: '', slug: 'test', county: 'Nairobi', category: 'wildlife' })
    expect(result.success).toBe(false)
    if (!result.success) expect(result.error.issues.some(i => i.path[0] === 'name')).toBe(true)
  })

  it('rejects missing slug', () => {
    const result = destinationSchema.safeParse({ name: 'Test', slug: '', county: 'Nairobi', category: 'wildlife' })
    expect(result.success).toBe(false)
  })

  it('rejects invalid slug format', () => {
    const result = destinationSchema.safeParse({ name: 'Test', slug: 'Test Place!', county: 'Nairobi', category: 'wildlife' })
    expect(result.success).toBe(false)
  })

  it('rejects missing county', () => {
    const result = destinationSchema.safeParse({ name: 'Test', slug: 'test', county: '', category: 'wildlife' })
    expect(result.success).toBe(false)
  })

  it('rejects missing category', () => {
    const result = destinationSchema.safeParse({ name: 'Test', slug: 'test', county: 'Nairobi', category: '' })
    expect(result.success).toBe(false)
  })

  it('fills defaults for optional fields', () => {
    const result = destinationSchema.parse({ name: 'Test', slug: 'test', county: 'Nairobi', category: 'culture' })
    expect(result.status).toBe('draft')
    expect(result.difficulty).toBe('easy')
    expect(result.accessibility).toEqual([])
  })

  it('coerces string lat/lng input to numbers', () => {
    const result = destinationSchema.parse({
      name: 'Test', slug: 'test', county: 'Nairobi', category: 'culture',
      latitude: '-1.4061', longitude: '35.2506',
    })
    expect(result.latitude).toBe(-1.4061)
    expect(result.longitude).toBe(35.2506)
  })
})
