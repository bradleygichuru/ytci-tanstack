import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { toast } from 'sonner'
import { CalendarCheck, Plus, Trash } from '@phosphor-icons/react'
import type { ApiClient } from '#/lib/api'
import type {
  Category,
  Edition,
  EditionInput,
  EditionStatus,
  PromotionType,
  PublicVoteMode,
} from '#/lib/api/competition'
import { Button } from '#/components/ui/button'
import { ConfirmDialog } from '#/components/shared/ConfirmDialog'
import {
  FormField,
  FormInput,
  FormSelect,
  FormSwitch,
  FormTextarea,
} from '#/components/shared/FormField'
import { StatusBadge } from '#/components/shared/StatusBadge'
import { CompetitionSkeleton } from '#/components/skeletons/competition-skeleton'
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

const STATUSES: Array<{ value: EditionStatus; label: string }> = [
  { value: 'draft', label: 'Draft' },
  { value: 'consultation', label: 'Consultation' },
  { value: 'open', label: 'Entries open' },
  { value: 'judging', label: 'Judging' },
  { value: 'voting', label: 'Voting' },
  { value: 'closed', label: 'Closed' },
  { value: 'published', label: 'Published' },
]

const PROMOTION_TYPES: Array<{ value: PromotionType; label: string }> = [
  { value: 'award_programme', label: 'Award programme (panel awards)' },
  { value: 'prize_competition', label: 'Prize competition (licensed route)' },
  { value: 'licensed_operator', label: 'Licensed operator' },
]

const VOTE_MODES: Array<{ value: PublicVoteMode; label: string }> = [
  { value: 'people_choice_only', label: "People's Choice only (non-cash)" },
  { value: 'weighted', label: 'Weighted with panel score (licensed route)' },
  { value: 'none', label: 'No public vote' },
]

interface EditionDraft {
  name: string
  slug: string
  theme: string
  status: EditionStatus
  promotionType: PromotionType
  minAge: string
  maxAge: string
  publicVoteMode: PublicVoteMode
  prizeEnabled: boolean
  rulesVersion: string
  opensAt: string
  closesAt: string
  votingOpensAt: string
  votingClosesAt: string
  announcementAt: string
}

const emptyDraft = (): EditionDraft => ({
  name: '',
  slug: '',
  theme: "The story is Kenya's",
  status: 'draft',
  promotionType: 'award_programme',
  minAge: '16',
  maxAge: '30',
  publicVoteMode: 'people_choice_only',
  prizeEnabled: false,
  rulesVersion: '1.0',
  opensAt: '',
  closesAt: '',
  votingOpensAt: '',
  votingClosesAt: '',
  announcementAt: '',
})

