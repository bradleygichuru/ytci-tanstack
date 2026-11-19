/**
 * Species admin read model and workflow derivations.
 *
 * Screens never invent state: coverage, stale variants, readiness blockers,
 * rights blast radius and the translation queue are all computed here from the
 * frozen contract records plus the local authoring overlay. Keeping the rules
 * pure makes the carry-forwards testable (audio records, derived stale, linked
 * blockers, revocable-only withdrawal).
 */
import type { components } from '#/lib/contracts/generated/contracts'

type Schemas = components['schemas']

export type SpeciesSummary = Schemas['SpeciesSummary']
export type SpeciesDetail = Schemas['SpeciesDetail']
export type SpeciesVariant = Schemas['SpeciesVariant']
export type SpeciesName = Schemas['SpeciesName']
export type SpeciesAudio = Schemas['SpeciesAudio']
export type SpeciesSource = Schemas['SpeciesSource']
export type SpeciesRights = Schemas['SpeciesRights']
export type SpeciesReviewItem = Schemas['SpeciesReviewItem']
export type SpeciesWhereToSee = Schemas['WhereToSee']
export type LanguageCoverage = Schemas['LanguageCoverage']

export type VariantReviewStatus = 'missing' | 'draft' | 'reviewed' | 'stale'

/** Base-record draft kept in the browser so a published edit is staged. */
export interface BaseDraft {
  scientificName: string
  slug: string
  authorship: string
  taxonomicRank: string
  taxonomicStatus: string
  gbifKey: string
  iucnCategory: string
  iucnAssessmentId: string
  redListVersion: string
  /** Incremented when a language-neutral field changes, which stales prose. */
  baseRevision: number
  savedAt: string
}

export interface VariantDraft {
  language: string
  tier: 'full' | 'summary' | 'names' | 'audio'
  summary: string
  description: string
  habitat: string
  range: string
  whereToSee: string
  conservation: string
  status: VariantReviewStatus
  contributor: string
  reviewer?: string
  updatedAt: string
}

export interface NameDraft {
  language: string
  name: string
  region: string
  sourceLabel: string
  contributor: string
  reviewer?: string
  status: 'draft' | 'reviewed' | 'stale'
  updatedAt: string
}

export interface AudioDraft {
  language: string
  storageKey: string
  url: string
  narrator: string
  consentRecord: string
  transcript: string
  durationSeconds: number
  status: 'draft' | 'reviewed' | 'stale'
  rightsHolder: string
  licenceCode: string
  reviewer?: string
  updatedAt: string
}

export interface SecondReview {
  reviewer: string
  role: string
  decidedAt: string
  note: string
}

export interface SourceWithdrawal {
  sourceId: string
  replacementId: string | null
  reason: string
  note: string
  withdrawnAt: string
  actor: string
  affectedSpecies: string[]
}

export interface RightsWithdrawal {
  rightsId: string
  reason: string
  note: string
  withdrawnAt: string
  actor: string
  affectedSpecies: string[]
}

export type AuditCategory =
  | 'content'
  | 'translation'
  | 'review'
  | 'rights'
  | 'publish'
  | 'taxonomy'

export interface AuditRecord {
  id: string
  at: string
  actor: string
  role: string
  action: string
  entityType: string
  entityId: string
  category: AuditCategory
  summary: string
  detail: string
  /** `record` entries are derived from the stored records, not typed by a person. */
  source: 'record' | 'session'
}

export interface SpeciesOverlayState {
  baseDrafts: Record<string, BaseDraft>
  variantDrafts: Record<string, VariantDraft>
  nameDrafts: Record<string, NameDraft>
  audioDrafts: Record<string, AudioDraft>
  assignments: Record<string, string>
  secondReviews: Record<string, SecondReview>
  withdrawnSources: Record<string, SourceWithdrawal>
  withdrawnRights: Record<string, RightsWithdrawal>
  audit: AuditRecord[]
  publicationRequests: Record<string, { submittedAt: string; actor: string }>
  published: Record<string, { publishedAt: string; actor: string; language: string }>
  reviewDecisions: Record<
    string,
    { status: 'approved' | 'changes_requested' | 'rejected'; notes: string; at: string; actor: string }
  >
  submittedTasks: Record<string, { submittedAt: string; actor: string }>
}

export const EMPTY_OVERLAY: SpeciesOverlayState = {
  baseDrafts: {},
  variantDrafts: {},
  nameDrafts: {},
  audioDrafts: {},
  assignments: {},
  secondReviews: {},
  withdrawnSources: {},
  withdrawnRights: {},
  audit: [],
  publicationRequests: {},
  published: {},
  reviewDecisions: {},
  submittedTasks: {},
}

export function variantKey(slug: string, language: string): string {
  return `${slug}:${language}`
}

const DISPLAY_NAMES =
  typeof Intl !== 'undefined' && 'DisplayNames' in Intl
    ? new Intl.DisplayNames(['en'], { type: 'language' })
    : null

/** Human label for an ISO language code; never invents a language name. */
export function languageLabel(code: string): string {
  if (!code) return 'Unknown'
  try {
    return DISPLAY_NAMES?.of(code) ?? code.toUpperCase()
  } catch {
    return code.toUpperCase()
  }
}

