import { useCallback, useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { Confetti, PencilSimple, Plus, SealCheck, Trash, Trophy } from '@phosphor-icons/react'
import type { ApiClient } from '#/lib/api'
import type {
  Award,
  AwardForm,
  AwardInput,
  AwardType,
  Category,
  CompetitionEntry,
} from '#/lib/api/competition'
import { Button } from '#/components/ui/button'
import { ConfirmDialog } from '#/components/shared/ConfirmDialog'
import { FormSelect, FormTextarea } from '#/components/shared/FormField'
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

const AWARD_TYPES: Array<{ value: AwardType; label: string }> = [
  { value: 'category_winner', label: 'Category award' },
  { value: 'overall', label: 'Overall award' },
  { value: 'people_choice', label: "People's Choice" },
]

const AWARD_FORMS: Array<{ value: AwardForm; label: string }> = [
  { value: 'grant', label: 'Grant' },
  { value: 'commission', label: 'Commission' },
  { value: 'certificate', label: 'Certificate' },
  { value: 'feature', label: 'Feature in the repository' },
  { value: 'recognition', label: 'Non-cash recognition' },
]

interface Draft {
  entryId: string
  categoryId: string
  awardType: AwardType
  awardForm: AwardForm | ''
  citation: string
}

const emptyDraft = (): Draft => ({
  entryId: '',
  categoryId: '',
  awardType: 'category_winner',
  awardForm: 'grant',
  citation: '',
})

export function AwardsTab({
  api,
  editionId,
  canEdit,
  canPublish,
  refreshKey,
}: {
  api: ApiClient
  editionId: string
  canEdit: boolean
  canPublish: boolean
  refreshKey: number
}) {
  const [awards, setAwards] = useState<Award[] | null>(null)
  const [entries, setEntries] = useState<CompetitionEntry[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [panel, setPanel] = useState<'create' | 'edit' | null>(null)
  const [editing, setEditing] = useState<Award | null>(null)
  const [draft, setDraft] = useState<Draft>(emptyDraft())
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState<Award | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [awardResult, entryResult, categoryResult] = await Promise.all([
        api.competition.awards.list(editionId),
        api.competition.entries.list(editionId),
        api.competition.categories.list(editionId),
      ])
      setAwards(awardResult.items)
      setEntries(entryResult.items)
      setCategories(categoryResult.items)
    } catch {
      toast.error('Failed to load awards')
      setAwards([])
    } finally {
      setLoading(false)
    }
  }, [api, editionId])

  useEffect(() => {
    void load()
  }, [load, refreshKey])

  const openCreate = () => {
    setEditing(null)
    setDraft(emptyDraft())
    setPanel('create')
  }

  const openEdit = (award: Award) => {
    setEditing(award)
    setDraft({
      entryId: award.entryId,
      categoryId: award.categoryId ?? '',
      awardType: award.awardType,
      awardForm: award.awardForm ?? '',
      citation: award.citation ?? '',
    })
    setPanel('edit')
  }

  const save = async () => {
    if (!draft.entryId) {
      toast.error('Choose the recipient entry')
      return
    }
    if (draft.awardType === 'category_winner' && !draft.categoryId) {
      toast.error('Choose the category for this award')
      return
    }
    setSaving(true)
    try {
      if (editing) {
        await api.competition.awards.update(editing.id, {
          entryId: draft.entryId,
          awardForm: draft.awardForm || null,
          citation: draft.citation.trim() || null,
        })
        toast.success('Award updated')
      } else {
        const body: AwardInput = {
          entryId: draft.entryId,
          awardType: draft.awardType,
          awardForm: draft.awardForm || null,
          citation: draft.citation.trim() || null,
          categoryId: draft.awardType === 'category_winner' ? draft.categoryId : null,
        }
        await api.competition.awards.create(editionId, body)
        toast.success('Award recorded')
      }
      setPanel(null)
      await load()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to save award')
    } finally {
      setSaving(false)
    }
  }

  const publish = async (award: Award) => {
    setSaving(true)
    try {
      await api.competition.awards.publish(award.id)
      toast.success('Award published')
      await load()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to publish award')
    } finally {
      setSaving(false)
    }
  }

  const remove = async () => {
    if (!deleting) return
    setSaving(true)
    try {
      await api.competition.awards.remove(deleting.id)
      toast.success('Award removed')
      setDeleting(null)
      await load()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to remove award')
    } finally {
      setSaving(false)
    }
  }

  const categoryName = useCallback(
    (id: string | null) => (id ? categories.find((category) => category.id === id)?.label : null),
    [categories],
  )

  const stats = useMemo(() => {
    const list = awards ?? []
    return {
      total: list.length,
      published: list.filter((award) => award.publishedAt).length,
      grants: list.filter((award) => award.awardForm === 'grant').length,
      peopleChoice: list.some((award) => award.awardType === 'people_choice'),
    }
  }, [awards])

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Awards" value={stats.total} icon={Trophy} />
        <Stat label="Published" value={stats.published} foot="Visible publicly" />
        <Stat label="Grants" value={stats.grants} foot="Panel selected" />
        <Stat
          label="People's Choice"
          value={stats.peopleChoice ? 'Recorded' : 'Open'}
          foot="Non-cash, public vote"
          icon={Confetti}
        />
      </div>

      <div className="rounded-lg border border-[var(--amber)]/40 bg-[var(--amber-bg)]/30 p-4 text-sm">
        <p className="font-semibold">Two separate decisions</p>
        <p className="mt-1 text-muted-foreground">
          The expert panel selects category awards, grants, commissions, and the overall award. The
          public vote decides only the People's Choice recognition, which is always non-cash.
        </p>
      </div>

      <SectionHeading
        title="Awards"
        description="Record the form, citation, and publication state for every recipient."
        actions={
          canEdit ? (
            <Button onClick={openCreate}>
              <Plus /> New award
            </Button>
          ) : null
        }
      />

      <div className="overflow-hidden rounded-lg border border-border">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[880px] text-left text-sm">
            <thead className={TABLE_HEAD}>
              <tr>
                <th className="px-4 py-3 font-semibold">Award</th>
                <th className="px-4 py-3 font-semibold">Recipient</th>
                <th className="px-4 py-3 font-semibold">Form</th>
                <th className="px-4 py-3 font-semibold">Citation</th>
                <th className="px-4 py-3 font-semibold">State</th>
                <th className="px-4 py-3 text-right font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading ? (
                <LoadingRow colSpan={6} label="Loading awards…" />
              ) : !awards || awards.length === 0 ? (
                <EmptyRow colSpan={6}>
                  No awards yet. Publish the category awards and People's Choice from Results.
                </EmptyRow>
              ) : (
                awards.map((award) => (
                  <tr key={award.id} className="align-top hover:bg-muted/30">
                    <td className={TABLE_CELL}>
                      <span className="block text-xs font-semibold">
                        {titleCase(award.awardType)}
                      </span>
                      <span className="mt-0.5 block text-[11px] text-muted-foreground">
                        {categoryName(award.categoryId) ?? 'Edition-wide'}
                      </span>
                    </td>
                    <td className={`${TABLE_CELL} text-xs font-medium`}>{award.title}</td>
                    <td className={`${TABLE_CELL} text-xs`}>
                      {award.awardForm ? titleCase(award.awardForm) : '-'}
                    </td>
                    <td className={`${TABLE_CELL} max-w-sm text-xs text-muted-foreground`}>
                      {award.citation ?? '-'}
                    </td>
                    <td className={TABLE_CELL}>
                      <StatusBadge
                        status={award.publishedAt ? 'published' : 'pending'}
                        label={award.publishedAt ? 'Published' : 'Recorded'}
                      />
                      {award.publishedAt ? (
                        <span className="mt-1 block text-[11px] text-muted-foreground">
                          {formatDate(award.publishedAt)}
                        </span>
                      ) : null}
                    </td>
                    <td className={TABLE_CELL}>
                      <div className="flex justify-end gap-1">
                        {canEdit ? (
                          <Button
                            size="icon-sm"
                            variant="ghost"
                            aria-label={`Edit ${award.title} award`}
                            onClick={() => openEdit(award)}
                          >
                            <PencilSimple />
                          </Button>
                        ) : null}
                        {canPublish && !award.publishedAt ? (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => void publish(award)}
                            disabled={saving}
                          >
                            <SealCheck /> Publish
                          </Button>
                        ) : null}
                        {canPublish ? (
                          <Button
                            size="icon-sm"
                            variant="ghost"
                            aria-label={`Delete ${award.title} award`}
                            onClick={() => setDeleting(award)}
                          >
                            <Trash />
                          </Button>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {panel ? (
        <Panel
          kicker={panel === 'create' ? 'New award' : 'Award record'}
          title={panel === 'create' ? 'Record an award' : editing?.title ?? 'Award'}
          description="Award forms are grants, commissions, certificates, repository features, or non-cash recognition. The platform displays the award and does not pay it."
          onClose={() => setPanel(null)}
          footer={
            <>
              <Button onClick={() => void save()} disabled={saving}>
                {saving ? 'Saving…' : panel === 'create' ? 'Record award' : 'Save award'}
              </Button>
              <Button variant="outline" onClick={() => setPanel(null)}>
                Cancel
              </Button>
            </>
          }
        >
          {panel === 'create' ? (
            <FormSelect
              label="Award type"
              required
              value={draft.awardType}
              onChange={(value) =>
                setDraft((current) => ({
                  ...current,
                  awardType: value as AwardType,
                  awardForm: value === 'people_choice' ? 'recognition' : current.awardForm,
                }))
              }
              options={AWARD_TYPES}
            />
          ) : (
            <div className="rounded-lg border border-border p-4">
              <p className="text-sm font-semibold">{titleCase(draft.awardType)}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                The award type is fixed after creation. Edit the citation or award form here.
              </p>
            </div>
          )}

          {draft.awardType === 'category_winner' ? (
            <FormSelect
              label="Category"
              required
              value={draft.categoryId}
              onChange={(value) => setDraft((current) => ({ ...current, categoryId: value }))}
              options={categories.map((category) => ({
                value: category.id,
                label: category.label,
              }))}
              disabled={panel === 'edit'}
            />
          ) : null}

          <div>
            <label
              htmlFor="award-entry-edit"
              className="font-mono text-[11px] uppercase tracking-[0.14em] text-muted-foreground"
            >
              Recipient
            </label>
            <select
              id="award-entry-edit"
              className={`${INPUT} mt-1`}
              value={draft.entryId}
              onChange={(event) =>
                setDraft((current) => ({ ...current, entryId: event.target.value }))
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

          <FormSelect
            label="Award form"
            value={draft.awardForm}
            onChange={(value) =>
              setDraft((current) => ({ ...current, awardForm: value as AwardForm }))
            }
            options={AWARD_FORMS}
          />

          <FormTextarea
            label="Citation"
            value={draft.citation}
            onChange={(value) => setDraft((current) => ({ ...current, citation: value }))}
            description="Short public text about why this work was selected."
            maxLength={600}
          />

          <div className="grid gap-3 rounded-lg border border-border p-4 sm:grid-cols-2">
            <Detail label="Notification" value="Notify the recipient when published" />
            <Detail label="Response window" value="14 days to accept and verify" />
          </div>
        </Panel>
      ) : null}

      <ConfirmDialog
        open={Boolean(deleting)}
        onOpenChange={(open) => {
          if (!open) setDeleting(null)
        }}
        title="Delete this award record?"
        description="This removes the award record and its citation. Use it for corrections before publication."
        confirmLabel="Delete award"
        loading={saving}
        onConfirm={() => void remove()}
      />
    </div>
  )
}
