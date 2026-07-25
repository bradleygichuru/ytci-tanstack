import type { AreaNamespace, Paginated, PaginationParams } from '../types'

export interface MockRegistry {
  list(params?: PaginationParams): Paginated<unknown>
  get(id: string): unknown
  create(body: unknown): unknown
  update(id: string, patch: unknown): unknown
  remove(id: string): void
}

const modules: Record<string, MockRegistry> = {}

export async function getMockArea(area: AreaNamespace): Promise<MockRegistry> {
  if (!modules[area]) {
    modules[area] = await loadArea(area)
  }
  return modules[area]
}

async function loadArea(area: AreaNamespace): Promise<MockRegistry> {
  try {
    switch (area) {
      case 'analytics': return (await import('./analytics')).default as MockRegistry
      case 'destinations': return (await import('./destinations')).default as MockRegistry
      case 'media':
      case 'stories': return (await import('./media')).default as MockRegistry
      case 'courses': return (await import('./lms')).default as MockRegistry
      case 'conservation': return (await import('./conservation')).default as MockRegistry
      case 'events': return (await import('./events')).default as MockRegistry
      case 'ai-config': return (await import('./ai-config')).default as MockRegistry
      case 'campaigns': return (await import('./campaigns')).default as MockRegistry
      case 'users': return (await import('./users')).default as MockRegistry
    }
  } catch {
    return createEmptyMock(area)
  }
}

function createEmptyMock(area: string): MockRegistry {
  return {
    list() { return { items: [], nextCursor: null, hasMore: false } },
    get() { throw new Error(`Mock: ${area} get not implemented`) },
    create(b: unknown) { return b },
    update(_: string, p: unknown) { return p },
    remove() {},
  }
}
