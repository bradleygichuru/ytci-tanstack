import { useCallback, useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { ArrowSquareOut, CheckCircle, Plus, Prohibit } from '@phosphor-icons/react'
import type { ApiClient } from '#/lib/api'
import type {
  Category,
  CompetitionEntry,
  EligibilityStatus,
} from '#/lib/api/competition'
import type { RepositoryEntryAdmin } from '#/lib/api/repository'
import { Button } from '#/components/ui/button'
import { FormSelect, FormInput } from '#/components/shared/FormField'
import { StatusBadge } from '#/components/shared/StatusBadge'
import {
  Detail,
  EmptyRow,
  LoadingRow,
  Panel,
  SectionHeading,
  Stat,
  TABLE_CELL,
  TABLE_HEAD,
  formatDate,
  titleCase,
} from './shared'

const ELIGIBILITY: Array<{ value: EligibilityStatus; label: string }> = [
  { value: 'pending', label: 'Pending review' },
  { value: 'eligible', label: 'Eligible' },
  { value: 'ineligible', label: 'Ineligible' },
]

export function EntriesTab({
  api,
  editionId,
  canEdit,
}: {
  api: ApiClient
  editionId: string
  canEdit: boolean
}) {
  const [entries, setEntries] = useState<CompetitionEntry[] | null>(null)
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [categoryFilter, setCategoryFilter] = useState('')
  const [eligibilityFilter, setEligibilityFilter] = useState('')
  const [panel, setPanel] = useState<'review' | 'attach' | null>(null)
  const [selected, setSelected] = useState<CompetitionEntry | null>(null)
  const [status, setStatus] = useState<EligibilityStatus>('pending')
  const [note, setNote] = useState('')
  const [saving, setSaving] = useState(false)
  const [repositoryEntries, setRepositoryEntries] = useState<RepositoryEntryAdmin[]>([])
  const [attach, setAttach] = useState({
    repositoryEntryId: '',
    categoryId: '',
    teamName: '',
    leadUserId: '',
  })

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [entryResult, categoryResult] = await Promise.all([
        api.competition.entries.list(editionId, {
          category: categoryFilter || undefined,
          eligibility: eligibilityFilter || undefined,
        }),
        api.competition.categories.list(editionId),
      ])
      setEntries(entryResult.items)
      setCategories(categoryResult.items)
    } catch {
      toast.error('Failed to load competition entries')
      setEntries([])
    } finally {
      setLoading(false)
    }
  }, [api, categoryFilter, editionId, eligibilityFilter])

  useEffect(() => {
    void load()
  }, [load])

  useEffect(() => {
    setCategoryFilter('')
    setEligibilityFilter('')
    setPanel(null)
  }, [editionId])

  const openReview = (entry: CompetitionEntry) => {
    setSelected(entry)
    setStatus(entry.eligibilityStatus)
    setNote(entry.eligibilityNote ?? '')
    setPanel('review')
  }

  const openAttach = async () => {
    setAttach({ repositoryEntryId: '', categoryId: '', teamName: '', leadUserId: '' })
    setPanel('attach')
    try {
      const result = await api.repository.entries.list({ status: 'published', limit: 100 })
      setRepositoryEntries(result.items)
    } catch {
      toast.error('Failed to load repository entries')
      setRepositoryEntries([])
    }
  }

  const saveEligibility = async () => {
    if (!selected) return
    if (status === 'ineligible' && note.trim().length === 0) {
      toast.error('Add a note explaining why the entry is ineligible')
      return
    }
    setSaving(true)
    try {
      const saved = await api.competition.entries.setEligibility(
        selected.id,
        status,
        note.trim() || null,
      )
      toast.success('Eligibility decision saved')
      setSelected(saved)
      setPanel(null)
      await load()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to save decision')
    } finally {
      setSaving(false)
    }
  }

  const attachEntry = async () => {
    if (!attach.repositoryEntryId || !attach.categoryId) {
      toast.error('Choose a repository entry and a category')
      return
    }
    setSaving(true)
    try {
      await api.competition.entries.create(editionId, {
        repositoryEntryId: attach.repositoryEntryId,
        categoryId: attach.categoryId,
        teamName: attach.teamName.trim() || null,
        leadUserId: attach.leadUserId.trim() || null,
        eligibilityStatus: 'pending',
      })
      toast.success('Entry attached')
      setPanel(null)
      await load()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to attach entry')
    } finally {
      setSaving(false)
    }
  }

  const stats = useMemo(() => {
    const list = entries ?? []
    return {
      total: list.length,
      pending: list.filter((entry) => entry.eligibilityStatus === 'pending').length,
      eligible: list.filter((entry) => entry.eligibilityStatus === 'eligible').length,
      ineligible: list.filter((entry) => entry.eligibilityStatus === 'ineligible').length,
    }
  }, [entries])

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Entries" value={stats.total} />
        <Stat label="Pending review" value={stats.pending} foot="Eligibility undecided" />
        <Stat label="Eligible" value={stats.eligible} foot="Can be scored" />
        <Stat label="Ineligible" value={stats.ineligible} foot="Note recorded" />
      </div>

      <SectionHeading
        title="Entries"
        description="Entries link existing repository work. Decide eligibility and keep the note internal."
        actions={
          canEdit ? (
            <Button variant="outline" onClick={() => void openAttach()}>
              <Plus /> Attach entry
            </Button>
          ) : null
        }
      />

      <div className="flex flex-col gap-2 sm:flex-row">
        <select
          className="h-9 rounded-md border border-input bg-background px-3 text-sm"
          aria-label="Filter entries by category"
          value={categoryFilter}
          onChange={(event) => setCategoryFilter(event.target.value)}
        >
          <option value="">All categories</option>
          {categories.map((category) => (
            <option key={category.id} value={category.key}>
              {category.label}
            </option>
          ))}
        </select>
        <select
          className="h-9 rounded-md border border-input bg-background px-3 text-sm"
          aria-label="Filter entries by eligibility"
          value={eligibilityFilter}
          onChange={(event) => setEligibilityFilter(event.target.value)}
        >
          <option value="">All eligibility states</option>
          {ELIGIBILITY.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      <div className="overflow-hidden rounded-lg border border-border">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[820px] text-left text-sm">
            <thead className={TABLE_HEAD}>
              <tr>
                <th className="px-4 py-3 font-semibold">Entry</th>
                <th className="px-4 py-3 font-semibold">Category</th>
                <th className="px-4 py-3 font-semibold">Eligibility</th>
                <th className="px-4 py-3 font-semibold">Scores</th>
                <th className="px-4 py-3 font-semibold">Votes</th>
                <th className="px-4 py-3 text-right font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading ? (
                <LoadingRow colSpan={6} label="Loading entries…" />
              ) : !entries || entries.length === 0 ? (
                <EmptyRow colSpan={6}>
                  No entries in this view. Attach a published repository entry to start the
                  eligibility review.
                </EmptyRow>
              ) : (
                entries.map((entry) => (
                  <tr key={entry.id} className="align-top hover:bg-muted/30">
                    <td className={TABLE_CELL}>
                      <button
                        type="button"
                        className="text-left"
                        onClick={() => openReview(entry)}
                      >
                        <span className="block font-semibold">{entry.title}</span>
                        <span className="mt-0.5 block text-xs text-muted-foreground">
                          {entry.teamName ? `Team ${entry.teamName}` : 'Individual entry'}
                        </span>
                        {entry.eligibilityNote ? (
                          <span className="mt-1 line-clamp-1 block text-[11px] text-muted-foreground">
                            {entry.eligibilityNote}
                          </span>
                        ) : null}
                      </button>
                    </td>
                    <td className={`${TABLE_CELL} text-xs`}>{entry.categoryLabel}</td>
                    <td className={TABLE_CELL}>
                      <StatusBadge
                        status={entry.eligibilityStatus}
                        label={titleCase(entry.eligibilityStatus)}
                      />
                    </td>
                    <td className={`${TABLE_CELL} text-xs`}>{entry.scoreCount}</td>
                    <td className={`${TABLE_CELL} text-xs`}>{entry.voteCount}</td>
                    <td className={TABLE_CELL}>
                      <div className="flex justify-end gap-1">
                        <Button size="sm" variant="outline" onClick={() => openReview(entry)}>
                          Review
                        </Button>
                        <Button size="icon-sm" variant="ghost" asChild>
                          <a
                            href={`https://ytci-repository.vercel.app/entry/${entry.repositorySlug}`}
                            target="_blank"
                            rel="noreferrer"
                            aria-label={`Open ${entry.title} in the repository`}
                          >
                            <ArrowSquareOut />
                          </a>
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {panel === 'review' && selected ? (
        <Panel
          kicker="Eligibility review"
          title={selected.title}
          description="The note stays internal. Ineligible entries stay in the list so reinstatement is possible."
          onClose={() => setPanel(null)}
          footer={
            canEdit ? (
              <>
                <Button onClick={() => void saveEligibility()} disabled={saving}>
                  <CheckCircle /> {saving ? 'Saving…' : 'Save decision'}
                </Button>
                <Button variant="outline" onClick={() => setPanel(null)}>
                  Cancel
                </Button>
              </>
            ) : null
          }
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <Detail label="Category" value={selected.categoryLabel} />
            <Detail label="Repository slug" value={selected.repositorySlug} />
            <Detail label="Team" value={selected.teamName ?? 'Individual'} />
            <Detail label="Attached" value={formatDate(selected.createdAt)} />
            <Detail label="Judge scores" value={String(selected.scoreCount)} />
            <Detail label="Live votes" value={String(selected.voteCount)} />
          </div>

          <FormSelect
            label="Eligibility decision"
            value={status}
            onChange={(value) => setStatus(value as EligibilityStatus)}
            options={ELIGIBILITY}
            disabled={!canEdit}
          />
          <div>
            <label
              htmlFor="eligibility-note"
              className="font-mono text-[11px] uppercase tracking-[0.14em] text-muted-foreground"
            >
              Decision note
            </label>
            <textarea
              id="eligibility-note"
              value={note}
              onChange={(event) => setNote(event.target.value)}
              rows={4}
              disabled={!canEdit}
              className="mt-1 w-full rounded-md border border-input bg-background p-3 text-sm"
              placeholder="Rights, consent, age, or conduct reason. Required when ineligible."
            />
          </div>

          {selected.eligibilityStatus === 'ineligible' ? (
            <p className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-xs text-muted-foreground">
              <Prohibit className="mt-0.5 size-4 shrink-0 text-destructive" />
              An ineligible entry is excluded from results but is never deleted. Reinstating it
              restores it to the board.
            </p>
          ) : null}
        </Panel>
      ) : null}

      {panel === 'attach' ? (
        <Panel
          kicker="Attach entry"
          title="Add a repository entry to this edition"
          description="The competition links existing repository work. It does not duplicate the catalogue."
          onClose={() => setPanel(null)}
          footer={
            <>
              <Button onClick={() => void attachEntry()} disabled={saving}>
                {saving ? 'Attaching…' : 'Attach entry'}
              </Button>
              <Button variant="outline" onClick={() => setPanel(null)}>
                Cancel
              </Button>
            </>
          }
        >
          <div>
            <label
              htmlFor="attach-repository"
              className="font-mono text-[11px] uppercase tracking-[0.14em] text-muted-foreground"
            >
              Repository entry
            </label>
            <select
              id="attach-repository"
              className="mt-1 h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
              value={attach.repositoryEntryId}
              onChange={(event) =>
                setAttach((current) => ({ ...current, repositoryEntryId: event.target.value }))
              }
            >
              <option value="">Select a published repository entry…</option>
              {repositoryEntries.map((entry) => (
                <option key={entry.id} value={entry.id}>
                  {entry.title} ({entry.category ?? entry.kind})
                </option>
              ))}
            </select>
          </div>

          <FormSelect
            label="Category"
            required
            value={attach.categoryId}
            onChange={(value) => setAttach((current) => ({ ...current, categoryId: value }))}
            options={categories.map((category) => ({
              value: category.id,
              label: category.label,
            }))}
          />

          <div className="grid gap-4 sm:grid-cols-2">
            <FormInput
              label="Team name"
              value={attach.teamName}
              onChange={(value) => setAttach((current) => ({ ...current, teamName: value }))}
              description="Leave blank for an individual entry."
            />
            <FormInput
              label="Lead user ID"
              value={attach.leadUserId}
              onChange={(value) => setAttach((current) => ({ ...current, leadUserId: value }))}
              description="Optional. Enforces the two-category limit and self-vote exclusion."
            />
          </div>

          <p className="rounded-lg border border-dashed border-border p-3 text-xs text-muted-foreground">
            One entry per category, up to two categories per entrant or team. The API rejects a
            third category and duplicate work in the same category.
          </p>
        </Panel>
      ) : null}
    </div>
  )
}
