/**
 * Recognition admin read models.
 *
 * The frozen contracts describe rules, badge definitions, seasons, moderation,
 * backfill, adjustments, kill switches and audit. The operator surfaces also
 * need richer rows (XP per leaderboard entry, award delivery state, mission
 * completions). Those live here as derived/operator-overlay models and are
 * reconciled with the contract objects in `store.tsx`.
 */

export type Scenario = 'default' | 'empty' | 'loading' | 'error' | 'stale' | 'readonly'

export type LoadState = 'idle' | 'loading' | 'ready' | 'error'

export type RuleStatus = 'draft' | 'published' | 'retired'

export type RecognitionSection =
  'rules' | 'badges' | 'seasons' | 'moderation' | 'backfill' | 'killSwitches' | 'audit' | 'leaderboard'

export type RecognitionSource = 'event' | 'heritage_visit' | 'audio_story' | 'trail' | 'community_story'

export interface Rule {
  id: string
  ruleKey: string
  version: number
  name: string
  status: RuleStatus
  sourceType: RecognitionSource
  /** Event contract name, never free text. */
  event: string
  verify: string
  xpAmount: number
  badgeKey: string | null
  effectiveFrom: string
  effectiveTo: string | null
  createdBy: string
  publishedBy: string | null
  updatedAt: string
  /** Which window the rule version governs; caps come from the event contract. */
  weeklyCap: number | null
}

export interface RuleDraft {
  name: string
  sourceType: RecognitionSource
  event: string
  verify: string
  xpAmount: number
  badgeKey: string
  effectiveFrom: string
}

export interface RuleSimulation {
  ruleKey: string
  draftVersion: number
  evaluated: number
  wouldAward: number
  wouldDeduct: number
  xpTotal: number
  badgeAwards: number
  duplicates: number
  cappedAwards: number
  windowLabel: string
  at: string
  serverEvaluated?: number
  serverWouldAward?: number
  source: 'staged-estimate' | 'server-dry-run'
  notes?: string
}

export type BadgeStatus = 'draft' | 'published' | 'retired'

export interface Badge {
  badgeKey: string
  nameEn: string
  nameSw: string | null
  family: string
  criteria: string
  privacyClass: 'private' | 'public' | 'sensitive'
  hidden: boolean
  publicEligible: boolean
  status: BadgeStatus
  version: number
  updatedAt: string
  /** Author of the draft; a second administrator must publish it. */
  createdBy?: string
  /** Edits to a published badge stay staged until a second approver publishes. */
  pendingChanges?: Partial<
    Pick<Badge, 'nameEn' | 'nameSw' | 'criteria' | 'family' | 'privacyClass' | 'hidden' | 'publicEligible'>
  >
  pendingBy?: string
  /** Derived from rules and missions that reference the badge. */
  usedBy: number
}

export type MissionStatus = 'active' | 'paused'

export interface MissionCompletion {
  id: string
  reader: string
  completedAt: string
  status: 'credited' | 'corrected'
  note?: string
}

export interface Mission {
  id: string
  trackKey: string
  family: string
  nameEn: string
  nameSw: string
  condition: string
  xpReward: number
  badgeKey: string
  status: MissionStatus
  target: number
  completions: number
  completionsLedger: MissionCompletion[]
}

export type SeasonStatus = 'upcoming' | 'active' | 'frozen' | 'closed'

export interface Season {
  key: string
  nameEn: string
  nameSw: string
  startsAt: string
  endsAt: string
  status: SeasonStatus
  badgeKey: string | null
  xpAward: number
  missionFamilies: string[]
  boardSize: number
  preparedBy: string
  closedAt: string | null
  closedBy: string | null
}

export type BoardRowStatus = 'active' | 'retracted'

export interface BoardRow {
  rank: number
  displayName: string
  county: string | null
  level: string
  xp: number
  verifiedSites: number
  trailCompletions: number
  status: BoardRowStatus
  isSelf?: boolean
  retractedReason?: string
  retractedBy?: string
  retractedAt?: string
}

export interface LeaderboardSnapshot {
  seasonKey: string
  suppressed: boolean
  suppressionReason: string | null
  updatedAt: string
  rankingNote: string
  publicHidden: boolean
  frozen: boolean
  rows: BoardRow[]
}

export type AwardStatus = 'failed' | 'queued' | 'delivered' | 'suppressed'

export type AwardCause =
  | 'outbox_retry_exhausted'
  | 'profile_locked'
  | 'duplicate_suppressed'
  | 'weekly_cap'
  | 'pending_outbox'
  | 'none'

export interface AwardCorrection {
  action: 'credit' | 'reversal'
  supportRef: string
  note: string
  by: string
  at: string
}

export interface Award {
  id: string
  reader: string
  ruleKey: string
  ruleVersion: number
  xp: number
  event: string
  status: AwardStatus
  attempts: number
  at: string
  cause: AwardCause
  corrected?: AwardCorrection
}

export type ModerationKind = 'display_name' | 'leaderboard_cheat' | 'leaderboard_report' | 'event_report'

export type ModerationStatus = 'open' | 'triaged' | 'decided' | 'appealed' | 'closed'

export type ModerationDecision = 'none' | 'warn' | 'disqualify' | 'rename' | 'dismiss' | 'revoke'

export interface ModerationCase {
  id: string
  kind: ModerationKind
  subject: string
  subjectRef: string | null
  reason: string
  reporter: string
  evidence: string
  status: ModerationStatus
  decision: ModerationDecision
  decidedAt: string | null
  resolution: string | null
  createdAt: string
}

export type BackfillStatus =
  'dry_run' | 'requested' | 'approved' | 'running' | 'completed' | 'failed' | 'withdrawn'

export interface BackfillRow {
  id: string
  reader: string
  event: string
  xp: number
  versionAtEvent: string
  include: boolean
}

export interface BackfillBatch {
  id: string
  ruleKey: string
  ruleVersion: number
  windowLabel: string
  from: string
  to: string
  status: BackfillStatus
  scanned: number
  unit: string
  rows: BackfillRow[]
  requestedBy: string
  approvedBy: string | null
  createdAt: string
  approvedAt: string | null
  note?: string
}

export type KillSwitchKey = 'global' | 'public_leaderboard' | 'source:event' | 'source:audio'

export interface KillSwitch {
  key: KillSwitchKey
  label: string
  description: string
  /** What turning this switch off stops. */
  blocks: string
  enabled: boolean
  reason: string | null
  updatedBy: string | null
  updatedAt: string
}

export type AuditCategory = 'awards' | 'events' | 'safety' | 'moderation' | 'system' | 'rules'

export interface AuditEntry {
  id: string
  actor: string
  role: string
  action: string
  entity: string
  detail: string
  category: AuditCategory
  at: string
}

export interface RecognitionState {
  rules: Rule[]
  badges: Badge[]
  missions: Mission[]
  seasons: Season[]
  boards: Record<string, LeaderboardSnapshot>
  awards: Award[]
  moderation: ModerationCase[]
  backfill: BackfillBatch[]
  killSwitches: KillSwitch[]
  audit: AuditEntry[]
}
