/**
 * One append-only audit log for the events surface.
 *
 * Category, actor, entity and date filters all apply to the export as well as the
 * table. Detail expansion keeps the default row quiet.
 */
import { useMemo, useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { CaretDown, CaretUp, DownloadSimple } from '@phosphor-icons/react'
import { PageHeader } from '#/components/shell/PageHeader'
import { FilterBar } from '#/components/shell/FilterBar'
import { Button } from '#/components/ui/button'
import { Input } from '#/components/ui/input'
import { useMice } from '#/lib/mice/store'
import { formatDateTime } from '#/lib/mice/workflow'
import {
  AuditCategoryBadge,
  EmptyBlock,
  SectionCard,
} from '#/components/mice/shared'
import type { AuditCategory, AuditEntry } from '#/lib/mice/types'

export const Route = createFileRoute('/_authenticated/programme/events/audit')({
  component: AuditPage,
})

const CATEGORIES: Array<{ key: 'all' | AuditCategory; label: string }> = [
  { key: 'all', label: 'All' },
  { key: 'events', label: 'Events' },
  { key: 'safety', label: 'Safety & moderation' },
  { key: 'system', label: 'System' },
]

function AuditPage() {
  const { local, actorName, resetLocal, auditQuery } = useMice()
  const [category, setCategory] = useState<'all' | AuditCategory>('all')
  const [actor, setActor] = useState('')
  const [entity, setEntity] = useState('')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [expanded, setExpanded] = useState<string | null>(null)

  const serverRows = useMemo<AuditEntry[]>(() => {
    return (auditQuery.data?.items ?? []).map((entry) => {
      const details = entry.details ?? {}
      const reason =
        typeof details.reason === 'string' ? details.reason : undefined
      return {
        id: entry.id,
        at: entry.createdAt,
        actor: entry.actorName || entry.actorId || 'System',
        role: entry.actorId ? 'admin' : 'system',
        action: entry.summary || entry.action,
        entity: `${entry.entityType} ${entry.entityId}`,
        detail: reason ?? entry.action,
        category:
          entry.entityType === 'report' || entry.entityType === 'organizer'
            ? 'safety'
            : 'events',
        source: 'server',
      }
    })
  }, [auditQuery.data?.items])

  const rows = useMemo(() => {
    const actorQuery = actor.trim().toLowerCase()
    const entityQuery = entity.trim().toLowerCase()
    return [...serverRows, ...local.audit]
      .filter((entry) => category === 'all' || entry.category === category)
      .filter(
        (entry) =>
          !actorQuery ||
          `${entry.actor} ${entry.role}`.toLowerCase().includes(actorQuery),
      )
      .filter(
        (entry) =>
          !entityQuery ||
          `${entry.entity} ${entry.action} ${entry.detail}`
            .toLowerCase()
            .includes(entityQuery),
      )
      .filter((entry) => {
        const day = entry.at.slice(0, 10)
        if (from && day < from) return false
        if (to && day > to) return false
        return true
      })
      .sort((a, b) => b.at.localeCompare(a.at))
  }, [actor, category, entity, from, local.audit, serverRows, to])

  function exportCsv() {
    const header = [
      'At',
      'Actor',
      'Role',
      'Category',
      'Action',
      'Entity',
      'Detail',
    ]
    const text = [
      header,
      ...rows.map((entry) => [
        entry.at,
        entry.actor,
        entry.role,
        entry.category,
        entry.action,
        entry.entity,
        entry.detail,
      ]),
    ]
      .map((row) =>
        row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','),
      )
      .join('\n')
    const url = URL.createObjectURL(new Blob([text], { type: 'text/csv' }))
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = 'mice-audit.csv'
    anchor.click()
    URL.revokeObjectURL(url)
  }

  const actors = [...new Set([...serverRows, ...local.audit].map((entry) => entry.actor))].sort()

  return (
    <div className="space-y-4">
      <PageHeader
        title="Audit log"
        description="One append-only log for events, safety and system · absolute time with actor and role on every entry"
        actions={
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={exportCsv}>
              <DownloadSimple className="size-3.5" weight="bold" /> Export CSV
            </Button>
          </div>
        }
      />

      <div
        className="flex flex-wrap gap-1 border-b border-border pb-1"
        role="group"
        aria-label="Audit category"
      >
        {CATEGORIES.map((item) => (
          <button
            key={item.key}
            type="button"
            aria-pressed={category === item.key}
            onClick={() => setCategory(item.key)}
            className={`inline-flex min-h-8 items-center border-b-2 px-3 text-xs font-semibold ${
              category === item.key
                ? 'border-[var(--amber)] text-foreground'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      <FilterBar
        searchValue={entity}
        onSearchChange={setEntity}
        searchPlaceholder="Search entity or action"
        isFiltered={
          Boolean(entity) ||
          Boolean(actor) ||
          Boolean(from) ||
          Boolean(to) ||
          category !== 'all'
        }
        onReset={() => {
          setEntity('')
          setActor('')
          setFrom('')
          setTo('')
          setCategory('all')
        }}
      >
        <label className="text-xs font-semibold text-muted-foreground">
          <span className="sr-only">Actor</span>
          <select
            aria-label="Filter by actor"
            value={actor}
            onChange={(change) => setActor(change.target.value)}
            className="h-9 rounded-md border border-border bg-card px-2 text-xs font-semibold text-foreground"
          >
            <option value="">All actors</option>
            {actors.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>
        </label>
        <label className="flex items-center gap-1 text-xs font-semibold text-muted-foreground">
          From
          <Input
            type="date"
            aria-label="From date"
            value={from}
            onChange={(change) => setFrom(change.target.value)}
            className="h-9 w-36"
          />
        </label>
        <label className="flex items-center gap-1 text-xs font-semibold text-muted-foreground">
          To
          <Input
            type="date"
            aria-label="To date"
            value={to}
            onChange={(change) => setTo(change.target.value)}
            className="h-9 w-36"
          />
        </label>
      </FilterBar>

      <SectionCard
        title={`${rows.length} entr${rows.length === 1 ? 'y' : 'ies'}`}
        description="Newest first · export respects these filters"
      >
        {rows.length === 0 ? (
          <EmptyBlock
            title="No entries in this filter"
            body="Choose All, or clear the actor and date fields."
          />
        ) : (
          <ul className="divide-y divide-border">
            {rows.map((entry) => {
              const open = expanded === entry.id
              return (
                <li key={entry.id} className="py-2.5">
                  <div className="grid gap-2 text-xs sm:grid-cols-[10rem_1fr_auto]">
                    <span className="text-muted-foreground">
                      {formatDateTime(entry.at)}
                      <span className="block text-[10px]">
                        {new Date(entry.at).toISOString().slice(0, 10)}
                      </span>
                    </span>
                    <span className="min-w-0">
                      <span className="flex flex-wrap items-center gap-1.5">
                        <span className="font-semibold text-foreground">
                          {entry.action}
                        </span>
                        <AuditCategoryBadge category={entry.category} />
                      </span>
                      <span className="block text-muted-foreground">
                        {entry.entity} · {entry.detail}
                      </span>
                      {open ? (
                        <span className="mt-1 block rounded-md bg-muted/60 p-2 font-mono text-[11px] text-muted-foreground">
                          id {entry.id} · {entry.at} · actor {entry.actor} (
                          {entry.role}) · {entry.source ?? 'local'}
                          {entry.source === 'server'
                            ? ` · action ${entry.action}`
                            : ''}
                        </span>
                      ) : null}
                    </span>
                    <span className="text-right text-muted-foreground">
                      {entry.actor}
                      <span className="block text-[10px]">{entry.role}</span>
                      <button
                        type="button"
                        onClick={() => setExpanded(open ? null : entry.id)}
                        className="ml-auto mt-1 inline-flex items-center gap-1 text-[11px] font-semibold text-primary"
                        aria-expanded={open}
                      >
                        {open ? (
                          <CaretUp className="size-3" weight="bold" />
                        ) : (
                          <CaretDown className="size-3" weight="bold" />
                        )}
                        {open ? 'Less' : 'Detail'}
                      </button>
                    </span>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </SectionCard>

      <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-muted-foreground">
        <span>
          Signed in as {actorName}. Server rows come from the MICE audit endpoint; review-staging rows stay in this browser.
        </span>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            const confirmed = window.confirm(
              'Clear local MICE workflow, review items and audit rows in this browser?',
            )
            if (confirmed) resetLocal()
          }}
        >
          Reset local workspace
        </Button>
      </div>
    </div>
  )
}
