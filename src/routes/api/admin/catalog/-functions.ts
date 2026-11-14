import { randomUUID } from 'node:crypto'
import { auth } from '#/lib/auth'
import { catalogDb as db } from '#/db/catalog'
import { requirePermission } from '#/lib/authz'
import { sql } from 'drizzle-orm'
import {
  buildFixtureReport,
  canTransition,
  defaultReviewDate,
  evaluateComposerReadiness,
  isFiniteCoordinate,
  slugify,
  type CoverageRow,
  type CurationCandidate,
  type CurationStatus,
  type FeeStatus,
  type GoldenFixtureRow,
  type OpeningHoursStatus,
  type ReviewFields,
} from '#/lib/curation'
import { GOLDEN_FIXTURES } from '#/lib/curation'

type SessionLike = { user: { id: string; role?: string | null; name?: string | null; email?: string | null } }

interface CandidateRow {
  place_id: string
  name: string
  address: string | null
  county_code: string
  county: string
  locality: string | null
  category: string
  interest_tags: string[]
  latitude: number
  longitude: number
  rating: number | null
  review_count: number | null
  price_level: string | null
  hero_image_url: string | null
  hero_image_attribution: string | null
  opening_hours: unknown
  google_types: string[]
  fetched_at: string
  expires_at: string
  curation_status: CurationStatus
  destination_id: string | null
  reviewed_by: string | null
  reviewed_at: string | null
  rejection_reason: string | null
  destination_name: string | null
  destination_slug: string | null
  destination_status: string | null
  destination_category: string | null
  destination_interest_tags: string[] | null
  destination_locality: string | null
  destination_opening_hours: unknown
  verification_status: string | null
  is_curated: boolean | null
  verified_at: string | null
  content_owner: string | null
  review_date: string | null
  short_description: string | null
  duration_min_minutes: number | null
  duration_max_minutes: number | null
  fee_status: string | null
  fee_currency: string | null
  fee_amount: number | null
  fee_basis: string | null
  opening_hours_status: string | null
  transport_modes: string[] | null
  best_seasons: string[] | null
  destination_hero_image_url: string | null
  destination_hero_image_attribution: string | null
}

function rowDestinationName(candidate: CurationCandidate): string {
  return candidate.destinationName ?? candidate.name
}

function rowDestinationCategory(candidate: CurationCandidate): string {
  return candidate.destinationCategory ?? candidate.category
}

function rowDestinationInterests(candidate: CurationCandidate): string[] {
  return candidate.destinationInterestTags ?? candidate.interestTags
}

function toCandidate(row: CandidateRow): CurationCandidate {
  return {
    placeId: row.place_id,
    name: row.name,
    address: row.address,
    countyCode: row.county_code,
    county: row.county,
    locality: row.locality,
    category: row.category,
    interestTags: row.interest_tags ?? [],
    latitude: Number(row.latitude),
    longitude: Number(row.longitude),
    rating: row.rating == null ? null : Number(row.rating),
    reviewCount: row.review_count,
    priceLevel: row.price_level,
    heroImageUrl: row.hero_image_url,
    heroImageAttribution: row.hero_image_attribution,
    openingHours: row.opening_hours,
    googleTypes: row.google_types ?? [],
    fetchedAt: row.fetched_at,
    expiresAt: row.expires_at,
    curationStatus: row.curation_status,
    destinationId: row.destination_id,
    reviewedBy: row.reviewed_by,
    reviewedAt: row.reviewed_at,
    rejectionReason: row.rejection_reason,
    destinationName: row.destination_name,
    destinationCategory: row.destination_category,
    destinationInterestTags: row.destination_interest_tags,
    destinationLocality: row.destination_locality,
    destinationOpeningHours: row.destination_opening_hours,
    destination: row.destination_slug
      ? {
          slug: row.destination_slug,
          status: row.destination_status ?? 'draft',
          verificationStatus: row.verification_status,
          isCurated: !!row.is_curated,
          verifiedAt: row.verified_at,
          contentOwner: row.content_owner,
          reviewDate: row.review_date,
          shortDescription: row.short_description,
          durationMinMinutes: row.duration_min_minutes,
          durationMaxMinutes: row.duration_max_minutes,
          feeStatus: (row.fee_status as FeeStatus | null) ?? null,
          feeCurrency: row.fee_currency,
          feeAmount: row.fee_amount,
          feeBasis: row.fee_basis,
          openingHoursStatus: (row.opening_hours_status as OpeningHoursStatus | null) ?? null,
          transportModes: row.transport_modes ?? [],
          bestSeasons: row.best_seasons ?? [],
          heroImageUrl: row.destination_hero_image_url,
          heroImageAttribution: row.destination_hero_image_attribution,
        }
      : null,
  }
}

