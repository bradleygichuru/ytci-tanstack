import { createFileRoute, redirect, Link, useNavigate, useRouteContext } from '@tanstack/react-router'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { toast } from 'sonner'
import { MagnifyingGlass, Plus, ArrowClockwise, Waveform } from '@phosphor-icons/react'
import { requirePermission } from '#/lib/authz'
import { canAudioStory } from '#/lib/audio-story-permissions'
import { useApi } from '#/lib/api/use-api'
import {
  AUDIO_THEMES,
  AUDIO_THEME_LABELS,
} from '#/lib/api/audio-stories'
import type {
  AudioStory,
  AudioStoryCollection,
  CreateAudioStoryInput,
  AudioTheme,
} from '#/lib/api/audio-stories'
import { audioStoryDraftCreateSchema, fieldErrors, slugSchema } from '#/lib/schemas/audio-story.schema'
import {
  LanguageChips,
  RiskBadge,
  StoryStatusBadge,
  formatDate,
  formatRelative,
} from '#/components/audio-stories/badges'
import { FormInput, FormSelect, FormTextarea } from '#/components/shared/FormField'
import { ConfirmDialog } from '#/components/shared/ConfirmDialog'
import { Button } from '#/components/ui/button'
import { Input } from '#/components/ui/input'
import { Badge } from '#/components/ui/badge'
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '#/components/ui/dialog'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '#/components/ui/table'
import { Skeleton } from '#/components/ui/skeleton'

export const Route = createFileRoute('/_authenticated/audio-stories')({
  beforeLoad: ({ context }) => {
    try {
      requirePermission({ user: { role: context.user?.role ?? '' } }, 'audioStories', ['read'])
    } catch {
      throw redirect({ to: '/no-access' })
    }
  },
  component: AudioStoriesPage,
})

const STATUS_FILTERS = [
  { value: '', label: 'All statuses' },
  { value: 'draft', label: 'Draft' },
  { value: 'in_review', label: 'In review' },
  { value: 'scheduled', label: 'Scheduled' },
  { value: 'published', label: 'Published' },
  { value: 'unpublished', label: 'Unpublished' },
  { value: 'revoked', label: 'Revoked' },
  { value: 'archived', label: 'Archived' },
]

interface CreateFormState {
  title: string
  slug: string
  summary: string
  theme: AudioTheme
  producer: string
  communitySource: string
  collectionId: string
}

function emptyCreateForm(): CreateFormState {
  return {
    title: '',
    slug: '',
    summary: '',
    theme: 'culture_heritage',
    producer: '',
    communitySource: '',
    collectionId: '',
  }
}

function toSlug(title: string): string {
  return title
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
}

