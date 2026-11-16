import type { ApiConfig } from './client'
import { apiRequest } from './client'

export const AUDIO_THEMES = [
  'culture_heritage',
  'nature_wildlife',
  'history_places',
  'conservation_action',
  'youth_perspectives',
] as const

export const AUDIO_THEME_LABELS: Record<(typeof AUDIO_THEMES)[number], string> = {
  culture_heritage: 'Culture & Heritage',
  nature_wildlife: 'Nature & Wildlife',
  history_places: 'History & Places',
  conservation_action: 'Conservation in Action',
  youth_perspectives: 'Youth Perspectives',
}

export const RIGHTS_BASES = ['ytci_owned', 'partner_permission', 'licensed', 'public_domain'] as const
export const RIGHTS_BASIS_LABELS: Record<(typeof RIGHTS_BASES)[number], string> = {
  ytci_owned: 'YTCI-owned',
  partner_permission: 'Partner permission',
  licensed: 'Licensed',
  public_domain: 'Public domain',
}

export const RISK_TIERS = ['standard', 'sensitive', 'restricted'] as const
export type RiskTier = (typeof RISK_TIERS)[number]

export type AudioTheme = (typeof AUDIO_THEMES)[number]
export type RightsBasis = (typeof RIGHTS_BASES)[number]
export type StoredRightsBasis = RightsBasis | 'unverified' 
export type RevisionStatus = 'draft' | 'in_review' | 'approved' | 'scheduled' | 'published' | 'superseded' | 'cancelled'
export type StoryStatus = 'draft' | 'in_review' | 'scheduled' | 'published' | 'unpublished' | 'revoked' | 'archived'
export type Language = 'en' | 'sw'

export const CONTENT_NOTE_CATEGORIES = [
  'colonial_or_oppression_history',
  'sensitive_cultural_practices',
  'violence_or_conflict',
  'death_or_grief',
  'distressing_animal_content',
  'strong_language',
] as const

export const CONTENT_NOTE_LABELS: Record<(typeof CONTENT_NOTE_CATEGORIES)[number], string> = {
  colonial_or_oppression_history: 'Colonial or oppression history',
  sensitive_cultural_practices: 'Sensitive cultural practices',
  violence_or_conflict: 'Violence or conflict',
  death_or_grief: 'Death or grief',
  distressing_animal_content: 'Distressing animal content',
  strong_language: 'Strong language',
}

export interface TranscriptParagraph {
  text: string
  speaker?: string
  startSeconds?: number
}

export interface AudioTrack {
  id: string
  language: Language
  mediaAssetId?: string
  audioObjectKey: string
  durationSeconds: number
  narrator: string
  narratorConsentDate?: string
  narratorConsentReference?: string
  sizeBytes?: number
  format?: string
  bitrateKbps?: number
  recordedAt?: string
}

export interface AudioTranscript {
  language: Language
  paragraphs: TranscriptParagraph[]
  source?: string
  reviewedAt?: string
  reviewedBy?: string
}

export interface AudioRevision {
  id: string
  storyId: string
  status: RevisionStatus
  contentVersion: number
  placeScope: 'national' | 'county' | 'multi_county'
  counties: string[]
  destinationIds: string[]
  contentNoteCategories: string[]
  contentNoteText?: string
  rightsBasis: StoredRightsBasis
  rightsHolder: string
  licenceReference?: string
  rightsExpiresAt?: string
  riskTier: RiskTier
  attestedBy?: string
  attestedAt?: string
  assignedReviewerId?: string
  assignedReviewerName?: string
  secondReviewerId?: string
  submittedAt?: string
  approvedAt?: string
  publishAt?: string
  publishedAt?: string
  revokedAt?: string
  revocationReason?: string
  createdBy?: string
  createdAt?: string
  updatedAt?: string
  tracks: AudioTrack[]
  transcripts: AudioTranscript[]
}

export interface AudioStory {
  id: string
  slug: string
  title: string
  subtitle?: string
  summary: string
  theme: AudioTheme
  tags: string[]
  coverMediaId?: string
  coverObjectKey?: string
  producer: string
  communitySource: string
  recordedAt?: string
  collectionId?: string
  collectionTitle?: string
  collectionOrder: number
  featured: boolean
  status: StoryStatus
  contentVersion: number
  liveRevisionId?: string
  liveRevisionStatus?: RevisionStatus
  openRevisionId?: string
  openRevisionStatus?: RevisionStatus
  riskTier?: RiskTier
  languages?: Language[]
  assignedReviewerId?: string
  assignedReviewerName?: string
  rightsExpiresAt?: string
  createdAt?: string
  updatedAt?: string
}

export interface AudioStoryDetail {
  story: AudioStory
  openRevision: AudioRevision | null
  liveRevision: AudioRevision | null
}

export interface ReadinessItem {
  code: string
  label: string
  section: string
}

export interface AudioReadiness {
  ready: boolean
  blocking: ReadinessItem[]
  warnings: ReadinessItem[]
}

export interface AudioStoryEvent {
  id: string
  revisionId?: string
  trackId?: string
  actorId?: string
  actorName?: string
  action: string
  fromStatus?: string
  toStatus?: string
  reason?: string
  metadata?: Record<string, unknown>
  createdAt: string
}