const candidateSelect = sql`
  SELECT c.place_id, c.name, c.address, c.county_code, k.adm1_name AS county,
         c.locality, c.category, c.interest_tags,
         ST_Y(c.location::geometry) AS latitude, ST_X(c.location::geometry) AS longitude,
         c.rating, c.review_count, c.price_level,
         c.hero_image_url, c.hero_image_attribution, c.opening_hours, c.google_types,
         c.fetched_at, c.expires_at, c.curation_status, c.destination_id,
         c.reviewed_by, c.reviewed_at, c.rejection_reason,
         d.name AS destination_name, d.slug AS destination_slug, d.status AS destination_status,
         d.category AS destination_category, d.interest_tags AS destination_interest_tags,
         d.locality AS destination_locality, d.opening_hours AS destination_opening_hours,
         d.verification_status, d.is_curated, d.verified_at,
         d.content_owner, d.review_date, d.short_description,
         d.visit_duration_min_minutes AS duration_min_minutes,
         d.visit_duration_max_minutes AS duration_max_minutes,
         d.fee_status, d.fee_currency, d.fee_amount, d.fee_basis,
         d.opening_hours_status, d.transport_modes, d.best_seasons,
         d.hero_image_url AS destination_hero_image_url,
         d.hero_image_attribution AS destination_hero_image_attribution
  FROM composer_unverified_candidates c
  JOIN kenya_counties k ON k.county_code = c.county_code
  LEFT JOIN destinations d ON d.id = c.destination_id OR (c.destination_id IS NULL AND d.google_place_id = c.place_id)
`

async function requireSession(headers: Record<string, string>): Promise<SessionLike> {
  const session = await auth.api.getSession({ headers }) as SessionLike | null
  if (!session) throw new HttpError(401, 'Unauthorized')
  return session
}

function toAuthSession(session: SessionLike) {
  return { user: { role: session.user.role ?? '' } }
}

function parsePositiveInt(value: unknown, fallback: number, max: number): number {
  const number = Number(value)
  if (!Number.isFinite(number) || number <= 0) return fallback
  return Math.min(Math.floor(number), max)
}

function str(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value.trim() : fallback
}

function nullableNum(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null
  const number = Number(value)
  return Number.isFinite(number) ? number : null
}

function strArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : []
}

export function fieldsFromCandidate(candidate: CurationCandidate): ReviewFields {
  const destination = candidate.destination
  return {
    name: rowDestinationName(candidate),
    countyCode: candidate.countyCode,
    county: candidate.county,
    locality: candidate.destinationLocality ?? candidate.locality ?? '',
    category: rowDestinationCategory(candidate),
    interestTags: rowDestinationInterests(candidate),
    latitude: candidate.latitude,
    longitude: candidate.longitude,
    shortDescription: destination?.shortDescription ?? '',
    durationMinMinutes: destination?.durationMinMinutes ?? null,
    durationMaxMinutes: destination?.durationMaxMinutes ?? null,
    feeStatus: destination?.feeStatus ?? null,
    feeCurrency: destination?.feeCurrency ?? 'KES',
    feeAmount: destination?.feeAmount ?? null,
    feeBasis: destination?.feeBasis ?? '',
    openingHoursStatus:
      destination?.openingHoursStatus ??
      (candidate.openingHours != null ? ('unverified' as OpeningHoursStatus) : null),
    openingHours: destination?.openingHoursStatus === 'verified'
      ? (candidate.destinationOpeningHours ?? candidate.openingHours)
      : candidate.openingHours,
    transportModes: destination?.transportModes ?? [],
    bestSeasons: destination?.bestSeasons ?? [],
    heroImageUrl: destination?.heroImageUrl ?? candidate.heroImageUrl ?? '',
    heroImageAttribution:
      destination?.heroImageAttribution ?? candidate.heroImageAttribution ?? '',
    source: 'google_places',
    contentOwner: destination?.contentOwner ?? 'YTCI Content Team',
    reviewDate: destination?.reviewDate?.slice(0, 10) ?? defaultReviewDate(),
  }
}