export function formatDate(value: string | null | undefined): string {
  if (!value) return '—'
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return value
  return new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(parsed)
}

export function formatDateTime(value: string | null | undefined): string {
  if (!value) return '—'
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return value
  return new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(parsed)
}

/** Undated records (rights rows have no created-at) sort last without a fake date. */
export function formatAuditTime(value: string): string {
  if (!value || new Date(value).getTime() <= 0) return 'Undated record'
  return formatDateTime(value)
}

export function ageInDays(value: string | null | undefined, now = Date.now()): number | null {
  if (!value) return null
  const parsed = new Date(value).getTime()
  if (Number.isNaN(parsed)) return null
  return Math.max(0, Math.floor((now - parsed) / 86_400_000))
}

export function ageLabel(value: string | null | undefined, now = Date.now()): string {
  const days = ageInDays(value, now)
  if (days === null) return '—'
  if (days === 0) return 'today'
  return `${days}d`
}

/** The species' base revision, including a local unpublished edit. */
export function effectiveBaseRevision(detail: SpeciesDetail, overlay: SpeciesOverlayState): number {
  const draft = overlay.baseDrafts[detail.slug]
  return Math.max(detail.contentVersion ?? 0, draft?.baseRevision ?? 0)
}

/**
 * Stale is derived, never declared by a checkbox.
 *
 * A variant is stale when the API marks it stale, when its pinned source
 * version trails the base revision, or when a local base edit has landed since
 * the variant was reviewed.
 */
export function deriveVariantStale(
  detail: SpeciesDetail,
  language: string,
  overlay: SpeciesOverlayState,
): { stale: boolean; reason: string | null } {
  const content = detail.content
  const draft = overlay.variantDrafts[variantKey(detail.slug, language)]
  const baseDraft = overlay.baseDrafts[detail.slug]
  const baseRevision = effectiveBaseRevision(detail, overlay)
  const coverage = detail.coverage?.find((entry) => entry.language === language)
  const hasProse = coverage?.tier === 'full' || coverage?.tier === 'summary'

  if (draft?.status === 'stale') {
    return { stale: true, reason: draft.updatedAt ? 'Marked stale after a base edit.' : null }
  }

  if (language === content?.language) {
    const sourceVersion = content.sourceVersion ?? detail.contentVersion ?? 0
    if (content.reviewStatus === 'stale') {
      return { stale: true, reason: content.staleReason ?? 'The English base changed after this review.' }
    }
    if (sourceVersion < baseRevision) {
      return {
        stale: true,
        reason: baseDraft
          ? 'A language-neutral base field changed after this variant was reviewed.'
          : 'The base revision moved past the reviewed source version.',
      }
    }
  }

  // A local base edit stales every variant that carries dependent prose, even
  // when the API does not yet expose that variant's pinned source version.
  if (baseDraft && hasProse && baseRevision > (detail.contentVersion ?? 0)) {
    return {
      stale: true,
      reason: 'A language-neutral base field changed after this variant was reviewed.',
    }
  }

  return { stale: false, reason: null }
}

export interface VariantView {
  language: string
  label: string
  tier: 'full' | 'summary' | 'names' | 'audio'
  name: string | null
  nameStatus: VariantReviewStatus
  proseTier: 'full' | 'summary' | 'names' | 'audio' | 'missing'
  proseStatus: VariantReviewStatus
  audio: SpeciesAudio | null
  audioStatus: VariantReviewStatus
  contributor: string | null
  reviewer: string | null
  region: string | null
  sourceLabel: string | null
  updatedAt: string | null
  stale: boolean
  staleReason: string | null
  hasAudioRecord: boolean
}

function statusFromName(name: SpeciesName | undefined): VariantReviewStatus {
  return (name?.reviewStatus as VariantReviewStatus | undefined) ?? 'missing'
}

function statusFromAudio(audio: SpeciesAudio | undefined): VariantReviewStatus {
  return (audio?.reviewStatus as VariantReviewStatus | undefined) ?? (audio ? 'draft' : 'missing')
}

