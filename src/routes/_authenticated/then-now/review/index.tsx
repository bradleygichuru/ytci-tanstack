import { useState } from 'react'
import { createFileRoute, Link } from '@tanstack/react-router'
import { CheckCircle, ClockCounterClockwise } from '@phosphor-icons/react'
import { Button } from '#/components/ui/button'
import { useThenNow } from '#/lib/then-now/store'
import { relativeAge } from '#/lib/then-now/format'
import {
  AuditDialog,
  Callout,
  EmptyState,
  PageHeader,
  SensitivityBadge,
  StatCard,
  StatusPill,
} from '#/components/then-now/shared'

export const Route = createFileRoute('/_authenticated/then-now/review/')({
  component: ReviewQueuePage,
})

type ReviewFilter = 'unassigned' | 'mine' | 'all'

function ReviewQueuePage() {
  const { state, scenario, actor, can } = useThenNow()
  const [filter, setFilter] = useState<ReviewFilter>('all')
  const [auditOpen, setAuditOpen] = useState(false)

  if (!can('review')) {
    return (
      <div>
        <PageHeader kicker="Then & Now · Review" title="Review queue" sub="Submitted revisions are frozen. Review is an administrator decision." />
        <EmptyState
          title="Admins review revisions"
          body="You can draft, save, and submit experiences. An administrator reviews the frozen revision and records the decision."
          action={<Button variant="outline" asChild><Link to="/then-now/experiences">Back to experiences</Link></Button>}
        />
      </div>
    )
  }

  const items = scenario === 'empty' ? [] : Object.values(state.experiences)
    .filter((exp) => exp.draftStatus === 'in_review')
    .sort((a, b) => {
      const rank = (exp: typeof a) => exp.reviewer === 'Unassigned' ? 0 : exp.reviewer === actor ? 1 : 2
      const order = rank(a) - rank(b)
      if (order !== 0) return order
      return new Date(a.submittedAt || 0).getTime() - new Date(b.submittedAt || 0).getTime()
    })
  const unassigned = items.filter((exp) => exp.reviewer === 'Unassigned')
  const mine = items.filter((exp) => exp.reviewer === actor)
  const sensitive = items.filter((exp) => exp.sensitivity !== 'standard')
  const approved = Object.values(state.experiences).filter((exp) => exp.draftStatus === 'approved')
  const visible = filter === 'unassigned' ? unassigned : filter === 'mine' ? mine : items

  return (
    <div>
      <PageHeader
        kicker="Then & Now · Review"
        title="Review queue"
        sub="Submitted revisions are frozen. Assign a reviewer, compare against live, and record a decision. Reviewers never review their own upload."
        actions={
          <Button variant="outline" size="sm" onClick={() => setAuditOpen(true)}>
            <ClockCounterClockwise className="h-4 w-4" weight="duotone" /> Audit log
          </Button>
        }
      />

      <div className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Unassigned" value={unassigned.length} foot="Needs an owner" accent="gold" />
        <StatCard label="Assigned to me" value={mine.length} foot={actor} accent="none" />
        <StatCard label="Sensitive" value={sensitive.length} foot="Two reviewers" accent="danger" />
        <StatCard label="Ready to publish" value={approved.length} foot="Approved revisions" accent="forest" />
      </div>

      <div className="overflow-hidden rounded-lg border border-border bg-card">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-4 py-2.5">
          <div className="flex flex-wrap gap-1" role="group" aria-label="Review filters">
            {([
              ['unassigned', 'Unassigned'],
              ['mine', 'Assigned to me'],
              ['all', 'All open'],
            ] as [ReviewFilter, string][]).map(([value, label]) => (
              <button
                key={value}
                type="button"
                aria-pressed={filter === value}
                onClick={() => setFilter(value)}
                className={`rounded-full px-3 py-1 text-xs font-semibold ${filter === value ? 'bg-primary text-primary-foreground' : 'border border-border bg-card text-muted-foreground hover:text-foreground'}`}
              >
                {label}
              </button>
            ))}
          </div>
          <span className="text-xs text-muted-foreground">Order: unassigned, then assigned-to-me, then age</span>
        </div>

        {items.length === 0 ? (
          <div className="p-6">
            <EmptyState
              title="Queue clear"
              body="No revisions are waiting. An approved revision does not auto-publish; schedule it from the review detail when it is ready."
              icon={<CheckCircle className="h-6 w-6" weight="duotone" />}
              action={<Button variant="outline" asChild><Link to="/then-now/experiences">View experiences</Link></Button>}
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-sm">
              <thead>
                <tr className="border-b bg-[var(--surface-2)] text-left text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
                  <th className="px-5 py-3">Revision</th>
                  <th className="px-5 py-3">Site</th>
                  <th className="px-5 py-3">Submitted by</th>
                  <th className="px-5 py-3">Submitted</th>
                  <th className="px-5 py-3">Review tier</th>
                  <th className="px-5 py-3">Reviewer</th>
                  <th className="px-5 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {visible.map((exp) => {
                  const site = state.sites.find((entry) => entry.id === exp.siteId)
                  return (
                    <tr key={exp.id} className="border-b last:border-0 hover:bg-[var(--surface-2)]">
                      <td className="px-5 py-3">
                        <Link to="/then-now/review/$revisionId" params={{ revisionId: exp.id }} className="block">
                          <span className="font-semibold text-foreground hover:text-primary">{exp.title}</span>
                          <span className="block text-xs text-muted-foreground">
                            {site?.name ?? 'Unknown site'} · revision v{exp.draftRevision}
                            {exp.uploadedBy !== exp.submittedBy ? ` · uploaded by ${exp.uploadedBy}` : ''}
                          </span>
                        </Link>
                      </td>
                      <td className="px-5 py-3 text-muted-foreground">{site?.name ?? '—'}</td>
                      <td className="px-5 py-3 text-muted-foreground">{exp.submittedBy}</td>
                      <td className="px-5 py-3 text-xs text-muted-foreground">{relativeAge(exp.submittedAt)}</td>
                      <td className="px-5 py-3"><SensitivityBadge sensitivity={exp.sensitivity} /></td>
                      <td className="px-5 py-3">
                        {exp.reviewer === 'Unassigned'
                          ? <StatusPill status="in_review" label="Unassigned" />
                          : <span className="text-sm">{exp.reviewer}</span>}
                      </td>
                      <td className="px-5 py-3 text-right">
                        <Button variant="outline" size="sm" asChild>
                          <Link to="/then-now/review/$revisionId" params={{ revisionId: exp.id }}>Open</Link>
                        </Button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
            {visible.length === 0 && (
              <div className="border-t border-border px-5 py-8 text-center text-sm text-muted-foreground">Nothing in this filter. Try “All open” or wait for the next submission.</div>
            )}
          </div>
        )}
      </div>

      <div className="mt-4">
        <Callout tone="neutral" title="No notification spam.">
          Reviewers rely on queue counts, “assigned to me”, and the audit timeline. Approval does not auto-publish.
        </Callout>
      </div>

      <AuditDialog open={auditOpen} onOpenChange={setAuditOpen} title="All review records" events={state.audit} />
    </div>
  )
}
