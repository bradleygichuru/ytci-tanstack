import { describe, it, expect } from 'vitest'
import {
  audioStoryDraftCreateSchema,
  audioRightsSchema,
  audioStoryCreateSchema,
  audioStoryDetailsSchema,
  audioTrackSchema,
  audioTranscriptSchema,
  reviewDecisionSchema,
  reviewAssignmentSchema,
  audioScheduleSchema,
  audioReasonSchema,
  audioRevokeSchema,
  audioCollectionCreateSchema,
  audioCollectionUpdateSchema,
  audioCollectionStoriesSchema,
  eatDateTimeToIso,
  toEatDateTimeInput,
  formatEatDateTime,
  formatCue,
  formatDuration,
  parseCue,
} from '../audio-story.schema'

const validStory = {
  slug: 'the-last-mangrove',
  title: 'The Last Mangrove',
  summary: 'Kilifi elders restore a coastal mangrove.',
  theme: 'nature_wildlife' as const,
  producer: 'YTCI',
  communitySource: 'Kilifi elders',
  placeScope: 'county' as const,
  counties: ['Kilifi'],
  rightsBasis: 'ytci_owned' as const,
  rightsHolder: 'YTCI',
}

describe('audioStoryCreateSchema', () => {
  it('accepts a complete county-scoped story', () => {
    expect(audioStoryCreateSchema.safeParse(validStory).success).toBe(true)
  })

  it('rejects an invalid slug', () => {
    const result = audioStoryCreateSchema.safeParse({ ...validStory, slug: 'The Last Mangrove' })
    expect(result.success).toBe(false)
  })

  it('requires one county for county scope', () => {
    const result = audioStoryCreateSchema.safeParse({ ...validStory, counties: [] })
    expect(result.success).toBe(false)
  })

  it('requires at least two counties for multi-county scope', () => {
    const result = audioStoryCreateSchema.safeParse({
      ...validStory,
      placeScope: 'multi_county',
      counties: ['Kilifi'],
    })
    expect(result.success).toBe(false)
  })

  it('rejects counties for national scope', () => {
    const result = audioStoryCreateSchema.safeParse({
      ...validStory,
      placeScope: 'national',
    })
    expect(result.success).toBe(false)
  })

  it('requires evidence for partner or licensed content', () => {
    const result = audioStoryCreateSchema.safeParse({
      ...validStory,
      rightsBasis: 'partner_permission',
      licenceReference: '',
    })
    expect(result.success).toBe(false)
  })
})

describe('audioStoryDraftCreateSchema', () => {
  it('accepts a draft before rights or placement are known', () => {
    const result = audioStoryDraftCreateSchema.safeParse({
      slug: 'tidal-memories',
      title: 'Tidal Memories',
      summary: 'A fisherman remembers the old harbour.',
      theme: 'culture_heritage',
      producer: 'YTCI Coastal Unit',
      communitySource: 'Kilifi fishing families',
    })
    expect(result.success).toBe(true)
  })

  it('requires the core identity fields', () => {
    expect(audioStoryDraftCreateSchema.safeParse({ slug: 'x', title: '', summary: '', theme: 'culture_heritage', producer: '', communitySource: '' }).success).toBe(false)
  })
})

describe('audioStoryDetailsSchema', () => {
  it('accepts editable story metadata', () => {
    const result = audioStoryDetailsSchema.safeParse({
      title: 'The Last Mangrove',
      summary: 'A coastal story.',
      theme: 'nature_wildlife',
      producer: 'YTCI',
      communitySource: 'Kilifi elders',
      collectionId: '',
      collectionOrder: 1,
    })
    expect(result.success).toBe(true)
  })

  it('rejects a blank title and negative order', () => {
    const result = audioStoryDetailsSchema.safeParse({
      title: '  ',
      summary: 'A coastal story.',
      theme: 'nature_wildlife',
      producer: 'YTCI',
      communitySource: 'Kilifi elders',
      collectionOrder: -1,
    })
    expect(result.success).toBe(false)
  })
})

