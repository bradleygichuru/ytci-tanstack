import { useMemo, useState } from 'react'
import { createFileRoute, Link } from '@tanstack/react-router'
import { UserSwitch } from '@phosphor-icons/react'
import { Button } from '#/components/ui/button'
import { Input } from '#/components/ui/input'
import { FormDialog } from '#/components/shell/FormDialog'
import { FilterBar } from '#/components/shell/FilterBar'
import { PageHeader } from '#/components/shell/PageHeader'
import { DataStateView } from '#/components/shell/DataState'
import { Can } from '#/components/shell/Gates'
import { ContractGapNote, SectionCard, StatusPill } from '#/components/species/shared'
import { TaskEditor } from '#/components/species/task-editor'
import { useSpecies } from '#/lib/species/store'
import { notify } from '#/lib/toast'
import { formatDate, type SpeciesTask } from '#/lib/species/model'

interface TranslationSearch {
  task?: string
}

export const Route = createFileRoute('/_authenticated/programme/species/translation')({
  validateSearch: (search: Record<string, unknown>): TranslationSearch => ({
    task: typeof search.task === 'string' ? search.task : undefined,
  }),
  component: TranslationQueuePage,
})

const STATE_OPTIONS: { value: string; label: string }[] = [
  { value: 'all', label: 'All states' },
  { value: 'stale', label: 'Stale' },
  { value: 'in_review', label: 'In review' },
  { value: 'missing', label: 'Missing' },
  { value: 'changes_requested', label: 'Changes requested' },
  { value: 'reviewed', label: 'Reviewed' },
]

const TYPE_OPTIONS: { value: string; label: string }[] = [
  { value: 'all', label: 'All task types' },
  { value: 'prose', label: 'Prose' },
  { value: 'name', label: 'Name' },
  { value: 'audio', label: 'Audio' },
  { value: 'media', label: 'Media' },
  { value: 'where_to_see', label: 'Where to see' },
  { value: 'base', label: 'Base record' },
]

