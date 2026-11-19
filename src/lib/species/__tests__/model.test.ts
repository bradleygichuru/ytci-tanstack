import { describe, expect, it } from 'vitest'
import {
  EMPTY_OVERLAY,
  aggregateCoverage,
  auditToCsv,
  baseEditChangesProse,
  buildCatalogueRows,
  buildTasks,
  buildVariantViews,
  computeRightsImpact,
  computeSourceImpact,
  deriveReadiness,
  deriveVariantStale,
  filterAudit,
  isRevocableSource,
  rightsIsActive,
  type BaseDraft,
  type SpeciesDetail,
  type SpeciesOverlayState,
  type SpeciesReviewItem,
  type SpeciesRights,
  type SpeciesSource,
} from '#/lib/species/model'

const source = (overrides: Partial<SpeciesSource> = {}): SpeciesSource => ({
  id: 'source-1',
  publisher: 'KWS',
  citation: 'KWS site records 2026',
  url: 'https://kws.go.ke',
  accessedAt: '2026-09-01',
  licenceCode: 'CC-BY-4.0',
  permittedUse: 'prose',
  attribution: 'Kenya Wildlife Service',
  reviewStatus: 'reviewed',
  ...overrides,
})

const detail = (overrides: Partial<SpeciesDetail> = {}): SpeciesDetail => ({
  slug: 'panthera-leo',
  scientificName: 'Panthera leo',
  nameEn: 'Lion',
  nameSw: 'Simba',
  iucnCategory: 'VU',
  taxonomicStatus: 'accepted',
  publicationState: 'published',
  languages: ['en', 'sw', 'mas'],
  id: 'species-1',
  rank: 'species',
  gbifKey: '5219404',
  iucn: {
    category: 'VU',
    assessmentId: 'TN-15951',
    redListVersion: '2026-1',
    asOf: '2026-06-01',
    label: 'Vulnerable',
  },
  content: {
    language: 'en',
    coverageTier: 'full',
    summary: 'A social big cat.',
    habitat: 'Savannah',
    whereToSee: 'Maasai Mara',
    reviewStatus: 'reviewed',
    sourceVersion: 3,
  },
  names: [
    { language: 'en', name: 'Lion', nameType: 'common', reviewStatus: 'reviewed', preferred: true },
    { language: 'sw', name: 'Simba', nameType: 'common', reviewStatus: 'reviewed', preferred: true },
    {
      language: 'mas',
      name: "Olng'ojine",
      nameType: 'local',
      region: 'Kajiado',
      reviewStatus: 'reviewed',
      preferred: true,
    },
    {
      language: 'kam',
      name: 'Simba',
      nameType: 'local',
      region: 'Machakos',
      reviewStatus: 'reviewed',
      preferred: false,
    },
  ],
  coverage: [
    { language: 'en', name: 'English', tier: 'full', available: true, audio: true, fallback: false },
    { language: 'sw', name: 'Swahili', tier: 'full', available: true, audio: true, fallback: false },
    { language: 'mas', name: 'Maasai', tier: 'names', available: true, audio: false, fallback: false },
    { language: 'kam', name: 'Kamba', tier: 'names', available: true, audio: false, fallback: false },
  ],
  audio: [
    {
      language: 'en',
      url: 'https://cdn/lion-en.mp3',
      narrator: 'Demo Narrator',
      transcript: 'The lion is a social big cat.',
      durationSeconds: 42,
      reviewStatus: 'reviewed',
      rights: null,
    },
  ],
  sources: [source()],
  whereToSee: [
    {
      destinationSlug: 'maasai-mara',
      countyGid: 34,
      county: 'Narok',
      protectedArea: 'Maasai Mara',
      evidenceType: 'survey',
      confidence: 'high',
      reviewStatus: 'reviewed',
      copy: 'Recorded at Maasai Mara',
      source: source(),
    },
  ],
  contentVersion: 3,
  ...overrides,
})

const rights = (overrides: Partial<SpeciesRights> = {}): SpeciesRights => ({
  id: 'rights-1',
  subjectType: 'media',
  subjectId: 'media-1',
  rightsHolder: 'YTCI',
  licenceCode: 'CC-BY-4.0',
  permittedUse: 'media',
  attribution: 'YTCI media team',
  consentRecord: 'consent-2026-03',
  expiresAt: null,
  withdrawnAt: null,
  ...overrides,
})

