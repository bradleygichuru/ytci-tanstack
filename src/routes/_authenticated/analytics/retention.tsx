import { createFileRoute } from '@tanstack/react-router'
import { retentionGrid, RETENTION_NOTE } from '#/lib/analytics/derive'
import { useAnalytics } from '#/lib/analytics/store'
import {
  MetricNote,
  Notice,
  Panel,
  RetentionLegend,
  RetentionTable,
  SectionFrame,
} from '#/components/analytics/shared'

export const Route = createFileRoute('/_authenticated/analytics/retention')({
  component: RetentionPage,
})

function RetentionPage() {
  const { data } = useAnalytics()
  const grid = retentionGrid(data?.retention ?? [])

  return (
    <SectionFrame
      section="retention"
      dataset="retention"
      kicker="Analytics · retention"
      title="Retention"
      sub="Weekly cohorts at the elapsed weeks only. A dot means the week has not elapsed yet or the cell is suppressed."
    >
      <Notice tone="neutral" title="Elapsed cohorts only.">
        The accessible description lists only elapsed rates. Future weeks are not announced as 0%,
        and a suppressed cohort is not announced as a rate.
      </Notice>

      <Panel
        title="Weekly cohorts"
        hint="First-seen week · return rate · n per row"
      >
        <RetentionTable grid={grid} />
        <RetentionLegend />
        <div className="mt-3">
          <MetricNote>{RETENTION_NOTE}</MetricNote>
        </div>
      </Panel>
    </SectionFrame>
  )
}
