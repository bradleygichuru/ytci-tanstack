import { DESTINATION_CATEGORIES, DESTINATION_CATEGORY_SET } from '#/lib/catalog'

export type CurationStatus = 'pending' | 'draft' | 'published' | 'rejected'
export type FeeStatus = 'verified' | 'reported' | 'not_verified' | 'free'
export type OpeningHoursStatus = 'verified' | 'unverified'
export type CoverageStatus = 'covered' | 'limited' | 'not_covered'

export const CURATION_STATUSES: CurationStatus[] = [
  'pending',
  'draft',
  'published',
  'rejected',
]

export const FEE_STATUSES: FeeStatus[] = ['verified', 'reported', 'not_verified', 'free']
export const OPENING_HOURS_STATUSES: OpeningHoursStatus[] = ['verified', 'unverified']
export const TRANSPORT_MODES = ['car', '4x4', 'flight', 'public_transport', 'boat', 'walking', 'cycling'] as const
export const BEST_SEASONS = ['dry', 'green', 'migration', 'year_round'] as const

export const GOLDEN_FIXTURES = [
  { slug: 'amboseli', name: 'Amboseli' },
  { slug: 'chalbi-desert', name: 'Chalbi Desert' },
  { slug: 'diani-beach', name: 'Diani Beach' },
  { slug: 'fort-jesus', name: 'Fort Jesus' },
  { slug: 'hells-kitchen', name: "Hell's Kitchen" },
  { slug: 'karura-forest', name: 'Karura Forest' },
  { slug: 'lake-nakuru', name: 'Lake Nakuru' },
  { slug: 'lake-paradise', name: 'Lake Paradise' },
  { slug: 'lake-turkana', name: 'Lake Turkana' },
  { slug: 'maasai-mara', name: 'Maasai Mara' },
] as const

export interface ReviewFields {
  name: string
  countyCode: string
  county?: string
  locality: string
  category: string
  interestTags: string[]
  latitude: number | null
  longitude: number | null
  shortDescription: string
  durationMinMinutes: number | null
  durationMaxMinutes: number | null
  feeStatus: FeeStatus | null
  feeCurrency: string
  feeAmount: number | null
  feeBasis: string
  openingHoursStatus: OpeningHoursStatus | null
  openingHours: unknown
  transportModes: string[]
  bestSeasons: string[]
  heroImageUrl: string
  heroImageAttribution: string
  source: string
  contentOwner: string
  reviewDate: string
}


export interface CurationCandidate {
  placeId: string
  name: string
  address: string | null
  countyCode: string
  county: string
  locality: string | null
  category: string
  interestTags: string[]
  latitude: number
  longitude: number
  rating: number | null
  reviewCount: number | null
  priceLevel: string | null
  heroImageUrl: string | null
  heroImageAttribution: string | null
  openingHours: unknown
  googleTypes: string[]
  fetchedAt: string
  expiresAt: string
  curationStatus: CurationStatus
  destinationId: string | null
  destinationName: string | null
  destinationCategory: string | null
  destinationInterestTags: string[] | null
  destinationLocality: string | null
  destinationOpeningHours: unknown
  reviewedBy: string | null
  reviewedAt: string | null
  rejectionReason: string | null
  destination: {
    slug: string
    status: string
    verificationStatus: string | null
    isCurated: boolean
    verifiedAt: string | null
    contentOwner: string | null
    reviewDate: string | null
    shortDescription: string | null
    durationMinMinutes: number | null
    durationMaxMinutes: number | null
    feeStatus: FeeStatus | null
    feeCurrency: string | null
    feeAmount: number | null
    feeBasis: string | null
    openingHoursStatus: OpeningHoursStatus | null
    transportModes: string[]
    bestSeasons: string[]
    heroImageUrl: string | null
    heroImageAttribution: string | null
  } | null
}

export interface ReadinessCheck {
  key: string
  label: string
  ok: boolean
  detail?: string
  required: boolean
}

export interface ReadinessResult {
  ready: boolean
  contentReady: boolean
  checks: ReadinessCheck[]
  errors: Record<string, string>
}

const TRANSITIONS: Record<CurationStatus, CurationStatus[]> = {
  pending: ['draft', 'published', 'rejected'],
  draft: ['draft', 'published', 'rejected'],
  published: ['published'],
  rejected: ['draft'],
}

export function canTransition(from: CurationStatus, to: CurationStatus): boolean {
  return TRANSITIONS[from]?.includes(to) ?? false
}

