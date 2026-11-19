import { createFileRoute, Link } from '@tanstack/react-router'
import {
  Calendar,
  ChartBar,
  Leaf,
  ShieldCheck,
  Sparkle,
  Trophy,
} from '@phosphor-icons/react'
import { useAnalytics } from '#/lib/analytics/store'
import {
  ContractGapBadge,
  MetricNote,
  Notice,
  Panel,
  SectionFrame,
  TableShell,
} from '#/components/analytics/shared'

export const Route = createFileRoute('/_authenticated/analytics/programme')({
  component: ProgrammePage,
})

const DOMAIN_SURFACES = [
  {
    label: 'Conservation',
    to: '/conservation',
    icon: Leaf,
    description: 'Check-ins, evidence and verified participation.',
  },
  {
    label: 'Events',
    to: '/events',
    icon: Calendar,
    description: 'Registrations, check-in and attendance.',
  },
  {
    label: 'LMS',
    to: '/lms',
    icon: ChartBar,
    description: 'Courses started, completed and quiz passes.',
  },
  {
    label: 'Recognition',
    to: '/recognition',
    icon: Trophy,
    description: 'Verified badge awards and season progress.',
  },
] as const

function ProgrammePage() {
  const { programme } = useAnalytics()

  return (
    <SectionFrame
      section="programme"
      kicker="Analytics · programme impact"
      title={
        <>
          Programme <ContractGapBadge />
        </>
      }
      sub="Programme impact comes from domain tables, never from analytics telemetry. This surface does not read those tables in 1.0.0, so it shows where to read them instead of a telemetry proxy."
    >
      <Notice tone="green" title="Telemetry is not an impact proxy.">
        <p>
          Conservation check-ins, event attendance, course completions and badge awards are
          domain-table facts. Putting an analytics date filter over them would imply the filter
          changed the impact count. It does not.
        </p>
      </Notice>

      <Panel title="Where the impact numbers live" hint="Domain surfaces · each owns its own counts">
        <div className="grid gap-3 sm:grid-cols-2">
          {DOMAIN_SURFACES.map((surface) => (
            <Link
              key={surface.label}
              to={surface.to}
              className="flex items-start gap-3 rounded-lg border border-border bg-card p-4 transition-colors hover:bg-[var(--surface-2)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1"
            >
              <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-[var(--leaf-bg)]">
                <surface.icon className="size-4 text-[var(--success-leaf)]" weight="duotone" />
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-semibold text-foreground">{surface.label}</span>
                <span className="mt-0.5 block text-xs text-muted-foreground">
                  {surface.description}
                </span>
              </span>
            </Link>
          ))}
        </div>
        <div className="mt-4">
          <MetricNote>
            {programme.note} This is a deliberate contract gap, not zero participation.
          </MetricNote>
        </div>
      </Panel>

      <Panel
        className="mt-4"
        title="What a programme view needs"
        hint="Definitions carried into any future domain-table read"
        bodyClassName="p-0"
      >
        <TableShell
          caption="Programme impact definitions that must come from domain tables"
          head={
            <>
              <th scope="col" className="px-5 py-3">
                Measure
              </th>
              <th scope="col" className="px-5 py-3">
                Source
              </th>
              <th scope="col" className="px-5 py-3">
                Why not telemetry
              </th>
            </>
          }
          minWidth={720}
        >
          <tr className="border-b">
            <th scope="row" className="px-5 py-3 text-left text-sm font-semibold text-foreground">
              Conservation participants
            </th>
            <td className="px-5 py-3 text-sm text-muted-foreground">Conservation activity + evidence</td>
            <td className="px-5 py-3 text-sm text-muted-foreground">
              A screen view is not a verified check-in.
            </td>
          </tr>
          <tr className="border-b">
            <th scope="row" className="px-5 py-3 text-left text-sm font-semibold text-foreground">
              Event attendance
            </th>
            <td className="px-5 py-3 text-sm text-muted-foreground">Registration + QR check-in</td>
            <td className="px-5 py-3 text-sm text-muted-foreground">
              Registration intent is not attendance.
            </td>
          </tr>
          <tr className="border-b">
            <th scope="row" className="px-5 py-3 text-left text-sm font-semibold text-foreground">
              Courses completed
            </th>
            <td className="px-5 py-3 text-sm text-muted-foreground">LMS completion + quiz pass</td>
            <td className="px-5 py-3 text-sm text-muted-foreground">
              Starting a lesson is not completing it.
            </td>
          </tr>
          <tr>
            <th scope="row" className="px-5 py-3 text-left text-sm font-semibold text-foreground">
              Badges earned
            </th>
            <td className="px-5 py-3 text-sm text-muted-foreground">Recognition verified awards</td>
            <td className="px-5 py-3 text-sm text-muted-foreground">
              An award has a ledger entry; a tap does not.
            </td>
          </tr>
        </TableShell>
      </Panel>

      <div className="mt-4 flex flex-wrap gap-2">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-muted px-3 py-1 text-xs font-semibold text-muted-foreground">
          <ShieldCheck className="h-3.5 w-3.5" weight="duotone" /> No telemetry filter applies here
        </span>
        <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-muted px-3 py-1 text-xs font-semibold text-muted-foreground">
          <Sparkle className="h-3.5 w-3.5" weight="duotone" /> Dates and county filters stay on the
          analytics screens
        </span>
      </div>
    </SectionFrame>
  )
}
