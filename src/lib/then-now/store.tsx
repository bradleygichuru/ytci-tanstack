import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react'
import { useRouteContext } from '@tanstack/react-router'
import { authClient } from '#/lib/auth-client'
import { hasPermission, type Action } from '#/lib/authz'
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

interface ThenNowActions {
  reset: () => void
  createSite: (input: CreateSiteInput) => string
  updateSite: (id: string, patch: Partial<HeritageSite>) => void
  saveSite: (id: string, patch?: Partial<HeritageSite>) => void
  publishSite: (id: string, patch?: Partial<HeritageSite>) => void
  unpublishSite: (id: string) => void
  archiveSite: (id: string) => void
  createExperience: (input: CreateExperienceInput) => string
  updateExperience: (id: string, patch: Partial<Experience>) => void
  saveExperience: (id: string, patch?: Partial<Experience>) => void
  submitExperience: (id: string, patch?: Partial<Experience>) => void
  assignReviewer: (id: string, reviewer: string) => void
  unassignReviewer: (id: string) => void
  approveRevision: (id: string, note: string) => void
  requestChanges: (id: string, note: string) => void
  rejectRevision: (id: string, note: string) => void
  returnToDraft: (id: string, reason: string) => void
  publishExperience: (id: string) => void
  scheduleExperience: (id: string, at: string, note: string) => void
  cancelSchedule: (id: string) => void
  unpublishExperience: (id: string) => void
  archiveExperience: (id: string) => void
  revokeExperience: (id: string) => void
  newRevision: (id: string) => void
  recordClientApproval: (id: string, approval: ClientApproval) => void
  recordExternalReviewer: (id: string, reviewer: ExternalReviewer) => void
}

interface ThenNowContextValue {
  state: ThenNowState
  scenario: Scenario
  role: string
  actor: string
  can: (action: Action) => boolean
  setScenario: (scenario: Scenario) => void
  actions: ThenNowActions
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

export function ThenNowProvider({ children }: { children: React.ReactNode }) {
  const { data: session } = authClient.useSession()
  const routeContext = useRouteContext({ from: '/_authenticated' })
  const role = ((session?.user as { role?: string } | undefined)?.role ?? routeContext.user?.role ?? 'moderator') as string
  const actor = session?.user?.name ?? routeContext.user?.name ?? session?.user?.email ?? routeContext.user?.email ?? 'Administrator'
  const [state, setState] = useState<ThenNowState>(() => createFixtures())
  const [scenario, setScenarioState] = useState<Scenario>('default')
  const [hydrated, setHydrated] = useState(false)

  useEffect(() => {
    const stored = storedState()
    if (stored) setState(stored)
    setHydrated(true)
  }, [])

  useEffect(() => {
    if (!hydrated || typeof window === 'undefined') return
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
    } catch {
      /* storage can be unavailable; fixtures remain in memory */
    }
  }, [state, hydrated])

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

