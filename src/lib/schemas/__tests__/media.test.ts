import { describe, it, expect } from 'vitest'
import { mediaAssetSchema, moderationReportSchema } from '../media.schema'

describe('mediaAssetSchema', () => {
  it('accepts valid minimal input', () => {
    const result = mediaAssetSchema.safeParse({ caption: 'Test image' })
    expect(result.success).toBe(true)
  })

  it('rejects empty caption', () => {
    const result = mediaAssetSchema.safeParse({ caption: '' })
    expect(result.success).toBe(false)
  })

  it('fills defaults', () => {
    const result = mediaAssetSchema.parse({ caption: 'Test' })
    expect(result.type).toBe('image')
    expect(result.rightsStatus).toBe('cleared')
    expect(result.altText).toBe('')
    expect(result.credit).toBe('')
    expect(result.url).toBe('')
  })
})

describe('moderationReportSchema', () => {
  it('accepts valid reason', () => {
    const result = moderationReportSchema.safeParse({ reason: 'Copyright violation' })
    expect(result.success).toBe(true)
  })

  it('rejects empty reason', () => {
    const result = moderationReportSchema.safeParse({ reason: '' })
    expect(result.success).toBe(false)
  })
})