describe('audioTrackSchema', () => {
  const track = {
    language: 'en' as const,
    audioObjectKey: 'audio/en.m4a',
    narrator: 'Amina Yusuf',
    narratorConsentDate: '2026-10-01',
    narratorConsentReference: 'REL-2026-014',
    durationSeconds: 720,
  }

  it('accepts a complete track with consent', () => {
    expect(audioTrackSchema.safeParse(track).success).toBe(true)
  })

  it('requires narrator consent evidence', () => {
    expect(audioTrackSchema.safeParse({ ...track, narratorConsentReference: '' }).success).toBe(false)
  })

  it('enforces the 30s–60min duration window', () => {
    expect(audioTrackSchema.safeParse({ ...track, durationSeconds: 29 }).success).toBe(false)
    expect(audioTrackSchema.safeParse({ ...track, durationSeconds: 3601 }).success).toBe(false)
  })
})

describe('audioTranscriptSchema', () => {
  it('accepts increasing cues inside the duration', () => {
    const result = audioTranscriptSchema.safeParse({
      durationSeconds: 720,
      paragraphs: [
        { text: 'One', startSeconds: 0 },
        { text: 'Two', startSeconds: 42 },
      ],
    })
    expect(result.success).toBe(true)
  })

  it('rejects decreasing cues', () => {
    const result = audioTranscriptSchema.safeParse({
      paragraphs: [
        { text: 'One', startSeconds: 20 },
        { text: 'Two', startSeconds: 10 },
      ],
    })
    expect(result.success).toBe(false)
  })

  it('rejects a cue beyond the track duration', () => {
    const result = audioTranscriptSchema.safeParse({
      durationSeconds: 720,
      paragraphs: [{ text: 'One', startSeconds: 721 }],
    })
    expect(result.success).toBe(false)
  })

  it('rejects empty transcripts', () => {
    expect(audioTranscriptSchema.safeParse({ paragraphs: [] }).success).toBe(false)
  })
})

describe('audioRightsSchema', () => {
  it('requires evidence for licensed material', () => {
    const result = audioRightsSchema.safeParse({
      rightsBasis: 'licensed',
      rightsHolder: 'Partner',
      licenceReference: '',
      riskTier: 'standard',
      contentNoteCategories: [],
    })
    expect(result.success).toBe(false)
  })

  it('caps the content note at 200 characters', () => {
    const result = audioRightsSchema.safeParse({
      rightsBasis: 'ytci_owned',
      rightsHolder: 'YTCI',
      riskTier: 'sensitive',
      contentNoteCategories: ['death_or_grief'],
      contentNoteText: 'x'.repeat(201),
    })
    expect(result.success).toBe(false)
  })
})

describe('cue helpers', () => {
  it('parses mm:ss and raw seconds', () => {
    expect(parseCue('0:42')).toBe(42)
    expect(parseCue('12:04')).toBe(724)
    expect(parseCue('90')).toBe(90)
    expect(parseCue('')).toBeUndefined()
  })

  it('formats cues and durations', () => {
    expect(formatCue(0)).toBe('0:00')
    expect(formatCue(724)).toBe('12:04')
    expect(formatDuration(720)).toBe('12:00')
    expect(formatDuration(undefined)).toBe('—')
  })
})