/** One row per language for the coverage and editor tables. */
export function buildVariantViews(
  detail: SpeciesDetail,
  overlay: SpeciesOverlayState,
): VariantView[] {
  const languages = new Set<string>()
  for (const entry of detail.coverage ?? []) languages.add(entry.language)
  for (const name of detail.names ?? []) languages.add(name.language)
  for (const audio of detail.audio ?? []) languages.add(audio.language)
  if (detail.content?.language) languages.add(detail.content.language)

  return [...languages].map((language) => {
    const coverage = detail.coverage?.find((entry) => entry.language === language)
    const name = detail.names?.find((entry) => entry.language === language)
    const audio = detail.audio?.find((entry) => entry.language === language)
    const nameDraft = overlay.nameDrafts[variantKey(detail.slug, language)]
    const audioDraft = overlay.audioDrafts[variantKey(detail.slug, language)]
    const variantDraft = overlay.variantDrafts[variantKey(detail.slug, language)]
    const stale = deriveVariantStale(detail, language, overlay)

    const proseTier = coverage?.tier ?? 'missing'
    let proseStatus: VariantReviewStatus = 'missing'
    if (variantDraft) {
      proseStatus = variantDraft.status
    } else if (language === detail.content?.language) {
      proseStatus = (detail.content?.reviewStatus as VariantReviewStatus) ?? 'missing'
    } else if (coverage?.available && (proseTier === 'full' || proseTier === 'summary')) {
      proseStatus = 'reviewed'
    } else if (proseTier === 'names' || proseTier === 'audio') {
      proseStatus = 'missing'
    }
    if (stale.stale && (proseTier === 'full' || proseTier === 'summary')) {
      proseStatus = 'stale'
    }

    const audioStatus = audioDraft
      ? audioDraft.status
      : statusFromAudio(audio)
    const nameStatus = nameDraft ? nameDraft.status : statusFromName(name)

    return {
      language,
      label: languageLabel(language),
      tier: proseTier === 'missing' ? 'names' : proseTier,
      name: nameDraft?.name ?? name?.name ?? null,
      nameStatus,
      proseTier,
      proseStatus,
      audio: audio ?? null,
      audioStatus: stale.stale && audioStatus === 'reviewed' ? 'stale' : audioStatus,
      contributor:
        nameDraft?.contributor ??
        (language === detail.content?.language ? detail.content?.translatorRef ?? null : null),
      reviewer:
        nameDraft?.reviewer ??
        (nameDraft?.status === 'reviewed' ? nameDraft.contributor : null) ??
        (language === detail.content?.language ? detail.content?.reviewerRef ?? null : null),
      region: nameDraft?.region ?? name?.region ?? null,
      sourceLabel: nameDraft?.sourceLabel ?? name?.source?.publisher ?? null,
      updatedAt:
        variantDraft?.updatedAt ??
        nameDraft?.updatedAt ??
        (language === detail.content?.language ? detail.content?.publishedAt ?? null : null),
      stale: stale.stale,
      staleReason: stale.reason,
      hasAudioRecord: Boolean(audio || audioDraft),
    }
  })
}

export interface LanguageAggregate {
  language: string
  label: string
  names: number
  prose: number
  audio: number
  total: number
}

/** Coverage bars for the overview, derived from the loaded species sample. */
export function aggregateCoverage(details: SpeciesDetail[]): LanguageAggregate[] {
  const byLanguage = new Map<string, LanguageAggregate>()
  for (const detail of details) {
    const seen = new Set<string>()
    for (const entry of detail.coverage ?? []) {
      if (seen.has(entry.language)) continue
      seen.add(entry.language)
      const current =
        byLanguage.get(entry.language) ??
        {
          language: entry.language,
          label: languageLabel(entry.language),
          names: 0,
          prose: 0,
          audio: 0,
          total: details.length,
        }
      if ((detail.names ?? []).some((name) => name.language === entry.language && name.reviewStatus === 'reviewed')) {
        current.names += 1
      }
      if (entry.available && (entry.tier === 'full' || entry.tier === 'summary')) {
        current.prose += 1
      }
      if (entry.audio || (detail.audio ?? []).some((audio) => audio.language === entry.language)) {
        current.audio += 1
      }
      byLanguage.set(entry.language, current)
    }
  }
  return [...byLanguage.values()].sort((a, b) => b.names - a.names)
}

export interface CatalogueRow {
  slug: string
  nameEn: string
  scientificName: string
  iucnCategory: string
  publicationState: string
  taxonomicStatus: string
  languages: string[]
  coveragePct: number
  staleCount: number
  hasRightsHold: boolean
  submittedForReview: boolean
}

export function buildCatalogueRows(
  summaries: SpeciesSummary[],
  details: SpeciesDetail[],
  overlay: SpeciesOverlayState,
): CatalogueRow[] {
  const bySlug = new Map(details.map((detail) => [detail.slug, detail]))
  const languageUniverse = new Set<string>()
  for (const summary of summaries) for (const code of summary.languages ?? []) languageUniverse.add(code)
  const totalLanguages = Math.max(languageUniverse.size, 1)

  return summaries.map((summary) => {
    const detail = bySlug.get(summary.slug)
    const views = detail ? buildVariantViews(detail, overlay) : []
    const staleCount = views.filter((view) => view.stale).length
    const hasRightsHold =
      Object.values(overlay.withdrawnRights).some((entry) =>
        entry.affectedSpecies.includes(summary.slug),
      ) ||
      Object.values(overlay.withdrawnSources).some((entry) =>
        entry.affectedSpecies.includes(summary.slug),
      )
    const languages = summary.languages ?? []
    const published = overlay.published[summary.slug]
    const publicationState = published
      ? 'published'
      : overlay.publicationRequests[summary.slug]
        ? 'in_review'
        : (summary.publicationState ?? 'draft')
    return {
      slug: summary.slug,
      nameEn: summary.nameEn,
      scientificName: summary.scientificName,
      iucnCategory: summary.iucnCategory ?? 'NE',
      publicationState,
      taxonomicStatus: summary.taxonomicStatus ?? 'unknown',
      languages,
      coveragePct: Math.round((languages.length / totalLanguages) * 100),
      staleCount,
      hasRightsHold,
      submittedForReview: Boolean(overlay.publicationRequests[summary.slug]),
    }
  })
}

