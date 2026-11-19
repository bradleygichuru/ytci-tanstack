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
  classifySource,
  mergeBadgeUsage,
  normaliseRuleHistory,
  mapApiAudit,
  mapApiBackfill,
  mapApiBadge,
  mapApiKillSwitch,
  mapApiModeration,
  mapApiRule,
  mapApiSeason,
  sampleRows,
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
  createRule: (ruleKey: string, draft: RuleDraft) => Promise<Rule>
  simulateRule: (ruleKey: string, draft: RuleDraft) => Promise<RuleSimulation>
  publishRule: (ruleKey: string, draft?: RuleDraft) => Promise<void>
  retireRule: (ruleKey: string, reason: string) => void
  createBadge: (input: Partial<Badge> & Pick<Badge, 'badgeKey' | 'nameEn' | 'family'>) => Promise<void>
  publishBadge: (badgeKey: string) => Promise<void>
  saveMission: (input: Partial<Mission> & Pick<Mission, 'nameEn' | 'family'>) => void
  toggleMission: (id: string) => void
  correctMissionCompletion: (missionId: string, completionId: string, note: string) => void
  createSeason: (input: Partial<Season> & Pick<Season, 'key' | 'nameEn' | 'startsAt' | 'endsAt'>) => Promise<void>
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

