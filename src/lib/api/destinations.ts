import type { ApiConfig } from './client'
import { apiRequest } from './client'
import type { Paginated, PaginationParams } from './types'

export interface Destination {
  id: string
  name: string
  slug: string
  county: string
  locality: string
  category: string
  status: 'draft' | 'published' | 'archived'
  latitude: number
  longitude: number
  mapLabel: string
  accessRoute: string
  distanceReference: string
  shortDescription: string
  fullDescription: string
  significance: string
  history: string
  thingsToDo: string
  suitableAudiences: string
  duration: string
  difficulty: 'easy' | 'moderate' | 'hard'
  seasonality: string
  indicativeFees: string
  openingInfo: string
  transportNotes: string
  accessibility: string[]
  facilities: string
  safetyNotes: string
  heroImageUrl: string
  heroCaption: string
  heroCredit: string
  heroAlt: string
  gallery: string[]
  videoUrl: string
  videoCaption: string
  videoCredit: string
  nearbyAttractions: string
  associatedEvents: string
  associatedStories: string
  associatedCourses: string
  associatedConservation: string
  source?: string
  contentOwner: string
  verificationStatus: 'verified' | 'unverified' | 'pending'
  reviewDate: string
  curationFlags: { trending: boolean; hiddenGem: boolean }
  createdAt: string
  updatedAt: string
}

export function destinationsApi(config: ApiConfig) {
  return {
    list: (params?: PaginationParams) =>
      apiRequest<Paginated<Destination>>(config, '/v1/destinations', { params }),
    get: (id: string) =>
      apiRequest<Destination>(config, `/v1/destinations/${id}`),
    create: (body: Record<string, unknown>) =>
      apiRequest<{ id: string }>(config, '/v1/destinations', { method: 'POST', body }),
    update: (id: string, patch: Record<string, unknown>) =>
      apiRequest<Destination>(config, `/v1/destinations/${id}`, { method: 'PATCH', body: patch }),
    remove: (id: string) =>
      apiRequest<void>(config, `/v1/destinations/${id}`, { method: 'DELETE' }),
    uploadMedia: (id: string, body: { heroMediaId?: string; galleryMediaIds?: string[]; videoMediaId?: string }) =>
      apiRequest<{ status: string }>(config, `/v1/destinations/${id}/media`, { method: 'POST', body }),
  }
}
