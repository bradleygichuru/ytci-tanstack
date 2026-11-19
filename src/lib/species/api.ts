/**
 * Contract reads for the species admin surface.
 *
 * Every request goes through the shared typed client; no screen builds its own
 * fetch wrapper. Fixture states travel as `?state=` so the mock can return the
 * empty, error and stale variants through the same code path as production.
 */
import { useMemo } from 'react'
import { useQueries, useQuery } from '@tanstack/react-query'
import {
  createContractsClient,
  isStale,
  unwrap,
  type FixtureState,
} from '#/lib/contracts/client'
import type {
  SpeciesDetail,
  SpeciesReviewItem,
  SpeciesRights,
  SpeciesSource,
  SpeciesSummary,
} from '#/lib/species/model'

export type SpeciesClient = ReturnType<typeof createContractsClient>

export function useSpeciesClient(fixtureState: FixtureState): SpeciesClient {
  return useMemo(
    () =>
      createContractsClient({
        fixtureState: fixtureState === 'default' ? undefined : fixtureState,
      }),
    [fixtureState],
  )
}

export interface SpeciesCatalogueResult {
  items: SpeciesSummary[]
  truncated: boolean
}

const MAX_PAGES = 20

/** Loads the catalogue through the cursor until the API reports the end. */
export async function fetchAllSpecies(client: SpeciesClient): Promise<SpeciesCatalogueResult> {
  const items: SpeciesSummary[] = []
  let cursor: string | undefined
  for (let page = 0; page < MAX_PAGES; page += 1) {
    const result = await client.GET('/v1/admin/species', {
      params: { query: { limit: 100, ...(cursor ? { cursor } : {}) } },
    })
    const body = unwrap(result)
    items.push(...(body.items ?? []))
    if (!body.hasMore || !body.nextCursor) {
      return { items, truncated: false }
    }
    cursor = body.nextCursor
  }
  return { items, truncated: true }
}

export function useSpeciesCatalogue(client: SpeciesClient, fixtureState: FixtureState) {
  return useQuery({
    queryKey: ['species', 'catalogue', fixtureState],
    queryFn: async () => {
      const result = await fetchAllSpecies(client)
      return result
    },
    staleTime: 30_000,
  })
}

export function useSpeciesReviewQueue(
  client: SpeciesClient,
  fixtureState: FixtureState,
  stage?: SpeciesReviewItem['stage'],
) {
  return useQuery({
    queryKey: ['species', 'review', fixtureState, stage ?? 'all'],
    queryFn: async () => {
      const result = await client.GET('/v1/admin/species/review', {
        params: { query: { limit: 100, ...(stage ? { stage } : {}) } },
      })
      const body = unwrap(result)
      return { items: body.items ?? [], stale: isStale(result.response) }
    },
    staleTime: 30_000,
  })
}

export function useSpeciesSources(client: SpeciesClient, fixtureState: FixtureState) {
  return useQuery({
    queryKey: ['species', 'sources', fixtureState],
    queryFn: async () => {
      const result = await client.GET('/v1/admin/species/sources')
      const body = unwrap(result)
      return { items: body.items ?? [], stale: isStale(result.response) }
    },
    staleTime: 30_000,
  })
}

export function useSpeciesRights(client: SpeciesClient, fixtureState: FixtureState) {
  return useQuery({
    queryKey: ['species', 'rights', fixtureState],
    queryFn: async () => {
      const result = await client.GET('/v1/admin/species/rights')
      const body = unwrap(result)
      return { items: body.items ?? [], stale: isStale(result.response) }
    },
    staleTime: 30_000,
  })
}

export function useSpeciesDetail(
  client: SpeciesClient,
  fixtureState: FixtureState,
  slug: string | null,
) {
  return useQuery({
    queryKey: ['species', 'detail', fixtureState, slug],
    enabled: Boolean(slug),
    queryFn: async () => {
      const result = await client.GET('/v1/admin/species/{id}', {
        params: { path: { id: slug as string } },
      })
      return { detail: unwrap(result) as SpeciesDetail, stale: isStale(result.response) }
    },
    staleTime: 30_000,
  })
}

/** Details for a bounded sample; the admin list summary has no coverage detail. */
export function useSpeciesDetails(
  client: SpeciesClient,
  fixtureState: FixtureState,
  slugs: string[],
) {
  const unique = useMemo(() => [...new Set(slugs)].filter(Boolean), [slugs])
  const queries = useQueries({
    queries: unique.map((slug) => ({
      queryKey: ['species', 'detail', fixtureState, slug],
      queryFn: async () => {
        const result = await client.GET('/v1/admin/species/{id}', {
          params: { path: { id: slug } },
        })
        return unwrap(result) as SpeciesDetail
      },
      staleTime: 30_000,
      retry: 0,
    })),
  })

  const details = queries
    .map((query) => query.data)
    .filter((detail): detail is SpeciesDetail => Boolean(detail))
  const pending = queries.some((query) => query.isPending)
  const error = queries.find((query) => query.error)?.error ?? null

  return { details, pending, error }
}

export interface SpeciesBundle {
  catalogue: SpeciesSummary[]
  details: SpeciesDetail[]
  reviewItems: SpeciesReviewItem[]
  sources: SpeciesSource[]
  rights: SpeciesRights[]
}

export function mergeSpeciesBundle(
  catalogue: SpeciesCatalogueResult | undefined,
  review: { items: SpeciesReviewItem[] } | undefined,
  sources: { items: SpeciesSource[] } | undefined,
  rights: { items: SpeciesRights[] } | undefined,
  details: SpeciesDetail[],
): SpeciesBundle {
  return {
    catalogue: catalogue?.items ?? [],
    details,
    reviewItems: review?.items ?? [],
    sources: sources?.items ?? [],
    rights: rights?.items ?? [],
  }
}