export interface SourceImpact {
  source: SpeciesSource
  revocable: boolean
  affected: { slug: string; name: string }[]
  rights: SpeciesRights[]
  replacementOptions: SpeciesSource[]
}

function sourceIsLinkOrTaxonomy(source: SpeciesSource): boolean {
  return source.permittedUse === 'taxonomy_only' || source.permittedUse === 'link_only'
}

function licenceIsPublicDomain(licenceCode: string): boolean {
  return /^cc0/i.test(licenceCode) || /public[- ]domain/i.test(licenceCode) || /^pddl/i.test(licenceCode)
}

/**
 * Sources that cannot be withdrawn. Taxonomy and link-out sources carry no
 * revocable prose or media rights, and a public-domain licence cannot be
 * un-granted by us.
 */
export function isRevocableSource(source: SpeciesSource): boolean {
  if (sourceIsLinkOrTaxonomy(source)) return false
  if (licenceIsPublicDomain(source.licenceCode)) return false
  return true
}

export function computeSourceImpact(
  source: SpeciesSource,
  details: SpeciesDetail[],
  sources: SpeciesSource[],
  rights: SpeciesRights[],
): SourceImpact {
  const affected = details
    .filter((detail) => (detail.sources ?? []).some((entry) => entry.id === source.id))
    .map((detail) => ({ slug: detail.slug, name: detail.nameEn }))

  const affectedSlugs = new Set(affected.map((entry) => entry.slug))
  const affectedRights = rights.filter((record) => {
    if (record.withdrawnAt) return false
    const detail = details.find((candidate) =>
      (candidate.media ?? []).some((media) => media.id === record.subjectId),
    )
    return detail ? affectedSlugs.has(detail.slug) : false
  })

  return {
    source,
    revocable: isRevocableSource(source),
    affected,
    rights: affectedRights,
    replacementOptions: sources.filter(
      (candidate) =>
        candidate.id !== source.id &&
        !sourceIsLinkOrTaxonomy(candidate) &&
        candidate.permittedUse === source.permittedUse &&
        candidate.reviewStatus !== 'missing',
    ),
  }
}

export function rightsIsActive(rights: SpeciesRights, now = Date.now()): boolean {
  if (rights.withdrawnAt) return false
  if (!rights.expiresAt) return true
  const expiry = new Date(rights.expiresAt).getTime()
  return Number.isNaN(expiry) ? true : expiry > now
}

export function rightsStatus(rights: SpeciesRights, now = Date.now()): 'active' | 'expired' | 'withdrawn' {
  if (rights.withdrawnAt) return 'withdrawn'
  if (rights.expiresAt && new Date(rights.expiresAt).getTime() <= now) return 'expired'
  return 'active'
}

export function computeRightsImpact(
  rights: SpeciesRights,
  details: SpeciesDetail[],
): { slug: string; name: string }[] {
  return details
    .filter(
      (detail) =>
        (detail.media ?? []).some((record) => record.id === rights.subjectId) ||
        (detail.audio ?? []).some((record) => record.rights?.id === rights.id),
    )
    .map((detail) => ({ slug: detail.slug, name: detail.nameEn }))
}

export type TaskType = 'base' | 'prose' | 'name' | 'audio' | 'media' | 'where_to_see'

export interface SpeciesTask {
  id: string
  speciesSlug: string
  speciesName: string
  language: string | null
  languageText: string
  type: TaskType
  state: 'missing' | 'in_review' | 'stale' | 'changes_requested' | 'rejected' | 'reviewed'
  stage: SpeciesReviewItem['stage']
  assignee: string | null
  contributor: string | null
  reviewer: string | null
  submittedAt: string | null
  age: string
  reason: string
  staleReason: string | null
  entityId: string
  reviewItemId: string | null
}

const ENTITY_TASK: Record<SpeciesReviewItem['entityType'], TaskType> = {
  species: 'base',
  content: 'prose',
  name: 'name',
  audio: 'audio',
  media: 'media',
  where_to_see: 'where_to_see',
}

function taskState(item: SpeciesReviewItem): SpeciesTask['state'] {
  switch (item.status) {
    case 'pending':
      return 'in_review'
    case 'approved':
      return 'reviewed'
    case 'changes_requested':
      return 'changes_requested'
    case 'rejected':
      return 'rejected'
    default:
      return 'in_review'
  }
}

/**
 * The queue is built from review items plus coverage gaps, so an empty queue
 * cannot hide a language that has no name or audio at all.
 */
