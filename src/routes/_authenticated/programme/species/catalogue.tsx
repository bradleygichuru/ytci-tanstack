import { useMemo, useState } from 'react'
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import type { ColumnDef } from '@tanstack/react-table'
import { ArrowsClockwise, Plus, UserSwitch } from '@phosphor-icons/react'
import { Button } from '#/components/ui/button'
import { Input } from '#/components/ui/input'
import { FormDialog } from '#/components/shell/FormDialog'
import { FilterBar } from '#/components/shell/FilterBar'
import { PageHeader } from '#/components/shell/PageHeader'
import { DataStateView } from '#/components/shell/DataState'
import { DataTable } from '#/components/shell/DataTable'
import { Can } from '#/components/shell/Gates'
import {
  ContractGapNote,
  CoverageBar,
  StatusPill,
} from '#/components/species/shared'
import { useSpecies } from '#/lib/species/store'
import { unwrap } from '#/lib/contracts/client'
import { notify } from '#/lib/toast'
import { buildTasks, type CatalogueRow, type SpeciesDetail } from '#/lib/species/model'

export const Route = createFileRoute('/_authenticated/programme/species/catalogue')({
  component: SpeciesCataloguePage,
})

const PAGE_SIZE = 25

export function SpeciesCataloguePage() {
  const {
    fixtureState,
    setFixtureState,
    rows,
    details,
    reviewItems,
    overlay,
    assignTasks,
    submitForPublication,
    refetch,
    catalogueTruncated,
    client,
  } = useSpecies()
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const [publication, setPublication] = useState('all')
  const [language, setLanguage] = useState('all')
  const [taxonomy, setTaxonomy] = useState('all')
  const [iucn, setIucn] = useState('all')
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [assignOpen, setAssignOpen] = useState(false)
  const [assignee, setAssignee] = useState('')
  const [assignError, setAssignError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [createOpen, setCreateOpen] = useState(false)
  const [createScientific, setCreateScientific] = useState('')
  const [createSlug, setCreateSlug] = useState('')
  const [createError, setCreateError] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)

  const languages = useMemo(
    () => [...new Set(rows.flatMap((row) => row.languages))].sort(),
    [rows],
  )
  const taxonomies = useMemo(
    () => [...new Set(rows.map((row) => row.taxonomicStatus))].sort(),
    [rows],
  )
  const iucnCodes = useMemo(
    () => [...new Set(rows.map((row) => row.iucnCategory))].sort(),
    [rows],
  )

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase()
    return rows.filter((row) => {
      if (
        needle &&
        !`${row.nameEn} ${row.scientificName} ${row.slug}`.toLowerCase().includes(needle)
      ) {
        return false
      }
      if (publication !== 'all' && row.publicationState !== publication) return false
      if (language !== 'all' && !row.languages.includes(language)) return false
      if (taxonomy !== 'all' && row.taxonomicStatus !== taxonomy) return false
      if (iucn !== 'all' && row.iucnCategory !== iucn) return false
      return true
    })
  }, [iucn, language, publication, query, rows, taxonomy])

  const isFiltered =
    Boolean(query) || publication !== 'all' || language !== 'all' || taxonomy !== 'all' || iucn !== 'all'
  const selectedRows = rows.filter((row) => selected.has(row.slug))
  const tasksForSelected = buildTasks(details, reviewItems, overlay).filter(
    (task) => selected.has(task.speciesSlug) && task.type !== 'base',
  )

  function resetFilters() {
    setQuery('')
    setPublication('all')
    setLanguage('all')
    setTaxonomy('all')
    setIucn('all')
  }

  function toggleAll() {
    if (selectedRows.length === filtered.length) {
      setSelected(new Set())
    } else {
      setSelected(new Set(filtered.map((row) => row.slug)))
    }
  }

  const columns: ColumnDef<CatalogueRow, unknown>[] = [
    {
      id: 'select',
      header: () => (
        <input
          type="checkbox"
          aria-label="Select every species in this view"
          checked={filtered.length > 0 && selectedRows.length === filtered.length}
          onChange={toggleAll}
        />
      ),
      cell: ({ row }) => (
        <input
          type="checkbox"
          aria-label={`Select ${row.original.nameEn}`}
          checked={selected.has(row.original.slug)}
          onChange={(event) => {
            setSelected((current) => {
              const next = new Set(current)
              if (event.target.checked) next.add(row.original.slug)
              else next.delete(row.original.slug)
              return next
            })
          }}
        />
      ),
      enableSorting: false,
    },
    {
      id: 'species',
      header: 'Species',
      accessorFn: (row) => row.nameEn,
      cell: ({ row }) => (
        <div className="min-w-[14rem]">
          <Link
            to="/programme/species/$speciesId"
            params={{ speciesId: row.original.slug }}
            className="font-semibold text-foreground hover:text-primary"
          >
            {row.original.nameEn}
          </Link>
          <p className="text-xs italic text-muted-foreground">{row.original.scientificName}</p>
        </div>
      ),
    },
    {
      id: 'iucn',
      header: 'IUCN',
      accessorFn: (row) => row.iucnCategory,
      cell: ({ row }) => (
        <span className="font-mono text-xs font-semibold" title={`IUCN ${row.original.iucnCategory}`}>
          {row.original.iucnCategory}
        </span>
      ),
    },
    {
      id: 'taxonomy',
      header: 'Taxonomy',
      accessorFn: (row) => row.taxonomicStatus,
      cell: ({ row }) => <StatusPill status={row.original.taxonomicStatus} />,
    },
    {
      id: 'status',
      header: 'Publication',
      accessorFn: (row) => row.publicationState,
      cell: ({ row }) => (
        <div className="flex flex-wrap gap-1">
          <StatusPill status={row.original.publicationState} />
          {row.original.staleCount > 0 ? <StatusPill status="stale" /> : null}
          {row.original.hasRightsHold ? <StatusPill status="withdrawn" label="Rights hold" /> : null}
        </div>
      ),
    },
    {
      id: 'languages',
      header: 'Names coverage',
      accessorFn: (row) => row.languages.length,
      cell: ({ row }) => (
        <div className="min-w-[9rem]">
          <CoverageBar
            value={row.original.languages.length}
            total={Math.max(languages.length, row.original.languages.length)}
            label={`${row.original.languages.length} language${row.original.languages.length === 1 ? '' : 's'}`}
          />
          <p className="mt-1 text-[11px] uppercase tracking-wide text-muted-foreground">
            {row.original.languages.join(' · ') || 'None'}
          </p>
        </div>
      ),
    },
    {
      id: 'actions',
      header: () => <span className="sr-only">Actions</span>,
      cell: ({ row }) => (
        <div className="flex justify-end gap-1.5">
          <Button variant="outline" size="xs" asChild>
            <Link
              to="/programme/species/$speciesId"
              params={{ speciesId: row.original.slug }}
              aria-label={`Edit ${row.original.nameEn}`}
            >
              Edit
            </Link>
          </Button>
          <Button variant="outline" size="xs" asChild>
            <Link
              to="/programme/species/$speciesId/languages"
              params={{ speciesId: row.original.slug }}
              search={{ variant: 'sw' }}
              aria-label={`Language coverage for ${row.original.nameEn}`}
            >
              Languages
            </Link>
          </Button>
          <Button variant="outline" size="xs" asChild>
            <Link
              to="/programme/species/readiness"
              search={{ species: row.original.slug }}
              aria-label={`Publication readiness for ${row.original.nameEn}`}
            >
              Readiness
            </Link>
          </Button>
        </div>
      ),
      enableSorting: false,
    },
  ]

  if (fixtureState === 'empty') {
    return (
      <div className="space-y-4">
        <PageHeader title="Species catalogue" description="Search, filter and open any species record." />
        <DataStateView
          state="empty"
          title="No species in the catalogue"
          description="The catalogue is empty for this state. Return to live data to see the sample records."
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
        <PageHeader title="Species catalogue" description="Search, filter and open any species record." />
        <DataStateView
          state="error"
          title="The species catalogue is unavailable"
          description="No partial rows are shown. Try the panel again, or check the service status."
          onRetry={() => setFixtureState('default')}
        />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title="Species catalogue"
        description="One row per species with language coverage and the readiness action. Bulk actions apply to the current selection."
        badge={
          <span className="text-xs text-muted-foreground">
            {filtered.length} of {rows.length} loaded
            {catalogueTruncated ? ' · cursor truncated' : ''}
          </span>
        }
        actions={
          <Can permission="species.create">
            <Button size="sm" onClick={() => setCreateOpen(true)}>
              <Plus className="size-4" weight="bold" /> New species
            </Button>
          </Can>
        }
      />

      <FilterBar
        searchValue={query}
        onSearchChange={setQuery}
        searchPlaceholder="Search common or scientific name"
        onReset={resetFilters}
        isFiltered={isFiltered}
      >
        <select
          aria-label="Filter by publication status"
          value={publication}
          onChange={(event) => setPublication(event.target.value)}
          className="h-9 rounded-md border border-border bg-card px-2 text-xs font-semibold"
        >
          <option value="all">All publication states</option>
          <option value="published">Published</option>
          <option value="in_review">In review</option>
          <option value="draft">Draft</option>
          <option value="unpublished">Unpublished</option>
          <option value="tombstoned">Tombstoned</option>
        </select>
        <select
          aria-label="Filter by language"
          value={language}
          onChange={(event) => setLanguage(event.target.value)}
          className="h-9 rounded-md border border-border bg-card px-2 text-xs font-semibold"
        >
          <option value="all">Any language</option>
          {languages.map((code) => (
            <option key={code} value={code}>
              {code.toUpperCase()}
            </option>
          ))}
        </select>
        <select
          aria-label="Filter by taxonomic status"
          value={taxonomy}
          onChange={(event) => setTaxonomy(event.target.value)}
          className="h-9 rounded-md border border-border bg-card px-2 text-xs font-semibold"
        >
          <option value="all">Any taxonomy</option>
          {taxonomies.map((value) => (
            <option key={value} value={value}>
              {value}
            </option>
          ))}
        </select>
        <select
          aria-label="Filter by IUCN category"
          value={iucn}
          onChange={(event) => setIucn(event.target.value)}
          className="h-9 rounded-md border border-border bg-card px-2 text-xs font-semibold"
        >
          <option value="all">Any IUCN category</option>
          {iucnCodes.map((value) => (
            <option key={value} value={value}>
              {value}
            </option>
          ))}
        </select>
        <Button variant="ghost" size="sm" onClick={refetch}>
          <ArrowsClockwise className="size-3.5" weight="bold" /> Refresh
        </Button>
      </FilterBar>

      {selectedRows.length > 0 ? (
        <div className="flex flex-wrap items-center gap-2 rounded-lg border border-primary/30 bg-primary/5 px-3 py-2">
          <span className="text-xs font-semibold text-foreground">
            {selectedRows.length} selected
          </span>
          <span className="text-[11px] text-muted-foreground">
            {tasksForSelected.length} language task{tasksForSelected.length === 1 ? '' : 's'}
          </span>
          <div className="ml-auto flex flex-wrap items-center gap-2">
            <Can permission="species.edit_base">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setAssignee('')
                  setAssignError(null)
                  setAssignOpen(true)
                }}
              >
                <UserSwitch className="size-4" weight="duotone" /> Assign reviewer
              </Button>
            </Can>
            <Can permission="species.edit_base">
              <Button
                size="sm"
                disabled={submitting || fixtureState === 'stale'}
                onClick={async () => {
                  setSubmitting(true)
                  try {
                    for (const row of selectedRows) {
                      const detail: SpeciesDetail =
                        details.find((entry) => entry.slug === row.slug) ?? {
                          slug: row.slug,
                          scientificName: row.scientificName,
                          nameEn: row.nameEn,
                        }
                      await submitForPublication(detail)
                    }
                    notify.success(`${selectedRows.length} species moved to review.`)
                    setSelected(new Set())
                  } catch (error) {
                    notify.error(error)
                  } finally {
                    setSubmitting(false)
                  }
                }}
              >
                Send {selectedRows.length} to review
              </Button>
            </Can>
            <Button variant="ghost" size="sm" onClick={() => setSelected(new Set())}>
              Clear selection
            </Button>
          </div>
        </div>
      ) : null}

      <DataTable
        columns={columns}
        data={filtered}
        total={filtered.length}
        pageSize={PAGE_SIZE}
        isLoading={false}
        emptyTitle="No species match these filters"
        emptyDescription="Clear the search or filters. The catalogue is loaded from the admin API."
        emptyAction={
          <Button variant="outline" size="sm" onClick={resetFilters}>
            Clear filters
          </Button>
        }
        caption="Names coverage counts languages with a recorded name. Prose and audio are reviewed on the language screen."
      />

      <ContractGapNote>
        The frozen admin list summary has no taxonomic class, no created/updated timestamp and no
        per-variant prose state. The catalogue therefore filters on taxonomic status and IUCN
        category, and coverage is names-only at row level. Adding <code>taxonomicClass</code>,{' '}
        <code>updatedAt</code> and <code>variantStates</code> to <code>SpeciesSummary</code> would
        let this table match the prototype's class filter and per-row readiness without extra calls.
      </ContractGapNote>

      <FormDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        title="New species"
        description="Creates a draft with taxonomy fields only. Names, prose and audio are added per language."
        submitLabel="Create draft"
        error={createError}
        pending={creating}
        onSubmit={async () => {
          if (createScientific.trim().length < 3) {
            setCreateError('Record the scientific name.')
            return
          }
          const slug =
            createSlug.trim() ||
            createScientific
              .trim()
              .toLowerCase()
              .replace(/[^a-z0-9]+/g, '-')
              .replace(/^-|-$/g, '')
          setCreating(true)
          setCreateError(null)
          try {
            const result = await client.POST('/v1/admin/species', {
              body: {
                scientificName: createScientific.trim(),
                slug,
                taxonomicRank: 'species',
                taxonomicStatus: 'provisional',
              },
            })
            unwrap(result)
            notify.success(`${createScientific.trim()} created as a draft.`)
            setCreateOpen(false)
            setCreateScientific('')
            setCreateSlug('')
            refetch()
            await navigate({ to: '/programme/species/$speciesId', params: { speciesId: slug } })
          } catch (error) {
            setCreateError(error instanceof Error ? error.message : 'Could not create the draft.')
          } finally {
            setCreating(false)
          }
        }}
      >
        <label className="block text-xs font-semibold text-foreground" htmlFor="create-scientific">
          Scientific name
        </label>
        <Input
          id="create-scientific"
          value={createScientific}
          onChange={(event) => {
            setCreateScientific(event.target.value)
            if (!createSlug) {
              setCreateSlug(
                event.target.value
                  .toLowerCase()
                  .replace(/[^a-z0-9]+/g, '-')
                  .replace(/^-|-$/g, ''),
              )
            }
          }}
          placeholder="e.g. Panthera leo"
        />
        <label className="block text-xs font-semibold text-foreground" htmlFor="create-slug">
          Slug
        </label>
        <Input
          id="create-slug"
          value={createSlug}
          onChange={(event) => setCreateSlug(event.target.value)}
          placeholder="panthera-leo"
        />
        <p className="text-[11px] text-muted-foreground">
          The language-neutral base records taxonomy only. English names and prose are added on the
          language screen.
        </p>
      </FormDialog>

      <FormDialog
        open={assignOpen}
        onOpenChange={setAssignOpen}
        title="Assign language tasks"
        description={`Assign ${tasksForSelected.length} task${tasksForSelected.length === 1 ? '' : 's'} from ${selectedRows.length} species to one reviewer.`}
        submitLabel="Assign"
        error={assignError}
        onSubmit={async () => {
          if (!assignee.trim()) {
            setAssignError('Name the reviewer these tasks are assigned to.')
            return
          }
          try {
            await assignTasks(
              tasksForSelected.map((task) => task.id),
              assignee.trim(),
            )
            notify.success(`${tasksForSelected.length} tasks assigned to ${assignee.trim()}.`)
            setAssignOpen(false)
            setSelected(new Set())
          } catch (error) {
            setAssignError(error instanceof Error ? error.message : 'Could not assign these tasks.')
          }
        }}
      >
        <label className="block text-xs font-semibold text-foreground" htmlFor="bulk-assignee">
          Reviewer
        </label>
        <Input
          id="bulk-assignee"
          value={assignee}
          onChange={(event) => setAssignee(event.target.value)}
          placeholder="e.g. language-reviewer-1"
        />
        <p className="text-[11px] text-muted-foreground">
          The reviewer must differ from the contributor. Assignments are recorded in the audit
          trail; the review contract has no assignment write yet.
        </p>
        <p className="text-[11px] text-muted-foreground">
          {tasksForSelected.length === 0
            ? 'The selected species have no language tasks in the loaded sample.'
            : tasksForSelected
                .slice(0, 4)
                .map((task) => `${task.speciesName} · ${task.languageText} ${task.type}`)
                .join(' · ')}
        </p>
      </FormDialog>
    </div>
  )
}
