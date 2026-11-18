import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  loadThenNowState,
  mapApiAuditEvent,
  mapApiExperience,
  mapApiExperienceSummary,
  mapApiSite,
  thenNowApi,
  type ThenNowApi,
  type ThenNowApiExperienceDetail,
  type ThenNowApiSite,
  type ThenNowApiSnapshot,
} from '../then-now'

const config = { baseUrl: 'http://localhost:8080', token: 'test-jwt' }

function mockFetch(response: unknown) {
  return vi.mocked(fetch).mockResolvedValue({
    ok: true,
    status: 200,
    json: () => Promise.resolve(response),
  } as Response)
}

const API_SITE: ThenNowApiSite = {
  id: '11111111-1111-1111-1111-111111111111',
  name: 'Nairobi Railway Museum',
  slug: 'nairobi-railway-museum',
  county: 'Nairobi',
  locality: 'Nairobi',
  siteType: 'historical',
  accessMode: 'camera_video',
  sensitivity: 'standard',
  status: 'published',
  managingAuthority: 'National Museums of Kenya',
  destinationId: null,
  photographyPolicy: 'Allowed with attribution',
  culturalAuthority: 'National Museums of Kenya',
  consentRecord: 'Community review recorded',
  consentDate: '2026-09-12',
  siteRules: 'Stay behind the marked line.',
  safetyNotes: 'The yard is uneven.',
  shortDescription: 'The railway that built Nairobi.',
  fullDescription: 'A current-scene portrait.',
  sources: 'NMK labels',
  factCheck: 'Signed off',
  publicRightsLine: 'Footage used with permission.',
  latitude: -1.293613,
  longitude: 36.822641,
  geofenceRadiusM: 150,
  standingPointNote: 'Main yard entrance.',
  imageKey: 'then-now/railway.jpg',
  publishedExperiences: 1,
}

const SNAPSHOT: ThenNowApiSnapshot = {
  title: 'The railway that built Nairobi',
  promise: 'See the museum yard as it is today.',
  story: 'A current-scene walk through the yard.',
  period: '1899–1971',
  duration: 77,
  contentNotes: 'No historical footage.',
  safetyNotes: 'Stay behind the line.',
  sources: 'NMK labels',
  factCheck: 'Signed off',
  primaryMode: 'camera_video',
  languages: ['EN', 'SW'],
  rightsRecord: 'Client footage · cleared',
  rightsEvidence: 'Signed release',
  rightsExpiry: '2027-06-30',
  consentRecord: 'Community review recorded',
  sensitivity: 'standard',
  videoMaster: 'then-now/railway/master.mp4',
  videoSize: '1.4 GB',
  renditions: { '1080': 'Ready', '720': 'Ready', '540': 'Missing' },
  poster: true,
  captions: { en: true, sw: false },
  transcript: true,
  audioDescription: false,
  textCards: [
    { at: 6, text: '1899 — the railway reaches Nairobi.' },
    { at: 22, text: 'The railway helped the city grow.' },
  ],
}

const DETAIL: ThenNowApiExperienceDetail = {
  id: '22222222-2222-2222-2222-222222222222',
  siteId: API_SITE.id,
  siteName: API_SITE.name,
  title: 'The railway that built Nairobi',
  status: 'published',
  liveRevisionNumber: 3,
  openRevisionNumber: 4,
  openRevision: {
    id: 'rev-4',
    revisionNumber: 4,
    status: 'draft',
    snapshot: SNAPSHOT,
    reviewNotes: [
      { author: 'Daniel M.', role: 'Administrator', at: '2026-11-17T08:50:00+03:00', note: 'Tighten card 02.' },
    ],
    reviewerId: 'user-1',
    reviewer: 'Daniel M.',
    submittedById: 'user-2',
    submittedBy: 'Amina W.',
    uploadedById: 'user-2',
    uploadedBy: 'Amina W.',
    submittedAt: '2026-11-16T09:42:00Z',
    lastDecision: 'changes',
    secondReviewer: null,
    secondReviewerApproved: false,
    clientApproval: null,
    scheduledAt: '',
    scheduleNote: '',
    publishedAt: '',
  },
  liveRevision: null,
  site: API_SITE,
  readiness: { blockers: [], warnings: [], readyToSubmit: true, readyToPublish: false },
}

beforeEach(() => {
  vi.spyOn(globalThis, 'fetch').mockReset()
})

