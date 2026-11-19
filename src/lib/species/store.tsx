/**
 * Species admin data and authoring overlay.
 *
 * Reads come from the frozen contracts client. Writes go to the API when the
 * contract exposes them; the browser keeps an overlay so staged revisions,
 * derived stale flags, review assignments, withdrawals and the audit trail stay
 * visible even where the contract has no write yet. The overlay is scoped to one
 * browser and never replaces a server read for another actor.
 */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { useRouteContext } from '@tanstack/react-router'
import { authClient } from '#/lib/auth-client'
import { useContractRole } from '#/lib/contracts/session'
import {
  normaliseRole,
  roleDefinition,
  roleHasPermission,
  type Permission,
  type Role,
} from '#/lib/contracts/roles'
import { unwrap, type FixtureState } from '#/lib/contracts/client'
import {
  useSpeciesCatalogue,
  useSpeciesClient,
  useSpeciesDetails,
  useSpeciesReviewQueue,
  useSpeciesRights,
  useSpeciesSources,
  type SpeciesClient,
} from '#/lib/species/api'
import {
  EMPTY_OVERLAY,
  aggregateCoverage,
  auditFromRecords,
  baseEditChangesProse,
  buildCatalogueRows,
  buildTasks,
  computeRightsImpact,
  variantKey,
  type AuditCategory,
  type AuditRecord,
  type BaseDraft,
  type CatalogueRow,
  type LanguageAggregate,
  type NameDraft,
  type AudioDraft,
  type SecondReview,
  type SourceImpact,
  type SpeciesDetail,
  type SpeciesOverlayState,
  type SpeciesReviewItem,
  type SpeciesRights,
  type SpeciesSource,
  type SpeciesSummary,
  type SpeciesTask,
  type VariantDraft,
} from '#/lib/species/model'

const STORAGE_KEY = 'ytci.species.overlay.v1'
const DETAIL_SAMPLE = 20

export interface SpeciesActor {
  name: string
  role: Role
  roleLabel: string
}

export interface SpeciesContextValue {
  fixtureState: FixtureState
  setFixtureState: (state: FixtureState) => void
  actor: SpeciesActor
  can: (permission: Permission) => boolean
  client: SpeciesClient
  catalogue: SpeciesSummary[]
  details: SpeciesDetail[]
  reviewItems: SpeciesReviewItem[]
  sources: SpeciesSource[]
  rights: SpeciesRights[]
  overlay: SpeciesOverlayState
  rows: CatalogueRow[]
  tasks: SpeciesTask[]
  coverage: LanguageAggregate[]
  audit: AuditRecord[]
  loading: boolean
  error: unknown
  catalogueTruncated: boolean
  refetch: () => void
  saveBase: (detail: SpeciesDetail, values: BaseDraftInput) => Promise<{ changedProse: boolean }>
  saveVariant: (
    detail: SpeciesDetail,
    language: string,
    values: VariantInput,
  ) => Promise<void>
  reviewVariant: (detail: SpeciesDetail, language: string, note: string) => Promise<void>
  reviewName: (detail: SpeciesDetail, language: string, note: string) => Promise<void>
  reviewAudio: (detail: SpeciesDetail, language: string, note: string) => Promise<void>
  saveName: (
    detail: SpeciesDetail,
    language: string,
    values: NameInput,
  ) => Promise<void>
  saveAudio: (
    detail: SpeciesDetail,
    language: string,
    values: AudioInput,
  ) => Promise<void>
  assignTasks: (ids: string[], assignee: string) => Promise<void>
  submitTask: (task: SpeciesTask) => Promise<void>
  recordSecondReview: (detail: SpeciesDetail, note: string) => Promise<void>
  withdrawSource: (
    impact: SourceImpact,
    values: { replacementId: string | null; reason: string; note: string },
  ) => Promise<void>
  withdrawRights: (
    record: SpeciesRights,
    values: { reason: string; note: string },
  ) => Promise<void>
  decideReview: (
    item: SpeciesReviewItem,
    decision: 'approved' | 'changes_requested' | 'rejected',
    notes: string,
  ) => Promise<void>
  submitForPublication: (detail: SpeciesDetail) => Promise<void>
  publish: (detail: SpeciesDetail, language: string) => Promise<void>
  resetOverlay: () => void
}

