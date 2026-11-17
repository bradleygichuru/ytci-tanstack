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

export type CollectionStatus = 'draft' | 'scheduled' | 'published' | 'unpublished' | 'archived'

export interface AudioStoryCollection {
  id: string
  slug: string
  title: string
  description: string
  status: CollectionStatus
  displayOrder: number
  featured: boolean
  coverMediaId?: string
  coverObjectKey?: string
  publishAt?: string
  publishedAt?: string
  storyCount?: number
  publishedStoryCount?: number
  createdAt?: string
  updatedAt?: string
}

export interface AudioCollectionDetail {
  collection: AudioStoryCollection
  stories: AudioStory[]
}

export interface CreateAudioStoryCollectionInput {
  slug: string
  title: string
  description: string
  coverMediaId?: string
}

export interface UpdateAudioStoryCollectionInput {
  title?: string
  description?: string
  coverMediaId?: string
  displayOrder?: number
  featured?: boolean
}

export type ReviewQueueFilter = 'all' | 'unassigned' | 'mine' | 'sensitive' | 'restricted'
export type ReviewDecision = 'approve' | 'request_changes' | 'reject'

export interface AudioReviewQueueItem {
  storyId: string
  storyTitle: string
  revisionId: string
  riskTier: RiskTier
  submittedAt?: string
  assignedReviewerId?: string
  assignedReviewerName?: string
  secondReviewerId?: string
  secondReviewerName?: string
  languages: Language[]
  collectionTitle?: string
}

export interface AudioReviewQueueCounts {
  unassigned: number
  mine: number
  sensitive: number
  restricted: number
}

export interface AudioReviewQueueResponse {
  items: AudioReviewQueueItem[]
  counts: AudioReviewQueueCounts
}

export interface AudioRevisionReview {
  id: string
  reviewerId?: string
  reviewerName?: string
  externalReviewerName?: string
  externalReviewerAffiliation?: string
  decision: ReviewDecision
  riskTier: RiskTier
  notes?: string
  createdAt: string
}

export interface AudioRevisionReviews {
  items: AudioRevisionReview[]
  approvals: number
  requiredApprovals: number
}

export interface AssignReviewerInput {
  reviewerId: string
  secondReviewerId?: string
  reason?: string
}

export interface ReviewDecisionInput {
  decision: ReviewDecision
  notes?: string
  externalReviewerName?: string
  externalReviewerAffiliation?: string
}

export interface AudioReviewActionResult {
  status?: string
  needsSecondReviewer?: boolean
  approvals?: number
  requiredApprovals?: number
}

export interface AudioPublishActionResult {
  status?: string
  contentVersion?: number
  publishAt?: string
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

    getCollection: (id: string) =>
      apiRequest<AudioCollectionDetail>(config, `/v1/audio-story-collections/${id}`),

    createCollection: (body: CreateAudioStoryCollectionInput) =>
      apiRequest<{ id: string; slug: string; status: string }>(config, '/v1/audio-story-collections', {
        method: 'POST',
        body,
      }),

    updateCollection: (id: string, body: UpdateAudioStoryCollectionInput) =>
      apiRequest<{ status: string; updatedAt?: string }>(config, `/v1/audio-story-collections/${id}`, {
        method: 'PATCH',
        body,
      }),

    setCollectionStories: (id: string, storyIds: string[]) =>
      apiRequest<{ status: string }>(config, `/v1/audio-story-collections/${id}/stories`, {
        method: 'POST',
        body: { storyIds },
      }),

    publishCollection: (id: string) =>
      apiRequest<{ status: string }>(config, `/v1/audio-story-collections/${id}/publish`, {
        method: 'POST',
      }),

    scheduleCollection: (id: string, publishAt: string) =>
      apiRequest<{ status: string; publishAt?: string }>(
        config,
        `/v1/audio-story-collections/${id}/schedule`,
        { method: 'POST', body: { publishAt } },
      ),

    unpublishCollection: (id: string, reason: string) =>
      apiRequest<{ status: string }>(config, `/v1/audio-story-collections/${id}/unpublish`, {
        method: 'POST',
        body: { reason },
      }),

    archiveCollection: (id: string, reason: string) =>
      apiRequest<{ status: string }>(config, `/v1/audio-story-collections/${id}/archive`, {
        method: 'POST',
        body: { reason },
      }),

    deleteCollection: (id: string) =>
      apiRequest<void>(config, `/v1/audio-story-collections/${id}`, { method: 'DELETE' }),

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

    withdraw: (id: string, revisionId: string, reason: string) =>
      apiRequest<AudioReviewActionResult>(config, `/v1/audio-stories/${id}/revisions/${revisionId}/withdraw`, {
        method: 'POST',
        body: { reason },
      }),

    reviewQueue: (status: ReviewQueueFilter = 'all') =>
      apiRequest<AudioReviewQueueResponse>(config, '/v1/audio-stories/review-queue', {
        params: { status },
      }),

    reviews: (id: string, revisionId: string) =>
      apiRequest<AudioRevisionReviews>(
        config,
        `/v1/audio-stories/${id}/revisions/${revisionId}/reviews`,
      ),

    assignReviewer: (id: string, revisionId: string, body: AssignReviewerInput) =>
      apiRequest<AudioReviewActionResult>(config, `/v1/audio-stories/${id}/revisions/${revisionId}/assign`, {
        method: 'POST',
        body,
      }),

    recuse: (id: string, revisionId: string, reason: string) =>
      apiRequest<AudioReviewActionResult>(config, `/v1/audio-stories/${id}/revisions/${revisionId}/recuse`, {
        method: 'POST',
        body: { reason },
      }),

    review: (id: string, revisionId: string, body: ReviewDecisionInput) =>
      apiRequest<AudioReviewActionResult>(config, `/v1/audio-stories/${id}/revisions/${revisionId}/review`, {
        method: 'POST',
        body,
      }),

    publishRevision: (id: string, revisionId: string) =>
      apiRequest<AudioPublishActionResult>(config, `/v1/audio-stories/${id}/revisions/${revisionId}/publish`, {
        method: 'POST',
      }),

    scheduleRevision: (id: string, revisionId: string, publishAt: string) =>
      apiRequest<AudioPublishActionResult>(
        config,
        `/v1/audio-stories/${id}/revisions/${revisionId}/schedule`,
        { method: 'POST', body: { publishAt } },
      ),

    cancelSchedule: (id: string, revisionId: string, reason: string) =>
      apiRequest<AudioPublishActionResult>(
        config,
        `/v1/audio-stories/${id}/revisions/${revisionId}/cancel-schedule`,
        { method: 'POST', body: { reason } },
      ),

    unpublish: (id: string, reason: string) =>
      apiRequest<AudioPublishActionResult>(config, `/v1/audio-stories/${id}/unpublish`, {
        method: 'POST',
        body: { reason },
      }),

    republish: (id: string) =>
      apiRequest<AudioPublishActionResult>(config, `/v1/audio-stories/${id}/republish`, {
        method: 'POST',
      }),

    archive: (id: string, reason: string) =>
      apiRequest<AudioPublishActionResult>(config, `/v1/audio-stories/${id}/archive`, {
        method: 'POST',
        body: { reason },
      }),

    revoke: (id: string, reason: string, evidenceReference: string) =>
      apiRequest<AudioPublishActionResult>(config, `/v1/audio-stories/${id}/revoke`, {
        method: 'POST',
        body: { reason, evidenceReference },
      }),

    restore: (id: string) =>
      apiRequest<{ revisionId: string; status: string }>(config, `/v1/audio-stories/${id}/restore`, {
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
