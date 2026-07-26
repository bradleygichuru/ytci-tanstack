import { describe, it, expect } from 'vitest'
import { conservationActivitySchema } from '../conservation.schema'

describe('conservationActivitySchema', () => {
  it('accepts valid input', () => {
    const result = conservationActivitySchema.safeParse({ title: 'Beach Cleanup', organizer: 'Eco Group', location: 'Kwale' })
    expect(result.success).toBe(true)
  })

  it('rejects empty title', () => {
    const result = conservationActivitySchema.safeParse({ title: '', organizer: 'Eco Group', location: 'Kwale' })
    expect(result.success).toBe(false)
  })

  it('rejects empty organizer', () => {
    const result = conservationActivitySchema.safeParse({ title: 'Test', organizer: '', location: 'Kwale' })
    expect(result.success).toBe(false)
  })

  it('fills defaults', () => {
    const result = conservationActivitySchema.parse({ title: 'Test', organizer: 'Org', location: 'Loc' })
    expect(result.status).toBe('active')
    expect(result.locationPrivacy).toBe('public')
    expect(result.impactMetrics).toEqual({ treesPlanted: 0, wasteCollected: 0, wildlifeSurveyed: 0 })
  })
})
