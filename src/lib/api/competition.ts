import type { ApiConfig } from './client'
import { apiRequest } from './client'
import { ApiErrorResponse } from './types'

/**
 * Competition and award-programme admin client.
 *
 * The Go API mounts this surface at `/v1/admin/competition` behind
 * `competition.read`, with edit and publish gates per route group. No cash
 * prize concept exists here: Route B selects panel awards and a separate,
 * non-cash People's Choice recognition.
 */

export type EditionStatus =
  | 'draft'
  | 'consultation'
  | 'open'
  | 'judging'
  | 'voting'
  | 'closed'
  | 'published'

export type PromotionType = 'award_programme' | 'prize_competition' | 'licensed_operator'

export type PublicVoteMode = 'people_choice_only' | 'weighted' | 'none'

export type EligibilityStatus = 'pending' | 'eligible' | 'ineligible'

export type JudgeStatus = 'invited' | 'active' | 'recused' | 'inactive'

export type AssignmentStatus = 'assigned' | 'recused' | 'completed'

export type AwardType = 'category_winner' | 'overall' | 'people_choice'

export type AwardForm = 'grant' | 'commission' | 'certificate' | 'feature' | 'recognition'

export interface Edition {
  id: string
  slug: string
  name: string
  theme: string | null
  status: EditionStatus
  promotionType: PromotionType
  minAge: number | null
  maxAge: number | null
  publicVoteMode: PublicVoteMode
  prizeEnabled: boolean
  rulesVersion: string
  opensAt: string | null
  closesAt: string | null
  votingOpensAt: string | null
  votingClosesAt: string | null
  announcementAt: string | null
  createdAt: string
  updatedAt: string
}

export interface EditionDetail extends Edition {
  categories: Category[]
}

export interface Category {
  id: string
  editionId: string
  key: string
  label: string
  description: string | null
  sortOrder: number
}

export interface CompetitionEntry {
  id: string
  editionId: string
  categoryId: string
  categoryKey: string
  categoryLabel: string
  repositoryEntryId: string
  repositorySlug: string
  title: string
  leadUserId: string | null
  teamName: string | null
  teamMembers: unknown
  eligibilityStatus: EligibilityStatus
  eligibilityNote: string | null
  scoreCount: number
  voteCount: number
  createdAt: string
  updatedAt: string
}

export interface Judge {
  id: string
  editionId: string
  userId: string | null
  displayName: string
  email: string | null
  status: JudgeStatus
  createdAt: string
}

export interface Assignment {
  id: string
  editionId: string
  categoryId: string
  judgeId: string
  status: AssignmentStatus
  assignedAt: string
}

export interface Conflict {
  id: string
  judgeId: string
  entryId: string
  reason: string
  declaredAt: string
}

export interface Score {
  id: string
  assignmentId: string
  entryId: string
  judgeId: string
  relevance: number
  craft: number
  originality: number
  impact: number
  total: number
  notes: string | null
  lockedAt: string | null
  createdAt: string
  updatedAt: string
}

export interface VoteSummaryEntry {
  entryId: string
  title: string
  categoryKey: string
  liveVotes: number
  invalidVotes: number
}

export interface VoteSummary {
  entries: VoteSummaryEntry[]
  liveVotes: number
  invalidVotes: number
  distinctVoters: number
}

export interface ReviewCase {
  id: string
  editionId: string
  entryId: string | null
  signal: string
  status: string
  openedAt: string
  resolvedAt: string | null
  resolution: string | null
  reviewerId: string | null
}

export interface LedgerSnapshot {
  id: string
  editionId: string
  categoryId: string | null
  ledgerHash: string
  createdAt: string
  isFinal: boolean
  payload: unknown
}

export interface ResultEntry {
  rank: number
  entryId: string
  title: string
  expertScore: number
  scoreCount: number
  publicVotes: number
  publicScore: number
  finalScore: number
  isTie: boolean
}

export interface ResultCategory {
  category: Category
  entries: ResultEntry[]
}

export interface CompetitionResults {
  editionId: string
  status: EditionStatus
  publicVoteMode: PublicVoteMode
  frozen: boolean
  ledgerHash: string | null
  weights: { expert: number; public: number }
  categories: ResultCategory[]
  peopleChoice: { entryId: string; title: string; votes: number } | null
  awards: Award[]
}

export interface Award {
  id: string
  editionId: string
  categoryId: string | null
  entryId: string
  awardType: AwardType
  awardForm: AwardForm | null
  citation: string | null
  publishedAt: string | null
  createdAt: string
  title: string
  categoryKey: string | null
}

export interface ConsultationResponse {
  id: string
  editionId: string | null
  name: string | null
  email: string | null
  answers: unknown
  consent: boolean
  createdAt: string
}

