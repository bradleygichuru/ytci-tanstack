import type { Paginated, PaginationParams } from '../types'
import type { MockRegistry } from './index'

interface ModerationItem {
  id: string; storyId: string; creatorHandle: string; creatorEmail: string
  caption: string; mediaType: string; mediaUrl: string; thumbUrl: string
  location: string; tags: string[]
  exifStripped: boolean; exifDetails: string
  status: 'pending' | 'approved' | 'rejected'
  submittedAt: string; moderatedBy?: string; moderatedAt?: string
  moderatorNote?: string; contentWarning?: string; takedownHistory?: { date: string; reason: string }[]
  reports: { reason: string; reporter: string; date: string }[]
}

interface MediaAsset {
  id: string; url: string; thumbnailUrl: string
  altText: string; caption: string; credit: string
  type: 'image' | 'video' | 'audio' | 'pdf' | '360'
  status: 'uploading' | 'processing' | 'ready' | 'failed'
  fileSize: number; compressionRatio: number; exifStripped: boolean
  rightsStatus: 'cleared' | 'pending' | 'restricted'
  tags: string[]; uploadedBy: string
  createdAt: string
}

interface OptimizationLog {
  id: string; timestamp: string; eventType: 'COMPRESSION' | 'EXIF' | 'INGEST' | 'ERROR'
  assetId: string; assetName: string; details: string
  compressionSavedKB?: number; exifStripped?: boolean
}

const modStore: ModerationItem[] = [
  { id: 'mod-1', storyId: 'story-1', creatorHandle: '@eco_traveler', creatorEmail: 'john@example.com', caption: 'Sharing my trip story with you all — first time in CR, absolute bucket list moment.', mediaType: 'image', mediaUrl: 'https://r2.example.com/media/story-1.jpg', thumbUrl: 'https://r2.example.com/media/thumbs/story-1.jpg', location: 'Nairobi', tags: ['wildlife', 'safari'], exifStripped: true, exifDetails: 'GPS coordinates removed', status: 'pending', submittedAt: '2025-07-26T10:00:00Z', reports: [] },
  { id: 'mod-2', storyId: 'story-2', creatorHandle: '@nomad_jess', creatorEmail: 'jess@example.com', caption: 'Possible protected wildlife found in this area. Click to learn more about this protected zone.', mediaType: 'video', mediaUrl: 'https://r2.example.com/media/story-2.mp4', thumbUrl: 'https://r2.example.com/media/thumbs/story-2.jpg', location: 'Diani Beach', tags: ['beach', 'conservation'], exifStripped: true, exifDetails: 'Location data removed', status: 'pending', submittedAt: '2025-07-25T14:00:00Z', reports: [{ reason: 'Misleading location', reporter: 'user@example.com', date: '2025-07-25T16:00:00Z' }] },
  { id: 'mod-3', storyId: 'story-3', creatorHandle: '@trail_runner', creatorEmail: 'alex@example.com', caption: 'Sunrise hike on the active ridge — breathtaking views and an unforgettable day.', mediaType: 'image', mediaUrl: 'https://r2.example.com/media/story-3.jpg', thumbUrl: 'https://r2.example.com/media/thumbs/story-3.jpg', location: 'Mount Kenya', tags: ['adventure', 'hiking'], exifStripped: false, exifDetails: 'EXIF data present — manual review required', status: 'approved', submittedAt: '2025-07-24T08:00:00Z', moderatedBy: 'admin@example.com', moderatedAt: '2025-07-24T10:00:00Z', reports: [] },
  { id: 'mod-4', storyId: 'story-4', creatorHandle: '@safari_kenya', creatorEmail: 'grace@example.com', caption: 'Wildebeest crossing at dawn — full herd in motion. Truly a sight to behold.', mediaType: 'video', mediaUrl: 'https://r2.example.com/media/story-4.mp4', thumbUrl: 'https://r2.example.com/media/thumbs/story-4.jpg', location: 'Maasai Mara', tags: ['wildlife', 'migration'], exifStripped: true, exifDetails: 'GPS coordinates stripped', status: 'rejected', submittedAt: '2025-07-23T06:00:00Z', moderatedBy: 'admin@example.com', moderatedAt: '2025-07-23T09:00:00Z', moderatorNote: 'Duplicate content — identical to story #12', contentWarning: 'Reused content', takedownHistory: [{ date: '2025-07-23T09:00:00Z', reason: 'Duplicate' }], reports: [{ reason: 'Copyright violation', reporter: 'rightsholder@example.com', date: '2025-07-23T07:00:00Z' }] },
  { id: 'mod-5', storyId: 'story-5', creatorHandle: '@culture_finder', creatorEmail: 'elena@example.com', caption: 'Exploring the old town of Lamu — the culture and architecture are incredible!', mediaType: 'image', mediaUrl: 'https://r2.example.com/media/story-5.jpg', thumbUrl: 'https://r2.example.com/media/thumbs/story-5.jpg', location: 'Lamu', tags: ['culture', 'heritage'], exifStripped: true, exifDetails: 'Location metadata stripped', status: 'pending', submittedAt: '2025-07-26T11:00:00Z', reports: [] },
]

