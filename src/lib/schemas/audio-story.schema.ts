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

export const reviewDecisionSchema = z
  .object({
    decision: z.enum(['approve', 'request_changes', 'reject']),
    notes: z.string().trim().max(4000, 'Review notes are too long').optional(),
    externalReviewerName: z.string().trim().max(200, 'External reviewer name is too long').optional(),
    externalReviewerAffiliation: z.string().trim().max(200, 'Affiliation is too long').optional(),
  })
  .superRefine((value, ctx) => {
    if (value.decision !== 'approve' && !value.notes) {
      ctx.addIssue({
        code: 'custom',
        path: ['notes'],
        message: value.decision === 'request_changes'
          ? 'Explain what the author must change'
          : 'Record why this revision is being rejected',
      })
    }
    if (!value.externalReviewerName && value.externalReviewerAffiliation) {
      ctx.addIssue({
        code: 'custom',
        path: ['externalReviewerName'],
        message: 'Add the external reviewer name with the affiliation',
      })
    }
  })

export const reviewAssignmentSchema = z
  .object({
    reviewerId: requiredText('Choose a reviewer'),
    secondReviewerId: z.string().trim().optional(),
    reason: z.string().trim().optional(),
  })
  .superRefine((value, ctx) => {
    if (value.secondReviewerId && value.secondReviewerId === value.reviewerId) {
      ctx.addIssue({
        code: 'custom',
        path: ['secondReviewerId'],
        message: 'The second reviewer must be a different person',
      })
    }
  })

export const audioScheduleSchema = z
  .object({
    publishAt: z
      .string()
      .trim()
      .min(1, 'Choose a publish date and time')
      .refine((value) => !Number.isNaN(Date.parse(value)), 'Enter a valid date and time'),
  })
  .superRefine((value, ctx) => {
    const time = Date.parse(value.publishAt)
    if (!Number.isNaN(time) && time <= Date.now()) {
      ctx.addIssue({
        code: 'custom',
        path: ['publishAt'],
        message: 'Schedule a time in the future',
      })
    }
  })

export const audioReasonSchema = z.object({
  reason: requiredText('A reason is required'),
})

export const audioRevokeSchema = z.object({
  reason: requiredText('A reason is required'),
  evidenceReference: requiredText('Cite the evidence for revocation'),
})

export const audioCollectionCreateSchema = z.object({
  slug: slugSchema,
  title: requiredText('Title is required'),
  description: z.string().trim().max(1000, 'Description is too long').optional(),
  coverMediaId: z.string().trim().optional(),
})

export const audioCollectionUpdateSchema = z.object({
  title: requiredText('Title is required'),
  description: z.string().trim().max(1000, 'Description is too long').optional(),
  displayOrder: z.number().int().min(0, 'Order cannot be negative'),
  featured: z.boolean(),
  coverMediaId: z.string().trim().optional(),
})

export const audioCollectionStoriesSchema = z.object({
  storyIds: z.array(z.string().min(1)).refine(
    (ids) => new Set(ids).size === ids.length,
    'A story can only appear once in a collection',
  ),
})

export type ReviewDecisionInput = z.infer<typeof reviewDecisionSchema>
export type ReviewAssignmentInput = z.infer<typeof reviewAssignmentSchema>
export type AudioScheduleInput = z.infer<typeof audioScheduleSchema>
export type AudioCollectionCreateInput = z.infer<typeof audioCollectionCreateSchema>
export type AudioCollectionUpdateInput = z.infer<typeof audioCollectionUpdateSchema>

const EAT_TIME_ZONE = 'Africa/Nairobi'

function eatParts(value: string): Record<string, string> {
  const date = new Date(value)
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: EAT_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(date)
  return Object.fromEntries(parts.map((part) => [part.type, part.value]))
}

/** Render an instant in East Africa Time, e.g. `17 Nov 2026, 14:30 EAT`. */
export function formatEatDateTime(value?: string): string {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '—'
  return `${date.toLocaleString('en-GB', {
    timeZone: EAT_TIME_ZONE,
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })} EAT`
}

/** Convert an instant to a `datetime-local` value in East Africa Time. */
export function toEatDateTimeInput(value?: string): string {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  const parts = eatParts(date.toISOString())
  return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}`
}

/** Convert a `datetime-local` value entered as EAT into RFC3339. */
export function eatDateTimeToIso(value: string): string | undefined {
  const trimmed = value.trim()
  if (!trimmed) return undefined
  const normalized = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(trimmed) ? `${trimmed}:00` : trimmed
  const date = new Date(`${normalized}+03:00`)
  if (Number.isNaN(date.getTime())) return undefined
  return date.toISOString()
}


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
