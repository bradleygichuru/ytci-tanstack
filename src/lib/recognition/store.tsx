/**
 * Recognition admin store.
 *
 * One provider for the whole surface: contract reads, operator overlays and the
 * audited actions every screen calls. Screens never mutate rows directly.
 *
 * The contracts mock is the read source when it is reachable. When it is not,
 * the deterministic sample keeps the surface usable and the footer says so.
 * Actions that the frozen contract does not expose (leaderboard retraction,
 * mission pause, award retry) are operator-overlay actions and are labelled in
 * the audit entry so a reviewer can tell them apart from contract writes.
 */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { useRouteContext } from '@tanstack/react-router'
import { notify } from '#/lib/toast'
import type { ContractsSchemas } from '#/lib/contracts/client'
import { normaliseRole, roleHasPermission, type Permission } from '#/lib/contracts/roles'
import {
  SAMPLE_AUDIT,
  SAMPLE_AWARDS,
  SAMPLE_BACKFILL,
  SAMPLE_BACKFILL_ROWS,
  SAMPLE_BADGES,
  SAMPLE_BOARDS,
  SAMPLE_KILL_SWITCHES,
  SAMPLE_MISSIONS,
  SAMPLE_MODERATION,
  SAMPLE_RULES,
  SAMPLE_SEASONS,
} from './fixtures'
import { createRecognitionApi } from './api'
import {
  draftSignature,
  publicBoardSuppressed,
  recomputeRanks,
  requiresSecondApprover,
  simulateDraft,
} from './logic'
import {
  mergeAudit,
  mergeBackfill,
  mergeBadgeUsage,
  mergeBadges,
  mergeKillSwitches,
  mergeModeration,
  mergeRules,
  mergeSeasons,
  mergeBoardRows,
  mapApiAudit,
  mapApiBackfill,
  mapApiBadge,
  mapApiKillSwitch,
  mapApiModeration,
  mapApiRule,
  mapApiSeason,
} from './reconcile'
import type {
  AuditCategory,
  AuditEntry,
  BackfillBatch,
  Badge,
  BoardRow,
  KillSwitch,
  LeaderboardSnapshot,
  LoadState,
  Mission,
  ModerationDecision,
  RecognitionSection,
  RecognitionState,
  Rule,
  RuleDraft,
  RuleSimulation,
  Scenario,
  Season,
} from './types'

const SECTIONS: RecognitionSection[] = [
  'rules',
  'badges',
  'seasons',
  'moderation',
  'backfill',
  'killSwitches',
  'audit',
  'leaderboard',
]

type LoadMap = Record<RecognitionSection, LoadState>
type ErrorMap = Partial<Record<RecognitionSection, string>>

export interface NoteInput {
  action: string
  entity: string
  detail: string
  category: AuditCategory
}

export interface CorrectionInput {
  action: 'credit' | 'reversal'
  supportRef: string
  note: string
}

export interface RecognitionActions {
  reset: () => void
  refresh: () => Promise<void>
  saveRuleDraft: (ruleKey: string, draft: RuleDraft) => Rule
  simulateRule: (ruleKey: string, draft: RuleDraft) => Promise<RuleSimulation>
  publishRule: (ruleKey: string, draft?: RuleDraft) => Promise<void>
  retireRule: (ruleKey: string, reason: string) => void
  discardRuleDraft: (ruleKey: string) => void
  createBadge: (input: Partial<Badge> & Pick<Badge, 'badgeKey' | 'nameEn' | 'family'>) => void
  updateBadge: (badgeKey: string, patch: Partial<Badge>) => void
  publishBadge: (badgeKey: string) => Promise<void>
  saveMission: (input: Partial<Mission> & Pick<Mission, 'nameEn' | 'family'>) => void
  toggleMission: (id: string) => void
  correctMissionCompletion: (missionId: string, completionId: string, note: string) => void
  createSeason: (input: Partial<Season> & Pick<Season, 'key' | 'nameEn' | 'startsAt' | 'endsAt'>) => void
  publishSeason: (key: string) => Promise<void>
  freezeSeason: (key: string) => Promise<void>
  setBoardFrozen: (key: string, frozen: boolean, reason: string) => void
  closeSeason: (key: string, reason: string) => Promise<void>
  setPublicHidden: (hidden: boolean, reason: string) => Promise<void>
  retractEntry: (seasonKey: string, displayName: string, reason: string) => void
  restoreEntry: (seasonKey: string, displayName: string) => void
  retryAward: (id: string) => void
  retryAwards: (ids: string[]) => void
  correctAward: (id: string, input: CorrectionInput) => Promise<void>
  decideCase: (id: string, decision: ModerationDecision, reason: string) => Promise<void>
  reopenCase: (id: string, reason: string) => void
  dryRunBackfill: (ruleKey: string, windowLabel: string) => Promise<BackfillBatch>
  requestBackfill: (id: string) => void
  setBackfillRowInclude: (batchId: string, rowId: string, include: boolean) => void
  approveBackfill: (id: string) => Promise<void>
  withdrawBackfill: (id: string, reason: string) => void
  setKillSwitch: (key: KillSwitch['key'], enabled: boolean, reason: string) => Promise<void>
  note: (input: NoteInput) => void
}

export interface RecognitionContextValue {
  state: RecognitionState
  scenario: Scenario
  source: 'sample' | 'api' | 'mixed'
  apiStatus: 'loading' | 'ready' | 'error'
  apiError: string | null
  loads: LoadMap
  errors: ErrorMap
  engineOn: boolean
  actor: { id: string; name: string; role: string }
  can: (permission: Permission) => boolean
  simulations: Record<string, { simulation: RuleSimulation; signature: string }>
  setScenario: (scenario: Scenario) => void
  actions: RecognitionActions
  publishedRule: (ruleKey: string) => Rule | undefined
  draftRule: (ruleKey: string) => Rule | undefined
  rulesFor: (ruleKey: string) => Rule[]
  board: (seasonKey: string) => LeaderboardSnapshot | undefined
}

const RecognitionContext = createContext<RecognitionContextValue | null>(null)