export function parseReviewFields(body: Record<string, unknown>): ReviewFields {
  return {
    name: str(body.name),
    countyCode: str(body.countyCode),
    county: str(body.county),
    locality: str(body.locality),
    category: str(body.category),
    interestTags: strArray(body.interestTags),
    latitude: nullableNum(body.latitude),
    longitude: nullableNum(body.longitude),
    shortDescription: str(body.shortDescription),
    durationMinMinutes: nullableNum(body.durationMinMinutes),
    durationMaxMinutes: nullableNum(body.durationMaxMinutes),
    feeStatus: (str(body.feeStatus) || null) as FeeStatus | null,
    feeCurrency: str(body.feeCurrency, 'KES') || 'KES',
    feeAmount: nullableNum(body.feeAmount),
    feeBasis: str(body.feeBasis),
    openingHoursStatus: (str(body.openingHoursStatus) || null) as OpeningHoursStatus | null,
    openingHours: body.openingHours ?? null,
    transportModes: strArray(body.transportModes),
    bestSeasons: strArray(body.bestSeasons),
    heroImageUrl: str(body.heroImageUrl),
    heroImageAttribution: str(body.heroImageAttribution),
    source: str(body.source, 'google_places') || 'google_places',
    contentOwner: str(body.contentOwner),
    reviewDate: str(body.reviewDate),
  }
}

function sqlTextArray(values: string[]) {
  if (values.length === 0) return sql`ARRAY[]::text[]`
  return sql`ARRAY[${sql.join(values.map((value) => sql`${value}`), sql`, `)}]::text[]`
}

function draftErrors(fields: ReviewFields): Record<string, string> {
  const errors: Record<string, string> = {}
  if (!fields.name) errors.name = 'A name is required.'
  if (!fields.countyCode) errors.countyCode = 'A county is required.'
  if (!fields.category) errors.category = 'Choose a category.'
  if (fields.feeStatus === 'not_verified' && !fields.feeBasis) {
    errors.feeBasis = 'Unverified fees need a basis.'
  }
  if (fields.openingHoursStatus === 'verified' && fields.openingHours == null) {
    errors.openingHours = 'Verified hours need structured data.'
  }
  if (fields.heroImageUrl && !fields.heroImageAttribution) {
    errors.heroImageAttribution = 'A hero image needs a credit.'
  }
  if (fields.reviewDate && Number.isNaN(new Date(`${fields.reviewDate}T12:00:00`).getTime())) {
    errors.reviewDate = 'Use a valid date.'
  }
  return errors
}

async function loadCandidate(placeId: string): Promise<CurationCandidate | null> {
  const result = await db.execute(sql`
    ${candidateSelect}
    WHERE c.place_id = ${placeId}
    LIMIT 1
  `)
  const row = (result.rows as unknown as CandidateRow[])[0]
  return row ? toCandidate(row) : null
}

export async function handleQueue(headers: Record<string, string>, params: URLSearchParams) {
  const session = await requireSession(headers)
  requirePermission(toAuthSession(session), 'catalog', ['read'])
  const limit = parsePositiveInt(params.get('limit'), 25, 100)
  const offset = Math.max(0, Number(params.get('offset')) || 0)
  const status = params.get('status')
  const county = params.get('county')
  const search = params.get('search')?.trim()

  const conditions = [sql`1 = 1`]
  if (status) conditions.push(sql`c.curation_status = ${status}`)
  if (county) conditions.push(sql`c.county_code = ${county}`)
  if (search) {
    conditions.push(sql`(c.name ILIKE ${`%${search}%`} OR COALESCE(c.address, '') ILIKE ${`%${search}%`})`)
  }
  const where = sql.join(conditions, sql` AND `)

  const [rowsResult, countResult] = await Promise.all([
    db.execute(sql`
      ${candidateSelect}
      WHERE ${where}
      ORDER BY CASE c.curation_status
        WHEN 'pending' THEN 0 WHEN 'draft' THEN 1 WHEN 'published' THEN 2 ELSE 3 END,
        c.fetched_at DESC
      LIMIT ${limit} OFFSET ${offset}
    `),
    db.execute(sql`
      SELECT count(*)::int AS total
      FROM composer_unverified_candidates c
      WHERE ${where}
    `),
  ])

  return {
    items: (rowsResult.rows as unknown as CandidateRow[]).map(toCandidate),
    total: Number((countResult.rows[0] as Record<string, unknown>)?.total ?? 0),
    limit,
    offset,
  }
}