export function isFiniteCoordinate(value: number | null | undefined): value is number {
  return typeof value === 'number' && Number.isFinite(value)
}

export function defaultReviewDate(days = 30, now = new Date()): string {
  const date = new Date(now)
  date.setDate(date.getDate() + days)
  return date.toISOString().slice(0, 10)
}

export function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/[\s_]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
}

export function evaluateComposerReadiness(fields: ReviewFields): ReadinessResult {
  const checks: ReadinessCheck[] = []
  const add = (
    key: string,
    label: string,
    ok: boolean,
    detail?: string,
    required = true,
  ) => {
    checks.push({ key, label, ok, detail, required })
  }

  add('name', 'Place name', fields.name.trim().length > 0, 'A public name is required.')
  add('county', 'County code', fields.countyCode.trim().length > 0, 'Choose a canonical county.')
  add(
    'category',
    'Controlled category',
    DESTINATION_CATEGORY_SET.has(fields.category),
    'Use one of the 12 composer categories.',
  )
  add(
    'interests',
    'Interest tags',
    fields.interestTags.length > 0 &&
      fields.interestTags.every((tag) => DESTINATION_CATEGORY_SET.has(tag)),
    'Choose at least one valid interest tag.',
  )
  add(
    'coordinates',
    'Coordinates',
    isFiniteCoordinate(fields.latitude) && isFiniteCoordinate(fields.longitude),
    'A point is required for routing and the map.',
  )
  add(
    'description',
    'Short description',
    fields.shortDescription.trim().length >= 40,
    'Write at least 40 characters; one clear sentence is better.',
  )

  const durationOk =
    fields.durationMinMinutes != null &&
    fields.durationMaxMinutes != null &&
    Number.isInteger(fields.durationMinMinutes) &&
    Number.isInteger(fields.durationMaxMinutes) &&
    fields.durationMinMinutes > 0 &&
    fields.durationMaxMinutes >= fields.durationMinMinutes
  add(
    'duration',
    'Visit duration',
    durationOk,
    'Set a positive min/max range; min cannot exceed max.',
  )

  add(
    'fee_status',
    'Fee status',
    fields.feeStatus != null && FEE_STATUSES.includes(fields.feeStatus),
    'Say whether the fee is verified, reported, unverified, or free.',
  )

  const feeBasisOk = fields.feeBasis.trim().length > 0
  add(
    'fee_basis',
    'Fee basis',
    fields.feeStatus === 'not_verified' ? feeBasisOk : true,
    'Unverified fees need a basis, such as “adult entry, 2026”.',
  )
  const feeAmountRequired = fields.feeStatus === 'verified' || fields.feeStatus === 'reported'
  const feeAmountOk =
    !feeAmountRequired ||
    (fields.feeAmount != null && Number.isFinite(fields.feeAmount) && fields.feeAmount >= 0)
  add(
    'fee_amount',
    'Fee amount',
    feeAmountOk,
    'Verified and reported fees need a KES amount.',
    feeAmountRequired,
  )
  add(
    'fee_currency',
    'Fee currency',
    fields.feeStatus === 'free' || fields.feeCurrency.trim().length === 3,
    'Use a three-letter currency code.',
  )

  add(
    'hours_status',
    'Opening-hours status',
    fields.openingHoursStatus != null &&
      OPENING_HOURS_STATUSES.includes(fields.openingHoursStatus),
    'Say whether the opening hours are verified or unverified.',
  )
  add(
    'hours_data',
    'Opening-hours data',
    fields.openingHoursStatus !== 'verified' || fields.openingHours != null,
    'A verified status needs structured opening hours.',
  )

  add(
    'hero_attribution',
    'Hero image attribution',
    fields.heroImageAttribution.trim().length > 0,
    'The composer only publishes places with a credit.',
  )
  add(
    'hero_image',
    'Hero image',
    fields.heroImageUrl.trim().length > 0,
    'Recommended for the mobile card.',
    false,
  )
  add(
    'source',
    'Source',
    fields.source.trim().length > 0,
    'Record where the place data came from.',
  )
  add(
    'owner',
    'Content owner',
    fields.contentOwner.trim().length > 0,
    'Name the person or team accountable for the next review.',
  )
  add(
    'review_date',
    'Next review date',
    /^\d{4}-\d{2}-\d{2}$/.test(fields.reviewDate) &&
      !Number.isNaN(new Date(`${fields.reviewDate}T12:00:00`).getTime()),
    'Pick the next monthly review date.',
  )

  const contentReady = checks
    .filter((check) => check.required)
    .every((check) => check.ok)
  const ready = contentReady

  const errors: Record<string, string> = {}
  for (const check of checks) {
    if (check.required && !check.ok) {
      errors[check.key] = check.detail ?? check.label
    }
  }

  return { ready, contentReady, checks, errors }
}

