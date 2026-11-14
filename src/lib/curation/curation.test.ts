import { describe, expect, it } from 'vitest'
import {
  buildFixtureReport,
  canTransition,
  coverageCsv,
  coverageSummary,
  defaultReviewDate,
  evaluateComposerReadiness,
  fixturesCsv,
  slugify,
  type CoverageRow,
  type GoldenFixtureRow,
  type ReviewFields,
} from '#/lib/curation'

function validFields(overrides: Partial<ReviewFields> = {}): ReviewFields {
  return {
    name: 'Lake Nakuru National Park',
    countyCode: '032',
    county: 'Nakuru',
    locality: 'Nakuru',
    category: 'Wildlife',
    interestTags: ['Wildlife', 'Photography'],
    latitude: -0.3,
    longitude: 36.1,
    shortDescription: 'A rift-valley lake known for flamingos and rhinos.',
    durationMinMinutes: 120,
    durationMaxMinutes: 240,
    feeStatus: 'verified',
    feeCurrency: 'KES',
    feeAmount: 1200,
    feeBasis: 'Adult non-resident entry, 2026',
    openingHoursStatus: 'verified',
    openingHours: { monday: '06:00-18:00' },
    transportModes: ['car', '4x4'],
    bestSeasons: ['dry', 'green'],
    heroImageUrl: 'https://example.com/lake-nakuru.jpg',
    heroImageAttribution: 'YTCI Content Team',
    source: 'program',
    contentOwner: 'YTCI Content Team',
    reviewDate: '2026-12-14',
    ...overrides,
  }
}

describe('composer readiness', () => {
  it('passes a complete, reviewed place for publish', () => {
    const result = evaluateComposerReadiness(validFields())
    expect(result.contentReady).toBe(true)
    expect(result.ready).toBe(true)
    expect(result.errors).toEqual({})
  })

  it('keeps the hero image as a recommended check', () => {
    const result = evaluateComposerReadiness(validFields())
    expect(result.checks.find((check) => check.key === 'hero_image')?.required).toBe(false)
  })

  it('requires the fields the composer view actually needs', () => {
    const result = evaluateComposerReadiness(
      validFields({
        category: 'Nightlife',
        interestTags: [],
        shortDescription: '   ',
        durationMinMinutes: 300,
        durationMaxMinutes: 120,
        feeStatus: 'not_verified',
        feeBasis: '',
        openingHoursStatus: 'verified',
        openingHours: null,
        heroImageAttribution: '',
        contentOwner: '',
        reviewDate: 'not-a-date',
      }),
    )
    expect(result.ready).toBe(false)
    for (const key of [
      'category',
      'interests',
      'description',
      'duration',
      'fee_basis',
      'hours_data',
      'hero_attribution',
      'owner',
      'review_date',
    ]) {
      expect(result.errors[key]).toBeTruthy()
    }
  })

  it('accepts free places without a fee amount', () => {
    const result = evaluateComposerReadiness(
      validFields({
        feeStatus: 'free',
        feeAmount: null,
        feeBasis: '',
      }),
    )
    expect(result.ready).toBe(true)
  })

  it('rejects a one-line description with no substance', () => {
    const result = evaluateComposerReadiness(validFields({ shortDescription: 'Nice place.' }))
    expect(result.errors.description).toBeTruthy()
  })

  it('rejects a missing coordinate', () => {
    const result = evaluateComposerReadiness(validFields({ latitude: null }))
    expect(result.errors.coordinates).toBeTruthy()
  })
})

describe('queue transitions', () => {
  it('allows pending to draft, publish, or reject', () => {
    expect(canTransition('pending', 'draft')).toBe(true)
    expect(canTransition('pending', 'published')).toBe(true)
    expect(canTransition('pending', 'rejected')).toBe(true)
  })

  it('allows draft to publish, reject, or save again', () => {
    expect(canTransition('draft', 'draft')).toBe(true)
    expect(canTransition('draft', 'published')).toBe(true)
    expect(canTransition('draft', 'rejected')).toBe(true)
  })

  it('does not let a published row be rejected or downgraded', () => {
    expect(canTransition('published', 'published')).toBe(true)
    expect(canTransition('published', 'rejected')).toBe(false)
    expect(canTransition('published', 'draft')).toBe(false)
  })

  it('allows a rejected row to be reopened as a draft', () => {
    expect(canTransition('rejected', 'draft')).toBe(true)
    expect(canTransition('rejected', 'published')).toBe(false)
  })
})

