import { describe, expect, it } from 'vitest'
import { experienceReadiness, siteReadiness } from '../readiness'
import type { Experience, HeritageSite } from '../types'

function makeExperience(overrides: Partial<Experience> = {}): Experience {
  return {
    id: 'exp-1',
    siteId: 'site-1',
    title: 'The railway that built Nairobi',
    promise: 'See the museum yard as it is today.',
    story: 'A current-scene walk through the yard.',
    period: '1899–1971',
    duration: 77,
    contentNotes: 'Current-scene footage only.',
    safetyNotes: 'Stay behind the marked line.',
    sources: 'NMK labels',
    factCheck: 'Signed off',
    mode: 'camera_video',
    status: 'published',
    liveRevision: 3,
    draftRevision: 4,
    draftStatus: 'draft',
    uploadedBy: 'Amina W.',
    submittedBy: 'Amina W.',
    submittedAt: '2026-11-17T09:42:00+03:00',
    reviewer: 'Unassigned',
    secondReviewer: null,
    secondReviewerApproved: false,
    clientApproval: null,
    languages: ['EN', 'SW'],
    rightsExpiry: '2027-06-30',
    sensitivity: 'standard',
    videoMaster: '4K master',
    videoSize: '1.4 GB',
    renditions: { '1080': 'Ready', '720': 'Ready', '540': 'Ready' },
    poster: true,
    captions: { en: true, sw: true },
    transcript: true,
    audioDescription: true,
    rights: 'Client footage, cleared',
    rightsEvidence: 'Signed release',
    consent: 'Community review recorded',
    textCards: [
      { at: 6, text: '1899 — the Uganda Railway reaches Nairobi.' },
      { at: 22, text: 'The railway helped Nairobi grow.' },
    ],
    updatedAt: '2026-11-17T09:42:00+03:00',
    lastSavedAt: '2026-11-17T09:42:00+03:00',
    reviewNotes: [],
    lastDecision: null,
    diff: { live: [], draft: [], changes: [] },
    ...overrides,
  }
}

function makeSite(overrides: Partial<HeritageSite> = {}): HeritageSite {
  return {
    id: 'site-1',
    name: 'Nairobi Railway Museum',
    slug: 'nairobi-railway-museum',
    county: 'Nairobi',
    locality: 'Nairobi',
    type: 'Historical',
    access: 'camera_video',
    sensitivity: 'standard',
    status: 'published',
    managingAuthority: 'National Museums of Kenya',
    destination: 'Nairobi Railway Museum',
    photography: 'Allowed with attribution',
    culturalAuthority: 'National Museums of Kenya',
    consent: 'Community review recorded',
    consentDate: '2026-09-12',
    siteRules: 'Stay behind the marked line.',
    safety: 'The yard is uneven.',
    shortDescription: 'The railway that built Nairobi.',
    fullDescription: 'A current-scene portrait.',
    sources: 'NMK labels',
    factCheck: 'Signed off',
    publicRights: 'Footage used with permission.',
    latitude: '-1.293613',
    longitude: '36.822641',
    geofenceRadius: '150',
    standingPointNote: 'Main yard entrance.',
    image: '/then-now/railway.jpg',
    updatedAt: '2026-11-17T09:42:00+03:00',
    experiences: ['exp-1'],
    ...overrides,
  }
}

describe('experienceReadiness', () => {
  it('passes a complete draft and keeps optional items as warnings', () => {
    const exp = makeExperience({
      status: 'draft',
      liveRevision: 0,
      draftRevision: 1,
      captions: { en: true, sw: false },
      audioDescription: false,
      renditions: { '1080': 'Ready', '720': 'Ready' },
    })
    const readiness = experienceReadiness(exp)
    expect(readiness.blockers).toEqual([])
    expect(readiness.readyToSubmit).toBe(true)
    expect(readiness.warnings.map((item) => item.label)).toEqual([
      'Swahili captions',
      'Audio description',
      '540p video file',
    ])
  })

  it('blocks missing story, media, accessibility, rights, and cards', () => {
    const exp = makeExperience({
      title: '',
      promise: '',
      story: '',
      videoMaster: '',
      renditions: {},
      poster: false,
      captions: { en: false, sw: false },
      transcript: false,
      rights: '',
      consent: '',
      textCards: [],
    })
    const readiness = experienceReadiness(exp)
    expect(readiness.readyToSubmit).toBe(false)
    expect(readiness.blockers.map((item) => item.section)).toEqual(
      expect.arrayContaining(['story', 'media', 'accessibility', 'rights', 'cards']),
    )
  })

  it('adds a review blocker while a revision is frozen', () => {
    const exp = makeExperience({ draftStatus: 'in_review' })
    const readiness = experienceReadiness(exp)
    expect(readiness.readyToSubmit).toBe(false)
    expect(readiness.blockers).toContainEqual({ section: 'review', label: 'Review decision' })
  })

  it('allows an approved revision to publish', () => {
    const exp = makeExperience({ draftStatus: 'approved', lastDecision: 'approved' })
    const readiness = experienceReadiness(exp)
    expect(readiness.readyToPublish).toBe(true)
    expect(readiness.blockers).toEqual([])
  })
})

describe('siteReadiness', () => {
  const experience = makeExperience()

  it('passes a published site with a live experience', () => {
    const readiness = siteReadiness(makeSite(), { 'exp-1': experience })
    expect(readiness.blockers).toEqual([])
    expect(readiness.readyToPublish).toBe(true)
  })

  it('blocks a site without a published experience and missing consent', () => {
    const readiness = siteReadiness(
      makeSite({ consent: '', experiences: [] }),
      { 'exp-1': experience },
    )
    expect(readiness.readyToPublish).toBe(false)
    expect(readiness.blockers.map((item) => item.label)).toEqual(
      expect.arrayContaining(['Consent record', 'At least one published experience']),
    )
  })

  it('warns when the access mode is not available', () => {
    const readiness = siteReadiness(makeSite({ access: 'not_available' }), { 'exp-1': experience })
    expect(readiness.warnings).toContainEqual({
      section: 'policy',
      label: 'Access mode is not available yet',
    })
  })
})