describe('derived stale', () => {
  it('keeps a reviewed variant clean when the source version matches', () => {
    expect(deriveVariantStale(detail(), 'en', EMPTY_OVERLAY)).toEqual({
      stale: false,
      reason: null,
    })
  })

  it('derives stale when the API marks the variant stale', () => {
    const stale = detail({
      content: { ...detail().content!, reviewStatus: 'stale', staleReason: 'Base habitat changed' },
    })
    expect(deriveVariantStale(stale, 'en', EMPTY_OVERLAY).stale).toBe(true)
    expect(deriveVariantStale(stale, 'en', EMPTY_OVERLAY).reason).toBe('Base habitat changed')
  })

  it('derives stale when the pinned source version trails the base revision', () => {
    const stale = detail({
      contentVersion: 5,
      content: { ...detail().content!, sourceVersion: 3 },
    })
    expect(deriveVariantStale(stale, 'en', EMPTY_OVERLAY).stale).toBe(true)
  })

  it('a saved draft at the same revision does not stale anything', () => {
    const overlay: SpeciesOverlayState = {
      ...EMPTY_OVERLAY,
      baseDrafts: {
        'panthera-leo': {
          scientificName: 'Panthera leo',
          slug: 'panthera-leo',
          authorship: '',
          taxonomicRank: 'species',
          taxonomicStatus: 'accepted',
          gbifKey: '5219404',
          iucnCategory: 'VU',
          iucnAssessmentId: 'TN-15951',
          redListVersion: '2026-1',
          baseRevision: 3,
          savedAt: '2026-11-18T09:00:00Z',
        },
      },
    }
    expect(deriveVariantStale(detail(), 'en', overlay).stale).toBe(false)
    expect(deriveVariantStale(detail(), 'sw', overlay).stale).toBe(false)
  })

  it('a local base edit stales every variant that carries prose', () => {
    const overlay: SpeciesOverlayState = {
      ...EMPTY_OVERLAY,
      baseDrafts: {
        'panthera-leo': {
          scientificName: 'Panthera leo',
          slug: 'panthera-leo',
          authorship: '',
          taxonomicRank: 'species',
          taxonomicStatus: 'accepted',
          gbifKey: '5219404',
          iucnCategory: 'VU',
          iucnAssessmentId: 'TN-15951',
          redListVersion: '2026-1',
          baseRevision: 4,
          savedAt: '2026-11-18T09:00:00Z',
        },
      },
    }
    expect(deriveVariantStale(detail(), 'en', overlay).stale).toBe(true)
    expect(deriveVariantStale(detail(), 'sw', overlay).stale).toBe(true)
    // A names-only variant carries no dependent prose.
    expect(deriveVariantStale(detail(), 'mas', overlay).stale).toBe(false)
  })

  it('does not stale a variant when only a local prose draft exists', () => {
    const overlay: SpeciesOverlayState = {
      ...EMPTY_OVERLAY,
      variantDrafts: {
        'panthera-leo:sw': {
          language: 'sw',
          tier: 'full',
          summary: '',
          description: '',
          habitat: 'Savana',
          range: '',
          whereToSee: '',
          conservation: '',
          status: 'draft',
          contributor: 'Brian',
          updatedAt: '2026-11-18T09:00:00Z',
        },
      },
    }
    expect(deriveVariantStale(detail(), 'sw', overlay).stale).toBe(false)
  })
})