describe('thenNowApi', () => {
  it('lists sites with filters and the bearer token', async () => {
    mockFetch({ items: [API_SITE] })
    const api = thenNowApi(config)
    const result = await api.listSites({ county: 'Nairobi', q: 'rail' })

    expect(result.items).toHaveLength(1)
    const [url, init] = vi.mocked(fetch).mock.calls[0]
    expect(String(url)).toContain('/v1/then-now/sites')
    expect(String(url)).toContain('county=Nairobi')
    expect(String(url)).toContain('q=rail')
    expect(init).toEqual(expect.objectContaining({
      headers: expect.objectContaining({ Authorization: 'Bearer test-jwt' }),
    }))
  })

  it('reads a site detail and an experience detail', async () => {
    mockFetch({ site: API_SITE, experiences: [], readiness: DETAIL.readiness })
    const api = thenNowApi(config)
    const site = await api.getSite(API_SITE.id)
    expect(site.site.name).toBe('Nairobi Railway Museum')
    expect(String(vi.mocked(fetch).mock.calls[0][0])).toContain(`/v1/then-now/sites/${API_SITE.id}`)

    mockFetch(DETAIL)
    const experience = await api.getExperience(DETAIL.id)
    expect(experience.openRevision?.revisionNumber).toBe(4)
    expect(String(vi.mocked(fetch).mock.calls[1][0])).toContain(`/v1/then-now/experiences/${DETAIL.id}`)
  })

  it('reads the review queue, a frozen review, and audit events', async () => {
    mockFetch({ items: [{ revisionId: 'rev-4', experienceId: DETAIL.id }] })
    const api = thenNowApi(config)
    await api.reviewQueue('unassigned')
    expect(String(vi.mocked(fetch).mock.calls[0][0])).toContain('/v1/then-now/review?filter=unassigned')

    mockFetch(DETAIL)
    await api.getReview('rev-4')
    expect(String(vi.mocked(fetch).mock.calls[1][0])).toContain('/v1/then-now/review/rev-4')

    mockFetch({ items: [] })
    await api.listAudit({ entityId: DETAIL.id })
    expect(String(vi.mocked(fetch).mock.calls[2][0])).toContain(`entityId=${DETAIL.id}`)
  })
})

describe('Then & Now API mapping', () => {
  it('maps a Go site to the HeritageSite UI model', () => {
    const site = mapApiSite(API_SITE, ['exp-1'])
    expect(site).toEqual(expect.objectContaining({
      id: API_SITE.id,
      name: 'Nairobi Railway Museum',
      type: 'Historical',
      access: 'camera_video',
      sensitivity: 'standard',
      status: 'published',
      photography: 'Allowed with attribution',
      consent: 'Community review recorded',
      safety: 'The yard is uneven.',
      publicRights: 'Footage used with permission.',
      latitude: '-1.293613',
      longitude: '36.822641',
      geofenceRadius: '150',
      image: 'then-now/railway.jpg',
      experiences: ['exp-1'],
    }))
    // The Go read model has no updated_at; the mapper keeps it neutral.
    expect(site.updatedAt).toBe('')
  })

  it('maps an experience detail from its open revision snapshot', () => {
    const exp = mapApiExperience(DETAIL)
    expect(exp).toEqual(expect.objectContaining({
      id: DETAIL.id,
      siteId: API_SITE.id,
      title: 'The railway that built Nairobi',
      promise: 'See the museum yard as it is today.',
      mode: 'camera_video',
      status: 'published',
      liveRevision: 3,
      draftRevision: 4,
      draftStatus: 'draft',
      uploadedBy: 'Amina W.',
      submittedBy: 'Amina W.',
      reviewer: 'Daniel M.',
      languages: ['EN', 'SW'],
      rights: 'Client footage · cleared',
      consent: 'Community review recorded',
      lastDecision: 'changes',
      poster: true,
      transcript: true,
    }))
    expect(exp.captions).toEqual({ en: true, sw: false })
    expect(exp.renditions).toEqual({ '1080': 'Ready', '720': 'Ready', '540': 'Missing' })
    expect(exp.textCards).toHaveLength(2)
    expect(exp.reviewNotes).toHaveLength(1)
  })

  it('maps an experience list row into the UI model', () => {
    const exp = mapApiExperienceSummary({
      id: DETAIL.id,
      siteId: API_SITE.id,
      siteName: API_SITE.name,
      title: DETAIL.title,
      status: 'published',
      liveRevisionNumber: 3,
      openRevisionNumber: 4,
      openStatus: 'in_review',
      primaryMode: 'camera_video',
      languages: ['EN', 'SW'],
      rightsExpiry: '2027-06-30',
      sensitivity: 'sensitive',
      updatedAt: '2026-11-17T09:42:00Z',
    })
    expect(exp.draftStatus).toBe('in_review')
    expect(exp.status).toBe('published')
    expect(exp.liveRevision).toBe(3)
    expect(exp.draftRevision).toBe(4)
    expect(exp.mode).toBe('camera_video')
    expect(exp.sensitivity).toBe('sensitive')
  })

  it('maps an audit event into the UI audit model', () => {
    const event = mapApiAuditEvent({
      id: 'audit-1',
      entityType: 'site',
      entityId: API_SITE.id,
      eventType: 'publish',
      actorId: 'user-1',
      summary: 'Site published',
      metadata: { note: 'Ready.' },
      createdAt: '2026-11-17T09:42:00Z',
    })
    expect(event).toEqual({
      id: 'audit-1',
      entity: API_SITE.id,
      type: 'publish',
      title: 'Site published',
      meta: 'user-1 · 2026-11-17T09:42:00Z',
      note: 'Ready.',
    })
  })
})

