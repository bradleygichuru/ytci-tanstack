import type { Paginated, PaginationParams } from '../types'
import type { MockRegistry } from './index'

interface ConservationActivity {
  id: string; title: string; organizer: string
  location: string; locationPrivacyLevel: 'public' | 'sensitive'
  description: string; date: string; impactMetric: string
  measurementUnit: string; impactGoal: number; impactActual: number
  participantCount: number; status: 'open' | 'full' | 'completed' | 'cancelled'
  verificationRules: string; badgeAwarded: boolean; badgeName: string
  createdAt: string
}

interface EvidenceItem {
  id: string; activityId: string; activityTitle: string
  userId: string; userName: string; description: string
  imageUrl: string; status: 'pending' | 'approved' | 'rejected'
  submittedAt: string; reviewedAt?: string; reviewerNote?: string
}

const aggSummary = { trees: { label: 'Trees Planted', value: 8054, target: 10000 }, cleanups: { label: 'Cleanups Completed', value: 234, target: 500 }, wildlife: { label: 'Wildlife Sightings', value: 1826, target: 3000 } }

const activities: ConservationActivity[] = [
  { id: 'ca-1', title: 'Beach Cleanup — Diani', organizer: 'Kwale Conservation Trust', location: 'Diani Beach', locationPrivacyLevel: 'public', description: 'Help clean up plastic waste along the coastline.', date: '2025-08-15', impactMetric: 'kg waste collected', measurementUnit: 'kg', impactGoal: 500, impactActual: 0, participantCount: 0, status: 'open', verificationRules: 'Upload before/after photos. Selfie at cleanup site with timestamp.', badgeAwarded: true, badgeName: 'Beach Guardian', createdAt: '2025-06-01T00:00:00Z' },
  { id: 'ca-2', title: 'Tree Planting — Karura Forest', organizer: 'KFS', location: 'Karura Forest, Nairobi', locationPrivacyLevel: 'public', description: 'Plant indigenous trees in the green lung of Nairobi.', date: '2025-09-01', impactMetric: 'trees planted', measurementUnit: 'trees', impactGoal: 1000, impactActual: 234, participantCount: 47, status: 'open', verificationRules: 'GPS-tagged photo of the planted tree. Species identification confirmation.', badgeAwarded: true, badgeName: 'Forest Champion', createdAt: '2025-06-05T00:00:00Z' },
  { id: 'ca-3', title: 'Wildlife Corridor Survey', organizer: 'Kenya Wildlife Trust', location: 'Lewa Conservancy, Meru', locationPrivacyLevel: 'sensitive', description: 'Track and document wildlife movement through the protected corridor.', date: '2025-07-10', impactMetric: 'corridor observations', measurementUnit: 'observations', impactGoal: 200, impactActual: 156, participantCount: 23, status: 'completed', verificationRules: 'Track coordinates within designated transect. Photo of observation without revealing precise location.', badgeAwarded: true, badgeName: 'Wildlife Guardian', createdAt: '2025-05-01T00:00:00Z' },
]

const evidence: EvidenceItem[] = [
  { id: 'ev-1', activityId: 'ca-2', activityTitle: 'Tree Planting — Karura Forest', userId: 'u1', userName: 'John Kiprop', description: 'Planted 5 indigenous trees near the main trailhead. Photos attached with GPS coordinates.', imageUrl: 'https://r2.example.com/evidence/tree-planting-1.jpg', status: 'pending', submittedAt: '2025-07-20T10:00:00Z' },
  { id: 'ev-2', activityId: 'ca-2', activityTitle: 'Tree Planting — Karura Forest', userId: 'u2', userName: 'Grace Akello', description: 'Planted 3 Prunus africana saplings in the restoration zone.', imageUrl: 'https://r2.example.com/evidence/tree-planting-2.jpg', status: 'approved', submittedAt: '2025-07-18T14:00:00Z', reviewedAt: '2025-07-19T09:00:00Z', reviewerNote: 'Species confirmed. GPS tag verified.' },
  { id: 'ev-3', activityId: 'ca-2', activityTitle: 'Tree Planting — Karura Forest', userId: 'u3', userName: 'Samuel Otieno', description: 'Planted 8 trees — photos show saplings but no GPS coordinates included.', imageUrl: 'https://r2.example.com/evidence/tree-planting-3.jpg', status: 'rejected', submittedAt: '2025-07-16T11:00:00Z', reviewedAt: '2025-07-17T10:00:00Z', reviewerNote: 'Missing GPS coordinates. Please resubmit with location data.' },
  { id: 'ev-4', activityId: 'ca-3', activityTitle: 'Wildlife Corridor Survey', userId: 'u4', userName: 'Amina Hassan', description: 'Observed 12 elephants moving through the northern corridor transect.', imageUrl: 'https://r2.example.com/evidence/corridor-1.jpg', status: 'pending', submittedAt: '2025-07-15T06:30:00Z' },
  { id: 'ev-5', activityId: 'ca-3', activityTitle: 'Wildlife Corridor Survey', userId: 'u5', userName: 'Peter Mwangi', description: 'Recorded zebra and gazelle activity in the central zone. Coordinates: restricted', imageUrl: 'https://r2.example.com/evidence/corridor-2.jpg', status: 'pending', submittedAt: '2025-07-14T08:00:00Z' },
]

const handlers: MockRegistry = {
  list(params?: PaginationParams): Paginated<Record<string, unknown>> {
    if (params?.cursor === 'evidence') return { items: evidence as unknown as Record<string, unknown>[], nextCursor: null, hasMore: false }
    return { items: activities as unknown as Record<string, unknown>[], nextCursor: null, hasMore: false }
  },
  get(id: string) {
    return [...activities, ...evidence].find(a => a.id === id) ?? activities[0]
  },
  create(body: unknown) {
    const input = body as Partial<ConservationActivity>
    const now = new Date().toISOString()
    const item: ConservationActivity = {
      id: `ca-${activities.length + 1}`, title: input.title ?? '', organizer: input.organizer ?? '', location: input.location ?? '', locationPrivacyLevel: 'public',
      description: input.description ?? '', date: input.date ?? '', impactMetric: input.impactMetric ?? '', measurementUnit: input.measurementUnit ?? '',
      impactGoal: input.impactGoal ?? 100, impactActual: 0, participantCount: 0, status: 'open',
      verificationRules: input.verificationRules ?? '', badgeAwarded: false, badgeName: '', createdAt: now,
    }
    activities.push(item)
    return item
  },
  update(id: string, patch: unknown) {
    const ai = activities.findIndex(a => a.id === id)
    if (ai !== -1) { activities[ai] = { ...activities[ai], ...(patch as Partial<ConservationActivity>) } as ConservationActivity; return activities[ai] }
    const ei = evidence.findIndex(e => e.id === id)
    if (ei !== -1) { evidence[ei] = { ...evidence[ei], ...(patch as Partial<EvidenceItem>), reviewedAt: new Date().toISOString() } as EvidenceItem; return evidence[ei] }
    throw new Error('Not found')
  },
  remove(id: string) {
    const ai = activities.findIndex(a => a.id === id); if (ai !== -1) { activities.splice(ai, 1); return }
    const ei = evidence.findIndex(e => e.id === id); if (ei !== -1) { evidence.splice(ei, 1); return }
  },
}

export default handlers
export { aggSummary }