export interface EditionInput {
  slug?: string
  name?: string
  theme?: string | null
  status?: EditionStatus
  promotionType?: PromotionType
  minAge?: number | null
  maxAge?: number | null
  publicVoteMode?: PublicVoteMode
  prizeEnabled?: boolean
  rulesVersion?: string
  opensAt?: string | null
  closesAt?: string | null
  votingOpensAt?: string | null
  votingClosesAt?: string | null
  announcementAt?: string | null
}

export interface CategoryInput {
  key?: string
  label?: string
  description?: string | null
  sortOrder?: number
}

export interface CompetitionEntryInput {
  repositoryEntryId?: string
  categoryId?: string
  leadUserId?: string | null
  teamName?: string | null
  eligibilityStatus?: EligibilityStatus
  eligibilityNote?: string | null
}

export interface JudgeInput {
  userId?: string | null
  displayName?: string
  email?: string | null
  status?: JudgeStatus
}

export interface AwardInput {
  categoryId?: string | null
  entryId?: string
  awardType?: AwardType
  awardForm?: AwardForm | null
  citation?: string | null
}

export interface ScoreInput {
  assignmentId: string
  entryId: string
  relevance: number
  craft: number
  originality: number
  impact: number
  notes?: string | null
}

interface ItemsResponse<T> {
  items: T[]
}

async function downloadCsv(config: ApiConfig, path: string): Promise<Blob> {
  const res = await fetch(`${config.baseUrl}${path}`, {
    headers: config.token ? { Authorization: `Bearer ${config.token}` } : undefined,
  })
  if (!res.ok) {
    const body = await res.json().catch(() => null)
    const error = body?.error ?? { code: 'UNKNOWN', message: res.statusText }
    throw new ApiErrorResponse(res.status, error.code, error.message, error.details, body)
  }
  return res.blob()
}

