import { describe, it, expect } from 'vitest'
import {
  audioStoryDraftCreateSchema,
  audioRightsSchema,
  audioStoryCreateSchema,
  audioStoryDetailsSchema,
  audioTrackSchema,
  audioTranscriptSchema,
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
