import { redirect } from '@tanstack/react-router'
import { requirePermission } from '#/lib/authz'
import { createFileRoute } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { useApi } from '#/lib/api/use-api'
import type { ApiErrorResponse } from '#/lib/api/types'
import {
  ChartBar, Users, MapPin, ClipboardText, BookOpen,
  Leaf, ArrowUpRight, ArrowDownRight, Bell,
  CloudArrowDown, FileCsv, FilePdf,
} from '@phosphor-icons/react'

interface AnalyticsData {
  dau: number; dauChange: number
  wau: number; wauChange: number
  mau: number; mauChange: number
  newRegistrations: number; newRegistrationsChange: number
  userLocations: { county: string; count: number }[]
  itinerariesGenerated: number; itinerariesGeneratedChange: number
  itinerariesSaved: number; itinerariesExported: number; itinerariesShared: number
  mapInteractions: number; mapInteractionsChange: number
  destinationDetailViews: number
  storiesSubmitted: number; storiesSubmittedChange: number; storiesApproved: number; storiesReported: number
  courseEnrollments: number; courseEnrollmentsChange: number; courseCompletions: number
  challengeParticipants: number
  conservationParticipants: number; conservationParticipantsChange: number
  topDestinations: { name: string; county: string; views: number }[]
  topCategories: { name: string; count: number }[]
  contentAwaitingReview: number; contentScheduledUpdate: number
  systemAlerts: { id: string; title: string; description: string; severity: string; timestamp: string }[]
  failedIntegrations: { name: string; lastError: string; since: string }[]
}

export const Route = createFileRoute('/_authenticated/analytics')({
  beforeLoad: ({ context }) => {
    try {
      requirePermission({ user: { role: context.user?.role ?? '' } }, 'analytics', ['read'])
    } catch {
      throw redirect({ to: '/no-access' })
    }
  },
  component: AnalyticsPage,
})