function TranslationQueuePage() {
  const {
    fixtureState,
    setFixtureState,
    tasks,
    details,
    assignTasks,
    actor,
    can,
    overlay,
  } = useSpecies()
  const search = Route.useSearch()
  const navigate = Route.useNavigate()
  const [query, setQuery] = useState('')
  const [state, setState] = useState('all')
  const [type, setType] = useState('all')
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [assignOpen, setAssignOpen] = useState(false)
  const [assignee, setAssignee] = useState('')
  const [assignError, setAssignError] = useState<string | null>(null)

  const reviewers = useMemo(() => {
    const names = tasks
      .flatMap((task) => [task.assignee, task.reviewer, task.contributor])
      .filter((value): value is string => Boolean(value))
    return [...new Set(names)].sort()
  }, [tasks])

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase()
    return tasks.filter((task) => {
      if (
        needle &&
        !`${task.speciesName} ${task.languageText} ${task.type} ${task.reason}`
          .toLowerCase()
          .includes(needle)
      ) {
        return false
      }
      if (state !== 'all' && task.state !== state) return false
      if (type !== 'all' && task.type !== type) return false
      return true
    })
  }, [query, state, tasks, type])

  const selectedTask =
    tasks.find((task) => task.id === search.task) ?? filtered[0] ?? tasks[0] ?? null
  const selectedDetail = selectedTask
    ? details.find((detail) => detail.slug === selectedTask.speciesSlug) ?? null
    : null
  const selectedRows = tasks.filter((task) => selected.has(task.id))
  const isFiltered = Boolean(query) || state !== 'all' || type !== 'all'
  const staleCount = tasks.filter((task) => task.state === 'stale').length
  const missingCount = tasks.filter((task) => task.state === 'missing').length

  function openTask(task: SpeciesTask) {
    void navigate({ search: { task: task.id } })
  }

  if (fixtureState === 'empty') {
    return (
      <div className="space-y-4">
        <PageHeader title="Translation queue" description="Type-specific tasks with derived stale state." />
        <DataStateView
          state="empty"
          title="No translation tasks"
          description="The queue is empty for this state. Return to live data to see the sample records."
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
        <PageHeader title="Translation queue" description="Type-specific tasks with derived stale state." />
        <DataStateView
          state="error"
          title="The translation queue is unavailable"
          description="No partial tasks are shown. Other sections keep working."
          onRetry={() => setFixtureState('default')}
        />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title="Translation queue"
        description="Name, prose, audio and evidence tasks, each with the editor its record needs. Stale is derived from the base revision."
        badge={
          <span className="text-xs text-muted-foreground">
            {staleCount} stale · {missingCount} missing
          </span>
        }
      />

      <FilterBar
        searchValue={query}
        onSearchChange={setQuery}
        searchPlaceholder="Search species, language or task"
        onReset={() => {
          setQuery('')
          setState('all')
          setType('all')
        }}
        isFiltered={isFiltered}
      >
        <select
          aria-label="Filter tasks by state"
          value={state}
          onChange={(event) => setState(event.target.value)}
          className="h-9 rounded-md border border-border bg-card px-2 text-xs font-semibold"
        >
          {STATE_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <select
          aria-label="Filter tasks by type"
          value={type}
          onChange={(event) => setType(event.target.value)}
          className="h-9 rounded-md border border-border bg-card px-2 text-xs font-semibold"
        >
          {TYPE_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </FilterBar>

      {selectedRows.length > 0 ? (
        <div className="flex flex-wrap items-center gap-2 rounded-lg border border-primary/30 bg-primary/5 px-3 py-2">
          <span className="text-xs font-semibold text-foreground">{selectedRows.length} selected</span>
          <div className="ml-auto flex items-center gap-2">
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
            <Button variant="ghost" size="sm" onClick={() => setSelected(new Set())}>
              Clear
            </Button>
          </div>
        </div>
      ) : null}

      <SectionCard
        title="Tasks"
        description="Select a row to open its type-specific editor below."
        actions={<span className="text-[11px] text-muted-foreground">{filtered.length} shown</span>}
      >
        <div className="overflow-x-auto">
          <table className="w-full min-w-[820px] text-sm">
            <caption className="sr-only">Translation tasks with type, state and owner</caption>
            <thead>
              <tr className="border-b border-border text-left text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
                <th className="px-2 py-2">
                  <input
                    type="checkbox"
                    aria-label="Select every visible task"
                    checked={filtered.length > 0 && filtered.every((task) => selected.has(task.id))}
                    onChange={(event) => {
                      setSelected(
                        event.target.checked
                          ? new Set(filtered.map((task) => task.id))
                          : new Set(),
                      )
                    }}
                  />
                </th>
                <th className="px-2 py-2">Species</th>
                <th className="px-2 py-2">Language</th>
                <th className="px-2 py-2">Type</th>
                <th className="px-2 py-2">State</th>
                <th className="px-2 py-2">Assignee</th>
                <th className="px-2 py-2">Age</th>
                <th className="px-2 py-2 text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-2 py-8 text-center text-sm text-muted-foreground">
                    No tasks match this search or filter.{' '}
                    <button
                      type="button"
                      className="font-semibold text-primary underline"
                      onClick={() => {
                        setQuery('')
                        setState('all')
                        setType('all')
                      }}
                    >
                      Clear filters
                    </button>
                  </td>
                </tr>
              ) : (
                filtered.map((task) => {
                  const active = selectedTask?.id === task.id
                  const assigned = overlay.assignments[task.id] ?? task.assignee
                  return (
                    <tr
                      key={task.id}
                      className={`border-b border-border last:border-0 ${active ? 'bg-muted/50' : 'hover:bg-muted/30'}`}
                    >
                      <td className="px-2 py-2">
                        <input
                          type="checkbox"
                          aria-label={`Select ${task.speciesName} ${task.languageText} ${task.type}`}
                          checked={selected.has(task.id)}
                          onChange={(event) => {
                            setSelected((current) => {
                              const next = new Set(current)
                              if (event.target.checked) next.add(task.id)
                              else next.delete(task.id)
                              return next
                            })
                          }}
                        />
                      </td>
                      <td className="px-2 py-2">
                        <button
                          type="button"
                          onClick={() => openTask(task)}
                          className="text-left font-semibold text-foreground hover:text-primary"
                        >
                          {task.speciesName}
                        </button>
                        <p className="mt-0.5 max-w-[22rem] text-[11px] text-muted-foreground">{task.reason}</p>
                      </td>
                      <td className="px-2 py-2 text-xs">{task.languageText}</td>
                      <td className="px-2 py-2 text-xs capitalize">{task.type.replace('_', ' ')}</td>
                      <td className="px-2 py-2">
                        <StatusPill status={task.state} />
                      </td>
                      <td className="px-2 py-2 text-xs text-muted-foreground">
                        {assigned ?? '—'}
                        {task.reviewer ? (
                          <span className="block text-[10px]">reviewer {task.reviewer}</span>
                        ) : null}
                      </td>
                      <td className="px-2 py-2 text-xs text-muted-foreground">{task.age}</td>
                      <td className="px-2 py-2 text-right">
                        <Button variant="outline" size="xs" onClick={() => openTask(task)}>
                          Open
                        </Button>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </SectionCard>

      {selectedTask ? (
        <div className="grid gap-4 xl:grid-cols-2">
          <SectionCard
            title="English base"
            description="The language-neutral reference the target is translated from."
            actions={<StatusPill status={selectedDetail?.content?.reviewStatus ?? 'missing'} />}
          >
            {selectedDetail ? (
              <div className="space-y-2 text-sm">
                <dl className="grid grid-cols-[7rem_1fr] gap-x-3 gap-y-1.5 text-xs">
                  <dt className="font-semibold text-muted-foreground">Name</dt>
                  <dd className="text-foreground">{selectedDetail.nameEn}</dd>
                  <dt className="font-semibold text-muted-foreground">Scientific</dt>
                  <dd className="italic text-foreground">{selectedDetail.scientificName}</dd>
                  <dt className="font-semibold text-muted-foreground">Habitat</dt>
                  <dd className="text-foreground">{selectedDetail.content?.habitat ?? 'Not set'}</dd>
                  <dt className="font-semibold text-muted-foreground">Where to see</dt>
                  <dd className="text-foreground">{selectedDetail.content?.whereToSee ?? 'Not set'}</dd>
                  <dt className="font-semibold text-muted-foreground">Source version</dt>
                  <dd className="text-foreground">
                    v{selectedDetail.content?.sourceVersion ?? 0} · base v
                    {selectedDetail.contentVersion ?? 0}
                  </dd>
                  <dt className="font-semibold text-muted-foreground">Reviewed</dt>
                  <dd className="text-foreground">
                    {formatDate(selectedDetail.content?.publishedAt ?? null)}
                  </dd>
                </dl>
                <p className="text-[11px] text-muted-foreground">
                  The target is authored and reviewed independently. The app shows the visible
                  English fallback when prose is missing.
                </p>
                <div className="flex flex-wrap gap-2">
                  <Button variant="outline" size="sm" asChild>
                    <Link
                      to="/programme/species/$speciesId"
                      params={{ speciesId: selectedDetail.slug }}
                    >
                      Open base record
                    </Link>
                  </Button>
                  <Button variant="outline" size="sm" asChild>
                    <Link
                      to="/programme/species/$speciesId/languages"
                      params={{ speciesId: selectedDetail.slug }}
                      search={{ variant: selectedTask.language ?? 'en' }}
                    >
                      Language coverage
                    </Link>
                  </Button>
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                This species is outside the loaded detail sample. Open the catalogue row to load it.
              </p>
            )}
          </SectionCard>

          <TaskEditor key={selectedTask.id} task={selectedTask} detail={selectedDetail} />
        </div>
      ) : null}

      <ContractGapNote>
        The review queue carries one item per record, but the frozen contract has no assignment
        write and no submit-translation endpoint. Assignment, submission and local stale clearing
        are recorded in the audit overlay; the Go API still owns review decisions, publish and
        rights.
        {actor.role === 'translator' ? ' You are signed in as a translator: review actions stay hidden.' : ''}
        {can('species.review_rights') ? ' Rights review actions are on the sources screen.' : ''}
      </ContractGapNote>

      <FormDialog
        open={assignOpen}
        onOpenChange={setAssignOpen}
        title="Assign tasks"
        description={`Assign ${selectedRows.length} task${selectedRows.length === 1 ? '' : 's'} to one reviewer.`}
        submitLabel="Assign"
        error={assignError}
        onSubmit={async () => {
          if (!assignee.trim()) {
            setAssignError('Choose or name a reviewer.')
            return
          }
          try {
            await assignTasks(
              selectedRows.map((task) => task.id),
              assignee.trim(),
            )
            notify.success(`${selectedRows.length} tasks assigned to ${assignee.trim()}.`)
            setAssignOpen(false)
            setSelected(new Set())
          } catch (error) {
            setAssignError(error instanceof Error ? error.message : 'Could not assign these tasks.')
          }
        }}
      >
        <label className="block text-xs font-semibold text-foreground" htmlFor="task-assignee">
          Reviewer
        </label>
        <Input
          id="task-assignee"
          list="task-reviewers"
          value={assignee}
          onChange={(event) => setAssignee(event.target.value)}
          placeholder="language-reviewer-1"
        />
        <datalist id="task-reviewers">
          {reviewers.map((name) => (
            <option key={name} value={name} />
          ))}
        </datalist>
        <p className="text-[11px] text-muted-foreground">
          Reviewer must differ from the contributor. Assignment is audited; the API does not expose
          an assignment write yet.
        </p>
      </FormDialog>
    </div>
  )
}
