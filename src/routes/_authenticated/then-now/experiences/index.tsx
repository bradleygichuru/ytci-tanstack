import { useMemo, useState } from 'react'
import { createFileRoute, Link } from '@tanstack/react-router'
import { ClockCounterClockwise, MagnifyingGlass, Plus } from '@phosphor-icons/react'
import { Button } from '#/components/ui/button'
import { Badge } from '#/components/ui/badge'
import { useThenNow } from '#/lib/then-now/store'
import { experienceReadiness } from '#/lib/then-now/readiness'
import { formatDateEat, relativeAge } from '#/lib/then-now/format'
import type { Experience } from '#/lib/then-now/types'
import {
  AuditDialog,
  EmptyState,
  PageHeader,
  StatCard,
  StatusPill,
} from '#/components/then-now/shared'

export const Route = createFileRoute('/_authenticated/then-now/experiences/')({
  component: ExperiencesPage,
})

function statusBadges(exp: Experience) {
  if (exp.status === 'scheduled' || exp.scheduledAt) return <StatusPill status="scheduled" />
  if (exp.draftStatus === 'in_review') return <StatusPill status="in_review" />
  if (exp.draftStatus === 'approved') return <StatusPill status="approved" />
  if (exp.status === 'published' && exp.draftRevision > exp.liveRevision) {
    return (
      <span className="flex flex-wrap gap-1">
        <StatusPill status="published" label={`Live v${exp.liveRevision}`} />
        <StatusPill status="draft" label={`Draft v${exp.draftRevision}`} />
      </span>
    )
  }
  if (exp.status === 'published') return <StatusPill status="published" label={`Live v${exp.liveRevision}`} />
  return <StatusPill status={exp.status} />
}