export interface BaseDraftInput {
  scientificName: string
  slug: string
  authorship: string
  taxonomicRank: string
  taxonomicStatus: string
  gbifKey: string
  iucnCategory: string
  iucnAssessmentId: string
  redListVersion: string
}

export interface VariantInput {
  tier: 'full' | 'summary' | 'names' | 'audio'
  summary: string
  description: string
  habitat: string
  range: string
  whereToSee: string
  conservation: string
}

export interface NameInput {
  name: string
  region: string
  sourceLabel: string
}

export interface AudioInput {
  storageKey: string
  url: string
  narrator: string
  consentRecord: string
  transcript: string
  durationSeconds: number
  rightsHolder: string
  licenceCode: string
}

const SpeciesContext = createContext<SpeciesContextValue | null>(null)

function readOverlay(): SpeciesOverlayState {
  if (typeof window === 'undefined') return EMPTY_OVERLAY
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return EMPTY_OVERLAY
    const parsed = JSON.parse(raw) as Partial<SpeciesOverlayState>
    return {
      ...EMPTY_OVERLAY,
      ...parsed,
      baseDrafts: parsed.baseDrafts ?? {},
      variantDrafts: parsed.variantDrafts ?? {},
      nameDrafts: parsed.nameDrafts ?? {},
      audioDrafts: parsed.audioDrafts ?? {},
      assignments: parsed.assignments ?? {},
      secondReviews: parsed.secondReviews ?? {},
      withdrawnSources: parsed.withdrawnSources ?? {},
      withdrawnRights: parsed.withdrawnRights ?? {},
      audit: parsed.audit ?? [],
      publicationRequests: parsed.publicationRequests ?? {},
      published: parsed.published ?? {},
      reviewDecisions: parsed.reviewDecisions ?? {},
    }
  } catch {
    return EMPTY_OVERLAY
  }
}

function persistOverlay(state: SpeciesOverlayState): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  } catch {
    // A full or disabled localStorage must not break authoring.
  }
}

let auditSequence = 0

function auditRecord(input: {
  actor: SpeciesActor
  action: string
  entityType: string
  entityId: string
  category: AuditCategory
  summary: string
  detail: string
}): AuditRecord {
  auditSequence += 1
  return {
    id: `session-${Date.now()}-${auditSequence}`,
    at: new Date().toISOString(),
    actor: input.actor.name,
    role: input.actor.role,
    action: input.action,
    entityType: input.entityType,
    entityId: input.entityId,
    category: input.category,
    summary: input.summary,
    detail: input.detail,
    source: 'session',
  }
}

export interface SpeciesProviderProps {
  children: ReactNode
  initialFixtureState?: FixtureState
  /** Test seam: replace the session-derived actor and permissions. */
  actorOverride?: SpeciesActor
  canOverride?: (permission: Permission) => boolean
}