describe('variant and coverage views', () => {
  it('lists every language from coverage, names and audio', () => {
    const views = buildVariantViews(detail(), EMPTY_OVERLAY)
    expect(views.map((view) => view.language)).toEqual(['en', 'sw', 'mas', 'kam'])
    expect(views.find((view) => view.language === 'mas')?.name).toBe("Olng'ojine")
    expect(views.find((view) => view.language === 'mas')?.region).toBe('Kajiado')
    expect(views.find((view) => view.language === 'en')?.hasAudioRecord).toBe(true)
  })

  it('counts names, prose and audio per language', () => {
    const aggregate = aggregateCoverage([detail()])
    expect(aggregate.find((entry) => entry.language === 'en')).toMatchObject({
      names: 1,
      prose: 1,
      audio: 1,
      total: 1,
    })
    expect(aggregate.find((entry) => entry.language === 'mas')).toMatchObject({
      names: 1,
      prose: 0,
      audio: 0,
    })
  })

  it('carries the overlay name draft into the coverage row', () => {
    const overlay: SpeciesOverlayState = {
      ...EMPTY_OVERLAY,
      nameDrafts: {
        'panthera-leo:mas': {
          language: 'mas',
          name: 'Olng’atuny',
          region: 'Narok',
          sourceLabel: 'Elder, Mara',
          contributor: 'Naserian',
          status: 'draft',
          updatedAt: '2026-11-18T00:00:00Z',
        },
      },
    }
    const view = buildVariantViews(detail(), overlay).find((entry) => entry.language === 'mas')
    expect(view?.name).toBe('Olng’atuny')
    expect(view?.nameStatus).toBe('draft')
    expect(view?.sourceLabel).toBe('Elder, Mara')
  })
})

describe('catalogue rows', () => {
  it('derives coverage, stale count and rights holds from records', () => {
    const overlay: SpeciesOverlayState = {
      ...EMPTY_OVERLAY,
      withdrawnSources: {
        'source-1': {
          sourceId: 'source-1',
          replacementId: null,
          reason: 'Licence changed',
          note: '',
          withdrawnAt: '2026-11-18T00:00:00Z',
          actor: 'Grace',
          affectedSpecies: ['panthera-leo'],
        },
      },
    }
    const rows = buildCatalogueRows(
      [
        {
          slug: 'panthera-leo',
          scientificName: 'Panthera leo',
          nameEn: 'Lion',
          iucnCategory: 'VU',
          taxonomicStatus: 'accepted',
          publicationState: 'published',
          languages: ['en', 'sw', 'mas'],
        },
      ],
      [detail()],
      overlay,
    )
    expect(rows[0]).toMatchObject({
      slug: 'panthera-leo',
      coveragePct: 100,
      staleCount: 0,
      hasRightsHold: true,
    })
  })
})

describe('sources and rights', () => {
  it('refuses to withdraw taxonomy, link-out and public-domain sources', () => {
    expect(isRevocableSource(source({ permittedUse: 'taxonomy_only' }))).toBe(false)
    expect(isRevocableSource(source({ permittedUse: 'link_only', licenceCode: 'IUCN' }))).toBe(false)
    expect(isRevocableSource(source({ licenceCode: 'CC0-1.0' }))).toBe(false)
    expect(isRevocableSource(source())).toBe(true)
  })

  it('computes the affected species and offers same-use replacements', () => {
    const detailWithMedia = detail({
      media: [
        {
          id: 'media-1',
          mediaKind: 'image',
          url: 'https://cdn/lion.jpg',
          credit: 'YTCI',
          rightsHolder: 'YTCI',
          licenceCode: 'CC-BY-4.0',
          sensitiveLocation: false,
          alt: {},
        },
      ],
    })
    const replacement = source({ id: 'source-2', publisher: 'Field survey 2026' })
    const impact = computeSourceImpact(
      source(),
      [detailWithMedia],
      [source(), replacement],
      [rights()],
    )
    expect(impact.revocable).toBe(true)
    expect(impact.affected).toEqual([{ slug: 'panthera-leo', name: 'Lion' }])
    expect(impact.replacementOptions.map((entry) => entry.id)).toEqual(['source-2'])
    expect(impact.rights.map((entry) => entry.id)).toEqual(['rights-1'])
  })

  it('treats expired or withdrawn rights as inactive', () => {
    expect(rightsIsActive(rights())).toBe(true)
    expect(rightsIsActive(rights({ withdrawnAt: '2026-01-01T00:00:00Z' }))).toBe(false)
    expect(rightsIsActive(rights({ expiresAt: '2020-01-01T00:00:00Z' }))).toBe(false)
    expect(
      computeRightsImpact(rights(), [
        detail({
          media: [
            {
              id: 'media-1',
              mediaKind: 'image',
              url: 'https://cdn/lion.jpg',
              credit: 'YTCI',
              rightsHolder: 'YTCI',
              licenceCode: 'CC-BY-4.0',
              sensitiveLocation: false,
              alt: {},
            },
          ],
        }),
      ]),
    ).toEqual([{ slug: 'panthera-leo', name: 'Lion' }])
  })
})

