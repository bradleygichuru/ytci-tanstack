import { describe, expect, it } from 'vitest'
import {
  ThenNowWorkflowError,
  approveRevision,
  assignReviewer,
  materialChangeNeeded,
  publishRevision,
  rejectRevision,
  requestChanges,
  scheduleRevision,
  submitRevision,
} from '../workflow'
import type { Experience } from '../types'

const AT = '2026-11-17T10:00:00+03:00'

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

function inReview(overrides: Partial<Experience> = {}) {
  return makeExperience({
    draftStatus: 'in_review',
    reviewer: 'Daniel M.',
    submittedBy: 'Daniel M.',
    submittedAt: AT,
    ...overrides,
  })
}

describe('submit and assign', () => {
  it('freezes a draft and clears assignment', () => {
    const result = submitRevision(makeExperience(), 'Daniel M.', AT)
    expect(result.draftStatus).toBe('in_review')
    expect(result.reviewer).toBe('Unassigned')
    expect(result.submittedBy).toBe('Daniel M.')
    expect(result.lastDecision).toBeNull()
  })

  it('rejects submit while readiness blockers remain', () => {
    expect(() => submitRevision(makeExperience({ title: '' }), 'Daniel M.', AT)).toThrow(
      ThenNowWorkflowError,
    )
  })

  it('rejects assignment to the uploader', () => {
    expect(() => assignReviewer(inReview(), 'Amina W.', AT)).toThrow('uploader')
  })

  it('assigns another administrator', () => {
    const result = assignReviewer(inReview(), 'Grace K.', AT)
    expect(result.reviewer).toBe('Grace K.')
  })
})

describe('review decisions', () => {
  it('approves without publishing', () => {
    const result = approveRevision(inReview(), 'Grace K.', 'Approved.', AT)
    expect(result.draftStatus).toBe('approved')
    expect(result.status).toBe('published')
    expect(result.liveRevision).toBe(3)
    expect(result.reviewNotes[0].note).toBe('Approved.')
  })

  it('blocks approval by the uploader', () => {
    const exp = inReview({ reviewer: 'Amina W.' })
    expect(() => approveRevision(exp, 'Amina W.', '', AT)).toThrow('uploader')
  })

  it('blocks sensitive approval until the second reviewer records approval', () => {
    const exp = inReview({ sensitivity: 'sensitive' })
    expect(() => approveRevision(exp, 'Grace K.', '', AT)).toThrow('second reviewer')

    const approved = approveRevision(
      { ...exp, secondReviewerApproved: true, secondReviewer: { name: 'Wanjiku M.', org: 'Community', decision: 'approved' } },
      'Grace K.',
      '',
      AT,
    )
    expect(approved.draftStatus).toBe('approved')
  })

  it('blocks restricted approval', () => {
    const exp = inReview({ sensitivity: 'restricted', secondReviewerApproved: true })
    expect(() => approveRevision(exp, 'Grace K.', '', AT)).toThrow('Restricted')
  })

  it('returns for changes with a required note and clears assignment', () => {
    expect(() => requestChanges(inReview(), 'Grace K.', '', AT)).toThrow('note')
    const result = requestChanges(inReview(), 'Grace K.', 'Shorten card 02.', AT)
    expect(result.draftStatus).toBe('draft')
    expect(result.reviewer).toBe('Unassigned')
    expect(result.lastDecision).toBe('changes')
  })

  it('records a rejection and gates unchanged resubmission', () => {
    const rejected = rejectRevision(inReview(), 'Grace K.', 'No consent evidence.', AT)
    expect(rejected.lastDecision).toBe('rejected')
    expect(materialChangeNeeded(rejected)).toBe(true)

    const changed = { ...rejected, title: 'A place of remembrance — revised' }
    expect(materialChangeNeeded(changed)).toBe(false)

    const reverted = { ...changed, title: rejected.title }
    expect(materialChangeNeeded(reverted)).toBe(true)
  })
})

describe('publish and schedule', () => {
  it('publishes an approved revision and promotes the live version', () => {
    const approved = approveRevision(inReview(), 'Grace K.', '', AT)
    const published = publishRevision(approved, AT)
    expect(published.status).toBe('published')
    expect(published.draftStatus).toBe('published')
    expect(published.liveRevision).toBe(4)
  })

  it('keeps a published experience live while a replacement is scheduled', () => {
    const approved = approveRevision(inReview(), 'Grace K.', '', AT)
    const scheduled = scheduleRevision(approved, '2026-11-20T09:00:00+03:00', 'Morning release')
    expect(scheduled.status).toBe('published')
    expect(scheduled.scheduledAt).toBe('2026-11-20T09:00:00+03:00')
    expect(scheduled.draftStatus).toBe('approved')
  })

  it('sets scheduled for a never-published experience', () => {
    const approved = approveRevision(
      inReview({ status: 'draft', liveRevision: 0, draftRevision: 1 }),
      'Grace K.',
      '',
      AT,
    )
    const scheduled = scheduleRevision(approved, '2026-11-20T09:00:00+03:00', '')
    expect(scheduled.status).toBe('scheduled')
  })
})
