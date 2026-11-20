import { describe, it, expect, beforeEach, vi } from 'vitest'
import { audioStoriesApi } from '../audio-stories'

const config = { baseUrl: 'http://localhost:8080', token: 'test-jwt' }

function mockFetch(response: unknown, status = 200) {
  return vi.mocked(fetch).mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(response),
    statusText: status >= 400 ? 'error' : 'ok',
  } as Response)
}

beforeEach(() => { vi.spyOn(globalThis, 'fetch').mockReset() })

describe('audioStoriesApi', () => {
  it('lists with status, collection and search filters', async () => {
    mockFetch({ items: [{ id: 'a-1', title: 'The Last Mangrove', languages: ['en'] }] })
    const api = audioStoriesApi(config)
    const result = await api.list({ status: 'draft', collectionId: 'c-1', q: 'mangrove' })
    expect(result.items[0].title).toBe('The Last Mangrove')
    const url = vi.mocked(fetch).mock.calls[0][0] as string
    expect(url).toContain('status=draft')
    expect(url).toContain('collectionId=c-1')
    expect(url).toContain('q=mangrove')
  })

  it('creates a story with placement and rights', async () => {
    mockFetch({ id: 'a-1', revisionId: 'r-1', status: 'draft' }, 201)
    const api = audioStoriesApi(config)
    const result = await api.create({
      slug: 'the-last-mangrove',
      title: 'The Last Mangrove',
      summary: 'A coastal story.',
      theme: 'nature_wildlife',
      producer: 'YTCI',
      communitySource: 'Kilifi elders',
      placeScope: 'county',
      counties: ['Kilifi'],
      rightsBasis: 'ytci_owned',
      rightsHolder: 'YTCI',
    })
    expect(result.revisionId).toBe('r-1')
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining('/v1/audio-stories'),
      expect.objectContaining({ method: 'POST' }),
    )
  })

  it('saves and submits a revision', async () => {
    mockFetch({ status: 'saved' })
    const api = audioStoriesApi(config)
    await api.saveTrack('a-1', 'r-1', {
      language: 'en',
      audioObjectKey: 'audio/en.m4a',
      durationSeconds: 720,
      narrator: 'Amina Yusuf',
      narratorConsentDate: '2026-10-01',
      narratorConsentReference: 'REL-2026-014',
    })
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining('/v1/audio-stories/a-1/revisions/r-1/tracks'),
      expect.objectContaining({ method: 'POST' }),
    )

    mockFetch({ status: 'in_review' })
    await api.submit('a-1', 'r-1')
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining('/v1/audio-stories/a-1/revisions/r-1/submit'),
      expect.objectContaining({ method: 'POST' }),
    )
  })

  it('puts a transcript and reads readiness', async () => {
    mockFetch({ status: 'saved' })
    const api = audioStoriesApi(config)
    await api.saveTranscript('a-1', 'r-1', 'en', [{ text: 'Hello', startSeconds: 0 }])
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining('/transcripts/en'),
      expect.objectContaining({ method: 'PUT' }),
    )

    mockFetch({ ready: false, blocking: [{ code: 'missing_cover', label: 'Cover image is required', section: 'story' }], warnings: [] })
    const readiness = await api.readiness('a-1', 'r-1')
    expect(readiness.ready).toBe(false)
    expect(readiness.blocking[0].code).toBe('missing_cover')
  })

  it('loads the review queue with a status filter and counts', async () => {
    mockFetch({
      items: [{
        storyId: 'a-1', storyTitle: 'The Last Mangrove', revisionId: 'r-2',
        riskTier: 'sensitive', languages: ['en'], submittedAt: '2026-11-01T08:00:00Z',
      }],
      counts: { unassigned: 1, mine: 0, sensitive: 1, restricted: 0 },
    })
    const api = audioStoriesApi(config)
    const queue = await api.reviewQueue('sensitive')
    expect(queue.items[0].storyTitle).toBe('The Last Mangrove')
    expect(queue.counts.sensitive).toBe(1)
    const url = vi.mocked(fetch).mock.calls[0][0] as string
    expect(url).toContain('/v1/audio-stories/review-queue')
    expect(url).toContain('status=sensitive')
  })

  it('reads revision reviews and records assign, recuse and review decisions', async () => {
    const api = audioStoriesApi(config)

    mockFetch({ items: [{ id: 'rev-1', decision: 'approve', riskTier: 'standard', createdAt: '2026-11-02T09:00:00Z' }], approvals: 1, requiredApprovals: 1 })
    const reviews = await api.reviews('a-1', 'r-2')
    expect(reviews.approvals).toBe(1)
    expect(vi.mocked(fetch).mock.calls[0][0]).toContain('/v1/audio-stories/a-1/revisions/r-2/reviews')

    mockFetch({ status: 'in_review' })
    await api.assignReviewer('a-1', 'r-2', { reviewerId: 'u-2', secondReviewerId: 'u-3', reason: 'Second pair of eyes' })
    let init = vi.mocked(fetch).mock.calls[1][1] as RequestInit
    expect(vi.mocked(fetch).mock.calls[1][0]).toContain('/revisions/r-2/assign')
    expect(JSON.parse(init.body as string)).toEqual({ reviewerId: 'u-2', secondReviewerId: 'u-3', reason: 'Second pair of eyes' })

    mockFetch({ status: 'in_review' })
    await api.recuse('a-1', 'r-2', 'Conflict of interest')
    init = vi.mocked(fetch).mock.calls[2][1] as RequestInit
    expect(vi.mocked(fetch).mock.calls[2][0]).toContain('/revisions/r-2/recuse')
    expect(JSON.parse(init.body as string)).toEqual({ reason: 'Conflict of interest' })

    mockFetch({ needsSecondReviewer: true, approvals: 1, requiredApprovals: 2 })
    const result = await api.review('a-1', 'r-2', {
      decision: 'approve', notes: 'Careful handling of grief.', externalReviewerName: 'Dr A. Otieno',
    })
    init = vi.mocked(fetch).mock.calls[3][1] as RequestInit
    expect(vi.mocked(fetch).mock.calls[3][0]).toContain('/revisions/r-2/review')
    expect(result.needsSecondReviewer).toBe(true)
    expect(JSON.parse(init.body as string)).toMatchObject({ decision: 'approve', notes: 'Careful handling of grief.' })
  })

  it('withdraws a revision through the review endpoint', async () => {
    mockFetch({ status: 'draft' })
    const api = audioStoriesApi(config)
    await api.withdraw('a-1', 'r-2', 'Need to replace the Kiswahili track')
    expect(vi.mocked(fetch).mock.calls[0][0]).toContain('/v1/audio-stories/a-1/revisions/r-2/withdraw')
    const init = vi.mocked(fetch).mock.calls[0][1] as RequestInit
    expect(JSON.parse(init.body as string)).toEqual({ reason: 'Need to replace the Kiswahili track' })
  })

  it('publishes, schedules and withdraws published stories', async () => {
    const api = audioStoriesApi(config)

    mockFetch({ status: 'published', contentVersion: 3 })
    await api.publishRevision('a-1', 'r-2')
    expect(vi.mocked(fetch).mock.calls[0][0]).toContain('/v1/audio-stories/a-1/revisions/r-2/publish')

    mockFetch({ status: 'scheduled', publishAt: '2026-12-01T09:00:00Z' })
    await api.scheduleRevision('a-1', 'r-2', '2026-12-01T09:00:00Z')
    let init = vi.mocked(fetch).mock.calls[1][1] as RequestInit
    expect(vi.mocked(fetch).mock.calls[1][0]).toContain('/revisions/r-2/schedule')
    expect(JSON.parse(init.body as string)).toEqual({ publishAt: '2026-12-01T09:00:00Z' })

    mockFetch({ status: 'approved' })
    await api.cancelSchedule('a-1', 'r-2', 'Move to the end of the month')
    init = vi.mocked(fetch).mock.calls[2][1] as RequestInit
    expect(vi.mocked(fetch).mock.calls[2][0]).toContain('/revisions/r-2/cancel-schedule')
    expect(JSON.parse(init.body as string)).toEqual({ reason: 'Move to the end of the month' })

    mockFetch({ status: 'unpublished' })
    await api.unpublish('a-1', 'Rights review')
    expect(vi.mocked(fetch).mock.calls[3][0]).toContain('/v1/audio-stories/a-1/unpublish')
    init = vi.mocked(fetch).mock.calls[3][1] as RequestInit
    expect(JSON.parse(init.body as string)).toEqual({ reason: 'Rights review' })

    mockFetch({ status: 'published' })
    await api.republish('a-1')
    expect(vi.mocked(fetch).mock.calls[4][0]).toContain('/v1/audio-stories/a-1/republish')
  })

  it('archives, revokes and restores a story', async () => {
    const api = audioStoriesApi(config)

    mockFetch({ status: 'archived' })
    await api.archive('a-1', 'Retired')
    let init = vi.mocked(fetch).mock.calls[0][1] as RequestInit
    expect(vi.mocked(fetch).mock.calls[0][0]).toContain('/v1/audio-stories/a-1/archive')
    expect(JSON.parse(init.body as string)).toEqual({ reason: 'Retired' })

    mockFetch({ status: 'revoked' })
    await api.revoke('a-1', 'Consent withdrawn', 'REL-2026-021')
    init = vi.mocked(fetch).mock.calls[1][1] as RequestInit
    expect(vi.mocked(fetch).mock.calls[1][0]).toContain('/v1/audio-stories/a-1/revoke')
    expect(JSON.parse(init.body as string)).toEqual({ reason: 'Consent withdrawn', evidenceReference: 'REL-2026-021' })

    mockFetch({ revisionId: 'r-3', status: 'draft' })
    const restored = await api.restore('a-1')
    expect(vi.mocked(fetch).mock.calls[2][0]).toContain('/v1/audio-stories/a-1/restore')
    expect(restored.revisionId).toBe('r-3')
  })

  it('manages collection metadata, stories and publication', async () => {
    const api = audioStoriesApi(config)

    mockFetch({ id: 'c-1', slug: 'voices-of-the-coast', status: 'draft' })
    await api.createCollection({ slug: 'voices-of-the-coast', title: 'Voices of the Coast', description: 'Coastal oral histories.' })
    expect(vi.mocked(fetch).mock.calls[0][0]).toContain('/v1/audio-story-collections')
    let init = vi.mocked(fetch).mock.calls[0][1] as RequestInit
    expect(init.method).toBe('POST')
    expect(JSON.parse(init.body as string)).toMatchObject({ slug: 'voices-of-the-coast', title: 'Voices of the Coast' })

    mockFetch({ collection: { id: 'c-1', title: 'Voices of the Coast' }, stories: [{ id: 'a-1', title: 'The Last Mangrove' }] })
    const detail = await api.getCollection('c-1')
    expect(vi.mocked(fetch).mock.calls[1][0]).toContain('/v1/audio-story-collections/c-1')
    expect(detail.stories[0].id).toBe('a-1')

    mockFetch({ status: 'draft' })
    await api.updateCollection('c-1', { title: 'Voices of the Coast', displayOrder: 2, featured: true })
    init = vi.mocked(fetch).mock.calls[2][1] as RequestInit
    expect(init.method).toBe('PATCH')

    mockFetch({ status: 'draft' })
    await api.setCollectionStories('c-1', ['a-2', 'a-1'])
    init = vi.mocked(fetch).mock.calls[3][1] as RequestInit
    expect(vi.mocked(fetch).mock.calls[3][0]).toContain('/v1/audio-story-collections/c-1/stories')
    expect(JSON.parse(init.body as string)).toEqual({ storyIds: ['a-2', 'a-1'] })

    mockFetch({ status: 'published' })
    await api.publishCollection('c-1')
    expect(vi.mocked(fetch).mock.calls[4][0]).toContain('/v1/audio-story-collections/c-1/publish')

    mockFetch({ status: 'scheduled', publishAt: '2026-12-01T09:00:00Z' })
    await api.scheduleCollection('c-1', '2026-12-01T09:00:00Z')
    expect(vi.mocked(fetch).mock.calls[5][0]).toContain('/v1/audio-story-collections/c-1/schedule')

    mockFetch({ status: 'unpublished' })
    await api.unpublishCollection('c-1', 'Rework order')
    init = vi.mocked(fetch).mock.calls[6][1] as RequestInit
    expect(JSON.parse(init.body as string)).toEqual({ reason: 'Rework order' })

    mockFetch({ status: 'archived' })
    await api.archiveCollection('c-1', 'Superseded')
    expect(vi.mocked(fetch).mock.calls[7][0]).toContain('/v1/audio-story-collections/c-1/archive')

    mockFetch(null, 204)
    await api.deleteCollection('c-1')
    expect(vi.mocked(fetch).mock.calls[8][0]).toContain('/v1/audio-story-collections/c-1')
    init = vi.mocked(fetch).mock.calls[8][1] as RequestInit
    expect(init.method).toBe('DELETE')
  })
})