export function buildTasks(
  details: SpeciesDetail[],
  reviewItems: SpeciesReviewItem[],
  overlay: SpeciesOverlayState,
  now = Date.now(),
): SpeciesTask[] {
  const bySlug = new Map(details.map((detail) => [detail.slug, detail]))
  const tasks: SpeciesTask[] = []
  const seen = new Set<string>()

  for (const item of reviewItems) {
    const detail = item.speciesSlug ? bySlug.get(item.speciesSlug) : undefined
    const stale = detail && item.language ? deriveVariantStale(detail, item.language, overlay) : { stale: false, reason: null }
    const assigned = overlay.assignments[item.id] ?? item.assignedTo ?? null
    const decision = overlay.reviewDecisions[item.id]
    const submitted = overlay.submittedTasks[item.id]
    const state = stale.stale
      ? 'stale'
      : decision
        ? decision.status === 'approved'
          ? 'reviewed'
          : decision.status
        : submitted
          ? 'in_review'
          : taskState(item)
    tasks.push({
      id: item.id,
      speciesSlug: item.speciesSlug ?? '',
      speciesName: detail?.nameEn ?? item.speciesSlug ?? 'Unknown species',
      language: item.language ?? null,
      languageText: item.language ? languageLabel(item.language) : 'Base record',
      type: ENTITY_TASK[item.entityType],
      state,
      stage: item.stage,
      assignee: assigned,
      contributor: item.translatorRef ?? null,
      reviewer: item.reviewerRef ?? null,
      submittedAt: item.submittedAt ?? null,
      age: ageLabel(item.submittedAt, now),
      reason: stale.stale
        ? stale.reason ?? 'Stale after a base revision'
        : item.stage === 'language'
          ? 'Awaiting language review'
          : `Awaiting ${item.stage} review`,
      staleReason: stale.reason,
      entityId: item.entityId,
      reviewItemId: item.id,
    })
    seen.add(`${item.speciesSlug}:${item.language}:${ENTITY_TASK[item.entityType]}`)
  }

  for (const detail of details) {
    for (const view of buildVariantViews(detail, overlay)) {
      const nameKey = `${detail.slug}:${view.language}:name`
      if (!view.name || view.nameStatus === 'missing') {
        if (!seen.has(nameKey)) {
          tasks.push({
            id: nameKey,
            speciesSlug: detail.slug,
            speciesName: detail.nameEn,
            language: view.language,
            languageText: view.label,
            type: 'name',
            state: 'missing',
            stage: 'language',
            assignee: null,
            contributor: null,
            reviewer: null,
            submittedAt: null,
            age: '—',
            reason: `No ${view.label} name recorded`,
            staleReason: null,
            entityId: nameKey,
            reviewItemId: null,
          })
          seen.add(nameKey)
        }
      }
      const proseKey = `${detail.slug}:${view.language}:prose`
      if (
        (view.proseTier === 'full' || view.proseTier === 'summary') &&
        (view.proseStatus === 'draft' || view.proseStatus === 'missing')
      ) {
        if (!seen.has(proseKey)) {
          tasks.push({
            id: proseKey,
            speciesSlug: detail.slug,
            speciesName: detail.nameEn,
            language: view.language,
            languageText: view.label,
            type: 'prose',
            state: view.proseStatus === 'draft' ? 'in_review' : 'missing',
            stage: 'translation',
            assignee: null,
            contributor: view.contributor,
            reviewer: view.reviewer,
            submittedAt: null,
            age: '—',
            reason: `${view.label} prose is not complete`,
            staleReason: null,
            entityId: proseKey,
            reviewItemId: null,
          })
          seen.add(proseKey)
        }
      }
      if (view.proseTier === 'full' && !view.hasAudioRecord) {
        const audioKey = `${detail.slug}:${view.language}:audio`
        if (!seen.has(audioKey)) {
          tasks.push({
            id: audioKey,
            speciesSlug: detail.slug,
            speciesName: detail.nameEn,
            language: view.language,
            languageText: view.label,
            type: 'audio',
            state: 'missing',
            stage: 'translation',
            assignee: null,
            contributor: null,
            reviewer: null,
            submittedAt: null,
            age: '—',
            reason: `No ${view.label} audio record`,
            staleReason: null,
            entityId: audioKey,
            reviewItemId: null,
          })
          seen.add(audioKey)
        }
      }
    }
  }

  const withSubmissions = tasks.map((task) =>
    overlay.submittedTasks[task.id] && task.state === 'missing'
      ? { ...task, state: 'in_review' as const }
      : task,
  )

  return withSubmissions.sort((a, b) => {
    const rank = (task: SpeciesTask) => (task.state === 'stale' ? 0 : task.state === 'in_review' ? 1 : 2)
    const byRank = rank(a) - rank(b)
    if (byRank !== 0) return byRank
    return a.speciesName.localeCompare(b.speciesName) || a.languageText.localeCompare(b.languageText)
  })
}

export function overlayAssignee(
  overlay: SpeciesOverlayState,
  task: SpeciesTask,
): string | null {
  return overlay.assignments[task.id] ?? task.assignee
}

export type BlockerLink =
  | { to: '/programme/species/$speciesId'; params: { speciesId: string } }
  | {
      to: '/programme/species/$speciesId/languages'
      params: { speciesId: string }
      search: { variant: string }
    }
  | { to: '/programme/species/translation'; search: { task: string } }
  | { to: '/programme/species/sources'; search: { source: string } }

export interface ReadinessCheck {
  id: string
  label: string
  ok: boolean
  /** The exact record the blocker belongs to. */
  record: { type: string; id: string; label: string }
  link: BlockerLink
  fix: string
  consequence: string
}

