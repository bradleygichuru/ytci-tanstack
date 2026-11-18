import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  loadThenNowState,
  mapApiAuditEvent,
  mapApiExperience,
  mapApiExperienceSummary,
  mapApiReviewRow,
  mapApiSite,
  requireOpenRevision,
  siteCreatePayload,
  sitePatchPayload,
  snapshotFromExperience,
  thenNowApi,
  thenNowErrorMessage,
  ThenNowStaleRevisionError,
  type ThenNowApi,
  type ThenNowApiExperienceDetail,
  type ThenNowApiSite,
  type ThenNowApiSnapshot,
} from '../then-now'
import { ApiErrorResponse } from '../types'

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

describe('thenNowApi writes', () => {
  it('creates and updates a site through the documented paths', async () => {
    mockFetch(API_SITE)
    const api = thenNowApi(config)
    await api.createSite({
      name: 'Nairobi Railway Museum',
      county: 'Nairobi',
      siteType: 'historical',
      accessMode: 'camera_video',
      sensitivity: 'standard',
    })
    expect(vi.mocked(fetch).mock.calls[0][0]).toBe('http://localhost:8080/v1/then-now/sites')
    expect(vi.mocked(fetch).mock.calls[0][1]).toEqual(expect.objectContaining({
      method: 'POST',
      body: expect.stringContaining('"siteType":"historical"'),
    }))

    mockFetch(API_SITE)
    await api.updateSite(API_SITE.id, { name: 'Renamed' })
    expect(vi.mocked(fetch).mock.calls[1][0]).toBe(
      `http://localhost:8080/v1/then-now/sites/${API_SITE.id}`,
    )
    expect(vi.mocked(fetch).mock.calls[1][1]).toEqual(expect.objectContaining({ method: 'PATCH' }))
  })

  it('publishes, unpublishes, and archives a site', async () => {
    const api = thenNowApi(config)
    mockFetch(API_SITE)
    await api.publishSite(API_SITE.id)
    expect(String(vi.mocked(fetch).mock.calls[0][0])).toContain(`/sites/${API_SITE.id}/publish`)
    expect(vi.mocked(fetch).mock.calls[0][1]).toEqual(expect.objectContaining({ method: 'POST' }))

    mockFetch(API_SITE)
    await api.unpublishSite(API_SITE.id)
    expect(String(vi.mocked(fetch).mock.calls[1][0])).toContain(`/sites/${API_SITE.id}/unpublish`)

    mockFetch(API_SITE)
    await api.archiveSite(API_SITE.id)
    expect(String(vi.mocked(fetch).mock.calls[2][0])).toContain(`/sites/${API_SITE.id}/archive`)
  })

  it('sends full snapshots on experience writes and lifecycle actions', async () => {
    const api = thenNowApi(config)
    const snapshot = snapshotFromExperience(mapApiExperience(DETAIL))

    mockFetch(DETAIL)
    await api.updateExperience(DETAIL.id, { title: DETAIL.title, snapshot })
    expect(vi.mocked(fetch).mock.calls[0][0]).toBe(
      `http://localhost:8080/v1/then-now/experiences/${DETAIL.id}`,
    )
    expect(vi.mocked(fetch).mock.calls[0][1]).toEqual(expect.objectContaining({ method: 'PATCH' }))
    expect(vi.mocked(fetch).mock.calls[0][1]?.body).toContain('"renditionKeys"')

    const calls: [() => Promise<unknown>, string][] = [
      [() => api.submitExperience(DETAIL.id), `/experiences/${DETAIL.id}/submit`],
      [() => api.assignReviewer(DETAIL.id), `/experiences/${DETAIL.id}/assign`],
      [() => api.publishExperience(DETAIL.id), `/experiences/${DETAIL.id}/publish`],
      [() => api.newRevision(DETAIL.id), `/experiences/${DETAIL.id}/new-revision`],
    ]
    for (const [call, path] of calls) {
      mockFetch(DETAIL)
      await call()
      const request = vi.mocked(fetch).mock.calls.at(-1)
      expect(String(request?.[0])).toContain(path)
      expect(request?.[1]).toEqual(expect.objectContaining({ method: 'POST' }))
    }
  })

  it('sends decisions, scheduling, rights records, and status actions', async () => {
    const api = thenNowApi(config)
    mockFetch(DETAIL)
    await api.decideExperience(DETAIL.id, 'request_changes', 'Shorten card 02.')
    expect(vi.mocked(fetch).mock.calls[0][1]?.body).toBe(
      JSON.stringify({ decision: 'request_changes', notes: 'Shorten card 02.' }),
    )

    mockFetch(DETAIL)
    await api.scheduleExperience(DETAIL.id, '2026-12-01T06:00:00.000Z', 'Morning release')
    expect(String(vi.mocked(fetch).mock.calls[1][0])).toContain(`/experiences/${DETAIL.id}/schedule`)
    expect(vi.mocked(fetch).mock.calls[1][1]?.body).toContain('"scheduledAt"')

    mockFetch(DETAIL)
    await api.changeExperienceStatus(DETAIL.id, 'revoke')
    expect(vi.mocked(fetch).mock.calls[2][1]?.body).toBe(JSON.stringify({ action: 'revoke' }))

    mockFetch(DETAIL)
    await api.recordClientApproval(DETAIL.id, {
      name: 'Njeri K.',
      role: 'Client approver',
      at: '2026-11-16T17:02:00+03:00',
    })
    expect(String(vi.mocked(fetch).mock.calls[3][0])).toContain(`/experiences/${DETAIL.id}/client-approval`)
  })
})

