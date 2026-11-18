import type { ApiConfig } from './client'
import { apiRequest } from './client'
import { ApiErrorResponse } from './types'
import type {
  AccessMode,
  AuditEvent,
  ClientApproval,
  Experience,
  ExperienceStatus,
  ExternalReviewer,
  HeritageSite,
  Readiness,
  ReadinessItem,
  ReviewDecision,
  ReviewNote,
  Sensitivity,
  SiteStatus,
  SiteType,
  TextCard,
} from '#/lib/then-now/types'

/**
 * Wire types for the Go admin API (`/v1/then-now/*`).
 *
 * These mirror `internal/thennow/types.go` and the handler DTOs. The admin
 * store keeps using the richer `HeritageSite` / `Experience` UI models, so
 * every response goes through a mapper below.
 */
export interface ThenNowApiSite {
  id: string
  name: string
  slug: string
  county: string
  locality: string
  siteType: string
  accessMode: string
  sensitivity: string
  status: string
  managingAuthority: string
  destinationId: string | null
  photographyPolicy: string
  culturalAuthority: string
  consentRecord: string
  consentDate: string
  siteRules: string
  safetyNotes: string
  shortDescription: string
  fullDescription: string
  sources: string
  factCheck: string
  publicRightsLine: string
  latitude: number
  longitude: number
  geofenceRadiusM: number
  standingPointNote: string
  imageKey: string
  publishedExperiences: number
}

export interface ThenNowApiReadiness {
  blockers: ReadinessItem[]
  warnings: ReadinessItem[]
  readyToSubmit: boolean
  readyToPublish: boolean
}

export interface ThenNowApiSiteExperience {
  id: string
  title: string
  status: string
  liveRevisionNumber: number
  openRevisionNumber: number
  openStatus: string
  primaryMode: string
  languages: string[]
  rightsExpiry: string
}

export interface ThenNowApiSnapshot {
  title?: string
  promise?: string
  story?: string
  period?: string
  duration?: number
  contentNotes?: string
  safetyNotes?: string
  sources?: string
  factCheck?: string
  primaryMode?: string
  languages?: string[]
  rightsRecord?: string
  rightsEvidence?: string
  rightsExpiry?: string
  consentRecord?: string
  sensitivity?: string
  videoMaster?: string
  videoSize?: string
  renditions?: Record<string, string>
  renditionKeys?: Record<string, string>
  poster?: boolean
  posterKey?: string
  captions?: Record<string, boolean>
  captionKeys?: Record<string, string>
  transcript?: boolean
  transcriptKey?: string
  audioDescription?: boolean
  audioDescriptionKey?: string
  textCards?: TextCard[]
}

export interface ThenNowApiRevision {
  id: string
  revisionNumber: number
  status: string
  snapshot: ThenNowApiSnapshot
  reviewNotes: ReviewNote[]
  reviewerId: string
  reviewer: string
  submittedById: string
  submittedBy: string
  uploadedById: string
  uploadedBy: string
  submittedAt: string
  lastDecision: string
  secondReviewer: ExternalReviewer | null
  secondReviewerApproved: boolean
  clientApproval: ClientApproval | null
  scheduledAt: string
  scheduleNote: string
  publishedAt: string
}

export interface ThenNowApiExperienceDetail {
  id: string
  siteId: string
  siteName: string
  title: string
  status: string
  liveRevisionNumber: number
  openRevisionNumber: number
  openRevision: ThenNowApiRevision | null
  liveRevision: ThenNowApiRevision | null
  site: ThenNowApiSite
  readiness: ThenNowApiReadiness
}

export interface ThenNowApiExperienceSummary {
  id: string
  siteId: string
  siteName: string
  title: string
  status: string
  liveRevisionNumber: number
  openRevisionNumber: number
  openStatus: string
  primaryMode: string
  languages: string[]
  rightsExpiry: string
  sensitivity: string
  updatedAt: string
}

export interface ThenNowApiReviewItem {
  revisionId: string
  experienceId: string
  siteId: string
  siteName: string
  title: string
  revisionNumber: number
  submittedBy: string
  submittedAt: string
  sensitivity: string
  reviewer: string
}

