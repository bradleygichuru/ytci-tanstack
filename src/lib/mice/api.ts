/**
 * TanStack Query bindings for the MICE admin contract operations.
 *
 * Every read goes through `contractsApi` or a fixture-state client created by
 * the shared contracts client. Screens never build their own fetch wrapper.
 */
import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  ContractsApiError,
  contractsApi,
  createContractsClient,
  isStale,
  unwrap,
  type FixtureState,
} from '#/lib/contracts/client'
import type {
  AdminRegistration,
  CheckIn,
  EventDetail,
  EventReport,
  EventSummary,
  OrganizerProfile,
  Venue,
} from './types'

export type MiceClient = typeof contractsApi

export function useMiceClient(fixtureState: FixtureState): MiceClient {
  return useMemo(
    () =>
      fixtureState === 'default'
        ? contractsApi
        : createContractsClient({ fixtureState }),
    [fixtureState],
  )
}

export interface PageResult<T> {
  items: T[]
  stale: boolean
}

async function readPage<T>(
  request: () => Promise<{
    data?: unknown
    error?: unknown
    response: Response
  }>,
  empty: boolean,
  fail: boolean,
): Promise<PageResult<T>> {
  if (fail) {
    throw new ContractsApiError(
      503,
      'FIXTURE_ERROR',
      'This panel could not load. Reference ERR-MICE-503.',
    )
  }
  if (empty) return { items: [], stale: false }
  const result = await request()
  const page = unwrap(result) as { items?: T[] } | undefined
  return { items: page?.items ?? [], stale: isStale(result.response) }
}

export const miceKeys = {
  all: ['mice'] as const,
  events: (state: FixtureState) => ['mice', 'events', state] as const,
  event: (id: string, state: FixtureState) =>
    ['mice', 'event', id, state] as const,
  venues: (state: FixtureState) => ['mice', 'venues', state] as const,
  organizers: (state: FixtureState) => ['mice', 'organizers', state] as const,
  reports: (state: FixtureState) => ['mice', 'reports', state] as const,
  registrations: (id: string, state: FixtureState) =>
    ['mice', 'registrations', id, state] as const,
  checkIns: (id: string, state: FixtureState) =>
    ['mice', 'checkins', id, state] as const,
}

export function useMiceEvents(fixtureState: FixtureState, enabled = true) {
  const client = useMiceClient(fixtureState)
  return useQuery({
    queryKey: miceKeys.events(fixtureState),
    queryFn: () =>
      readPage<EventSummary>(
        () =>
          client.GET('/v1/admin/events', { params: { query: { limit: 100 } } }),
        fixtureState === 'empty',
        fixtureState === 'error',
      ),
    enabled,
    staleTime: 15_000,
  })
}

export function useMiceEvent(
  eventId: string | null,
  fixtureState: FixtureState,
  enabled = true,
) {
  const client = useMiceClient(fixtureState)
  return useQuery({
    queryKey: miceKeys.event(eventId ?? 'none', fixtureState),
    queryFn: () => {
      if (fixtureState === 'error') {
        throw new ContractsApiError(
          503,
          'FIXTURE_ERROR',
          'This event could not load. Reference ERR-MICE-503.',
        )
      }
      return client
        .GET('/v1/admin/events/{id}', { params: { path: { id: eventId! } } })
        .then((result) => unwrap<EventDetail>(result))
    },
    enabled: Boolean(eventId) && enabled && fixtureState !== 'empty',
    staleTime: 15_000,
  })
}

export function useMiceVenues(fixtureState: FixtureState, enabled = true) {
  const client = useMiceClient(fixtureState)
  return useQuery({
    queryKey: miceKeys.venues(fixtureState),
    queryFn: () =>
      readPage<Venue>(
        () =>
          client.GET('/v1/admin/venues', { params: { query: { limit: 100 } } }),
        fixtureState === 'empty',
        fixtureState === 'error',
      ),
    enabled,
    staleTime: 30_000,
  })
}

export function useMiceOrganizers(fixtureState: FixtureState, enabled = true) {
  const client = useMiceClient(fixtureState)
  return useQuery({
    queryKey: miceKeys.organizers(fixtureState),
    queryFn: () =>
      readPage<OrganizerProfile>(
        () =>
          client.GET('/v1/admin/organizers', {
            params: { query: { limit: 100 } },
          }),
        fixtureState === 'empty',
        fixtureState === 'error',
      ),
    enabled,
    staleTime: 30_000,
  })
}

export function useMiceReports(fixtureState: FixtureState, enabled = true) {
  const client = useMiceClient(fixtureState)
  return useQuery({
    queryKey: miceKeys.reports(fixtureState),
    queryFn: () =>
      readPage<EventReport>(
        () =>
          client.GET('/v1/admin/event-reports', {
            params: { query: { limit: 100 } },
          }),
        fixtureState === 'empty',
        fixtureState === 'error',
      ),
    enabled,
    staleTime: 15_000,
  })
}

export function useMiceRegistrations(
  eventId: string | null,
  fixtureState: FixtureState,
  enabled = true,
) {
  const client = useMiceClient(fixtureState)
  return useQuery({
    queryKey: miceKeys.registrations(eventId ?? 'none', fixtureState),
    queryFn: () =>
      readPage<AdminRegistration>(
        () =>
          client.GET('/v1/admin/events/{id}/registrations', {
            params: { path: { id: eventId! }, query: { limit: 200 } },
          }),
        fixtureState === 'empty',
        fixtureState === 'error',
      ),
    enabled: Boolean(eventId) && enabled,
    staleTime: 10_000,
  })
}

export function useMiceCheckIns(
  eventId: string | null,
  fixtureState: FixtureState,
  enabled = true,
) {
  const client = useMiceClient(fixtureState)
  return useQuery({
    queryKey: miceKeys.checkIns(eventId ?? 'none', fixtureState),
    queryFn: () =>
      readPage<CheckIn>(
        () =>
          client.GET('/v1/admin/events/{id}/checkins', {
            params: { path: { id: eventId! }, query: { limit: 200 } },
          }),
        fixtureState === 'empty',
        fixtureState === 'error',
      ),
    enabled: Boolean(eventId) && enabled,
    staleTime: 10_000,
  })
}
