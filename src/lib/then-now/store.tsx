import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import { useRouteContext } from '@tanstack/react-router'
import { authClient } from '#/lib/auth-client'
import { hasPermission, type Action } from '#/lib/authz'
import {
  asStaleSiteError,
  loadThenNowState,
  mapApiAuditEvent,
  mapApiExperience,
  mapApiReviewRow,
  mapApiSite,
  requireOpenRevision,
  siteCreatePayload,
  sitePatchPayload,
  snapshotFromExperience,
  thenNowErrorMessage,
  type ThenNowApiExperienceDetail,
  type ThenNowApiSnapshot,
  type ThenNowReviewRow,
} from '#/lib/api/then-now'
import { useApi } from '#/lib/api/use-api'
import { createFixtures } from './fixtures'
import { formatEat, nowIso } from './format'
import { siteReadiness } from './readiness'
import {
  ThenNowWorkflowError,
  approveRevision,
  archiveExperience,
  assignReviewer,
  cancelSchedule,
  createRevision,
  publishRevision,
  recordClientApproval as recordClientApprovalWorkflow,
  recordExternalReviewer as recordExternalReviewerWorkflow,
  rejectRevision,
  requestChanges,
  returnToDraft,
  revokeExperience,
  scheduleRevision,
  submitRevision,
  unpublishExperience,
} from './workflow'
import type {
  AuditEvent,
  ClientApproval,
  Experience,
  ExternalReviewer,
  HeritageSite,
  Scenario,
  TextCard,
  ThenNowState,
} from './types'

const STORAGE_KEY = 'ytci.thenNow.fixtures.v1'

export type CreateSiteInput = Partial<HeritageSite> &
  Pick<HeritageSite, 'name' | 'county' | 'type' | 'access' | 'sensitivity'>

export type CreateExperienceInput = {
  siteId: string
  title: string
  promise?: string
  mode: Experience['mode']
  period?: string
  duration?: number
  rights?: string
  rightsExpiry?: string
  consent?: string
  sensitivity?: Experience['sensitivity']
  textCards?: TextCard[]
  videoMaster?: string
  videoSize?: string
  poster?: boolean
}

export interface ReviewQueueState {
  status: 'idle' | 'loading' | 'ready' | 'error'
  items: ThenNowReviewRow[]
  error: string | null
}

interface ThenNowActions {
  reset: () => void
  createSite: (input: CreateSiteInput) => Promise<string>
  updateSite: (id: string, patch: Partial<HeritageSite>) => Promise<void>
  saveSite: (id: string, patch?: Partial<HeritageSite>) => Promise<void>
  publishSite: (id: string, patch?: Partial<HeritageSite>) => Promise<void>
  unpublishSite: (id: string, reason?: string) => Promise<void>
  archiveSite: (id: string, reason?: string) => Promise<void>
  createExperience: (input: CreateExperienceInput) => Promise<string>
  updateExperience: (id: string, patch: Partial<Experience>) => Promise<void>
  saveExperience: (id: string, patch?: Partial<Experience>) => Promise<void>
  submitExperience: (id: string, patch?: Partial<Experience>) => Promise<void>
  assignReviewer: (id: string, reviewer: string) => Promise<void>
  unassignReviewer: (id: string) => Promise<void>
  approveRevision: (id: string, note: string) => Promise<void>
  requestChanges: (id: string, note: string) => Promise<void>
  rejectRevision: (id: string, note: string) => Promise<void>
  returnToDraft: (id: string, reason: string) => Promise<void>
  publishExperience: (id: string) => Promise<void>
  scheduleExperience: (id: string, at: string, note: string) => Promise<void>
  cancelSchedule: (id: string) => Promise<void>
  unpublishExperience: (id: string, reason?: string) => Promise<void>
  archiveExperience: (id: string, reason?: string) => Promise<void>
  revokeExperience: (id: string, reason?: string) => Promise<void>
  newRevision: (id: string) => Promise<void>
  recordClientApproval: (id: string, approval: ClientApproval) => Promise<void>
  recordExternalReviewer: (id: string, reviewer: ExternalReviewer) => Promise<void>
}

interface ThenNowContextValue {
  state: ThenNowState
  scenario: Scenario
  /** Where the current read model came from. Writes follow the same source. */
  source: 'fixtures' | 'api'
  /** `loading` until the first API read settles, then `live` or `fallback`. */
  apiStatus: 'loading' | 'live' | 'fallback'
  apiError: string | null
  review: ReviewQueueState
  role: string
  actor: string
  can: (action: Action) => boolean
  setScenario: (scenario: Scenario) => void
  actions: ThenNowActions
  /** Re-read sites, experiences, and audit from the API. */
  refresh: () => Promise<void>
  /** Re-read the audit log without touching sites or experiences. */
  refreshAudit: () => Promise<void>
  /** Load a frozen revision by revision id and merge it into the store. */
  loadReview: (revisionId: string) => Promise<Experience | null>
  /** Load a full experience detail (snapshot + readiness) by experience id. */
  loadExperience: (id: string) => Promise<Experience | null>
  /** Load the review queue from the API (fixtures in fallback mode). */
  loadReviewQueue: () => Promise<void>
}

