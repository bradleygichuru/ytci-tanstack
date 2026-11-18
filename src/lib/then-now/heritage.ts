import type { HeritageCount } from '#/lib/api/analytics'

export const HERITAGE_EVENT_LABEL: Record<string, string> = {
  portal_opened: 'Portal opened',
  video_played: 'Video played',
  visit_marked: 'Visit marked',
  verified_visit: 'Verified visit',
}

export function heritageEventLabel(event: string): string {
  return HERITAGE_EVENT_LABEL[event] ?? event
}

/**
 * The server already suppresses cells below 5 and combines sensitive sites.
 * This keeps malformed rows out of the dashboard and normalises the display
 * fields without inventing counts.
 */
export function sanitizeHeritageData(raw: unknown): HeritageCount[] {
  if (!Array.isArray(raw)) return []
  return raw.flatMap((value) => {
    if (!value || typeof value !== 'object') return []
    const row = value as Record<string, unknown>
    const event = typeof row.event === 'string' ? row.event : ''
    if (!event) return []
    const scope = row.scope === 'sensitive' ? 'sensitive' : 'site'
    const count = Number(row.count)
    return [{
      day: String(row.day ?? ''),
      scope,
      siteId: String(row.siteId ?? ''),
      siteName: scope === 'sensitive' ? 'Sensitive sites (combined)' : String(row.siteName ?? ''),
      event,
      count: Number.isFinite(count) ? count : 0,
    }]
  })
}