function fakeApi(overrides: Partial<ThenNowApi>): ThenNowApi {
  return {
    listSites: vi.fn(),
    getSite: vi.fn(),
    listExperiences: vi.fn(),
    getExperience: vi.fn(),
    getReview: vi.fn(),
    reviewQueue: vi.fn(),
    listAudit: vi.fn(),
    ...overrides,
  } as unknown as ThenNowApi
}

describe('loadThenNowState fallback', () => {
  it('returns null when the sites read rejects so the fixture store is kept', async () => {
    const api = fakeApi({ listSites: vi.fn().mockRejectedValue(new Error('offline')) })
    await expect(loadThenNowState(api)).resolves.toBeNull()
  })

  it('returns null when the API has no sites so the fixture demo is kept', async () => {
    const api = fakeApi({
      listSites: vi.fn().mockResolvedValue({ items: [] }),
      listExperiences: vi.fn().mockResolvedValue({ items: [] }),
      listAudit: vi.fn().mockResolvedValue({ items: [] }),
    })
    await expect(loadThenNowState(api)).resolves.toBeNull()
  })

  it('builds sites, experiences, and audit from a successful read', async () => {
    const api = fakeApi({
      listSites: vi.fn().mockResolvedValue({ items: [API_SITE] }),
      listExperiences: vi.fn().mockResolvedValue({
        items: [{
          id: DETAIL.id,
          siteId: API_SITE.id,
          siteName: API_SITE.name,
          title: DETAIL.title,
          status: 'in_review',
          liveRevisionNumber: 3,
          openRevisionNumber: 4,
          openStatus: 'in_review',
          primaryMode: 'camera_video',
          languages: ['EN'],
          rightsExpiry: '2027-06-30',
          sensitivity: 'standard',
          updatedAt: '2026-11-17T09:42:00Z',
        }],
      }),
      listAudit: vi.fn().mockResolvedValue({
        items: [{
          id: 'audit-1',
          entityType: 'site',
          entityId: API_SITE.id,
          eventType: 'publish',
          actorId: 'user-1',
          summary: 'Site published',
          metadata: {},
          createdAt: '2026-11-17T09:42:00Z',
        }],
      }),
    })

    const data = await loadThenNowState(api)
    expect(data).not.toBeNull()
    expect(data?.sites[0].experiences).toEqual([DETAIL.id])
    expect(data?.experiences[DETAIL.id].draftStatus).toBe('in_review')
    expect(data?.audit).toHaveLength(1)
  })

  it('keeps sites when the experiences read fails', async () => {
    const api = fakeApi({
      listSites: vi.fn().mockResolvedValue({ items: [API_SITE] }),
      listExperiences: vi.fn().mockRejectedValue(new Error('boom')),
      listAudit: vi.fn().mockRejectedValue(new Error('boom')),
    })
    const data = await loadThenNowState(api)
    expect(data?.sites).toHaveLength(1)
    expect(data?.sites[0].experiences).toEqual([])
    expect(data?.experiences).toEqual({})
    expect(data?.audit).toBeNull()
  })
})
