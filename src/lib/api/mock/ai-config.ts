import type { Paginated, PaginationParams } from '../types'
import type { MockRegistry } from './index'

interface AiConfig {
  rateLimitPerMinute: number
  tokenBudgetPerHour: number
  fallbackEnabled: boolean
  modelTemperature: number
  maxTokens: number
  guardrailBlockedTopics: string[]
}

const config: AiConfig = {
  rateLimitPerMinute: 30,
  tokenBudgetPerHour: 100000,
  fallbackEnabled: true,
  modelTemperature: 0.7,
  maxTokens: 2048,
  guardrailBlockedTopics: ['illegal_activities', 'explicit_content', 'misinformation'],
}

const handlers: MockRegistry = {
  list(): Paginated<AiConfig> {
    return { items: [config], nextCursor: null, hasMore: false }
  },
  get(): AiConfig {
    return config
  },
  create(body: unknown) {
    Object.assign(config, body as object)
    return config
  },
  update(_id: string, patch: unknown) {
    Object.assign(config, patch as object)
    return config
  },
  remove() {},
}

export default handlers
