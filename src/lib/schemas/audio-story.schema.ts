import { z } from 'zod'
import {
  AUDIO_THEMES,
  RIGHTS_BASES,
  RISK_TIERS,
} from '#/lib/api/audio-stories'

const requiredText = (message: string) => z.string().trim().min(1, message)

export const slugSchema = z
  .string()
  .trim()
  .min(3, 'Slug must be at least 3 characters')
  .max(120, 'Slug is too long')
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Use lowercase letters, numbers, and hyphens')

const placeScopeSchema = z.enum(['national', 'county', 'multi_county'])

export const placementFieldsSchema = z
  .object({
    placeScope: placeScopeSchema,
    counties: z.array(z.string().trim().min(1)).default([]),
  })
  .superRefine((value, ctx) => {
    if (value.placeScope === 'county' && value.counties.length !== 1) {
      ctx.addIssue({ code: 'custom', path: ['counties'], message: 'Choose exactly one county' })
    }
    if (value.placeScope === 'multi_county' && value.counties.length < 2) {
      ctx.addIssue({ code: 'custom', path: ['counties'], message: 'Choose at least two counties' })
    }
    if (value.placeScope === 'national' && value.counties.length > 0) {
      ctx.addIssue({ code: 'custom', path: ['counties'], message: 'National stories do not list counties' })
    }
  })

export const rightsFieldsSchema = z
  .object({
    rightsBasis: z.enum(RIGHTS_BASES),
    rightsHolder: requiredText('Rights holder is required'),
    licenceReference: z.string().trim().optional(),
    rightsExpiresAt: z.string().trim().optional(),
  })
  .superRefine((value, ctx) => {
    if (
      (value.rightsBasis === 'partner_permission' || value.rightsBasis === 'licensed') &&
      !value.licenceReference
    ) {
      ctx.addIssue({
        code: 'custom',
        path: ['licenceReference'],
        message: 'A licence or permission reference is required for this rights basis',
      })
    }
  })

export const audioStoryDraftCreateSchema = z.object({
  slug: slugSchema,
  title: requiredText('Title is required'),
  summary: requiredText('Summary is required'),
  theme: z.enum(AUDIO_THEMES),
  producer: requiredText('Producer is required'),
  communitySource: requiredText('Community or source is required'),
  collectionId: z.string().trim().optional(),
})

export const audioStoryCreateSchema = z
  .object({
    slug: slugSchema,
    title: requiredText('Title is required'),
    subtitle: z.string().trim().optional(),
    summary: requiredText('Summary is required'),
    theme: z.enum(AUDIO_THEMES),
    producer: requiredText('Producer is required'),
    communitySource: requiredText('Community or source is required'),
    collectionId: z.string().trim().optional(),
    riskTier: z.enum(RISK_TIERS).default('standard'),
  })
  .and(placementFieldsSchema)
  .and(rightsFieldsSchema)

export const audioStoryDetailsSchema = z.object({
  title: requiredText('Title is required'),
  subtitle: z.string().trim().optional(),
  summary: requiredText('Summary is required'),
  theme: z.enum(AUDIO_THEMES),
  producer: requiredText('Producer is required'),
  communitySource: requiredText('Community or source is required'),
  collectionId: z.string().trim().optional(),
  collectionOrder: z.number().int().min(0, 'Order cannot be negative'),
})

export const audioStoryMetadataSchema = z
  .object({
    title: requiredText('Title is required'),
    summary: requiredText('Summary is required'),
  })
  .passthrough()

export const audioTrackSchema = z.object({
  language: z.enum(['en', 'sw']),
  audioObjectKey: requiredText('Upload an audio file before saving the track'),
  narrator: requiredText('Narrator is required'),
  narratorConsentDate: requiredText('Consent date is required'),
  narratorConsentReference: requiredText('Consent reference is required'),
  durationSeconds: z
    .number()
    .int()
    .min(30, 'Audio must be at least 30 seconds')
    .max(3600, 'Audio must be 60 minutes or shorter'),
  recordedAt: z.string().trim().optional(),
  format: z.string().trim().optional(),
  sizeBytes: z.number().int().positive().optional(),
  bitrateKbps: z.number().int().positive().optional(),
})