const assetStore: MediaAsset[] = [
  { id: 'asset-1', url: 'https://r2.example.com/assets/mara-hero.jpg', thumbnailUrl: 'https://r2.example.com/assets/thumbs/mara-hero.jpg', altText: 'Sunset over Maasai Mara', caption: 'Golden hour in the Mara', credit: 'Photo by Jane Doe', type: 'image', status: 'ready', fileSize: 4200000, compressionRatio: 0.68, exifStripped: true, rightsStatus: 'cleared', tags: ['hero', 'savannah'], uploadedBy: 'admin@example.com', createdAt: '2025-07-01T00:00:00Z' },
  { id: 'asset-2', url: 'https://r2.example.com/assets/diani-aerial.jpg', thumbnailUrl: 'https://r2.example.com/assets/thumbs/diani-aerial.jpg', altText: 'Aerial view of Diani Beach', caption: 'Diani coastline from above', credit: 'Drone by EcoFilms', type: 'image', status: 'ready', fileSize: 3800000, compressionRatio: 0.72, exifStripped: true, rightsStatus: 'cleared', tags: ['aerial', 'beach'], uploadedBy: 'admin@example.com', createdAt: '2025-07-02T00:00:00Z' },
  { id: 'asset-3', url: 'https://r2.example.com/assets/kenya-climb.mp4', thumbnailUrl: 'https://r2.example.com/assets/thumbs/kenya-climb.jpg', altText: 'Time-lapse of Mount Kenya climb', caption: 'Two-day ascent sped up', credit: 'Video by Alpine Club', type: 'video', status: 'ready', fileSize: 15000000, compressionRatio: 0.45, exifStripped: false, rightsStatus: 'cleared', tags: ['mountain', 'time-lapse'], uploadedBy: 'admin@example.com', createdAt: '2025-07-03T00:00:00Z' },
  { id: 'asset-4', url: 'https://r2.example.com/assets/migration.mp4', thumbnailUrl: 'https://r2.example.com/assets/thumbs/migration.jpg', altText: 'Great Migration crossing', caption: 'River crossing at Mara River', credit: 'Video by Wildlife Trust', type: 'video', status: 'ready', fileSize: 22000000, compressionRatio: 0.38, exifStripped: false, rightsStatus: 'cleared', tags: ['migration', 'river'], uploadedBy: 'admin@example.com', createdAt: '2025-07-05T00:00:00Z' },
  { id: 'asset-5', url: 'https://r2.example.com/assets/conservation-guide.pdf', thumbnailUrl: '', altText: 'Conservation guide PDF', caption: 'Sustainable tourism field guide', credit: 'YTCI Conservation Team', type: 'pdf', status: 'ready', fileSize: 2800000, compressionRatio: 0.0, exifStripped: false, rightsStatus: 'pending', tags: ['guide', 'conservation'], uploadedBy: 'content@example.com', createdAt: '2025-07-07T00:00:00Z' },
  { id: 'asset-6', url: 'https://r2.example.com/assets/mara-360.jpg', thumbnailUrl: 'https://r2.example.com/assets/thumbs/mara-360.jpg', altText: '360 view of the Mara', caption: 'Panoramic view from Lookout Hill', credit: 'Photo by 360Ventures', type: 'image', status: 'processing', fileSize: 8500000, compressionRatio: 0.0, exifStripped: true, rightsStatus: 'cleared', tags: ['360', 'panorama'], uploadedBy: 'admin@example.com', createdAt: '2025-07-10T00:00:00Z' },
]

