import { useCallback, useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { Plus, ShieldWarning, Trash, UserPlus, UsersThree } from '@phosphor-icons/react'
import type { ApiClient } from '#/lib/api'
import type {
  Assignment,
  Category,
  CompetitionEntry,
  Conflict,
  Judge,
  JudgeStatus,
} from '#/lib/api/competition'
import { Button } from '#/components/ui/button'
import { ConfirmDialog } from '#/components/shared/ConfirmDialog'
import { FormInput, FormSelect } from '#/components/shared/FormField'
import { StatusBadge } from '#/components/shared/StatusBadge'
import {
  Detail,
  EmptyRow,
  INPUT,
  LoadingRow,
  Panel,
  SectionHeading,
  Stat,
  TABLE_CELL,
  TABLE_HEAD,
  formatDate,
  titleCase,
} from './shared'

const JUDGE_STATUSES: Array<{ value: JudgeStatus; label: string }> = [
  { value: 'invited', label: 'Invited' },
  { value: 'active', label: 'Active' },
  { value: 'recused', label: 'Recused' },
  { value: 'inactive', label: 'Inactive' },
]

export function JudgesTab({
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
  const [judges, setJudges] = useState<Judge[] | null>(null)
  const [assignments, setAssignments] = useState<Assignment[]>([])
  const [conflicts, setConflicts] = useState<Conflict[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [entries, setEntries] = useState<CompetitionEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [panel, setPanel] = useState<'judge' | 'assignment' | 'conflict' | null>(null)
  const [editing, setEditing] = useState<Judge | null>(null)
  const [judgeDraft, setJudgeDraft] = useState({
    displayName: '',
    email: '',
    userId: '',
    status: 'invited' as JudgeStatus,
  })
  const [assignmentDraft, setAssignmentDraft] = useState({ judgeId: '', categoryId: '' })
  const [conflictDraft, setConflictDraft] = useState({
    judgeId: '',
    entryId: '',
    reason: '',
  })
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState<{ kind: 'judge' | 'assignment' | 'conflict'; id: string } | null>(
    null,
  )

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [judgeResult, assignmentResult, conflictResult, categoryResult, entryResult] =
        await Promise.all([
          api.competition.judges.list(editionId),
          api.competition.assignments.list(editionId),
          api.competition.conflicts.list(editionId),
          api.competition.categories.list(editionId),
          api.competition.entries.list(editionId),
        ])
      setJudges(judgeResult.items)
      setAssignments(assignmentResult.items)
      setConflicts(conflictResult.items)
      setCategories(categoryResult.items)
      setEntries(entryResult.items)
    } catch {
      toast.error('Failed to load judges')
      setJudges([])
    } finally {
      setLoading(false)
    }
  }, [api, editionId])

  useEffect(() => {
    void load()
  }, [load])

  useEffect(() => {
    setPanel(null)
    setEditing(null)
    setDeleting(null)
  }, [editionId])

  const judgeName = useCallback(
    (id: string) => judges?.find((judge) => judge.id === id)?.displayName ?? 'Unknown judge',
    [judges],
  )

  const categoryName = useCallback(
    (id: string) => categories.find((category) => category.id === id)?.label ?? 'Unknown category',
    [categories],
  )

  const entryName = useCallback(
    (id: string) => entries.find((entry) => entry.id === id)?.title ?? 'Entry',
    [entries],
  )

  const openCreate = () => {
    setEditing(null)
    setJudgeDraft({ displayName: '', email: '', userId: '', status: 'invited' })
    setPanel('judge')
  }

  const openEdit = (judge: Judge) => {
    setEditing(judge)
    setJudgeDraft({
      displayName: judge.displayName,
      email: judge.email ?? '',
      userId: judge.userId ?? '',
      status: judge.status,
    })
    setPanel('judge')
  }

  const saveJudge = async () => {
    if (!judgeDraft.displayName.trim()) {
      toast.error('Judge display name is required')
      return
    }
    setSaving(true)
    try {
      const body = {
        displayName: judgeDraft.displayName.trim(),
        email: judgeDraft.email.trim() || null,
        userId: judgeDraft.userId.trim() || null,
        status: judgeDraft.status,
      }
      if (editing) {
        await api.competition.judges.update(editing.id, body)
        toast.success('Judge updated')
      } else {
        await api.competition.judges.create(editionId, body)
        toast.success('Judge invited')
      }
      setPanel(null)
      await load()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to save judge')
    } finally {
      setSaving(false)
    }
  }

  const saveAssignment = async () => {
    if (!assignmentDraft.judgeId || !assignmentDraft.categoryId) {
      toast.error('Choose a judge and a category')
      return
    }
    setSaving(true)
    try {
      await api.competition.assignments.create(editionId, assignmentDraft)
      toast.success('Judge assigned to category')
      setPanel(null)
      await load()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to assign judge')
    } finally {
      setSaving(false)
    }
  }

  const saveConflict = async () => {
    if (!conflictDraft.judgeId || !conflictDraft.entryId || !conflictDraft.reason.trim()) {
      toast.error('Judge, entry, and reason are required')
      return
    }
    setSaving(true)
    try {
      await api.competition.conflicts.create(editionId, {
        judgeId: conflictDraft.judgeId,
        entryId: conflictDraft.entryId,
        reason: conflictDraft.reason.trim(),
      })
      toast.success('Conflict declared. The judge is recused from that category.')
      setPanel(null)
      await load()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to declare conflict')
    } finally {
      setSaving(false)
    }
  }

  const setAssignmentStatus = async (assignment: Assignment, status: 'recused' | 'completed') => {
    try {
      await api.competition.assignments.update(assignment.id, status)
      toast.success(status === 'recused' ? 'Judge recused' : 'Assignment completed')
      await load()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to update assignment')
    }
  }

  const remove = async () => {
    if (!deleting) return
    setSaving(true)
    try {
      if (deleting.kind === 'judge') await api.competition.judges.remove(deleting.id)
      if (deleting.kind === 'assignment') await api.competition.assignments.remove(deleting.id)
      if (deleting.kind === 'conflict') await api.competition.conflicts.remove(deleting.id)
      toast.success('Removed')
      setDeleting(null)
      await load()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to remove')
    } finally {
      setSaving(false)
    }
  }

  const stats = useMemo(() => {
    const list = judges ?? []
    const active = list.filter((judge) => judge.status === 'active')
    return {
      judges: list.length,
      active: active.length,
      assignments: assignments.filter((assignment) => assignment.status === 'assigned').length,
      conflicts: conflicts.length,
    }
  }, [assignments, conflicts, judges])

  const assignmentsByCategory = useMemo(() => {
    const grouped = new Map<string, Assignment[]>()
    for (const assignment of assignments) {
      const list = grouped.get(assignment.categoryId) ?? []
      list.push(assignment)
      grouped.set(assignment.categoryId, list)
    }
    return [...grouped.entries()].sort(
      (a, b) =>
        (categories.find((category) => category.id === a[0])?.sortOrder ?? 0) -
        (categories.find((category) => category.id === b[0])?.sortOrder ?? 0),
    )
  }, [assignments, categories])

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Judges" value={stats.judges} icon={UsersThree} />
        <Stat label="Active" value={stats.active} foot="Ready to score" />
        <Stat label="Assignments" value={stats.assignments} foot="Three per category" />
        <Stat label="Conflicts" value={stats.conflicts} foot="Recusal is immediate" />
      </div>

      <SectionHeading
        title="Judges and panel"
        description="Invite judges, assign them to categories, and record conflicts before scoring opens."
        actions={
          canEdit ? (
            <>
              <Button variant="outline" onClick={() => setPanel('conflict')}>
                <ShieldWarning /> Declare conflict
              </Button>
              <Button variant="outline" onClick={() => setPanel('assignment')}>
                <Plus /> Assign to category
              </Button>
              <Button onClick={openCreate}>
                <UserPlus /> Invite judge
              </Button>
            </>
          ) : null
        }
      />

      <div className="overflow-hidden rounded-lg border border-border">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className={TABLE_HEAD}>
              <tr>
                <th className="px-4 py-3 font-semibold">Judge</th>
                <th className="px-4 py-3 font-semibold">Status</th>
                <th className="px-4 py-3 font-semibold">Categories</th>
                <th className="px-4 py-3 font-semibold">Added</th>
                <th className="px-4 py-3 text-right font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading ? (
                <LoadingRow colSpan={5} label="Loading judges…" />
              ) : !judges || judges.length === 0 ? (
                <EmptyRow colSpan={5}>
                  No judges yet. Invite the panel before scoring opens.
                </EmptyRow>
              ) : (
                judges.map((judge) => {
                  const assigned = assignments.filter(
                    (assignment) =>
                      assignment.judgeId === judge.id && assignment.status !== 'recused',
                  )
                  return (
                    <tr key={judge.id} className="align-top hover:bg-muted/30">
                      <td className={TABLE_CELL}>
                        <button
                          type="button"
                          className="text-left"
                          onClick={() => (canEdit ? openEdit(judge) : undefined)}
                        >
                          <span className="block font-semibold">{judge.displayName}</span>
                          <span className="mt-0.5 block text-xs text-muted-foreground">
                            {judge.email ?? 'No email'}
                          </span>
                          {judge.userId ? (
                            <span className="mt-0.5 block font-mono text-[10px] text-muted-foreground">
                              linked account
                            </span>
                          ) : null}
                        </button>
                      </td>
                      <td className={TABLE_CELL}>
                        <StatusBadge status={judge.status} label={titleCase(judge.status)} />
                      </td>
                      <td className={`${TABLE_CELL} text-xs`}>
                        {assigned.length === 0
                          ? 'None'
                          : assigned.map((assignment) => categoryName(assignment.categoryId)).join(', ')}
                      </td>
                      <td className={`${TABLE_CELL} text-xs`}>{formatDate(judge.createdAt)}</td>
                      <td className={TABLE_CELL}>
                        <div className="flex justify-end gap-1">
                          {canEdit ? (
                            <Button size="sm" variant="outline" onClick={() => openEdit(judge)}>
                              Edit
                            </Button>
                          ) : null}
                          {canPublish ? (
                            <Button
                              size="icon-sm"
                              variant="ghost"
                              aria-label={`Remove ${judge.displayName}`}
                              onClick={() => setDeleting({ kind: 'judge', id: judge.id })}
                            >
                              <Trash />
                            </Button>
                          ) : null}
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

      <div className="grid gap-5 xl:grid-cols-2">
        <div className="space-y-3">
          <SectionHeading
            title="Panel by category"
            description="Three judges per category. Conflicts recuse immediately."
          />
          <div className="space-y-3">
            {assignmentsByCategory.length === 0 ? (
              <p className="rounded-lg border border-dashed border-border p-6 text-sm text-muted-foreground">
                No assignments yet.
              </p>
            ) : (
              assignmentsByCategory.map(([categoryId, rows]) => (
                <div key={categoryId} className="rounded-lg border border-border">
                  <div className="flex items-center justify-between gap-2 border-b border-border bg-muted/30 px-4 py-2">
                    <p className="text-sm font-semibold">{categoryName(categoryId)}</p>
                    <span className="text-[11px] text-muted-foreground">
                      {rows.filter((row) => row.status === 'assigned').length} assigned
                    </span>
                  </div>
                  <ul className="divide-y divide-border">
                    {rows.map((assignment) => (
                      <li
                        key={assignment.id}
                        className="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5"
                      >
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium">
                            {judgeName(assignment.judgeId)}
                          </p>
                          <p className="text-[11px] text-muted-foreground">
                            Assigned {formatDate(assignment.assignedAt)}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <StatusBadge
                            status={assignment.status}
                            label={titleCase(assignment.status)}
                          />
                          {canEdit && assignment.status === 'assigned' ? (
                            <Button
                              size="xs"
                              variant="outline"
                              onClick={() => void setAssignmentStatus(assignment, 'recused')}
                            >
                              Recuse
                            </Button>
                          ) : null}
                          {canPublish ? (
                            <Button
                              size="icon-xs"
                              variant="ghost"
                              aria-label="Remove assignment"
                              onClick={() =>
                                setDeleting({ kind: 'assignment', id: assignment.id })
                              }
                            >
                              <Trash />
                            </Button>
                          ) : null}
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="space-y-3">
          <SectionHeading
            title="Conflicts"
            description="Declared before scoring. Individual judge scores stay private."
          />
          <div className="overflow-hidden rounded-lg border border-border">
            <table className="w-full text-left text-sm">
              <thead className={TABLE_HEAD}>
                <tr>
                  <th className="px-4 py-3 font-semibold">Judge</th>
                  <th className="px-4 py-3 font-semibold">Entry</th>
                  <th className="px-4 py-3 font-semibold">Reason</th>
                  <th className="px-4 py-3 text-right font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {conflicts.length === 0 ? (
                  <EmptyRow colSpan={4}>No conflicts declared.</EmptyRow>
                ) : (
                  conflicts.map((conflict) => (
                    <tr key={conflict.id} className="align-top">
                      <td className={`${TABLE_CELL} text-xs font-medium`}>
                        {judgeName(conflict.judgeId)}
                      </td>
                      <td className={`${TABLE_CELL} text-xs`}>{entryName(conflict.entryId)}</td>
                      <td className={`${TABLE_CELL} text-xs text-muted-foreground`}>
                        {conflict.reason}
                      </td>
                      <td className={TABLE_CELL}>
                        {canPublish ? (
                          <div className="flex justify-end">
                            <Button
                              size="icon-sm"
                              variant="ghost"
                              aria-label="Remove conflict"
                              onClick={() => setDeleting({ kind: 'conflict', id: conflict.id })}
                            >
                              <Trash />
                            </Button>
                          </div>
                        ) : null}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {panel === 'judge' ? (
        <Panel
          kicker={editing ? 'Judge record' : 'Invite'}
          title={editing ? editing.displayName : 'Invite a judge'}
          description="The panel is blind to entrant identity and county. Linking a user account lets that judge open their assignments in the app."
          onClose={() => setPanel(null)}
          footer={
            <>
              <Button onClick={() => void saveJudge()} disabled={saving}>
                {saving ? 'Saving…' : editing ? 'Save judge' : 'Send invitation'}
              </Button>
              <Button variant="outline" onClick={() => setPanel(null)}>
                Cancel
              </Button>
            </>
          }
        >
          <FormInput
            label="Display name"
            required
            value={judgeDraft.displayName}
            onChange={(value) => setJudgeDraft((current) => ({ ...current, displayName: value }))}
          />
          <FormInput
            label="Email"
            type="email"
            value={judgeDraft.email}
            onChange={(value) => setJudgeDraft((current) => ({ ...current, email: value }))}
            description="Used for the invitation and panel communication."
          />
          <FormInput
            label="User ID"
            value={judgeDraft.userId}
            onChange={(value) => setJudgeDraft((current) => ({ ...current, userId: value }))}
            description="Optional. Links the judge record to a signed-in account."
          />
          <FormSelect
            label="Status"
            value={judgeDraft.status}
            onChange={(value) =>
              setJudgeDraft((current) => ({ ...current, status: value as JudgeStatus }))
            }
            options={JUDGE_STATUSES}
          />
        </Panel>
      ) : null}

      {panel === 'assignment' ? (
        <Panel
          kicker="Panel assignment"
          title="Assign a judge to a category"
          description="A judge can serve on more than one category. The API rejects a duplicate assignment."
          onClose={() => setPanel(null)}
          footer={
            <>
              <Button onClick={() => void saveAssignment()} disabled={saving}>
                {saving ? 'Assigning…' : 'Assign judge'}
              </Button>
              <Button variant="outline" onClick={() => setPanel(null)}>
                Cancel
              </Button>
            </>
          }
        >
          <FormSelect
            label="Judge"
            required
            value={assignmentDraft.judgeId}
            onChange={(value) =>
              setAssignmentDraft((current) => ({ ...current, judgeId: value }))
            }
            options={(judges ?? []).map((judge) => ({
              value: judge.id,
              label: judge.displayName,
            }))}
          />
          <FormSelect
            label="Category"
            required
            value={assignmentDraft.categoryId}
            onChange={(value) =>
              setAssignmentDraft((current) => ({ ...current, categoryId: value }))
            }
            options={categories.map((category) => ({
              value: category.id,
              label: category.label,
            }))}
          />
          <div className="rounded-lg border border-dashed border-border p-3 text-xs text-muted-foreground">
            Three judges per category is the rulebook panel size. Tie-breaks use craft, then
            originality, then the panel chair.
          </div>
        </Panel>
      ) : null}

      {panel === 'conflict' ? (
        <Panel
          kicker="Conflict declaration"
          title="Declare a conflict"
          description="A declared conflict recuses the judge from that entry's category immediately."
          onClose={() => setPanel(null)}
          footer={
            <>
              <Button onClick={() => void saveConflict()} disabled={saving}>
                {saving ? 'Declaring…' : 'Declare conflict'}
              </Button>
              <Button variant="outline" onClick={() => setPanel(null)}>
                Cancel
              </Button>
            </>
          }
        >
          <FormSelect
            label="Judge"
            required
            value={conflictDraft.judgeId}
            onChange={(value) =>
              setConflictDraft((current) => ({ ...current, judgeId: value }))
            }
            options={(judges ?? []).map((judge) => ({
              value: judge.id,
              label: judge.displayName,
            }))}
          />
          <div>
            <label
              htmlFor="conflict-entry"
              className="font-mono text-[9px] uppercase tracking-[0.14em] text-muted-foreground"
            >
              Entry
            </label>
            <select
              id="conflict-entry"
              className={`${INPUT} mt-1`}
              value={conflictDraft.entryId}
              onChange={(event) =>
                setConflictDraft((current) => ({ ...current, entryId: event.target.value }))
              }
            >
              <option value="">Select an entry…</option>
              {entries.map((entry) => (
                <option key={entry.id} value={entry.id}>
                  {entry.title} · {entry.categoryLabel}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label
              htmlFor="conflict-reason"
              className="font-mono text-[9px] uppercase tracking-[0.14em] text-muted-foreground"
            >
              Reason
            </label>
            <textarea
              id="conflict-reason"
              rows={3}
              className="mt-1 w-full rounded-md border border-input bg-background p-3 text-sm"
              value={conflictDraft.reason}
              onChange={(event) =>
                setConflictDraft((current) => ({ ...current, reason: event.target.value }))
              }
              placeholder="Relationship, employer, collaborator, or prior involvement."
            />
          </div>
          <div className="grid gap-3 rounded-lg border border-border p-4 sm:grid-cols-2">
            <Detail label="Rulebook" value="Judges declare conflicts and are recused before scoring." />
            <Detail label="Audit" value="The declaration keeps its reason and timestamp." />
          </div>
        </Panel>
      ) : null}

      <ConfirmDialog
        open={Boolean(deleting)}
        onOpenChange={(open) => {
          if (!open) setDeleting(null)
        }}
        title={
          deleting?.kind === 'conflict'
            ? 'Remove this conflict?'
            : deleting?.kind === 'assignment'
              ? 'Remove this assignment?'
              : 'Remove this judge?'
        }
        description={
          deleting?.kind === 'conflict'
            ? 'Removing the declaration allows the judge to score the category again.'
            : deleting?.kind === 'assignment'
              ? 'Removing the assignment removes the judge from that category panel.'
              : 'Removing a judge deletes their assignments. Existing scores keep their judge reference.'
        }
        confirmLabel="Remove"
        loading={saving}
        onConfirm={() => void remove()}
      />
    </div>
  )
}