function AudioStoriesPage() {
  const api = useApi()
  const navigate = useNavigate()
  const context = useRouteContext({ from: '/_authenticated' })
  const role = context.user?.role
  const canCreate = canAudioStory(role, 'create')

  const [stories, setStories] = useState<AudioStory[]>([])
  const [collections, setCollections] = useState<AudioStoryCollection[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('')
  const [collectionId, setCollectionId] = useState('')

  const [createOpen, setCreateOpen] = useState(false)
  const [createForm, setCreateForm] = useState<CreateFormState>(emptyCreateForm)
  const [createErrors, setCreateErrors] = useState<Record<string, string>>({})
  const [creating, setCreating] = useState(false)
  const [slugTouched, setSlugTouched] = useState(false)
  const [discardCreateOpen, setDiscardCreateOpen] = useState(false)
  const requestId = useRef(0)

  const load = useCallback(async () => {
    const currentRequest = ++requestId.current
    setLoading(true)
    setError(null)
    try {
      const [storyResponse, collectionResponse] = await Promise.all([
        api.audioStories.list({
          status: status || undefined,
          collectionId: collectionId || undefined,
          q: search.trim() || undefined,
        }),
        api.audioStories.listCollections().catch(() => ({ items: [] as AudioStoryCollection[] })),
      ])
      if (currentRequest === requestId.current) {
        setStories(storyResponse.items)
        setCollections(collectionResponse.items)
      }
    } catch (err) {
      if (currentRequest === requestId.current) {
        setError(err instanceof Error ? err.message : 'Failed to load audio stories')
        setStories([])
      }
    } finally {
      if (currentRequest === requestId.current) setLoading(false)
    }
  }, [api, status, collectionId, search])

  useEffect(() => {
    const timer = setTimeout(() => { void load() }, 250)
    return () => clearTimeout(timer)
  }, [load])

  const collectionNames = useMemo(
    () => new Map(collections.map((collection) => [collection.id, collection.title])),
    [collections],
  )

  const setField = <K extends keyof CreateFormState>(field: K, value: CreateFormState[K]) => {
    setCreateForm((current) => ({ ...current, [field]: value }))
    setCreateErrors((current) => {
      if (!current[field]) return current
      const next = { ...current }
      delete next[field]
      return next
    })
  }

  const handleTitle = (value: string) => {
    setCreateForm((current) => ({
      ...current,
      title: value,
      slug: slugTouched ? current.slug : toSlug(value),
    }))
    setCreateErrors((current) => {
      if (!current.title && !current.slug) return current
      const next = { ...current }
      delete next.title
      delete next.slug
      return next
    })
  }

  const createDirty = JSON.stringify(createForm) !== JSON.stringify(emptyCreateForm())

  const closeCreate = (force = false) => {
    if (creating) return
    if (!force && createDirty) {
      setDiscardCreateOpen(true)
      return
    }
    setCreateOpen(false)
    setDiscardCreateOpen(false)
    setCreateForm(emptyCreateForm())
    setCreateErrors({})
    setSlugTouched(false)
  }

  const submitCreate = async () => {
    const parsed = audioStoryDraftCreateSchema.safeParse(createForm)
    if (!parsed.success) {
      setCreateErrors(fieldErrors(parsed.error))
      toast.error('Check the highlighted fields before creating the story.')
      return
    }
    if (collections.length > 0 && !createForm.collectionId) {
      setCreateErrors({ collectionId: 'Choose a collection. It is required before review.' })
      toast.error('Choose a collection for this story.')
      return
    }
    const input: CreateAudioStoryInput = {
      slug: createForm.slug.trim(),
      title: createForm.title.trim(),
      summary: createForm.summary.trim(),
      theme: createForm.theme,
      producer: createForm.producer.trim(),
      communitySource: createForm.communitySource.trim(),
      collectionId: createForm.collectionId || undefined,
    }
    setCreating(true)
    try {
      const created = await api.audioStories.create(input)
      toast.success('Draft story created')
      setCreateOpen(false)
      setCreateForm(emptyCreateForm())
      setSlugTouched(false)
      await navigate({ to: '/audio-stories/$storyId', params: { storyId: created.id } })
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to create the story'
      toast.error(message)
      if (message.toLowerCase().includes('slug')) {
        setCreateErrors({ slug: 'That slug is already in use. Choose another.' })
      }
    } finally {
      setCreating(false)
    }
  }

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-sans text-3xl font-bold tracking-tight text-foreground">Audio Stories</h1>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            Write documentary audio stories, add language tracks and transcripts, and send drafts for review.
          </p>
        </div>
        {canCreate && (
          <Button onClick={() => setCreateOpen(true)} className="rounded-full">
            <Plus className="h-4 w-4" weight="bold" />
            New story
          </Button>
        )}
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="relative min-w-[220px] flex-1">
          <MagnifyingGlass className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search title or slug"
            aria-label="Search audio stories"
            className="pl-9"
          />
        </div>
        <select
          value={status}
          onChange={(event) => setStatus(event.target.value)}
          aria-label="Filter by status"
          className="h-9 rounded-lg border border-input bg-card px-3 text-sm text-foreground"
        >
          {STATUS_FILTERS.map((filter) => (
            <option key={filter.value} value={filter.value}>{filter.label}</option>
          ))}
        </select>
        <select
          value={collectionId}
          onChange={(event) => setCollectionId(event.target.value)}
          aria-label="Filter by collection"
          className="h-9 max-w-[240px] rounded-lg border border-input bg-card px-3 text-sm text-foreground"
        >
          <option value="">All collections</option>
          {collections.map((collection) => (
            <option key={collection.id} value={collection.id}>{collection.title}</option>
          ))}
        </select>
        <Button variant="outline" size="icon" onClick={() => void load()} aria-label="Refresh stories">
          <ArrowClockwise className="h-4 w-4" />
        </Button>
      </div>

      {loading ? (
        <StoriesSkeleton />
      ) : error ? (
        <div className="rounded-lg border border-destructive/40 bg-[var(--error-container)] p-8 text-center" role="alert">
          <p className="font-semibold text-destructive">{error}</p>
          <Button variant="outline" className="mt-4" onClick={() => void load()}>Retry</Button>
        </div>
      ) : stories.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border bg-card px-6 py-16 text-center">
          <Waveform className="mx-auto h-10 w-10 text-muted-foreground" weight="duotone" />
          <h2 className="mt-3 font-sans text-lg font-bold text-foreground">
            {search || status || collectionId ? 'No stories match these filters' : 'No audio stories yet'}
          </h2>
          <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">
            {search || status || collectionId
              ? 'Clear the search or filters to see the full library.'
              : 'Create the first draft, then add audio tracks and transcripts before submitting it for review.'}
          </p>
          {canCreate && !search && !status && !collectionId ? (
            <Button className="mt-5 rounded-full" onClick={() => setCreateOpen(true)}>
              <Plus className="h-4 w-4" weight="bold" /> New story
            </Button>
          ) : (search || status || collectionId) ? (
            <Button
              variant="outline"
              className="mt-5"
              onClick={() => { setSearch(''); setStatus(''); setCollectionId('') }}
            >
              Clear search and filters
            </Button>
          ) : null}
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border border-border bg-card" style={{ boxShadow: 'var(--card-shadow)' }}>
          <Table>
            <TableHeader>
              <TableRow className="bg-[var(--surface-2)]">
                <TableHead scope="col" className="text-[11px] font-bold uppercase tracking-widest">Story</TableHead>
                <TableHead scope="col" className="hidden text-[11px] font-bold uppercase tracking-widest xl:table-cell">Collection</TableHead>
                <TableHead scope="col" className="hidden text-[11px] font-bold uppercase tracking-widest md:table-cell">Workflow</TableHead>
                <TableHead scope="col" className="hidden text-[11px] font-bold uppercase tracking-widest xl:table-cell">Languages</TableHead>
                <TableHead scope="col" className="hidden text-[11px] font-bold uppercase tracking-widest lg:table-cell">Risk</TableHead>
                <TableHead scope="col" className="hidden text-[11px] font-bold uppercase tracking-widest xl:table-cell">Rights</TableHead>
                <TableHead scope="col" className="hidden text-[11px] font-bold uppercase tracking-widest 2xl:table-cell">Reviewer</TableHead>
                <TableHead scope="col" className="hidden text-[11px] font-bold uppercase tracking-widest sm:table-cell">Updated</TableHead>
                <TableHead scope="col" className="w-10"><span className="sr-only">Open</span></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {stories.map((story) => {
                const expires = story.rightsExpiresAt ? new Date(story.rightsExpiresAt) : null
                const expired = expires ? expires.getTime() < Date.now() : false
                const expiringSoon = expires
                  ? !expired && expires.getTime() - Date.now() < 30 * 24 * 60 * 60 * 1000
                  : false
                return (
                  <TableRow key={story.id} className="group hover:bg-transparent">
                    <TableCell>
                      <Link
                        to="/audio-stories/$storyId"
                        params={{ storyId: story.id }}
                        className="block min-w-[190px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      >
                        <span className="block font-semibold text-foreground group-hover:text-primary">{story.title}</span>
                        <span className="mt-0.5 block text-xs text-muted-foreground">
                          {AUDIO_THEME_LABELS[story.theme] ?? story.theme} · {story.slug}
                        </span>
                        <span className="mt-1 flex items-center gap-1.5 md:hidden">
                          <StoryStatusBadge status={story.status} />
                          <span className="text-[11px] text-muted-foreground">
                            {story.openRevisionStatus === 'draft' ? 'Draft revision' : story.openRevisionStatus === 'in_review' ? 'In review' : 'Live'}
                          </span>
                          <RiskBadge risk={story.riskTier} />
                        </span>
                      </Link>
                    </TableCell>
                    <TableCell className="hidden text-sm text-muted-foreground xl:table-cell">
                      {story.collectionTitle || (story.collectionId ? collectionNames.get(story.collectionId) : '') || 'Unplaced'}
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      <div className="flex flex-col items-start gap-1">
                        <StoryStatusBadge status={story.status} />
                        <span className="text-[11px] text-muted-foreground">
                          {story.openRevisionStatus
                            ? story.openRevisionStatus === 'draft'
                              ? 'Draft revision'
                              : story.openRevisionStatus === 'in_review'
                              ? 'Revision in review'
                              : story.openRevisionStatus
                            : 'Live version · no open draft'}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="hidden xl:table-cell"><LanguageChips languages={story.languages} /></TableCell>
                    <TableCell className="hidden lg:table-cell"><RiskBadge risk={story.riskTier} /></TableCell>
                    <TableCell className="hidden text-sm text-muted-foreground xl:table-cell">
                      {expires ? (
                        <Badge
                          variant="outline"
                          className={`rounded-full ${expired ? 'border-destructive bg-[var(--error-container)] text-destructive' : expiringSoon ? 'border-[var(--amber-deep)] bg-[var(--amber-bg)] text-[var(--amber-deep)]' : 'text-muted-foreground'}`}
                        >
                          {expired ? 'Expired ' : expiringSoon ? 'Expires ' : ''}{formatDate(story.rightsExpiresAt)}
                        </Badge>
                      ) : 'No expiry'}
                    </TableCell>
                    <TableCell className="hidden text-sm text-muted-foreground 2xl:table-cell">
                      {story.assignedReviewerName || (story.assignedReviewerId ? 'Assigned' : '—')}
                    </TableCell>
                    <TableCell className="hidden text-sm text-muted-foreground sm:table-cell">{formatRelative(story.updatedAt)}</TableCell>
                    <TableCell>
                      <Button variant="ghost" size="icon" asChild>
                        <Link
                          to="/audio-stories/$storyId"
                          params={{ storyId: story.id }}
                          aria-label={`Open ${story.title}`}
                        >
                          <span aria-hidden className="text-foreground">›</span>
                        </Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
          <div className="flex items-center justify-between border-t border-border px-4 py-3 text-xs text-muted-foreground">
            <span>Showing {stories.length} {stories.length === 1 ? 'story' : 'stories'}</span>
            <span>Drafts save explicitly; submitting locks the revision.</span>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={discardCreateOpen}
        onOpenChange={setDiscardCreateOpen}
        title="Discard this draft?"
        description="The story has not been created yet. Closing the form will discard everything you entered."
        confirmLabel="Discard"
        cancelLabel="Keep editing"
        onConfirm={() => closeCreate(true)}
      />

      <Dialog open={createOpen} onOpenChange={(open) => { if (!open) closeCreate() }}>
        <DialogContent
          className="max-h-[90vh] overflow-y-auto sm:max-w-2xl"
          onKeyDown={(event) => {
            if (event.key !== 'Enter' || creating) return
            const target = event.target as HTMLElement
            if (target.tagName === 'TEXTAREA' || target.tagName === 'BUTTON' || target.tagName === 'SELECT') return
            event.preventDefault()
            void submitCreate()
          }}
        >
          <DialogHeader>
            <DialogTitle>New Audio Story</DialogTitle>
            <DialogDescription>
              Start a draft. Audio, transcripts, credits and rights are completed in the story editor.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 sm:grid-cols-2">
            <FormInput
              label="Title"
              required
              value={createForm.title}
              onChange={handleTitle}
              error={createErrors.title}
              placeholder="The Last Mangrove"
            />
            <FormInput
              label="Slug"
              required
              value={createForm.slug}
              onChange={(value) => {
                setSlugTouched(true)
                setField('slug', value)
              }}
              error={createErrors.slug ?? (createForm.slug && !slugSchema.safeParse(createForm.slug).success ? 'Use lowercase letters, numbers and hyphens' : undefined)}
              description="Fixed when the draft is created."
            />
            <div className="sm:col-span-2">
              <FormTextarea
                label="Summary"
                required
                value={createForm.summary}
                onChange={(value) => setField('summary', value)}
                error={createErrors.summary}
                placeholder="What the listener will hear, in one or two sentences."
              />
            </div>
            <FormSelect
              label="Theme"
              required
              value={createForm.theme}
              onChange={(value) => setField('theme', value as AudioTheme)}
              options={AUDIO_THEMES.map((theme) => ({ value: theme, label: AUDIO_THEME_LABELS[theme] }))}
            />
            <FormSelect
              label="Collection"
              required={collections.length > 0}
              value={createForm.collectionId}
              onChange={(value) => setField('collectionId', value)}
              options={collections.map((collection) => ({ value: collection.id, label: collection.title }))}
              error={createErrors.collectionId}
              description={collections.length === 0 ? 'No collections exist yet; you can assign one later.' : 'Required to create the draft.'}
            />
            <FormInput
              label="Producer"
              required
              value={createForm.producer}
              onChange={(value) => setField('producer', value)}
              error={createErrors.producer}
              placeholder="YTCI Coastal Unit"
            />
            <FormInput
              label="Community / source"
              required
              value={createForm.communitySource}
              onChange={(value) => setField('communitySource', value)}
              error={createErrors.communitySource}
              placeholder="Kilifi mangrove elders"
            />
            <div className="sm:col-span-2 rounded-lg bg-[var(--surface-2)] px-4 py-3 text-xs text-muted-foreground">
              Cover, placement, rights and review risk are completed in the editor. They are checked by the readiness rail before submission.
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => closeCreate()} disabled={creating}>Cancel</Button>
            <Button onClick={() => void submitCreate()} disabled={creating}>
              {creating ? 'Creating…' : 'Create draft'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function StoriesSkeleton() {
  return (
    <div className="overflow-hidden rounded-lg border border-border bg-card">
      <div className="border-b bg-[var(--surface-2)] px-4 py-3">
        <Skeleton className="h-4 w-40" />
      </div>
      {Array.from({ length: 5 }).map((_, index) => (
        <div key={index} className="flex items-center gap-6 border-b px-4 py-4 last:border-0">
          <div className="flex-1">
            <Skeleton className="h-4 w-44" />
            <Skeleton className="mt-2 h-3 w-28" />
          </div>
          <Skeleton className="h-5 w-20 rounded-full" />
          <Skeleton className="h-5 w-24 rounded-full" />
          <Skeleton className="h-4 w-16" />
        </div>
      ))}
    </div>
  )
}