    return {
      reset: () => {
        const fixtures = createFixtures()
        setState(fixtures)
        setScenarioState('default')
        if (typeof window !== 'undefined') {
          try {
            window.localStorage.setItem(STORAGE_KEY, JSON.stringify(fixtures))
          } catch {
            /* ignore */
          }
        }
      },
      createSite: (input) => {
        assertPermission('create')
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
      updateSite: (id, patch) => {
        assertPermission('edit')
        setState((prev) => ({
          ...prev,
          sites: prev.sites.map((site) =>
            site.id === id ? { ...site, ...patch, updatedAt: nowIso() } : site,
          ),
        }))
      },
      saveSite: (id, patch) => {
        assertPermission('edit')
        setState((prev) => ({
          ...prev,
          sites: prev.sites.map((site) =>
            site.id === id ? { ...site, ...patch, updatedAt: nowIso() } : site,
          ),
          audit: updateAudit(prev, createAudit(actor, id, 'save', 'Site saved')),
        }))
      },
      publishSite: (id, patch) => {
        assertPermission('publish')
        assertOnline()
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
      unpublishSite: (id) => {
        assertPermission('unpublish')
        assertOnline()
        setState((prev) => ({
          ...prev,
          sites: prev.sites.map((entry) =>
            entry.id === id ? { ...entry, status: 'unpublished', updatedAt: nowIso() } : entry,
          ),
          audit: updateAudit(prev, createAudit(actor, id, 'unpublish', 'Site unpublished')),
        }))
      },
      archiveSite: (id) => {
        assertPermission('archive')
        setState((prev) => ({
          ...prev,
          sites: prev.sites.map((entry) =>
            entry.id === id ? { ...entry, status: 'archived', updatedAt: nowIso() } : entry,
          ),
          audit: updateAudit(prev, createAudit(actor, id, 'archive', 'Site archived')),
        }))
      },
      createExperience: (input) => {
        assertPermission('create')
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
      updateExperience: (id, patch) => {
        assertPermission('edit')
        patchExperience(id, { ...patch, updatedAt: nowIso(), revisedSinceDecision: true })
      },
      saveExperience: (id, patch) => {
        assertPermission('edit')
        const current = getExperience(id)
        const merged = { ...current, ...patch, lastSavedAt: nowIso(), updatedAt: nowIso() }
        patchExperience(
          id,
          merged,
          { entity: id, type: 'save', title: 'Draft saved', meta: `${actor} · ${formatEat(nowIso())}` },
        )
      },
      submitExperience: (id, patch) => {
        assertPermission('submit')
        assertOnline()
        const current = getExperience(id)
        const merged = { ...current, ...patch }
        const next = submitRevision(merged, actor, nowIso())
        patchExperience(
          id,
          next,
          { entity: id, type: 'submit', title: `Revision v${next.draftRevision} submitted for review`, meta: `${actor} · ${formatEat(nowIso())}` },
        )
      },
      assignReviewer: (id, reviewer) => {
        assertPermission('assign_reviewer')
        const current = getExperience(id)
        const next = assignReviewer(current, reviewer, nowIso())
        patchExperience(
          id,
          next,
          { entity: id, type: 'assign', title: `Reviewer assigned to ${reviewer}`, meta: `${actor} · ${formatEat(nowIso())}` },
        )
      },
      unassignReviewer: (id) => {
        assertPermission('assign_reviewer')
        const current = getExperience(id)
        if (current.draftStatus !== 'in_review') {
          throw new ThenNowWorkflowError('Assignment is locked once a decision is recorded.', 'state')
        }
        patchExperience(
          id,
          { reviewer: 'Unassigned' },
          { entity: id, type: 'assign', title: 'Reviewer unassigned', meta: `${actor} · ${formatEat(nowIso())}` },
        )
      },
      approveRevision: (id, note) => {
        assertPermission('review')
        assertOnline()
        const current = getExperience(id)
        const next = approveRevision(current, actor, note, nowIso())
        patchExperience(
          id,
          next,
          { entity: id, type: 'approve', title: `Revision v${current.draftRevision} approved`, meta: `${actor} · ${formatEat(nowIso())}` },
        )
      },
      requestChanges: (id, note) => {
        assertPermission('review')
        const current = getExperience(id)
        const next = requestChanges(current, actor, note, nowIso())
        patchExperience(
          id,
          next,
          { entity: id, type: 'changes', title: `Revision v${current.draftRevision} returned for changes`, meta: `${actor} · ${formatEat(nowIso())}` },
        )
      },
      rejectRevision: (id, note) => {
        assertPermission('review')
        const current = getExperience(id)
        const next = rejectRevision(current, actor, note, nowIso())
        patchExperience(
          id,
          next,
          { entity: id, type: 'reject', title: `Revision v${current.draftRevision} rejected`, meta: `${actor} · ${formatEat(nowIso())}` },
        )
      },
      returnToDraft: (id, reason) => {
        assertPermission('edit')
        const current = getExperience(id)
        const next = returnToDraft(current, actor, reason, nowIso())
        patchExperience(
          id,
          next,
          { entity: id, type: 'return', title: `Revision v${current.draftRevision} returned to draft`, meta: `${actor} · ${formatEat(nowIso())}`, note: reason },
        )
      },
      publishExperience: (id) => {
        assertPermission('publish')
        assertOnline()
        const current = getExperience(id)
        const next = publishRevision(current, nowIso())
        patchExperience(
          id,
          next,
          { entity: id, type: 'publish', title: `Revision v${current.draftRevision} published`, meta: `${actor} · ${formatEat(nowIso())}` },
        )
      },
      scheduleExperience: (id, scheduleAt, note) => {
        assertPermission('publish')
        assertOnline()
        const current = getExperience(id)
        const next = scheduleRevision(current, scheduleAt, note)
        patchExperience(
          id,
          next,
          { entity: id, type: 'schedule', title: 'Publish scheduled', meta: `${actor} · ${formatEat(nowIso())}`, note: scheduleAt },
        )
      },
      cancelSchedule: (id) => {
        assertPermission('publish')
        const current = getExperience(id)
        patchExperience(
          id,
          cancelSchedule(current),
          { entity: id, type: 'schedule', title: 'Publish schedule cancelled', meta: `${actor} · ${formatEat(nowIso())}` },
        )
      },
      unpublishExperience: (id) => {
        assertPermission('unpublish')
        assertOnline()
        const current = getExperience(id)
        patchExperience(
          id,
          unpublishExperience(current),
          { entity: id, type: 'unpublish', title: 'Experience unpublished', meta: `${actor} · ${formatEat(nowIso())}` },
        )
      },
      archiveExperience: (id) => {
        assertPermission('archive')
        const current = getExperience(id)
        patchExperience(
          id,
          archiveExperience(current),
          { entity: id, type: 'archive', title: 'Experience archived', meta: `${actor} · ${formatEat(nowIso())}` },
        )
      },
      revokeExperience: (id) => {
        assertPermission('revoke')
        const current = getExperience(id)
        patchExperience(
          id,
          revokeExperience(current),
          { entity: id, type: 'revoke', title: 'Experience revoked', meta: `${actor} · ${formatEat(nowIso())}` },
        )
      },
      newRevision: (id) => {
        assertPermission('edit')
        const current = getExperience(id)
        const next = createRevision(current, nowIso())
        patchExperience(
          id,
          next,
          { entity: id, type: 'draft', title: `Draft v${next.draftRevision} created`, meta: `${actor} · ${formatEat(nowIso())}` },
        )
      },
      recordClientApproval: (id, approval) => {
        assertPermission('manage_rights')
        const current = getExperience(id)
        const next = recordClientApprovalWorkflow(current, approval)
        patchExperience(
          id,
          next,
          { entity: id, type: 'client', title: 'Client approval recorded', meta: `${actor} · ${formatEat(nowIso())}`, note: approval.name },
        )
      },
      recordExternalReviewer: (id, reviewer) => {
        assertPermission('review')
        const current = getExperience(id)
        const next = recordExternalReviewerWorkflow(current, reviewer)
        patchExperience(
          id,
          next,
          { entity: id, type: 'reviewer', title: 'External reviewer recorded', meta: `${actor} · ${formatEat(nowIso())}`, note: `${reviewer.name} · ${reviewer.org}` },
        )
      },
    }
  }, [state, actor, assertOnline, assertPermission, patchExperience])


  const value = useMemo<ThenNowContextValue>(
    () => ({
      state,
      scenario,
      role,
      actor,
      can,
      setScenario: setScenarioState,
      actions,
    }),
    [state, scenario, role, actor, can, actions],
  )

  return <ThenNowContext.Provider value={value}>{children}</ThenNowContext.Provider>
}

export function useThenNow(): ThenNowContextValue {
  const context = useContext(ThenNowContext)
  if (!context) throw new Error('useThenNow must be used inside ThenNowProvider')
  return context
}