export interface CoverageRow {
  countyCode: string
  county: string
  curatedCount: number
  unverifiedCount: number
  totalCount: number
  coverageStatus: CoverageStatus
}

export interface GoldenFixtureRow {
  slug: string
  name: string
  county: string
  status: string
  verificationStatus: string | null
  isCurated: boolean
  verifiedAt: string | null
  reviewDate: string | null
  composerReady: boolean
}

export interface CoverageSummary {
  counties: number
  covered: number
  limited: number
  notCovered: number
  curated: number
  unverified: number
  total: number
  fixturesReady: number
  fixturesTotal: number
  fixturesDue: number
}

export function coverageSummary(
  rows: CoverageRow[],
  fixtures: GoldenFixtureRow[],
  now = new Date(),
): CoverageSummary {
  const dueBefore = new Date(now)
  dueBefore.setDate(dueBefore.getDate() + 30)
  return {
    counties: rows.length,
    covered: rows.filter((row) => row.coverageStatus === 'covered').length,
    limited: rows.filter((row) => row.coverageStatus === 'limited').length,
    notCovered: rows.filter((row) => row.coverageStatus === 'not_covered').length,
    curated: rows.reduce((sum, row) => sum + row.curatedCount, 0),
    unverified: rows.reduce((sum, row) => sum + row.unverifiedCount, 0),
    total: rows.reduce((sum, row) => sum + row.totalCount, 0),
    fixturesReady: fixtures.filter((fixture) => fixture.composerReady).length,
    fixturesTotal: GOLDEN_FIXTURES.length,
    fixturesDue: fixtures.filter((fixture) => {
      if (!fixture.reviewDate) return false
      const review = new Date(`${fixture.reviewDate.slice(0, 10)}T12:00:00`)
      return !Number.isNaN(review.getTime()) && review <= dueBefore
    }).length,
  }
}

export function buildFixtureReport(rows: GoldenFixtureRow[]): GoldenFixtureRow[] {
  const bySlug = new Map(rows.map((row) => [row.slug, row]))
  return GOLDEN_FIXTURES.map((fixture) => {
    const row = bySlug.get(fixture.slug)
    return {
      slug: fixture.slug,
      name: row?.name ?? fixture.name,
      county: row?.county ?? '—',
      status: row?.status ?? 'missing',
      verificationStatus: row?.verificationStatus ?? null,
      isCurated: row?.isCurated ?? false,
      verifiedAt: row?.verifiedAt ?? null,
      reviewDate: row?.reviewDate ?? null,
      composerReady: row?.composerReady ?? false,
    }
  })
}

function csvCell(value: unknown): string {
  const text = value == null ? '' : String(value)
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text
}

export function toCsv(
  rows: Record<string, unknown>[],
  columns: { key: string; label: string }[],
): string {
  const header = columns.map((column) => csvCell(column.label)).join(',')
  const lines = rows.map((row) =>
    columns.map((column) => csvCell(row[column.key])).join(','),
  )
  return [header, ...lines].join('\n')
}

export function coverageCsv(rows: CoverageRow[]): string {
  return toCsv(rows as unknown as Record<string, unknown>[], [
    { key: 'countyCode', label: 'county_code' },
    { key: 'county', label: 'county' },
    { key: 'curatedCount', label: 'curated_count' },
    { key: 'unverifiedCount', label: 'unverified_count' },
    { key: 'totalCount', label: 'total_count' },
    { key: 'coverageStatus', label: 'coverage_status' },
  ])
}

export function fixturesCsv(rows: GoldenFixtureRow[]): string {
  return toCsv(rows as unknown as Record<string, unknown>[], [
    { key: 'slug', label: 'slug' },
    { key: 'name', label: 'name' },
    { key: 'county', label: 'county' },
    { key: 'status', label: 'status' },
    { key: 'verificationStatus', label: 'verification_status' },
    { key: 'isCurated', label: 'is_curated' },
    { key: 'verifiedAt', label: 'verified_at' },
    { key: 'reviewDate', label: 'review_date' },
    { key: 'composerReady', label: 'composer_ready' },
  ])
}

export const CATEGORY_OPTIONS = DESTINATION_CATEGORIES
