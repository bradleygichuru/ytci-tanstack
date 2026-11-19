import { useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { funnelCaption, funnelRows, funnelSteps } from '#/lib/analytics/derive'
import { formatNumber, formatRate } from '#/lib/analytics/format'
import { useAnalytics } from '#/lib/analytics/store'
import {
  FunnelBars,
  Notice,
  Panel,
  SectionFrame,
  SuppressedMark,
  TableShell,
} from '#/components/analytics/shared'
import { JOURNEY_LABELS, type JourneyKey } from '#/lib/analytics/types'

export const Route = createFileRoute('/_authenticated/analytics/funnels')({
  component: FunnelsPage,
})

function FunnelsPage() {
  const { data } = useAnalytics()
  const rows = funnelRows(data?.funnels ?? [])
  const keys = new Set(rows.map((row) => row.journey))
  const initial: JourneyKey =
    (keys.has('event_registration') ? 'event_registration' : (rows[0]?.journey as JourneyKey)) ??
    'event_registration'
  const [focus, setFocus] = useState<JourneyKey>(initial)
  const steps = funnelSteps(data?.journeys ?? [], focus)
  const focusLabel = JOURNEY_LABELS[focus] ?? focus

  return (
    <SectionFrame
      section="funnels"
      dataset="funnels"
      kicker="Analytics · funnels"
      title="Funnels"
      sub="Conversion for the nine journeys. Step detail is drawn from the same journey rollup, and the largest-drop caption is computed from the rows on screen."
    >
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
        <Panel
          title="Funnel conversion"
          hint="Entered → completed · distinct readers · session-gated"
          bodyClassName="p-0"
        >
          <TableShell
            caption="Funnel conversion by journey"
            head={
              <>
                <th scope="col" className="px-4 py-3">
                  Journey
                </th>
                <th scope="col" className="px-4 py-3 text-right">
                  Entered
                </th>
                <th scope="col" className="px-4 py-3 text-right">
                  Completed
                </th>
                <th scope="col" className="px-4 py-3 text-right">
                  Conversion
                </th>
              </>
            }
            minWidth={520}
          >
            {rows.map((row) => (
              <tr
                key={row.journey}
                className="border-b last:border-0 hover:bg-[var(--surface-2)]"
              >
                <th scope="row" className="px-4 py-3 text-left text-sm font-semibold text-foreground">
                  <button
                    type="button"
                    onClick={() => setFocus(row.journey as JourneyKey)}
                    className="text-left underline-offset-2 hover:underline"
                    aria-pressed={focus === row.journey}
                  >
                    {row.label}
                  </button>
                </th>
                <td className="px-4 py-3 text-right text-sm tabular-nums text-muted-foreground">
                  {row.suppressed ? <SuppressedMark /> : formatNumber(row.entered)}
                </td>
                <td className="px-4 py-3 text-right text-sm tabular-nums text-muted-foreground">
                  {row.suppressed ? <SuppressedMark /> : formatNumber(row.completed)}
                </td>
                <td className="px-4 py-3 text-right text-sm font-semibold tabular-nums text-foreground">
                  {row.conversion == null ? <SuppressedMark /> : formatRate(row.conversion)}
                </td>
              </tr>
            ))}
          </TableShell>
          {rows.length === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-muted-foreground">
              No funnels reported for this range.
            </p>
          ) : null}
        </Panel>

        <Panel
          title={focusLabel}
          hint="Step bars · share of entrants"
          actions={
            <select
              aria-label="Funnel step detail journey"
              value={focus}
              onChange={(event) => setFocus(event.target.value as JourneyKey)}
              className="h-8 max-w-[220px] rounded-md border border-border bg-card px-2 text-xs font-semibold text-foreground"
            >
              {(Object.keys(JOURNEY_LABELS) as JourneyKey[]).map((journey) => (
                <option key={journey} value={journey}>
                  {JOURNEY_LABELS[journey]}
                </option>
              ))}
            </select>
          }
        >
          <FunnelBars steps={steps} />
          <p className="mt-3 text-xs text-muted-foreground">{funnelCaption(steps, focusLabel)}</p>
        </Panel>
      </div>

      <div className="mt-4">
        <Notice tone="neutral" title="A funnel is a diagnostic, not an impact claim.">
          Guest gates are excluded from started counts, and no individual journey is inspectable
          here. The largest drop names the two steps it measured; it is never a static caption.
        </Notice>
      </div>
    </SectionFrame>
  )
}
