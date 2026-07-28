import type { Paginated } from './types'

export function safeItems<T>(paginated: Paginated<T> | undefined | null): T[] {
  return paginated?.items ?? []
}