const logStore: OptimizationLog[] = Array.from({ length: 10 }, (_, i) => {
  const types: OptimizationLog['eventType'][] = ['COMPRESSION', 'EXIF', 'INGEST', 'EXIF', 'COMPRESSION', 'ERROR', 'COMPRESSION', 'EXIF', 'INGEST', 'EXIF']
  const names = ['mara-hero.jpg', 'diani-aerial.jpg', 'story-1.jpg', 'story-2.mp4', 'kenya-climb.mp4', 'migration.mp4', 'story-3.jpg', 'story-5.jpg', 'mara-360.jpg', 'conservation-guide.pdf']
  return {
    id: `log-${i + 1}`,
    timestamp: new Date(Date.now() - (i * 3600000 + Math.random() * 1800000)).toISOString(),
    eventType: types[i],
    assetId: `asset-${(i % 6) + 1}`,
    assetName: names[i],
    details: types[i] === 'COMPRESSION' ? `Compressed from ${((Math.random() * 5000000) + 2000000).toFixed(0)} KB to ${((Math.random() * 2000000) + 500000).toFixed(0)} KB` :
      types[i] === 'EXIF' ? 'GPS coordinates, device metadata stripped successfully' :
      types[i] === 'INGEST' ? 'Ingested from mobile client v2.3.1' :
      'Upload failed — connection timeout on first attempt, retry succeeded',
    compressionSavedKB: types[i] === 'COMPRESSION' ? Math.floor(Math.random() * 3000) + 500 : undefined,
    exifStripped: types[i] === 'EXIF' ? Math.random() > 0.2 : undefined,
  }
})

const handlers: MockRegistry = {
  list(params?: PaginationParams): Paginated<Record<string, unknown>> {
    if (params?.cursor === 'moderation') return { items: modStore as unknown as Record<string, unknown>[], nextCursor: null, hasMore: false }
    if (params?.cursor === 'logs') return { items: logStore as unknown as Record<string, unknown>[], nextCursor: null, hasMore: false }
    return { items: assetStore as unknown as Record<string, unknown>[], nextCursor: null, hasMore: false }
  },
  create(body: unknown) {
    const input = body as Record<string, unknown>
    const now = new Date().toISOString()
    if (input.storyId || input.creatorHandle) {
      const item: ModerationItem = { id: `mod-${modStore.length + 1}`, storyId: '', creatorHandle: '', creatorEmail: '', caption: '', mediaType: '', mediaUrl: '', thumbUrl: '', location: '', tags: [], exifStripped: false, exifDetails: '', status: 'pending', submittedAt: now, reports: [], ...input as Partial<ModerationItem>, submittedAt: now }
      modStore.unshift(item)
      return item
    }
    const asset: MediaAsset = {
      id: `asset-${assetStore.length + 1}`, url: '', thumbnailUrl: '', altText: '', caption: '', credit: '', type: 'image', status: 'ready', fileSize: 0, compressionRatio: 0, exifStripped: false, rightsStatus: 'cleared', tags: [], uploadedBy: 'admin@example.com', createdAt: now,
      ...input as Partial<MediaAsset>, id: `asset-${assetStore.length + 1}`, createdAt: now,
    }
    assetStore.push(asset)
    return asset
  },
  update(id: string, patch: unknown) {
    const mi = modStore.findIndex(m => m.id === id)
    if (mi !== -1) { modStore[mi] = { ...modStore[mi], ...(patch as Partial<ModerationItem>), moderatedAt: new Date().toISOString() } as ModerationItem; return modStore[mi] }
    const ai = assetStore.findIndex(a => a.id === id)
    if (ai !== -1) { assetStore[ai] = { ...assetStore[ai], ...(patch as Partial<MediaAsset>) } as MediaAsset; return assetStore[ai] }
    throw new Error('Not found')
  },
  remove(id: string) {
    const mi = modStore.findIndex(m => m.id === id); if (mi !== -1) { modStore.splice(mi, 1); return }
    const ai = assetStore.findIndex(a => a.id === id); if (ai !== -1) { assetStore.splice(ai, 1); return }
  },
  get(id: string) {
    return [...modStore, ...assetStore].find(i => i.id === id) ?? modStore[0]
  },
}

export default handlers