export interface ThenNowApiAuditEvent {
  id: string
  entityType: string
  entityId: string
  eventType: string
  actorId: string
  summary: string
  metadata: Record<string, unknown>
  createdAt: string
}

export type ThenNowSiteFilters = {
  county?: string
  accessMode?: string
  sensitivity?: string
  status?: string
  q?: string
}

export type ThenNowExperienceFilters = {
  siteId?: string
  status?: string
  mode?: string
  review?: string
  language?: string
  q?: string
}

export type ThenNowAuditFilters = {
  entityType?: string
  entityId?: string
}

export type ThenNowReviewFilter = 'all' | 'unassigned' | 'mine'

export interface ThenNowApiSiteList {
  items: ThenNowApiSite[]
}

export interface ThenNowApiSiteDetail {
  site: ThenNowApiSite
  experiences: ThenNowApiSiteExperience[]
  readiness: ThenNowApiReadiness
}

export interface ThenNowApiExperienceList {
  items: ThenNowApiExperienceSummary[]
}

export interface ThenNowApiReviewList {
  items: ThenNowApiReviewItem[]
}

export interface ThenNowApiAuditList {
  items: ThenNowApiAuditEvent[]
}

/** Body accepted by `POST /v1/then-now/sites`. */
export interface ThenNowSiteCreate {
  name: string
  slug?: string
  county: string
  locality?: string
  siteType: 'historical' | 'cultural'
  accessMode: AccessMode
  sensitivity: Sensitivity
  managingAuthority?: string
  destinationId?: string
  photographyPolicy?: string
  culturalAuthority?: string
  consentRecord?: string
  consentDate?: string
  siteRules?: string
  safetyNotes?: string
  shortDescription?: string
  fullDescription?: string
  sources?: string
  factCheck?: string
  publicRightsLine?: string
  latitude?: number
  longitude?: number
  geofenceRadiusM?: number
  standingPointNote?: string
  imageKey?: string
}

/** Body accepted by `PATCH /v1/then-now/sites/{id}`. Every field is optional. */
export type ThenNowSitePatch = Partial<ThenNowSiteCreate>

/** Body accepted by `POST /v1/then-now/experiences`. */
export interface ThenNowExperienceCreate {
  siteId: string
  title: string
  snapshot: ThenNowApiSnapshot
}

/** Body accepted by `PATCH /v1/then-now/experiences/{id}`. */
export interface ThenNowExperienceUpdate {
  title?: string
  snapshot: ThenNowApiSnapshot
}

export type ThenNowDecision = 'approve' | 'request_changes' | 'reject' | 'return'

export type ThenNowStatusAction = 'unpublish' | 'archive' | 'revoke'

/** A review queue row in the shape the admin table renders. */
export interface ThenNowReviewRow {
  revisionId: string
  experienceId: string
  siteId: string
  siteName: string
  title: string
  revisionNumber: number
  submittedBy: string
  submittedAt: string
  sensitivity: Sensitivity
  reviewer: string
}

