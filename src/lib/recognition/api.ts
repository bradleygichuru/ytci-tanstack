/**
 * Typed reads and writes for the recognition admin contracts.
 *
 * The mock under `cmd/contracts-mock` implements every path here. Feature code
 * never builds its own fetch wrapper: this module owns the mapping from the
 * frozen envelope to the operator read models.
 */
import {
  createContractsClient,
  isStale,
  unwrap,
  type ContractsSchemas,
  type FixtureState,
} from '#/lib/contracts/client'
import type { KillSwitchKey } from './types'

export interface RecognitionApi {
  listRules: () => Promise<ContractsSchemas['RecognitionRule'][]>
  createRule: (body: ContractsSchemas['RecognitionRuleWrite']) => Promise<ContractsSchemas['RecognitionRule']>
  publishRule: (id: string) => Promise<ContractsSchemas['RecognitionRule']>
  simulateRule: (id: string, body?: { from?: string; to?: string }) => Promise<ContractsSchemas['RuleSimulation']>
  listBadges: () => Promise<ContractsSchemas['BadgeDefinition'][]>
  createBadge: (body: ContractsSchemas['BadgeDefinitionWrite']) => Promise<ContractsSchemas['BadgeDefinition']>
  publishBadge: (key: string) => Promise<ContractsSchemas['BadgeDefinition']>
  listSeasons: () => Promise<ContractsSchemas['Season'][]>
  createSeason: (body: ContractsSchemas['SeasonWrite']) => Promise<ContractsSchemas['Season']>
  publishSeason: (id: string) => Promise<ContractsSchemas['Season']>
  freezeSeason: (id: string) => Promise<ContractsSchemas['Season']>
  closeSeason: (id: string) => Promise<ContractsSchemas['Season']>
  listModeration: (status?: 'open' | 'triaged' | 'decided' | 'appealed' | 'closed') => Promise<ContractsSchemas['ModerationCase'][]>
  decideModeration: (
    id: string,
    body: { decision: 'warn' | 'disqualify' | 'rename' | 'dismiss' | 'revoke'; reason: string },
  ) => Promise<ContractsSchemas['ModerationCase']>
  listBackfill: () => Promise<ContractsSchemas['BackfillBatch'][]>
  createBackfill: (body: {
    ruleKey: string
    ruleVersion: number
    from: string
    to: string
  }) => Promise<ContractsSchemas['BackfillBatch']>
  approveBackfill: (id: string) => Promise<ContractsSchemas['BackfillBatch']>
  createAdjustment: (body: {
    subjectRef: string
    amount: number
    reason: 'adjustment' | 'reversal'
    note: string
    compensatingFor?: string | null
  }) => Promise<ContractsSchemas['XpEntry']>
  listKillSwitches: () => Promise<ContractsSchemas['KillSwitch'][]>
  setKillSwitch: (key: KillSwitchKey, body: { enabled: boolean; reason: string }) => Promise<ContractsSchemas['KillSwitch']>
  listAudit: () => Promise<ContractsSchemas['AuditEntry'][]>
  getLeaderboard: (seasonKey?: string) => Promise<ContractsSchemas['Leaderboard']>
  stale: (response: Response) => boolean
}

