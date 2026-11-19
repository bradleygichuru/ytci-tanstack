import { createFileRoute } from '@tanstack/react-router'
import { funnelCaption, funnelSteps, journeySummaries } from '#/lib/analytics/derive'
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
import { JOURNEY_LABELS } from '#/lib/analytics/types'

export const Route = createFileRoute('/_authenticated/analytics/journeys')({
  component: JourneysPage,
})

function JourneysPage() {
  const { data, filters } = useAnalytics()
  const journeys = journeySummaries(data?.journeys ?? [])
  const selected = filters.journey
  const selectedSteps = selected === 'all' ? [] : funnelSteps(data?.journeys ?? [], selected)

  return (
    <SectionFrame
      section="journeys"
      dataset="journeys"
      kicker="Analytics · journeys"
      title="Journeys"
      sub="The nine defined journeys, sorted by completion. Started and completed use distinct analytics IDs from the journey rollup."
    >
      <Notice tone="neutral" title="Nine journeys, one source.">
        Overview's highest-completion list reads this same table. Completion is completed ÷ started
        for the range; a suppressed step is never shown as zero.
      </Notice>

      {selected !== 'all' ? (
        <Panel
          className="mb-4"
          title={JOURNEY_LABELS[selected]}
          hint="Step detail for the selected journey"
        >
          <FunnelBars steps={selectedSteps} />
          <p className="mt-3 text-xs text-muted-foreground">{funnelCaption(selectedSteps, JOURNEY_LABELS[selected])}</p>
        </Panel>
      ) : null}

      <Panel
        title="Journey completion"
        hint="Sorted by completion · distinct analytics IDs · n = started readers"
        bodyClassName="p-0"
      >
        <TableShell
          caption="Journey completion for the selected range"
          head={
            <>
              <th scope="col" className="px-5 py-3">
                Journey
              </th>
              <th scope="col" className="px-5 py-3 text-right">
                Started
              </th>
              <th scope="col" className="px-5 py-3 text-right">
                Completed
              </th>
              <th scope="col" className="px-5 py-3 text-right">
                Completion
              </th>
              <th scope="col" className="px-5 py-3">
                Steps
              </th>
            </>
          }
          minWidth={720}
        >
          {journeys.map((journey) => (
            <tr key={journey.journey} className="border-b last:border-0 hover:bg-[var(--surface-2)]">
              <th scope="row" className="px-5 py-3 text-left text-sm font-semibold text-foreground">
                {journey.label}
              </th>
              <td className="px-5 py-3 text-right text-sm tabular-nums text-muted-foreground">
                {journey.suppressed ? <SuppressedMark /> : formatNumber(journey.started)}
              </td>
              <td className="px-5 py-3 text-right text-sm tabular-nums text-muted-foreground">
                {journey.suppressed ? <SuppressedMark /> : formatNumber(journey.completed)}
              </td>
              <td className="px-5 py-3 text-right text-sm font-semibold tabular-nums text-foreground">
                {journey.completion == null ? <SuppressedMark /> : formatRate(journey.completion)}
              </td>
              <td className="px-5 py-3 text-sm text-muted-foreground">
                {journey.suppressed
                  ? 'Suppressed'
                  : `${journey.steps.length} step${journey.steps.length === 1 ? '' : 's'}`}
              </td>
            </tr>
          ))}
        </TableShell>
        {journeys.length === 0 ? (
          <p className="px-5 py-8 text-center text-sm text-muted-foreground">
            No journeys reported for this range.
          </p>
        ) : null}
      </Panel>
    </SectionFrame>
  )
}