export function thenNowApi(config: ApiConfig) {
  return {
    listSites: (params?: ThenNowSiteFilters) =>
      apiRequest<ThenNowApiSiteList>(config, '/v1/then-now/sites', { params }),
    getSite: (id: string) =>
      apiRequest<ThenNowApiSiteDetail>(config, `/v1/then-now/sites/${id}`),
    createSite: (body: ThenNowSiteCreate) =>
      apiRequest<ThenNowApiSite>(config, '/v1/then-now/sites', { method: 'POST', body }),
    updateSite: (id: string, body: ThenNowSitePatch) =>
      apiRequest<ThenNowApiSite>(config, `/v1/then-now/sites/${id}`, { method: 'PATCH', body }),
    publishSite: (id: string) =>
      apiRequest<ThenNowApiSite>(config, `/v1/then-now/sites/${id}/publish`, { method: 'POST' }),
    unpublishSite: (id: string) =>
      apiRequest<ThenNowApiSite>(config, `/v1/then-now/sites/${id}/unpublish`, { method: 'POST' }),
    archiveSite: (id: string) =>
      apiRequest<ThenNowApiSite>(config, `/v1/then-now/sites/${id}/archive`, { method: 'POST' }),
    listExperiences: (params?: ThenNowExperienceFilters) =>
      apiRequest<ThenNowApiExperienceList>(config, '/v1/then-now/experiences', { params }),
    getExperience: (id: string) =>
      apiRequest<ThenNowApiExperienceDetail>(config, `/v1/then-now/experiences/${id}`),
    createExperience: (body: ThenNowExperienceCreate) =>
      apiRequest<ThenNowApiExperienceDetail>(config, '/v1/then-now/experiences', {
        method: 'POST',
        body,
      }),
    updateExperience: (id: string, body: ThenNowExperienceUpdate) =>
      apiRequest<ThenNowApiExperienceDetail>(config, `/v1/then-now/experiences/${id}`, {
        method: 'PATCH',
        body,
      }),
    submitExperience: (id: string) =>
      apiRequest<ThenNowApiExperienceDetail>(config, `/v1/then-now/experiences/${id}/submit`, {
        method: 'POST',
      }),
    assignReviewer: (id: string, reviewerId?: string) =>
      apiRequest<ThenNowApiExperienceDetail>(config, `/v1/then-now/experiences/${id}/assign`, {
        method: 'POST',
        body: reviewerId ? { reviewerId } : {},
      }),
    decideExperience: (id: string, decision: ThenNowDecision, notes: string) =>
      apiRequest<ThenNowApiExperienceDetail>(config, `/v1/then-now/experiences/${id}/decisions`, {
        method: 'POST',
        body: { decision, notes },
      }),
    recordClientApproval: (id: string, approval: ClientApproval) =>
      apiRequest<ThenNowApiExperienceDetail>(
        config,
        `/v1/then-now/experiences/${id}/client-approval`,
        { method: 'POST', body: approval },
      ),
    recordExternalReviewer: (id: string, reviewer: ExternalReviewer) =>
      apiRequest<ThenNowApiExperienceDetail>(
        config,
        `/v1/then-now/experiences/${id}/external-reviewer`,
        { method: 'POST', body: reviewer },
      ),
    scheduleExperience: (id: string, scheduledAt: string, note: string) =>
      apiRequest<ThenNowApiExperienceDetail>(config, `/v1/then-now/experiences/${id}/schedule`, {
        method: 'POST',
        body: { scheduledAt, note },
      }),
    publishExperience: (id: string) =>
      apiRequest<ThenNowApiExperienceDetail>(config, `/v1/then-now/experiences/${id}/publish`, {
        method: 'POST',
      }),
    newRevision: (id: string) =>
      apiRequest<ThenNowApiExperienceDetail>(
        config,
        `/v1/then-now/experiences/${id}/new-revision`,
        { method: 'POST' },
      ),
    changeExperienceStatus: (id: string, action: ThenNowStatusAction) =>
      apiRequest<ThenNowApiExperienceDetail>(config, `/v1/then-now/experiences/${id}/status`, {
        method: 'POST',
        body: { action },
      }),
    /**
     * There is no standalone revision read. `/review/{revisionId}` returns the
     * frozen revision inside the experience detail (open + live revisions).
     */
    getReview: (revisionId: string) =>
      apiRequest<ThenNowApiExperienceDetail>(config, `/v1/then-now/review/${revisionId}`),
    reviewQueue: (filter: ThenNowReviewFilter = 'all') =>
      apiRequest<ThenNowApiReviewList>(config, '/v1/then-now/review', { params: { filter } }),
    listAudit: (params?: ThenNowAuditFilters) =>
      apiRequest<ThenNowApiAuditList>(config, '/v1/then-now/audit', { params }),
  }
}

export type ThenNowApi = ReturnType<typeof thenNowApi>

const ACCESS_MODES: AccessMode[] = ['camera_video', 'video_only', 'not_available']
const SENSITIVITIES: Sensitivity[] = ['standard', 'sensitive', 'restricted']
const SITE_STATUSES: SiteStatus[] = ['draft', 'published', 'unpublished', 'archived']
const EXPERIENCE_STATUSES: ExperienceStatus[] = [
  'draft',
  'in_review',
  'approved',
  'scheduled',
  'published',
  'unpublished',
  'archived',
  'revoked',
]

