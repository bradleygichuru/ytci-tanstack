import { createFileRoute } from '@tanstack/react-router'
import { adoptionFeatureLabel, adoptionRows } from '#/lib/analytics/derive'
import { formatDepth, formatNumber, formatRate } from '#/lib/analytics/format'
import { useAnalytics } from '#/lib/analytics/store'
import {
  MetricNote,
  Notice,
  Panel,
  SectionFrame,
  SuppressedMark,
  TableShell,
} from '#/components/analytics/shared'

export const Route = createFileRoute('/_authenticated/analytics/adoption')({
  component: AdoptionPage,
})

function AdoptionPage() {
  const { data } = useAnalytics()
  const rows = adoptionRows(data?.adoption ?? [])
  const maxReach = rows.reduce((max, row) => Math.max(max, row.reach ?? 0), 0)

  return (
    <SectionFrame
      section="adoption"
      dataset="adoption"
      kicker="Analytics · adoption"
      title="Adoption"
      sub="Reach, depth and repeat per feature. Reach alone rewards accidental taps, so the denominator and the repeat window stay visible."
    >
      <Panel
        title="Feature adoption"
        hint="Reach = distinct analytics IDs · depth = median actions per adopter · repeat = 3+ sessions in 28 days"
        bodyClassName="p-0"
      >
        <TableShell
          caption="Feature adoption with reach, depth and repeat"
          head={
            <>
              <th scope="col" className="px-5 py-3">
                Feature
              </th>
              <th scope="col" className="px-5 py-3 text-right">
                Reach
              </th>
              <th scope="col" className="px-5 py-3">
                Share of reach
              </th>
              <th scope="col" className="px-5 py-3 text-right">
                Depth
              </th>
              <th scope="col" className="px-5 py-3 text-right">
                Repeat
              </th>
            </>
          }
          minWidth={760}
        >
          {rows.map((row) => {
            const share = row.suppressed || row.reach == null || maxReach === 0 ? 0 : row.reach / maxReach
            return (
              <tr key={row.feature} className="border-b last:border-0">
                <th scope="row" className="px-5 py-3 text-left text-sm font-semibold text-foreground">
                  {adoptionFeatureLabel(row.feature)}
                </th>
                <td className="px-5 py-3 text-right text-sm font-semibold tabular-nums text-foreground">
                  {row.suppressed || row.reach == null ? <SuppressedMark /> : formatNumber(row.reach)}
                </td>
                <td className="px-5 py-3">
                  <div
                    className="h-2.5 min-w-28 overflow-hidden rounded-full bg-muted"
                    role="progressbar"
                    aria-label={`${adoptionFeatureLabel(row.feature)} reach`}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-valuenow={Math.round(share * 100)}
                    aria-valuetext={
                      row.suppressed ? 'Suppressed' : `${Math.round(share * 100)}% of the largest reach`
                    }
                  >
                    <span
                      className="block h-full rounded-full bg-[var(--primary-container)]"
                      style={{ width: `${Math.round(share * 100)}%` }}
                    />
                  </div>
                </td>
                <td className="px-5 py-3 text-right text-sm tabular-nums text-muted-foreground">
                  {row.depthPerActor == null ? <SuppressedMark /> : formatDepth(row.depthPerActor)}
                </td>
                <td className="px-5 py-3 text-right text-sm tabular-nums text-muted-foreground">
                  {row.repeatRate == null ? <SuppressedMark /> : formatRate(row.repeatRate)}
                </td>
              </tr>
            )
          })}
        </TableShell>
        {rows.length === 0 ? (
          <p className="px-5 py-8 text-center text-sm text-muted-foreground">
            No adoption rows reported for this range.
          </p>
        ) : null}
      </Panel>

      <div className="mt-4 grid gap-3 lg:grid-cols-2">
        <Notice tone="neutral" title="Reach is a numerator, not a verdict.">
          Depth and repeat are deliberately shown beside reach. A feature can have high reach and low
          repeat; that is a signal to inspect, not a success claim.
        </Notice>
        <MetricNote>
          Denominators are the distinct analytics IDs that emitted the feature in the range. Consent
          coverage and small-cell suppression are on Data quality.
        </MetricNote>
      </div>
    </SectionFrame>
  )
}