function fmtNum(n: number): string {
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`
  return String(n)
}

function ChangeChip({ value }: { value: number }) {
  const positive = value >= 0
  return (
    <span className={`inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-[11px] font-semibold ${
      positive ? 'bg-[rgba(52,90,0,0.2)] text-[#345a00]' : 'bg-[rgba(186,26,26,0.1)] text-[#ba1a1a]'
    }`}>
      {positive ? <ArrowUpRight className="h-3 w-3" weight="bold" /> : <ArrowDownRight className="h-3 w-3" weight="bold" />}
      {Math.abs(value)}%
    </span>
  )
}

function HeroStat({ icon: Icon, label, value, change }: { icon: typeof ChartBar; label: string; value: number; change: number }) {
  return (
    <div className="rounded-lg border border-border bg-card p-6" style={{ boxShadow: 'var(--card-shadow)' }}>
      <div className="mb-2 flex items-center gap-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--leaf-bg)]">
          <Icon className="h-4 w-4 text-success-leaf" weight="duotone" />
        </div>
        <span className="text-sm font-semibold text-muted-foreground">{label}</span>
      </div>
      <div className="flex items-baseline gap-2">
          <span className="font-sans text-3xl font-bold text-foreground md:text-4xl">{fmtNum(value)}</span>
        <ChangeChip value={change} />
      </div>
    </div>
  )
}

function StatCard({ icon: Icon, label, value, change, bg }: { icon: typeof ChartBar; label: string; value: number; change?: number; bg?: string }) {
  return (
    <div className="rounded-lg border border-border bg-card p-5" style={{ boxShadow: 'var(--card-shadow)' }}>
      <div className="mb-1 flex items-center gap-2">
        <div className={`flex h-7 w-7 items-center justify-center rounded-full ${bg ?? 'bg-[var(--surface-2)]'}`}>
          <Icon className="h-3.5 w-3.5 text-muted-foreground" weight="duotone" />
        </div>
        <span className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">{label}</span>
      </div>
      <div className="flex items-baseline gap-2">
        <span className="font-sans text-2xl font-bold text-foreground">{fmtNum(value)}</span>
        {change != null && <ChangeChip value={change} />}
      </div>
    </div>
  )
}

function AlertBadge({ severity }: { severity: string }) {
  const map: Record<string, { bg: string; text: string }> = {
    critical: { bg: 'rgba(186,26,26,0.1)', text: '#ba1a1a' },
    warning: { bg: 'var(--amber-bg)', text: '#6c5000' },
    info: { bg: 'var(--surface-2)', text: 'var(--on-surface-variant)' },
  }
  const s = map[severity] ?? map.info
  return (
    <span className="rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest" style={{ backgroundColor: s.bg, color: s.text }}>
      {severity}
    </span>
  )
}

function DashboardTab({ data }: { data: AnalyticsData }) {
  return (
    <div>
      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        <HeroStat icon={ChartBar} label="DAILY ACTIVE USERS" value={data.dau} change={data.dauChange} />
        <HeroStat icon={Users} label="WEEKLY ACTIVE USERS" value={data.wau} change={data.wauChange} />
        <HeroStat icon={Users} label="MONTHLY ACTIVE USERS" value={data.mau} change={data.mauChange} />
      </div>

      <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 md:grid-cols-3">
        <StatCard icon={Users} label="New Registrations" value={data.newRegistrations} change={data.newRegistrationsChange} bg="bg-sky-50" />
        <StatCard icon={ClipboardText} label="Itineraries Generated" value={data.itinerariesGenerated} change={data.itinerariesGeneratedChange} bg="bg-amber-50" />
        <StatCard icon={MapPin} label="Map Interactions" value={data.mapInteractions} change={data.mapInteractionsChange} bg="bg-emerald-50" />
        <StatCard icon={ClipboardText} label="Stories Submitted" value={data.storiesSubmitted} change={data.storiesSubmittedChange} bg="bg-rose-50" />
        <StatCard icon={BookOpen} label="Course Enrollments" value={data.courseEnrollments} change={data.courseEnrollmentsChange} bg="bg-purple-50" />
        <StatCard icon={Leaf} label="Conservation Participants" value={data.conservationParticipants} change={data.conservationParticipantsChange} bg="bg-lime-50" />
      </div>

      <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-[2fr_1fr]">
        <div className="rounded-lg border border-border bg-card" style={{ boxShadow: 'var(--card-shadow)' }}>
          <div className="flex items-center justify-between border-b border-border px-6 py-4">
            <h2 className="font-sans text-base font-bold text-foreground">Top Destinations</h2>
            <span className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">by views</span>
          </div>
          <div className="divide-y divide-border">
            {(data.topDestinations ?? []).map((d, i) => (
              <div key={d.name} className="flex items-center justify-between px-6 py-3">
                <div className="flex items-center gap-3">
                  <span className="font-sans text-base font-bold text-muted-foreground">{i + 1}</span>
                  <div>
                    <div className="text-sm font-semibold text-foreground">{d.name}</div>
                    <div className="text-xs text-muted-foreground">{d.county}</div>
                  </div>
                </div>
                <span className="text-sm font-semibold text-foreground">{fmtNum(d.views)}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-lg border border-border bg-card" style={{ boxShadow: 'var(--card-shadow)' }}>
          <div className="flex items-center justify-between border-b border-border px-5 py-4">
            <h2 className="font-sans text-base font-bold text-foreground">System Alerts</h2>
            <Bell className="h-4 w-4 text-muted-foreground" weight="duotone" />
          </div>
          <div className="divide-y divide-border px-5 py-2">
            {(data.systemAlerts ?? []).map((a) => (
              <div key={a.id} className="py-3">
                <div className="mb-1 flex items-center gap-2">
                  <AlertBadge severity={a.severity} />
                  <span className="text-xs text-muted-foreground">{new Date(a.timestamp).toLocaleDateString()}</span>
                </div>
                <div className="text-sm font-semibold text-foreground">{a.title}</div>
                <div className="mt-0.5 text-xs text-muted-foreground">{a.description}</div>
              </div>
            ))}
          </div>
          {(data.failedIntegrations ?? []).length > 0 && (
            <div className="border-t border-border px-5 py-3">
              <div className="mb-1 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Failed Integrations</div>
              {(data.failedIntegrations ?? []).map((f) => (
                <div key={f.name} className="mt-1 flex items-center justify-between text-xs">
                  <span className="font-semibold text-destructive">{f.name}</span>
                  <span className="text-muted-foreground">{f.lastError}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="mt-8 grid grid-cols-1 gap-6 md:grid-cols-3">
        <div className="rounded-lg border border-border bg-card p-5" style={{ boxShadow: 'var(--card-shadow)' }}>
          <div className="mb-2 text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Awaiting Review</div>
          <div className="flex items-baseline gap-2">
            <span className="font-sans text-3xl font-bold text-[var(--amber-deep)]">{data.contentAwaitingReview}</span>
            <span className="text-xs text-muted-foreground">stories</span>
          </div>
          <div className="mt-2 text-xs text-muted-foreground">+{data.contentScheduledUpdate} scheduled for update</div>
        </div>

        <div className="rounded-lg border border-border bg-card p-5" style={{ boxShadow: 'var(--card-shadow)' }}>
          <div className="mb-2 text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Stories Pipeline</div>
          <div className="mt-1 flex items-center gap-4">
            <div><span className="font-sans text-xl font-bold text-foreground">{fmtNum(data.storiesSubmitted)}</span><div className="text-[10px] text-muted-foreground">submitted</div></div>
            <div><span className="font-sans text-xl font-bold text-success-leaf">{fmtNum(data.storiesApproved)}</span><div className="text-[10px] text-muted-foreground">approved</div></div>
            <div><span className="font-sans text-xl font-bold text-destructive">{fmtNum(data.storiesReported)}</span><div className="text-[10px] text-muted-foreground">reported</div></div>
          </div>
        </div>

        <div className="rounded-lg border border-border bg-card p-5" style={{ boxShadow: 'var(--card-shadow)' }}>
          <div className="mb-2 text-[11px] font-bold uppercase tracking-widest text-muted-foreground">County Breakdown</div>
          <div className="space-y-1.5">
            {(data.userLocations ?? []).slice(0, 5).map((loc) => (
              <div key={loc.county} className="flex items-center justify-between text-xs">
                <span className="font-medium text-foreground">{loc.county}</span>
                <span className="font-semibold text-muted-foreground">{fmtNum(loc.count)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

function ReportsTab() {
  return (
    <div className="rounded-lg border border-border bg-card p-8" style={{ boxShadow: 'var(--card-shadow)' }}>
      <h2 className="font-sans text-base font-bold text-foreground">Export Reports</h2>
      <p className="mt-1 text-sm text-muted-foreground">Generate CSV or PDF summaries for YTCI, counties, and development partners.</p>

      <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-2">
        <div>
          <label className="mb-1.5 block text-sm font-semibold text-foreground">Date Range</label>
          <div className="flex gap-3">
            <input type="date" className="w-full rounded-md border border-border px-3 py-2 text-sm text-foreground focus:border-primary focus:ring-1 focus:ring-primary" defaultValue="2025-06-01" />
            <span className="flex items-center text-sm text-muted-foreground">to</span>
            <input type="date" className="w-full rounded-md border border-border px-3 py-2 text-sm text-foreground focus:border-primary focus:ring-1 focus:ring-primary" defaultValue="2025-07-31" />
          </div>
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-semibold text-foreground">Format</label>
          <div className="flex gap-4">
            <label className="flex items-center gap-2 text-sm text-foreground">
              <input type="radio" name="format" defaultChecked className="accent-primary" /> <FileCsv className="h-4 w-4 text-success-leaf" weight="duotone" /> CSV
            </label>
            <label className="flex items-center gap-2 text-sm text-foreground">
              <input type="radio" name="format" className="accent-primary" /> <FilePdf className="h-4 w-4 text-destructive" weight="duotone" /> PDF
            </label>
          </div>
        </div>
      </div>

      <div className="mt-5">
        <label className="mb-2 block text-sm font-semibold text-foreground">Sections</label>
        <div className="flex flex-wrap gap-3">
          {['User Activity', 'Destinations', 'Itineraries', 'Stories', 'Courses', 'Conservation', 'Alerts'].map((s) => (
            <label key={s} className="flex items-center gap-2 rounded-full border border-border px-4 py-2 text-sm text-foreground hover:border-primary">
              <input type="checkbox" defaultChecked className="accent-primary" /> {s}
            </label>
          ))}
        </div>
      </div>

      <div className="mt-8 flex gap-3">
        <button className="flex items-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-bold text-white shadow-sm transition-colors hover:bg-[#002b02]">
          <CloudArrowDown className="h-4 w-4" weight="duotone" /> Export CSV
        </button>
        <button className="flex items-center gap-2 rounded-full bg-[var(--amber)] px-6 py-3 text-sm font-bold text-[var(--forest-deep)] shadow-sm transition-colors">
          <CloudArrowDown className="h-4 w-4" weight="duotone" /> Export PDF
        </button>
      </div>
    </div>
  )
}

function AnalyticsPage() {
  const api = useApi()
  const [data, setData] = useState<AnalyticsData | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'dashboard' | 'reports'>('dashboard')

  useEffect(() => {
    api.analytics.summary().then((r) => {
      setData(r as AnalyticsData)
    }).catch((e: ApiErrorResponse) => {
      setError(e.message)
    })
  }, [api])

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-sans text-3xl font-bold tracking-tight text-foreground">
            Analytics & Metrics
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Platform activity, content performance, and learning impact metrics.
          </p>
        </div>
        <div className="flex gap-1 rounded-lg bg-[var(--surface-2)] p-1">
          {(['dashboard', 'reports'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`rounded-md px-4 py-2 text-sm font-semibold transition-colors ${
                activeTab === tab
                  ? 'bg-card text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {tab === 'dashboard' ? 'Dashboard' : 'Reports'}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div className="mt-4 rounded-lg border border-[var(--error)] bg-[rgba(186,26,26,0.05)] p-4 text-sm text-destructive">
          {error}
        </div>
      )}

      {data ? (
        activeTab === 'dashboard' ? <DashboardTab data={data} /> : <ReportsTab />
      ) : (
        !error && (
          <div className="mt-8 flex items-center justify-center py-20 text-sm text-muted-foreground">
            Loading analytics data...
          </div>
        )
      )}
    </div>
  )
}