function asAccessMode(value: string): AccessMode {
  return ACCESS_MODES.includes(value as AccessMode) ? (value as AccessMode) : 'not_available'
}

function asSensitivity(value: string | undefined): Sensitivity {
  return SENSITIVITIES.includes(value as Sensitivity) ? (value as Sensitivity) : 'standard'
}

function asSiteType(value: string): SiteType {
  return value.toLowerCase() === 'cultural' ? 'Cultural' : 'Historical'
}

function asSiteStatus(value: string): SiteStatus {
  return SITE_STATUSES.includes(value as SiteStatus) ? (value as SiteStatus) : 'draft'
}

function asExperienceStatus(value: string): ExperienceStatus {
  return EXPERIENCE_STATUSES.includes(value as ExperienceStatus)
    ? (value as ExperienceStatus)
    : 'draft'
}

function asDraftStatus(value: string | undefined): Experience['draftStatus'] {
  if (value === 'in_review' || value === 'approved' || value === 'published') return value
  return 'draft'
}

function asDecision(value: string | undefined): ReviewDecision {
  if (value === 'approved' || value === 'changes' || value === 'rejected' || value === 'returned') {
    return value
  }
  return null
}

function asRenditionStatus(value: string): Experience['renditions'][string] {
  if (value === 'Ready' || value === 'Uploading') return value
  return 'Missing'
}

export function mapApiSite(site: ThenNowApiSite, experienceIds: string[] = []): HeritageSite {
  return {
    id: site.id,
    name: site.name,
    slug: site.slug,
    county: site.county,
    locality: site.locality || site.county,
    type: asSiteType(site.siteType),
    access: asAccessMode(site.accessMode),
    sensitivity: asSensitivity(site.sensitivity),
    status: asSiteStatus(site.status),
    managingAuthority: site.managingAuthority ?? '',
    destination: site.destinationId ?? '',
    photography: site.photographyPolicy ?? '',
    culturalAuthority: site.culturalAuthority ?? '',
    consent: site.consentRecord ?? '',
    consentDate: site.consentDate ?? '',
    siteRules: site.siteRules ?? '',
    safety: site.safetyNotes ?? '',
    shortDescription: site.shortDescription ?? '',
    fullDescription: site.fullDescription ?? '',
    sources: site.sources ?? '',
    factCheck: site.factCheck ?? '',
    publicRights: site.publicRightsLine ?? '',
    latitude: Number.isFinite(site.latitude) ? String(site.latitude) : '',
    longitude: Number.isFinite(site.longitude) ? String(site.longitude) : '',
    geofenceRadius: site.geofenceRadiusM ? String(site.geofenceRadiusM) : '150',
    standingPointNote: site.standingPointNote ?? '',
    image: site.imageKey ?? '',
    // The Go site read does not expose updated_at yet; fall back to a neutral
    // value so `relativeAge` renders "Just now" rather than a stale fixture date.
    updatedAt: '',
    experiences: experienceIds,
  }
}

function emptyExperience(id: string, siteId: string, title: string): Experience {
  return {
    id,
    siteId,
    title,
    promise: '',
    story: '',
    period: '',
    duration: 0,
    contentNotes: '',
    safetyNotes: '',
    sources: '',
    factCheck: '',
    mode: 'video_only',
    status: 'draft',
    liveRevision: 0,
    draftRevision: 1,
    draftStatus: 'draft',
    uploadedBy: '',
    submittedBy: '',
    submittedAt: '',
    reviewer: 'Unassigned',
    secondReviewer: null,
    secondReviewerApproved: false,
    clientApproval: null,
    languages: [],
    rightsExpiry: '',
    sensitivity: 'standard',
    videoMaster: '',
    videoSize: '',
    renditions: {},
    poster: false,
    captions: { en: false, sw: false },
    transcript: false,
    audioDescription: false,
    rights: '',
    rightsEvidence: '',
    consent: '',
    textCards: [],
    updatedAt: '',
    lastSavedAt: '',
    reviewNotes: [],
    lastDecision: null,
    diff: { live: [], draft: [], changes: [] },
  }
}

