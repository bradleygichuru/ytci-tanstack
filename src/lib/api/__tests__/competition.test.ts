import { describe, it, expect, beforeEach, vi } from 'vitest'
import { competitionApi } from '../competition'

const config = { baseUrl: 'http://localhost:8080', token: 'test-jwt' }

function mockFetch(response: unknown, status = 200) {
  return vi.mocked(fetch).mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    statusText: status >= 400 ? 'error' : 'ok',
    json: () => Promise.resolve(response),
    blob: () => Promise.resolve(new Blob(['id,name\n1,Ada\n'])),
  } as Response)
}

beforeEach(() => {
  vi.spyOn(globalThis, 'fetch').mockReset()
})

describe('competitionApi', () => {
  it('creates an edition with Route B defaults and dates', async () => {
    mockFetch(
      {
        id: 'ed-1',
        slug: 'first-edition',
        name: 'First edition',
        status: 'draft',
        promotionType: 'award_programme',
        publicVoteMode: 'people_choice_only',
        prizeEnabled: false,
        rulesVersion: '1.0',
      },
      201,
    )
    const api = competitionApi(config)
    const result = await api.editions.create({
      slug: 'first-edition',
      name: 'First edition',
      theme: "The story is Kenya's",
      status: 'draft',
      promotionType: 'award_programme',
      publicVoteMode: 'people_choice_only',
      minAge: 16,
      maxAge: 30,
      prizeEnabled: false,
      rulesVersion: '1.0',
      opensAt: '2026-11-01T00:00:00.000Z',
    })
    expect(result.promotionType).toBe('award_programme')
    expect(fetch).toHaveBeenCalledWith(
      'http://localhost:8080/v1/admin/competition/editions',
      expect.objectContaining({ method: 'POST' }),
    )
    const body = JSON.parse(vi.mocked(fetch).mock.calls[0][1]!.body as string)
    expect(body.minAge).toBe(16)
    expect(body.opensAt).toBe('2026-11-01T00:00:00.000Z')
  })

  it('lists categories for an edition', async () => {
    mockFetch({ items: [{ id: 'cat-1', editionId: 'ed-1', key: 'photography' }] })
    const api = competitionApi(config)
    const result = await api.categories.list('ed-1')
    expect(result.items[0].key).toBe('photography')
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining('/v1/admin/competition/editions/ed-1/categories'),
      expect.anything(),
    )
  })

  it('sets an eligibility decision with a note', async () => {
    mockFetch({ id: 'entry-1', eligibilityStatus: 'ineligible' })
    const api = competitionApi(config)
    await api.entries.setEligibility('entry-1', 'ineligible', 'No guardian consent')
    const [url, options] = vi.mocked(fetch).mock.calls[0]
    expect(url).toContain('/entries/entry-1/eligibility')
    expect(options?.method).toBe('POST')
    expect(JSON.parse(options?.body as string)).toEqual({
      status: 'ineligible',
      note: 'No guardian consent',
    })
  })

  it('assigns a judge and declares a conflict', async () => {
    mockFetch({ id: 'assignment-1', status: 'assigned' }, 201)
    const api = competitionApi(config)
    await api.assignments.create('ed-1', { categoryId: 'cat-1', judgeId: 'judge-1' })
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining('/editions/ed-1/assignments'),
      expect.objectContaining({ method: 'POST' }),
    )

    mockFetch({ id: 'conflict-1', reason: 'Colleague' }, 201)
    await api.conflicts.create('ed-1', {
      judgeId: 'judge-1',
      entryId: 'entry-1',
      reason: 'Colleague',
    })
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining('/editions/ed-1/conflicts'),
      expect.objectContaining({ method: 'POST' }),
    )
  })

  it('upserts a rubric score and locks a category', async () => {
    mockFetch({ id: 'score-1', total: 77.5 })
    const api = competitionApi(config)
    const score = await api.scores.upsert({
      assignmentId: 'assignment-1',
      entryId: 'entry-1',
      relevance: 8,
      craft: 7,
      originality: 9,
      impact: 6,
      notes: 'Strong point of view',
    })
    expect(score.total).toBe(77.5)
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining('/v1/admin/competition/scores'),
      expect.objectContaining({ method: 'PUT' }),
    )

    mockFetch({ updated: 4, locked: true })
    const locked = await api.scores.lock('ed-1', { categoryId: 'cat-1', lock: true })
    expect(locked.updated).toBe(4)
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining('/editions/ed-1/scores/lock'),
      expect.objectContaining({ method: 'POST' }),
    )
  })

  it('reads the vote summary and invalidates with a reason code', async () => {
    mockFetch({
      entries: [{ entryId: 'entry-1', liveVotes: 4, invalidVotes: 1 }],
      liveVotes: 4,
      invalidVotes: 1,
      distinctVoters: 3,
    })
    const api = competitionApi(config)
    const summary = await api.votes.summary('ed-1')
    expect(summary.entries[0].liveVotes).toBe(4)

    mockFetch({ id: 'vote-1' })
    await api.votes.invalidate('vote-1', 'coordinated_abuse')
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining('/votes/vote-1/invalidate'),
      expect.objectContaining({ method: 'POST' }),
    )
  })

  it('freezes and recounts the board', async () => {
    mockFetch({ items: [{ id: 'snap-1', ledgerHash: 'abc', isFinal: true }], frozen: true })
    const api = competitionApi(config)
    const frozen = await api.results.freeze('ed-1')
    expect(frozen.frozen).toBe(true)
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining('/editions/ed-1/freeze'),
      expect.objectContaining({ method: 'POST' }),
    )

    mockFetch({ items: [], frozen: true })
    await api.results.recount('ed-1')
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining('/editions/ed-1/recount'),
      expect.objectContaining({ method: 'POST' }),
    )
  })

  it('creates and publishes an award', async () => {
    mockFetch({ id: 'award-1', awardType: 'category_winner', awardForm: 'grant' }, 201)
    const api = competitionApi(config)
    const award = await api.awards.create('ed-1', {
      entryId: 'entry-1',
      categoryId: 'cat-1',
      awardType: 'category_winner',
      awardForm: 'grant',
      citation: 'A specific, honest portrait.',
    })
    expect(award.awardForm).toBe('grant')

    mockFetch({ id: 'award-1', publishedAt: '2026-12-01T10:00:00Z' })
    const published = await api.awards.publish('award-1')
    expect(published.publishedAt).not.toBeNull()
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining('/awards/award-1/publish'),
      expect.objectContaining({ method: 'POST' }),
    )
  })

  it('lists consultation responses and downloads the CSV export', async () => {
    mockFetch({ items: [{ id: 'response-1', consent: true, answers: { q1: 'yes' } }] })
    const api = competitionApi(config)
    const result = await api.consultation.list('ed-1', { limit: 50, offset: 0 })
    expect(result.items[0].consent).toBe(true)

    mockFetch({})
    const blob = await api.consultation.exportCsv('ed-1')
    expect(blob).toBeInstanceOf(Blob)
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining('/editions/ed-1/consultation-responses/export'),
      expect.objectContaining({
        headers: { Authorization: 'Bearer test-jwt' },
      }),
    )
  })
})