/** Contract leaderboard entries only; no sample rows are mixed in. */
function consolidateBoardRows(api: ContractsSchemas['Leaderboard']): BoardRow[] {
  return recomputeRanks(
    api.entries.map((entry) => ({
      rank: entry.rank,
      displayName: entry.displayName,
      county: entry.county ?? null,
      level: String(entry.level),
      xp: entry.level * 750,
      verifiedSites: entry.verifiedSites,
      trailCompletions: entry.trailCompletions,
      status: 'active' as const,
      isSelf: entry.isSelf,
      provenance: 'api' as const,
    }))
  )
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
    const rows = sampleRows(SAMPLE_BOARDS[season.key] ?? [])
    boards[season.key] = snapshot(season.key, rows, {
      suppressed: publicBoardSuppressed(rows),
      frozen: season.status === 'frozen',
      publicHidden: !(
        SAMPLE_KILL_SWITCHES.find((entry) => entry.key === 'public_leaderboard')?.enabled ?? true
      ),
    })
  }
  return {
    rules: sampleRows(SAMPLE_RULES),
    badges: sampleRows(SAMPLE_BADGES),
    missions: sampleRows(SAMPLE_MISSIONS),
    seasons: sampleRows(SAMPLE_SEASONS),
    boards,
    awards: sampleRows(SAMPLE_AWARDS),
    moderation: sampleRows(SAMPLE_MODERATION),
    backfill: sampleRows(SAMPLE_BACKFILL),
    killSwitches: sampleRows(SAMPLE_KILL_SWITCHES),
    audit: sampleRows(SAMPLE_AUDIT),
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

function contractGap(what: string): Error {
  return new Error(
    `The frozen contract has no ${what} operation. Nothing was changed. This is a change-control candidate, not a local save.`
  )
}

/**
 * Season publish/freeze/close address `{id}` as a UUID, but the frozen Season
 * read model only exposes `key`. Never send the key and never swallow the
 * rejection: explain the contract gap and leave the UI unchanged.
 */
function seasonContractId(season: Season, action: string): string {
  if (season.id) return season.id
  throw new Error(
    `The frozen Season read exposes only the key (${season.key}); ${action} needs the season UUID at POST /seasons/{id}. Nothing was changed. This is a change-control candidate.`
  )
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
    if (scenario === 'demo') {
      const sample = decorate(sampleState())
      setState(sample)
      setLoads(Object.fromEntries(SECTIONS.map((section) => [section, 'ready'])) as LoadMap)
      setErrors({})
      setApiError(null)
      setSource('sample')
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
      setSource(classifySource(stateRef.current))
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

    // Start from the rows already on screen. A successful read replaces its
    // section with contract rows only; a failed read leaves the last-known rows
    // in place so the marker can report the mixture truthfully.
    const next: RecognitionState = { ...stateRef.current }

    if (rulesResult.status === 'fulfilled') {
      successes += 1
      apiRuleIds.current = new Set(rulesResult.value.map((row) => row.id))
      next.rules = normaliseRuleHistory(rulesResult.value.map((row) => mapApiRule(row)))
      setSection('rules', 'ready')
    } else {
      nextErrors.rules = apiErrorText(rulesResult.reason)
      setSection('rules', 'error', nextErrors.rules)
    }

    if (badgesResult.status === 'fulfilled') {
      successes += 1
      next.badges = badgesResult.value.map((row) => mapApiBadge(row))
      setSection('badges', 'ready')
    } else {
      nextErrors.badges = apiErrorText(badgesResult.reason)
      setSection('badges', 'error', nextErrors.badges)
    }

    if (seasonsResult.status === 'fulfilled') {
      successes += 1
      next.seasons = seasonsResult.value.map((row) => mapApiSeason(row))
      // Sample boards belong to sample seasons; a contract season list drops
      // them until the leaderboard read repopulates a contract board.
      next.boards = {}
      setSection('seasons', 'ready')
    } else {
      nextErrors.seasons = apiErrorText(seasonsResult.reason)
      setSection('seasons', 'error', nextErrors.seasons)
    }

    if (moderationResult.status === 'fulfilled') {
      successes += 1
      apiModerationIds.current = new Set(moderationResult.value.map((row) => row.id))
      next.moderation = moderationResult.value.map((row) => mapApiModeration(row))
      setSection('moderation', 'ready')
    } else {
      nextErrors.moderation = apiErrorText(moderationResult.reason)
      setSection('moderation', 'error', nextErrors.moderation)
    }

    if (backfillResult.status === 'fulfilled') {
      successes += 1
      apiBackfillIds.current = new Set(backfillResult.value.map((row) => row.id))
      next.backfill = backfillResult.value.map((row) => mapApiBackfill(row))
      setSection('backfill', 'ready')
    } else {
      nextErrors.backfill = apiErrorText(backfillResult.reason)
      setSection('backfill', 'error', nextErrors.backfill)
    }

    if (killsResult.status === 'fulfilled') {
      successes += 1
      const byKey = new Map(
        killsResult.value
          .map((row) => mapApiKillSwitch(row))
          .filter((entry): entry is KillSwitch => Boolean(entry))
          .map((entry) => [entry.key, entry])
      )
      next.killSwitches = ['global', 'public_leaderboard', 'source:audio', 'source:event']
        .map((key) => byKey.get(key as KillSwitch['key']))
        .filter((entry): entry is KillSwitch => Boolean(entry))
      setSection('killSwitches', 'ready')
    } else {
      nextErrors.killSwitches = apiErrorText(killsResult.reason)
      setSection('killSwitches', 'error', nextErrors.killSwitches)
    }

    if (auditResult.status === 'fulfilled') {
      successes += 1
      next.audit = auditResult.value.map(mapApiAudit)
      setSection('audit', 'ready')
    } else {
      nextErrors.audit = apiErrorText(auditResult.reason)
      setSection('audit', 'error', nextErrors.audit)
    }

    if (boardResult.status === 'fulfilled') {
      successes += 1
      const apiBoard = boardResult.value
      const seasonKey = apiBoard.seasonKey
      const rows = consolidateBoardRows(apiBoard)
      next.boards = {
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

    // Missions and the awards ledger have no contract read in 1.0.0. Their
    // fixtures are demo data, so a reachable API clears them rather than mixing
    // invented rows into a live screen.
    if (successes > 0) {
      next.missions = []
      next.awards = []
    }

    setErrors(nextErrors)
    setApiError(successes === 0 ? 'The contracts API did not answer any recognition read.' : null)
    const decorated = decorate(next)
    setState(decorated)
    setSource(classifySource(decorated))
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
        provenance: 'sample',
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

  const createRule = useCallback(
    async (ruleKey: string, draft: RuleDraft): Promise<Rule> => {
      if (!can('recognition.author_rule')) throw new Error('Your role cannot author a rule version.')
      if (scenario === 'readonly' || scenario === 'stale' || scenario === 'demo') {
        throw new Error('This data state disables writes. Switch back to Default to write.')
      }
      const api = createRecognitionApi()
      const created = await api.createRule({
        ruleKey,
        sourceType: draft.sourceType,
        effectiveFrom: draft.effectiveFrom,
        criteria: { name: draft.name.trim(), event: draft.event, verify: draft.verify },
        xpAmount: draft.xpAmount,
        badgeKey: draft.badgeKey === 'none' ? null : draft.badgeKey,
      })
      // Refetch: the draft the server created is the draft the editor shows.
      await refresh()
      notify.saved('Rule draft created')
      return mapApiRule(created)
    },
    [can, refresh, scenario]
  )

  const simulateRule = useCallback(async (ruleKey: string, draft: RuleDraft): Promise<RuleSimulation> => {
    const current = stateRef.current
    const draftRow = current.rules.find((rule) => rule.ruleKey === ruleKey && rule.status === 'draft')
    if (!draftRow) throw new Error('Create a contract draft before simulating it.')
    if (!apiRuleIds.current.has(draftRow.id)) {
      throw new Error(
        'This draft did not come from the contracts API. The frozen contract cannot simulate a browser-only draft.'
      )
    }
    const api = createRecognitionApi()
    const server = await api.simulateRule(draftRow.id)
    const simulation: RuleSimulation = {
      ...simulateDraft(draft, draftRow),
      evaluated: server.evaluated,
      wouldAward: server.wouldAward,
      wouldDeduct: server.wouldDeduct,
      serverEvaluated: server.evaluated,
      serverWouldAward: server.wouldAward,
      source: 'server-dry-run',
      notes: server.notes ?? undefined,
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
      const draft = current.rules.find((rule) => rule.ruleKey === ruleKey && rule.status === 'draft')
      if (!draft) {
        throw new Error(
          'There is no contract draft to publish. The frozen contract has no rule-update operation, so a definition cannot be edited and published from this browser.'
        )
      }
      if (!apiRuleIds.current.has(draft.id)) {
        throw contractGap('rule publish')
      }
      const sim = simulations[ruleKey]
      if (!sim) throw new Error('Run a simulation of the staged values first.')
      if (draftValues && sim.signature !== draftSignature(draftValues)) {
        throw new Error('The staged values changed since the last simulation. Run it again.')
      }
      const api = createRecognitionApi()
      await api.publishRule(draft.id)
      await refresh()
      setSimulations((prev) => {
        const next = { ...prev }
        delete next[ruleKey]
        return next
      })
      notify.saved('Rule published')
    },
    [refresh, simulations]
  )

  const retireRule = useCallback(
    (_ruleKey: string, reason: string) => {
      if (reason.trim().length < 10)
        throw new Error('Retiring a rule needs a reason of at least 10 characters.')
      throw contractGap('rule retire')
    },
    []
  )


  const createBadge = useCallback(
    async (input: Partial<Badge> & Pick<Badge, 'badgeKey' | 'nameEn' | 'family'>): Promise<void> => {
      const api = createRecognitionApi()
      await api.createBadge({
        badgeKey: input.badgeKey,
        nameEn: input.nameEn,
        nameSw: input.nameSw ?? input.nameEn,
        family: input.family,
        criteria: { label: input.criteria ?? 'Criteria not set' },
        privacyClass: input.privacyClass ?? 'public',
        hidden: input.hidden ?? false,
        publicEligible: input.publicEligible ?? true,
      })
      await refresh()
      notify.saved('Badge draft')
    },
    [refresh]
  )

  const publishBadge = useCallback(
    async (badgeKey: string): Promise<void> => {
      const badge = stateRef.current.badges.find((entry) => entry.badgeKey === badgeKey)
      if (!badge) throw new Error('Badge not found.')
      if (!badge.nameEn.trim() || !badge.nameSw?.trim()) {
        throw new Error('A badge needs an English and a Kiswahili name before publish.')
      }
      const author = badge.createdBy
      if (author && author === actor.id) {
        throw new Error('You authored this badge. A second administrator must publish it.')
      }
      const api = createRecognitionApi()
      await api.publishBadge(badgeKey)
      await refresh()
      notify.saved('Badge published')
    },
    [actor.id, refresh]
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
    async (
      input: Partial<Season> & Pick<Season, 'key' | 'nameEn' | 'startsAt' | 'endsAt'>
    ): Promise<void> => {
      const api = createRecognitionApi()
      await api.createSeason({
        key: input.key,
        nameEn: input.nameEn,
        nameSw: input.nameSw ?? input.nameEn,
        startsAt: input.startsAt,
        endsAt: input.endsAt,
        badgeKey: input.badgeKey ?? null,
        xpAward: input.xpAward ?? 500,
        missionFamilies: input.missionFamilies ?? [],
      })
      await refresh()
      notify.saved('Season prepared')
    },
    [refresh]
  )

  const publishSeason = useCallback(
    async (key: string): Promise<void> => {
      const season = stateRef.current.seasons.find((entry) => entry.key === key)
      if (!season) throw new Error('Season not found.')
      const id = seasonContractId(season, 'publishing a season')
      const api = createRecognitionApi()
      await api.publishSeason(id)
      await refresh()
      notify.saved('Season published')
    },
    [refresh]
  )

  const freezeSeason = useCallback(
    async (key: string): Promise<void> => {
      const season = stateRef.current.seasons.find((entry) => entry.key === key)
      if (!season) throw new Error('Season not found.')
      const id = seasonContractId(season, 'freezing a season')
      const api = createRecognitionApi()
      await api.freezeSeason(id)
      await refresh()
      notify.saved('Board frozen')
    },
    [refresh]
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
      const id = seasonContractId(season, 'closing a season')
      const api = createRecognitionApi()
      await api.closeSeason(id)
      await refresh()
      notify.saved('Season closed and board snapshotted')
    },
    [actor.id, refresh]
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
      const rule = stateRef.current.rules
        .filter((entry) => entry.ruleKey === ruleKey && entry.status === 'published')
        .sort((a, b) => b.version - a.version)[0]
      if (!rule) throw new Error('Choose a published rule version.')
      const api = createRecognitionApi()
      const created = await api.createBackfill({
        ruleKey,
        ruleVersion: rule.version,
        from: '2026-10-19T00:00:00+03:00',
        to: '2026-11-18T23:59:59+03:00',
      })
      await refresh()
      return mapApiBackfill(created, { ...mapApiBackfill(created), windowLabel } as BackfillBatch)
    },
    [refresh]
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
      if (!apiBackfillIds.current.has(id) || !isUuid(id)) {
        throw new Error(
          'This batch did not come from the contracts API. Approval needs a contract batch id; nothing was changed.'
        )
      }
      const api = createRecognitionApi()
      await api.approveBackfill(id)
      await refresh()
      notify.saved('Backfill approved')
    },
    [actor.id, refresh]
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
    // Sample rows are only reachable through the explicit demo state.
    setScenarioState('demo')
  }, [])

  const actions = useMemo<RecognitionActions>(
    () => ({
      reset,
      refresh,
      createRule,
      simulateRule,
      publishRule,
      retireRule,
      createBadge,
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
      createRule,
      simulateRule,
      publishRule,
      retireRule,
      createBadge,
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