describe('translation queue', () => {
  it('builds type-specific tasks from review items and coverage gaps', () => {
    const reviewItems: SpeciesReviewItem[] = [
      {
        id: 'review-1',
        entityType: 'audio',
        entityId: 'audio-1',
        speciesSlug: 'panthera-leo',
        language: 'sw',
        stage: 'language',
        status: 'pending',
        assignedTo: 'language-reviewer-1',
        translatorRef: 'translator-2',
        reviewerRef: null,
        submittedAt: '2026-11-17T10:00:00Z',
      },
    ]
    const tasks = buildTasks(
      [
        detail({
          coverage: [
            ...detail().coverage!,
            {
              language: 'fr',
              name: 'French',
              tier: 'names',
              available: false,
              audio: false,
              fallback: true,
            },
          ],
        }),
      ],
      reviewItems,
      EMPTY_OVERLAY,
      Date.parse('2026-11-19T10:00:00Z'),
    )
    const audioTask = tasks.find((task) => task.reviewItemId === 'review-1')
    expect(audioTask).toMatchObject({
      type: 'audio',
      state: 'in_review',
      languageText: 'Swahili',
      age: '2d',
      assignee: 'language-reviewer-1',
    })
    expect(tasks.some((task) => task.type === 'name' && task.state === 'missing')).toBe(true)
    expect(tasks.some((task) => task.type === 'audio')).toBe(true)
  })

  it('marks a review item stale from the base revision, not a stored flag', () => {
    const reviewItems: SpeciesReviewItem[] = [
      {
        id: 'review-1',
        entityType: 'content',
        entityId: 'content-1',
        speciesSlug: 'panthera-leo',
        language: 'sw',
        stage: 'translation',
        status: 'pending',
        submittedAt: '2026-11-17T10:00:00Z',
      },
    ]
    const overlay: SpeciesOverlayState = {
      ...EMPTY_OVERLAY,
      baseDrafts: {
        'panthera-leo': {
          scientificName: 'Panthera leo',
          slug: 'panthera-leo',
          authorship: '',
          taxonomicRank: 'species',
          taxonomicStatus: 'accepted',
          gbifKey: '5219404',
          iucnCategory: 'VU',
          iucnAssessmentId: 'TN-15951',
          redListVersion: '2026-1',
          baseRevision: 4,
          savedAt: '2026-11-18T09:00:00Z',
        },
      },
    }
    const task = buildTasks([detail()], reviewItems, overlay).find(
      (entry) => entry.reviewItemId === 'review-1',
    )
    expect(task?.state).toBe('stale')
    expect(task?.staleReason).toContain('base field changed')
  })
})