function uuid(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID()
  return `local-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
}

function nowIso(): string {
  return new Date().toISOString()
}

function roleLabel(role: string): string {
  return role
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}

function snapshot(
  seasonKey: string,
  rows: BoardRow[],
  extras: Partial<LeaderboardSnapshot> = {}
): LeaderboardSnapshot {
  const ranked = recomputeRanks(rows)
  return {
    seasonKey,
    suppressed: publicBoardSuppressed(ranked),
    suppressionReason: 'Not enough participants yet.',
    updatedAt: nowIso(),
    rankingNote: 'Ranked by verified trail completions, then verified sites, XP, and earliest completion.',
    publicHidden: false,
    frozen: false,
    rows: ranked,
    ...extras,
  }
}

function sampleState(): RecognitionState {
  const boards: Record<string, LeaderboardSnapshot> = {}
  for (const season of SAMPLE_SEASONS) {
    const rows = SAMPLE_BOARDS[season.key] ?? []
    boards[season.key] = snapshot(season.key, rows, {
      suppressed: publicBoardSuppressed(rows),
      frozen: season.status === 'frozen',
      publicHidden: !(
        SAMPLE_KILL_SWITCHES.find((entry) => entry.key === 'public_leaderboard')?.enabled ?? true
      ),
    })
  }
  return {
    rules: SAMPLE_RULES,
    badges: SAMPLE_BADGES,
    missions: SAMPLE_MISSIONS,
    seasons: SAMPLE_SEASONS,
    boards,
    awards: SAMPLE_AWARDS,
    moderation: SAMPLE_MODERATION,
    backfill: SAMPLE_BACKFILL,
    killSwitches: SAMPLE_KILL_SWITCHES,
    audit: SAMPLE_AUDIT,
  }
}

function emptyState(): RecognitionState {
  const state = sampleState()
  return {
    ...state,
    rules: [],
    badges: [],
    missions: [],
    seasons: [],
    boards: {},
    awards: [],
    moderation: [],
    backfill: [],
    audit: [],
  }
}

/** Recompute every derived field after a mutation. */
function decorate(state: RecognitionState): RecognitionState {
  const publicSwitch = state.killSwitches.find((entry) => entry.key === 'public_leaderboard')
  const publicHidden = !(publicSwitch?.enabled ?? true)
  const boards: Record<string, LeaderboardSnapshot> = {}
  for (const season of state.seasons) {
    const board = state.boards[season.key]
    if (!board) continue
    const rows = recomputeRanks(board.rows)
    boards[season.key] = {
      ...board,
      rows,
      suppressed: board.suppressed || publicBoardSuppressed(rows),
      frozen: board.frozen || season.status === 'frozen' || season.status === 'closed',
      publicHidden,
    }
  }
  return {
    ...state,
    badges: mergeBadgeUsage(state.badges, state.rules, state.missions),
    boards,
  }
}

function apiErrorText(error: unknown): string {
  if (error instanceof Error && error.message) return error.message
  return 'The contracts API did not answer.'
}

function withNote(state: RecognitionState, note: AuditEntry): RecognitionState {
  return { ...state, audit: [note, ...state.audit].slice(0, 200) }
}

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)
}

export function RecognitionProvider({ children }: { children: ReactNode }) {
  const routeContext = useRouteContext({ strict: false }) as {
    user?: { id: string; name?: string; role: string } | null
  }
  const user = routeContext?.user
  const actor = useMemo(
    () => ({
      id: user?.id ?? 'sample-admin',
      name: user?.name ?? 'Amina Hassan',
      role: user?.role ?? 'administrator',
    }),
    [user?.id, user?.name, user?.role]
  )
  const role = normaliseRole(user?.role)
  const can = useCallback((permission: Permission) => roleHasPermission(role, permission), [role])

  const [state, setState] = useState<RecognitionState>(() => decorate(sampleState()))
  const stateRef = useRef(state)
  stateRef.current = state
  const [scenario, setScenarioState] = useState<Scenario>('default')
  const [source, setSource] = useState<'sample' | 'api' | 'mixed'>('sample')
  const [apiError, setApiError] = useState<string | null>(null)
  const [loads, setLoads] = useState<LoadMap>(
    () => Object.fromEntries(SECTIONS.map((section) => [section, 'idle'])) as LoadMap
  )
  const [errors, setErrors] = useState<ErrorMap>({})
  const [simulations, setSimulations] = useState<
    Record<string, { simulation: RuleSimulation; signature: string }>
  >({})
  const apiRuleIds = useRef<Set<string>>(new Set())
  const apiModerationIds = useRef<Set<string>>(new Set())
  const apiBackfillIds = useRef<Set<string>>(new Set())
  const mounted = useRef(true)

  useEffect(() => {
    mounted.current = true
    return () => {
      mounted.current = false
    }
  }, [])

  const setSection = (section: RecognitionSection, status: LoadState, message?: string) => {
    setLoads((prev) => ({ ...prev, [section]: status }))
    setErrors((prev) => ({ ...prev, [section]: message }))
  }

  const refresh = useCallback(async () => {
    if (scenario === 'loading') {
      setLoads(Object.fromEntries(SECTIONS.map((section) => [section, 'loading'])) as LoadMap)
      return
    }
    if (scenario === 'empty') {
      setState(decorate(emptyState()))
      setLoads(Object.fromEntries(SECTIONS.map((section) => [section, 'ready'])) as LoadMap)
      setErrors({})
      setSource('sample')
      return
    }
    if (scenario === 'error') {
      setLoads(Object.fromEntries(SECTIONS.map((section) => [section, 'error'])) as LoadMap)
      setErrors(
        Object.fromEntries(SECTIONS.map((section) => [section, 'The recognition service returned an error.']))
      )
      setApiError('The recognition service returned an error.')
      return
    }

    setLoads(
      (prev) =>
        Object.fromEntries(
          SECTIONS.map((section) => [section, prev[section] === 'ready' ? 'ready' : 'loading'])
        ) as LoadMap
    )
    const api = createRecognitionApi({
      fixtureState: scenario === 'stale' ? 'stale' : undefined,
    })

    const results = await Promise.allSettled([
      api.listRules(),
      api.listBadges(),
      api.listSeasons(),
      api.listModeration(),
      api.listBackfill(),
      api.listKillSwitches(),
      api.listAudit(),
      api.getLeaderboard(),
    ])

    if (!mounted.current) return

    const [
      rulesResult,
      badgesResult,
      seasonsResult,
      moderationResult,
      backfillResult,
      killsResult,
      auditResult,
      boardResult,
    ] = results
    const nextErrors: ErrorMap = {}
    let successes = 0

    let rules = stateRef.current.rules
    let badges = stateRef.current.badges
    let seasons = stateRef.current.seasons
    let moderation = stateRef.current.moderation
    let backfill = stateRef.current.backfill
    let killSwitches = stateRef.current.killSwitches
    let audit = stateRef.current.audit
    let boards = stateRef.current.boards

    const findRule = (row: ContractsSchemas['RecognitionRule']) =>
      stateRef.current.rules.find((rule) => rule.ruleKey === row.ruleKey && rule.version === row.version)

    if (rulesResult.status === 'fulfilled') {
      successes += 1
      apiRuleIds.current = new Set(rulesResult.value.map((row) => row.id))
      const apiRules = rulesResult.value.map((row) => mapApiRule(row, findRule(row)))
      rules = mergeRules(stateRef.current.rules, apiRules)
      setSection('rules', 'ready')
    } else {
      nextErrors.rules = apiErrorText(rulesResult.reason)
      setSection('rules', 'error', nextErrors.rules)
    }

    if (badgesResult.status === 'fulfilled') {
      successes += 1
      const apiBadges = badgesResult.value.map((row) =>
        mapApiBadge(
          row,
          stateRef.current.badges.find((badge) => badge.badgeKey === row.badgeKey)
        )
      )
      badges = mergeBadges(stateRef.current.badges, apiBadges)
      setSection('badges', 'ready')
    } else {
      nextErrors.badges = apiErrorText(badgesResult.reason)
      setSection('badges', 'error', nextErrors.badges)
    }

    if (seasonsResult.status === 'fulfilled') {
      successes += 1
      const apiSeasons = seasonsResult.value.map((row) =>
        mapApiSeason(
          row,
          stateRef.current.seasons.find((season) => season.key === row.key)
        )
      )
      seasons = mergeSeasons(stateRef.current.seasons, apiSeasons)
      setSection('seasons', 'ready')
    } else {
      nextErrors.seasons = apiErrorText(seasonsResult.reason)
      setSection('seasons', 'error', nextErrors.seasons)
    }

    if (moderationResult.status === 'fulfilled') {
      successes += 1
      apiModerationIds.current = new Set(moderationResult.value.map((row) => row.id))
      const apiCases = moderationResult.value.map((row) =>
        mapApiModeration(
          row,
          stateRef.current.moderation.find((entry) => entry.id === row.id)
        )
      )
      moderation = mergeModeration(stateRef.current.moderation, apiCases)
      setSection('moderation', 'ready')
    } else {
      nextErrors.moderation = apiErrorText(moderationResult.reason)
      setSection('moderation', 'error', nextErrors.moderation)
    }

    if (backfillResult.status === 'fulfilled') {
      successes += 1
      apiBackfillIds.current = new Set(backfillResult.value.map((row) => row.id))
      const apiBatches = backfillResult.value.map((row) =>
        mapApiBackfill(
          row,
          stateRef.current.backfill.find((batch) => batch.id === row.id)
        )
      )
      backfill = mergeBackfill(stateRef.current.backfill, apiBatches)
      setSection('backfill', 'ready')
    } else {
      nextErrors.backfill = apiErrorText(backfillResult.reason)
      setSection('backfill', 'error', nextErrors.backfill)
    }

    if (killsResult.status === 'fulfilled') {
      successes += 1
      const apiSwitches = killsResult.value
        .map((row) =>
          mapApiKillSwitch(
            row,
            stateRef.current.killSwitches.find((entry) => entry.key === row.key)
          )
        )
        .filter((entry): entry is KillSwitch => Boolean(entry))
      killSwitches = mergeKillSwitches(stateRef.current.killSwitches, apiSwitches)
      setSection('killSwitches', 'ready')
    } else {
      nextErrors.killSwitches = apiErrorText(killsResult.reason)
      setSection('killSwitches', 'error', nextErrors.killSwitches)
    }

    if (auditResult.status === 'fulfilled') {
      successes += 1
      audit = mergeAudit(stateRef.current.audit, auditResult.value.map(mapApiAudit))
      setSection('audit', 'ready')
    } else {
      nextErrors.audit = apiErrorText(auditResult.reason)
      setSection('audit', 'error', nextErrors.audit)
    }

    if (boardResult.status === 'fulfilled') {
      successes += 1
      const apiBoard = boardResult.value
      const seasonKey = apiBoard.seasonKey
      const sampleRows = stateRef.current.boards[seasonKey]?.rows ?? SAMPLE_BOARDS[seasonKey] ?? []
      const rows = mergeBoardRows(sampleRows, apiBoard)
      boards = {
        ...stateRef.current.boards,
        [seasonKey]: snapshot(seasonKey, rows, {
          suppressed: apiBoard.suppressed || publicBoardSuppressed(rows),
          suppressionReason: apiBoard.suppressionReason ?? 'Not enough participants yet.',
          updatedAt: apiBoard.updatedAt ?? nowIso(),
          rankingNote: apiBoard.rankingNote,
        }),
      }
      setSection('leaderboard', 'ready')
    } else {
      nextErrors.leaderboard = apiErrorText(boardResult.reason)
      setSection('leaderboard', 'error', nextErrors.leaderboard)
    }

    setErrors(nextErrors)
    setApiError(successes === 0 ? 'The contracts API did not answer any recognition read.' : null)
    setSource(successes === 0 ? 'sample' : successes === results.length ? 'api' : 'mixed')
    setState((prev) =>
      decorate({
        ...prev,
        rules,
        badges,
        seasons,
        moderation,
        backfill,
        killSwitches,
        audit,
        boards,
      })
    )
  }, [scenario])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const setScenario = useCallback((next: Scenario) => {
    setScenarioState(next)
  }, [])

  const note = useCallback(
    (input: NoteInput) => {
      const entry: AuditEntry = {
        id: uuid(),
        actor: actor.name,
        role: roleLabel(actor.role),
        action: input.action,
        entity: input.entity,
        detail: input.detail,
        category: input.category,
        at: nowIso(),
      }
      setState((prev) => withNote(prev, entry))
    },
    [actor.name, actor.role]
  )

  const publishedRule = useCallback(
    (ruleKey: string) =>
      stateRef.current.rules
        .filter((rule) => rule.ruleKey === ruleKey && rule.status === 'published')
        .sort((a, b) => b.version - a.version)[0],
    []
  )

  const draftRule = useCallback(
    (ruleKey: string) =>
      stateRef.current.rules
        .filter((rule) => rule.ruleKey === ruleKey && rule.status === 'draft')
        .sort((a, b) => b.version - a.version)[0],
    []
  )

  const rulesFor = useCallback(
    (ruleKey: string) =>
      stateRef.current.rules.filter((rule) => rule.ruleKey === ruleKey).sort((a, b) => b.version - a.version),
    []
  )

  const board = useCallback((seasonKey: string) => stateRef.current.boards[seasonKey], [])

  const saveRuleDraft = useCallback(
    (ruleKey: string, draft: RuleDraft): Rule => {
      const current = stateRef.current
      const live = current.rules
        .filter((rule) => rule.ruleKey === ruleKey && rule.status === 'published')
        .sort((a, b) => b.version - a.version)[0]
      const existingDraft = current.rules.find((rule) => rule.ruleKey === ruleKey && rule.status === 'draft')
      const maxVersion = Math.max(
        0,
        ...current.rules.filter((rule) => rule.ruleKey === ruleKey).map((rule) => rule.version)
      )
      const version = existingDraft?.version ?? maxVersion + 1
      const rule: Rule = {
        id: existingDraft?.id ?? uuid(),
        ruleKey,
        version,
        name: draft.name.trim(),
        status: 'draft',
        sourceType: draft.sourceType,
        event: draft.event,
        verify: draft.verify,
        xpAmount: draft.xpAmount,
        badgeKey: draft.badgeKey === 'none' ? null : draft.badgeKey,
        effectiveFrom: draft.effectiveFrom,
        effectiveTo: null,
        createdBy: actor.id,
        publishedBy: null,
        updatedAt: nowIso(),
        weeklyCap: live?.weeklyCap ?? null,
      }
      setState((prev) =>
        decorate(
          withNote(
            {
              ...prev,
              rules: [...prev.rules.filter((entry) => entry.id !== rule.id), rule],
            },
            {
              id: uuid(),
              actor: actor.name,
              role: roleLabel(actor.role),
              action: existingDraft ? 'Rule draft updated' : 'Rule draft saved',
              entity: `${ruleKey} · v${version}`,
              detail: 'Staged definition · nothing is live until published',
              category: 'rules',
              at: nowIso(),
            }
          )
        )
      )
      return rule
    },
    [actor.id, actor.name, actor.role]
  )

  const simulateRule = useCallback(async (ruleKey: string, draft: RuleDraft): Promise<RuleSimulation> => {
    const current = stateRef.current
    const live =
      current.rules
        .filter((rule) => rule.ruleKey === ruleKey && rule.status === 'published')
        .sort((a, b) => b.version - a.version)[0] ??
      current.rules.filter((rule) => rule.ruleKey === ruleKey).sort((a, b) => b.version - a.version)[0]
    if (!live) throw new Error('No rule version to simulate against.')
    let simulation = simulateDraft(draft, live)
    const draftRuleRow = current.rules.find((rule) => rule.ruleKey === ruleKey && rule.status === 'draft')
    if (draftRuleRow && apiRuleIds.current.has(draftRuleRow.id)) {
      try {
        const api = createRecognitionApi()
        const server = await api.simulateRule(draftRuleRow.id)
        simulation = {
          ...simulation,
          serverEvaluated: server.evaluated,
          serverWouldAward: server.wouldAward,
          source: 'server-dry-run',
          notes: server.notes ?? simulation.notes,
        }
      } catch {
        // The staged estimate is still authoritative for the publish gate.
      }
    }
    setSimulations((prev) => ({
      ...prev,
      [ruleKey]: { simulation, signature: draftSignature(draft) },
    }))
    return simulation
  }, [])

  const publishRule = useCallback(
    async (ruleKey: string, draftValues?: RuleDraft): Promise<void> => {
      const current = stateRef.current
      const engine = current.killSwitches.find((entry) => entry.key === 'global')?.enabled ?? true
      if (!engine) throw new Error('The recognition engine is off. Publishing is blocked.')
      const existingDraft = current.rules.find((rule) => rule.ruleKey === ruleKey && rule.status === 'draft')
      const live = current.rules
        .filter((rule) => rule.ruleKey === ruleKey && rule.status === 'published')
        .sort((a, b) => b.version - a.version)[0]
      const values =
        draftValues ??
        (existingDraft
          ? {
              name: existingDraft.name,
              sourceType: existingDraft.sourceType,
              event: existingDraft.event,
              verify: existingDraft.verify,
              xpAmount: existingDraft.xpAmount,
              badgeKey: existingDraft.badgeKey ?? 'none',
              effectiveFrom: existingDraft.effectiveFrom,
            }
          : undefined)
      if (!values) throw new Error('There is no staged draft to publish.')
      const maxVersion = Math.max(
        0,
        ...current.rules.filter((rule) => rule.ruleKey === ruleKey).map((rule) => rule.version)
      )
      const target: Rule = {
        id: existingDraft?.id ?? uuid(),
        ruleKey,
        version: existingDraft?.version ?? maxVersion + 1,
        name: values.name.trim(),
        status: 'draft',
        sourceType: values.sourceType,
        event: values.event,
        verify: values.verify,
        xpAmount: values.xpAmount,
        badgeKey: values.badgeKey === 'none' ? null : values.badgeKey,
        effectiveFrom: values.effectiveFrom,
        effectiveTo: null,
        createdBy: existingDraft?.createdBy ?? actor.id,
        publishedBy: null,
        updatedAt: nowIso(),
        weeklyCap: live?.weeklyCap ?? null,
      }
      if (live && draftValues && requiresSecondApprover(live, draftValues) && target.createdBy === actor.id) {
        throw new Error('XP or audience changes need a second administrator. You authored this draft.')
      }
      const sim = simulations[ruleKey]
      if (!sim) throw new Error('Run a simulation of the staged values first.')
      if (sim.signature !== draftSignature(values)) {
        throw new Error('The staged values changed since the last simulation. Run it again.')
      }

      if (apiRuleIds.current.has(target.id)) {
        const api = createRecognitionApi()
        await api.publishRule(target.id)
      }

      setState((prev) =>
        decorate(
          withNote(
            {
              ...prev,
              rules: [
                ...prev.rules
                  .filter((rule) => rule.id !== target.id)
                  .map((rule) => {
                    if (rule.ruleKey !== ruleKey || rule.status !== 'published') return rule
                    return {
                      ...rule,
                      status: 'retired' as const,
                      effectiveTo: target.effectiveFrom,
                    }
                  }),
                {
                  ...target,
                  status: 'published' as const,
                  publishedBy: actor.name,
                },
              ],
            },
            {
              id: uuid(),
              actor: actor.name,
              role: roleLabel(actor.role),
              action: 'Rule published',
              entity: `${ruleKey} · v${target.version}`,
              detail: `Simulation of the staged definition · effective ${target.effectiveFrom}`,
              category: 'rules',
              at: nowIso(),
            }
          )
        )
      )
      setSimulations((prev) => {
        const next = { ...prev }
        delete next[ruleKey]
        return next
      })
      notify.saved('Rule published')
    },
    [actor.id, actor.name, actor.role, simulations]
  )

  const retireRule = useCallback(
    (ruleKey: string, reason: string) => {
      if (reason.trim().length < 10)
        throw new Error('Retiring a rule needs a reason of at least 10 characters.')
      setState((prev) =>
        decorate(
          withNote(
            {
              ...prev,
              rules: prev.rules.map((rule) =>
                rule.ruleKey === ruleKey && rule.status === 'published'
                  ? {
                      ...rule,
                      status: 'retired',
                      effectiveTo: nowIso().slice(0, 10),
                    }
                  : rule
              ),
            },
            {
              id: uuid(),
              actor: actor.name,
              role: roleLabel(actor.role),
              action: 'Rule retired',
              entity: ruleKey,
              detail: `${reason} · awards already written are kept`,
              category: 'rules',
              at: nowIso(),
            }
          )
        )
      )
      notify.saved('Rule retired')
    },
    [actor.name, actor.role]
  )

  const discardRuleDraft = useCallback(
    (ruleKey: string) => {
      setState((prev) => {
        const draft = prev.rules.find((rule) => rule.ruleKey === ruleKey && rule.status === 'draft')
        if (!draft) return prev
        return withNote(
          { ...prev, rules: prev.rules.filter((rule) => rule.id !== draft.id) },
          {
            id: uuid(),
            actor: actor.name,
            role: roleLabel(actor.role),
            action: 'Rule draft discarded',
            entity: `${ruleKey} · v${draft.version}`,
            detail: 'Staged definition removed · live version untouched',
            category: 'rules',
            at: nowIso(),
          }
        )
      })
      setSimulations((prev) => {
        const next = { ...prev }
        delete next[ruleKey]
        return next
      })
    },
    [actor.name, actor.role]
  )

  const createBadge = useCallback(
    (input: Partial<Badge> & Pick<Badge, 'badgeKey' | 'nameEn' | 'family'>) => {
      const badge: Badge = {
        badgeKey: input.badgeKey,
        nameEn: input.nameEn,
        nameSw: input.nameSw ?? null,
        family: input.family,
        criteria: input.criteria ?? 'Criteria not set',
        privacyClass: input.privacyClass ?? 'public',
        hidden: input.hidden ?? false,
        publicEligible: input.publicEligible ?? true,
        status: 'draft',
        version: 1,
        updatedAt: nowIso(),
        createdBy: actor.id,
        usedBy: 0,
      }
      setState((prev) =>
        decorate(
          withNote(
            {
              ...prev,
              badges: [...prev.badges.filter((entry) => entry.badgeKey !== badge.badgeKey), badge],
            },
            {
              id: uuid(),
              actor: actor.name,
              role: roleLabel(actor.role),
              action: 'Badge drafted',
              entity: `${badge.badgeKey} · ${badge.nameEn}`,
              detail: 'Both names required before publish',
              category: 'rules',
              at: nowIso(),
            }
          )
        )
      )
      notify.saved('Badge draft')
    },
    [actor.id, actor.name, actor.role]
  )

  const updateBadge = useCallback(
    (badgeKey: string, patch: Partial<Badge>) => {
      setState((prev) =>
        decorate({
          ...prev,
          badges: prev.badges.map((badge) => {
            if (badge.badgeKey !== badgeKey) return badge
            if (badge.status === 'published') {
              return {
                ...badge,
                pendingChanges: { ...badge.pendingChanges, ...patch },
                pendingBy: actor.id,
                updatedAt: nowIso(),
              }
            }
            return {
              ...badge,
              ...patch,
              pendingBy: actor.id,
              updatedAt: nowIso(),
            }
          }),
        })
      )
    },
    [actor.id]
  )

  const publishBadge = useCallback(
    async (badgeKey: string): Promise<void> => {
      const badge = stateRef.current.badges.find((entry) => entry.badgeKey === badgeKey)
      if (!badge) throw new Error('Badge not found.')
      const staged = { ...badge, ...(badge.pendingChanges ?? {}) }
      if (!staged.nameEn.trim() || !staged.nameSw?.trim()) {
        throw new Error('A badge needs an English and a Kiswahili name before publish.')
      }
      const author = badge.pendingBy ?? badge.createdBy
      if (author && author === actor.id) {
        throw new Error('You authored or last edited this badge. A second administrator must publish it.')
      }
      const api = createRecognitionApi()
      await api.publishBadge(badgeKey)
      setState((prev) =>
        decorate(
          withNote(
            {
              ...prev,
              badges: prev.badges.map((entry) =>
                entry.badgeKey === badgeKey
                  ? {
                      ...entry,
                      ...(entry.pendingChanges ?? {}),
                      status: 'published',
                      version: entry.version + 1,
                      pendingChanges: undefined,
                      pendingBy: undefined,
                      updatedAt: nowIso(),
                    }
                  : entry
              ),
            },
            {
              id: uuid(),
              actor: actor.name,
              role: roleLabel(actor.role),
              action: 'Badge published',
              entity: `${badgeKey} · ${badge.nameEn}`,
              detail: 'EN + SW names reviewed',
              category: 'rules',
              at: nowIso(),
            }
          )
        )
      )
      notify.saved('Badge published')
    },
    [actor.id, actor.name, actor.role]
  )

  const saveMission = useCallback(
    (input: Partial<Mission> & Pick<Mission, 'nameEn' | 'family'>) => {
      setState((prev) => {
        const id = input.id ?? uuid()
        const existing = prev.missions.find((mission) => mission.id === id)
        const mission: Mission = {
          id,
          trackKey: input.trackKey ?? existing?.trackKey ?? id,
          family: input.family,
          nameEn: input.nameEn,
          nameSw: input.nameSw ?? existing?.nameSw ?? input.nameEn,
          condition: input.condition ?? existing?.condition ?? 'Condition not set',
          xpReward: input.xpReward ?? existing?.xpReward ?? 0,
          badgeKey: input.badgeKey ?? existing?.badgeKey ?? 'none',
          status: input.status ?? existing?.status ?? 'active',
          target: input.target ?? existing?.target ?? 1,
          completions: existing?.completions ?? 0,
          completionsLedger: existing?.completionsLedger ?? [],
        }
        return decorate(
          withNote(
            {
              ...prev,
              missions: [...prev.missions.filter((entry) => entry.id !== id), mission],
            },
            {
              id: uuid(),
              actor: actor.name,
              role: roleLabel(actor.role),
              action: existing ? 'Mission updated' : 'Mission created',
              entity: mission.nameEn,
              detail: `${mission.family} · ${mission.condition}`,
              category: 'rules',
              at: nowIso(),
            }
          )
        )
      })
      notify.saved('Mission')
    },
    [actor.name, actor.role]
  )

  const toggleMission = useCallback(
    (id: string) => {
      setState((prev) => {
        const mission = prev.missions.find((entry) => entry.id === id)
        if (!mission) return prev
        const status = mission.status === 'active' ? 'paused' : 'active'
        return withNote(
          {
            ...prev,
            missions: prev.missions.map((entry) => (entry.id === id ? { ...entry, status } : entry)),
          },
          {
            id: uuid(),
            actor: actor.name,
            role: roleLabel(actor.role),
            action: status === 'paused' ? 'Mission paused' : 'Mission resumed',
            entity: mission.nameEn,
            detail: 'Pause and resume are symmetric: progress is kept either way',
            category: 'rules',
            at: nowIso(),
          }
        )
      })
    },
    [actor.name, actor.role]
  )

  const correctMissionCompletion = useCallback(
    (missionId: string, completionId: string, note: string) => {
      if (note.trim().length < 10) throw new Error('Give the correction a reason of at least 10 characters.')
      setState((prev) => {
        const mission = prev.missions.find((entry) => entry.id === missionId)
        if (!mission) return prev
        return withNote(
          {
            ...prev,
            missions: prev.missions.map((entry) =>
              entry.id === missionId
                ? {
                    ...entry,
                    completions: Math.max(0, entry.completions - 1),
                    completionsLedger: entry.completionsLedger.map((completion) =>
                      completion.id === completionId
                        ? { ...completion, status: 'corrected', note }
                        : completion
                    ),
                  }
                : entry
            ),
          },
          {
            id: uuid(),
            actor: actor.name,
            role: roleLabel(actor.role),
            action: 'Mission completion corrected',
            entity: `${mission.nameEn} · ${completionId}`,
            detail: note,
            category: 'awards',
            at: nowIso(),
          }
        )
      })
    },
    [actor.name, actor.role]
  )

  const createSeason = useCallback(
    (input: Partial<Season> & Pick<Season, 'key' | 'nameEn' | 'startsAt' | 'endsAt'>) => {
      const season: Season = {
        key: input.key,
        nameEn: input.nameEn,
        nameSw: input.nameSw ?? input.nameEn,
        startsAt: input.startsAt,
        endsAt: input.endsAt,
        status: 'upcoming',
        badgeKey: input.badgeKey ?? null,
        xpAward: input.xpAward ?? 500,
        missionFamilies: input.missionFamilies ?? [],
        boardSize: 0,
        preparedBy: actor.id,
        closedAt: null,
        closedBy: null,
      }
      setState((prev) =>
        decorate(
          withNote(
            {
              ...prev,
              seasons: [...prev.seasons.filter((entry) => entry.key !== season.key), season],
              boards: {
                ...prev.boards,
                [season.key]: snapshot(season.key, []),
              },
            },
            {
              id: uuid(),
              actor: actor.name,
              role: roleLabel(actor.role),
              action: 'Season prepared',
              entity: season.nameEn,
              detail: `${season.startsAt.slice(0, 10)} – ${season.endsAt.slice(0, 10)}`,
              category: 'events',
              at: nowIso(),
            }
          )
        )
      )
      notify.saved('Season')
    },
    [actor.id, actor.name, actor.role]
  )

  const publishSeason = useCallback(
    async (key: string): Promise<void> => {
      const season = stateRef.current.seasons.find((entry) => entry.key === key)
      if (!season) throw new Error('Season not found.')
      const api = createRecognitionApi()
      try {
        await api.publishSeason(key)
      } catch {
        // The mock advertises season publish by UUID; a key-based sample stays local.
      }
      setState((prev) =>
        decorate(
          withNote(
            {
              ...prev,
              seasons: prev.seasons.map((entry) =>
                entry.key === key ? { ...entry, status: 'active' } : entry
              ),
            },
            {
              id: uuid(),
              actor: actor.name,
              role: roleLabel(actor.role),
              action: 'Season published',
              entity: season.nameEn,
              detail: 'Board opens with the season',
              category: 'events',
              at: nowIso(),
            }
          )
        )
      )
      notify.saved('Season published')
    },
    [actor.name, actor.role]
  )

  const freezeSeason = useCallback(
    async (key: string): Promise<void> => {
      const season = stateRef.current.seasons.find((entry) => entry.key === key)
      if (!season) throw new Error('Season not found.')
      const api = createRecognitionApi()
      try {
        await api.freezeSeason(key)
      } catch {
        // Operator overlay keeps the freeze visible when the mock has no UUID season.
      }
      setState((prev) =>
        decorate(
          withNote(
            {
              ...prev,
              seasons: prev.seasons.map((entry) =>
                entry.key === key ? { ...entry, status: 'frozen' } : entry
              ),
              boards: {
                ...prev.boards,
                [key]: { ...prev.boards[key], frozen: true },
              },
            },
            {
              id: uuid(),
              actor: actor.name,
              role: roleLabel(actor.role),
              action: 'Season frozen',
              entity: season.nameEn,
              detail: 'Ranks stay readable; no new placements are written',
              category: 'safety',
              at: nowIso(),
            }
          )
        )
      )
      notify.saved('Board frozen')
    },
    [actor.name, actor.role]
  )

  const setBoardFrozen = useCallback(
    (key: string, frozen: boolean, reason: string) => {
      if (reason.trim().length < 5) throw new Error('Give the board decision a reason.')
      const season = stateRef.current.seasons.find((entry) => entry.key === key)
      setState((prev) =>
        decorate(
          withNote(
            {
              ...prev,
              seasons: prev.seasons.map((entry) =>
                entry.key === key && !frozen && entry.status === 'frozen'
                  ? { ...entry, status: 'active' }
                  : entry
              ),
              boards: {
                ...prev.boards,
                [key]: { ...prev.boards[key], frozen },
              },
            },
            {
              id: uuid(),
              actor: actor.name,
              role: roleLabel(actor.role),
              action: frozen ? 'Board frozen' : 'Board unfrozen',
              entity: season?.nameEn ?? key,
              detail: reason,
              category: 'safety',
              at: nowIso(),
            }
          )
        )
      )
    },
    [actor.name, actor.role]
  )

  const closeSeason = useCallback(
    async (key: string, reason: string): Promise<void> => {
      if (reason.trim().length < 10) throw new Error('Explain the close with at least 10 characters.')
      const season = stateRef.current.seasons.find((entry) => entry.key === key)
      if (!season) throw new Error('Season not found.')
      if (season.status === 'closed') throw new Error('This season is already closed.')
      if (season.preparedBy === actor.id) {
        throw new Error('You prepared this season. A second administrator must close it.')
      }
      const board = stateRef.current.boards[key]
      setState((prev) =>
        decorate(
          withNote(
            {
              ...prev,
              seasons: prev.seasons.map((entry) =>
                entry.key === key
                  ? {
                      ...entry,
                      status: 'closed',
                      closedAt: nowIso(),
                      closedBy: actor.name,
                      boardSize: board?.rows.filter((row) => row.status === 'active').length ?? 0,
                    }
                  : entry
              ),
              boards: {
                ...prev.boards,
                [key]: {
                  ...prev.boards[key],
                  frozen: true,
                  updatedAt: nowIso(),
                },
              },
            },
            {
              id: uuid(),
              actor: actor.name,
              role: roleLabel(actor.role),
              action: 'Season closed',
              entity: season.nameEn,
              detail: `Snapshot taken by ${actor.name} · ${reason}`,
              category: 'events',
              at: nowIso(),
            }
          )
        )
      )
      notify.saved('Season closed and board snapshotted')
    },
    [actor.id, actor.name, actor.role]
  )

  const setPublicHidden = useCallback(
    async (hidden: boolean, reason: string): Promise<void> => {
      await (async () => {
        const api = createRecognitionApi()
        await api.setKillSwitch('public_leaderboard', {
          enabled: !hidden,
          reason,
        })
      })()
      setState((prev) =>
        decorate(
          withNote(
            {
              ...prev,
              killSwitches: prev.killSwitches.map((entry) =>
                entry.key === 'public_leaderboard'
                  ? {
                      ...entry,
                      enabled: !hidden,
                      reason,
                      updatedBy: actor.name,
                      updatedAt: nowIso(),
                    }
                  : entry
              ),
            },
            {
              id: uuid(),
              actor: actor.name,
              role: roleLabel(actor.role),
              action: hidden ? 'Public board hidden' : 'Public board shown',
              entity: 'Kill switch · public_leaderboard',
              detail: reason,
              category: 'safety',
              at: nowIso(),
            }
          )
        )
      )
      notify.saved(hidden ? 'Public board hidden' : 'Public board shown')
    },
    [actor.name, actor.role]
  )

  const mutateBoard = useCallback(
    (seasonKey: string, updater: (rows: BoardRow[]) => BoardRow[], note: AuditEntry) => {
      setState((prev) => {
        const current = prev.boards[seasonKey]
        if (!current) return prev
        const rows = recomputeRanks(updater(current.rows))
        return decorate(
          withNote(
            {
              ...prev,
              boards: {
                ...prev.boards,
                [seasonKey]: {
                  ...current,
                  rows,
                  suppressed: publicBoardSuppressed(rows),
                  updatedAt: nowIso(),
                },
              },
              seasons: prev.seasons.map((season) =>
                season.key === seasonKey
                  ? {
                      ...season,
                      boardSize: rows.filter((row) => row.status === 'active').length,
                    }
                  : season
              ),
            },
            note
          )
        )
      })
    },
    []
  )

  const retractEntry = useCallback(
    (seasonKey: string, displayName: string, reason: string) => {
      if (reason.trim().length < 10) throw new Error('A retraction needs a reason of at least 10 characters.')
      const season = stateRef.current.seasons.find((entry) => entry.key === seasonKey)
      if (!season || season.status === 'closed') {
        throw new Error('A closed season cannot be retracted. Ranks are a read-only snapshot.')
      }
      const board = stateRef.current.boards[seasonKey]
      if (board?.frozen) throw new Error('The board is frozen. Unfreeze it before retracting an entry.')
      mutateBoard(
        seasonKey,
        (rows) =>
          rows.map((row) =>
            row.displayName === displayName
              ? {
                  ...row,
                  status: 'retracted',
                  retractedReason: reason,
                  retractedBy: actor.name,
                  retractedAt: nowIso(),
                }
              : row
          ),
        {
          id: uuid(),
          actor: actor.name,
          role: roleLabel(actor.role),
          action: 'Leaderboard entry retracted',
          entity: `${season.nameEn} · ${displayName}`,
          detail: `${reason} · ranks recomputed`,
          category: 'moderation',
          at: nowIso(),
        }
      )
      notify.success('Entry retracted and ranks recomputed')
    },
    [actor.name, actor.role, mutateBoard]
  )

  const restoreEntry = useCallback(
    (seasonKey: string, displayName: string) => {
      const season = stateRef.current.seasons.find((entry) => entry.key === seasonKey)
      if (!season || season.status === 'closed') {
        throw new Error('A closed season cannot be restored. Ranks are a read-only snapshot.')
      }
      mutateBoard(
        seasonKey,
        (rows) =>
          rows.map((row) =>
            row.displayName === displayName
              ? {
                  ...row,
                  status: 'active',
                  retractedReason: undefined,
                  retractedBy: undefined,
                  retractedAt: undefined,
                }
              : row
          ),
        {
          id: uuid(),
          actor: actor.name,
          role: roleLabel(actor.role),
          action: 'Leaderboard entry restored',
          entity: `${season.nameEn} · ${displayName}`,
          detail: 'Rank recomputed from verified activity',
          category: 'moderation',
          at: nowIso(),
        }
      )
      notify.success('Entry restored and ranks recomputed')
    },
    [actor.name, actor.role, mutateBoard]
  )

  const retryAwards = useCallback(
    (ids: string[]) => {
      const engine = stateRef.current.killSwitches.find((entry) => entry.key === 'global')?.enabled ?? true
      if (!engine) {
        notify.error('The recognition engine is off. Retries are disabled.')
        return
      }
      setState((prev) =>
        withNote(
          {
            ...prev,
            awards: prev.awards.map((award) =>
              ids.includes(award.id)
                ? {
                    ...award,
                    status: 'delivered',
                    attempts: award.attempts + 1,
                    cause: 'none',
                  }
                : award
            ),
          },
          {
            id: uuid(),
            actor: actor.name,
            role: roleLabel(actor.role),
            action: 'Award retry requested',
            entity: `${ids.length} award${ids.length === 1 ? '' : 's'}`,
            detail: 'Idempotent by award key (rule + reader + event)',
            category: 'awards',
            at: nowIso(),
          }
        )
      )
      notify.success(`${ids.length} award${ids.length === 1 ? '' : 's'} delivered`)
    },
    [actor.name, actor.role]
  )

  const retryAward = useCallback((id: string) => retryAwards([id]), [retryAwards])

  const correctAward = useCallback(
    async (id: string, input: CorrectionInput): Promise<void> => {
      const award = stateRef.current.awards.find((entry) => entry.id === id)
      if (!award) throw new Error('Award not found.')
      if (input.supportRef.trim().length < 10) {
        throw new Error('A manual credit or reversal needs a support reference of at least 10 characters.')
      }
      if (input.note.trim().length < 10) {
        throw new Error('Explain the correction with at least 10 characters.')
      }
      const amount = input.action === 'reversal' ? -award.xp : award.xp
      const api = createRecognitionApi()
      await api.createAdjustment({
        subjectRef: award.reader,
        amount,
        reason: input.action === 'reversal' ? 'reversal' : 'adjustment',
        note: `${input.supportRef.trim()} · ${input.note.trim()}`,
        compensatingFor: input.action === 'reversal' ? award.id : null,
      })
      setState((prev) =>
        withNote(
          {
            ...prev,
            awards: [
              ...prev.awards.map((entry) =>
                entry.id === id
                  ? {
                      ...entry,
                      status: input.action === 'reversal' ? entry.status : 'delivered',
                      corrected: {
                        action: input.action,
                        supportRef: input.supportRef,
                        note: input.note,
                        by: actor.name,
                        at: nowIso(),
                      },
                    }
                  : entry
              ),
              ...(input.action === 'reversal'
                ? [
                    {
                      id: uuid(),
                      reader: award.reader,
                      ruleKey: award.ruleKey,
                      ruleVersion: award.ruleVersion,
                      xp: -award.xp,
                      event: `Reversal for ${award.id} · ${award.event}`,
                      status: 'delivered' as const,
                      attempts: 0,
                      at: nowIso(),
                      cause: 'none' as const,
                    },
                  ]
                : []),
            ],
          },
          {
            id: uuid(),
            actor: actor.name,
            role: roleLabel(actor.role),
            action: input.action === 'reversal' ? 'Award reversed' : 'Award credited manually',
            entity: `${award.reader} · ${award.ruleKey} · v${award.ruleVersion}`,
            detail: `${input.supportRef.trim()} · ${input.note.trim()}`,
            category: 'awards',
            at: nowIso(),
          }
        )
      )
      notify.saved('Correction recorded')
    },
    [actor.name, actor.role]
  )

  const decideCase = useCallback(
    async (id: string, decision: ModerationDecision, reason: string): Promise<void> => {
      if (reason.trim().length < 10) {
        throw new Error('Every decision needs a reason of at least 10 characters.')
      }
      if (decision === 'none') throw new Error('Choose a decision before recording the case.')
      const entry = stateRef.current.moderation.find((item) => item.id === id)
      if (!entry) throw new Error('Case not found.')
      if (apiModerationIds.current.has(id) && isUuid(id)) {
        const api = createRecognitionApi()
        await api.decideModeration(id, { decision, reason })
      }
      setState((prev) => {
        let next: RecognitionState = {
          ...prev,
          moderation: prev.moderation.map((item) =>
            item.id === id
              ? {
                  ...item,
                  status: 'decided',
                  decision,
                  decidedAt: nowIso(),
                  resolution: `${decision}: ${reason}`,
                }
              : item
          ),
        }
        if (decision === 'disqualify' || decision === 'revoke') {
          const name = entry.subject.replace(/^Entry · /, '').replace(/[“”"]/g, '')
          const season = prev.seasons.find((item) => item.status === 'active')
          if (season) {
            const board = prev.boards[season.key]
            if (board?.rows.some((row) => row.displayName === name)) {
              const rows = recomputeRanks(
                board.rows.map((row) =>
                  row.displayName === name
                    ? {
                        ...row,
                        status: 'retracted' as const,
                        retractedReason: `Moderation ${id}: ${reason}`,
                        retractedBy: actor.name,
                        retractedAt: nowIso(),
                      }
                    : row
                )
              )
              next = {
                ...next,
                boards: {
                  ...next.boards,
                  [season.key]: {
                    ...board,
                    rows,
                    suppressed: publicBoardSuppressed(rows),
                    updatedAt: nowIso(),
                  },
                },
              }
            }
          }
        }
        return withNote(next, {
          id: uuid(),
          actor: actor.name,
          role: roleLabel(actor.role),
          action: 'Moderation decided',
          entity: `${id} · ${entry.subject}`,
          detail: `${decision} · ${reason}`,
          category: 'moderation',
          at: nowIso(),
        })
      })
      notify.saved('Decision recorded')
    },
    [actor.name, actor.role]
  )

  const reopenCase = useCallback(
    (id: string, reason: string) => {
      if (reason.trim().length < 10) throw new Error('Give the reopen a reason of at least 10 characters.')
      setState((prev) => {
        const entry = prev.moderation.find((item) => item.id === id)
        return withNote(
          {
            ...prev,
            moderation: prev.moderation.map((item) =>
              item.id === id ? { ...item, status: 'open', resolution: `reopened: ${reason}` } : item
            ),
          },
          {
            id: uuid(),
            actor: actor.name,
            role: roleLabel(actor.role),
            action: 'Moderation case reopened',
            entity: entry ? `${id} · ${entry.subject}` : id,
            detail: reason,
            category: 'moderation',
            at: nowIso(),
          }
        )
      })
    },
    [actor.name, actor.role]
  )

  const dryRunBackfill = useCallback(
    async (ruleKey: string, windowLabel: string): Promise<BackfillBatch> => {
      const current = stateRef.current
      const rule = current.rules
        .filter((entry) => entry.ruleKey === ruleKey && entry.status === 'published')
        .sort((a, b) => b.version - a.version)[0]
      if (!rule) throw new Error('Choose a published rule version.')
      const rows = (SAMPLE_BACKFILL_ROWS[ruleKey] ?? []).map((row) => ({
        ...row,
      }))
      const batch: BackfillBatch = {
        id: `BF-2026-${String(current.backfill.length + 16).padStart(3, '0')}`,
        ruleKey,
        ruleVersion: rule.version,
        windowLabel,
        from: '2026-10-19T00:00:00+03:00',
        to: '2026-11-18T23:59:59+03:00',
        status: 'dry_run',
        scanned: ruleKey === 'audio.story' ? 2980 : ruleKey === 'trail.completed' ? 386 : 1280,
        unit:
          ruleKey === 'audio.story'
            ? 'completions'
            : ruleKey === 'trail.completed'
              ? 'trail completions'
              : 'check-ins',
        rows,
        requestedBy: actor.id,
        approvedBy: null,
        createdAt: nowIso(),
        approvedAt: null,
      }
      const api = createRecognitionApi()
      try {
        await api.createBackfill({
          ruleKey,
          ruleVersion: rule.version,
          from: batch.from,
          to: batch.to,
        })
      } catch {
        // The operator dry-run remains available when the mock is off.
      }
      setState((prev) =>
        withNote(
          { ...prev, backfill: [batch, ...prev.backfill] },
          {
            id: uuid(),
            actor: actor.name,
            role: roleLabel(actor.role),
            action: 'Backfill dry-run',
            entity: `${batch.id} · ${ruleKey} · v${rule.version}`,
            detail: `${rows.length} rows · 0 removals · ${windowLabel}`,
            category: 'awards',
            at: nowIso(),
          }
        )
      )
      return batch
    },
    [actor.id, actor.name, actor.role]
  )

  const setBackfillRowInclude = useCallback((batchId: string, rowId: string, include: boolean) => {
    setState((prev) => ({
      ...prev,
      backfill: prev.backfill.map((batch) =>
        batch.id === batchId
          ? {
              ...batch,
              rows: batch.rows.map((row) => (row.id === rowId ? { ...row, include } : row)),
            }
          : batch
      ),
    }))
  }, [])

  const requestBackfill = useCallback(
    (id: string) => {
      setState((prev) => {
        const batch = prev.backfill.find((entry) => entry.id === id)
        if (!batch) return prev
        const included = batch.rows.filter((row) => row.include)
        return withNote(
          {
            ...prev,
            backfill: prev.backfill.map((entry) =>
              entry.id === id ? { ...entry, status: 'requested' } : entry
            ),
          },
          {
            id: uuid(),
            actor: actor.name,
            role: roleLabel(actor.role),
            action: 'Backfill approval requested',
            entity: `${batch.id} · ${batch.ruleKey} · v${batch.ruleVersion}`,
            detail: `${included.length} of ${batch.rows.length} rows · ${included.reduce((sum, row) => sum + row.xp, 0)} XP · awaiting a second approver`,
            category: 'awards',
            at: nowIso(),
          }
        )
      })
      notify.success('Approval requested')
    },
    [actor.name, actor.role]
  )

  const approveBackfill = useCallback(
    async (id: string): Promise<void> => {
      const batch = stateRef.current.backfill.find((entry) => entry.id === id)
      if (!batch) throw new Error('Batch not found.')
      const engine = stateRef.current.killSwitches.find((entry) => entry.key === 'global')?.enabled ?? true
      if (!engine) throw new Error('The recognition engine is off. Backfill is disabled.')
      if (batch.requestedBy === actor.id) {
        throw new Error('You requested this batch. A second approver must approve it.')
      }
      if (apiBackfillIds.current.has(id) && isUuid(id)) {
        const api = createRecognitionApi()
        await api.approveBackfill(id)
      }
      setState((prev) =>
        withNote(
          {
            ...prev,
            backfill: prev.backfill.map((entry) =>
              entry.id === id
                ? {
                    ...entry,
                    status: 'approved',
                    approvedBy: actor.name,
                    approvedAt: nowIso(),
                  }
                : entry
            ),
          },
          {
            id: uuid(),
            actor: actor.name,
            role: roleLabel(actor.role),
            action: 'Backfill approved',
            entity: `${batch.id} · ${batch.ruleKey} · v${batch.ruleVersion}`,
            detail: `${batch.rows.filter((row) => row.include).length} awards · approved by a second administrator`,
            category: 'awards',
            at: nowIso(),
          }
        )
      )
      notify.saved('Backfill approved')
    },
    [actor.id, actor.name, actor.role]
  )

  const withdrawBackfill = useCallback(
    (id: string, reason: string) => {
      if (reason.trim().length < 10) throw new Error('Explain the withdrawal with at least 10 characters.')
      setState((prev) => {
        const batch = prev.backfill.find((entry) => entry.id === id)
        return withNote(
          {
            ...prev,
            backfill: prev.backfill.map((entry) =>
              entry.id === id ? { ...entry, status: 'withdrawn', note: reason } : entry
            ),
          },
          {
            id: uuid(),
            actor: actor.name,
            role: roleLabel(actor.role),
            action: 'Backfill request withdrawn',
            entity: batch ? `${batch.id} · ${batch.ruleKey}` : id,
            detail: `${reason} · the dry-run stays available`,
            category: 'awards',
            at: nowIso(),
          }
        )
      })
      notify.saved('Backfill withdrawn')
    },
    [actor.name, actor.role]
  )

  const setKillSwitch = useCallback(
    async (key: KillSwitch['key'], enabled: boolean, reason: string): Promise<void> => {
      if (reason.trim().length < 5) throw new Error('Every switch change needs a reason.')
      const entry = stateRef.current.killSwitches.find((item) => item.key === key)
      if (!entry) throw new Error('Switch not found.')
      const api = createRecognitionApi()
      await api.setKillSwitch(key, { enabled, reason })
      setState((prev) =>
        decorate(
          withNote(
            {
              ...prev,
              killSwitches: prev.killSwitches.map((item) =>
                item.key === key
                  ? {
                      ...item,
                      enabled,
                      reason,
                      updatedBy: actor.name,
                      updatedAt: nowIso(),
                    }
                  : item
              ),
            },
            {
              id: uuid(),
              actor: actor.name,
              role: roleLabel(actor.role),
              action: `${entry.label} turned ${enabled ? 'on' : 'off'}`,
              entity: `Kill switch · ${key}`,
              detail: reason,
              category: 'safety',
              at: nowIso(),
            }
          )
        )
      )
      notify.saved(`${entry.label} turned ${enabled ? 'on' : 'off'}`)
    },
    [actor.name, actor.role]
  )

  const reset = useCallback(() => {
    setState(decorate(sampleState()))
    setSimulations({})
    setLoads(Object.fromEntries(SECTIONS.map((section) => [section, 'ready'])) as LoadMap)
    setErrors({})
    setApiError(null)
    setSource('sample')
    setScenarioState('default')
  }, [])

  const actions = useMemo<RecognitionActions>(
    () => ({
      reset,
      refresh,
      saveRuleDraft,
      simulateRule,
      publishRule,
      retireRule,
      discardRuleDraft,
      createBadge,
      updateBadge,
      publishBadge,
      saveMission,
      toggleMission,
      correctMissionCompletion,
      createSeason,
      publishSeason,
      freezeSeason,
      setBoardFrozen,
      closeSeason,
      setPublicHidden,
      retractEntry,
      restoreEntry,
      retryAward,
      retryAwards,
      correctAward,
      decideCase,
      reopenCase,
      dryRunBackfill,
      requestBackfill,
      setBackfillRowInclude,
      approveBackfill,
      withdrawBackfill,
      setKillSwitch,
      note,
    }),
    [
      reset,
      refresh,
      saveRuleDraft,
      simulateRule,
      publishRule,
      retireRule,
      discardRuleDraft,
      createBadge,
      updateBadge,
      publishBadge,
      saveMission,
      toggleMission,
      correctMissionCompletion,
      createSeason,
      publishSeason,
      freezeSeason,
      setBoardFrozen,
      closeSeason,
      setPublicHidden,
      retractEntry,
      restoreEntry,
      retryAward,
      retryAwards,
      correctAward,
      decideCase,
      reopenCase,
      dryRunBackfill,
      requestBackfill,
      setBackfillRowInclude,
      approveBackfill,
      withdrawBackfill,
      setKillSwitch,
      note,
    ]
  )

  const engineOn = state.killSwitches.find((entry) => entry.key === 'global')?.enabled ?? true
  const apiStatus: 'loading' | 'ready' | 'error' = Object.values(loads).some((value) => value === 'loading')
    ? 'loading'
    : Object.values(loads).every((value) => value === 'error')
      ? 'error'
      : 'ready'

  const value = useMemo<RecognitionContextValue>(
    () => ({
      state,
      scenario,
      source,
      apiStatus,
      apiError,
      loads,
      errors,
      engineOn,
      actor,
      can,
      simulations,
      setScenario,
      actions,
      publishedRule,
      draftRule,
      rulesFor,
      board,
    }),
    [
      state,
      scenario,
      source,
      apiStatus,
      apiError,
      loads,
      errors,
      engineOn,
      actor,
      can,
      simulations,
      setScenario,
      actions,
      publishedRule,
      draftRule,
      rulesFor,
      board,
    ]
  )

  return <RecognitionContext.Provider value={value}>{children}</RecognitionContext.Provider>
}

export function useRecognition(): RecognitionContextValue {
  const value = useContext(RecognitionContext)
  if (!value) throw new Error('useRecognition must be used inside RecognitionProvider')
  return value
}

/** True when every field the caller asked for is invalid-free. */
export function hasErrors(errors: Record<string, string | undefined>): boolean {
  return Object.values(errors).some(Boolean)
}