export function mapApiExperienceSummary(item: ThenNowApiExperienceSummary): Experience {
  const exp = emptyExperience(item.id, item.siteId, item.title)
  return {
    ...exp,
    status: asExperienceStatus(item.status),
    liveRevision: item.liveRevisionNumber,
    draftRevision: item.openRevisionNumber,
    draftStatus: asDraftStatus(item.openStatus),
    mode: item.primaryMode === 'camera_video' ? 'camera_video' : 'video_only',
    languages: item.languages ?? [],
    rightsExpiry: item.rightsExpiry ?? '',
    sensitivity: asSensitivity(item.sensitivity),
    updatedAt: item.updatedAt ?? '',
    lastSavedAt: item.updatedAt ?? '',
  }
}

export function mapApiExperience(detail: ThenNowApiExperienceDetail): Experience {
  const revision = detail.openRevision
  const snapshot = revision?.snapshot ?? {}
  const exp = emptyExperience(detail.id, detail.siteId, detail.title || snapshot.title || '')

  const renditions: Experience['renditions'] = {}
  for (const [key, value] of Object.entries(snapshot.renditions ?? {})) {
    renditions[key] = asRenditionStatus(value)
  }

  return {
    ...exp,
    title: detail.title || snapshot.title || '',
    promise: snapshot.promise ?? '',
    story: snapshot.story ?? '',
    period: snapshot.period ?? '',
    duration: snapshot.duration ?? 0,
    contentNotes: snapshot.contentNotes ?? '',
    safetyNotes: snapshot.safetyNotes ?? '',
    sources: snapshot.sources ?? '',
    factCheck: snapshot.factCheck ?? '',
    mode: snapshot.primaryMode === 'camera_video' ? 'camera_video' : 'video_only',
    status: asExperienceStatus(detail.status),
    liveRevision: detail.liveRevisionNumber,
    draftRevision: detail.openRevisionNumber,
    draftStatus: asDraftStatus(revision?.status),
    uploadedBy: revision?.uploadedBy ?? '',
    submittedBy: revision?.submittedBy ?? '',
    submittedAt: revision?.submittedAt ?? '',
    reviewer: revision?.reviewer || 'Unassigned',
    secondReviewer: revision?.secondReviewer ?? null,
    secondReviewerApproved: revision?.secondReviewerApproved ?? false,
    clientApproval: revision?.clientApproval ?? null,
    languages: snapshot.languages ?? [],
    rightsExpiry: snapshot.rightsExpiry ?? '',
    sensitivity: asSensitivity(snapshot.sensitivity ?? detail.site.sensitivity),
    videoMaster: snapshot.videoMaster ?? '',
    videoSize: snapshot.videoSize ?? '',
    renditions,
    renditionKeys: snapshot.renditionKeys ?? {},
    posterKey: snapshot.posterKey ?? '',
    captionKeys: snapshot.captionKeys ?? {},
    transcriptKey: snapshot.transcriptKey ?? '',
    audioDescriptionKey: snapshot.audioDescriptionKey ?? '',
    poster: snapshot.poster ?? false,
    captions: {
      en: Boolean(snapshot.captions?.en),
      sw: Boolean(snapshot.captions?.sw),
    },
    transcript: snapshot.transcript ?? false,
    audioDescription: snapshot.audioDescription ?? false,
    rights: snapshot.rightsRecord ?? '',
    rightsEvidence: snapshot.rightsEvidence ?? '',
    consent: snapshot.consentRecord ?? '',
    textCards: snapshot.textCards ?? [],
    updatedAt: revision?.publishedAt || revision?.submittedAt || '',
    lastSavedAt: revision?.submittedAt || '',
    reviewNotes: revision?.reviewNotes ?? [],
    lastDecision: asDecision(revision?.lastDecision),
    scheduledAt: revision?.scheduledAt || undefined,
    scheduleNote: revision?.scheduleNote || undefined,
    diff: { live: [], draft: [], changes: [] },
  }
}

