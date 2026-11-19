import { Fragment, useMemo, useState } from 'react'
import { createFileRoute, Link } from '@tanstack/react-router'
import { CaretDown, CaretRight, DownloadSimple } from '@phosphor-icons/react'
import { Button } from '#/components/ui/button'
import { Input } from '#/components/ui/input'
import { FilterBar } from '#/components/shell/FilterBar'
import { PageHeader } from '#/components/shell/PageHeader'
import { DataStateView } from '#/components/shell/DataState'
import { ContractGapNote, SectionCard, StatusPill } from '#/components/species/shared'
import { useSpecies } from '#/lib/species/store'
import { notify } from '#/lib/toast'
import {
  auditToCsv,
  filterAudit,
  formatAuditTime,
  type AuditFilters,
} from '#/lib/species/model'

export const Route = createFileRoute('/_authenticated/programme/species/audit')({
  component: SpeciesAuditPage,
})

const CATEGORY_OPTIONS = [
  ['all', 'All categories'],
  ['content', 'Content'],
  ['translation', 'Translation'],
  ['review', 'Review'],
  ['rights', 'Rights'],
  ['publish', 'Publish'],
  ['taxonomy', 'Taxonomy'],
] as const

function SpeciesAuditPage() {
  const { fixtureState, setFixtureState, audit, actor } = useSpecies()
  const [filters, setFilters] = useState<AuditFilters>({
    actor: 'all',
    role: 'all',
    category: 'all',
    entity: '',
    from: '',
    to: '',
  })
  const [expanded, setExpanded] = useState<Set<string>>(new Set())

  const actors = useMemo(
    () => [...new Set(audit.map((record) => record.actor))].sort(),
    [audit],
  )
  const roles = useMemo(
    () => [...new Set(audit.map((record) => record.role))].sort(),
    [audit],
  )
  const filtered = useMemo(() => filterAudit(audit, filters), [audit, filters])
  const isFiltered =
    filters.actor !== 'all' ||
    filters.role !== 'all' ||
    filters.category !== 'all' ||
    Boolean(filters.entity) ||
    Boolean(filters.from) ||
    Boolean(filters.to)

  function exportCsv() {
    const csv = auditToCsv(filtered)
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `species-audit-${new Date().toISOString().slice(0, 10)}.csv`
    link.click()
    URL.revokeObjectURL(url)
    notify.success(`Exported ${filtered.length} audit rows with the current filters.`)
  }

  if (fixtureState === 'empty') {
    return (
      <div className="space-y-4">
        <PageHeader title="Audit log" description="Immutable record of content, review and rights decisions." />
        <DataStateView
          state="empty"
          title="No audit entries"
          description="The audit stream is empty for this state. Return to live data to see records."
          action={
            <Button variant="outline" size="sm" onClick={() => setFixtureState('default')}>
              Use live data
            </Button>
          }
        />
      </div>
    )
  }

  if (fixtureState === 'error') {
    return (
      <div className="space-y-4">
        <PageHeader title="Audit log" description="Immutable record of content, review and rights decisions." />
        <DataStateView
          state="error"
          title="The audit stream could not load"
          description="No partial log is shown. Retry the panel."
          onRetry={() => setFixtureState('default')}
        />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title="Audit log"
        description="Newest first. Actor, role and record are kept with every content, review, rights and publish decision."
        badge={<span className="text-xs text-muted-foreground">{audit.length} entries</span>}
        actions={
          <Button variant="outline" size="sm" onClick={exportCsv} disabled={filtered.length === 0}>
            <DownloadSimple className="size-4" weight="bold" /> Export CSV
          </Button>
        }
      />

      <FilterBar
        searchValue={filters.entity}
        onSearchChange={(value) => setFilters((current) => ({ ...current, entity: value }))}
        searchPlaceholder="Filter by entity or record id"
        onReset={() =>
          setFilters({ actor: 'all', role: 'all', category: 'all', entity: '', from: '', to: '' })
        }
        isFiltered={isFiltered}
      >
        <select
          aria-label="Filter by actor"
          value={filters.actor}
          onChange={(event) =>
            setFilters((current) => ({ ...current, actor: event.target.value }))
          }
          className="h-9 rounded-md border border-border bg-card px-2 text-xs font-semibold"
        >
          <option value="all">Any actor</option>
          {actors.map((value) => (
            <option key={value} value={value}>
              {value}
            </option>
          ))}
        </select>
        <select
          aria-label="Filter by role"
          value={filters.role}
          onChange={(event) =>
            setFilters((current) => ({ ...current, role: event.target.value }))
          }
          className="h-9 rounded-md border border-border bg-card px-2 text-xs font-semibold"
        >
          <option value="all">Any role</option>
          {roles.map((value) => (
            <option key={value} value={value}>
              {value.replace('_', ' ')}
            </option>
          ))}
        </select>
        <select
          aria-label="Filter by category"
          value={filters.category}
          onChange={(event) =>
            setFilters((current) => ({ ...current, category: event.target.value }))
          }
          className="h-9 rounded-md border border-border bg-card px-2 text-xs font-semibold"
        >
          {CATEGORY_OPTIONS.map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
        <div className="flex items-center gap-1">
          <label htmlFor="audit-from" className="text-[11px] font-semibold text-muted-foreground">
            From
          </label>
          <Input
            id="audit-from"
            type="date"
            value={filters.from}
            onChange={(event) => setFilters((current) => ({ ...current, from: event.target.value }))}
            className="h-9 w-36"
          />
          <label htmlFor="audit-to" className="text-[11px] font-semibold text-muted-foreground">
            To
          </label>
          <Input
            id="audit-to"
            type="date"
            value={filters.to}
            onChange={(event) => setFilters((current) => ({ ...current, to: event.target.value }))}
            className="h-9 w-36"
          />
        </div>
      </FilterBar>

      <SectionCard
        title="Entries"
        description="Expand a row for the full detail. The export uses exactly this filter."
        actions={<span className="text-[11px] text-muted-foreground">{filtered.length} shown</span>}
      >
        {filtered.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            No audit entries match these filters.{' '}
            <button
              type="button"
              className="font-semibold text-primary underline"
              onClick={() =>
                setFilters({ actor: 'all', role: 'all', category: 'all', entity: '', from: '', to: '' })
              }
            >
              Clear filters
            </button>
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[860px] text-sm">
              <caption className="sr-only">Append-only species audit trail</caption>
              <thead>
                <tr className="border-b border-border text-left text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
                  <th className="w-8 px-2 py-2" />
                  <th className="px-2 py-2">When</th>
                  <th className="px-2 py-2">Action</th>
                  <th className="px-2 py-2">Record</th>
                  <th className="px-2 py-2">Actor / role</th>
                  <th className="px-2 py-2">Category</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((record) => {
                  const open = expanded.has(record.id)
                  return (
                    <Fragment key={record.id}>
                      <tr className="border-b border-border last:border-0">
                        <td className="px-2 py-2 align-top">
                          <button
                            type="button"
                            aria-label={open ? 'Collapse audit detail' : 'Expand audit detail'}
                            aria-expanded={open}
                            onClick={() =>
                              setExpanded((current) => {
                                const next = new Set(current)
                                if (open) next.delete(record.id)
                                else next.add(record.id)
                                return next
                              })
                            }
                            className="rounded p-0.5 text-muted-foreground hover:text-foreground"
                          >
                            {open ? (
                              <CaretDown className="size-3.5" weight="bold" />
                            ) : (
                              <CaretRight className="size-3.5" weight="bold" />
                            )}
                          </button>
                        </td>
                        <td className="whitespace-nowrap px-2 py-2 text-xs text-muted-foreground">
                          {formatAuditTime(record.at)}
                        </td>
                        <td className="px-2 py-2">
                          <p className="text-sm font-semibold text-foreground">{record.action}</p>
                          <p className="text-[11px] text-muted-foreground">{record.summary}</p>
                        </td>
                        <td className="px-2 py-2 text-xs">
                          <span className="capitalize">{record.entityType.replace('_', ' ')}</span>
                          <span className="block font-mono text-[10px] text-muted-foreground">
                            {record.entityId}
                          </span>
                        </td>
                        <td className="px-2 py-2 text-xs">
                          {record.actor}
                          <span className="block text-[10px] text-muted-foreground">
                            {record.role.replace('_', ' ')}
                          </span>
                        </td>
                        <td className="px-2 py-2">
                          <StatusPill
                            status={record.category === 'rights' ? 'withdrawn' : 'draft'}
                            label={record.category}
                          />
                          {record.source === 'record' ? (
                            <span className="mt-1 block text-[10px] text-muted-foreground">
                              derived from a stored record
                            </span>
                          ) : null}
                        </td>
                      </tr>
                      {open ? (
                        <tr className="border-b border-border bg-muted/30">
                          <td />
                          <td colSpan={5} className="px-2 py-3 text-xs text-muted-foreground">
                            <p className="text-foreground">{record.detail}</p>
                            <p className="mt-1">
                              Recorded {record.source === 'record' ? 'from the stored record' : 'in this browser session'} as{' '}
                              {record.role}. Audit entries are append-only; a correction is a new entry.
                            </p>
                            {record.entityType === 'species' || record.entityType === 'content' || record.entityType === 'name' ? (
                              <Link
                                to="/programme/species/catalogue"
                                className="mt-2 inline-block font-semibold text-primary hover:underline"
                              >
                                Open the catalogue
                              </Link>
                            ) : null}
                          </td>
                        </tr>
                      ) : null}
                    </Fragment>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </SectionCard>

      <ContractGapNote>
        The contract has no <code>/v1/admin/species/audit</code> endpoint. This view combines the
        records that do carry timestamps (review decisions, sources and rights) with decisions made in
        this browser, which are clearly marked. A server audit feed would replace the session rows
        without changing this screen's filters or export.
      </ContractGapNote>

      <p className="text-[11px] text-muted-foreground">
        Signed in as {actor.name} · {actor.roleLabel}. Export respects the actor, role, category,
        entity and date filters above.
      </p>
    </div>
  )
}
