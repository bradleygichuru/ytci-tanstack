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
})