export async function handleCandidate(headers: Record<string, string>, placeId: string) {
  const session = await requireSession(headers)
  requirePermission(toAuthSession(session), 'catalog', ['read'])
  if (!placeId) throw new HttpError(400, 'Missing place id')
  const candidate = await loadCandidate(placeId)
  if (!candidate) throw new HttpError(404, 'Candidate not found')
  const fields = fieldsFromCandidate(candidate)
  return {
    candidate,
    fields,
    readiness: evaluateComposerReadiness(fields),
  }
}

export async function handleCoverage(headers: Record<string, string>) {
  const session = await requireSession(headers)
  requirePermission(toAuthSession(session), 'catalog', ['read'])

  const [coverageResult, fixtureResult, queueResult] = await Promise.all([
    db.execute(sql`
      SELECT county_code, county, curated_count, unverified_count, total_count, coverage_status
      FROM composer_county_coverage
      ORDER BY county_code
    `),
    db.execute(sql`
      SELECT d.slug, d.name, k.adm1_name AS county, d.status, d.verification_status,
             d.is_curated, d.verified_at, d.review_date,
             EXISTS (
               SELECT 1 FROM composer_catalog c WHERE c.destination_id = d.id
             ) AS composer_ready
      FROM destinations d
      JOIN kenya_counties k ON k.county_code = d.county_code
      WHERE d.slug IN (${sql.join(GOLDEN_FIXTURES.map((fixture) => sql`${fixture.slug}`), sql`, `)})
      ORDER BY d.name
    `),
    db.execute(sql`
      SELECT curation_status, count(*)::int AS count
      FROM composer_unverified_candidates
      GROUP BY curation_status
    `),
  ])

  const coverage: CoverageRow[] = (coverageResult.rows as unknown as Record<string, unknown>[]).map((row) => ({
    countyCode: String(row.county_code),
    county: String(row.county),
    curatedCount: Number(row.curated_count),
    unverifiedCount: Number(row.unverified_count),
    totalCount: Number(row.total_count),
    coverageStatus: String(row.coverage_status) as CoverageRow['coverageStatus'],
  }))

  const fixtures: GoldenFixtureRow[] = (fixtureResult.rows as unknown as Record<string, unknown>[]).map((row) => ({
    slug: String(row.slug),
    name: String(row.name),
    county: String(row.county),
    status: String(row.status),
    verificationStatus: row.verification_status == null ? null : String(row.verification_status),
    isCurated: !!row.is_curated,
    verifiedAt: row.verified_at == null ? null : String(row.verified_at),
    reviewDate: row.review_date == null ? null : String(row.review_date),
    composerReady: !!row.composer_ready,
  }))

  const queueCounts = Object.fromEntries(
    (queueResult.rows as unknown as Record<string, unknown>[]).map((row) => [
      String(row.curation_status),
      Number(row.count),
    ]),
  ) as Record<CurationStatus, number>

  return {
    coverage,
    fixtures: buildFixtureReport(fixtures),
    queueCounts: {
      pending: queueCounts.pending ?? 0,
      draft: queueCounts.draft ?? 0,
      published: queueCounts.published ?? 0,
      rejected: queueCounts.rejected ?? 0,
    },
    generatedAt: new Date().toISOString(),
  }
}

async function resolveCounty(countyCode: string): Promise<string> {
  const result = await db.execute(sql`
    SELECT adm1_name FROM kenya_counties WHERE county_code = ${countyCode} LIMIT 1
  `)
  const row = result.rows[0] as Record<string, unknown> | undefined
  if (!row?.adm1_name) throw new HttpError(422, 'Unknown county code')
  return String(row.adm1_name)
}

async function uniqueSlug(
  tx: Parameters<Parameters<typeof db.transaction>[0]>[0],
  name: string,
  placeId: string,
): Promise<string> {
  const base = slugify(name) || 'place'
  let candidate = base
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const result = await tx.execute(sql`SELECT 1 FROM destinations WHERE slug = ${candidate} LIMIT 1`)
    if (result.rows.length === 0) return candidate
    candidate = `${base}-${placeId.slice(-6).toLowerCase()}${attempt > 0 ? `-${attempt}` : ''}`
  }
  return `${base}-${randomUUID().slice(0, 8)}`
}

interface DestinationWrite {
  candidate: CurationCandidate
  fields: ReviewFields
  county: string
  publish: boolean
}