describe('coverage report', () => {
  const coverage: CoverageRow[] = [
    {
      countyCode: '047',
      county: 'Nairobi',
      curatedCount: 1,
      unverifiedCount: 0,
      totalCount: 1,
      coverageStatus: 'limited',
    },
    {
      countyCode: '032',
      county: 'Nakuru',
      curatedCount: 3,
      unverifiedCount: 2,
      totalCount: 5,
      coverageStatus: 'covered',
    },
    {
      countyCode: '011',
      county: 'Isiolo',
      curatedCount: 0,
      unverifiedCount: 0,
      totalCount: 0,
      coverageStatus: 'not_covered',
    },
  ]

  const fixture = (overrides: Partial<GoldenFixtureRow> = {}): GoldenFixtureRow => ({
    slug: 'amboseli',
    name: 'Amboseli',
    county: 'Kajiado',
    status: 'published',
    verificationStatus: 'verified',
    isCurated: true,
    verifiedAt: '2026-11-14T12:00:00Z',
    reviewDate: '2026-12-14',
    composerReady: true,
    ...overrides,
  })

  it('counts covered, limited, not-covered, curated, and unverified rows', () => {
    const summary = coverageSummary(coverage, [fixture()], new Date('2026-11-14T12:00:00Z'))
    expect(summary.counties).toBe(3)
    expect(summary.covered).toBe(1)
    expect(summary.limited).toBe(1)
    expect(summary.notCovered).toBe(1)
    expect(summary.curated).toBe(4)
    expect(summary.unverified).toBe(2)
    expect(summary.total).toBe(6)
    expect(summary.fixturesReady).toBe(1)
    expect(summary.fixturesTotal).toBe(10)
  })

  it('marks missing golden fixtures and due reviews', () => {
    const rows = buildFixtureReport([
      fixture({ reviewDate: '2026-11-20' }),
      fixture({ slug: 'diani-beach', name: 'Diani Beach', composerReady: false }),
    ])
    expect(rows).toHaveLength(10)
    expect(rows.find((row) => row.slug === 'amboseli')?.composerReady).toBe(true)
    expect(rows.find((row) => row.slug === 'diani-beach')?.composerReady).toBe(false)
    expect(rows.find((row) => row.slug === 'fort-jesus')?.status).toBe('missing')
    expect(
      coverageSummary(coverage, rows, new Date('2026-11-14T12:00:00Z')).fixturesDue,
    ).toBe(2)
  })

  it('exports CSV with quoting and one row per county', () => {
    const csv = coverageCsv([
      { ...coverage[0], county: 'Nairobi, "Central"' },
    ])
    expect(csv.split('\n')[0]).toBe(
      'county_code,county,curated_count,unverified_count,total_count,coverage_status',
    )
    expect(csv).toContain('"Nairobi, ""Central"""')
  })

  it('exports golden fixture status as CSV', () => {
    const csv = fixturesCsv(buildFixtureReport([fixture()]))
    expect(csv.split('\n')[0]).toContain('slug,name,county,status')
    expect(csv).toContain('amboseli,Amboseli,Kajiado,published')
    expect(csv).toContain('fort-jesus,Fort Jesus,')
  })
})

describe('helpers', () => {
  it('slugifies names and defaults the monthly review date', () => {
    expect(slugify('  Lake Nakuru National Park! ')).toBe('lake-nakuru-national-park')
    expect(defaultReviewDate(30, new Date('2026-11-14T12:00:00Z'))).toBe('2026-12-14')
  })
})