export function createRecognitionApi(options: { fixtureState?: FixtureState } = {}): RecognitionApi {
  const client = createContractsClient({ fixtureState: options.fixtureState })

  return {
    async listRules() {
      const data = unwrap(await client.GET('/v1/admin/recognition/rules')) as { items: ContractsSchemas['RecognitionRule'][] }
      return data.items ?? []
    },
    async createRule(body) {
      return unwrap(await client.POST('/v1/admin/recognition/rules', { body })) as ContractsSchemas['RecognitionRule']
    },
    async publishRule(id) {
      return unwrap(
        await client.POST('/v1/admin/recognition/rules/{id}/publish', { params: { path: { id } } }),
      ) as ContractsSchemas['RecognitionRule']
    },
    async simulateRule(id, body) {
      return unwrap(
        await client.POST('/v1/admin/recognition/rules/{id}/simulate', {
          params: { path: { id } },
          body: body ?? {},
        }),
      ) as ContractsSchemas['RuleSimulation']
    },
    async listBadges() {
      const data = unwrap(await client.GET('/v1/admin/recognition/badges')) as { items: ContractsSchemas['BadgeDefinition'][] }
      return data.items ?? []
    },
    async createBadge(body) {
      return unwrap(await client.POST('/v1/admin/recognition/badges', { body })) as ContractsSchemas['BadgeDefinition']
    },
    async publishBadge(key) {
      return unwrap(
        await client.POST('/v1/admin/recognition/badges/{key}/publish', { params: { path: { key } } }),
      ) as ContractsSchemas['BadgeDefinition']
    },
    async listSeasons() {
      const data = unwrap(await client.GET('/v1/admin/recognition/seasons')) as { items: ContractsSchemas['Season'][] }
      return data.items ?? []
    },
    async createSeason(body) {
      return unwrap(await client.POST('/v1/admin/recognition/seasons', { body })) as ContractsSchemas['Season']
    },
    async publishSeason(id) {
      return unwrap(
        await client.POST('/v1/admin/recognition/seasons/{id}/publish', { params: { path: { id } } }),
      ) as ContractsSchemas['Season']
    },
    async freezeSeason(id) {
      return unwrap(
        await client.POST('/v1/admin/recognition/seasons/{id}/freeze', { params: { path: { id } } }),
      ) as ContractsSchemas['Season']
    },
    async closeSeason(id) {
      return unwrap(
        await client.POST('/v1/admin/recognition/seasons/{id}/close', { params: { path: { id } } }),
      ) as ContractsSchemas['Season']
    },
    async listModeration(status) {
      const data = unwrap(
        await client.GET('/v1/admin/recognition/moderation', {
          params: status ? { query: { status } } : undefined,
        }),
      ) as { items: ContractsSchemas['ModerationCase'][] }
      return data.items ?? []
    },
    async decideModeration(id, body) {
      return unwrap(
        await client.POST('/v1/admin/recognition/moderation/{id}/decision', {
          params: { path: { id } },
          body,
        }),
      ) as ContractsSchemas['ModerationCase']
    },
    async listBackfill() {
      const data = unwrap(await client.GET('/v1/admin/recognition/backfill')) as { items: ContractsSchemas['BackfillBatch'][] }
      return data.items ?? []
    },
    async createBackfill(body) {
      return unwrap(await client.POST('/v1/admin/recognition/backfill', { body })) as ContractsSchemas['BackfillBatch']
    },
    async approveBackfill(id) {
      return unwrap(
        await client.POST('/v1/admin/recognition/backfill/{id}/approve', { params: { path: { id } } }),
      ) as ContractsSchemas['BackfillBatch']
    },
    async createAdjustment(body) {
      return unwrap(await client.POST('/v1/admin/recognition/adjustments', { body })) as ContractsSchemas['XpEntry']
    },
    async listKillSwitches() {
      const data = unwrap(await client.GET('/v1/admin/recognition/kill-switches')) as { items: ContractsSchemas['KillSwitch'][] }
      return data.items ?? []
    },
    async setKillSwitch(key, body) {
      return unwrap(
        await client.PATCH('/v1/admin/recognition/kill-switches/{key}', {
          params: { path: { key } },
          body,
        }),
      ) as ContractsSchemas['KillSwitch']
    },
    async listAudit() {
      const data = unwrap(await client.GET('/v1/admin/recognition/audit')) as { items: ContractsSchemas['AuditEntry'][] }
      return data.items ?? []
    },
    async getLeaderboard(seasonKey) {
      return unwrap(
        await client.GET('/v1/public/leaderboard', {
          params: { query: { seasonKey: seasonKey ?? '' } },
        }),
      ) as ContractsSchemas['Leaderboard']
    },
    stale: isStale,
  }
}