export function mapApiAuditEvent(event: ThenNowApiAuditEvent): AuditEvent {
  const note = typeof event.metadata?.note === 'string' ? event.metadata.note : undefined
  return {
    id: event.id,
    entity: event.entityId,
    type: event.eventType,
    title: event.summary,
    meta: [event.actorId, event.createdAt].filter(Boolean).join(' · '),
    note,
  }
}

export function mapApiReviewItem(item: ThenNowApiReviewItem): Experience {
  const exp = emptyExperience(item.experienceId, item.siteId, item.title)
  return {
    ...exp,
    status: 'in_review',
    draftStatus: 'in_review',
    reviewer: item.reviewer || 'Unassigned',
    submittedBy: item.submittedBy,
    submittedAt: item.submittedAt,
    sensitivity: asSensitivity(item.sensitivity),
    draftRevision: item.revisionNumber,
    updatedAt: item.submittedAt,
    lastSavedAt: item.submittedAt,
  }
}

export function mapApiReviewRow(item: ThenNowApiReviewItem): ThenNowReviewRow {
  return {
    revisionId: item.revisionId,
    experienceId: item.experienceId,
    siteId: item.siteId,
    siteName: item.siteName,
    title: item.title,
    revisionNumber: item.revisionNumber,
    submittedBy: item.submittedBy,
    submittedAt: item.submittedAt,
    sensitivity: asSensitivity(item.sensitivity),
    reviewer: item.reviewer || 'Unassigned',
  }
}

/** API readiness is shaped like the UI model, but section names are strings. */
export function mapApiReadiness(readiness: ThenNowApiReadiness): Readiness {
  return {
    blockers: readiness.blockers ?? [],
    warnings: readiness.warnings ?? [],
    readyToSubmit: readiness.readyToSubmit,
    readyToPublish: readiness.readyToPublish,
  }
}

export interface ThenNowApiData {
  sites: HeritageSite[]
  experiences: Record<string, Experience>
  /** `null` when the audit read failed, so callers can keep the fixture log. */
  audit: AuditEvent[] | null
}

/**
 * Load the admin read model from the Go API.
 *
 * Returns `null` when the API is unavailable, returns no sites, or the site
 * read fails. Callers keep the fixture store in that case. Experiences and
 * audit are best-effort: a failed experiences read still yields sites, and a
 * failed audit read yields `audit: null`.
 */
export async function loadThenNowState(api: ThenNowApi): Promise<ThenNowApiData | null> {
  const [sitesResult, experiencesResult, auditResult] = await Promise.allSettled([
    api.listSites(),
    api.listExperiences(),
    api.listAudit(),
  ])

  if (sitesResult.status === 'rejected') return null
  const siteItems = sitesResult.value.items ?? []
  if (siteItems.length === 0) return null

  const experiences: Record<string, Experience> = {}
  if (experiencesResult.status === 'fulfilled') {
    for (const item of experiencesResult.value.items ?? []) {
      const mapped = mapApiExperienceSummary(item)
      experiences[mapped.id] = mapped
    }
  }

  const experiencesBySite = new Map<string, string[]>()
  for (const exp of Object.values(experiences)) {
    const ids = experiencesBySite.get(exp.siteId) ?? []
    ids.push(exp.id)
    experiencesBySite.set(exp.siteId, ids)
  }

  const sites = siteItems.map((site) =>
    mapApiSite(site, experiencesBySite.get(site.id) ?? []),
  )

  const audit =
    auditResult.status === 'fulfilled'
      ? (auditResult.value.items ?? []).map(mapApiAuditEvent)
      : null

  return { sites, experiences, audit }
}

function optionalNumber(value: string | undefined): number | undefined {
  if (value === undefined || value.trim() === '') return undefined
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : undefined
}

function siteTypePayload(type: SiteType): 'historical' | 'cultural' {
  return type === 'Cultural' ? 'cultural' : 'historical'
}

/**
 * Build the create-site body. Empty optional values are omitted so the Go
 * handler stores NULL rather than an empty string.
 */