const ThenNowContext = createContext<ThenNowContextValue | null>(null)

function storedState(): ThenNowState | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as ThenNowState
    if (!parsed || !Array.isArray(parsed.sites) || typeof parsed.experiences !== 'object') {
      return null
    }
    return parsed
  } catch {
    return null
  }
}

function createAudit(
  actor: string,
  entity: string,
  type: string,
  title: string,
  note?: string,
  at = nowIso(),
): AuditEvent {
  return {
    id: `${entity}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    entity,
    type,
    title,
    meta: `${actor} · ${formatEat(at)}`,
    note,
  }
}

function updateAudit(state: ThenNowState, event: AuditEvent): AuditEvent[] {
  return [event, ...state.audit]
}

function fixtureReviewRows(state: ThenNowState): ThenNowReviewRow[] {
  return Object.values(state.experiences)
    .filter((exp) => exp.draftStatus === 'in_review')
    .map((exp) => ({
      revisionId: exp.id,
      experienceId: exp.id,
      siteId: exp.siteId,
      siteName: state.sites.find((site) => site.id === exp.siteId)?.name ?? '',
      title: exp.title,
      revisionNumber: exp.draftRevision,
      submittedBy: exp.submittedBy,
      submittedAt: exp.submittedAt,
      sensitivity: exp.sensitivity,
      reviewer: exp.reviewer,
    }))
}

/** Wrap an API failure in a user-facing Error without losing the original. */
function toActionError(error: unknown): Error {
  const message = thenNowErrorMessage(error)
  if (error instanceof Error && error.message === message) return error
  const wrapped = new Error(message)
  ;(wrapped as Error & { cause?: unknown }).cause = error
  return wrapped
}

export function ThenNowProvider({ children }: { children: React.ReactNode }) {
  const { data: session } = authClient.useSession()
  const routeContext = useRouteContext({ from: '/_authenticated' })
  const api = useApi()
  const role = ((session?.user as { role?: string } | undefined)?.role ?? routeContext.user?.role ?? 'moderator') as string
  const actor = session?.user?.name ?? routeContext.user?.name ?? session?.user?.email ?? routeContext.user?.email ?? 'Administrator'
  const [state, setState] = useState<ThenNowState>(() => createFixtures())
  const [source, setSource] = useState<'fixtures' | 'api'>('fixtures')
  const [scenario, setScenarioState] = useState<Scenario>('default')
  const [hydrated, setHydrated] = useState(false)
  const [apiStatus, setApiStatus] = useState<'loading' | 'live' | 'fallback'>('loading')
  const [apiError, setApiError] = useState<string | null>(null)
  const [review, setReview] = useState<ReviewQueueState>({
    status: 'idle',
    items: [],
    error: null,
  })

  const stateRef = useRef(state)
  stateRef.current = state
  const sourceRef = useRef(source)
  sourceRef.current = source
  const roleRef = useRef(role)
  roleRef.current = role

  useEffect(() => {
    const stored = storedState()
    if (stored) setState(stored)
    setHydrated(true)
  }, [])

  // Read path: prefer the Go API, fall back to fixtures when it is unavailable,
  // unauthorised, or empty. Writes follow the same source.
  useEffect(() => {
    let cancelled = false
    setApiStatus('loading')
    loadThenNowState(api.thenNow)
      .then((data) => {
        if (cancelled) return
        if (!data) {
          setApiStatus('fallback')
          setSource('fixtures')
          sourceRef.current = 'fixtures'
          setApiError(null)
          return
        }
        setState((prev) => ({
          sites: data.sites,
          experiences: data.experiences,
          audit: data.audit ?? prev.audit,
        }))
        sourceRef.current = 'api'
        setSource('api')
        setApiStatus('live')
        setApiError(null)
      })
      .catch((error: unknown) => {
        if (cancelled) return
        setApiStatus('fallback')
        sourceRef.current = 'fixtures'
        setSource('fixtures')
        setApiError(thenNowErrorMessage(error))
      })
    return () => {
      cancelled = true
    }
  }, [api])

  useEffect(() => {
    if (!hydrated || source !== 'fixtures' || typeof window === 'undefined') return
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
    } catch {
      /* storage can be unavailable; fixtures remain in memory */
    }
  }, [state, hydrated, source])

  // In fallback mode the review queue is derived from the fixture store so
  // local workflow actions stay visible without a server.
  useEffect(() => {
    if (source !== 'fixtures') return
    setReview({ status: 'ready', items: fixtureReviewRows(state), error: null })
  }, [source, state])

  const can = useCallback(
    (action: Action) => hasPermission(role, 'thenNow', [action]),
    [role],
  )

  const assertPermission = useCallback(
    (action: Action) => {
      if (scenario === 'readonly') {
        throw new ThenNowWorkflowError('This fixture is read-only.', 'state')
      }
      if (!hasPermission(role, 'thenNow', [action])) {
        throw new ThenNowWorkflowError('You do not have permission to do that.', 'state')
      }
    },
    [role, scenario],
  )

  const assertOnline = useCallback(() => {
    if (scenario === 'offline') {
      throw new ThenNowWorkflowError('You are offline. Reconnect before sending this to the server.', 'state')
    }
    if (scenario === 'conflict') {
      throw new ThenNowWorkflowError('Resolve the 409 conflict before sending this to the server.', 'state')
    }
  }, [scenario])

  const patchExperience = useCallback(
    (id: string, patch: Partial<Experience>, audit?: Omit<AuditEvent, 'id'>) => {
      setState((prev) => {
        const current = prev.experiences[id]
        if (!current) return prev
        const next = { ...prev, experiences: { ...prev.experiences, [id]: { ...current, ...patch } } }
        if (audit) next.audit = updateAudit(prev, { id: `${id}-${Date.now()}`, ...audit })
        return next
      })
    },
    [],
  )

  /** Merge an experience detail returned by a write into the store. */
  const applyExperience = useCallback((detail: ThenNowApiExperienceDetail): Experience => {
    const experience = mapApiExperience(detail)
    const site = mapApiSite(detail.site)
    setState((prev) => {
      const existing = prev.sites.find((entry) => entry.id === site.id)
      const ids = new Set(existing?.experiences ?? [])
      ids.add(experience.id)
      const mappedSite = { ...site, experiences: [...ids] }
      return {
        ...prev,
        sites: existing
          ? prev.sites.map((entry) => (entry.id === site.id ? mappedSite : entry))
          : [mappedSite, ...prev.sites],
        experiences: { ...prev.experiences, [experience.id]: experience },
      }
    })
    return experience
  }, [])

  /** Merge a site returned by a write, keeping its experience ids. */
  const applySite = useCallback((apiSite: Parameters<typeof mapApiSite>[0]) => {
    setState((prev) => {
      const existing = prev.sites.find((entry) => entry.id === apiSite.id)
      const mapped = mapApiSite(apiSite, existing?.experiences ?? [])
      return {
        ...prev,
        sites: existing
          ? prev.sites.map((entry) => (entry.id === apiSite.id ? mapped : entry))
          : [mapped, ...prev.sites],
      }
    })
  }, [])

  const refreshAudit = useCallback(async () => {
    if (sourceRef.current !== 'api') return
    try {
      const data = await api.thenNow.listAudit()
      setState((prev) => ({ ...prev, audit: (data.items ?? []).map(mapApiAuditEvent) }))
    } catch {
      /* keep the last audit read; a failed refresh must not clear history */
    }
  }, [api])

  const loadReviewQueue = useCallback(async () => {
    if (!hasPermission(roleRef.current, 'thenNow', ['review'])) {
      setReview({ status: 'ready', items: [], error: null })
      return
    }
    if (sourceRef.current !== 'api') {
      setReview({ status: 'ready', items: fixtureReviewRows(stateRef.current), error: null })
      return
    }
    setReview((prev) => ({ ...prev, status: 'loading', error: null }))
    try {
      const data = await api.thenNow.reviewQueue('all')
      setReview({
        status: 'ready',
        items: (data.items ?? []).map(mapApiReviewRow),
        error: null,
      })
    } catch (error) {
      setReview({ status: 'error', items: [], error: thenNowErrorMessage(error) })
    }
  }, [api])

  const refresh = useCallback(async () => {
    const wasLive = sourceRef.current === 'api'
    if (!wasLive) setApiStatus('loading')
    setApiError(null)
    try {
      const data = await loadThenNowState(api.thenNow)
      if (!data) {
        if (wasLive) {
          setApiError('The API returned no sites. Keeping the last live read.')
          return
        }
        sourceRef.current = 'fixtures'
        setSource('fixtures')
        setApiStatus('fallback')
        return
      }
      setState((prev) => ({
        sites: data.sites,
        experiences: data.experiences,
        audit: data.audit ?? prev.audit,
      }))
      sourceRef.current = 'api'
      setSource('api')
      setApiStatus('live')
      await loadReviewQueue()
    } catch (error) {
      if (wasLive) {
        setApiStatus('live')
        setApiError(thenNowErrorMessage(error))
        return
      }
      sourceRef.current = 'fixtures'
      setSource('fixtures')
      setApiStatus('fallback')
      setApiError(thenNowErrorMessage(error))
    }
  }, [api, loadReviewQueue])

  const loadReview = useCallback(
    async (revisionId: string): Promise<Experience | null> => {
      if (sourceRef.current !== 'api') {
        return stateRef.current.experiences[revisionId] ?? null
      }
      try {
        const detail = await api.thenNow.getReview(revisionId)
        if (!detail.openRevision || detail.openRevision.id !== revisionId) {
          throw new ThenNowWorkflowError(
            'This revision is no longer the open revision. Reload the review queue.',
            'state',
          )
        }
        return applyExperience(detail)
      } catch (error) {
        throw toActionError(error)
      }
    },
    [api, applyExperience],
  )

  const loadExperience = useCallback(
    async (id: string): Promise<Experience | null> => {
      if (sourceRef.current !== 'api') {
        return stateRef.current.experiences[id] ?? null
      }
      try {
        const detail = await api.thenNow.getExperience(id)
        return applyExperience(detail)
      } catch (error) {
        throw toActionError(error)
      }
    },
    [api, applyExperience],
  )

  /** Refresh audit + review queue after a successful remote write. */
  const afterMutation = useCallback(async () => {
    await refreshAudit()
    await loadReviewQueue()
  }, [refreshAudit, loadReviewQueue])

  const actions = useMemo<ThenNowActions>(() => {
    function getExperience(id: string): Experience {
      const exp = state.experiences[id]
      if (!exp) throw new ThenNowWorkflowError('Experience not found.', 'state')
      return exp
    }

    function getSite(id: string): HeritageSite {
      const site = state.sites.find((entry) => entry.id === id)
      if (!site) throw new ThenNowWorkflowError('Site not found.', 'state')
      return site
    }

    async function remoteDetail(
      call: () => Promise<ThenNowApiExperienceDetail>,
    ): Promise<Experience> {
      try {
        const detail = await call()
        const experience = applyExperience(detail)
        await afterMutation()
        return experience
      } catch (error) {
        throw toActionError(error)
      }
    }

    async function remoteSite(
      call: () => Promise<Parameters<typeof mapApiSite>[0]>,
    ): Promise<void> {
      try {
        const site = await call()
        applySite(site)
        await afterMutation()
      } catch (error) {
        // A stale site is recoverable: the caller can reload the server copy
        // instead of treating it as an opaque failure.
        const stale = asStaleSiteError(error)
        if (stale) throw stale
        throw toActionError(error)
      }
    }

    /** API mode talks to the server; fixture mode keeps local save semantics. */
    function assertRemoteAllowed() {
      if (sourceRef.current === 'api') assertOnline()
    }

    return {
      reset: () => {
        const fixtures = createFixtures()
        setState(fixtures)
        setSource('fixtures')
        sourceRef.current = 'fixtures'
        setScenarioState('default')
        if (typeof window !== 'undefined') {
          try {
            window.localStorage.setItem(STORAGE_KEY, JSON.stringify(fixtures))
          } catch {
            /* ignore */
          }
        }
      },
      createSite: async (input) => {
        assertPermission('create')
        assertRemoteAllowed()
        if (sourceRef.current === 'api') {
          try {
            const apiSite = await api.thenNow.createSite(siteCreatePayload(input))
            applySite(apiSite)
            await afterMutation()
            return apiSite.id
          } catch (error) {
            throw toActionError(error)
          }
        }
        const id = `site-${Date.now()}`
        const createdAt = nowIso()
        const site: HeritageSite = {
          id,
          name: input.name.trim(),
          slug: input.name.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''),
          county: input.county,
          locality: input.locality ?? input.county,
          type: input.type,
          access: input.access,
          sensitivity: input.sensitivity,
          status: 'draft',
          managingAuthority: input.managingAuthority ?? '',
          destination: input.destination ?? '',
          photography: input.photography ?? '',
          culturalAuthority: input.culturalAuthority ?? '',
          consent: input.consent ?? '',
          consentDate: input.consentDate ?? '',
          siteRules: input.siteRules ?? '',
          safety: input.safety ?? '',
          shortDescription: input.shortDescription ?? '',
          fullDescription: input.fullDescription ?? '',
          sources: input.sources ?? '',
          factCheck: input.factCheck ?? 'Pending',
          publicRights: input.publicRights ?? '',
          latitude: input.latitude ?? '',
          longitude: input.longitude ?? '',
          geofenceRadius: input.geofenceRadius ?? '150',
          standingPointNote: input.standingPointNote ?? '',
          image: input.image ?? '',
          updatedAt: createdAt,
          experiences: [],
        }
        setState((prev) => ({
          ...prev,
          sites: [site, ...prev.sites],
          audit: updateAudit(prev, createAudit(actor, id, 'site', 'Site draft created')),
        }))
        return id
      },
      updateSite: async (id, patch) => {
        assertPermission('edit')
        assertRemoteAllowed()
        if (sourceRef.current === 'api') {
          const current = getSite(id)
          await remoteSite(() =>
            api.thenNow.updateSite(
              id,
              sitePatchPayload({ ...current, ...patch }),
              current.updatedAt || undefined,
            ),
          )
          return
        }
        setState((prev) => ({
          ...prev,
          sites: prev.sites.map((site) =>
            site.id === id ? { ...site, ...patch, updatedAt: nowIso() } : site,
          ),
        }))
      },
      saveSite: async (id, patch) => {
        assertPermission('edit')
        assertRemoteAllowed()
        if (sourceRef.current === 'api') {
          const current = getSite(id)
          await remoteSite(() =>
            api.thenNow.updateSite(
              id,
              sitePatchPayload({ ...current, ...patch }),
              current.updatedAt || undefined,
            ),
          )
          return
        }
        setState((prev) => ({
          ...prev,
          sites: prev.sites.map((site) =>
            site.id === id ? { ...site, ...patch, updatedAt: nowIso() } : site,
          ),
          audit: updateAudit(prev, createAudit(actor, id, 'save', 'Site saved')),
        }))
      },
      publishSite: async (id, patch) => {
        assertPermission('publish')
        assertOnline()
        if (sourceRef.current === 'api') {
          const current = getSite(id)
          const merged = { ...current, ...patch }
          const readiness = siteReadiness(merged, state.experiences)
          if (!readiness.readyToPublish) {
            throw new ThenNowWorkflowError('Resolve the site readiness blockers first.', 'readiness')
          }
          if (patch) {
            await remoteSite(() =>
              api.thenNow.updateSite(
                id,
                sitePatchPayload({ ...current, ...patch }),
                current.updatedAt || undefined,
              ),
            )
          }
          await remoteSite(() => api.thenNow.publishSite(id))
          return
        }
        const site = { ...getSite(id), ...patch }
        const readiness = siteReadiness(site, state.experiences)
        if (!readiness.readyToPublish) {
          throw new ThenNowWorkflowError('Resolve the site readiness blockers first.', 'readiness')
        }
        setState((prev) => ({
          ...prev,
          sites: prev.sites.map((entry) =>
            entry.id === id ? { ...entry, ...patch, status: 'published', updatedAt: nowIso() } : entry,
          ),
          audit: updateAudit(prev, createAudit(actor, id, 'publish', 'Site published')),
        }))
      },
      unpublishSite: async (id, reason) => {
        assertPermission('unpublish')
        assertOnline()
        if (sourceRef.current === 'api') {
          await remoteSite(() => api.thenNow.unpublishSite(id, reason))
          return
        }
        setState((prev) => ({
          ...prev,
          sites: prev.sites.map((entry) =>
            entry.id === id ? { ...entry, status: 'unpublished', updatedAt: nowIso() } : entry,
          ),
          audit: updateAudit(prev, createAudit(actor, id, 'unpublish', 'Site unpublished', reason)),
        }))
      },
      archiveSite: async (id, reason) => {
        assertPermission('archive')
        assertRemoteAllowed()
        if (sourceRef.current === 'api') {
          await remoteSite(() => api.thenNow.archiveSite(id, reason))
          return
        }
        setState((prev) => ({
          ...prev,
          sites: prev.sites.map((entry) =>
            entry.id === id ? { ...entry, status: 'archived', updatedAt: nowIso() } : entry,
          ),
          audit: updateAudit(prev, createAudit(actor, id, 'archive', 'Site archived', reason)),
        }))
      },
      createExperience: async (input) => {
        assertPermission('create')
        assertRemoteAllowed()
        if (sourceRef.current === 'api') {
          const snapshot: ThenNowApiSnapshot = {
            title: input.title.trim(),
            promise: input.promise ?? '',
            story: '',
            period: input.period ?? '',
            duration: input.duration ?? 77,
            contentNotes: '',
            safetyNotes: '',
            sources: '',
            factCheck: 'Pending',
            primaryMode: input.mode,
            languages: ['EN', 'SW'],
            rightsRecord: input.rights ?? '',
            rightsEvidence: '',
            rightsExpiry: input.rightsExpiry ?? '',
            consentRecord: input.consent ?? '',
            sensitivity: input.sensitivity ?? 'standard',
            videoMaster: input.videoMaster ?? '',
            videoSize: input.videoSize ?? '',
            renditions: {},
            renditionKeys: {},
            poster: input.poster ?? false,
            posterKey: '',
            captions: { en: false, sw: false },
            captionKeys: {},
            transcript: false,
            transcriptKey: '',
            audioDescription: false,
            audioDescriptionKey: '',
            textCards: input.textCards ?? [],
          }
          const experience = await remoteDetail(() =>
            api.thenNow.createExperience({
              siteId: input.siteId,
              title: input.title.trim(),
              snapshot,
            }),
          )
          return experience.id
        }
        const id = `exp-${Date.now()}`
        const createdAt = nowIso()
        const exp: Experience = {
          id,
          siteId: input.siteId,
          title: input.title.trim(),
          promise: input.promise ?? '',
          story: '',
          period: input.period ?? '',
          duration: input.duration ?? 77,
          contentNotes: '',
          safetyNotes: '',
          sources: '',
          factCheck: 'Pending',
          mode: input.mode,
          status: 'draft',
          liveRevision: 0,
          draftRevision: 1,
          draftStatus: 'draft',
          uploadedBy: actor,
          submittedBy: '',
          submittedAt: '',
          reviewer: 'Unassigned',
          secondReviewer: null,
          secondReviewerApproved: false,
          clientApproval: null,
          languages: ['EN', 'SW'],
          rightsExpiry: input.rightsExpiry ?? '',
          sensitivity: input.sensitivity ?? 'standard',
          videoMaster: input.videoMaster ?? '',
          videoSize: input.videoSize ?? '',
          renditions: {},
          poster: input.poster ?? false,
          captions: { en: false, sw: false },
          transcript: false,
          audioDescription: false,
          rights: input.rights ?? '',
          rightsEvidence: '',
          consent: input.consent ?? '',
          textCards: input.textCards ?? [],
          updatedAt: createdAt,
          lastSavedAt: createdAt,
          reviewNotes: [],
          lastDecision: null,
          diff: { live: ['No live revision'], draft: ['Draft created'], changes: [] },
        }
        setState((prev) => ({
          ...prev,
          experiences: { ...prev.experiences, [id]: exp },
          sites: prev.sites.map((site) =>
            site.id === input.siteId
              ? { ...site, experiences: [...site.experiences, id], updatedAt: createdAt }
              : site,
          ),
          audit: updateAudit(prev, createAudit(actor, id, 'draft', 'Experience draft created')),
        }))
        return id
      },
      updateExperience: async (id, patch) => {
        assertPermission('edit')
        assertRemoteAllowed()
        const current = getExperience(id)
        const merged = { ...current, ...patch, updatedAt: nowIso() }
        if (sourceRef.current === 'api') {
          await requireOpenRevision(api.thenNow, id, current.draftRevision)
          await remoteDetail(() =>
            api.thenNow.updateExperience(id, {
              title: merged.title,
              snapshot: snapshotFromExperience(merged),
            }),
          )
          return
        }
        patchExperience(id, { ...patch, updatedAt: nowIso(), revisedSinceDecision: true })
      },
      saveExperience: async (id, patch) => {
        assertPermission('edit')
        assertRemoteAllowed()
        const current = getExperience(id)
        const merged = { ...current, ...patch, lastSavedAt: nowIso(), updatedAt: nowIso() }
        if (sourceRef.current === 'api') {
          await requireOpenRevision(api.thenNow, id, current.draftRevision)
          await remoteDetail(() =>
            api.thenNow.updateExperience(id, {
              title: merged.title,
              snapshot: snapshotFromExperience(merged),
            }),
          )
          return
        }
        patchExperience(
          id,
          merged,
          { entity: id, type: 'save', title: 'Draft saved', meta: `${actor} · ${formatEat(nowIso())}` },
        )
      },
      submitExperience: async (id, patch) => {
        assertPermission('submit')
        assertOnline()
        const current = getExperience(id)
        const merged = { ...current, ...patch }
        submitRevision(merged, actor, nowIso())
        if (sourceRef.current === 'api') {
          await requireOpenRevision(api.thenNow, id, current.draftRevision)
          await remoteDetail(() => api.thenNow.submitExperience(id))
          return
        }
        const next = submitRevision(merged, actor, nowIso())
        patchExperience(
          id,
          next,
          { entity: id, type: 'submit', title: `Revision v${next.draftRevision} submitted for review`, meta: `${actor} · ${formatEat(nowIso())}` },
        )
      },
      assignReviewer: async (id, reviewer) => {
        assertPermission('assign_reviewer')
        assertRemoteAllowed()
        const current = getExperience(id)
        if (sourceRef.current === 'api') {
          await requireOpenRevision(api.thenNow, id, current.draftRevision)
          await remoteDetail(() => api.thenNow.assignReviewer(id))
          return
        }
        const next = assignReviewer(current, reviewer, nowIso())
        patchExperience(
          id,
          next,
          { entity: id, type: 'assign', title: `Reviewer assigned to ${reviewer}`, meta: `${actor} · ${formatEat(nowIso())}` },
        )
      },
      unassignReviewer: async (id) => {
        assertPermission('assign_reviewer')
        if (sourceRef.current === 'api') {
          await remoteDetail(() => api.thenNow.unassignReviewer(id))
          return
        }
        const current = getExperience(id)
        if (current.draftStatus !== 'in_review') {
          throw new ThenNowWorkflowError('Assignment is locked once a decision is recorded.', 'state')
        }
        patchExperience(
          id,
          { reviewer: 'Unassigned' },
          { entity: id, type: 'unassign', title: 'Reviewer unassigned', meta: `${actor} · ${formatEat(nowIso())}` },
        )
      },
      approveRevision: async (id, note) => {
        assertPermission('review')
        assertOnline()
        const current = getExperience(id)
        approveRevision(current, actor, note, nowIso())
        if (sourceRef.current === 'api') {
          await requireOpenRevision(api.thenNow, id, current.draftRevision)
          await remoteDetail(() => api.thenNow.decideExperience(id, 'approve', note))
          return
        }
        const next = approveRevision(current, actor, note, nowIso())
        patchExperience(
          id,
          next,
          { entity: id, type: 'approve', title: `Revision v${current.draftRevision} approved`, meta: `${actor} · ${formatEat(nowIso())}` },
        )
      },
      requestChanges: async (id, note) => {
        assertPermission('review')
        assertRemoteAllowed()
        const current = getExperience(id)
        requestChanges(current, actor, note, nowIso())
        if (sourceRef.current === 'api') {
          await requireOpenRevision(api.thenNow, id, current.draftRevision)
          await remoteDetail(() => api.thenNow.decideExperience(id, 'request_changes', note))
          return
        }
        const next = requestChanges(current, actor, note, nowIso())
        patchExperience(
          id,
          next,
          { entity: id, type: 'changes', title: `Revision v${current.draftRevision} returned for changes`, meta: `${actor} · ${formatEat(nowIso())}` },
        )
      },
      rejectRevision: async (id, note) => {
        assertPermission('review')
        assertRemoteAllowed()
        const current = getExperience(id)
        rejectRevision(current, actor, note, nowIso())
        if (sourceRef.current === 'api') {
          await requireOpenRevision(api.thenNow, id, current.draftRevision)
          await remoteDetail(() => api.thenNow.decideExperience(id, 'reject', note))
          return
        }
        const next = rejectRevision(current, actor, note, nowIso())
        patchExperience(
          id,
          next,
          { entity: id, type: 'reject', title: `Revision v${current.draftRevision} rejected`, meta: `${actor} · ${formatEat(nowIso())}` },
        )
      },
      returnToDraft: async (id, reason) => {
        assertPermission('edit')
        assertRemoteAllowed()
        const current = getExperience(id)
        returnToDraft(current, actor, reason, nowIso())
        if (sourceRef.current === 'api') {
          // Reopening an approval is a review action: the server keeps the
          // approver/admin gate and records the reason in the audit trail.
          if (current.draftStatus === 'approved') assertPermission('review')
          await requireOpenRevision(api.thenNow, id, current.draftRevision)
          await remoteDetail(() => api.thenNow.decideExperience(id, 'return', reason))
          return
        }
        const next = returnToDraft(current, actor, reason, nowIso())
        patchExperience(
          id,
          next,
          { entity: id, type: 'return', title: `Revision v${current.draftRevision} returned to draft`, meta: `${actor} · ${formatEat(nowIso())}`, note: reason },
        )
      },
      publishExperience: async (id) => {
        assertPermission('publish')
        assertOnline()
        const current = getExperience(id)
        publishRevision(current, nowIso())
        if (sourceRef.current === 'api') {
          await requireOpenRevision(api.thenNow, id, current.draftRevision)
          await remoteDetail(() => api.thenNow.publishExperience(id))
          return
        }
        const next = publishRevision(current, nowIso())
        patchExperience(
          id,
          next,
          { entity: id, type: 'publish', title: `Revision v${current.draftRevision} published`, meta: `${actor} · ${formatEat(nowIso())}` },
        )
      },
      scheduleExperience: async (id, scheduleAt, note) => {
        assertPermission('publish')
        assertOnline()
        const current = getExperience(id)
        scheduleRevision(current, scheduleAt, note)
        if (sourceRef.current === 'api') {
          await requireOpenRevision(api.thenNow, id, current.draftRevision)
          await remoteDetail(() => api.thenNow.scheduleExperience(id, scheduleAt, note))
          return
        }
        const next = scheduleRevision(current, scheduleAt, note)
        patchExperience(
          id,
          next,
          { entity: id, type: 'schedule', title: 'Publish scheduled', meta: `${actor} · ${formatEat(nowIso())}`, note: scheduleAt },
        )
      },
      cancelSchedule: async (id) => {
        assertPermission('publish')
        assertOnline()
        if (sourceRef.current === 'api') {
          await remoteDetail(() => api.thenNow.cancelSchedule(id))
          return
        }
        const current = getExperience(id)
        patchExperience(
          id,
          cancelSchedule(current),
          { entity: id, type: 'schedule_cancel', title: 'Publish schedule cancelled', meta: `${actor} · ${formatEat(nowIso())}` },
        )
      },
      unpublishExperience: async (id, reason) => {
        assertPermission('unpublish')
        assertOnline()
        if (sourceRef.current === 'api') {
          await remoteDetail(() => api.thenNow.changeExperienceStatus(id, 'unpublish', reason))
          return
        }
        const current = getExperience(id)
        patchExperience(
          id,
          unpublishExperience(current),
          { entity: id, type: 'unpublish', title: 'Experience unpublished', meta: `${actor} · ${formatEat(nowIso())}`, note: reason },
        )
      },
      archiveExperience: async (id, reason) => {
        assertPermission('archive')
        assertRemoteAllowed()
        if (sourceRef.current === 'api') {
          await remoteDetail(() => api.thenNow.changeExperienceStatus(id, 'archive', reason))
          return
        }
        const current = getExperience(id)
        patchExperience(
          id,
          archiveExperience(current),
          { entity: id, type: 'archive', title: 'Experience archived', meta: `${actor} · ${formatEat(nowIso())}`, note: reason },
        )
      },
      revokeExperience: async (id, reason) => {
        assertPermission('revoke')
        assertRemoteAllowed()
        if (sourceRef.current === 'api') {
          await remoteDetail(() => api.thenNow.changeExperienceStatus(id, 'revoke', reason))
          return
        }
        const current = getExperience(id)
        patchExperience(
          id,
          revokeExperience(current),
          { entity: id, type: 'revoke', title: 'Experience revoked', meta: `${actor} · ${formatEat(nowIso())}`, note: reason },
        )
      },
      newRevision: async (id) => {
        assertPermission('edit')
        assertRemoteAllowed()
        const current = getExperience(id)
        createRevision(current, nowIso())
        if (sourceRef.current === 'api') {
          await requireOpenRevision(api.thenNow, id, current.draftRevision)
          await remoteDetail(() => api.thenNow.newRevision(id))
          return
        }
        const next = createRevision(current, nowIso())
        patchExperience(
          id,
          next,
          { entity: id, type: 'draft', title: `Draft v${next.draftRevision} created`, meta: `${actor} · ${formatEat(nowIso())}` },
        )
      },
      recordClientApproval: async (id, approval) => {
        assertPermission('manage_rights')
        assertRemoteAllowed()
        const current = getExperience(id)
        if (sourceRef.current === 'api') {
          await requireOpenRevision(api.thenNow, id, current.draftRevision)
          await remoteDetail(() => api.thenNow.recordClientApproval(id, approval))
          return
        }
        const next = recordClientApprovalWorkflow(current, approval)
        patchExperience(
          id,
          next,
          { entity: id, type: 'client', title: 'Client approval recorded', meta: `${actor} · ${formatEat(nowIso())}`, note: approval.name },
        )
      },
      recordExternalReviewer: async (id, reviewer) => {
        assertPermission('review')
        assertRemoteAllowed()
        const current = getExperience(id)
        if (sourceRef.current === 'api') {
          await requireOpenRevision(api.thenNow, id, current.draftRevision)
          await remoteDetail(() => api.thenNow.recordExternalReviewer(id, reviewer))
          return
        }
        const next = recordExternalReviewerWorkflow(current, reviewer)
        patchExperience(
          id,
          next,
          { entity: id, type: 'reviewer', title: 'External reviewer recorded', meta: `${actor} · ${formatEat(nowIso())}`, note: `${reviewer.name} · ${reviewer.org}` },
        )
      },
    }
  }, [
    state,
    actor,
    api,
    assertOnline,
    assertPermission,
    patchExperience,
    applyExperience,
    applySite,
    afterMutation,
  ])

  const value = useMemo<ThenNowContextValue>(
    () => ({
      state,
      scenario,
      source,
      apiStatus,
      apiError,
      review,
      role,
      actor,
      can,
      setScenario: setScenarioState,
      actions,
      refresh,
      refreshAudit,
      loadReview,
      loadExperience,
      loadReviewQueue,
    }),
    [
      state,
      scenario,
      source,
      apiStatus,
      apiError,
      review,
      role,
      actor,
      can,
      actions,
      refresh,
      refreshAudit,
      loadReview,
      loadExperience,
      loadReviewQueue,
    ],
  )

  return <ThenNowContext.Provider value={value}>{children}</ThenNowContext.Provider>
}

export function useThenNow(): ThenNowContextValue {
  const context = useContext(ThenNowContext)
  if (!context) throw new Error('useThenNow must be used inside ThenNowProvider')
  return context
}