describe('reviewDecisionSchema', () => {
  it('accepts an approval with optional notes', () => {
    expect(reviewDecisionSchema.safeParse({ decision: 'approve' }).success).toBe(true)
    expect(reviewDecisionSchema.safeParse({ decision: 'approve', notes: 'Careful handling of grief.' }).success).toBe(true)
  })

  it('requires notes for request changes and rejections', () => {
    expect(reviewDecisionSchema.safeParse({ decision: 'request_changes' }).success).toBe(false)
    expect(reviewDecisionSchema.safeParse({ decision: 'reject', notes: '   ' }).success).toBe(false)
    expect(reviewDecisionSchema.safeParse({ decision: 'request_changes', notes: 'Replace the Kiswahili track.' }).success).toBe(true)
  })

  it('requires a name when an external affiliation is supplied', () => {
    expect(reviewDecisionSchema.safeParse({
      decision: 'approve',
      externalReviewerAffiliation: 'Partner legal counsel',
    }).success).toBe(false)
    expect(reviewDecisionSchema.safeParse({
      decision: 'approve',
      externalReviewerName: 'Dr A. Otieno',
      externalReviewerAffiliation: 'Partner legal counsel',
    }).success).toBe(true)
  })
})

describe('reviewAssignmentSchema', () => {
  it('requires a primary reviewer and distinct second reviewer', () => {
    expect(reviewAssignmentSchema.safeParse({ reviewerId: '' }).success).toBe(false)
    expect(reviewAssignmentSchema.safeParse({ reviewerId: 'u-1', secondReviewerId: 'u-1' }).success).toBe(false)
    expect(reviewAssignmentSchema.safeParse({ reviewerId: 'u-1', secondReviewerId: 'u-2' }).success).toBe(true)
  })
})

describe('publish reason and schedule schemas', () => {
  it('requires a reason for unpublish, archive and revoke', () => {
    expect(audioReasonSchema.safeParse({ reason: '  ' }).success).toBe(false)
    expect(audioReasonSchema.safeParse({ reason: 'Rights review' }).success).toBe(true)
    expect(audioRevokeSchema.safeParse({ reason: 'Consent withdrawn' }).success).toBe(false)
    expect(audioRevokeSchema.safeParse({ reason: 'Consent withdrawn', evidenceReference: 'REL-2026-021' }).success).toBe(true)
  })

  it('requires a future RFC3339 schedule time', () => {
    const future = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
    const past = new Date(Date.now() - 60 * 60 * 1000).toISOString()
    expect(audioScheduleSchema.safeParse({ publishAt: future }).success).toBe(true)
    expect(audioScheduleSchema.safeParse({ publishAt: past }).success).toBe(false)
    expect(audioScheduleSchema.safeParse({ publishAt: 'not-a-date' }).success).toBe(false)
  })

  it('converts EAT datetime-local values to RFC3339 and back', () => {
    expect(eatDateTimeToIso('2026-12-01T12:00')).toBe('2026-12-01T09:00:00.000Z')
    expect(toEatDateTimeInput('2026-12-01T09:00:00.000Z')).toBe('2026-12-01T12:00')
    expect(formatEatDateTime('2026-12-01T09:00:00.000Z')).toContain('12:00')
    expect(formatEatDateTime('2026-12-01T09:00:00.000Z')).toContain('EAT')
  })
})

describe('collection schemas', () => {
  it('validates draft collection metadata', () => {
    expect(audioCollectionCreateSchema.safeParse({
      slug: 'voices-of-the-coast',
      title: 'Voices of the Coast',
      description: 'Coastal oral histories.',
    }).success).toBe(true)
    expect(audioCollectionCreateSchema.safeParse({
      slug: 'Voices of the Coast',
      title: 'Voices of the Coast',
    }).success).toBe(false)
  })

  it('validates collection updates and ordered story ids', () => {
    expect(audioCollectionUpdateSchema.safeParse({
      title: 'Voices of the Coast',
      displayOrder: 1,
      featured: true,
    }).success).toBe(true)
    expect(audioCollectionUpdateSchema.safeParse({
      title: 'Voices of the Coast',
      displayOrder: -1,
      featured: false,
    }).success).toBe(false)
    expect(audioCollectionStoriesSchema.safeParse({ storyIds: ['a-1', 'a-2'] }).success).toBe(true)
    expect(audioCollectionStoriesSchema.safeParse({ storyIds: ['a-1', 'a-1'] }).success).toBe(false)
  })
})