describe('readiness', () => {
  const baseDraft: BaseDraft = {
    scientificName: 'Panthera leo',
    slug: 'panthera-leo',
    authorship: '',
    taxonomicRank: 'species',
    taxonomicStatus: 'accepted',
    gbifKey: '5219404',
    iucnCategory: 'VU',
    iucnAssessmentId: 'TN-15951',
    redListVersion: '2026-1',
    baseRevision: 4,
    savedAt: '2026-11-18T09:00:00Z',
  }

  it('links every blocker to the exact record or variant', () => {
    const result = deriveReadiness({
      detail: detail(),
      sources: [source()],
      rights: [],
      reviewItems: [],
      overlay: EMPTY_OVERLAY,
      tasks: buildTasks([detail()], [], EMPTY_OVERLAY),
    })
    expect(result.canPublish).toBe(false)
    expect(result.blockers.length).toBeGreaterThan(0)
    for (const blocker of result.blockers) {
      expect(blocker.record.id).toBeTruthy()
      expect(blocker.link.to).toMatch(/^\/programme\/species/)
    }
    const stale = result.blockers.find((blocker) => blocker.id === 'second_review')
    expect(stale?.record.id).toBe('panthera-leo:second')
  })

  it('blocks publish while a derived stale variant exists', () => {
    const result = deriveReadiness({
      detail: detail(),
      sources: [source()],
      rights: [],
      reviewItems: [],
      overlay: { ...EMPTY_OVERLAY, baseDrafts: { 'panthera-leo': baseDraft } },
      tasks: buildTasks([detail()], [], EMPTY_OVERLAY),
    })
    expect(result.blockers.find((blocker) => blocker.id === 'stale')?.ok).toBe(false)
  })

  it('clears the stale and second-review gates once both are recorded', () => {
    const overlay: SpeciesOverlayState = {
      ...EMPTY_OVERLAY,
      secondReviews: {
        'panthera-leo': {
          reviewer: 'language-reviewer-1',
          role: 'language_reviewer',
          decidedAt: '2026-11-18T10:00:00Z',
          note: 'Checked against the base.',
        },
      },
    }
    const result = deriveReadiness({
      detail: detail(),
      sources: [source()],
      rights: [],
      reviewItems: [],
      overlay,
      tasks: buildTasks([detail()], [], overlay),
    })
    expect(result.checks.find((check) => check.id === 'second_review')?.ok).toBe(true)
    expect(result.checks.find((check) => check.id === 'stale')?.ok).toBe(true)
  })

  it('blocks publish when a rights record was withdrawn', () => {
    const record = rights()
    const result = deriveReadiness({
      detail: detail(),
      sources: [source()],
      rights: [record],
      reviewItems: [],
      overlay: {
        ...EMPTY_OVERLAY,
        withdrawnRights: {
          [record.id]: {
            rightsId: record.id,
            reason: 'Consent withdrawn',
            note: '',
            withdrawnAt: '2026-11-18T00:00:00Z',
            actor: 'Grace',
            affectedSpecies: ['panthera-leo'],
          },
        },
      },
      tasks: buildTasks([detail()], [], EMPTY_OVERLAY),
    })
    expect(result.checks.find((check) => check.id === 'rights')?.ok).toBe(false)
    expect(result.canPublish).toBe(false)
  })
})

describe('audit', () => {
  it('mixes record-derived and session entries, newest first, then filters', () => {
    const records = [
      ...EMPTY_OVERLAY.audit,
      {
        id: 'session-1',
        at: '2026-11-18T12:00:00Z',
        actor: 'Amina',
        role: 'content_editor',
        action: 'Base saved',
        entityType: 'species',
        entityId: 'panthera-leo',
        category: 'content' as const,
        summary: 'Lion',
        detail: 'Revision draft',
        source: 'session' as const,
      },
    ]
    const all = [...records].sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime())
    const filtered = filterAudit(all, {
      actor: 'Amina',
      role: 'all',
      category: 'content',
      entity: 'lion',
      from: '2026-11-18',
      to: '2026-11-18',
    })
    expect(filtered).toHaveLength(1)
    expect(auditToCsv(filtered)).toContain('"Amina"')
    expect(auditToCsv(filtered).split('\n')).toHaveLength(2)
  })
})

describe('base edits', () => {
  it('stales prose only when a language-neutral field changed', () => {
    const noChange: BaseDraft = {
      scientificName: 'Panthera leo',
      slug: 'panthera-leo',
      authorship: '',
      taxonomicRank: 'species',
      taxonomicStatus: 'accepted',
      gbifKey: '5219404',
      iucnCategory: 'VU',
      iucnAssessmentId: 'TN-15951',
      redListVersion: '2026-1',
      baseRevision: 3,
      savedAt: '2026-11-18T00:00:00Z',
    }
    expect(baseEditChangesProse(detail(), noChange)).toBe(false)
    expect(baseEditChangesProse(detail(), { ...noChange, iucnCategory: 'EN' })).toBe(true)
  })

  it('compares a repeated save against the last saved draft', () => {
    const saved: BaseDraft = {
      scientificName: 'Panthera leo',
      slug: 'panthera-leo',
      authorship: '',
      taxonomicRank: 'species',
      taxonomicStatus: 'accepted',
      gbifKey: '5219404',
      iucnCategory: 'EN',
      iucnAssessmentId: 'TN-15951',
      redListVersion: '2026-1',
      baseRevision: 4,
      savedAt: '2026-11-18T00:00:00Z',
    }
    expect(baseEditChangesProse(detail(), { ...saved, savedAt: '2026-11-19T00:00:00Z' }, saved)).toBe(false)
    expect(baseEditChangesProse(detail(), { ...saved, iucnCategory: 'CR' }, saved)).toBe(true)
  })
})
