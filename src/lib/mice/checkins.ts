/**
 * Check-in reconciliation helpers.
 *
 * A successful console check-in returns the created `CheckIn` from the
 * contract. The row and the counter read that record rather than re-reading a
 * static list: the write response is the authoritative state, and the local
 * workflow row keeps the action visible if a later read cannot see it yet.
 */
import type { PageResult } from './api'
import type { CheckIn } from './types'

export interface CheckInFallback {
  eventId: string
  registrationId: string
  method: CheckIn['method']
}

/**
 * Build one canonical record from the 201 body, falling back to the request
 * when a fixture or partial server response omits a required field. Reusing the
 * server's `checkedInAt` keeps the row on the same event day as the counter.
 */
export function checkInRecord(
  created: Partial<CheckIn> | undefined,
  fallback: CheckInFallback,
): CheckIn {
  return {
    id: created?.id ?? `local-ci-${fallback.registrationId}`,
    registrationId: created?.registrationId ?? fallback.registrationId,
    eventId: created?.eventId ?? fallback.eventId,
    checkedInAt: created?.checkedInAt ?? new Date().toISOString(),
    method: created?.method ?? fallback.method,
    staffRef: created?.staffRef ?? null,
    attendeeName: created?.attendeeName ?? null,
    duplicate: created?.duplicate ?? false,
  }
}

/**
 * Merge the created record into the check-ins page so a re-read shows the new
 * row immediately. One registration has at most one check-in row; replacing by
 * `registrationId` prevents a duplicate after the re-read.
 */
export function reconcileCheckIn(
  page: PageResult<CheckIn> | undefined,
  record: CheckIn,
): PageResult<CheckIn> {
  const items = page?.items ?? []
  return {
    items: [
      record,
      ...items.filter((row) => row.registrationId !== record.registrationId),
    ],
    stale: page?.stale ?? false,
  }
}
