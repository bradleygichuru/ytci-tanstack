import type { Paginated, PaginationParams } from '../types'
import type { MockRegistry } from './index'

interface AiSource {
  id: string; name: string; url: string; type: 'database' | 'api' | 'document'; enabled: boolean
}

interface AiFeedback {
  id: string; query: string; rating: number; comment: string; reviewed: boolean; createdAt: string
}

interface AiConfigData {
  rateLimitPerMinute: number
  tokenBudgetPerHour: number
  fallbackEnabled: boolean
  modelTemperature: number
  maxTokens: number
  guardrailBlockedTopics: string[]
  guardrails: {
    noInventOpeningHours: boolean; noInventPrices: boolean; noInventSafety: boolean; noInventContacts: boolean
    showLastUpdate: boolean; noCheckoutLinks: boolean; protectSensitiveSites: boolean; protectUserData: boolean
    reportAnswerControl: boolean; deterministicFallback: boolean
  }
  approvedSources: AiSource[]
  feedback: AiFeedback[]
}

const data: AiConfigData = {
  rateLimitPerMinute: 30, tokenBudgetPerHour: 100000, fallbackEnabled: true, modelTemperature: 0.7, maxTokens: 2048,
  guardrailBlockedTopics: ['illegal_activities', 'explicit_content', 'misinformation', 'hate_speech', 'sexual_content'],
  guardrails: {
    noInventOpeningHours: true, noInventPrices: true, noInventSafety: true, noInventContacts: true,
    showLastUpdate: true, noCheckoutLinks: true, protectSensitiveSites: true, protectUserData: true,
    reportAnswerControl: true, deterministicFallback: true,
  },
  approvedSources: [
    { id: 'src-1', name: 'Kenya Tourism Database', url: 'https://db.kenyatourism.go.ke/v1', type: 'database', enabled: true },
    { id: 'src-2', name: 'KWS Wildlife Records', url: 'https://api.kws.go.ke/v2/wildlife', type: 'api', enabled: true },
    { id: 'src-3', name: 'UNESCO Heritage Sites', url: 'https://whc.unesco.org/api', type: 'api', enabled: false },
    { id: 'src-4', name: 'County Tourism Guides (PDF)', url: 'https://r2.example.com/guides/county-guides.pdf', type: 'document', enabled: true },
  ],
  feedback: [
    { id: 'fb-1', query: 'What is the best time to visit Maasai Mara?', rating: 5, comment: 'Perfect response with accurate dates and tips.', reviewed: true, createdAt: '2025-07-25T10:00:00Z' },
    { id: 'fb-2', query: 'How much does it cost to climb Mount Kenya?', rating: 3, comment: 'The price was roughly right but didn\'t mention park fees.', reviewed: false, createdAt: '2025-07-24T14:30:00Z' },
    { id: 'fb-3', query: 'Which hotels in Diani are eco-friendly?', rating: 2, comment: 'Listed a hotel that closed in 2024.', reviewed: false, createdAt: '2025-07-24T09:15:00Z' },
    { id: 'fb-4', query: 'Tell me about the Great Migration route', rating: 4, comment: 'Good general info but could include month-by-month breakdown.', reviewed: true, createdAt: '2025-07-23T16:45:00Z' },
    { id: 'fb-5', query: 'Are there any travel restrictions in Kenya?', rating: 1, comment: 'Gave outdated COVID information. Needs last-update date check.', reviewed: false, createdAt: '2025-07-23T08:00:00Z' },
  ],
}

const handlers: MockRegistry = {
  list(): Paginated<Record<string, unknown>> {
    return { items: [data], nextCursor: null, hasMore: false }
  },
  get() { return data },
  create(body: unknown) { Object.assign(data, body as object); return data },
  update(_id: string, patch: unknown) { Object.assign(data, patch as object); return data },
  remove() {},
}

export default handlers
