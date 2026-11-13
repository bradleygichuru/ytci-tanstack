import type { ApiConfig } from './client'
import { apiRequest } from './client'
import type { Paginated, PaginationParams } from './types'

export const MARKETPLACE_CATEGORIES = [
  'experiences',
  'food_drink',
  'transport',
  'shopping',
  'services',
  'connectivity',
] as const

export type MarketplaceCategory = (typeof MARKETPLACE_CATEGORIES)[number]

export const ACCOMMODATION_TIERS = ['luxury', 'midrange', 'budget'] as const
export type AccommodationTier = (typeof ACCOMMODATION_TIERS)[number]

export const ACCOMMODATION_PROPERTY_TYPES = [
  'lodge',
  'camp',
  'hotel',
  'hostel',
  'guesthouse',
  'apartment',
  'villa',
] as const
export type AccommodationPropertyType = (typeof ACCOMMODATION_PROPERTY_TYPES)[number]

export const MARKETPLACE_STATUSES = ['draft', 'published', 'archived'] as const
export type MarketplaceStatus = (typeof MARKETPLACE_STATUSES)[number]

export const BUSINESS_CATEGORY_LABELS: Record<MarketplaceCategory, string> = {
  experiences: 'Experiences',
  food_drink: 'Food & Drink',
  transport: 'Transport',
  shopping: 'Shopping',
  services: 'Services',
  connectivity: 'Connectivity',
}

export const ACCOMMODATION_TIER_LABELS: Record<AccommodationTier, string> = {
  luxury: 'Luxury',
  midrange: 'Midrange',
  budget: 'Budget',
}

export const ACCOMMODATION_PROPERTY_TYPE_LABELS: Record<AccommodationPropertyType, string> = {
  lodge: 'Lodge',
  camp: 'Camp',
  hotel: 'Hotel',
  hostel: 'Hostel',
  guesthouse: 'Guesthouse',
  apartment: 'Apartment',
  villa: 'Villa',
}

export const STAY_AMENITIES = [
  'Wi-Fi',
  'Breakfast',
  'Parking',
  'Pool',
  'Restaurant',
  'Bar',
  'Spa',
  'Gym',
  'Airport shuttle',
  'Pet friendly',
  'Family rooms',
  'Laundry',
  'Conference rooms',
  'Hot tub',
  'Fireplace',
  'Kitchen',
  'Workspace',
  'Air conditioning',
] as const

export interface MarketplaceListParams extends PaginationParams {
  status?: string
  q?: string
}

export interface StayListParams extends MarketplaceListParams {
  tier?: string
}

export interface PartnerBusiness {
  id: string
  name: string
  slug: string
  category: MarketplaceCategory
  tagline: string | null
  shortDescription: string
  fullDescription: string | null
  county: string | null
  locality: string | null
  serviceArea: string | null
  address: string | null
  locationLat: number | null
  locationLng: number | null
  contactEmail: string | null
  contactPhone: string | null
  redirectUrl: string
  redirectLabel: string | null
  disclosure: string | null
  imageUrl: string | null
  imageUrlKey: string | null
  imageAlt: string | null
  imageCredit: string | null
  status: MarketplaceStatus
  isFeatured: boolean
  displayOrder: number
  createdAt: string
  updatedAt: string
}

export interface AccommodationProperty {
  id: string
  name: string
  slug: string
  tier: AccommodationTier
  propertyType: AccommodationPropertyType
  shortDescription: string
  fullDescription: string | null
  county: string
  locality: string | null
  address: string | null
  locationLat: number | null
  locationLng: number | null
  priceFromKes: number | null
  priceNote: string | null
  priceCheckedAt: string | null
  distanceNote: string | null
  cancellationNote: string | null
  paymentNote: string | null
  includedNote: string | null
  badgeLabel: string | null
  amenities: string[]
  highlights: string[]
  bookingUrl: string | null
  directUrl: string | null
  disclosure: string | null
  contactEmail: string | null
  contactPhone: string | null
  imageUrl: string | null
  imageUrlKey: string | null
  imageAlt: string | null
  imageCredit: string | null
  status: MarketplaceStatus
  isFeatured: boolean
  displayOrder: number
  createdAt: string
  updatedAt: string
}

export interface EsimProvider {
  id: string
  name: string
  slug: string
  headline: string | null
  description: string
  coverageNote: string | null
  priceLabel: string | null
  redirectUrl: string
  redirectLabel: string | null
  disclosure: string | null
  logoUrl: string | null
  logoUrlKey: string | null
  logoAlt: string | null
  status: MarketplaceStatus
  isFeatured: boolean
  displayOrder: number
  createdAt: string
  updatedAt: string
}

type CreateResult = { id: string }
type UpdateResult = { status: string }

export function marketplaceApi(config: ApiConfig) {
  const businessPath = '/v1/marketplace/businesses'
  const stayPath = '/v1/stays'
  const esimPath = '/v1/esim-providers'

  return {
    businesses: {
      list: (params?: MarketplaceListParams) =>
        apiRequest<Paginated<PartnerBusiness>>(config, businessPath, { params }),
      get: (id: string) =>
        apiRequest<PartnerBusiness>(config, `${businessPath}/${id}`),
      create: (body: Record<string, unknown>) =>
        apiRequest<CreateResult>(config, businessPath, { method: 'POST', body }),
      update: (id: string, patch: Record<string, unknown>) =>
        apiRequest<UpdateResult>(config, `${businessPath}/${id}`, { method: 'PATCH', body: patch }),
      remove: (id: string) =>
        apiRequest<void>(config, `${businessPath}/${id}`, { method: 'DELETE' }),
    },
    stays: {
      list: (params?: StayListParams) =>
        apiRequest<Paginated<AccommodationProperty>>(config, stayPath, { params }),
      get: (id: string) =>
        apiRequest<AccommodationProperty>(config, `${stayPath}/${id}`),
      create: (body: Record<string, unknown>) =>
        apiRequest<CreateResult>(config, stayPath, { method: 'POST', body }),
      update: (id: string, patch: Record<string, unknown>) =>
        apiRequest<UpdateResult>(config, `${stayPath}/${id}`, { method: 'PATCH', body: patch }),
      remove: (id: string) =>
        apiRequest<void>(config, `${stayPath}/${id}`, { method: 'DELETE' }),
    },
    esim: {
      list: (params?: MarketplaceListParams) =>
        apiRequest<Paginated<EsimProvider>>(config, esimPath, { params }),
      get: (id: string) =>
        apiRequest<EsimProvider>(config, `${esimPath}/${id}`),
      create: (body: Record<string, unknown>) =>
        apiRequest<CreateResult>(config, esimPath, { method: 'POST', body }),
      update: (id: string, patch: Record<string, unknown>) =>
        apiRequest<UpdateResult>(config, `${esimPath}/${id}`, { method: 'PATCH', body: patch }),
      remove: (id: string) =>
        apiRequest<void>(config, `${esimPath}/${id}`, { method: 'DELETE' }),
    },
  }
}
