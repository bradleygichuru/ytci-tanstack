import type { Paginated, PaginationParams } from '../types'
import type { MockRegistry } from './index'

interface Course {
  id: string
  title: string
  description: string
  difficulty: 'beginner' | 'intermediate' | 'advanced'
  lessonCount: number
  status: 'draft' | 'published'
  createdAt: string
}

const store: Course[] = [
  {
    id: 'course-1',
    title: 'Introduction to Sustainable Tourism',
    description: 'Learn the fundamentals of sustainable tourism in Kenya.',
    difficulty: 'beginner',
    lessonCount: 5,
    status: 'published',
    createdAt: '2025-05-01T00:00:00Z',
  },
  {
    id: 'course-2',
    title: 'Wildlife Conservation Basics',
    description: 'Understand key conservation principles and Kenyan ecosystems.',
    difficulty: 'intermediate',
    lessonCount: 8,
    status: 'published',
    createdAt: '2025-05-10T00:00:00Z',
  },
]

let nextId = store.length + 1

const handlers: MockRegistry = {
  list(): Paginated<Course> {
    return { items: store, nextCursor: null, hasMore: false }
  },
  get(id: string) {
    return store.find(c => c.id === id) ?? store[0]
  },
  create(body: unknown) {
    const input = body as Partial<Course>
    const item: Course = {
      id: `course-${nextId++}`,
      title: input.title ?? '',
      description: input.description ?? '',
      difficulty: (input.difficulty as Course['difficulty']) ?? 'beginner',
      lessonCount: input.lessonCount ?? 0,
      status: 'draft',
      createdAt: new Date().toISOString(),
    }
    store.push(item)
    return item
  },
  update(id: string, patch: unknown) {
    const idx = store.findIndex(c => c.id === id)
    if (idx === -1) throw new Error('Not found')
    store[idx] = { ...store[idx], ...(patch as object) } as Course
    return store[idx]
  },
  remove(id: string) {
    const idx = store.findIndex(c => c.id === id)
    if (idx !== -1) store.splice(idx, 1)
  },
}

export default handlers