export function competitionApi(config: ApiConfig) {
  const base = '/v1/admin/competition'
  return {
    editions: {
      list: () => apiRequest<ItemsResponse<Edition>>(config, `${base}/editions`),
      get: (id: string) => apiRequest<EditionDetail>(config, `${base}/editions/${id}`),
      create: (body: EditionInput) =>
        apiRequest<Edition>(config, `${base}/editions`, { method: 'POST', body }),
      update: (id: string, patch: EditionInput) =>
        apiRequest<Edition>(config, `${base}/editions/${id}`, { method: 'PATCH', body: patch }),
      remove: (id: string) =>
        apiRequest<void>(config, `${base}/editions/${id}`, { method: 'DELETE' }),
    },
    categories: {
      list: (editionId: string) =>
        apiRequest<ItemsResponse<Category>>(config, `${base}/editions/${editionId}/categories`),
      create: (editionId: string, body: CategoryInput) =>
        apiRequest<Category>(config, `${base}/editions/${editionId}/categories`, {
          method: 'POST',
          body,
        }),
      update: (id: string, patch: CategoryInput) =>
        apiRequest<Category>(config, `${base}/categories/${id}`, { method: 'PATCH', body: patch }),
      remove: (id: string) =>
        apiRequest<void>(config, `${base}/categories/${id}`, { method: 'DELETE' }),
    },
    entries: {
      list: (editionId: string, params?: { category?: string; eligibility?: string }) =>
        apiRequest<ItemsResponse<CompetitionEntry>>(
          config,
          `${base}/editions/${editionId}/entries`,
          {
            params: {
              category: params?.category || undefined,
              eligibility: params?.eligibility || undefined,
            },
          },
        ),
      get: (id: string) => apiRequest<CompetitionEntry>(config, `${base}/entries/${id}`),
      create: (editionId: string, body: CompetitionEntryInput) =>
        apiRequest<CompetitionEntry>(config, `${base}/editions/${editionId}/entries`, {
          method: 'POST',
          body,
        }),
      update: (id: string, patch: CompetitionEntryInput) =>
        apiRequest<CompetitionEntry>(config, `${base}/entries/${id}`, {
          method: 'PATCH',
          body: patch,
        }),
      setEligibility: (id: string, status: EligibilityStatus, note?: string | null) =>
        apiRequest<CompetitionEntry>(config, `${base}/entries/${id}/eligibility`, {
          method: 'POST',
          body: { status, note: note ?? null },
        }),
      remove: (id: string) =>
        apiRequest<void>(config, `${base}/entries/${id}`, { method: 'DELETE' }),
    },
    judges: {
      list: (editionId: string) =>
        apiRequest<ItemsResponse<Judge>>(config, `${base}/editions/${editionId}/judges`),
      create: (editionId: string, body: JudgeInput) =>
        apiRequest<Judge>(config, `${base}/editions/${editionId}/judges`, {
          method: 'POST',
          body,
        }),
      update: (id: string, patch: JudgeInput) =>
        apiRequest<Judge>(config, `${base}/judges/${id}`, { method: 'PATCH', body: patch }),
      remove: (id: string) =>
        apiRequest<void>(config, `${base}/judges/${id}`, { method: 'DELETE' }),
    },
    assignments: {
      list: (editionId: string) =>
        apiRequest<ItemsResponse<Assignment>>(config, `${base}/editions/${editionId}/assignments`),
      create: (editionId: string, body: { categoryId: string; judgeId: string }) =>
        apiRequest<Assignment>(config, `${base}/editions/${editionId}/assignments`, {
          method: 'POST',
          body,
        }),
      update: (id: string, status: AssignmentStatus) =>
        apiRequest<Assignment>(config, `${base}/assignments/${id}`, {
          method: 'PATCH',
          body: { status },
        }),
      remove: (id: string) =>
        apiRequest<void>(config, `${base}/assignments/${id}`, { method: 'DELETE' }),
    },
    conflicts: {
      list: (editionId: string) =>
        apiRequest<ItemsResponse<Conflict>>(config, `${base}/editions/${editionId}/conflicts`),
      create: (editionId: string, body: { judgeId: string; entryId: string; reason: string }) =>
        apiRequest<Conflict>(config, `${base}/editions/${editionId}/conflicts`, {
          method: 'POST',
          body,
        }),
      remove: (id: string) =>
        apiRequest<void>(config, `${base}/conflicts/${id}`, { method: 'DELETE' }),
    },
    scores: {
      list: (editionId: string) =>
        apiRequest<ItemsResponse<Score>>(config, `${base}/editions/${editionId}/scores`),
      upsert: (body: ScoreInput) =>
        apiRequest<Score>(config, `${base}/scores`, { method: 'PUT', body }),
      lock: (
        editionId: string,
        body: { categoryId?: string | null; entryId?: string | null; lock: boolean },
      ) =>
        apiRequest<{ updated: number; locked: boolean }>(
          config,
          `${base}/editions/${editionId}/scores/lock`,
          { method: 'POST', body },
        ),
    },
    votes: {
      summary: (editionId: string) =>
        apiRequest<VoteSummary>(config, `${base}/editions/${editionId}/votes/summary`),
      invalidate: (voteId: string, reasonCode: string) =>
        apiRequest<unknown>(config, `${base}/votes/${voteId}/invalidate`, {
          method: 'POST',
          body: { reasonCode },
        }),
    },
    reviewCases: {
      list: (editionId: string, status?: string) =>
        apiRequest<ItemsResponse<ReviewCase>>(
          config,
          `${base}/editions/${editionId}/vote-review-cases`,
          { params: { status: status || undefined } },
        ),
      create: (editionId: string, body: { entryId?: string | null; signal: string }) =>
        apiRequest<ReviewCase>(config, `${base}/editions/${editionId}/vote-review-cases`, {
          method: 'POST',
          body,
        }),
      resolve: (caseId: string, status: 'resolved' | 'dismissed', resolution: string) =>
        apiRequest<ReviewCase>(config, `${base}/vote-review-cases/${caseId}/resolve`, {
          method: 'POST',
          body: { status, resolution },
        }),
    },
    results: {
      get: (editionId: string) =>
        apiRequest<CompetitionResults>(config, `${base}/editions/${editionId}/results`),
      freeze: (editionId: string) =>
        apiRequest<{ items: LedgerSnapshot[]; frozen: boolean }>(
          config,
          `${base}/editions/${editionId}/freeze`,
          { method: 'POST' },
        ),
      recount: (editionId: string) =>
        apiRequest<{ items: LedgerSnapshot[]; frozen: boolean }>(
          config,
          `${base}/editions/${editionId}/recount`,
          { method: 'POST' },
        ),
    },
    awards: {
      list: (editionId: string) =>
        apiRequest<ItemsResponse<Award>>(config, `${base}/editions/${editionId}/awards`),
      create: (editionId: string, body: AwardInput) =>
        apiRequest<Award>(config, `${base}/editions/${editionId}/awards`, {
          method: 'POST',
          body,
        }),
      update: (id: string, patch: Partial<AwardInput>) =>
        apiRequest<Award>(config, `${base}/awards/${id}`, { method: 'PATCH', body: patch }),
      publish: (id: string) =>
        apiRequest<Award>(config, `${base}/awards/${id}/publish`, { method: 'POST' }),
      remove: (id: string) =>
        apiRequest<void>(config, `${base}/awards/${id}`, { method: 'DELETE' }),
    },
    consultation: {
      list: (editionId: string, params?: { limit?: number; offset?: number }) =>
        apiRequest<ItemsResponse<ConsultationResponse>>(
          config,
          `${base}/editions/${editionId}/consultation-responses`,
          { params: { limit: params?.limit, offset: params?.offset } },
        ),
      exportCsv: (editionId: string) =>
        downloadCsv(config, `${base}/editions/${editionId}/consultation-responses/export`),
    },
  }
}
