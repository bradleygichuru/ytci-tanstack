import { describe, it, expect } from 'vitest'
import destMock from '../mock/destinations'
import lmsMock from '../mock/lms'
import consMock from '../mock/conservation'
import eventsMock from '../mock/events'
import campsMock from '../mock/campaigns'
import mediaMock from '../mock/media'
import pushMock from '../mock/push'

describe('API Contract — Destinations', () => {
  it('create returns object with id and defaults', () => {
    const result = destMock.create({ name: 'Test', county: 'Nairobi', category: 'culture', slug: 'test' }) as Record<string, unknown>
    expect(result).toHaveProperty('id')
    expect(result).toHaveProperty('createdAt')
    expect(result).toHaveProperty('status', 'draft')
  })

  it('list returns paginated shape', () => {
    const result = destMock.list()
    expect(result).toHaveProperty('items')
    expect(result).toHaveProperty('nextCursor')
    expect(result).toHaveProperty('hasMore')
  })

  it('update merges patch', () => {
    const result = destMock.update('dest-1', { name: 'Updated' }) as Record<string, unknown>
    expect(result.name).toBe('Updated')
  })
})

describe('API Contract — Courses', () => {
  it('create returns course with id and defaults', () => {
    const result = lmsMock.create({ title: 'New Course' }) as Record<string, unknown>
    expect(result).toHaveProperty('id')
    expect(result).toHaveProperty('status', 'draft')
    expect(result).toHaveProperty('lessons')
    expect((result as { lessons: unknown[] }).lessons).toHaveLength(0)
  })

  it('update recalculates lessonCount', () => {
    const result = lmsMock.update('course-1', { lessons: [] }) as Record<string, unknown>
    expect(result).toHaveProperty('lessonCount', 0)
  })
})

describe('API Contract — Conservation', () => {
  it('create returns activity with defaults', () => {
    const result = consMock.create({ title: 'Activity', organizer: 'Org', location: 'Loc' }) as Record<string, unknown>
    expect(result).toHaveProperty('id')
    expect(result).toHaveProperty('status', 'open')
  })

  it('list with evidence cursor returns evidence', () => {
    const result = consMock.list({ cursor: 'evidence' })
    expect(result.items.length).toBeGreaterThan(0)
  })
})

describe('API Contract — Events', () => {
  it('create returns event with defaults', () => {
    const result = eventsMock.create({ title: 'Event', county: 'Nairobi', date: '2025-01-01' }) as Record<string, unknown>
    expect(result).toHaveProperty('id')
    expect(result).toHaveProperty('status', 'scheduled')
  })

  it('list returns all events', () => {
    const result = eventsMock.list()
    expect(result.items.length).toBeGreaterThanOrEqual(5)
  })
})

describe('API Contract — Campaigns', () => {
  it('create returns campaign with defaults', () => {
    const result = campsMock.create({ title: 'Campaign', type: 'home_banner' }) as Record<string, unknown>
    expect(result).toHaveProperty('id')
    expect(result).toHaveProperty('status', 'draft')
  })
})

describe('API Contract — Media', () => {
  it('list returns moderation items with cursor param', () => {
    const result = mediaMock.list({ cursor: 'moderation' })
    expect(result).toHaveProperty('items')
    expect(result.items.length).toBeGreaterThanOrEqual(5)
  })

  it('list returns assets', () => {
    const result = mediaMock.list()
    expect(result.items.length).toBeGreaterThanOrEqual(6)
  })

  it('create returns asset with defaults', () => {
    const result = mediaMock.create({ caption: 'Test image', type: 'image' }) as Record<string, unknown>
    expect(result).toHaveProperty('id')
    expect(result).toHaveProperty('url', '')
    expect(result).toHaveProperty('rightsStatus', 'cleared')
  })

  it('update merges patch', () => {
    const result = mediaMock.update('asset-1', { caption: 'Updated' }) as Record<string, unknown>
    expect(result).toHaveProperty('caption', 'Updated')
  })
})

describe('API Contract — Push Notifications', () => {
  it('send returns a result with sendId', () => {
    const result = pushMock.send({ campaignId: 'camp-1', audience: { type: 'all' }, title: 'Test', body: 'Hello' })
    expect(result).toHaveProperty('sendId')
    expect(result).toHaveProperty('status')
    expect(result).toHaveProperty('tokenCount')
  })

  it('tokenCount returns device count', () => {
    const result = pushMock.tokenCount({ type: 'county', value: 'Kwale' })
    expect(result).toHaveProperty('devices')
    expect(typeof result.devices).toBe('number')
    expect(result.devices).toBeGreaterThan(0)
  })

  it('history returns paginated shape', () => {
    const result = pushMock.history({ campaignId: 'camp-1' })
    expect(result).toHaveProperty('items')
    expect(result).toHaveProperty('nextCursor')
    expect(result).toHaveProperty('hasMore')
  })
})
