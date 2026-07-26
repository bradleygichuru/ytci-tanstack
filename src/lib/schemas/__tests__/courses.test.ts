import { describe, it, expect } from 'vitest'
import { courseSchema } from '../course.schema'

describe('courseSchema', () => {
  it('accepts valid input', () => {
    const result = courseSchema.safeParse({ title: 'Test Course' })
    expect(result.success).toBe(true)
  })

  it('rejects empty title', () => {
    const result = courseSchema.safeParse({ title: '' })
    expect(result.success).toBe(false)
  })

  it('fills defaults', () => {
    const result = courseSchema.parse({ title: 'Test' })
    expect(result.difficulty).toBe('beginner')
    expect(result.status).toBe('draft')
    expect(result.passThreshold).toBe(70)
    expect(result.certificateEnabled).toBe(false)
  })
})
