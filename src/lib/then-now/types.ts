export type SiteStatus = 'draft' | 'published' | 'unpublished' | 'archived'
export type ExperienceStatus =
  | 'draft'
  | 'in_review'
  | 'approved'
  | 'scheduled'
  | 'published'
  | 'unpublished'
  | 'archived'
  | 'revoked'

export type AccessMode = 'camera_video' | 'video_only' | 'not_available'
export type Sensitivity = 'standard' | 'sensitive' | 'restricted'
export type SiteType = 'Historical' | 'Cultural'

export type ReadinessSection =
  | 'story'
  | 'media'
  | 'cards'
  | 'accessibility'
  | 'rights'
  | 'review'
  | 'identity'
  | 'policy'
  | 'location'
  | 'experiences'
  | 'sources'

export interface ReadinessItem {
  section: ReadinessSection
  label: string
}

export interface Readiness {
  blockers: ReadinessItem[]
  warnings: ReadinessItem[]
  readyToSubmit: boolean
  readyToPublish: boolean
}

export type TextCard = {
  at: number
  text: string
}

export type ReviewNote = {
  author: string
  role: string
  at: string
  note: string
}

export type ClientApproval = {
  name: string
  role: string
  at: string
}

export type ExternalReviewer = {
  name: string
  org: string
  decision: 'approved' | 'changes'
}

export type ReviewDecision = 'approved' | 'changes' | 'rejected' | 'returned' | null

export type RenditionStatus = 'Ready' | 'Missing' | 'Uploading'

export interface HeritageSite {
  id: string
  name: string
  slug: string
  county: string
  locality: string
  type: SiteType
  access: AccessMode
  sensitivity: Sensitivity
  status: SiteStatus
  managingAuthority: string
  destination: string
  photography: string
  culturalAuthority: string
  consent: string
  consentDate: string
  siteRules: string
  safety: string
  shortDescription: string
  fullDescription: string
  sources: string
  factCheck: string
  publicRights: string
  latitude: string
  longitude: string
  geofenceRadius: string
  standingPointNote: string
  image: string
  updatedAt: string
  experiences: string[]
}

export interface Experience {
  id: string
  siteId: string
  title: string
  promise: string
  story: string
  period: string
  duration: number
  contentNotes: string
  safetyNotes: string
  sources: string
  factCheck: string
  mode: 'camera_video' | 'video_only'
  status: ExperienceStatus
  liveRevision: number
  draftRevision: number
  draftStatus: 'draft' | 'in_review' | 'approved' | 'published'
  uploadedBy: string
  submittedBy: string
  submittedAt: string
  reviewer: string
  secondReviewer: ExternalReviewer | null
  secondReviewerApproved: boolean
  clientApproval: ClientApproval | null
  languages: string[]
  rightsExpiry: string
  sensitivity: Sensitivity
  videoMaster: string
  videoSize: string
  renditions: Record<string, RenditionStatus>
  /**
   * Object keys from the Go revision snapshot. Present only when the
   * experience was loaded from the API; the fixture demo has no media keys.
   */
  renditionKeys?: Record<string, string>
  posterKey?: string
  captionKeys?: Record<string, string>
  transcriptKey?: string
  audioDescriptionKey?: string
  poster: boolean
  captions: { en: boolean; sw: boolean }
  transcript: boolean
  audioDescription: boolean
  rights: string
  rightsEvidence: string
  consent: string
  textCards: TextCard[]
  updatedAt: string
  lastSavedAt: string
  reviewNotes: ReviewNote[]
  lastDecision: ReviewDecision
  scheduledAt?: string
  scheduleNote?: string
  diff: {
    live: string[]
    draft: string[]
    changes: number[]
  }
  revisedSinceDecision?: boolean
  rejectedSnapshot?: string
}

export interface AuditEvent {
  id: string
  entity: string
  type: string
  title: string
  meta: string
  note?: string
}

export type Scenario = 'default' | 'empty' | 'loading' | 'error' | 'offline' | 'conflict' | 'readonly'

export interface ThenNowState {
  sites: HeritageSite[]
  experiences: Record<string, Experience>
  audit: AuditEvent[]
}

export const ACCESS_LABEL: Record<AccessMode, string> = {
  camera_video: 'Camera + video',
  video_only: 'Video only',
  not_available: 'Not available yet',
}

export const SENSITIVITY_LABEL: Record<Sensitivity, string> = {
  standard: 'Standard',
  sensitive: 'Sensitive',
  restricted: 'Restricted',
}

export const STATUS_LABEL: Record<string, string> = {
  draft: 'Draft',
  in_review: 'In review',
  approved: 'Approved',
  scheduled: 'Scheduled',
  published: 'Published',
  unpublished: 'Unpublished',
  archived: 'Archived',
  revoked: 'Revoked',
  missing: 'Missing',
  ready: 'Ready',
}

export const SECTION_LABEL: Record<ReadinessSection, string> = {
  story: 'Story',
  media: 'Video & media',
  cards: 'Text cards',
  accessibility: 'Accessibility',
  rights: 'Rights & review',
  review: 'Review',
  identity: 'Identity',
  policy: 'Policy',
  location: 'Location',
  experiences: 'Experiences',
  sources: 'Sources',
}
