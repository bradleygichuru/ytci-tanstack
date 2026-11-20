import { createFileRoute, redirect, useRouteContext } from '@tanstack/react-router'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { toast } from 'sonner'
import {
  ArrowClockwise, Plus, PencilSimple, Stack, CalendarBlank, EyeSlash, Archive,
  Trash, ArrowUp, ArrowDown, MagnifyingGlass, CheckCircle, Warning,
} from '@phosphor-icons/react'
import { requirePermission } from '#/lib/authz'
import {
  canArchiveAudioStories, canManageAudioCollections,
} from '#/lib/audio-story-permissions'
import { useApi } from '#/lib/api/use-api'
import { ApiErrorResponse } from '#/lib/api/types'
import type {
  AudioCollectionDetail, AudioStory, AudioStoryCollection, CollectionStatus,
  CreateAudioStoryCollectionInput,
} from '#/lib/api/audio-stories'
import {
  audioCollectionCreateSchema, audioCollectionUpdateSchema, fieldErrors,
  formatEatDateTime,
} from '#/lib/schemas/audio-story.schema'
import { AudioStoryTabs } from '#/components/audio-stories/AudioStoryTabs'
import { CollectionStatusBadge, StoryStatusBadge, formatDate } from '#/components/audio-stories/badges'
import { ScheduleDialog } from '#/components/audio-stories/ScheduleDialog'
import { ReasonDialog } from '#/components/audio-stories/ReasonDialog'
import { FormInput, FormSwitch, FormTextarea } from '#/components/shared/FormField'
import { MediaUpload } from '#/components/shared/MediaUpload'
import { ConfirmDialog } from '#/components/shared/ConfirmDialog'
import { Button } from '#/components/ui/button'
import { Input } from '#/components/ui/input'
import { Skeleton } from '#/components/ui/skeleton'
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '#/components/ui/dialog'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '#/components/ui/table'

export const Route = createFileRoute('/_authenticated/audio-stories_/collections')({
  beforeLoad: ({ context }) => {
    try {
      requirePermission({ user: { role: context.user?.role ?? '' } }, 'audioStories', ['read'])
    } catch {
      throw redirect({ to: '/no-access' })
    }
  },
  component: AudioCollectionsPage,
})

const STATUS_FILTERS: Array<{ value: '' | CollectionStatus; label: string }> = [
  { value: '', label: 'All statuses' },
  { value: 'draft', label: 'Draft' },
  { value: 'scheduled', label: 'Scheduled' },
  { value: 'published', label: 'Published' },
  { value: 'unpublished', label: 'Unpublished' },
  { value: 'archived', label: 'Archived' },
]

function toSlug(title: string): string {
  return title.toLowerCase().normalize('NFKD').replace(/[^a-z0-9\s-]/g, '').trim().replace(/\s+/g, '-').replace(/-+/g, '-')
}

function canPublishCollection(status: CollectionStatus): boolean {
  return status === 'draft' || status === 'unpublished'
}

