/**
 * Number, date and rate formatting for the analytics surface.
 *
 * The rollup expresses `percent` and `ratio` cells as fractions (0.31 = 31%).
 * The fixtures and the Go admin store both follow that convention, so the
 * formatter is the one place the reader sees a percentage. Anything above 1 is
 * treated as already-scaled so a future handler regression shows 31% rather
 * than 3,100%.
 */
import type { MetricCell } from './types'

const COUNT_FORMAT = new Intl.NumberFormat('en-KE')
const COMPACT_FORMAT = new Intl.NumberFormat('en-KE', {
  notation: 'compact',
  maximumFractionDigits: 1,
})

export const SUPPRESSED = '—'

export function formatNumber(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return SUPPRESSED
  return COUNT_FORMAT.format(value)
}

export function formatCompact(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return SUPPRESSED
  return COMPACT_FORMAT.format(value)
}

export function formatRate(value: number | null | undefined, digits = 1): string {
  if (value == null || !Number.isFinite(value)) return SUPPRESSED
  const scaled = Math.abs(value) <= 1 ? value * 100 : value
  return `${scaled.toFixed(digits)}%`
}

export function formatDepth(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return SUPPRESSED
  return `${value.toFixed(1)} actions`
}

export function formatCurrency(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return SUPPRESSED
  return `KSh ${COUNT_FORMAT.format(value)}`
}

export function formatMetricCell(cell: MetricCell | undefined): string {
  if (!cell || cell.suppressed || cell.value == null) return SUPPRESSED
  switch (cell.unit) {
    case 'percent':
      return formatRate(cell.value)
    case 'ratio':
      // guest_to_account_ratio is displayed as the percentage of guests who
      // later create an account.
      return formatRate(cell.value)
    case 'currency':
      return formatCurrency(cell.value)
    case 'count':
    default:
      return formatNumber(cell.value)
  }
}

export function formatMetricFoot(cell: MetricCell | undefined, fallback: string): string {
  if (!cell) return 'Not reported for this range'
  if (cell.suppressed) return 'Suppressed: fewer than 10 readers'
  return cell.caveat || fallback
}

const DATE_FORMAT = new Intl.DateTimeFormat('en-GB', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
  timeZone: 'UTC',
})

const SHORT_DATE_FORMAT = new Intl.DateTimeFormat('en-GB', {
  day: '2-digit',
  month: 'short',
  timeZone: 'UTC',
})

export function formatDate(iso: string | null | undefined): string {
  if (!iso) return SUPPRESSED
  const parsed = new Date(`${iso.slice(0, 10)}T00:00:00.000Z`)
  if (Number.isNaN(parsed.getTime())) return iso
  return DATE_FORMAT.format(parsed)
}

export function formatShortDate(iso: string | null | undefined): string {
  if (!iso) return SUPPRESSED
  const parsed = new Date(`${iso.slice(0, 10)}T00:00:00.000Z`)
  if (Number.isNaN(parsed.getTime())) return iso
  return SHORT_DATE_FORMAT.format(parsed)
}

export function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return SUPPRESSED
  const parsed = new Date(iso)
  if (Number.isNaN(parsed.getTime())) return iso
  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Africa/Nairobi',
  }).format(parsed)
}

export function daysBetween(from: string, to: string): number {
  const start = new Date(`${from}T00:00:00.000Z`).getTime()
  const end = new Date(`${to}T00:00:00.000Z`).getTime()
  if (!Number.isFinite(start) || !Number.isFinite(end) || end < start) return 0
  return Math.floor((end - start) / 86_400_000) + 1
}

/** "2026-11-18" → "18 Nov" for a chart axis. */
export function formatAxisDay(iso: string): string {
  return formatShortDate(iso)
}

export function humanise(value: string): string {
  const spaced = value.replace(/[_-]+/g, ' ').trim()
  return spaced.charAt(0).toUpperCase() + spaced.slice(1)
}

export function todayIso(): string {
  return new Date().toISOString().slice(0, 10)
}
