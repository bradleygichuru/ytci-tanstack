import { describe, it, expect } from 'vitest'
import { campaignSchema } from '../campaign.schema'

describe('campaignSchema', () => {
  it('accepts valid home_banner input', () => {
    const result = campaignSchema.safeParse({ title: 'Summer Campaign', type: 'home_banner' })
    expect(result.success).toBe(true)
  })

  it('rejects empty title', () => {
    const result = campaignSchema.safeParse({ title: '', type: 'home_banner' })
    expect(result.success).toBe(false)
  })

  it('rejects missing type', () => {
    const result = campaignSchema.safeParse({ title: 'Test' })
    expect(result.success).toBe(false)
  })

  it('requires destinationId for featured_destination', () => {
    const result = campaignSchema.safeParse({ title: 'Test', type: 'featured_destination' })
    expect(result.success).toBe(false)
  })

  it('requires audience for push_notification', () => {
    const result = campaignSchema.safeParse({ title: 'Test', type: 'push_notification' })
    expect(result.success).toBe(false)
  })

  it('fills defaults', () => {
    const result = campaignSchema.parse({ title: 'Test', type: 'home_banner' })
    expect(result.status).toBe('draft')
  })
})