export interface CreateAudioStoryInput {
  slug: string
  title: string
  subtitle?: string
  summary: string
  theme: AudioTheme
  tags?: string[]
  coverMediaId?: string
  coverObjectKey?: string
  producer: string
  communitySource: string
  recordedAt?: string
  collectionId?: string
  placeScope?: 'national' | 'county' | 'multi_county'
  counties?: string[]
  rightsBasis?: StoredRightsBasis
  rightsHolder?: string
  licenceReference?: string
  riskTier?: RiskTier
}

export interface UpdateAudioStoryInput {
  title?: string
  subtitle?: string
  summary?: string
  theme?: AudioTheme
  tags?: string[]
  coverMediaId?: string
  producer?: string
  communitySource?: string
  recordedAt?: string
  collectionId?: string
  collectionOrder?: number
  featured?: boolean
  expectedUpdatedAt?: string
}

export interface UpdateAudioRevisionInput {
  placeScope?: 'national' | 'county' | 'multi_county'
  counties?: string[]
  contentNoteCategories?: string[]
  contentNoteText?: string
  rightsBasis?: RightsBasis
  rightsHolder?: string
  licenceReference?: string
  rightsExpiresAt?: string
  riskTier?: RiskTier
  expectedUpdatedAt?: string
}

export interface SaveTrackInput {
  language: Language
  mediaAssetId?: string
  audioObjectKey: string
  durationSeconds: number
  narrator: string
  narratorConsentDate?: string
  narratorConsentReference?: string
  format?: string
  recordedAt?: string
  sizeBytes?: number
  bitrateKbps?: number
}

export interface UpdateTrackInput {
  durationSeconds?: number
  narrator?: string
  narratorConsentDate?: string
  narratorConsentReference?: string
  format?: string
  recordedAt?: string
  sizeBytes?: number
  bitrateKbps?: number
}

export interface AudioStoryCollection {
  id: string
  slug: string
  title: string
  description: string
  status: 'draft' | 'scheduled' | 'published' | 'unpublished' | 'archived'
  displayOrder: number
  featured: boolean
}

export interface AudioStoryListParams {
  status?: string
  collectionId?: string
  q?: string
  [key: string]: string | undefined
}

export function audioStoriesApi(config: ApiConfig) {
  return {
    listCollections: () =>
      apiRequest<{ items: AudioStoryCollection[] }>(config, '/v1/audio-story-collections'),

    list: (params?: AudioStoryListParams) =>
      apiRequest<{ items: AudioStory[] }>(config, '/v1/audio-stories', { params }),

    get: (id: string) =>
      apiRequest<AudioStoryDetail>(config, `/v1/audio-stories/${id}`),

    create: (body: CreateAudioStoryInput) =>
      apiRequest<{ id: string; revisionId: string; status: string }>(config, '/v1/audio-stories', {
        method: 'POST',
        body,
      }),

    update: (id: string, body: UpdateAudioStoryInput) =>
      apiRequest<{ status: string; updatedAt?: string }>(config, `/v1/audio-stories/${id}`, {
        method: 'PATCH',
        body,
      }),

    audit: (id: string) =>
      apiRequest<{ items: AudioStoryEvent[] }>(config, `/v1/audio-stories/${id}/audit`),

    revisions: (id: string) =>
      apiRequest<{ items: Array<Record<string, unknown>> }>(config, `/v1/audio-stories/${id}/revisions`),

    createRevision: (id: string, sourceRevisionId?: string) =>
      apiRequest<{ revisionId: string; sourceRevisionId: string; status: string }>(
        config,
        `/v1/audio-stories/${id}/revisions`,
        { method: 'POST', body: sourceRevisionId ? { sourceRevisionId } : {} },
      ),

    getRevision: (id: string, revisionId: string) =>
      apiRequest<AudioRevision>(config, `/v1/audio-stories/${id}/revisions/${revisionId}`),

    updateRevision: (id: string, revisionId: string, body: UpdateAudioRevisionInput) =>
      apiRequest<{ status: string; updatedAt?: string }>(config, `/v1/audio-stories/${id}/revisions/${revisionId}`, {
        method: 'PATCH',
        body,
      }),

    readiness: (id: string, revisionId: string) =>
      apiRequest<AudioReadiness>(config, `/v1/audio-stories/${id}/revisions/${revisionId}/readiness`),

    submit: (id: string, revisionId: string) =>
      apiRequest<{ status: string }>(config, `/v1/audio-stories/${id}/revisions/${revisionId}/submit`, {
        method: 'POST',
      }),

    saveTrack: (id: string, revisionId: string, body: SaveTrackInput) =>
      apiRequest<{ status: string; trackId: string }>(
        config,
        `/v1/audio-stories/${id}/revisions/${revisionId}/tracks`,
        { method: 'POST', body },
      ),

    updateTrack: (id: string, revisionId: string, trackId: string, body: UpdateTrackInput) =>
      apiRequest<{ status: string }>(
        config,
        `/v1/audio-stories/${id}/revisions/${revisionId}/tracks/${trackId}`,
        { method: 'PATCH', body },
      ),

    removeTrack: (id: string, revisionId: string, trackId: string, reason: string) =>
      apiRequest<{ status: string }>(
        config,
        `/v1/audio-stories/${id}/revisions/${revisionId}/tracks/${trackId}`,
        { method: 'DELETE', params: { reason } },
      ),

    saveTranscript: (id: string, revisionId: string, language: Language, paragraphs: TranscriptParagraph[]) =>
      apiRequest<{ status: string }>(
        config,
        `/v1/audio-stories/${id}/revisions/${revisionId}/transcripts/${language}`,
        { method: 'PUT', body: { paragraphs } },
      ),
  }
}