export function siteCreatePayload(
  site: Partial<HeritageSite> & Pick<HeritageSite, 'name' | 'county' | 'type' | 'access' | 'sensitivity'>,
): ThenNowSiteCreate {
  const body: ThenNowSiteCreate = {
    name: site.name.trim(),
    county: site.county.trim(),
    siteType: siteTypePayload(site.type),
    accessMode: site.access,
    sensitivity: site.sensitivity,
  }
  if (site.slug) body.slug = site.slug
  if (site.locality) body.locality = site.locality
  if (site.managingAuthority) body.managingAuthority = site.managingAuthority
  if (site.destination) body.destinationId = site.destination
  if (site.photography) body.photographyPolicy = site.photography
  if (site.culturalAuthority) body.culturalAuthority = site.culturalAuthority
  if (site.consent) body.consentRecord = site.consent
  if (site.consentDate) body.consentDate = site.consentDate
  if (site.siteRules) body.siteRules = site.siteRules
  if (site.safety) body.safetyNotes = site.safety
  if (site.shortDescription) body.shortDescription = site.shortDescription
  if (site.fullDescription) body.fullDescription = site.fullDescription
  if (site.sources) body.sources = site.sources
  if (site.factCheck) body.factCheck = site.factCheck
  if (site.publicRights) body.publicRightsLine = site.publicRights
  if (site.standingPointNote) body.standingPointNote = site.standingPointNote
  if (site.image) body.imageKey = site.image
  const latitude = optionalNumber(site.latitude)
  const longitude = optionalNumber(site.longitude)
  const radius = optionalNumber(site.geofenceRadius)
  if (latitude !== undefined) body.latitude = latitude
  if (longitude !== undefined) body.longitude = longitude
  if (radius !== undefined) body.geofenceRadiusM = Math.round(radius)
  return body
}

/** Build a full site patch. `undefined` fields are omitted by JSON.stringify. */
export function sitePatchPayload(site: Partial<HeritageSite>): ThenNowSitePatch {
  const body: ThenNowSitePatch = {}
  if (site.name !== undefined) body.name = site.name.trim()
  if (site.slug) body.slug = site.slug
  if (site.county !== undefined) body.county = site.county
  if (site.locality !== undefined) body.locality = site.locality
  if (site.type !== undefined) body.siteType = siteTypePayload(site.type)
  if (site.access !== undefined) body.accessMode = site.access
  if (site.sensitivity !== undefined) body.sensitivity = site.sensitivity
  if (site.managingAuthority !== undefined) body.managingAuthority = site.managingAuthority
  if (site.destination !== undefined) body.destinationId = site.destination
  if (site.photography !== undefined) body.photographyPolicy = site.photography
  if (site.culturalAuthority !== undefined) body.culturalAuthority = site.culturalAuthority
  if (site.consent !== undefined) body.consentRecord = site.consent
  if (site.consentDate !== undefined) body.consentDate = site.consentDate
  if (site.siteRules !== undefined) body.siteRules = site.siteRules
  if (site.safety !== undefined) body.safetyNotes = site.safety
  if (site.shortDescription !== undefined) body.shortDescription = site.shortDescription
  if (site.fullDescription !== undefined) body.fullDescription = site.fullDescription
  if (site.sources !== undefined) body.sources = site.sources
  if (site.factCheck !== undefined) body.factCheck = site.factCheck
  if (site.publicRights !== undefined) body.publicRightsLine = site.publicRights
  if (site.standingPointNote !== undefined) body.standingPointNote = site.standingPointNote
  if (site.image !== undefined) body.imageKey = site.image
  const latitude = optionalNumber(site.latitude)
  const longitude = optionalNumber(site.longitude)
  const radius = optionalNumber(site.geofenceRadius)
  if (latitude !== undefined) body.latitude = latitude
  if (longitude !== undefined) body.longitude = longitude
  if (radius !== undefined) body.geofenceRadiusM = Math.round(radius)
  return body
}

/**
 * Convert the UI model to the immutable revision snapshot.
 *
 * The Go readiness gate checks object keys (`renditionKeys`, `posterKey`,
 * `captionKeys`, `transcriptKey`), so an API-loaded experience carries them
 * through a save instead of dropping them. Media upload is still simulated;
 * see `docs/then-now-admin.md`.
 */
