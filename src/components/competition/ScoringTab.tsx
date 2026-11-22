import { useCallback, useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { EyeSlash, Gauge, Lock, LockOpen, Scales } from '@phosphor-icons/react'
import type { ApiClient } from '#/lib/api'
import type {
  Assignment,
  Category,
  CompetitionEntry,
  Judge,
  Score,
} from '#/lib/api/competition'
import { Button } from '#/components/ui/button'
import { FormInput } from '#/components/shared/FormField'
import { StatusBadge } from '#/components/shared/StatusBadge'
import {
  DEFAULT_CRITERIA,
  RUBRIC,
  isCriteriaInRange,
  weightedTotal,
  type Criteria,
} from '#/lib/competition/scoring'
import {
  Detail,
  EmptyRow,
  LoadingRow,
  Panel,
  SectionHeading,
  Stat,
  TABLE_CELL,
  TABLE_HEAD,
  formatScore,
  titleCase,
} from './shared'

export function ScoringTab({
  api,
  editionId,
  canEdit,
  canPublish,
}: {
  api: ApiClient
  editionId: string
  canEdit: boolean
  canPublish: boolean
}) {
  const [entries, setEntries] = useState<CompetitionEntry[] | null>(null)
  const [categories, setCategories] = useState<Category[]>([])
  const [judges, setJudges] = useState<Judge[]>([])
  const [assignments, setAssignments] = useState<Assignment[]>([])
  const [scores, setScores] = useState<Score[]>([])
  const [loading, setLoading] = useState(true)
  const [categoryId, setCategoryId] = useState('')
  const [judgeId, setJudgeId] = useState('')
  const [panelEntry, setPanelEntry] = useState<CompetitionEntry | null>(null)
  const [criteria, setCriteria] = useState<Criteria>(DEFAULT_CRITERIA)
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [locking, setLocking] = useState(false)
  const [categoryInitialised, setCategoryInitialised] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [entryResult, categoryResult, judgeResult, assignmentResult, scoreResult] =
        await Promise.all([
          api.competition.entries.list(editionId),
          api.competition.categories.list(editionId),
          api.competition.judges.list(editionId),
          api.competition.assignments.list(editionId),
          api.competition.scores.list(editionId),
        ])
      setEntries(entryResult.items)
      setCategories(categoryResult.items)
      setJudges(judgeResult.items)
      setAssignments(assignmentResult.items)
      setScores(scoreResult.items)
    } catch {
      toast.error('Failed to load judging state')
      setEntries([])
    } finally {
      setLoading(false)
    }
  }, [api, editionId])

  useEffect(() => {
    void load()
  }, [load])

  useEffect(() => {
    setCategoryId('')
    setJudgeId('')
    setPanelEntry(null)
    setCategoryInitialised(false)
  }, [editionId])

  useEffect(() => {
    if (categoryInitialised || categories.length === 0) return
    setCategoryId(categories[0].id)
    setCategoryInitialised(true)
  }, [categories, categoryInitialised])

  const categoryEntries = useMemo(
    () => (entries ?? []).filter((entry) => !categoryId || entry.categoryId === categoryId),
    [categoryId, entries],
  )

  const selectedAssignment = useMemo(() => {
    if (!judgeId || !categoryId) return null
    return (
      assignments.find(
        (assignment) =>
          assignment.judgeId === judgeId &&
          assignment.categoryId === categoryId &&
          assignment.status !== 'recused',
      ) ?? null
    )
  }, [assignments, categoryId, judgeId])

  const scoreFor = (entryId: string, assignmentId: string | null) =>
    scores.find(
      (score) => score.entryId === entryId && (!assignmentId || score.assignmentId === assignmentId),
    ) ?? null

  const judgeName = useCallback(
    (id: string) => judges.find((judge) => judge.id === id)?.displayName ?? 'Unknown judge',
    [judges],
  )

  const categoryName = useCallback(
    (id: string) => categories.find((category) => category.id === id)?.label ?? 'Category',
    [categories],
  )

  const openScore = (entry: CompetitionEntry) => {
    const existing = selectedAssignment
      ? scoreFor(entry.id, selectedAssignment.id)
      : scores.find((score) => score.entryId === entry.id)
    setPanelEntry(entry)
    setCriteria(
      existing
        ? {
            relevance: existing.relevance,
            craft: existing.craft,
            originality: existing.originality,
            impact: existing.impact,
          }
        : DEFAULT_CRITERIA,
    )
    setNotes(existing?.notes ?? '')
  }

  const saveScore = async () => {
    if (!panelEntry || !selectedAssignment) {
      toast.error('Choose a judge assigned to this category')
      return
    }
    if (!isCriteriaInRange(criteria)) {
      toast.error('Each rubric score must be between 1 and 10')
      return
    }
    setSaving(true)
    try {
      await api.competition.scores.upsert({
        assignmentId: selectedAssignment.id,
        entryId: panelEntry.id,
        relevance: criteria.relevance,
        craft: criteria.craft,
        originality: criteria.originality,
        impact: criteria.impact,
        notes: notes.trim() || null,
      })
      toast.success('Score saved')
      setPanelEntry(null)
      await load()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to save score')
    } finally {
      setSaving(false)
    }
  }

  const setLock = async (lock: boolean) => {
    setLocking(true)
    try {
      const result = await api.competition.scores.lock(editionId, {
        categoryId: categoryId || null,
        lock,
      })
      toast.success(
        `${lock ? 'Locked' : 'Unlocked'} ${result.updated} score${result.updated === 1 ? '' : 's'}`,
      )
      await load()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to update score locks')
    } finally {
      setLocking(false)
    }
  }

  const stats = useMemo(() => {
    const list = entries ?? []
    const activeAssignments = assignments.filter((assignment) => assignment.status === 'assigned')
    const expected = activeAssignments.reduce(
      (total, assignment) =>
        total + list.filter((entry) => entry.categoryId === assignment.categoryId).length,
      0,
    )
    return {
      expected,
      submitted: scores.length,
      locked: scores.filter((score) => score.lockedAt).length,
      progress: expected === 0 ? 0 : Math.round((scores.length / expected) * 100),
    }
  }, [assignments, entries, scores])

  const progressByJudge = useMemo(() => {
    return judges
      .map((judge) => {
        const rows = assignments.filter(
          (assignment) => assignment.judgeId === judge.id && assignment.status !== 'recused',
        )
        const expected = rows.reduce(
          (total, assignment) =>
            total +
            (entries ?? []).filter((entry) => entry.categoryId === assignment.categoryId).length,
          0,
        )
        const submitted = scores.filter((score) => score.judgeId === judge.id)
        const average =
          submitted.length === 0
            ? null
            : submitted.reduce((total, score) => total + score.total, 0) / submitted.length
        return {
          judge,
          categories: rows.map((row) => categoryName(row.categoryId)),
          expected,
          submitted: submitted.length,
          average,
        }
      })
      .sort((a, b) => a.judge.displayName.localeCompare(b.judge.displayName))
  }, [assignments, categoryName, entries, judges, scores])

  const panelAngle = selectedAssignment ? null : (
    <div className="rounded-lg border border-dashed border-border p-3 text-sm text-muted-foreground">
      Choose a judge who is assigned to this category to enter a score. Admin scoring writes the
      score against that assignment.
    </div>
  )

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Scores expected" value={stats.expected} icon={Scales} />
        <Stat label="Scores entered" value={stats.submitted} foot={`${stats.progress}% complete`} />
        <Stat label="Locked" value={stats.locked} foot="Corrections need an unlock" />
        <Stat label="Panel size" value={assignments.filter((a) => a.status === 'assigned').length} foot="Across categories" />
      </div>

      <div className="flex flex-col gap-3 rounded-lg border border-[var(--amber)]/40 bg-[var(--amber-bg)]/40 p-3 sm:flex-row sm:items-center">
        <EyeSlash className="size-5 shrink-0 text-[var(--amber-deep)]" weight="duotone" />
        <p className="text-xs text-foreground">
          <span className="font-semibold">Blind view.</span> Judges see the work and its category
          only. Entrant name, county, team roster, and contact details stay hidden.
        </p>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <select
          aria-label="Scoring category"
          className="h-9 rounded-md border border-input bg-background px-3 text-sm"
          value={categoryId}
          onChange={(event) => setCategoryId(event.target.value)}
        >
          <option value="">All categories</option>
          {categories.map((category) => (
            <option key={category.id} value={category.id}>
              {category.label}
            </option>
          ))}
        </select>
        <select
          aria-label="Scoring judge"
          className="h-9 rounded-md border border-input bg-background px-3 text-sm"
          value={judgeId}
          onChange={(event) => setJudgeId(event.target.value)}
        >
          <option value="">Select a judge…</option>
          {judges.map((judge) => (
            <option key={judge.id} value={judge.id}>
              {judge.displayName}
            </option>
          ))}
        </select>
        <div className="flex flex-1 flex-wrap items-center justify-end gap-2">
          {canPublish ? (
            <>
              <Button
                variant="outline"
                onClick={() => void setLock(true)}
                disabled={locking || !categoryId}
              >
                <Lock /> Lock category
              </Button>
              <Button
                variant="outline"
                onClick={() => void setLock(false)}
                disabled={locking || !categoryId}
              >
                <LockOpen /> Unlock category
              </Button>
            </>
          ) : null}
        </div>
      </div>

      {panelAngle}

      <SectionHeading
        title="Entries to score"
        description="The weighted total is relevance 25, craft 30, originality 25, impact 20, on a 1 to 10 scale."
      />

      <div className="overflow-hidden rounded-lg border border-border">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className={TABLE_HEAD}>
              <tr>
                <th className="px-4 py-3 font-semibold">Entry</th>
                <th className="px-4 py-3 font-semibold">Category</th>
                <th className="px-4 py-3 font-semibold">Panel scores</th>
                <th className="px-4 py-3 font-semibold">
                  {selectedAssignment ? judgeName(selectedAssignment.judgeId) : 'Selected judge'}
                </th>
                <th className="px-4 py-3 font-semibold">Lock</th>
                <th className="px-4 py-3 text-right font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading ? (
                <LoadingRow colSpan={6} label="Loading scoring state…" />
              ) : categoryEntries.length === 0 ? (
                <EmptyRow colSpan={6}>
                  No entries in this category yet. Attach repository entries before scoring.
                </EmptyRow>
              ) : (
                categoryEntries.map((entry) => {
                  const assignedScore = selectedAssignment
                    ? scoreFor(entry.id, selectedAssignment.id)
                    : null
                  const anyScore = scoreFor(entry.id, null)
                  return (
                    <tr key={entry.id} className="align-top hover:bg-muted/30">
                      <td className={TABLE_CELL}>
                        <button
                          type="button"
                          className="text-left"
                          onClick={() => openScore(entry)}
                        >
                          <span className="block font-semibold">{entry.title}</span>
                          <span className="mt-0.5 block text-xs text-muted-foreground">
                            Blind entry · identity hidden
                          </span>
                        </button>
                      </td>
                      <td className={`${TABLE_CELL} text-xs`}>{entry.categoryLabel}</td>
                      <td className={`${TABLE_CELL} text-xs`}>
                        {entry.scoreCount} of 3
                      </td>
                      <td className={TABLE_CELL}>
                        {assignedScore ? (
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-sm font-semibold">
                              {formatScore(assignedScore.total)}
                            </span>
                            <StatusBadge
                              status={assignedScore.lockedAt ? 'completed' : 'active'}
                              label={assignedScore.lockedAt ? 'Locked' : 'Submitted'}
                            />
                          </div>
                        ) : selectedAssignment ? (
                          <span className="text-xs text-muted-foreground">Not scored</span>
                        ) : anyScore ? (
                          <span className="text-xs text-muted-foreground">
                            {formatScore(anyScore.total)} · {judgeName(anyScore.judgeId)}
                          </span>
                        ) : (
                          <span className="text-xs text-muted-foreground">-</span>
                        )}
                      </td>
                      <td className={TABLE_CELL}>
                        <StatusBadge
                          status={anyScore?.lockedAt ? 'completed' : 'draft'}
                          label={anyScore?.lockedAt ? 'Locked' : 'Open'}
                        />
                      </td>
                      <td className={TABLE_CELL}>
                        <div className="flex justify-end">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => openScore(entry)}
                            disabled={!canEdit}
                          >
                            {assignedScore ? 'Edit score' : 'Score'}
                          </Button>
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      <SectionHeading
        title="Progress by judge"
        description="Progress counts entries in each assigned category. Locked scores still count as complete."
      />

      <div className="overflow-hidden rounded-lg border border-border">
        <table className="w-full text-left text-sm">
          <thead className={TABLE_HEAD}>
            <tr>
              <th className="px-4 py-3 font-semibold">Judge</th>
              <th className="px-4 py-3 font-semibold">Categories</th>
              <th className="px-4 py-3 font-semibold">Scored</th>
              <th className="px-4 py-3 font-semibold">Average</th>
              <th className="px-4 py-3 font-semibold">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {progressByJudge.length === 0 ? (
              <EmptyRow colSpan={5}>No judges yet.</EmptyRow>
            ) : (
              progressByJudge.map((row) => (
                <tr key={row.judge.id} className="hover:bg-muted/30">
                  <td className="px-4 py-3 font-medium">{row.judge.displayName}</td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">
                    {row.categories.length === 0 ? 'Unassigned' : row.categories.join(', ')}
                  </td>
                  <td className="px-4 py-3 text-xs">
                    {row.submitted} of {row.expected}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs">{formatScore(row.average)}</td>
                  <td className="px-4 py-3">
                    <StatusBadge status={row.judge.status} label={titleCase(row.judge.status)} />
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {panelEntry ? (
        <Panel
          kicker="Blind score"
          title={panelEntry.title}
          description={`${panelEntry.categoryLabel}. One judge's independent score. Individual judge scores stay private; only the panel average is published.`}
          onClose={() => setPanelEntry(null)}
          footer={
            <>
              <Button onClick={() => void saveScore()} disabled={saving || !canEdit}>
                {saving ? 'Saving…' : 'Save score'}
              </Button>
              <Button variant="outline" onClick={() => setPanelEntry(null)}>
                Cancel
              </Button>
            </>
          }
        >
          {!selectedAssignment ? (
            <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm">
              Select a judge assigned to {panelEntry.categoryLabel} before entering a score.
            </div>
          ) : (
            <div className="rounded-lg border border-border p-4 text-sm">
              <div className="flex flex-wrap items-center gap-2">
                <Gauge className="size-4 text-muted-foreground" weight="duotone" />
                <span className="font-semibold">{judgeName(selectedAssignment.judgeId)}</span>
                <StatusBadge
                  status={selectedAssignment.status}
                  label={titleCase(selectedAssignment.status)}
                />
              </div>
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            {RUBRIC.map((item) => (
              <FormInput
                key={item.key}
                label={`${item.label} (${item.weight}%)`}
                type="number"
                value={String(criteria[item.key])}
                onChange={(value) =>
                  setCriteria((current) => ({
                    ...current,
                    [item.key]: Number(value),
                  }))
                }
                description="1 to 10"
                disabled={!canEdit}
              />
            ))}
          </div>

          <div className="flex items-center justify-between rounded-lg border border-border bg-muted/30 p-4">
            <div>
              <p className="font-mono text-[9px] uppercase tracking-[0.14em] text-muted-foreground">
                Weighted total
              </p>
              <p className="mt-0.5 text-xs text-muted-foreground">Out of 100</p>
            </div>
            <p className="font-mono text-3xl font-bold">{formatScore(weightedTotal(criteria))}</p>
          </div>

          <div>
            <label
              htmlFor="score-note"
              className="font-mono text-[9px] uppercase tracking-[0.14em] text-muted-foreground"
            >
              Judge note
            </label>
            <textarea
              id="score-note"
              rows={4}
              className="mt-1 w-full rounded-md border border-input bg-background p-3 text-sm"
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              placeholder="Optional note for the panel record. Not published."
              disabled={!canEdit}
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <Detail label="Rubric weights" value="25 / 30 / 25 / 20" />
            <Detail label="Tie-break order" value="Craft, originality, panel chair" />
          </div>
        </Panel>
      ) : null}
    </div>
  )
}
