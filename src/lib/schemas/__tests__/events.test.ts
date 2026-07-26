import { describe, it, expect } from 'vitest'
import { eventSchema } from '../event.schema'

describe('eventSchema', () => {
  it('accepts valid input', () => {
    const result = eventSchema.safeParse({ title: 'Festival', county: 'Nairobi', date: '2025-01-01' })
    expect(result.success).toBe(true)
  })

  it('accepts endDate after startDate', () => {
    const result = eventSchema.safeParse({ title: 'Festival', county: 'Nairobi', date: '2025-01-01', endDate: '2025-01-05' })
    expect(result.success).toBe(true)
  })

  it('rejects endDate before startDate', () => {
    const result = eventSchema.safeParse({ title: 'Festival', county: 'Nairobi', date: '2025-01-10', endDate: '2025-01-05' })
    expect(result.success).toBe(false)
  })

  it('rejects empty title', () => {
    const result = eventSchema.safeParse({ title: '', county: 'Nairobi', date: '2025-01-01' })
    expect(result.success).toBe(false)
  })

  it('fills defaults', () => {
    const result = eventSchema.parse({ title: 'Test', county: 'Nairobi', date: '2025-01-01' })
    expect(result.status).toBe('scheduled')
    expect(result.reminderEnabled).toBe(false)
  })
})