function ExperiencesPage() {
  const { state, scenario, can } = useThenNow()
  const [search, setSearch] = useState('')
  const [siteId, setSiteId] = useState('all')
  const [mode, setMode] = useState('all')
  const [status, setStatus] = useState('all')
  const [auditOpen, setAuditOpen] = useState(false)

  const experiences = scenario === 'empty' ? [] : Object.values(state.experiences)
  const live = experiences.filter((exp) => exp.status === 'published').length
  const review = experiences.filter((exp) => exp.draftStatus === 'in_review').length
  const blocked = experiences.filter((exp) => experienceReadiness(exp).blockers.some((item) => item.section !== 'review')).length

  const visible = useMemo(() => {
    const query = search.trim().toLowerCase()
    return experiences.filter((exp) => {
      const site = state.sites.find((entry) => entry.id === exp.siteId)
      if (query && !`${exp.title} ${site?.name ?? ''} ${exp.period}`.toLowerCase().includes(query)) return false
      if (siteId !== 'all' && exp.siteId !== siteId) return false
      if (mode !== 'all' && exp.mode !== mode) return false
      if (status !== 'all') {
        if (status === 'published' && exp.status !== 'published') return false
        if (status === 'in_review' && exp.draftStatus !== 'in_review') return false
        if (status === 'draft' && exp.draftStatus !== 'draft') return false
        if (status === 'approved' && exp.draftStatus !== 'approved') return false
      }
      return true
    })
  }, [experiences, search, siteId, mode, status, state.sites])

  return (
    <div>
      <PageHeader
        kicker="Then & Now · Experiences"
        title="Experiences"
        sub="One site video, two modes. The experience owns the media, text cards, accessibility, rights, and review."
        actions={
          <>
            <Button variant="outline" size="sm" onClick={() => setAuditOpen(true)}>
              <ClockCounterClockwise className="h-4 w-4" weight="duotone" /> Audit log
            </Button>
            {can('create') && (
              <Button size="sm" asChild>
                <Link to="/then-now/experiences/new"><Plus className="h-4 w-4" weight="bold" /> New experience</Link>
              </Button>
            )}
          </>
        }
      />

      <div className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Experiences" value={experiences.length} foot={`Across ${new Set(experiences.map((exp) => exp.siteId)).size} sites`} />
        <StatCard label="Live" value={live} foot="Published revisions" accent="none" />
        <StatCard label="In review" value={review} foot="Frozen revisions" accent="gold" />
        <StatCard label="Blocked" value={blocked} foot="Authoring blockers" accent="danger" />
      </div>

      <div className="mb-3 flex flex-wrap items-center gap-2">
        <div className="relative">
          <MagnifyingGlass className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" weight="duotone" />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search experiences..."
            aria-label="Search experiences"
            className="h-9 w-56 rounded-md border border-border bg-card pl-8 pr-3 text-sm text-foreground outline-none focus:border-primary focus:ring-1 focus:ring-primary"
          />
        </div>
        <select aria-label="Filter by site" value={siteId} onChange={(event) => setSiteId(event.target.value)} className="h-9 rounded-md border border-border bg-card px-2 text-xs font-semibold text-foreground">
          <option value="all">All sites</option>
          {state.sites.map((site) => <option key={site.id} value={site.id}>{site.name}</option>)}
        </select>
        <select aria-label="Filter by mode" value={mode} onChange={(event) => setMode(event.target.value)} className="h-9 rounded-md border border-border bg-card px-2 text-xs font-semibold text-foreground">
          <option value="all">All modes</option>
          <option value="camera_video">Camera + video</option>
          <option value="video_only">Video only</option>
        </select>
        <select aria-label="Filter by status" value={status} onChange={(event) => setStatus(event.target.value)} className="h-9 rounded-md border border-border bg-card px-2 text-xs font-semibold text-foreground">
          <option value="all">All statuses</option>
          <option value="published">Published</option>
          <option value="in_review">In review</option>
          <option value="approved">Approved</option>
          <option value="draft">Draft</option>
        </select>
        <span className="ml-auto text-xs font-semibold text-muted-foreground">{visible.length} shown</span>
      </div>

      {experiences.length === 0 ? (
        <EmptyState
          title="No experiences yet"
          body="Create the first experience for a site. The wizard creates a draft; the readiness rail decides when it can be submitted and published."
          action={can('create') ? (
            <Button asChild><Link to="/then-now/experiences/new"><Plus className="h-4 w-4" weight="bold" /> Create the first experience</Link></Button>
          ) : undefined}
        />
      ) : (
        <div className="overflow-hidden rounded-lg border border-border bg-card">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[980px] text-sm">
              <thead>
                <tr className="border-b bg-[var(--surface-2)] text-left text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
                  <th className="px-5 py-3">Experience</th>
                  <th className="px-5 py-3">Site</th>
                  <th className="px-5 py-3">Mode</th>
                  <th className="px-5 py-3">Languages</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3">Revision</th>
                  <th className="px-5 py-3">Rights</th>
                  <th className="px-5 py-3">Updated</th>
                  <th className="px-5 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {visible.map((exp) => {
                  const site = state.sites.find((entry) => entry.id === exp.siteId)
                  return (
                    <tr key={exp.id} className="border-b last:border-0 hover:bg-[var(--surface-2)]">
                      <td className="px-5 py-3">
                        <Link to="/then-now/experiences/$experienceId" params={{ experienceId: exp.id }} className="block">
                          <span className="font-semibold text-foreground hover:text-primary">{exp.title}</span>
                          <span className="block text-xs text-muted-foreground">{exp.period} · {exp.duration}s</span>
                        </Link>
                      </td>
                      <td className="px-5 py-3 text-muted-foreground">{site?.name ?? '—'}</td>
                      <td className="px-5 py-3">
                        <Badge variant="outline" className="rounded-full border-border bg-muted text-muted-foreground">
                          {exp.mode === 'camera_video' ? 'Camera + video' : 'Video only'}
                        </Badge>
                      </td>
                      <td className="px-5 py-3 text-xs text-muted-foreground">{exp.languages.join(' / ')}</td>
                      <td className="px-5 py-3">{statusBadges(exp)}</td>
                      <td className="px-5 py-3 text-xs text-muted-foreground">
                        {exp.liveRevision ? `v${exp.liveRevision} live` : 'No live revision'}
                        {exp.draftRevision > exp.liveRevision ? ` · v${exp.draftRevision} draft` : ''}
                      </td>
                      <td className="px-5 py-3 text-xs text-muted-foreground">{formatDateEat(exp.rightsExpiry)}</td>
                      <td className="px-5 py-3 text-xs text-muted-foreground">{relativeAge(exp.updatedAt)}</td>
                      <td className="px-5 py-3 text-right">
                        <Button variant="outline" size="sm" asChild>
                          <Link to="/then-now/experiences/$experienceId" params={{ experienceId: exp.id }}>Open</Link>
                        </Button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          {visible.length === 0 && (
            <div className="border-t border-border px-5 py-8 text-center text-sm text-muted-foreground">No experiences match these filters.</div>
          )}
        </div>
      )}

      <AuditDialog open={auditOpen} onOpenChange={setAuditOpen} title="All Then & Now experiences" events={state.audit} />
    </div>
  )
}
