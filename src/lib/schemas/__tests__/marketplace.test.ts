import { describe, it, expect } from 'vitest'
import { businessSchema, esimProviderSchema, staySchema } from '../marketplace.schema'

const validBusiness = {
  name: 'Mara Naboisho Conservancy',
  slug: 'mara-naboisho-conservancy',
  category: 'experiences',
  shortDescription: 'Guided conservancy walks and cultural visits.',
  redirectUrl: 'https://example.com/mara',
}

const validStay = {
  name: 'Mara River Camp',
  slug: 'mara-river-camp',
  tier: 'midrange',
  propertyType: 'camp',
  shortDescription: 'Tented camp on the Mara River.',
  county: 'Narok',
}

const validEsim = {
  name: 'Airalo',
  slug: 'airalo',
  description: 'Install a Kenya eSIM before you fly.',
  redirectUrl: 'https://example.com/esim',
}

describe('businessSchema', () => {
  it('accepts a valid business and fills defaults', () => {
    const result = businessSchema.safeParse(validBusiness)
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.status).toBe('draft')
      expect(result.data.isFeatured).toBe(false)
      expect(result.data.displayOrder).toBe(0)
    }
  })

  it('rejects an invalid slug', () => {
    const result = businessSchema.safeParse({ ...validBusiness, slug: 'Mara Naboisho' })
    expect(result.success).toBe(false)
  })

  it('rejects a non-http redirect URL', () => {
    const result = businessSchema.safeParse({ ...validBusiness, redirectUrl: 'javascript:alert(1)' })
    expect(result.success).toBe(false)
  })

  it('rejects an invalid category', () => {
    const result = businessSchema.safeParse({ ...validBusiness, category: 'hotels' })
    expect(result.success).toBe(false)
  })

  it('rejects a short description over 240 characters', () => {
    const result = businessSchema.safeParse({ ...validBusiness, shortDescription: 'x'.repeat(241) })
    expect(result.success).toBe(false)
  })

  it('rejects a display order outside 0–10000', () => {
    expect(businessSchema.safeParse({ ...validBusiness, displayOrder: -1 }).success).toBe(false)
    expect(businessSchema.safeParse({ ...validBusiness, displayOrder: 10001 }).success).toBe(false)
  })

  it('rejects an invalid contact email', () => {
    const result = businessSchema.safeParse({ ...validBusiness, contactEmail: 'not-an-email' })
    expect(result.success).toBe(false)
  })
})

describe('staySchema', () => {
  it('accepts a draft stay without a handoff URL', () => {
    const result = staySchema.safeParse(validStay)
    expect(result.success).toBe(true)
  })

  it('rejects a published stay without a booking or direct URL', () => {
    const result = staySchema.safeParse({ ...validStay, status: 'published' })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues.some((issue) => issue.path.join('.') === 'bookingUrl')).toBe(true)
    }
  })

  it('accepts a published stay with a direct URL', () => {
    const result = staySchema.safeParse({
      ...validStay,
      status: 'published',
      directUrl: 'https://example.com/stay',
    })
    expect(result.success).toBe(true)
  })

  it('rejects a non-http booking URL', () => {
    const result = staySchema.safeParse({ ...validStay, bookingUrl: 'ftp://example.com/stay' })
    expect(result.success).toBe(false)
  })

  it('rejects a negative price', () => {
    const result = staySchema.safeParse({ ...validStay, priceFromKes: -1 })
    expect(result.success).toBe(false)
  })

  it('rejects more than six highlights', () => {
    const result = staySchema.safeParse({
      ...validStay,
      highlights: ['a', 'b', 'c', 'd', 'e', 'f', 'g'],
    })
    expect(result.success).toBe(false)
  })

  it('accepts only fixed amenity options', () => {
    expect(staySchema.safeParse({ ...validStay, amenities: ['Wi-Fi', 'Breakfast'] }).success).toBe(true)
    expect(staySchema.safeParse({ ...validStay, amenities: ['Helipad'] }).success).toBe(false)
  })
})

describe('esimProviderSchema', () => {
  it('accepts a valid provider', () => {
    const result = esimProviderSchema.safeParse(validEsim)
    expect(result.success).toBe(true)
  })

  it('accepts a published featured provider', () => {
    const result = esimProviderSchema.safeParse({ ...validEsim, status: 'published', isFeatured: true })
    expect(result.success).toBe(true)
  })

  it('rejects a draft featured provider', () => {
    const result = esimProviderSchema.safeParse({ ...validEsim, status: 'draft', isFeatured: true })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues.some((issue) => issue.path.join('.') === 'isFeatured')).toBe(true)
    }
  })

  it('rejects a description over 400 characters', () => {
    const result = esimProviderSchema.safeParse({ ...validEsim, description: 'x'.repeat(401) })
    expect(result.success).toBe(false)
  })

  it('rejects a non-http redirect URL', () => {
    const result = esimProviderSchema.safeParse({ ...validEsim, redirectUrl: 'not-a-url' })
    expect(result.success).toBe(false)
  })
})