export interface ReadinessResult {
  checks: ReadinessCheck[]
  blockers: ReadinessCheck[]
  canPublish: boolean
  fallback: { language: string; label: string; name: string | null; prose: string; used: boolean }
}

function findTaskId(tasks: SpeciesTask[], slug: string, type: TaskType, language: string): string {
  return (
    tasks.find(
      (task) => task.speciesSlug === slug && task.type === type && task.language === language,
    )?.id ?? `${slug}:${language}:${type}`
  )
}

/**
 * Every readiness blocker names its record and carries a link to the exact
 * variant or record that clears it. The second-review gate is actionable from
 * here, and publish stays blocked while any derived stale variant exists.
 */
export function deriveReadiness(input: {
  detail: SpeciesDetail
  sources: SpeciesSource[]
  rights: SpeciesRights[]
  reviewItems: SpeciesReviewItem[]
  overlay: SpeciesOverlayState
  tasks: SpeciesTask[]
  now?: number
}): ReadinessResult {
  const { detail, sources, rights, reviewItems, overlay, tasks, now = Date.now() } = input
  const views = buildVariantViews(detail, overlay)
  const staleViews = views.filter((view) => view.stale)
  const english = views.find((view) => view.language === 'en')
  const swahili = views.find((view) => view.language === 'sw')
  const localNames = views.filter(
    (view) =>
      view.language !== 'en' &&
      view.language !== 'sw' &&
      view.nameStatus === 'reviewed',
  )
  const audioRecords = (detail.audio ?? []).filter(
    (record) =>
      Boolean(record.narrator) &&
      record.durationSeconds > 0 &&
      Boolean(record.rights?.consentRecord),
  )
  const audioDraftList = Object.entries(overlay.audioDrafts)
    .filter(([key]) => key.startsWith(`${detail.slug}:`))
    .map(([, draft]) => draft)
    .filter(
      (draft) =>
        draft.url && draft.narrator && draft.consentRecord && draft.durationSeconds > 0,
    )
  const where = detail.whereToSee ?? []
  const activeSources = sources.filter(
    (source) => source.reviewStatus !== 'missing' && !overlay.withdrawnSources[source.id],
  )
  const withdrawnRights = rights.filter((record) => overlay.withdrawnRights[record.id])
  const inactiveRights = rights.filter((record) => !rightsIsActive(record, now))
  const secondReview = overlay.secondReviews[detail.slug]
  const pendingPublishReview = reviewItems.some(
    (item) => item.speciesSlug === detail.slug && item.stage === 'publish' && item.status === 'pending',
  )
  const secondReviewerDiffers =
    Boolean(secondReview) &&
    secondReview!.reviewer.trim() !== '' &&
    secondReview!.reviewer !== (detail.content?.translatorRef ?? '')

  const editorLink: BlockerLink = {
    to: '/programme/species/$speciesId',
    params: { speciesId: detail.slug },
  }
  const languageLink = (language: string): BlockerLink => ({
    to: '/programme/species/$speciesId/languages',
    params: { speciesId: detail.slug },
    search: { variant: language },
  })
  const translationLink = (task: string): BlockerLink => ({
    to: '/programme/species/translation',
    search: { task },
  })
  const sourceLink = (source: string): BlockerLink => ({
    to: '/programme/species/sources',
    search: { source },
  })

  const checks: ReadinessCheck[] = [
    {
      id: 'base',
      label: 'Taxonomy: scientific name, rank and taxonomic status',
      ok: Boolean(detail.scientificName && detail.rank && detail.taxonomicStatus),
      record: { type: 'species', id: detail.slug, label: detail.scientificName },
      link: editorLink,
      fix: 'Open the species base',
      consequence: 'The catalogue and public app cannot identify the species.',
    },
    {
      id: 'iucn',
      label: 'IUCN category with an assessment and Red List link-out',
      ok: Boolean(detail.iucn?.category && detail.iucn?.assessmentId),
      record: { type: 'species', id: detail.slug, label: `${detail.scientificName} · IUCN` },
      link: editorLink,
      fix: 'Add the IUCN assessment',
      consequence: 'Conservation status cannot be shown or verified.',
    },
    {
      id: 'english',
      label: 'English base prose reviewed',
      ok: Boolean(english && english.proseStatus === 'reviewed' && !english.stale),
      record: {
        type: 'variant',
        id: `${detail.slug}:en`,
        label: `${detail.nameEn} · English prose`,
      },
      link: languageLink('en'),
      fix: 'Open the English variant',
      consequence: 'Every fallback language would resolve to unreviewed prose.',
    },
    {
      id: 'swahili',
      label: 'Kiswahili prose reviewed',
      ok: Boolean(swahili && swahili.proseTier === 'full' && swahili.proseStatus === 'reviewed' && !swahili.stale),
      record: {
        type: 'variant',
        id: `${detail.slug}:sw`,
        label: `${swahili?.name ?? detail.nameSw ?? detail.nameEn} · Kiswahili prose`,
      },
      link: translationLink(findTaskId(tasks, detail.slug, 'prose', 'sw')),
      fix: 'Open the Kiswahili task',
      consequence: 'Kiswahili readers see the visible English fallback.',
    },
    {
      id: 'names',
      label: `Reviewed local names in at least two languages (${localNames.length})`,
      ok: localNames.length >= 2,
      record: {
        type: 'name',
        id: `${detail.slug}:${localNames[0]?.language ?? 'local'}`,
        label: `${localNames.length} reviewed local name${localNames.length === 1 ? '' : 's'}`,
      },
      link: languageLink(localNames[0]?.language ?? views.find((view) => view.language !== 'en' && view.language !== 'sw')?.language ?? 'en'),
      fix: 'Review a proposed name',
      consequence: 'The app cannot show a local name where one is expected.',
    },
    {
      id: 'audio',
      label: `Audio records with speaker, consent and duration (${audioRecords.length + audioDraftList.length})`,
      ok: audioRecords.length + audioDraftList.length > 0,
      record: {
        type: 'audio',
        id: `${detail.slug}:${audioRecords[0]?.language ?? audioDraftList[0]?.language ?? 'audio'}`,
        label:
          audioRecords.length + audioDraftList.length > 0
            ? 'Audio record'
            : 'No audio with consent and duration',
      },
      link: languageLink(audioRecords[0]?.language ?? audioDraftList[0]?.language ?? 'en'),
      fix: 'Attach an audio record',
      consequence: 'Pronunciation audio is unavailable; the app says so explicitly.',
    },
    {
      id: 'where',
      label: 'Where-to-see evidence with a source',
      ok: where.length > 0 && where.every((entry) => Boolean(entry.source) && Boolean(entry.evidenceType)),
      record: {
        type: 'where_to_see',
        id: `${detail.slug}:where`,
        label: `${where.length} where-to-see record${where.length === 1 ? '' : 's'}`,
      },
      link: editorLink,
      fix: 'Open where-to-see evidence',
      consequence: 'The public app cannot show a site with provenance.',
    },
    {
      id: 'sources',
      label: 'At least one active, reviewed source',
      ok: activeSources.some((source) => source.permittedUse !== 'link_only'),
      record: {
        type: 'source',
        id: activeSources[0]?.id ?? 'none',
        label: activeSources[0]?.publisher ?? 'No active source',
      },
      link: sourceLink(activeSources[0]?.id ?? 'none'),
      fix: 'Open sources and rights',
      consequence: 'No source means no publish.',
    },
    {
      id: 'rights',
      label: 'Rights clear: no withdrawal and no expired consent',
      ok: withdrawnRights.length === 0 && inactiveRights.length === 0,
      record: {
        type: 'rights',
        id: withdrawnRights[0]?.id ?? inactiveRights[0]?.id ?? 'none',
        label: withdrawnRights[0] ? 'Withdrawn rights' : inactiveRights[0] ? 'Expired rights' : 'Rights clear',
      },
      link: sourceLink(withdrawnRights[0]?.subjectId ?? inactiveRights[0]?.subjectId ?? 'none'),
      fix: 'Record a replacement rights record',
      consequence: 'Dependent species stay unpublished until a replacement is recorded.',
    },
    {
      id: 'stale',
      label: `No stale translations (${staleViews.length})`,
      ok: staleViews.length === 0,
      record: {
        type: 'variant',
        id: `${detail.slug}:${staleViews[0]?.language ?? 'base'}`,
        label: staleViews[0] ? `${staleViews[0].label} variant` : 'No stale variants',
      },
      link: translationLink(
        findTaskId(tasks, detail.slug, 'prose', staleViews[0]?.language ?? 'sw'),
      ),
      fix: 'Re-review the stale variant',
      consequence: 'Publishing would ship prose that no longer matches the base.',
    },
    {
      id: 'second_review',
      label: 'Second review recorded by a different reviewer',
      ok: secondReviewerDiffers,
      record: {
        type: 'review',
        id: `${detail.slug}:second`,
        label: secondReview ? `Reviewed by ${secondReview.reviewer}` : 'No second review',
      },
      link: editorLink,
      fix: 'Record the second review',
      consequence: 'A single reviewer cannot approve their own content for publish.',
    },
    {
      id: 'publish_queue',
      label: 'No open publish-stage review blocker',
      ok: !pendingPublishReview,
      record: {
        type: 'review',
        id: `${detail.slug}:publish`,
        label: 'Publish-stage review',
      },
      link: translationLink(
        tasks.find((task) => task.speciesSlug === detail.slug && task.stage === 'publish')?.id ??
          `${detail.slug}:publish`,
      ),
      fix: 'Open the publish review',
      consequence: 'The publish gate is still waiting on a decision.',
    },
  ]

  const blockers = checks.filter((check) => !check.ok)
  const swahiliFallback = swahili?.proseTier === 'full' && !swahili.stale

  return {
    checks,
    blockers,
    canPublish: blockers.length === 0,
    fallback: {
      language: 'sw',
      label: 'Kiswahili',
      name: swahili?.name ?? detail.nameSw ?? null,
      prose: swahiliFallback
        ? 'Kiswahili prose is complete.'
        : 'Kiswahili prose is incomplete, so the app shows English prose with a visible “English fallback” label.',
      used: !swahiliFallback,
    },
  }
}