async function writeDestination(tx: Parameters<Parameters<typeof db.transaction>[0]>[0], input: DestinationWrite) {
  const { candidate, fields, county, publish } = input
  const existing = candidate.destinationId
    ? await tx.execute(sql`SELECT id, slug FROM destinations WHERE id = ${candidate.destinationId} LIMIT 1`)
    : await tx.execute(sql`SELECT id, slug FROM destinations WHERE google_place_id = ${candidate.placeId} LIMIT 1`)
  let existingRow = existing.rows[0] as Record<string, unknown> | undefined
  const slug = existingRow?.slug
    ? String(existingRow.slug)
    : await uniqueSlug(tx, fields.name, candidate.placeId)
  const openingHours = fields.openingHours == null ? null : JSON.stringify(fields.openingHours)
  const location = isFiniteCoordinate(fields.latitude) && isFiniteCoordinate(fields.longitude)
    ? sql`ST_SetSRID(ST_MakePoint(${fields.longitude}, ${fields.latitude}), 4326)`
    : sql`NULL`
  const transportModes = sqlTextArray(fields.transportModes)
  const bestSeasons = sqlTextArray(fields.bestSeasons)
  const interestTags = sqlTextArray(fields.interestTags)

  const values = sql`
    ${fields.name}, ${slug}, ${county}, ${fields.countyCode}, ${fields.locality || null},
    ${fields.category}, ${publish ? 'published' : 'draft'}, ${location},
    ${fields.shortDescription || null}, ${fields.durationMinMinutes}, ${fields.durationMaxMinutes},
    ${fields.feeStatus}, ${fields.feeCurrency || null}, ${fields.feeAmount}, ${fields.feeBasis || null},
    ${fields.openingHoursStatus}, ${openingHours}::jsonb,
    ${transportModes}, ${bestSeasons},
    ${fields.heroImageUrl || null}, ${fields.heroImageAttribution || null},
    ${fields.source || 'google_places'}, ${fields.contentOwner || null},
    ${publish ? 'verified' : 'pending'},
    ${publish ? sql`now()` : sql`NULL`}, NULL, ${publish},
    ${fields.reviewDate || null}, ${sql`now()`},
    ${candidate.placeId}, ${interestTags},
    NULL
  `

  if (existingRow?.id) {
    await tx.execute(sql`
      UPDATE destinations SET
        name = ${fields.name}, slug = ${slug}, county = ${county}, county_code = ${fields.countyCode},
        locality = ${fields.locality || null}, category = ${fields.category},
        status = ${publish ? 'published' : 'draft'}, location = ${location},
        short_description = ${fields.shortDescription || null},
        visit_duration_min_minutes = ${fields.durationMinMinutes},
        visit_duration_max_minutes = ${fields.durationMaxMinutes},
        fee_status = ${fields.feeStatus}, fee_currency = ${fields.feeCurrency || null},
        fee_amount = ${fields.feeAmount}, fee_basis = ${fields.feeBasis || null},
        opening_hours_status = ${fields.openingHoursStatus},
        opening_hours = ${openingHours}::jsonb,
        transport_modes = ${transportModes},
        best_seasons = ${bestSeasons},
        hero_image_url = ${fields.heroImageUrl || null},
        hero_image_attribution = ${fields.heroImageAttribution || null},
        source = ${fields.source || 'google_places'},
        content_owner = ${fields.contentOwner || null},
        verification_status = ${publish ? 'verified' : 'pending'},
        verified_at = ${publish ? sql`now()` : sql`NULL`},
        verified_by = NULL,
        is_curated = ${publish},
        review_date = ${fields.reviewDate || null},
        last_updated = now(),
        google_place_id = ${candidate.placeId},
        interest_tags = ${interestTags}
      WHERE id = ${String(existingRow.id)}
      RETURNING id, slug
    `)
  } else {
    const inserted = await tx.execute(sql`
      INSERT INTO destinations (
        name, slug, county, county_code, locality, category, status, location,
        short_description, visit_duration_min_minutes, visit_duration_max_minutes,
        fee_status, fee_currency, fee_amount, fee_basis, opening_hours_status,
        opening_hours, transport_modes, best_seasons, hero_image_url,
        hero_image_attribution, source, content_owner, verification_status,
        verified_at, verified_by, is_curated, review_date, last_updated,
        google_place_id, interest_tags, created_by
      ) VALUES (${values})
      RETURNING id, slug
    `)
    existingRow = inserted.rows[0] as Record<string, unknown> | undefined
  }

  const destinationId = String(existingRow?.id ?? '')
  if (!destinationId) throw new HttpError(500, 'Destination write failed')
  return { destinationId, slug }
}