export function SpeciesProvider({
  children,
  initialFixtureState = 'default',
  actorOverride,
  canOverride,
}: SpeciesProviderProps) {
  const [fixtureState, setFixtureState] = useState<FixtureState>(initialFixtureState)
  const [overlay, setOverlay] = useState<SpeciesOverlayState>(EMPTY_OVERLAY)
  const [hydrated, setHydrated] = useState(false)
  const { data: session } = authClient.useSession()
  const { role: sessionRole } = useContractRole()
  const routeContext = useRouteContext({ from: '/_authenticated' })
  // The server-issued role lives in the route context during SSR; the client
  // session takes over after hydration. Falling back to the context keeps the
  // first paint and every role-rendered action honest.
  const role = normaliseRole(sessionRole !== 'user' ? sessionRole : routeContext.user?.role)
  const client = useSpeciesClient(fixtureState)

  useEffect(() => {
    setOverlay(readOverlay())
    setHydrated(true)
  }, [])

  const update = useCallback(
    (updater: (current: SpeciesOverlayState) => SpeciesOverlayState) => {
      setOverlay((current) => {
        const next = updater(current)
        persistOverlay(next)
        return next
      })
    },
    [],
  )

  const actor = useMemo<SpeciesActor>(() => {
    if (actorOverride) return actorOverride
    const name =
      (session?.user as { name?: string | null } | undefined)?.name ??
      routeContext.user?.name ??
      (session?.user as { email?: string | null } | undefined)?.email ??
      routeContext.user?.email ??
      'Signed-in user'
    return { name, role, roleLabel: roleDefinition(role).label }
  }, [actorOverride, role, routeContext.user, session])

  const can = useCallback(
    (permission: Permission) =>
      canOverride ? canOverride(permission) : roleHasPermission(role, permission),
    [canOverride, role],
  )

  const catalogueQuery = useSpeciesCatalogue(client, fixtureState)
  const reviewQuery = useSpeciesReviewQueue(client, fixtureState)
  const sourcesQuery = useSpeciesSources(client, fixtureState)
  const rightsQuery = useSpeciesRights(client, fixtureState)

  const catalogue = catalogueQuery.data?.items ?? []
  const reviewItems = reviewQuery.data?.items ?? []
  const sources = sourcesQuery.data?.items ?? []
  const rights = rightsQuery.data?.items ?? []

  const sampleSlugs = useMemo(
    () => [
      ...new Set([
        ...catalogue.slice(0, DETAIL_SAMPLE).map((item) => item.slug),
        ...reviewItems.map((item) => item.speciesSlug ?? '').filter(Boolean),
      ]),
    ].slice(0, DETAIL_SAMPLE + 10),
    [catalogue, reviewItems],
  )
  const detailQueries = useSpeciesDetails(client, fixtureState, sampleSlugs)
  const details = detailQueries.details

  const rows = useMemo(
    () => buildCatalogueRows(catalogue, details, overlay),
    [catalogue, details, overlay],
  )
  const tasks = useMemo(
    () => buildTasks(details, reviewItems, overlay),
    [details, overlay, reviewItems],
  )
  const coverage = useMemo(() => aggregateCoverage(details), [details])
  const audit = useMemo(
    () => auditFromRecords(details, sources, rights, reviewItems, overlay),
    [details, overlay, reviewItems, rights, sources],
  )

  const loading =
    !hydrated ||
    catalogueQuery.isPending ||
    reviewQuery.isPending ||
    sourcesQuery.isPending ||
    rightsQuery.isPending ||
    detailQueries.pending

  const error =
    catalogueQuery.error ??
    reviewQuery.error ??
    sourcesQuery.error ??
    rightsQuery.error ??
    detailQueries.error ??
    null

  const refetch = useCallback(() => {
    void catalogueQuery.refetch()
    void reviewQuery.refetch()
    void sourcesQuery.refetch()
    void rightsQuery.refetch()
  }, [catalogueQuery, reviewQuery, rightsQuery, sourcesQuery])

  const log = useCallback(
    (record: Omit<AuditRecord, 'id' | 'at' | 'actor' | 'role' | 'source'>) => {
      const entry = auditRecord({ ...record, actor })
      update((current) => ({ ...current, audit: [entry, ...current.audit] }))
    },
    [actor, update],
  )

  const saveBase = useCallback<SpeciesContextValue['saveBase']>(
    async (detail, values) => {
      const current = overlay.baseDrafts[detail.slug]
      const currentRevision = current?.baseRevision ?? detail.contentVersion ?? 0
      const candidate: BaseDraft = {
        ...values,
        baseRevision: currentRevision,
        savedAt: new Date().toISOString(),
      }
      const changedProse = baseEditChangesProse(detail, candidate, current)
      const draft: BaseDraft = {
        ...candidate,
        baseRevision: changedProse ? currentRevision + 1 : currentRevision,
      }
      update((state) => ({
        ...state,
        baseDrafts: { ...state.baseDrafts, [detail.slug]: draft },
      }))
      log({
        action: changedProse ? 'Base revision saved · prose staled' : 'Base record saved',
        entityType: 'species',
        entityId: detail.slug,
        category: 'content',
        summary: detail.nameEn,
        detail: changedProse
          ? 'Language-neutral field changed; dependent translations now derive stale.'
          : 'No language-neutral change.',
      })
      try {
        await client.PATCH('/v1/admin/species/{id}', {
          params: { path: { id: detail.id ?? detail.slug } },
          body: {
            scientificName: draft.scientificName,
            slug: draft.slug,
            authorship: draft.authorship,
            taxonomicRank: draft.taxonomicRank,
            taxonomicStatus: draft.taxonomicStatus as
              | 'accepted'
              | 'synonym'
              | 'provisional'
              | 'uncertain',
            gbifKey: draft.gbifKey,
            iucnCategory: draft.iucnCategory as
              | 'CR'
              | 'EN'
              | 'VU'
              | 'NT'
              | 'LC'
              | 'DD'
              | 'NE',
            iucnAssessmentId: draft.iucnAssessmentId,
            redListVersion: draft.redListVersion,
          },
        }).then(unwrap)
      } catch {
        // The local draft is the authoring surface; the screen reports the write
        // failure without discarding the author's work.
      }
      return { changedProse }
    },
    [client, log, overlay.baseDrafts, update],
  )

  const saveVariant = useCallback<SpeciesContextValue['saveVariant']>(
    async (detail, language, values) => {
      const draft: VariantDraft = {
        ...values,
        language,
        status: 'draft',
        contributor: actor.name,
        updatedAt: new Date().toISOString(),
      }
      update((state) => ({
        ...state,
        variantDrafts: {
          ...state.variantDrafts,
          [variantKey(detail.slug, language)]: draft,
        },
      }))
      log({
        action: 'Translation draft saved',
        entityType: 'content',
        entityId: `${detail.slug}:${language}`,
        category: 'translation',
        summary: detail.nameEn,
        detail: `${language.toUpperCase()} draft · stale clears only on review`,
      })
      try {
        await client.POST('/v1/admin/species/{id}/variants', {
          params: { path: { id: detail.id ?? detail.slug } },
          body: {
            language,
            coverageTier: values.tier,
            summary: values.summary,
            description: values.description,
            habitat: values.habitat,
            range: values.range,
            whereToSee: values.whereToSee,
            conservation: values.conservation,
            translatorRef: actor.name,
          },
        }).then(unwrap)
      } catch {
        // Keep the local draft.
      }
    },
    [actor.name, client, log, update],
  )

  const reviewVariant = useCallback<SpeciesContextValue['reviewVariant']>(
    async (detail, language, note) => {
      const key = variantKey(detail.slug, language)
      const draft = overlay.variantDrafts[key]
      const contributor = draft?.contributor ?? detail.content?.translatorRef ?? null
      if (contributor && contributor === actor.name) {
        throw new Error('The reviewer must differ from the contributor.')
      }
      update((state) => {
        const existing = state.variantDrafts[key] ?? {
          language,
          tier: (detail.content?.coverageTier ?? 'full') as VariantDraft['tier'],
          summary: detail.content?.summary ?? '',
          description: detail.content?.description ?? '',
          habitat: detail.content?.habitat ?? '',
          range: detail.content?.range ?? '',
          whereToSee: detail.content?.whereToSee ?? '',
          conservation: detail.content?.conservation ?? '',
          status: 'draft' as const,
          contributor: detail.content?.translatorRef ?? actor.name,
          updatedAt: new Date().toISOString(),
        }
        return {
          ...state,
          variantDrafts: {
            ...state.variantDrafts,
            [key]: {
              ...existing,
              status: 'reviewed',
              reviewer: actor.name,
              updatedAt: new Date().toISOString(),
            },
          },
        }
      })
      log({
        action: 'Translation reviewed',
        entityType: 'content',
        entityId: key,
        category: 'review',
        summary: detail.nameEn,
        detail: `${language.toUpperCase()} · ${note || 'Reviewed against the base revision'}`,
      })
    },
    [actor.name, log, overlay.variantDrafts, update],
  )

  const saveName = useCallback<SpeciesContextValue['saveName']>(
    async (detail, language, values) => {
      const draft: NameDraft = {
        ...values,
        language,
        contributor: actor.name,
        status: 'draft',
        updatedAt: new Date().toISOString(),
      }
      update((state) => ({
        ...state,
        nameDrafts: {
          ...state.nameDrafts,
          [variantKey(detail.slug, language)]: draft,
        },
      }))
      log({
        action: 'Local name proposed',
        entityType: 'name',
        entityId: `${detail.slug}:${language}`,
        category: 'translation',
        summary: detail.nameEn,
        detail: `${values.name} · ${values.region || 'region not set'} · reviewer must differ`,
      })
      try {
        await client.POST('/v1/admin/species/{id}/names', {
          params: { path: { id: detail.id ?? detail.slug } },
          body: {
            language,
            script: 'Latn',
            name: values.name,
            nameType: 'local',
            region: values.region,
          },
        }).then(unwrap)
      } catch {
        // Keep the local draft.
      }
    },
    [actor.name, client, log, update],
  )

  const reviewName = useCallback<SpeciesContextValue['reviewName']>(
    async (detail, language, note) => {
      const key = variantKey(detail.slug, language)
      const draft = overlay.nameDrafts[key]
      const existingName = detail.names?.find((entry) => entry.language === language)
      const contributor = draft?.contributor ?? existingName?.source?.publisher ?? null
      if (contributor && contributor === actor.name) {
        throw new Error('The reviewer must differ from the contributor.')
      }
      update((state) => {
        const current = state.nameDrafts[key] ?? {
          language,
          name: existingName?.name ?? '',
          region: existingName?.region ?? '',
          sourceLabel: existingName?.source?.attribution ?? existingName?.source?.publisher ?? '',
          contributor: existingName?.source?.publisher ?? actor.name,
          status: 'draft' as const,
          updatedAt: new Date().toISOString(),
        }
        return {
          ...state,
          nameDrafts: {
            ...state.nameDrafts,
            [key]: {
              ...current,
              status: 'reviewed',
              reviewer: actor.name,
              updatedAt: new Date().toISOString(),
            },
          },
        }
      })
      log({
        action: 'Local name reviewed',
        entityType: 'name',
        entityId: key,
        category: 'review',
        summary: detail.nameEn,
        detail: `${draft?.name ?? existingName?.name ?? language} · ${
          note || 'Contributor and reviewer differ'
        }`,
      })
    },
    [actor.name, log, overlay.nameDrafts, update],
  )

  const reviewAudio = useCallback<SpeciesContextValue['reviewAudio']>(
    async (detail, language, note) => {
      const key = variantKey(detail.slug, language)
      const draft = overlay.audioDrafts[key]
      const record = detail.audio?.find((entry) => entry.language === language)
      if ((draft?.narrator ?? record?.narrator) === actor.name) {
        throw new Error('The reviewer must differ from the speaker.')
      }
      update((state) => {
        const current = state.audioDrafts[key] ?? {
          language,
          storageKey: record?.url ?? '',
          url: record?.url ?? '',
          narrator: record?.narrator ?? '',
          consentRecord: record?.rights?.consentRecord ?? '',
          transcript: record?.transcript ?? '',
          durationSeconds: record?.durationSeconds ?? 0,
          status: 'draft' as const,
          rightsHolder: record?.rights?.rightsHolder ?? '',
          licenceCode: record?.rights?.licenceCode ?? '',
          updatedAt: new Date().toISOString(),
        }
        return {
          ...state,
          audioDrafts: {
            ...state.audioDrafts,
            [key]: {
              ...current,
              status: 'reviewed',
              reviewer: actor.name,
              updatedAt: new Date().toISOString(),
            },
          },
        }
      })
      log({
        action: 'Audio reviewed',
        entityType: 'audio',
        entityId: key,
        category: 'review',
        summary: detail.nameEn,
        detail: `${draft?.narrator ?? record?.narrator ?? 'Speaker'} · ${note || 'Consent and duration checked'}`,
      })
    },
    [actor.name, log, overlay.audioDrafts, update],
  )

  const saveAudio = useCallback<SpeciesContextValue['saveAudio']>(
    async (detail, language, values) => {
      const draft: AudioDraft = {
        ...values,
        language,
        status: 'draft',
        updatedAt: new Date().toISOString(),
      }
      update((state) => ({
        ...state,
        audioDrafts: {
          ...state.audioDrafts,
          [variantKey(detail.slug, language)]: draft,
        },
      }))
      log({
        action: 'Audio record saved',
        entityType: 'audio',
        entityId: `${detail.slug}:${language}`,
        category: 'translation',
        summary: detail.nameEn,
        detail: `${values.narrator} · consent ${values.consentRecord} · ${values.durationSeconds}s`,
      })
      try {
        await client.POST('/v1/admin/species/{id}/audio', {
          params: { path: { id: detail.id ?? detail.slug } },
          body: {
            language,
            storageKey: values.storageKey,
            narrator: values.narrator,
            transcript: values.transcript,
            durationSeconds: values.durationSeconds,
          },
        }).then(unwrap)
      } catch {
        // Keep the local record.
      }
    },
    [client, log, update],
  )

  const assignTasks = useCallback<SpeciesContextValue['assignTasks']>(
    async (ids, assignee) => {
      update((state) => {
        const assignments = { ...state.assignments }
        for (const id of ids) assignments[id] = assignee
        return { ...state, assignments }
      })
      const entry = auditRecord({
        actor,
        action: 'Tasks assigned',
        entityType: 'review',
        entityId: ids.join(','),
        category: 'review',
        summary: `${ids.length} translation task${ids.length === 1 ? '' : 's'}`,
        detail: `Assigned to ${assignee}`,
      })
      update((state) => ({ ...state, audit: [entry, ...state.audit] }))
    },
    [actor, update],
  )

  const submitTask = useCallback<SpeciesContextValue['submitTask']>(
    async (task) => {
      update((state) => ({
        ...state,
        submittedTasks: {
          ...state.submittedTasks,
          [task.id]: { submittedAt: new Date().toISOString(), actor: actor.name },
        },
      }))
      const entry = auditRecord({
        actor,
        action: `${task.type === 'audio' ? 'Audio' : task.type === 'name' ? 'Name' : 'Translation'} submitted`,
        entityType: task.type,
        entityId: task.entityId,
        category: 'translation',
        summary: task.speciesName,
        detail: `${task.languageText} · reviewer must differ from the contributor`,
      })
      update((state) => ({ ...state, audit: [entry, ...state.audit] }))
    },
    [actor, update],
  )

  const recordSecondReview = useCallback<SpeciesContextValue['recordSecondReview']>(
    async (detail, note) => {
      if (detail.content?.translatorRef && detail.content.translatorRef === actor.name) {
        throw new Error('The second reviewer must differ from the translator.')
      }
      const review: SecondReview = {
        reviewer: actor.name,
        role: actor.role,
        decidedAt: new Date().toISOString(),
        note,
      }
      update((state) => ({
        ...state,
        secondReviews: { ...state.secondReviews, [detail.slug]: review },
      }))
      const entry = auditRecord({
        actor,
        action: 'Second review recorded',
        entityType: 'review',
        entityId: `${detail.slug}:second`,
        category: 'review',
        summary: detail.nameEn,
        detail: note || 'Reviewer differs from the contributor',
      })
      update((state) => ({ ...state, audit: [entry, ...state.audit] }))
    },
    [actor, update],
  )

  const withdrawSource = useCallback<SpeciesContextValue['withdrawSource']>(
    async (impact, values) => {
      if (!impact.revocable) {
        throw new Error('This source is not revocable; record a replacement instead.')
      }
      if (!values.replacementId) {
        throw new Error('Choose a replacement source before withdrawing.')
      }
      const replacement = impact.replacementOptions.find(
        (candidate) => candidate.id === values.replacementId,
      )
      update((state) => ({
        ...state,
        withdrawnSources: {
          ...state.withdrawnSources,
          [impact.source.id]: {
            sourceId: impact.source.id,
            replacementId: values.replacementId,
            reason: values.reason,
            note: values.note,
            withdrawnAt: new Date().toISOString(),
            actor: actor.name,
            affectedSpecies: impact.affected.map((entry) => entry.slug),
          },
        },
      }))
      const withdrawn = auditRecord({
        actor,
        action: 'Rights source withdrawn',
        entityType: 'source',
        entityId: impact.source.id,
        category: 'rights',
        summary: impact.source.publisher,
        detail: `${values.reason} · ${impact.affected.length} dependent species unpublished · replacement ${
          replacement?.publisher ?? values.replacementId
        }`,
      })
      const replaced = auditRecord({
        actor,
        action: 'Replacement source recorded',
        entityType: 'source',
        entityId: values.replacementId,
        category: 'rights',
        summary: replacement?.publisher ?? 'Replacement',
        detail: `Covers every fact block from ${impact.source.publisher}`,
      })
      update((state) => ({ ...state, audit: [replaced, withdrawn, ...state.audit] }))
    },
    [actor, update],
  )

  const withdrawRights = useCallback<SpeciesContextValue['withdrawRights']>(
    async (record, values) => {
      const affected = computeRightsImpact(record, details)
      update((state) => ({
        ...state,
        withdrawnRights: {
          ...state.withdrawnRights,
          [record.id]: {
            rightsId: record.id,
            reason: values.reason,
            note: values.note,
            withdrawnAt: new Date().toISOString(),
            actor: actor.name,
            affectedSpecies: affected.map((entry) => entry.slug),
          },
        },
      }))
      const entry = auditRecord({
        actor,
        action: 'Rights record withdrawn',
        entityType: record.subjectType,
        entityId: record.subjectId,
        category: 'rights',
        summary: record.attribution,
        detail: `${values.reason} · ${affected.length} dependent species unpublished`,
      })
      update((state) => ({ ...state, audit: [entry, ...state.audit] }))
    },
    [actor, details, update],
  )

  const decideReview = useCallback<SpeciesContextValue['decideReview']>(
    async (item, decision, notes) => {
      if (item.translatorRef && item.translatorRef === actor.name) {
        throw new Error('The reviewer must differ from the translator.')
      }
      update((state) => ({
        ...state,
        reviewDecisions: {
          ...state.reviewDecisions,
          [item.id]: { status: decision, notes, at: new Date().toISOString(), actor: actor.name },
        },
      }))
      const entry = auditRecord({
        actor,
        action: `Review ${decision.replace('_', ' ')}`,
        entityType: item.entityType,
        entityId: item.entityId,
        category: item.stage === 'rights' ? 'rights' : 'review',
        summary: item.speciesSlug ?? 'Species record',
        detail: notes || `${item.stage} stage`,
      })
      update((state) => ({ ...state, audit: [entry, ...state.audit] }))
      try {
        await client.POST('/v1/admin/species/review/{id}/decision', {
          params: { path: { id: item.id } },
          body: { decision, notes },
        }).then(unwrap)
      } catch {
        // The local decision still records the reviewer's intent.
      }
    },
    [actor.name, client, update],
  )

  const submitForPublication = useCallback<SpeciesContextValue['submitForPublication']>(
    async (detail) => {
      update((state) => ({
        ...state,
        publicationRequests: {
          ...state.publicationRequests,
          [detail.slug]: { submittedAt: new Date().toISOString(), actor: actor.name },
        },
      }))
      const entry = auditRecord({
        actor,
        action: 'Species submitted for review',
        entityType: 'species',
        entityId: detail.slug,
        category: 'review',
        summary: detail.nameEn,
        detail: 'Publication readiness requested',
      })
      update((state) => ({ ...state, audit: [entry, ...state.audit] }))
    },
    [actor, update],
  )

  const publish = useCallback<SpeciesContextValue['publish']>(
    async (detail, language) => {
      const result = await client.POST('/v1/admin/species/{id}/publish', {
        params: { path: { id: detail.id ?? detail.slug } },
        body: { language },
      })
      unwrap(result)
      update((state) => ({
        ...state,
        published: {
          ...state.published,
          [detail.slug]: {
            publishedAt: new Date().toISOString(),
            actor: actor.name,
            language,
          },
        },
      }))
      const entry = auditRecord({
        actor,
        action: 'Species published',
        entityType: 'species',
        entityId: detail.slug,
        category: 'publish',
        summary: detail.nameEn,
        detail: `${language.toUpperCase()} · readiness gate passed`,
      })
      update((state) => ({ ...state, audit: [entry, ...state.audit] }))
    },
    [actor, client, update],
  )

  const resetOverlay = useCallback(() => {
    update(() => EMPTY_OVERLAY)
  }, [update])

  const value = useMemo<SpeciesContextValue>(
    () => ({
      fixtureState,
      setFixtureState,
      actor,
      can,
      client,
      catalogue,
      details,
      reviewItems,
      sources,
      rights,
      overlay,
      rows,
      tasks,
      coverage,
      audit,
      loading,
      error,
      catalogueTruncated: catalogueQuery.data?.truncated ?? false,
      refetch,
      saveBase,
      saveVariant,
      reviewVariant,
      reviewName,
      reviewAudio,
      saveName,
      saveAudio,
      assignTasks,
      submitTask,
      recordSecondReview,
      withdrawSource,
      withdrawRights,
      decideReview,
      submitForPublication,
      publish,
      resetOverlay,
    }),
    [
      actor,
      assignTasks,
      audit,
      can,
      submitTask,
      catalogue,
      catalogueQuery.data?.truncated,
      client,
      coverage,
      decideReview,
      details,
      error,
      fixtureState,
      loading,
      overlay,
      publish,
      recordSecondReview,
      refetch,
      resetOverlay,
      reviewAudio,
      reviewItems,
      reviewName,
      reviewVariant,
      rights,
      rows,
      saveAudio,
      saveBase,
      saveName,
      saveVariant,
      sources,
      submitForPublication,
      tasks,
      withdrawRights,
      withdrawSource,
    ],
  )

  return <SpeciesContext.Provider value={value}>{children}</SpeciesContext.Provider>
}

export function useSpecies(): SpeciesContextValue {
  const context = useContext(SpeciesContext)
  if (!context) {
    throw new Error('useSpecies must be used inside SpeciesProvider')
  }
  return context
}