export interface AuditFilters {
  actor: string
  role: string
  category: string
  entity: string
  from: string
  to: string
}

export function auditFromRecords(
  details: SpeciesDetail[],
  sources: SpeciesSource[],
  rights: SpeciesRights[],
  reviewItems: SpeciesReviewItem[],
  overlay: SpeciesOverlayState,
): AuditRecord[] {
  const derived: AuditRecord[] = []
  const nameBySlug = new Map(details.map((detail) => [detail.slug, detail.nameEn]))

  for (const item of reviewItems) {
    if (item.status === 'pending') continue
    derived.push({
      id: `review:${item.id}`,
      at: item.submittedAt ?? new Date(0).toISOString(),
      actor: item.reviewerRef ?? item.assignedTo ?? 'Review queue',
      role: 'language_reviewer',
      action: `Review ${item.status.replace('_', ' ')}`,
      entityType: item.entityType,
      entityId: item.entityId,
      category: item.stage === 'rights' ? 'rights' : 'review',
      summary: nameBySlug.get(item.speciesSlug ?? '') ?? item.speciesSlug ?? 'Species record',
      detail: `${item.language ? languageLabel(item.language) : 'Base'} · ${item.stage} stage`,
      source: 'record',
    })
  }

  for (const source of sources) {
    derived.push({
      id: `source:${source.id}`,
      at: new Date(source.accessedAt ?? new Date(0)).toISOString(),
      actor: 'Source registry',
      role: 'rights_reviewer',
      action: 'Source recorded',
      entityType: 'source',
      entityId: source.id,
      category: 'rights',
      summary: source.publisher,
      detail: `${source.licenceCode} · ${source.permittedUse} · ${source.reviewStatus}`,
      source: 'record',
    })
  }

  for (const record of rights) {
    derived.push({
      id: `rights:${record.id}`,
      at: record.expiresAt ?? new Date(0).toISOString(),
      actor: record.rightsHolder,
      role: 'rights_reviewer',
      action: record.withdrawnAt ? 'Rights withdrawn' : 'Rights recorded',
      entityType: record.subjectType,
      entityId: record.subjectId,
      category: 'rights',
      summary: record.attribution,
      detail: `${record.licenceCode} · consent ${record.consentRecord ?? 'not recorded'}`,
      source: 'record',
    })
  }

  return [...overlay.audit, ...derived].sort(
    (a, b) => new Date(b.at).getTime() - new Date(a.at).getTime(),
  )
}

