import type { ApiConfig } from './client'
import { apiRequest } from './client'
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

export function thenNowApi(config: ApiConfig) {
  return {
    listSites: (params?: ThenNowSiteFilters) =>
      apiRequest<ThenNowApiSiteList>(config, '/v1/then-now/sites', { params }),
    getSite: (id: string) =>
      apiRequest<ThenNowApiSiteDetail>(config, `/v1/then-now/sites/${id}`),
    listExperiences: (params?: ThenNowExperienceFilters) =>
      apiRequest<ThenNowApiExperienceList>(config, '/v1/then-now/experiences', { params }),
    getExperience: (id: string) =>
      apiRequest<ThenNowApiExperienceDetail>(config, `/v1/then-now/experiences/${id}`),
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

export { asAccessMode, asSensitivity, asSiteStatus, asSiteType }
