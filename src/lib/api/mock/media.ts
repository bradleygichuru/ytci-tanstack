import type { Paginated, PaginationParams } from '../types'
import type { MockRegistry } from './index'

interface MediaItem {
  id: string
  url: string
  thumbnailUrl: string
  altText: string
  caption: string
  credit: string
  type: 'image' | 'video' | 'audio'
  status: 'uploading' | 'processing' | 'ready' | 'failed'
  createdAt: string
}

interface ModerationItem {
  id: string
  storyId: string
  creatorEmail: string
  caption: string
  mediaType: string
  status: 'pending' | 'approved' | 'rejected'
  submittedAt: string
  moderatorNote?: string
}

const mediaStore: MediaItem[] = [
  {
    id: 'media-1',
    url: 'https://r2.example.com/media/mara-hero.jpg',
    thumbnailUrl: 'https://r2.example.com/media/thumbs/mara-hero.jpg',
    altText: 'Sunset over Maasai Mara',
    caption: 'Golden hour in the Mara',
    credit: 'Photo by Jane Doe',
    type: 'image',
    status: 'ready',
    createdAt: '2025-06-10T00:00:00Z',
  },
]

const modStore: ModerationItem[] = [
  {
    id: 'mod-1',
    storyId: 'story-1',
    creatorEmail: 'creator@example.com',
    caption: 'Amazing safari experience!',
    mediaType: 'image',
    status: 'pending',
    submittedAt: '2025-06-12T00:00:00Z',
  },
]

let nextMediaId = mediaStore.length + 1
let nextModId = modStore.length + 1

const handlers: MockRegistry = {
  list(params?: PaginationParams): Paginated<ModerationItem> {
    if (params?.cursor === 'moderation') return { items: modStore, nextCursor: null, hasMore: false }
    return { items: mediaStore, nextCursor: null, hasMore: false }
  },
  get(id: string) {
    return [...mediaStore, ...modStore].find(m => m.id === id) ?? modStore[0]
  },
  create(body: unknown) {
    const input = body as Partial<MediaItem>
    const now = new Date().toISOString()
    const item: MediaItem = {
      id: `media-${nextMediaId++}`,
      url: input.url ?? 'https://r2.example.com/media/upload.jpg',
      thumbnailUrl: input.thumbnailUrl ?? 'https://r2.example.com/media/thumbs/upload.jpg',
      altText: input.altText ?? '',
      caption: input.caption ?? '',
      credit: input.credit ?? '',
      type: (input.type as MediaItem['type']) ?? 'image',
      status: 'processing',
      createdAt: now,
    }
    mediaStore.push(item)
    return item
  },
  update(id: string, patch: unknown) {
    const i = mediaStore.findIndex(m => m.id === id)
    if (i !== -1) mediaStore[i] = { ...mediaStore[i], ...(patch as object) } as MediaItem
    const j = modStore.findIndex(m => m.id === id)
    if (j !== -1) modStore[j] = { ...modStore[j], ...(patch as object) } as ModerationItem
    return mediaStore[i] ?? modStore[j] ?? {}
  },
  remove(id: string) {
    const i = mediaStore.findIndex(m => m.id === id)
    if (i !== -1) mediaStore.splice(i, 1)
    const j = modStore.findIndex(m => m.id === id)
    if (j !== -1) modStore.splice(j, 1)
  },
}

export default handlers