export function snapshotFromExperience(exp: Experience): ThenNowApiSnapshot {
  return {
    title: exp.title,
    promise: exp.promise,
    story: exp.story,
    period: exp.period,
    duration: exp.duration,
    contentNotes: exp.contentNotes,
    safetyNotes: exp.safetyNotes,
    sources: exp.sources,
    factCheck: exp.factCheck,
    primaryMode: exp.mode,
    languages: exp.languages,
    rightsRecord: exp.rights,
    rightsEvidence: exp.rightsEvidence,
    rightsExpiry: exp.rightsExpiry,
    consentRecord: exp.consent,
    sensitivity: exp.sensitivity,
    videoMaster: exp.videoMaster,
    videoSize: exp.videoSize,
    renditions: exp.renditions,
    renditionKeys: exp.renditionKeys ?? {},
    poster: exp.poster,
    posterKey: exp.posterKey ?? '',
    captions: exp.captions,
    captionKeys: exp.captionKeys ?? {},
    transcript: exp.transcript,
    transcriptKey: exp.transcriptKey ?? '',
    audioDescription: exp.audioDescription,
    audioDescriptionKey: exp.audioDescriptionKey ?? '',
    textCards: exp.textCards,
  }
}

/** A stale open revision. The caller must reload instead of overwriting. */
export class ThenNowStaleRevisionError extends Error {
  constructor(
    public expected: number,
    public actual: number,
  ) {
    super(
      `This experience has moved to v${actual} on the server. Reload before making changes so nothing is overwritten.`,
    )
    this.name = 'ThenNowStaleRevisionError'
  }
}

/**
 * Optimistic concurrency guard. The Go API has no `If-Match`, so compare the
 * server's open revision number with the revision the caller loaded before
 * sending a full-snapshot PATCH or a lifecycle action.
 */
export async function requireOpenRevision(
  api: ThenNowApi,
  id: string,
  expected: number,
): Promise<ThenNowApiExperienceDetail> {
  const detail = await api.getExperience(id)
  if (detail.openRevisionNumber !== expected) {
    throw new ThenNowStaleRevisionError(expected, detail.openRevisionNumber)
  }
  return detail
}

const THEN_NOW_ERROR_MESSAGES: Record<string, string> = {
  FORBIDDEN: 'Your account does not have permission to do that. The record was not changed.',
  UNAUTHORIZED: 'Your session expired. Sign in again. Nothing was changed.',
  NOT_FOUND: 'This record no longer exists on the server. Reload the list.',
  SLUG_EXISTS: 'A site with that slug already exists. Change the name or slug and try again.',
  FROZEN: 'This revision is frozen or no longer editable. Reload to see the latest state.',
  INVALID_STATE: 'This action is no longer valid for the revision. Reload to see the latest state.',
  NOT_READY: 'The readiness checks block this action.',
  SEPARATION: 'The uploader cannot review their own revision.',
  UNASSIGNED: 'Assign a reviewer before deciding.',
  SECOND_REVIEWER: 'Record the second reviewer before approving a sensitive revision.',
  RESTRICTED: 'Restricted content cannot be approved until a super-admin records a resolution.',
  OPEN_REVISION: 'There is already an open revision. Reload to edit the current draft.',
  NOTES_REQUIRED: 'Add a note explaining the decision.',
  INVALID_REVIEWER: 'Choose an administrator as the reviewer.',
  INVALID_SCHEDULE: 'Choose a future date and time in East Africa Time.',
}

/** Human-readable message for an API failure, including readiness blockers. */
export function thenNowErrorMessage(error: unknown): string {
  if (!(error instanceof ApiErrorResponse)) {
    return error instanceof Error ? error.message : 'Something went wrong.'
  }
  const base = THEN_NOW_ERROR_MESSAGES[error.code] ?? error.message
  if (error.code === 'NOT_READY') {
    const payload = error.payload as { readiness?: ThenNowApiReadiness } | undefined
    const labels = (payload?.readiness?.blockers ?? [])
      .map((item) => item.label)
      .filter(Boolean)
      .slice(0, 4)
    return labels.length > 0 ? `${base} Blocked by: ${labels.join(', ')}.` : base
  }
  return base
}

export { asAccessMode, asSensitivity, asSiteStatus, asSiteType }
