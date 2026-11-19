import z from 'zod'
import {
  ACCOMMODATION_PROPERTY_TYPES,
  ACCOMMODATION_TIERS,
  MARKETPLACE_CATEGORIES,
  MARKETPLACE_STATUSES,
  STAY_AMENITIES,
} from '#/lib/api/marketplace'

const nullableText = () => z.preprocess((v) => (v == null ? '' : v), z.string())
const booleanValue = (fallback: boolean) => z.preprocess((v) => (v == null ? fallback : v), z.boolean())

const slug = z
  .string()
  .trim()
  .regex(
    /^[a-z0-9-]{2,80}$/,
    'Slug must be 2–80 characters using lowercase letters, numbers, and hyphens',
  )

function isHttpUrl(value: string): boolean {
  try {
    const url = new URL(value)
    return (url.protocol === 'http:' || url.protocol === 'https:') && url.host.length > 0
  } catch {
    return false
  }
}

const requiredHttpUrl = (label: string) =>
  z.string().trim().refine(isHttpUrl, `${label} must be a valid http(s) URL`)

const optionalHttpUrl = (label: string) =>
  z.preprocess(
    (value) => (value == null ? '' : value),
    z.string().trim().refine((value) => value === '' || isHttpUrl(value), `${label} must be a valid http(s) URL`),
  )

const optionalEmail = () =>
  z.preprocess(
    (value) => (value == null ? '' : value),
    z
      .string()
      .trim()
      .refine(
        (value) => value === '' || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value),
        'Enter a valid email address',
      ),
  )

const nullableNumber = (schema: z.ZodType<number, unknown>) =>
  z.preprocess((value) => (value === '' || value == null ? null : value), schema.nullable())

const displayOrder = z.preprocess(
  (value) => (value === '' || value == null ? 0 : value),
  z.coerce
    .number()
    .int('Display order must be a whole number')
    .min(0, 'Display order must be between 0 and 10000')
    .max(10000, 'Display order must be between 0 and 10000'),
)

const status = z.enum(MARKETPLACE_STATUSES).default('draft')

export const businessSchema = z.object({
  name: z.string().trim().min(2, 'Name must be at least 2 characters').max(120, 'Name must be 120 characters or fewer'),
  slug,
  category: z.enum(MARKETPLACE_CATEGORIES, { error: 'Choose a category' }),
  tagline: nullableText().refine((value) => value.length <= 120, 'Tagline must be 120 characters or fewer'),
  shortDescription: z
    .string()
    .trim()
    .min(1, 'Short description is required')
    .max(240, 'Short description must be 240 characters or fewer'),
  fullDescription: nullableText(),
  county: nullableText(),
  locality: nullableText(),
  serviceArea: nullableText(),
  address: nullableText(),
  locationLat: nullableNumber(z.number().min(-90, 'Latitude must be between -90 and 90').max(90, 'Latitude must be between -90 and 90')),
  locationLng: nullableNumber(z.number().min(-180, 'Longitude must be between -180 and 180').max(180, 'Longitude must be between -180 and 180')),
  contactEmail: optionalEmail(),
  contactPhone: nullableText(),
  redirectUrl: requiredHttpUrl('Redirect URL'),
  redirectLabel: nullableText(),
  disclosure: nullableText(),
  imageUrl: nullableText(),
  imageUrlKey: nullableText(),
  imageAlt: nullableText(),
  imageCredit: nullableText(),
  status,
  isFeatured: booleanValue(false),
  displayOrder,
})

export const staySchema = z
  .object({
    name: z.string().trim().min(2, 'Name must be at least 2 characters').max(120, 'Name must be 120 characters or fewer'),
    slug,
    tier: z.enum(ACCOMMODATION_TIERS, { error: 'Choose a tier' }),
    propertyType: z.enum(ACCOMMODATION_PROPERTY_TYPES, { error: 'Choose a property type' }),
    shortDescription: z
      .string()
      .trim()
      .min(1, 'Short description is required')
      .max(240, 'Short description must be 240 characters or fewer'),
    fullDescription: nullableText(),
    county: z.string().trim().min(1, 'County is required'),
    locality: nullableText(),
    address: nullableText(),
    locationLat: nullableNumber(z.number().min(-90, 'Latitude must be between -90 and 90').max(90, 'Latitude must be between -90 and 90')),
    locationLng: nullableNumber(z.number().min(-180, 'Longitude must be between -180 and 180').max(180, 'Longitude must be between -180 and 180')),
    priceFromKes: nullableNumber(z.number().int('Price must be a whole number').min(0, 'Price must be zero or greater')),
    priceNote: nullableText(),
    priceCheckedAt: z.preprocess(
      (value) => (value === '' || value == null ? null : value),
      z
        .string()
        .regex(/^\d{4}-\d{2}-\d{2}$/, 'Use a date in YYYY-MM-DD format')
        .nullable(),
    ),
    distanceNote: nullableText(),
    cancellationNote: nullableText(),
    paymentNote: nullableText(),
    includedNote: nullableText(),
    badgeLabel: nullableText().refine((value) => value.length <= 60, 'Badge label must be 60 characters or fewer'),
    amenities: z.array(z.enum(STAY_AMENITIES)).default([]),
    highlights: z
      .array(z.string().trim().min(1, 'Highlights cannot be empty').max(60, 'Highlights must be 60 characters or fewer'))
      .max(6, 'Add at most 6 highlights')
      .default([]),
    bookingUrl: optionalHttpUrl('Booking URL'),
    directUrl: optionalHttpUrl('Direct URL'),
    disclosure: nullableText(),
    contactEmail: optionalEmail(),
    contactPhone: nullableText(),
    imageUrl: nullableText(),
    imageUrlKey: nullableText(),
    imageAlt: nullableText(),
    imageCredit: nullableText(),
    status,
    isFeatured: booleanValue(false),
    displayOrder,
  })
  .superRefine((data, ctx) => {
    if (data.status === 'published' && !data.bookingUrl && !data.directUrl) {
      ctx.addIssue({
        code: 'custom',
        message: 'A published stay needs a booking URL or a direct URL',
        path: ['bookingUrl'],
      })
    }
  })

export const esimProviderSchema = z
  .object({
    name: z.string().trim().min(2, 'Name must be at least 2 characters').max(120, 'Name must be 120 characters or fewer'),
    slug,
    headline: nullableText().refine((value) => value.length <= 120, 'Headline must be 120 characters or fewer'),
    description: z
      .string()
      .trim()
      .min(1, 'Description is required')
      .max(400, 'Description must be 400 characters or fewer'),
    coverageNote: nullableText(),
    priceLabel: nullableText(),
    redirectUrl: requiredHttpUrl('Redirect URL'),
    redirectLabel: nullableText(),
    disclosure: nullableText(),
    logoUrl: nullableText(),
    logoUrlKey: nullableText(),
    logoAlt: nullableText(),
    status,
    isFeatured: booleanValue(false),
    displayOrder,
  })
  .superRefine((data, ctx) => {
    if (data.isFeatured && data.status !== 'published') {
      ctx.addIssue({
        code: 'custom',
        message: 'Only a published provider can be featured',
        path: ['isFeatured'],
      })
    }
  })

export type BusinessInput = z.input<typeof businessSchema>
export type BusinessOutput = z.output<typeof businessSchema>
export type StayInput = z.input<typeof staySchema>
export type StayOutput = z.output<typeof staySchema>
export type EsimProviderInput = z.input<typeof esimProviderSchema>
export type EsimProviderOutput = z.output<typeof esimProviderSchema>