describe('Then & Now write payloads', () => {
  it('maps a site to the create body with lowercase enums', () => {
    const site = mapApiSite(API_SITE)
    const body = siteCreatePayload({
      ...site,
      type: 'Cultural',
      latitude: '',
      longitude: '36.822641',
      geofenceRadius: '200',
    })
    expect(body).toEqual(expect.objectContaining({
      name: 'Nairobi Railway Museum',
      county: 'Nairobi',
      siteType: 'cultural',
      accessMode: 'camera_video',
      sensitivity: 'standard',
      longitude: 36.822641,
      geofenceRadiusM: 200,
    }))
    expect(body.latitude).toBeUndefined()
  })

  it('keeps empty optional strings out of a create but allows clearing in a patch', () => {
    const site = mapApiSite(API_SITE)
    const create = siteCreatePayload({ ...site, sources: '', factCheck: '' })
    expect(create.sources).toBeUndefined()
    expect(create.factCheck).toBeUndefined()

    const patch = sitePatchPayload({ ...site, sources: '', factCheck: '' })
    expect(patch.sources).toBe('')
    expect(patch.factCheck).toBe('')
  })

  it('round-trips snapshot fields the Go readiness gate needs', () => {
    const exp = mapApiExperience(DETAIL)
    const snapshot = snapshotFromExperience(exp)
    expect(snapshot.primaryMode).toBe('camera_video')
    expect(snapshot.rightsRecord).toBe('Client footage · cleared')
    expect(snapshot.consentRecord).toBe('Community review recorded')
    expect(snapshot.renditionKeys).toEqual({})
    expect(snapshot.captionKeys).toEqual({})
    expect(snapshot.textCards).toEqual(SNAPSHOT.textCards)
  })

  it('keeps existing media object keys through a load and save', () => {
    const exp = mapApiExperience({
      ...DETAIL,
      openRevision: DETAIL.openRevision
        ? {
            ...DETAIL.openRevision,
            snapshot: {
              ...SNAPSHOT,
              renditionKeys: { '1080': 'then-now/railway/1080.mp4' },
              posterKey: 'then-now/railway/poster.jpg',
              captionKeys: { en: 'then-now/railway/en.vtt' },
              transcriptKey: 'then-now/railway/transcript.txt',
            },
          }
        : null,
    })
    const snapshot = snapshotFromExperience(exp)
    expect(snapshot.renditionKeys).toEqual({ '1080': 'then-now/railway/1080.mp4' })
    expect(snapshot.posterKey).toBe('then-now/railway/poster.jpg')
    expect(snapshot.captionKeys).toEqual({ en: 'then-now/railway/en.vtt' })
    expect(snapshot.transcriptKey).toBe('then-now/railway/transcript.txt')
  })

  it('maps a review queue row without turning the revision id into an experience id', () => {
    const row = mapApiReviewRow({
      revisionId: 'rev-9',
      experienceId: DETAIL.id,
      siteId: API_SITE.id,
      siteName: API_SITE.name,
      title: DETAIL.title,
      revisionNumber: 9,
      submittedBy: 'Amina W.',
      submittedAt: '2026-11-17T09:42:00Z',
      sensitivity: 'sensitive',
      reviewer: 'Daniel M.',
    })
    expect(row).toEqual({
      revisionId: 'rev-9',
      experienceId: DETAIL.id,
      siteId: API_SITE.id,
      siteName: API_SITE.name,
      title: DETAIL.title,
      revisionNumber: 9,
      submittedBy: 'Amina W.',
      submittedAt: '2026-11-17T09:42:00Z',
      sensitivity: 'sensitive',
      reviewer: 'Daniel M.',
    })
  })
})

describe('optimistic concurrency and errors', () => {
  it('rejects a stale open revision before a full-snapshot save', async () => {
    const api = fakeApi({
      getExperience: vi.fn().mockResolvedValue({ ...DETAIL, openRevisionNumber: 6 }),
    })
    await expect(requireOpenRevision(api, DETAIL.id, 4)).rejects.toBeInstanceOf(
      ThenNowStaleRevisionError,
    )
  })

  it('returns the detail when the revision still matches', async () => {
    const api = fakeApi({ getExperience: vi.fn().mockResolvedValue(DETAIL) })
    await expect(requireOpenRevision(api, DETAIL.id, 4)).resolves.toEqual(DETAIL)
  })

  it('turns common API failures into operator-facing messages', () => {
    expect(thenNowErrorMessage(new ApiErrorResponse(403, 'FORBIDDEN', 'forbidden'))).toContain(
      'does not have permission',
    )
    expect(thenNowErrorMessage(new ApiErrorResponse(409, 'SEPARATION', 'separation'))).toBe(
      'The uploader cannot review their own revision.',
    )
    const readiness = {
      blockers: [{ section: 'media', label: 'Poster image' }],
      warnings: [],
      readyToSubmit: false,
      readyToPublish: false,
    }
    const notReady = new ApiErrorResponse(
      409,
      'NOT_READY',
      'readiness blockers prevent submission',
      undefined,
      { error: { code: 'NOT_READY', message: 'readiness blockers prevent submission' }, readiness },
    )
    expect(thenNowErrorMessage(notReady)).toContain('Blocked by: Poster image.')
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