export function filterAudit(records: AuditRecord[], filters: AuditFilters): AuditRecord[] {
  const from = filters.from ? new Date(filters.from).getTime() : null
  const to = filters.to ? new Date(filters.to).getTime() + 86_400_000 : null
  return records.filter((record) => {
    if (filters.actor !== 'all' && record.actor !== filters.actor) return false
    if (filters.role !== 'all' && record.role !== filters.role) return false
    if (filters.category !== 'all' && record.category !== filters.category) return false
    if (
      filters.entity.trim() &&
      !`${record.entityType} ${record.entityId} ${record.summary}`
        .toLowerCase()
        .includes(filters.entity.trim().toLowerCase())
    ) {
      return false
    }
    const at = new Date(record.at).getTime()
    if (from !== null && at < from) return false
    if (to !== null && at >= to) return false
    return true
  })
}

export function auditToCsv(records: AuditRecord[]): string {
  const header = ['at', 'actor', 'role', 'category', 'action', 'entityType', 'entityId', 'summary', 'detail']
  const escape = (value: string) => `"${value.replaceAll('"', '""')}"`
  const rows = records.map((record) =>
    [
      record.at,
      record.actor,
      record.role,
      record.category,
      record.action,
      record.entityType,
      record.entityId,
      record.summary,
      record.detail,
    ]
      .map(escape)
      .join(','),
  )
  return [header.join(','), ...rows].join('\n')
}

/**
 * A base edit that changes a language-neutral field stales every prose variant.
 * The comparison is against the last saved draft when one exists, so repeated
 * saves of the same revision do not re-stale anything.
 */
export function baseEditChangesProse(
  previous: SpeciesDetail,
  draft: BaseDraft,
  lastSaved?: BaseDraft | null,
): boolean {
  const baseline = lastSaved ?? {
    scientificName: previous.scientificName,
    taxonomicRank: previous.rank ?? '',
    taxonomicStatus: previous.taxonomicStatus ?? '',
    gbifKey: previous.gbifKey ?? '',
    iucnCategory: previous.iucn?.category ?? '',
    iucnAssessmentId: previous.iucn?.assessmentId ?? '',
  }
  return (
    baseline.scientificName !== draft.scientificName ||
    baseline.taxonomicRank !== draft.taxonomicRank ||
    baseline.taxonomicStatus !== draft.taxonomicStatus ||
    baseline.gbifKey !== draft.gbifKey ||
    baseline.iucnCategory !== draft.iucnCategory ||
    baseline.iucnAssessmentId !== draft.iucnAssessmentId
  )
}
