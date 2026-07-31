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
    expect(result.status).toBe('open')
    expect(result.impactMetric).toBe('')
    expect(result.participantCount).toBe(0)
    expect(result.measurementUnit).toBe('')
  })

  it('coerces string impactGoal to number', () => {
    const result = conservationActivitySchema.parse({
      title: 'Test', organizer: 'Org', location: 'Loc',
      impactGoal: '100',
    })
    expect(result.impactGoal).toBe(100)
  })

  it('coerces string impactActual to number', () => {
    const result = conservationActivitySchema.parse({
      title: 'Test', organizer: 'Org', location: 'Loc',
      impactActual: '42.5',
    })
    expect(result.impactActual).toBe(42.5)
  })

  it('treats empty string impactGoal as undefined, not 0', () => {
    const result = conservationActivitySchema.parse({
      title: 'Test', organizer: 'Org', location: 'Loc',
      impactGoal: '',
    })
    expect(result.impactGoal).toBeUndefined()
  })

  it('treats undefined impactGoal as undefined', () => {
    const result = conservationActivitySchema.parse({
      title: 'Test', organizer: 'Org', location: 'Loc',
    })
    expect(result.impactGoal).toBeUndefined()
    expect(result.impactActual).toBeUndefined()
  })
})