export const transcriptParagraphSchema = z.object({
  text: requiredText('Paragraph text is required'),
  speaker: z.string().trim().optional(),
  startSeconds: z.number().min(0, 'Cue cannot be negative').optional(),
})

export const audioTranscriptSchema = z
  .object({
    paragraphs: z.array(transcriptParagraphSchema).min(1, 'Add at least one paragraph'),
    durationSeconds: z.number().int().positive().optional(),
  })
  .superRefine((value, ctx) => {
    let previous = -1
    value.paragraphs.forEach((paragraph, index) => {
      if (paragraph.startSeconds === undefined) return
      if (paragraph.startSeconds < previous) {
        ctx.addIssue({
          code: 'custom',
          path: ['paragraphs', index, 'startSeconds'],
          message: 'Cue points must increase',
        })
      }
      if (value.durationSeconds && paragraph.startSeconds >= value.durationSeconds) {
        ctx.addIssue({
          code: 'custom',
          path: ['paragraphs', index, 'startSeconds'],
          message: 'Cue is beyond the track duration',
        })
      }
      previous = paragraph.startSeconds
    })
  })

export const audioRightsSchema = z
  .object({
    rightsBasis: z.enum(RIGHTS_BASES),
    rightsHolder: requiredText('Rights holder is required'),
    licenceReference: z.string().trim().optional(),
    rightsExpiresAt: z.string().trim().optional(),
    riskTier: z.enum(RISK_TIERS),
    contentNoteCategories: z.array(z.string()),
    contentNoteText: z.string().max(200, 'Content note must be 200 characters or fewer').optional(),
  })
  .superRefine((value, ctx) => {
    if (
      (value.rightsBasis === 'partner_permission' || value.rightsBasis === 'licensed') &&
      !value.licenceReference
    ) {
      ctx.addIssue({
        code: 'custom',
        path: ['licenceReference'],
        message: 'A licence or permission reference is required for this rights basis',
      })
    }
  })

export type AudioStoryDraftCreateInput = z.infer<typeof audioStoryDraftCreateSchema>
export type AudioStoryCreateInput = z.infer<typeof audioStoryCreateSchema>
export type AudioStoryDetailsInput = z.infer<typeof audioStoryDetailsSchema>
export type AudioTrackInput = z.infer<typeof audioTrackSchema>
export type AudioTranscriptInput = z.infer<typeof audioTranscriptSchema>
export type AudioRightsInput = z.infer<typeof audioRightsSchema>

export function fieldErrors(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {}
  for (const issue of error.issues) {
    const key = issue.path.join('.') || '_'
    if (!out[key]) out[key] = issue.message
  }
  return out
}

export function parseCue(value: string): number | undefined {
  const trimmed = value.trim()
  if (!trimmed) return undefined
  if (trimmed.includes(':')) {
    const parts = trimmed.split(':').map(Number)
    if (parts.some((part) => Number.isNaN(part))) return undefined
    return parts.reduce((total, part) => total * 60 + part, 0)
  }
  const seconds = Number(trimmed)
  return Number.isNaN(seconds) ? undefined : seconds
}

export function formatCue(seconds: number | undefined): string {
  if (seconds === undefined) return ''
  const whole = Math.max(0, Math.floor(seconds))
  const minutes = Math.floor(whole / 60)
  const rest = whole % 60
  return `${minutes}:${rest.toString().padStart(2, '0')}`
}

export function formatDuration(seconds: number | undefined): string {
  if (!seconds) return '—'
  const total = Math.round(seconds)
  const minutes = Math.floor(total / 60)
  const rest = total % 60
  return `${minutes}:${rest.toString().padStart(2, '0')}`
}