function AudioCollectionsPage() {
  const api = useApi()
  const context = useRouteContext({ from: '/_authenticated' })
  const role = context.user?.role
  const canManage = canManageAudioCollections(role)
  const canArchive = canArchiveAudioStories(role)

  const [collections, setCollections] = useState<AudioStoryCollection[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState<'' | CollectionStatus>('')

  const [createOpen, setCreateOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<AudioStoryCollection | null>(null)
  const [storiesTarget, setStoriesTarget] = useState<string | null>(null)
  const [publishTarget, setPublishTarget] = useState<AudioStoryCollection | null>(null)
  const [scheduleTarget, setScheduleTarget] = useState<AudioStoryCollection | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<AudioStoryCollection | null>(null)
  const [reasonTarget, setReasonTarget] = useState<{ collection: AudioStoryCollection; kind: 'unpublish' | 'archive' } | null>(null)
  const [busy, setBusy] = useState(false)
  const requestId = useRef(0)

  const load = useCallback(async () => {
    const current = ++requestId.current
    setLoading(true)
    setError(null)
    try {
      const response = await api.audioStories.listCollections()
      if (current === requestId.current) setCollections(response.items)
    } catch (err) {
      if (current === requestId.current) {
        setError(err instanceof Error ? err.message : 'Failed to load collections')
        setCollections([])
      }
    } finally {
      if (current === requestId.current) setLoading(false)
    }
  }, [api])

  useEffect(() => { void load() }, [load])

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase()
    return collections.filter((collection) => {
      if (status && collection.status !== status) return false
      if (!term) return true
      return collection.title.toLowerCase().includes(term) || collection.slug.toLowerCase().includes(term)
    })
  }, [collections, search, status])

  const publishCollection = async () => {
    if (!publishTarget) return
    setBusy(true)
    try {
      await api.audioStories.publishCollection(publishTarget.id)
      toast.success(`Published “${publishTarget.title}”`)
      setPublishTarget(null)
      await load()
    } catch (err) {
      showCollectionError(err, 'Failed to publish the collection')
    } finally {
      setBusy(false)
    }
  }

  const scheduleCollection = async (publishAt: string): Promise<boolean> => {
    if (!scheduleTarget) return false
    setBusy(true)
    try {
      await api.audioStories.scheduleCollection(scheduleTarget.id, publishAt)
      toast.success(`Scheduled “${scheduleTarget.title}” for ${formatEatDateTime(publishAt)}`)
      await load()
      return true
    } catch (err) {
      showCollectionError(err, 'Failed to schedule the collection')
      return false
    } finally {
      setBusy(false)
    }
  }

  const deleteCollection = async () => {
    if (!deleteTarget) return
    setBusy(true)
    try {
      await api.audioStories.deleteCollection(deleteTarget.id)
      toast.success('Draft collection deleted')
      setDeleteTarget(null)
      await load()
    } catch (err) {
      showCollectionError(err, 'Failed to delete the collection')
    } finally {
      setBusy(false)
    }
  }

  const reasonAction = async ({ reason }: { reason: string; evidenceReference?: string }): Promise<boolean> => {
    if (!reasonTarget) return false
    setBusy(true)
    try {
      if (reasonTarget.kind === 'unpublish') {
        await api.audioStories.unpublishCollection(reasonTarget.collection.id, reason)
        toast.success('Collection unpublished')
      } else {
        await api.audioStories.archiveCollection(reasonTarget.collection.id, reason)
        toast.success('Collection archived')
      }
      await load()
      return true
    } catch (err) {
      showCollectionError(err, 'Failed to update the collection')
      return false
    } finally {
      setBusy(false)
    }
  }

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-sans text-3xl font-bold tracking-tight text-foreground">Audio Story Collections</h1>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            Curate ordered listening collections, then publish them with their approved stories.
          </p>
        </div>
        {canManage && (
          <Button onClick={() => setCreateOpen(true)} className="rounded-full">
            <Plus className="h-4 w-4" weight="bold" />
            New collection
          </Button>
        )}
      </div>

      <AudioStoryTabs />

      {!canManage && (
        <div className="mb-5 flex flex-wrap items-center gap-3 rounded-lg border border-border bg-[var(--surface-2)] px-4 py-3" role="status">
          <Warning className="h-5 w-5 text-muted-foreground" weight="fill" />
          <p className="text-sm text-muted-foreground">
            <strong className="text-foreground">Read-only.</strong> Only administrators and super admins can curate or publish collections.
          </p>
        </div>
      )}

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="relative min-w-[220px] flex-1">
          <MagnifyingGlass className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search collections"
            aria-label="Search collections"
            className="pl-9"
          />
        </div>
        <select
          value={status}
          onChange={(event) => setStatus(event.target.value as '' | CollectionStatus)}
          aria-label="Filter collections by status"
          className="h-9 rounded-lg border border-input bg-card px-3 text-sm text-foreground"
        >
          {STATUS_FILTERS.map((filter) => (
            <option key={filter.value} value={filter.value}>{filter.label}</option>
          ))}
        </select>
        <Button variant="outline" size="icon" onClick={() => void load()} aria-label="Refresh collections">
          <ArrowClockwise className="h-4 w-4" />
        </Button>
      </div>

      {loading ? (
        <CollectionsSkeleton />
      ) : error ? (
        <div className="rounded-lg border border-destructive/40 bg-[var(--error-container)] p-8 text-center" role="alert">
          <p className="font-semibold text-destructive">{error}</p>
          <Button variant="outline" className="mt-4" onClick={() => void load()}>Retry</Button>
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border bg-card px-6 py-16 text-center">
          <Stack className="mx-auto h-10 w-10 text-muted-foreground" weight="duotone" />
          <h2 className="mt-3 font-sans text-lg font-bold text-foreground">
            {search || status ? 'No collections match these filters' : 'No collections yet'}
          </h2>
          <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">
            {search || status
              ? 'Clear the search or status filter to see every collection.'
              : 'Create a collection, add approved stories in order, then publish it.'}
          </p>
          {canManage && !search && !status ? (
            <Button className="mt-5 rounded-full" onClick={() => setCreateOpen(true)}>
              <Plus className="h-4 w-4" weight="bold" /> New collection
            </Button>
          ) : (search || status) ? (
            <Button variant="outline" className="mt-5" onClick={() => { setSearch(''); setStatus('') }}>
              Clear search and filters
            </Button>
          ) : null}
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border border-border bg-card" style={{ boxShadow: 'var(--card-shadow)' }}>
          <Table>
            <TableHeader>
              <TableRow className="bg-[var(--surface-2)]">
                <TableHead scope="col" className="text-[11px] font-bold uppercase tracking-widest">Collection</TableHead>
                <TableHead scope="col" className="hidden text-[11px] font-bold uppercase tracking-widest md:table-cell">Status</TableHead>
                <TableHead scope="col" className="hidden text-[11px] font-bold uppercase tracking-widest lg:table-cell">Stories</TableHead>
                <TableHead scope="col" className="hidden text-[11px] font-bold uppercase tracking-widest xl:table-cell">Schedule</TableHead>
                <TableHead scope="col" className="hidden text-[11px] font-bold uppercase tracking-widest lg:table-cell">Updated</TableHead>
                <TableHead scope="col" className="w-[260px]"><span className="sr-only">Actions</span></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((collection) => (
                <TableRow key={collection.id} className="hover:bg-transparent">
                  <TableCell>
                    <div className="min-w-[190px]">
                      <button
                        type="button"
                        onClick={() => setStoriesTarget(collection.id)}
                        className="text-left font-semibold text-foreground hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      >
                        {collection.title}
                      </button>
                      <span className="mt-0.5 block text-xs text-muted-foreground">{collection.slug}</span>
                      <span className="mt-1 flex flex-wrap items-center gap-1.5 md:hidden">
                        <CollectionStatusBadge status={collection.status} />
                        {collection.featured && <span className="text-[11px] font-bold uppercase tracking-widest text-[var(--amber-deep)]">Featured</span>}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    <div className="flex flex-col items-start gap-1">
                      <CollectionStatusBadge status={collection.status} />
                      {collection.featured && <span className="text-[11px] font-bold uppercase tracking-widest text-[var(--amber-deep)]">Featured</span>}
                    </div>
                  </TableCell>
                  <TableCell className="hidden text-sm text-muted-foreground lg:table-cell">
                    {typeof collection.storyCount === 'number'
                      ? `${collection.storyCount} ${collection.storyCount === 1 ? 'story' : 'stories'}${typeof collection.publishedStoryCount === 'number' ? ` · ${collection.publishedStoryCount} published` : ''}`
                      : 'Open to view'}
                  </TableCell>
                  <TableCell className="hidden text-sm text-muted-foreground xl:table-cell">
                    {collection.status === 'scheduled' && collection.publishAt
                      ? formatEatDateTime(collection.publishAt)
                      : collection.publishedAt
                        ? `Published ${formatDate(collection.publishedAt)}`
                        : '—'}
                  </TableCell>
                  <TableCell className="hidden text-sm text-muted-foreground lg:table-cell">{formatDate(collection.updatedAt)}</TableCell>
                  <TableCell>
                    <div className="flex flex-wrap justify-end gap-1.5">
                      <Button size="sm" variant="outline" onClick={() => setStoriesTarget(collection.id)}>
                        <Stack className="h-4 w-4" />
                        {canManage ? 'Manage' : 'View'}
                      </Button>
                      {canManage && collection.status !== 'archived' && (
                        <Button size="sm" variant="ghost" onClick={() => setEditTarget(collection)} aria-label={`Edit ${collection.title}`}>
                          <PencilSimple className="h-4 w-4" />
                        </Button>
                      )}
                      {canManage && canPublishCollection(collection.status) && (
                        <Button size="sm" variant="ghost" onClick={() => setPublishTarget(collection)} aria-label={`Publish ${collection.title}`}>
                          <CheckCircle className="h-4 w-4" />
                        </Button>
                      )}
                      {canManage && canPublishCollection(collection.status) && (
                        <Button size="sm" variant="ghost" onClick={() => setScheduleTarget(collection)} aria-label={`Schedule ${collection.title}`}>
                          <CalendarBlank className="h-4 w-4" />
                        </Button>
                      )}
                      {canManage && (collection.status === 'published' || collection.status === 'scheduled') && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setReasonTarget({ collection, kind: 'unpublish' })}
                          aria-label={`Unpublish ${collection.title}`}
                        >
                          <EyeSlash className="h-4 w-4" />
                        </Button>
                      )}
                      {canArchive && collection.status !== 'archived' && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setReasonTarget({ collection, kind: 'archive' })}
                          aria-label={`Archive ${collection.title}`}
                        >
                          <Archive className="h-4 w-4" />
                        </Button>
                      )}
                      {canManage && collection.status === 'draft' && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setDeleteTarget(collection)}
                          disabled={typeof collection.storyCount === 'number' && collection.storyCount > 0}
                          title={typeof collection.storyCount === 'number' && collection.storyCount > 0 ? 'Remove every story before deleting the draft' : undefined}
                          aria-label={`Delete ${collection.title}`}
                        >
                          <Trash className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border px-4 py-3 text-xs text-muted-foreground">
            <span>Showing {filtered.length} of {collections.length} {collections.length === 1 ? 'collection' : 'collections'}</span>
            <span>Published collections need at least one approved or published story.</span>
          </div>
        </div>
      )}

      <CollectionFormDialog
        open={createOpen}
        mode="create"
        onOpenChange={setCreateOpen}
        onSaved={async (id) => {
          await load()
          if (id) setStoriesTarget(id)
        }}
      />

      <CollectionFormDialog
        open={Boolean(editTarget)}
        mode="edit"
        collection={editTarget ?? undefined}
        onOpenChange={(open) => { if (!open) setEditTarget(null) }}
        onSaved={async () => { await load() }}
      />

      <CollectionStoriesDialog
        open={Boolean(storiesTarget)}
        collectionId={storiesTarget}
        canManage={canManage}
        onOpenChange={(open) => { if (!open) setStoriesTarget(null) }}
        onSaved={async () => { await load() }}
      />

      <ScheduleDialog
        open={Boolean(scheduleTarget)}
        onOpenChange={(open) => { if (!open) setScheduleTarget(null) }}
        title="Schedule collection publication"
        description={scheduleTarget
          ? `“${scheduleTarget.title}” will become publicly visible at the time you choose, provided it has at least one published story.`
          : 'Choose when the collection should become publicly visible.'}
        loading={busy}
        onSchedule={scheduleCollection}
      />

      <ReasonDialog
        open={Boolean(reasonTarget)}
        onOpenChange={(open) => { if (!open) setReasonTarget(null) }}
        title={reasonTarget?.kind === 'archive' ? 'Archive this collection?' : 'Unpublish this collection?'}
        description={reasonTarget?.kind === 'archive'
          ? 'Archiving removes the collection from the public site. The reason and your account are written to the audit timeline.'
          : 'Unpublishing hides the collection from the public site. Published stories remain public on their own.'}
        confirmLabel={reasonTarget?.kind === 'archive' ? 'Archive collection' : 'Unpublish collection'}
        reasonPlaceholder={reasonTarget?.kind === 'archive' ? 'Superseded by a new collection' : 'Editorial correction / collection withdrawn'}
        variant="destructive"
        loading={busy}
        onConfirm={reasonAction}
      />

      <ConfirmDialog
        open={Boolean(publishTarget)}
        onOpenChange={(open) => { if (!open) setPublishTarget(null) }}
        title="Publish this collection?"
        description={publishTarget
          ? `“${publishTarget.title}” becomes publicly visible if it contains at least one approved or published story. Readiness is checked by the server.`
          : 'The collection becomes publicly visible.'}
        confirmLabel="Publish collection"
        cancelLabel="Cancel"
        variant="default"
        loading={busy}
        loadingLabel="Publishing…"
        onConfirm={() => void publishCollection()}
      />

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => { if (!open) setDeleteTarget(null) }}
        title="Delete this draft collection?"
        description={deleteTarget
          ? `“${deleteTarget.title}” will be permanently deleted. Only draft collections that have never been published and contain no stories can be deleted.`
          : 'The draft collection will be deleted.'}
        confirmLabel="Delete draft"
        loading={busy}
        loadingLabel="Deleting…"
        onConfirm={() => void deleteCollection()}
      />
    </div>
  )
}

