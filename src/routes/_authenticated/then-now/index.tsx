import { useMemo, useState } from 'react'
import { createFileRoute, Link } from '@tanstack/react-router'
import { MagnifyingGlass, Plus, ClockCounterClockwise } from '@phosphor-icons/react'
import { Button } from '#/components/ui/button'
import { useThenNow } from '#/lib/then-now/store'
import {
  ACCESS_LABEL,
  type AccessMode,
  type SiteStatus,
} from '#/lib/then-now/types'
import { relativeAge } from '#/lib/then-now/format'
import {
  AccessBadge,
  AuditDialog,
  EmptyState,
  PageHeader,
  SensitivityBadge,
  StatCard,
  StatusPill,
} from '#/components/then-now/shared'

export const Route = createFileRoute('/_authenticated/then-now/')({
  component: SitesPage,
})

function SitesPage() {
  const { state, scenario, can } = useThenNow()
  const [search, setSearch] = useState('')
  const [county, setCounty] = useState('all')
  const [access, setAccess] = useState('all')
  const [status, setStatus] = useState('all')
  const [auditOpen, setAuditOpen] = useState(false)

  const sites = scenario === 'empty' ? [] : state.sites
  const experiences = Object.values(state.experiences)
  const liveExperiences = experiences.filter((exp) => exp.status === 'published').length
  const inReview = experiences.filter((exp) => exp.draftStatus === 'in_review').length
  const needsRights = sites.filter((site) => site.access === 'not_available' || !site.consent).length
  const counties = [...new Set(sites.map((site) => site.county))].sort()

  const visible = useMemo(() => {
    const query = search.trim().toLowerCase()
    return sites.filter((site) => {
      if (query && !`${site.name} ${site.locality} ${site.type}`.toLowerCase().includes(query)) return false
      if (county !== 'all' && site.county !== county) return false
      if (access !== 'all' && site.access !== access) return false
      if (status !== 'all' && site.status !== status) return false
      return true
    })
  }, [sites, search, county, access, status])

  return (
    <div>
      <PageHeader
        kicker="Then & Now · Discovery"
        title="Heritage sites"
        sub="Author the place, its access policy, and the current-scene site video. The public app reads the published version."
        actions={
          <>
            <Button variant="outline" size="sm" onClick={() => setAuditOpen(true)}>
              <ClockCounterClockwise className="h-4 w-4" weight="duotone" /> Audit log
            </Button>
            {can('create') && (
              <Button size="sm" asChild>
                <Link to="/then-now/sites/new">
                  <Plus className="h-4 w-4" weight="bold" /> New site
                </Link>
              </Button>
            )}
          </>
        }
      />

      <div className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Sites" value={sites.length} foot={`${sites.filter((site) => site.status === 'published').length} published`} />
        <StatCard label="Live experiences" value={liveExperiences} foot="One primary per site" accent="none" />
        <StatCard label="In review" value={inReview} foot={inReview ? 'Needs a decision' : 'Queue clear'} accent="gold" />
        <StatCard label="Needs rights / consent" value={needsRights} foot="Not playable yet" accent="danger" />
      </div>

      <div className="mb-3 flex flex-wrap items-center gap-2">
        <div className="relative">
          <MagnifyingGlass className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" weight="duotone" />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search sites..."
            aria-label="Search sites"
            className="h-9 w-56 rounded-md border border-border bg-card pl-8 pr-3 text-sm text-foreground outline-none focus:border-primary focus:ring-1 focus:ring-primary"
          />
        </div>
        <select aria-label="Filter by county" value={county} onChange={(event) => setCounty(event.target.value)} className="h-9 rounded-md border border-border bg-card px-2 text-xs font-semibold text-foreground">
          <option value="all">All counties</option>
          {counties.map((value) => <option key={value} value={value}>{value}</option>)}
        </select>
        <select aria-label="Filter by access" value={access} onChange={(event) => setAccess(event.target.value)} className="h-9 rounded-md border border-border bg-card px-2 text-xs font-semibold text-foreground">
          <option value="all">All access modes</option>
          {(Object.keys(ACCESS_LABEL) as AccessMode[]).map((value) => <option key={value} value={value}>{ACCESS_LABEL[value]}</option>)}
        </select>
        <select aria-label="Filter by status" value={status} onChange={(event) => setStatus(event.target.value)} className="h-9 rounded-md border border-border bg-card px-2 text-xs font-semibold text-foreground">
          <option value="all">All statuses</option>
          {(['draft', 'published', 'unpublished', 'archived'] as SiteStatus[]).map((value) => (
            <option key={value} value={value}>{value.charAt(0).toUpperCase() + value.slice(1)}</option>
          ))}
        </select>
        <span className="ml-auto text-xs font-semibold text-muted-foreground">{visible.length} shown</span>
      </div>

      {sites.length === 0 ? (
        <EmptyState
          title="No heritage sites yet"
          body="Create the first site, set its access policy, and add a current-scene experience. A site needs at least one published experience before it can go live."
          action={can('create') ? (
            <Button asChild>
              <Link to="/then-now/sites/new"><Plus className="h-4 w-4" weight="bold" /> Create the first site</Link>
            </Button>
          ) : undefined}
        />
      ) : (
        <div className="overflow-hidden rounded-lg border border-border bg-card">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[860px] text-sm">
              <thead>
                <tr className="border-b bg-[var(--surface-2)] text-left text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
                  <th className="px-5 py-3">Site</th>
                  <th className="px-5 py-3">County</th>
                  <th className="px-5 py-3">Access</th>
                  <th className="px-5 py-3">Sensitivity</th>
                  <th className="px-5 py-3">Experiences</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3">Updated</th>
                  <th className="px-5 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {visible.map((site) => {
                  const siteExperiences = site.experiences.map((id) => state.experiences[id]).filter(Boolean)
                  const live = siteExperiences.filter((exp) => exp.status === 'published').length
                  const draft = siteExperiences.some((exp) => exp.draftStatus === 'in_review' || exp.draftRevision > exp.liveRevision)
                  return (
                    <tr key={site.id} className="border-b last:border-0 hover:bg-[var(--surface-2)]">
                      <td className="px-5 py-3">
                        <Link to="/then-now/sites/$siteId" params={{ siteId: site.id }} className="block">
                          <span className="font-semibold text-foreground hover:text-primary">{site.name}</span>
                          <span className="block text-xs text-muted-foreground">{site.locality} · {site.type}</span>
                        </Link>
                      </td>
                      <td className="px-5 py-3 text-muted-foreground">{site.county}</td>
                      <td className="px-5 py-3"><AccessBadge access={site.access} /></td>
                      <td className="px-5 py-3"><SensitivityBadge sensitivity={site.sensitivity} /></td>
                      <td className="px-5 py-3 text-xs text-muted-foreground">
                        {live} live{draft ? <span className="ml-1 font-semibold text-[var(--amber-deep)]">· draft</span> : null}
                      </td>
                      <td className="px-5 py-3"><StatusPill status={site.status} /></td>
                      <td className="px-5 py-3 text-xs text-muted-foreground">{relativeAge(site.updatedAt)}</td>
                      <td className="px-5 py-3 text-right">
                        <Button variant="outline" size="sm" asChild>
                          <Link to="/then-now/sites/$siteId" params={{ siteId: site.id }}>Open</Link>
                        </Button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          {visible.length === 0 && (
            <div className="border-t border-border px-5 py-8 text-center text-sm text-muted-foreground">No sites match these filters.</div>
          )}
        </div>
      )}

      <AuditDialog
        open={auditOpen}
        onOpenChange={setAuditOpen}
        title="All Then & Now records"
        events={state.audit}
      />
    </div>
  )
}