function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function toLocal(value?: string | null): string {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

function toIso(value: string): string | null {
  if (!value) return null
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date.toISOString()
}

function editionToDraft(edition: Edition): EditionDraft {
  return {
    name: edition.name,
    slug: edition.slug,
    theme: edition.theme ?? '',
    status: edition.status,
    promotionType: edition.promotionType,
    minAge: edition.minAge === null ? '' : String(edition.minAge),
    maxAge: edition.maxAge === null ? '' : String(edition.maxAge),
    publicVoteMode: edition.publicVoteMode,
    prizeEnabled: edition.prizeEnabled,
    rulesVersion: edition.rulesVersion,
    opensAt: toLocal(edition.opensAt),
    closesAt: toLocal(edition.closesAt),
    votingOpensAt: toLocal(edition.votingOpensAt),
    votingClosesAt: toLocal(edition.votingClosesAt),
    announcementAt: toLocal(edition.announcementAt),
  }
}

export function EditionsTab({
  api,
  editions,
  loading,
  selectedEditionId,
  onSelect,
  onReload,
  canEdit,
  canPublish,
  createRequest = 0,
  onConsumeCreateRequest,
}: {
  api: ApiClient
  editions: Edition[]
  loading: boolean
  selectedEditionId: string | null
  onSelect: (id: string) => void
  onReload: (selectId?: string) => Promise<void>
  canEdit: boolean
  canPublish: boolean
  /** Header/empty-state request counter that opens the create panel. */
  createRequest?: number
  onConsumeCreateRequest?: () => void
}) {
  const [panel, setPanel] = useState<'create' | 'edit' | null>(null)
  const [editing, setEditing] = useState<Edition | null>(null)
  const [draft, setDraft] = useState<EditionDraft>(emptyDraft())
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)
  const [showDelete, setShowDelete] = useState(false)
  const [categories, setCategories] = useState<Category[] | null>(null)
  const [categoryForm, setCategoryForm] = useState({ key: '', label: '', sortOrder: '0' })
  const [categorySaving, setCategorySaving] = useState(false)

  const selected = useMemo(
    () => editions.find((edition) => edition.id === selectedEditionId) ?? null,
    [editions, selectedEditionId],
  )

  const loadCategories = useCallback(
    async (editionId: string) => {
      try {
        const result = await api.competition.categories.list(editionId)
        setCategories(result.items)
      } catch {
        toast.error('Failed to load categories')
        setCategories([])
      }
    },
    [api],
  )

  useEffect(() => {
    if (panel === 'edit' && editing) {
      setCategories(null)
      void loadCategories(editing.id)
    }
  }, [editing, loadCategories, panel])

  const openCreate = () => {
    setEditing(null)
    setDraft(emptyDraft())
    setErrors({})
    setCategories(null)
    setPanel('create')
  }

  const openEdit = (edition: Edition) => {
    setEditing(edition)
    setDraft(editionToDraft(edition))
    setErrors({})
    setPanel('edit')
  }

  const closePanel = () => {
    setPanel(null)
    setEditing(null)
    setErrors({})
  }

  // The route's primary action asks this tab to open the create panel. Consume
  // the request once so revisiting the tab does not reopen the form.
  const handledCreateRequest = useRef(0)
  useEffect(() => {
    if (!createRequest || createRequest === handledCreateRequest.current) return
    handledCreateRequest.current = createRequest
    setEditing(null)
    setDraft(emptyDraft())
    setErrors({})
    setCategories(null)
    setPanel('create')
    onConsumeCreateRequest?.()
  }, [createRequest, onConsumeCreateRequest])

  const buildBody = (): EditionInput => {
    const minAge = draft.minAge.trim() === '' ? null : Number(draft.minAge)
    const maxAge = draft.maxAge.trim() === '' ? null : Number(draft.maxAge)
    return {
      name: draft.name.trim(),
      slug: draft.slug.trim(),
      // Send an empty string, not null: the API treats null as "field absent",
      // so null would leave an old theme in place. An empty string clears it.
      theme: draft.theme.trim(),
      status: draft.status,
      promotionType: draft.promotionType,
      minAge: Number.isNaN(minAge) ? null : minAge,
      maxAge: Number.isNaN(maxAge) ? null : maxAge,
      publicVoteMode: draft.publicVoteMode,
      prizeEnabled: draft.prizeEnabled,
      rulesVersion: draft.rulesVersion.trim(),
      opensAt: toIso(draft.opensAt),
      closesAt: toIso(draft.closesAt),
      votingOpensAt: toIso(draft.votingOpensAt),
      votingClosesAt: toIso(draft.votingClosesAt),
      announcementAt: toIso(draft.announcementAt),
    }
  }

  const save = async () => {
    const next: Record<string, string> = {}
    if (!draft.name.trim()) next.name = 'Name is required'
    if (!draft.slug.trim()) {
      next.slug = 'Slug is required'
    } else if (!/^[a-z0-9_-]+$/.test(draft.slug.trim())) {
      next.slug = 'Use lowercase letters, digits, hyphens or underscores'
    }
    if (!draft.rulesVersion.trim()) next.rulesVersion = 'Rules version is required'
    const min = draft.minAge.trim() === '' ? null : Number(draft.minAge)
    const max = draft.maxAge.trim() === '' ? null : Number(draft.maxAge)
    if (min !== null && max !== null && min > max) next.age = 'Minimum age cannot exceed maximum'
    setErrors(next)
    if (Object.keys(next).length > 0) {
      window.requestAnimationFrame(() => {
        const field = document.querySelector<HTMLElement>('[role="dialog"] [aria-invalid="true"]')
        field?.scrollIntoView({ block: 'center' })
        field?.focus({ preventScroll: true })
      })
      return
    }

    setSaving(true)
    try {
      const body = buildBody()
      const saved =
        panel === 'create'
          ? await api.competition.editions.create(body)
          : await api.competition.editions.update(editing!.id, body)
      toast.success(panel === 'create' ? 'Edition created' : 'Edition saved')
      await onReload(saved.id)
      if (panel === 'create') {
        setEditing(saved)
        setDraft(editionToDraft(saved))
        setPanel('edit')
      } else {
        setEditing(saved)
        setDraft(editionToDraft(saved))
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to save edition')
    } finally {
      setSaving(false)
    }
  }

  const remove = async () => {
    if (!editing) return
    setSaving(true)
    try {
      await api.competition.editions.remove(editing.id)
      toast.success('Edition deleted')
      setShowDelete(false)
      closePanel()
      await onReload()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to delete edition')
    } finally {
      setSaving(false)
    }
  }

  const addCategory = async () => {
    if (!editing) return
    const key = categoryForm.key.trim() || slugify(categoryForm.label)
    if (!key || !categoryForm.label.trim()) {
      toast.error('Category label and key are required')
      return
    }
    setCategorySaving(true)
    try {
      const created = await api.competition.categories.create(editing.id, {
        key,
        label: categoryForm.label.trim(),
        sortOrder: Number(categoryForm.sortOrder) || 0,
      })
      setCategories((current) => [...(current ?? []), created])
      setCategoryForm({ key: '', label: '', sortOrder: String((categories?.length ?? 0) + 1) })
      toast.success('Category added')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to add category')
    } finally {
      setCategorySaving(false)
    }
  }

  const removeCategory = async (category: Category) => {
    try {
      await api.competition.categories.remove(category.id)
      setCategories((current) => (current ?? []).filter((item) => item.id !== category.id))
      toast.success('Category removed')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to remove category')
    }
  }

  const stats = useMemo(() => {
    const open = editions.filter((edition) => edition.status === 'open')
    return {
      total: editions.length,
      open: open.length,
      awardProgramme: editions.filter((edition) => edition.promotionType === 'award_programme')
        .length,
      next: editions
        .filter((edition) => edition.announcementAt)
        .sort(
          (a, b) =>
            new Date(a.announcementAt!).getTime() - new Date(b.announcementAt!).getTime(),
        )[0],
    }
  }, [editions])

  return (
    <div className="space-y-5">
      {loading && editions.length === 0 ? (
        <CompetitionSkeleton />
      ) : editions.length === 0 ? (
        <section
          aria-labelledby="editions-empty-heading"
          className="rounded-lg border border-[#e4dac7] bg-[#fffdf8] p-6 sm:p-8"
        >
          <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-[#7b6a4c]">
            Editions
          </p>
          <h2 id="editions-empty-heading" className="mt-2 text-xl font-bold tracking-tight">
            No editions yet
          </h2>
          <p className="mt-1 max-w-xl text-sm text-[#5f5544]">
            Create the first awards edition to set the entry window, categories, panel, and
            award cycle.
          </p>
          {canEdit ? (
            <Button className="mt-4" onClick={openCreate}>
              <Plus /> Create the first edition
            </Button>
          ) : (
            <p className="mt-4 text-sm text-[#5f5544]">
              An administrator can create the first edition.
            </p>
          )}
        </section>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Stat label="Editions" value={stats.total} icon={CalendarCheck} />
            <Stat label="Entries open" value={stats.open} foot="Public call to entry" />
            <Stat
              label="Award programme"
              value={stats.awardProgramme}
              foot="Panel selects awards"
            />
            <Stat
              label="Next announcement"
              value={stats.next ? formatDate(stats.next.announcementAt) : '-'}
              foot={stats.next?.name ?? 'No date set'}
            />
          </div>

          <SectionHeading
            title="Editions"
            description="Create the cycle, lock categories, and keep dates and modes configurable."
            actions={
              canEdit ? (
                <Button onClick={openCreate}>
                  <Plus /> New edition
                </Button>
              ) : null
            }
          />

          <div className="overflow-hidden rounded-lg border border-border">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-left text-sm">
                <thead className={TABLE_HEAD}>
                  <tr>
                    <th className="px-4 py-3 font-semibold">Edition</th>
                    <th className="px-4 py-3 font-semibold">Status</th>
                    <th className="px-4 py-3 font-semibold">Entries</th>
                    <th className="px-4 py-3 font-semibold">Vote mode</th>
                    <th className="px-4 py-3 font-semibold">Announcement</th>
                    <th className="px-4 py-3 text-right font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {editions.map((edition) => (
                    <tr key={edition.id} className="align-top hover:bg-muted/30">
                      <td className={TABLE_CELL}>
                        <button
                          type="button"
                          className="text-left"
                          onClick={() => (canEdit ? openEdit(edition) : onSelect(edition.id))}
                        >
                          <span className="block font-semibold">{edition.name}</span>
                          <span className="mt-0.5 block font-mono text-[11px] text-muted-foreground">
                            {edition.slug}
                          </span>
                          {edition.theme ? (
                            <span className="mt-1 block text-xs text-muted-foreground">
                              {edition.theme}
                            </span>
                          ) : null}
                        </button>
                      </td>
                      <td className={TABLE_CELL}>
                        <StatusBadge status={edition.status} label={titleCase(edition.status)} />
                      </td>
                      <td className={`${TABLE_CELL} whitespace-nowrap text-xs`}>
                        {formatDate(edition.opensAt)} – {formatDate(edition.closesAt)}
                      </td>
                      <td className={`${TABLE_CELL} text-xs`}>
                        {titleCase(edition.publicVoteMode)}
                      </td>
                      <td className={`${TABLE_CELL} text-xs`}>
                        {formatDate(edition.announcementAt)}
                      </td>
                      <td className={TABLE_CELL}>
                        <div className="flex justify-end gap-1">
                          <Button
                            size="sm"
                            variant={edition.id === selectedEditionId ? 'default' : 'outline'}
                            onClick={() => onSelect(edition.id)}
                          >
                            {edition.id === selectedEditionId ? 'Selected' : 'Select'}
                          </Button>
                          {canEdit ? (
                            <Button size="sm" variant="ghost" onClick={() => openEdit(edition)}>
                              Edit
                            </Button>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {panel ? (
        <Panel
          kicker={panel === 'create' ? 'New edition' : 'Edition settings'}
          title={panel === 'create' ? 'Create an awards edition' : draft.name}
          description={
            panel === 'create'
              ? 'Dates, ages, and the public vote mode are configuration. The award programme keeps the prize flag off.'
              : 'Update the cycle and the categories the panel scores against.'
          }
          onClose={closePanel}
          footer={
            <>
              <Button onClick={() => void save()} disabled={saving}>
                {saving ? 'Saving…' : panel === 'create' ? 'Create edition' : 'Save edition'}
              </Button>
              {panel === 'edit' && canPublish ? (
                <Button variant="destructive" onClick={() => setShowDelete(true)}>
                  <Trash /> Delete edition
                </Button>
              ) : null}
            </>
          }
        >
          {Object.keys(errors).length > 0 ? (
            <div
              role="alert"
              className="rounded-lg border border-destructive/40 bg-destructive/5 p-3 text-sm"
            >
              <p className="font-semibold text-destructive">Check these before saving:</p>
              <ul className="mt-1 list-disc pl-5 text-destructive/90">
                {Object.entries(errors).map(([field, message]) => (
                  <li key={field}>{message}</li>
                ))}
              </ul>
            </div>
          ) : null}

          <div className="grid gap-4 sm:grid-cols-2">
            <FormInput
              label="Name"
              required
              value={draft.name}
              onChange={(value) =>
                setDraft((current) => ({
                  ...current,
                  name: value,
                  slug: current.slug || slugify(value),
                }))
              }
              error={errors.name}
            />
            <FormInput
              label="Slug"
              required
              value={draft.slug}
              onChange={(value) => setDraft((current) => ({ ...current, slug: value }))}
              error={errors.slug}
              description="Used in public URLs and the app deep link."
            />
          </div>

          <FormTextarea
            label="Theme"
            value={draft.theme}
            onChange={(value) => setDraft((current) => ({ ...current, theme: value }))}
            description="The public call to entry. Relevance is scored against this theme."
            maxLength={280}
          />

          <div className="grid gap-4 sm:grid-cols-2">
            <FormSelect
              label="Status"
              required
              value={draft.status}
              onChange={(value) =>
                setDraft((current) => ({ ...current, status: value as EditionStatus }))
              }
              options={STATUSES}
            />
            <FormSelect
              label="Promotion type"
              required
              value={draft.promotionType}
              onChange={(value) =>
                setDraft((current) => ({ ...current, promotionType: value as PromotionType }))
              }
              options={PROMOTION_TYPES}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <FormInput
              label="Minimum age"
              type="number"
              value={draft.minAge}
              onChange={(value) => setDraft((current) => ({ ...current, minAge: value }))}
              error={errors.age}
            />
            <FormInput
              label="Maximum age"
              type="number"
              value={draft.maxAge}
              onChange={(value) => setDraft((current) => ({ ...current, maxAge: value }))}
            />
          </div>

          <FormSelect
            label="Public vote mode"
            required
            value={draft.publicVoteMode}
            onChange={(value) =>
              setDraft((current) => ({ ...current, publicVoteMode: value as PublicVoteMode }))
            }
            options={VOTE_MODES}
            description="Route B uses People's Choice only. The public vote never changes panel awards."
          />

          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label="Entries open" description="Public call to entry opens.">
              <input
                type="datetime-local"
                value={draft.opensAt}
                onChange={(event) =>
                  setDraft((current) => ({ ...current, opensAt: event.target.value }))
                }
                className={INPUT}
              />
            </FormField>
            <FormField label="Entries close">
              <input
                type="datetime-local"
                value={draft.closesAt}
                onChange={(event) =>
                  setDraft((current) => ({ ...current, closesAt: event.target.value }))
                }
                className={INPUT}
              />
            </FormField>
            <FormField label="Voting opens">
              <input
                type="datetime-local"
                value={draft.votingOpensAt}
                onChange={(event) =>
                  setDraft((current) => ({ ...current, votingOpensAt: event.target.value }))
                }
                className={INPUT}
              />
            </FormField>
            <FormField label="Voting closes">
              <input
                type="datetime-local"
                value={draft.votingClosesAt}
                onChange={(event) =>
                  setDraft((current) => ({ ...current, votingClosesAt: event.target.value }))
                }
                className={INPUT}
              />
            </FormField>
          </div>

          <FormField label="Winners announced">
            <input
              type="datetime-local"
              value={draft.announcementAt}
              onChange={(event) =>
                setDraft((current) => ({ ...current, announcementAt: event.target.value }))
              }
              className={INPUT}
            />
          </FormField>

          <div className="grid gap-4 sm:grid-cols-2">
            <FormInput
              label="Rules version"
              required
              value={draft.rulesVersion}
              onChange={(value) => setDraft((current) => ({ ...current, rulesVersion: value }))}
              error={errors.rulesVersion}
            />
            <FormSwitch
              label="Prize programme flag"
              description="Reserved for a licensed route. The award programme leaves this off and handles awards outside the platform."
              checked={draft.prizeEnabled}
              onChange={(value) => setDraft((current) => ({ ...current, prizeEnabled: value }))}
            />
          </div>

          {panel === 'edit' && editing ? (
            <div className="space-y-3 border-t border-border pt-5">
              <SectionHeading
                title="Categories"
                description="The rubric is shared. Each category gets its own panel and vote race."
              />
              <div className="overflow-hidden rounded-lg border border-border">
                <table className="w-full text-left text-sm">
                  <thead className={TABLE_HEAD}>
                    <tr>
                      <th className="px-3 py-2 font-semibold">Label</th>
                      <th className="px-3 py-2 font-semibold">Key</th>
                      <th className="px-3 py-2 font-semibold">Order</th>
                      <th className="px-3 py-2 text-right font-semibold">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {categories === null ? (
                      <LoadingRow colSpan={4} label="Loading categories…" />
                    ) : categories.length === 0 ? (
                      <EmptyRow colSpan={4}>No categories yet.</EmptyRow>
                    ) : (
                      categories.map((category) => (
                        <tr key={category.id}>
                          <td className="px-3 py-2 font-medium">{category.label}</td>
                          <td className="px-3 py-2 font-mono text-[11px] text-muted-foreground">
                            {category.key}
                          </td>
                          <td className="px-3 py-2 text-xs">{category.sortOrder}</td>
                          <td className="px-3 py-2 text-right">
                            {canPublish ? (
                              <Button
                                size="icon-sm"
                                variant="ghost"
                                aria-label={`Remove ${category.label}`}
                                onClick={() => void removeCategory(category)}
                              >
                                <Trash />
                              </Button>
                            ) : null}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
              {canEdit ? (
                <div className="grid gap-2 sm:grid-cols-[1fr_1fr_80px_auto]">
                  <input
                    className={INPUT}
                    placeholder="Label"
                    aria-label="New category label"
                    value={categoryForm.label}
                    onChange={(event) =>
                      setCategoryForm((current) => ({
                        ...current,
                        label: event.target.value,
                        key: current.key || slugify(event.target.value),
                      }))
                    }
                  />
                  <input
                    className={INPUT}
                    placeholder="key"
                    aria-label="New category key"
                    value={categoryForm.key}
                    onChange={(event) =>
                      setCategoryForm((current) => ({ ...current, key: event.target.value }))
                    }
                  />
                  <input
                    className={INPUT}
                    type="number"
                    aria-label="New category order"
                    value={categoryForm.sortOrder}
                    onChange={(event) =>
                      setCategoryForm((current) => ({ ...current, sortOrder: event.target.value }))
                    }
                  />
                  <Button onClick={() => void addCategory()} disabled={categorySaving}>
                    <Plus /> Add
                  </Button>
                </div>
              ) : null}
            </div>
          ) : (
            <p className="rounded-lg border border-dashed border-border p-4 text-sm text-muted-foreground">
              Save the edition first, then add the categories the panel scores against.
            </p>
          )}

          {selected ? (
            <div className="grid gap-3 rounded-lg border border-border p-4 sm:grid-cols-2">
              <Detail label="Selected edition" value={selected.name} />
              <Detail label="Rules version" value={selected.rulesVersion} />
              <Detail label="Ages" value={`${selected.minAge ?? '-'} to ${selected.maxAge ?? '-'}`} />
              <Detail label="Created" value={formatDate(selected.createdAt)} />
            </div>
          ) : null}
        </Panel>
      ) : null}

      <ConfirmDialog
        open={showDelete}
        onOpenChange={setShowDelete}
        title="Delete this edition?"
        description="Editions with vote history cannot be deleted. This removes the categories, judges, and assignments for the edition."
        confirmLabel="Delete edition"
        loading={saving}
        onConfirm={() => void remove()}
      />
    </div>
  )
}