export async function handleSaveDraft(headers: Record<string, string>, body: Record<string, unknown>) {
  const session = await requireSession(headers)
  requirePermission(toAuthSession(session), 'catalog', ['edit'])
  const placeId = str(body.placeId)
  if (!placeId) throw new HttpError(400, 'Missing place id')
  const candidate = await loadCandidate(placeId)
  if (!candidate) throw new HttpError(404, 'Candidate not found')
  if (!canTransition(candidate.curationStatus, 'draft')) {
    throw new HttpError(409, `Cannot move a ${candidate.curationStatus} row to draft`)
  }
  const fields = parseReviewFields((body.fields ?? {}) as Record<string, unknown>)
  const errors = draftErrors(fields)
  if (Object.keys(errors).length > 0) {
    throw new HttpError(422, 'Fix the highlighted fields before saving a draft', errors)
  }
  const county = await resolveCounty(fields.countyCode)
  const readiness = evaluateComposerReadiness(fields)
  const result = await db.transaction(async (tx) => {
    const written = await writeDestination(tx, {
      candidate,
      fields,
      county,
      publish: false,
    })
    await tx.execute(sql`
      UPDATE composer_unverified_candidates
      SET curation_status = 'draft', destination_id = ${written.destinationId},
          reviewed_by = ${session.user.id}, reviewed_at = now(), rejection_reason = NULL
      WHERE place_id = ${placeId}
    `)
    return written
  })
  return { ...result, status: 'draft', readiness }
}

export async function handlePublish(headers: Record<string, string>, body: Record<string, unknown>) {
  const session = await requireSession(headers)
  requirePermission(toAuthSession(session), 'catalog', ['publish'])
  const placeId = str(body.placeId)
  if (!placeId) throw new HttpError(400, 'Missing place id')
  const candidate = await loadCandidate(placeId)
  if (!candidate) throw new HttpError(404, 'Candidate not found')
  if (!canTransition(candidate.curationStatus, 'published')) {
    throw new HttpError(409, `Cannot publish a ${candidate.curationStatus} row`)
  }
  const fields = parseReviewFields((body.fields ?? {}) as Record<string, unknown>)
  const readiness = evaluateComposerReadiness(fields)
  if (!readiness.ready) {
    throw new HttpError(422, 'The composer-ready checklist is incomplete', readiness.errors, readiness.checks)
  }
  const county = await resolveCounty(fields.countyCode)
  const result = await db.transaction(async (tx) => {
    const written = await writeDestination(tx, {
      candidate,
      fields,
      county,
      publish: true,
    })
    await tx.execute(sql`
      UPDATE composer_unverified_candidates
      SET curation_status = 'published', destination_id = ${written.destinationId},
          reviewed_by = ${session.user.id}, reviewed_at = now(), rejection_reason = NULL
      WHERE place_id = ${placeId}
    `)
    return written
  })
  return { ...result, status: 'published', readiness }
}

export async function handleReject(headers: Record<string, string>, body: Record<string, unknown>) {
  const session = await requireSession(headers)
  requirePermission(toAuthSession(session), 'catalog', ['edit'])
  const placeId = str(body.placeId)
  const reason = str(body.reason)
  if (!placeId) throw new HttpError(400, 'Missing place id')
  if (!reason) throw new HttpError(422, 'A rejection reason is required')
  const candidate = await loadCandidate(placeId)
  if (!candidate) throw new HttpError(404, 'Candidate not found')
  if (!canTransition(candidate.curationStatus, 'rejected')) {
    throw new HttpError(409, `Cannot reject a ${candidate.curationStatus} row`)
  }
  await db.transaction(async (tx) => {
    if (candidate.destinationId) {
      await tx.execute(sql`
        UPDATE destinations SET status = 'archived', last_updated = now()
        WHERE id = ${candidate.destinationId} AND status = 'draft'
      `)
    }
    await tx.execute(sql`
      UPDATE composer_unverified_candidates
      SET curation_status = 'rejected', reviewed_by = ${session.user.id},
          reviewed_at = now(), rejection_reason = ${reason}
      WHERE place_id = ${placeId}
    `)
  })
  return { status: 'rejected' }
}

export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
    public fields?: Record<string, string>,
    public checks?: unknown,
  ) {
    super(message)
  }
}