interface CollectionFormState {
  title: string
  slug: string
  description: string
  displayOrder: number
  featured: boolean
  coverMediaId: string
}

function emptyForm(): CollectionFormState {
  return { title: '', slug: '', description: '', displayOrder: 0, featured: false, coverMediaId: '' }
}

function formFrom(collection?: AudioStoryCollection): CollectionFormState {
  if (!collection) return emptyForm()
  return {
    title: collection.title,
    slug: collection.slug,
    description: collection.description ?? '',
    displayOrder: collection.displayOrder ?? 0,
    featured: collection.featured,
    coverMediaId: collection.coverMediaId ?? '',
  }
}

function CollectionFormDialog({
  open, mode, collection, onOpenChange, onSaved,
}: {
  open: boolean
  mode: 'create' | 'edit'
  collection?: AudioStoryCollection
  onOpenChange: (open: boolean) => void
  onSaved: (id?: string) => Promise<void> | void
}) {
  const api = useApi()
  const [form, setForm] = useState<CollectionFormState>(() => formFrom(collection))
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)
  const [slugTouched, setSlugTouched] = useState(false)
  const [discardOpen, setDiscardOpen] = useState(false)
  const initial = useRef(JSON.stringify(formFrom(collection)))

  useEffect(() => {
    if (!open) return
    const next = formFrom(collection)
    setForm(next)
    setErrors({})
    setSaving(false)
    setSlugTouched(mode === 'edit')
    setDiscardOpen(false)
    initial.current = JSON.stringify(next)
  }, [open, collection, mode])

  const dirty = JSON.stringify(form) !== initial.current

  const setField = <K extends keyof CollectionFormState>(field: K, value: CollectionFormState[K]) => {
    setForm((current) => ({ ...current, [field]: value }))
    setErrors((current) => {
      if (!current[field]) return current
      const next = { ...current }
      delete next[field]
      return next
    })
  }

  const handleTitle = (value: string) => {
    setForm((current) => ({
      ...current,
      title: value,
      slug: mode === 'create' && !slugTouched ? toSlug(value) : current.slug,
    }))
    setErrors((current) => {
      if (!current.title && !current.slug) return current
      const next = { ...current }
      delete next.title
      delete next.slug
      return next
    })
  }

  const requestClose = () => {
    if (saving) return
    if (dirty) {
      setDiscardOpen(true)
      return
    }
    onOpenChange(false)
  }

  const submit = async () => {
    const payload = {
      title: form.title,
      description: form.description || undefined,
      displayOrder: Number(form.displayOrder) || 0,
      featured: form.featured,
      coverMediaId: form.coverMediaId || undefined,
    }
    const parsed = mode === 'create'
      ? audioCollectionCreateSchema.safeParse({ ...payload, slug: form.slug })
      : audioCollectionUpdateSchema.safeParse(payload)
    if (!parsed.success) {
      setErrors(fieldErrors(parsed.error))
      toast.error('Check the highlighted collection fields.')
      return
    }
    setSaving(true)
    try {
      if (mode === 'create') {
        const body: CreateAudioStoryCollectionInput = {
          slug: form.slug.trim(),
          title: form.title.trim(),
          description: form.description.trim(),
          coverMediaId: form.coverMediaId || undefined,
        }
        const created = await api.audioStories.createCollection(body)
        toast.success('Draft collection created. Add approved stories next.')
        initial.current = JSON.stringify(form)
        onOpenChange(false)
        await onSaved(created.id)
      } else if (collection) {
        await api.audioStories.updateCollection(collection.id, {
          title: form.title.trim(),
          description: form.description.trim(),
          displayOrder: Number(form.displayOrder) || 0,
          featured: form.featured,
          coverMediaId: form.coverMediaId || undefined,
        })
        toast.success('Collection details saved')
        initial.current = JSON.stringify(form)
        onOpenChange(false)
        await onSaved()
      }
    } catch (err) {
      showCollectionError(err, 'Failed to save the collection')
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <Dialog open={open} onOpenChange={(next) => { if (!next) requestClose(); else onOpenChange(true) }}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{mode === 'create' ? 'New Audio Story Collection' : 'Edit collection'}</DialogTitle>
            <DialogDescription>
              Collections group ordered stories for the public listening experience. A collection starts as a draft.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <FormInput
                label="Title"
                required
                value={form.title}
                onChange={handleTitle}
                error={errors.title}
                placeholder="Voices of the Coast"
              />
            </div>
            <FormInput
              label="Slug"
              required
              value={form.slug}
              onChange={(value) => { setSlugTouched(true); setField('slug', value) }}
              error={errors.slug}
              disabled={mode === 'edit'}
              description={mode === 'edit' ? 'Fixed after creation.' : 'Used in public URLs.'}
            />
            <FormInput
              label="Display order"
              type="number"
              value={String(form.displayOrder)}
              onChange={(value) => setField('displayOrder', Number(value) || 0)}
              error={errors.displayOrder}
              description="Lower numbers appear first."
            />
            <div className="sm:col-span-2">
              <FormTextarea
                label="Description"
                value={form.description}
                onChange={(value) => setField('description', value)}
                error={errors.description}
                placeholder="What this collection helps listeners discover."
              />
            </div>
            <div className="sm:col-span-2">
              <FormSwitch
                label="Featured collection"
                checked={form.featured}
                onChange={(value) => setField('featured', value)}
                description="Featured collections can be promoted on the public audio home."
              />
            </div>
            <div className="sm:col-span-2">
              <span className="mb-1 block text-sm font-semibold text-foreground">Cover image</span>
              <p className="mb-2 text-xs text-muted-foreground">Optional. Recommended 1600×900.</p>
              {form.coverMediaId ? (
                <div className="mb-2 flex flex-wrap items-center gap-3 rounded-lg border border-border bg-[var(--surface-2)] px-4 py-3">
                  <CheckCircle className="h-5 w-5 text-[var(--leaf)]" weight="fill" />
                  <span className="text-sm text-foreground">Cover attached</span>
                  <span className="text-xs text-muted-foreground">ID {form.coverMediaId.slice(0, 8)}…</span>
                </div>
              ) : null}
              <MediaUpload
                label={form.coverMediaId ? 'Replace cover' : 'Upload cover'}
                compact={Boolean(form.coverMediaId)}
                allowedTypes={['image/jpeg', 'image/png', 'image/webp']}
                entityType="audio_story_collection"
                entityId={collection?.id}
                metadata={{ type: 'image', altText: form.title }}
                onComplete={(result) => {
                  setField('coverMediaId', result.id)
                  toast.success('Cover uploaded. Save the collection to keep it.')
                }}
                onError={(message) => toast.error(message)}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={requestClose} disabled={saving}>Cancel</Button>
            <Button onClick={() => void submit()} disabled={saving}>
              {saving ? 'Saving…' : mode === 'create' ? 'Create draft' : 'Save changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={discardOpen}
        onOpenChange={setDiscardOpen}
        title="Discard collection changes?"
        description="The collection details have not been saved."
        confirmLabel="Discard"
        cancelLabel="Keep editing"
        onConfirm={() => {
          setDiscardOpen(false)
          setForm(formFrom(collection))
          setErrors({})
          onOpenChange(false)
        }}
      />
    </>
  )
}

function CollectionStoriesDialog({
  open, collectionId, canManage, onOpenChange, onSaved,
}: {
  open: boolean
  collectionId: string | null
  canManage: boolean
  onOpenChange: (open: boolean) => void
  onSaved: () => Promise<void> | void
}) {
  const api = useApi()
  const [detail, setDetail] = useState<AudioCollectionDetail | null>(null)
  const [allStories, setAllStories] = useState<AudioStory[]>([])
  const [includedIds, setIncludedIds] = useState<string[]>([])
  const [savedIds, setSavedIds] = useState<string[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [discardOpen, setDiscardOpen] = useState(false)
  const [reloadToken, setReloadToken] = useState(0)

  useEffect(() => {
    if (!open || !collectionId) return
    let cancelled = false
    setLoading(true)
    setError(null)
    setSearch('')
    Promise.all([
      api.audioStories.getCollection(collectionId),
      api.audioStories.list(),
    ])
      .then(([collectionResponse, storyResponse]) => {
        if (cancelled) return
        setDetail(collectionResponse)
        setAllStories(storyResponse.items)
        const ordered = collectionResponse.stories.map((story) => story.id)
        setIncludedIds(ordered)
        setSavedIds(ordered)
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load the collection')
          setDetail(null)
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => { cancelled = true }
  }, [open, collectionId, api, reloadToken])

  const storyMap = useMemo(() => {
    const map = new Map<string, AudioStory>()
    for (const story of detail?.stories ?? []) map.set(story.id, story)
    for (const story of allStories) map.set(story.id, story)
    return map
  }, [detail, allStories])

  const includedSet = useMemo(() => new Set(includedIds), [includedIds])
  const dirty = includedIds.join('|') !== savedIds.join('|')

  const available = useMemo(() => {
    const term = search.trim().toLowerCase()
    return allStories
      .filter((story) => !includedSet.has(story.id))
      .filter((story) => !term || story.title.toLowerCase().includes(term) || story.slug.toLowerCase().includes(term))
      .sort((a, b) => a.title.localeCompare(b.title))
  }, [allStories, includedSet, search])

  const move = (index: number, direction: -1 | 1) => {
    setIncludedIds((current) => {
      const next = [...current]
      const target = index + direction
      if (target < 0 || target >= next.length) return current
      ;[next[index], next[target]] = [next[target], next[index]]
      return next
    })
  }

  const requestClose = () => {
    if (saving) return
    if (dirty) {
      setDiscardOpen(true)
      return
    }
    onOpenChange(false)
  }

  const save = async () => {
    if (!collectionId) return
    setSaving(true)
    try {
      await api.audioStories.setCollectionStories(collectionId, includedIds)
      toast.success('Collection stories and order saved')
      setSavedIds([...includedIds])
      await onSaved()
    } catch (err) {
      showCollectionError(err, 'Failed to save the collection stories')
    } finally {
      setSaving(false)
    }
  }

  const collection = detail?.collection
  const published = collection?.status === 'published' || collection?.status === 'scheduled'
  const editable = canManage && collection?.status !== 'archived'

  return (
    <>
      <Dialog open={open} onOpenChange={(next) => { if (!next) requestClose(); else onOpenChange(true) }}>
        <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-4xl">
          <DialogHeader>
            <DialogTitle>{editable ? 'Manage collection stories' : 'Collection stories'}</DialogTitle>
            <DialogDescription>
              {collection
                ? <><strong>{collection.title}</strong> · Order is the public playback order.</>
                : 'Loading collection…'}
            </DialogDescription>
          </DialogHeader>

          {loading ? (
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, index) => <Skeleton key={index} className="h-12 w-full" />)}
            </div>
          ) : error ? (
            <div className="rounded-lg border border-destructive/40 bg-[var(--error-container)] p-6 text-center" role="alert">
              <p className="font-semibold text-destructive">{error}</p>
              <Button variant="outline" className="mt-3" onClick={() => setReloadToken((value) => value + 1)}>Retry</Button>
            </div>
          ) : collection ? (
            <>
              <div className="flex flex-wrap items-center gap-2">
                <CollectionStatusBadge status={collection.status} />
                <span className="text-xs text-muted-foreground">{includedIds.length} {includedIds.length === 1 ? 'story' : 'stories'} in this collection</span>
                {published && editable && (
                  <span className="rounded-full border border-[var(--amber-deep)] bg-[var(--amber-bg)] px-2 py-0.5 text-[11px] font-bold text-[var(--amber-deep)]">
                    Editing order updates the public collection
                  </span>
                )}
              </div>

              <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
                <section className="min-w-0 rounded-lg border border-border" aria-label="Stories in this collection">
                  <div className="border-b border-border bg-[var(--surface-2)] px-4 py-3">
                    <h3 className="text-sm font-bold text-foreground">In this collection</h3>
                    <p className="text-xs text-muted-foreground">Use the arrows to set the public order.</p>
                  </div>
                  {includedIds.length === 0 ? (
                    <p className="px-4 py-8 text-center text-sm text-muted-foreground">No stories yet. Add approved stories from the right.</p>
                  ) : (
                    <ol className="divide-y divide-border">
                      {includedIds.map((id, index) => {
                        const story = storyMap.get(id)
                        return (
                          <li key={id} className="flex items-center gap-2 px-3 py-2.5">
                            <span className="w-5 shrink-0 text-center text-xs font-bold text-muted-foreground">{index + 1}</span>
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-sm font-semibold text-foreground">{story?.title ?? 'Unknown story'}</p>
                              {story && <StoryStatusBadge status={story.status} />}
                            </div>
                            {editable && (
                              <div className="flex shrink-0 items-center">
                                <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => move(index, -1)} disabled={index === 0} aria-label={`Move ${story?.title ?? 'story'} up`}>
                                  <ArrowUp className="h-3.5 w-3.5" />
                                </Button>
                                <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => move(index, 1)} disabled={index === includedIds.length - 1} aria-label={`Move ${story?.title ?? 'story'} down`}>
                                  <ArrowDown className="h-3.5 w-3.5" />
                                </Button>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="h-7 w-7 text-destructive"
                                  onClick={() => setIncludedIds((current) => current.filter((storyId) => storyId !== id))}
                                  aria-label={`Remove ${story?.title ?? 'story'}`}
                                >
                                  <Trash className="h-3.5 w-3.5" />
                                </Button>
                              </div>
                            )}
                          </li>
                        )
                      })}
                    </ol>
                  )}
                </section>

                <section className="min-w-0 rounded-lg border border-border" aria-label="Available stories">
                  <div className="border-b border-border bg-[var(--surface-2)] px-4 py-3">
                    <h3 className="text-sm font-bold text-foreground">Add stories</h3>
                    <p className="text-xs text-muted-foreground">Only approved or published stories can make a collection public.</p>
                  </div>
                  <div className="border-b border-border p-3">
                    <div className="relative">
                      <MagnifyingGlass className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        value={search}
                        onChange={(event) => setSearch(event.target.value)}
                        placeholder="Search stories"
                        aria-label="Search available stories"
                        className="pl-9"
                      />
                    </div>
                  </div>
                  {available.length === 0 ? (
                    <p className="px-4 py-8 text-center text-sm text-muted-foreground">
                      {search ? 'No stories match this search.' : 'Every story is already in this collection.'}
                    </p>
                  ) : (
                    <ul className="max-h-[340px] divide-y divide-border overflow-y-auto">
                      {available.map((story) => (
                        <li key={story.id} className="flex items-center gap-3 px-3 py-2.5">
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-semibold text-foreground">{story.title}</p>
                            <StoryStatusBadge status={story.status} />
                          </div>
                          {editable && (
                            <Button size="sm" variant="outline" onClick={() => setIncludedIds((current) => [...current, story.id])}>
                              Add
                            </Button>
                          )}
                        </li>
                      ))}
                    </ul>
                  )}
                </section>
              </div>

              {editable && (
                <DialogFooter>
                  <span className="mr-auto self-center text-xs text-muted-foreground">
                    {dirty ? 'Unsaved order and membership changes.' : 'All changes saved.'}
                  </span>
                  <Button variant="outline" onClick={requestClose} disabled={saving}>Close</Button>
                  <Button onClick={() => void save()} disabled={saving || !dirty}>
                    {saving ? 'Saving…' : 'Save stories & order'}
                  </Button>
                </DialogFooter>
              )}
            </>
          ) : null}
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={discardOpen}
        onOpenChange={setDiscardOpen}
        title="Discard story order changes?"
        description="The collection membership and order have not been saved."
        confirmLabel="Discard"
        cancelLabel="Keep editing"
        onConfirm={() => {
          setDiscardOpen(false)
          setIncludedIds(savedIds)
          onOpenChange(false)
        }}
      />
    </>
  )
}

function CollectionsSkeleton() {
  return (
    <div className="overflow-hidden rounded-lg border border-border bg-card">
      <div className="border-b bg-[var(--surface-2)] px-4 py-3">
        <Skeleton className="h-4 w-40" />
      </div>
      {Array.from({ length: 4 }).map((_, index) => (
        <div key={index} className="flex items-center gap-6 border-b px-4 py-4 last:border-0">
          <div className="flex-1">
            <Skeleton className="h-4 w-48" />
            <Skeleton className="mt-2 h-3 w-28" />
          </div>
          <Skeleton className="h-5 w-20 rounded-full" />
          <Skeleton className="h-4 w-24" />
        </div>
      ))}
    </div>
  )
}

function showCollectionError(error: unknown, fallback: string) {
  if (error instanceof ApiErrorResponse) {
    if (error.code === 'NOT_FOUND') {
      toast.error('This collection no longer exists.')
      return
    }
    if (error.code === 'READINESS_BLOCKED') {
      toast.error(error.message || 'The collection is not ready to publish.')
      return
    }
  }
  toast.error(error instanceof Error ? error.message : fallback)
}
