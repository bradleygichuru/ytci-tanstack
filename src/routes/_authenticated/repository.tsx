import { createFileRoute, redirect } from '@tanstack/react-router'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import {
  Archive,
  ArrowClockwise,
  ArrowSquareOut,
  CheckCircle,
  Eye,
  FloppyDisk,
  MagnifyingGlass,
  PaperPlaneTilt,
  PencilSimple,
  Plus,
  Prohibit,
  Star,
  Trash,
  X,
  XCircle,
} from '@phosphor-icons/react'
import { requirePermission } from '#/lib/authz'
import { useApi } from '#/lib/api/use-api'
import type {
  RepositoryEntryAdmin,
  RepositoryEntryInput,
  RepositoryKind,
  RepositorySettings,
  RepositoryStatus,
} from '#/lib/api/repository'
import { MediaUpload } from '#/components/shared/MediaUpload'
import { ConfirmDialog } from '#/components/shared/ConfirmDialog'
import { FormInput, FormSelect, FormSwitch, FormTextarea } from '#/components/shared/FormField'
import { StatusBadge } from '#/components/shared/StatusBadge'
import { Button } from '#/components/ui/button'
import { kenyaCounties } from '#/lib/counties'
import { cn } from '#/lib/utils'

export const Route = createFileRoute('/_authenticated/repository')({
  beforeLoad: ({ context }) => {
    try {
      requirePermission({ user: { role: context.user?.role ?? '' } }, 'repository', ['read'])
    } catch {
      throw redirect({ to: '/no-access' })
    }
  },
  component: RepositoryAdminPage,
})

const KINDS: Array<{ value: RepositoryKind; label: string }> = [
  { value: 'competition_entry', label: 'Competition entry' },
  { value: 'innovation', label: 'Youth innovation' },
  { value: 'conservation_resource', label: 'Conservation & guides' },
  { value: 'experience', label: 'Travel experience' },
]

const CATEGORIES: Record<RepositoryKind, string[]> = {
  competition_entry: ['Photography', 'Video', 'Storytelling', 'Digital Campaign', 'Innovation Pitch', 'Other'],
  innovation: ['Tourism Tech', 'Sustainable Travel', 'Community Impact', 'Creative Enterprise', 'Other'],
  conservation_resource: ['Sustainable Tourism', 'Digital Tourism', 'Youth Investment', 'Conservation Practice', 'County Guide', 'Other'],
  experience: ['National Parks', 'Coast', 'Culture & Heritage', 'Urban', 'Adventure', 'Other'],
}

const STATUSES: Array<{ value: RepositoryStatus; label: string }> = [
  { value: 'draft', label: 'Draft' },
  { value: 'submitted', label: 'Submitted' },
  { value: 'approved', label: 'Approved' },
  { value: 'published', label: 'Published' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'archived', label: 'Archived' },
]

const emptyDraft = (): RepositoryEntryInput => ({
  kind: 'experience',
  title: '',
  summary: '',
  bodyMd: '',
  county: null,
  category: null,
  tags: [],
  authorName: 'YTCI Editorial',
  authorOrg: 'YTCI',
  coverMediaId: null,
  documentMediaId: null,
  galleryMediaIds: [],
  externalUrl: null,
  embedUrl: null,
  featured: false,
  status: 'draft',
})

type PanelMode = 'create' | 'edit' | 'review' | null
type Tab = 'entries' | 'submissions' | 'settings'

function RepositoryAdminPage() {
  const api = useApi()
  const [tab, setTab] = useState<Tab>('entries')
  const [items, setItems] = useState<Array<RepositoryEntryAdmin> | null>(null)
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('')
  const [kindFilter, setKindFilter] = useState('')
  const [search, setSearch] = useState('')
  const [query, setQuery] = useState('')
  const [nextCursor, setNextCursor] = useState<string | null>(null)
  const [hasMore, setHasMore] = useState(false)
  const [panelMode, setPanelMode] = useState<PanelMode>(null)
  const [selected, setSelected] = useState<RepositoryEntryAdmin | null>(null)
  const [draft, setDraft] = useState<RepositoryEntryInput>(emptyDraft())
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)
  const [acting, setActing] = useState(false)
  const [showDelete, setShowDelete] = useState(false)
  const [showReject, setShowReject] = useState(false)
  const [rejectNote, setRejectNote] = useState('')
  const [settings, setSettings] = useState<RepositorySettings | null>(null)
  const [settingsSaving, setSettingsSaving] = useState(false)

  const effectiveStatus = tab === 'submissions' ? 'submitted' : statusFilter

  const load = useCallback(
    async (cursor?: string | null, append = false) => {
      setLoading(!append)
      try {
        const result = await api.repository.entries.list({
          status: (effectiveStatus || undefined) as RepositoryStatus | undefined,
          kind: (kindFilter || undefined) as RepositoryKind | undefined,
          q: query || undefined,
          cursor: cursor ?? undefined,
          limit: 50,
        })
        setItems((current) => (append && current ? [...current, ...result.items] : result.items))
        setNextCursor(result.nextCursor)
        setHasMore(result.hasMore)
      } catch {
        toast.error('Failed to load repository entries')
        if (!append) setItems([])
      } finally {
        setLoading(false)
      }
    },
    [api, effectiveStatus, kindFilter, query],
  )

  useEffect(() => {
    if (tab === 'settings') return
    void load()
  }, [load, tab])

  useEffect(() => {
    if (tab !== 'settings' || settings) return
    api.repository.settings
      .get()
      .then(setSettings)
      .catch(() => toast.error('Failed to load repository settings'))
  }, [api, settings, tab])

  const stats = useMemo(() => {
    const list = items ?? []
    return {
      total: list.length,
      pending: list.filter((item) => item.status === 'submitted').length,
      published: list.filter((item) => item.status === 'published').length,
      featured: list.filter((item) => item.featured).length,
    }
  }, [items])

  const openCreate = () => {
    setSelected(null)
    setDraft(emptyDraft())
    setErrors({})
    setPanelMode('create')
  }

  const openEdit = async (entry: RepositoryEntryAdmin) => {
    setSelected(entry)
    setDraft(entryToInput(entry))
    setErrors({})
    setPanelMode('edit')
    try {
      const fresh = await api.repository.entries.get(entry.id)
      setSelected(fresh)
      setDraft(entryToInput(fresh))
    } catch {
      // The list row is enough to start editing if the detail fetch fails.
    }
  }

  const openReview = (entry: RepositoryEntryAdmin) => {
    setSelected(entry)
    setErrors({})
    setPanelMode('review')
  }

  const closePanel = () => {
    setPanelMode(null)
    setSelected(null)
    setErrors({})
  }

  const save = async (statusOverride?: 'draft' | 'published'): Promise<RepositoryEntryAdmin | null> => {
    const nextErrors: Record<string, string> = {}
    if (!draft.title?.trim()) nextErrors.title = 'Title is required'
    if (!draft.kind) nextErrors.kind = 'Kind is required'
    if (!draft.summary?.trim()) nextErrors.summary = 'Summary is required'
    if (!draft.category) nextErrors.category = 'Category is required'
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0) return null

    setSaving(true)
    try {
      const body: RepositoryEntryInput = {
        ...draft,
        status: statusOverride ?? (draft.status === 'published' ? 'published' : 'draft'),
      }
      const saved =
        panelMode === 'create'
          ? await api.repository.entries.create(body)
          : await api.repository.entries.update(selected!.id, body)
      toast.success(panelMode === 'create' ? 'Entry created' : 'Entry saved')
      setSelected(saved)
      setDraft(entryToInput(saved))
      setPanelMode('edit')
      await load()
      return saved
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to save entry')
      return null
    } finally {
      setSaving(false)
    }
  }

  const act = async (action: 'approve' | 'publish' | 'unpublish' | 'feature', entry: RepositoryEntryAdmin) => {
    setActing(true)
    try {
      if (action === 'approve') await api.repository.entries.approve(entry.id)
      if (action === 'publish') await api.repository.entries.publish(entry.id)
      if (action === 'unpublish') await api.repository.entries.unpublish(entry.id)
      if (action === 'feature') await api.repository.entries.feature(entry.id, !entry.featured)
      toast.success('Entry updated')
      closePanel()
      await load()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Action failed')
    } finally {
      setActing(false)
    }
  }

  const saveAndPublish = async () => {
    const saved = await save('draft')
    if (!saved) return
    setActing(true)
    try {
      await api.repository.entries.publish(saved.id)
      toast.success('Entry published')
      closePanel()
      await load()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to publish entry')
    } finally {
      setActing(false)
    }
  }

  const approveAndPublish = async (entry: RepositoryEntryAdmin) => {
    setActing(true)
    try {
      const approved = await api.repository.entries.approve(entry.id)
      await api.repository.entries.publish(approved.id)
      toast.success('Submission approved and published')
      closePanel()
      await load()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to approve and publish')
    } finally {
      setActing(false)
    }
  }

  const reject = async () => {
    if (!selected) return
    if (rejectNote.trim().length < 10) {
      toast.error('Add a rejection note of at least 10 characters')
      return
    }
    setActing(true)
    try {
      await api.repository.entries.reject(selected.id, rejectNote.trim())
      toast.success('Submission rejected')
      setShowReject(false)
      setRejectNote('')
      closePanel()
      await load()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to reject submission')
    } finally {
      setActing(false)
    }
  }

  const remove = async () => {
    if (!selected) return
    setActing(true)
    try {
      await api.repository.entries.remove(selected.id)
      toast.success('Entry deleted')
      setShowDelete(false)
      closePanel()
      await load()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to delete entry')
    } finally {
      setActing(false)
    }
  }

  const saveSettings = async () => {
    if (!settings) return
    setSettingsSaving(true)
    try {
      const saved = await api.repository.settings.update({
        submissionsOpen: settings.submissionsOpen,
        submissionIntro: settings.submissionIntro,
        termsVersion: settings.termsVersion,
      })
      setSettings(saved)
      toast.success('Repository settings saved')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to save settings')
    } finally {
      setSettingsSaving(false)
    }
  }

  return (
    <div className="mx-auto w-full max-w-[1400px] p-6">
      <div className="flex flex-col gap-4 border-b border-border pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
            YTCI Digital Repository
          </p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight">Repository</h1>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            Author entries, review public submissions, and control what appears on the public
            archive.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => void load()} disabled={loading}>
            <ArrowClockwise className={loading ? 'animate-spin' : ''} />
            Refresh
          </Button>
          <Button onClick={openCreate}>
            <Plus />
            New entry
          </Button>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Entries in view" value={stats.total} icon={Archive} />
        <Stat label="Awaiting review" value={stats.pending} icon={Eye} />
        <Stat label="Published" value={stats.published} icon={CheckCircle} />
        <Stat label="Featured" value={stats.featured} icon={Star} />
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-1 border-b border-border">
        {(
          [
            { key: 'entries', label: 'Entries' },
            { key: 'submissions', label: 'Submissions' },
            { key: 'settings', label: 'Settings' },
          ] as Array<{ key: Tab; label: string }>
        ).map((item) => (
          <button
            key={item.key}
            type="button"
            onClick={() => setTab(item.key)}
            className={cn(
              'border-b-2 px-4 py-2.5 text-sm font-semibold transition-colors',
              tab === item.key
                ? 'border-primary text-foreground'
                : 'border-transparent text-muted-foreground hover:text-foreground',
            )}
          >
            {item.label}
          </button>
        ))}
      </div>

      {tab === 'settings' ? (
        <SettingsPanel
          settings={settings}
          onChange={setSettings}
          onSave={saveSettings}
          saving={settingsSaving}
        />
      ) : (
        <>
          <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center">
            <form
              className="relative min-w-0 flex-1"
              onSubmit={(event) => {
                event.preventDefault()
                setQuery(search)
              }}
            >
              <MagnifyingGlass className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search title, summary, county…"
                className="h-9 w-full rounded-md border border-input bg-background pl-9 pr-3 text-sm outline-none focus:border-ring"
              />
            </form>
            {tab !== 'submissions' ? (
              <select
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value)}
                className="h-9 rounded-md border border-input bg-background px-3 text-sm"
                aria-label="Filter by status"
              >
                <option value="">All statuses</option>
                {STATUSES.map((status) => (
                  <option key={status.value} value={status.value}>
                    {status.label}
                  </option>
                ))}
              </select>
            ) : null}
            <select
              value={kindFilter}
              onChange={(event) => setKindFilter(event.target.value)}
              className="h-9 rounded-md border border-input bg-background px-3 text-sm"
              aria-label="Filter by collection"
            >
              <option value="">All collections</option>
              {KINDS.map((kind) => (
                <option key={kind.value} value={kind.value}>
                  {kind.label}
                </option>
              ))}
            </select>
          </div>

          <div className="mt-4 overflow-hidden rounded-lg border border-border">
            <table className="w-full text-left text-sm">
              <thead className="bg-muted/50 text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 font-semibold">Entry</th>
                  <th className="hidden px-4 py-3 font-semibold md:table-cell">Collection</th>
                  <th className="hidden px-4 py-3 font-semibold lg:table-cell">County</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                  <th className="hidden px-4 py-3 font-semibold sm:table-cell">Source</th>
                  <th className="px-4 py-3 text-right font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {loading && !items ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-12 text-center text-muted-foreground">
                      Loading repository entries…
                    </td>
                  </tr>
                ) : items && items.length > 0 ? (
                  items.map((entry) => (
                    <tr key={entry.id} className="align-top hover:bg-muted/30">
                      <td className="max-w-md px-4 py-3">
                        <button
                          type="button"
                          onClick={() =>
                            tab === 'submissions' ? openReview(entry) : void openEdit(entry)
                          }
                          className="text-left"
                        >
                          <span className="block font-semibold text-foreground">{entry.title}</span>
                          <span className="mt-0.5 line-clamp-1 block text-xs text-muted-foreground">
                            {entry.summary}
                          </span>
                          {entry.referenceCode ? (
                            <span className="mt-1 block font-mono text-[10px] text-muted-foreground">
                              {entry.referenceCode}
                            </span>
                          ) : null}
                        </button>
                      </td>
                      <td className="hidden px-4 py-3 md:table-cell">
                        <span className="text-xs font-medium">
                          {KINDS.find((kind) => kind.value === entry.kind)?.label ?? entry.kind}
                        </span>
                      </td>
                      <td className="hidden px-4 py-3 text-xs text-muted-foreground lg:table-cell">
                        {entry.county ?? '—'}
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge status={entry.status} />
                        {entry.featured ? (
                          <span className="ml-1 inline-flex items-center gap-1 text-[10px] font-semibold text-amber-600">
                            <Star className="size-3" weight="fill" /> Featured
                          </span>
                        ) : null}
                      </td>
                      <td className="hidden px-4 py-3 text-xs text-muted-foreground sm:table-cell">
                        {entry.source === 'public' ? 'Public' : 'Admin'}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-1">
                          {tab === 'submissions' ? (
                            <Button size="sm" variant="outline" onClick={() => openReview(entry)}>
                              Review
                            </Button>
                          ) : (
                            <>
                              <Button
                                size="icon-sm"
                                variant="ghost"
                                aria-label={`Edit ${entry.title}`}
                                onClick={() => void openEdit(entry)}
                              >
                                <PencilSimple />
                              </Button>
                              {entry.status === 'published' ? (
                                <Button
                                  size="icon-sm"
                                  variant="ghost"
                                  aria-label={`Open ${entry.title} on the public site`}
                                  asChild
                                >
                                  <a
                                    href={`https://ytci-repository.vercel.app/entry/${entry.slug}`}
                                    target="_blank"
                                    rel="noreferrer"
                                  >
                                    <ArrowSquareOut />
                                  </a>
                                </Button>
                              ) : null}
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="px-4 py-12 text-center text-muted-foreground">
                      {tab === 'submissions'
                        ? 'No submissions are waiting for review.'
                        : 'No entries match this view.'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {hasMore ? (
            <div className="mt-4 flex justify-center">
              <Button
                variant="outline"
                onClick={() => void load(nextCursor, true)}
                disabled={loading}
              >
                Load more
              </Button>
            </div>
          ) : null}
        </>
      )}

      {panelMode ? (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/30">
          <div className="h-full w-full max-w-2xl overflow-y-auto bg-background p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-4 border-b border-border pb-4">
              <div>
                <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                  {panelMode === 'create'
                    ? 'New entry'
                    : panelMode === 'review'
                      ? 'Submission review'
                      : 'Edit entry'}
                </p>
                <h2 className="mt-1 text-xl font-bold">
                  {panelMode === 'create'
                    ? 'Add to the repository'
                    : selected?.title ?? 'Entry'}
                </h2>
              </div>
              <Button size="icon-sm" variant="ghost" onClick={closePanel} aria-label="Close panel">
                <X />
              </Button>
            </div>

            {panelMode === 'review' && selected ? (
              <ReviewPanel
                entry={selected}
                acting={acting}
                onApprove={() => void act('approve', selected)}
                onApprovePublish={() => void approveAndPublish(selected)}
                onReject={() => setShowReject(true)}
              />
            ) : (
              <EditorPanel
                draft={draft}
                setDraft={setDraft}
                errors={errors}
                selected={selected}
                saving={saving}
                acting={acting}
                onSave={() => void save()}
                onPublish={() => void saveAndPublish()}
                onApprove={() => selected && void act('approve', selected)}
                onUnpublish={() => selected && void act('unpublish', selected)}
                onFeature={() => selected && void act('feature', selected)}
                onDelete={() => setShowDelete(true)}
              />
            )}
          </div>
        </div>
      ) : null}

      <ConfirmDialog
        open={showDelete}
        onOpenChange={setShowDelete}
        title="Delete this entry?"
        description="This permanently deletes the draft entry. Media in R2 is unlinked, not deleted. This cannot be undone."
        confirmLabel="Delete entry"
        loading={acting}
        onConfirm={() => void remove()}
      />

      {showReject ? (
        <div className="fixed inset-0 z-[60] grid place-items-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-lg border border-border bg-background p-6 shadow-2xl">
            <h2 className="text-lg font-bold">Reject this submission?</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              The note is internal. It helps the team follow up with the submitter.
            </p>
            <textarea
              value={rejectNote}
              onChange={(event) => setRejectNote(event.target.value)}
              rows={4}
              className="mt-4 w-full rounded-md border border-input bg-background p-3 text-sm"
              placeholder="Explain what is missing or needs correction…"
            />
            <div className="mt-4 flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowReject(false)}>
                Cancel
              </Button>
              <Button variant="destructive" onClick={() => void reject()} disabled={acting}>
                Reject submission
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}

function entryToInput(entry: RepositoryEntryAdmin): RepositoryEntryInput {
  return {
    kind: entry.kind,
    slug: entry.slug,
    title: entry.title,
    summary: entry.summary,
    bodyMd: entry.bodyMd,
    county: entry.county,
    category: entry.category,
    tags: entry.tags,
    authorName: entry.authorName,
    authorEmail: entry.authorEmail,
    authorPhone: entry.authorPhone,
    authorAgeBand: entry.authorAgeBand,
    authorOrg: entry.authorOrg,
    competitionName: entry.competitionName,
    competitionCategory: entry.competitionCategory,
    coverMediaId: entry.coverMediaId,
    documentMediaId: entry.documentMediaId,
    galleryMediaIds: entry.gallery.map((item) => item.id).filter(Boolean) as string[],
    externalUrl: entry.externalUrl,
    embedUrl: entry.embedUrl,
    featured: entry.featured,
    status: entry.status === 'published' ? 'published' : 'draft',
  }
}

function Stat({
  label,
  value,
  icon: Icon,
}: {
  label: string
  value: number
  icon: typeof Archive
}) {
  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <div className="flex items-center justify-between">
        <p className="font-mono text-[9px] uppercase tracking-[0.16em] text-muted-foreground">
          {label}
        </p>
        <Icon className="size-4 text-muted-foreground" />
      </div>
      <p className="mt-2 text-2xl font-bold tracking-tight">{value}</p>
    </div>
  )
}

function ReviewPanel({
  entry,
  acting,
  onApprove,
  onApprovePublish,
  onReject,
}: {
  entry: RepositoryEntryAdmin
  acting: boolean
  onApprove: () => void
  onApprovePublish: () => void
  onReject: () => void
}) {
  return (
    <div className="mt-5 space-y-6">
      <div className="rounded-lg border border-border p-4">
        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge status={entry.status} />
          <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
            {entry.referenceCode ?? 'No reference'}
          </span>
        </div>
        <h3 className="mt-3 text-lg font-bold">{entry.title}</h3>
        <p className="mt-1 text-sm text-muted-foreground">{entry.summary}</p>
        <div className="mt-3 grid gap-2 text-xs sm:grid-cols-2">
          <Detail label="Collection" value={entry.kind.replaceAll('_', ' ')} />
          <Detail label="County" value={entry.county ?? '—'} />
          <Detail label="Category" value={entry.category ?? '—'} />
          <Detail
            label="Submitted"
            value={new Date(entry.createdAt).toLocaleString()}
          />
        </div>
      </div>

      <div className="rounded-lg border border-amber-300/50 bg-amber-50/50 p-4 dark:bg-amber-950/20">
        <p className="font-mono text-[9px] uppercase tracking-[0.16em] text-muted-foreground">
          Submitter details
        </p>
        <div className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
          <Detail label="Name" value={entry.authorName ?? '—'} />
          <Detail label="Email" value={entry.authorEmail ?? '—'} />
          <Detail label="Phone" value={entry.authorPhone ?? '—'} />
          <Detail label="Age band" value={entry.authorAgeBand ?? '—'} />
          <Detail label="Organisation" value={entry.authorOrg ?? '—'} />
          <Detail
            label="Consent"
            value={
              entry.consentAt
                ? `${entry.consentVersion ?? '—'} · ${new Date(entry.consentAt).toLocaleDateString()}`
                : 'Not recorded'
            }
          />
        </div>
      </div>

      {entry.coverImage ? (
        <figure>
          <img
            src={entry.coverImage.url}
            alt={entry.coverImage.alt}
            className="w-full rounded-lg object-cover"
          />
          <figcaption className="mt-1 text-xs text-muted-foreground">
            {entry.coverImage.credit ?? entry.coverImage.alt}
          </figcaption>
        </figure>
      ) : null}

      <div className="prose prose-sm max-w-none whitespace-pre-wrap text-sm leading-relaxed text-foreground">
        {entry.bodyMd}
      </div>

      <div className="flex flex-wrap gap-2 border-t border-border pt-4">
        <Button onClick={onApprovePublish} disabled={acting}>
          <CheckCircle /> Approve & publish
        </Button>
        <Button variant="outline" onClick={onApprove} disabled={acting}>
          Approve only
        </Button>
        <Button variant="destructive" onClick={onReject} disabled={acting}>
          <XCircle /> Reject
        </Button>
      </div>
    </div>
  )
}

function EditorPanel({
  draft,
  setDraft,
  errors,
  selected,
  saving,
  acting,
  onSave,
  onPublish,
  onApprove,
  onUnpublish,
  onFeature,
  onDelete,
}: {
  draft: RepositoryEntryInput
  setDraft: React.Dispatch<React.SetStateAction<RepositoryEntryInput>>
  errors: Record<string, string>
  selected: RepositoryEntryAdmin | null
  saving: boolean
  acting: boolean
  onSave: () => void
  onPublish: () => void
  onApprove: () => void
  onUnpublish: () => void
  onFeature: () => void
  onDelete: () => void
}) {
  const kind = draft.kind ?? 'experience'
  return (
    <div className="mt-5 space-y-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <FormSelect
          label="Collection"
          required
          value={kind}
          onChange={(value) =>
            setDraft((current) => ({
              ...current,
              kind: value as RepositoryKind,
              category: null,
            }))
          }
          options={KINDS}
          error={errors.kind}
        />
        <FormSelect
          label="Category"
          required
          value={draft.category ?? ''}
          onChange={(value) => setDraft((current) => ({ ...current, category: value }))}
          options={CATEGORIES[kind]}
          error={errors.category}
        />
      </div>

      <FormInput
        label="Title"
        required
        value={draft.title ?? ''}
        onChange={(value) => setDraft((current) => ({ ...current, title: value }))}
        error={errors.title}
      />
      <FormTextarea
        label="Summary"
        required
        value={draft.summary ?? ''}
        onChange={(value) => setDraft((current) => ({ ...current, summary: value }))}
        error={errors.summary}
        maxLength={280}
      />
      <FormTextarea
        label="Body (Markdown)"
        value={draft.bodyMd ?? ''}
        onChange={(value) => setDraft((current) => ({ ...current, bodyMd: value }))}
      />

      <div className="grid gap-4 sm:grid-cols-2">
        <FormSelect
          label="County"
          value={draft.county ?? ''}
          onChange={(value) => setDraft((current) => ({ ...current, county: value || null }))}
          options={kenyaCounties.map((county) => ({ value: county, label: county }))}
        />
        <FormInput
          label="Tags (comma separated)"
          value={(draft.tags ?? []).join(', ')}
          onChange={(value) =>
            setDraft((current) => ({
              ...current,
              tags: value
                .split(',')
                .map((tag) => tag.trim())
                .filter(Boolean),
            }))
          }
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <FormInput
          label="Credit name"
          value={draft.authorName ?? ''}
          onChange={(value) => setDraft((current) => ({ ...current, authorName: value }))}
        />
        <FormInput
          label="Credit organisation"
          value={draft.authorOrg ?? ''}
          onChange={(value) => setDraft((current) => ({ ...current, authorOrg: value }))}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <FormInput
          label="External URL"
          value={draft.externalUrl ?? ''}
          onChange={(value) => setDraft((current) => ({ ...current, externalUrl: value || null }))}
        />
        <FormInput
          label="Embed URL (YouTube/Vimeo/Matterport)"
          value={draft.embedUrl ?? ''}
          onChange={(value) => setDraft((current) => ({ ...current, embedUrl: value || null }))}
        />
      </div>

      <FormSwitch
        label="Featured"
        description="Show this entry in the featured strip on the landing page."
        checked={Boolean(draft.featured)}
        onChange={(value) => setDraft((current) => ({ ...current, featured: value }))}
      />

      <div className="rounded-lg border border-dashed border-border p-4">
        <p className="text-sm font-semibold">Cover image</p>
        {selected?.coverImage ? (
          <div className="mt-2 flex items-center gap-3">
            <img
              src={selected.coverImage.url}
              alt={selected.coverImage.alt}
              className="size-16 rounded object-cover"
            />
            <p className="text-xs text-muted-foreground">Current cover</p>
          </div>
        ) : null}
        <div className="mt-3">
          <MediaUpload
            label="Upload cover"
            allowedTypes={['image/jpeg', 'image/png', 'image/webp']}
            metadata={{ type: 'image', entityType: 'repository_entry', entityId: selected?.id }}
            compact
            onComplete={(result) =>
              setDraft((current) => ({ ...current, coverMediaId: result.id }))
            }
          />
        </div>
      </div>

      <div className="rounded-lg border border-dashed border-border p-4">
        <p className="text-sm font-semibold">Gallery</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {selected?.gallery.map((image) => (
            <img
              key={image.id ?? image.url}
              src={image.url}
              alt={image.alt}
              className="size-16 rounded object-cover"
            />
          ))}
        </div>
        <div className="mt-3">
          <MediaUpload
            label="Add gallery image"
            allowedTypes={['image/jpeg', 'image/png', 'image/webp']}
            metadata={{ type: 'image', entityType: 'repository_entry', entityId: selected?.id }}
            compact
            onComplete={(result) =>
              setDraft((current) => ({
                ...current,
                galleryMediaIds: [...(current.galleryMediaIds ?? []), result.id],
              }))
            }
          />
        </div>
      </div>

      <div className="rounded-lg border border-dashed border-border p-4">
        <p className="text-sm font-semibold">Supporting document</p>
        {selected?.document ? (
          <a
            href={selected.document.url}
            target="_blank"
            rel="noreferrer"
            className="mt-1 block text-xs font-semibold text-primary underline"
          >
            Current document
          </a>
        ) : null}
        <div className="mt-3">
          <MediaUpload
            label="Upload PDF"
            allowedTypes={['application/pdf']}
            metadata={{ type: 'pdf', entityType: 'repository_entry', entityId: selected?.id }}
            compact
            onComplete={(result) =>
              setDraft((current) => ({ ...current, documentMediaId: result.id }))
            }
          />
        </div>
      </div>

      <div className="flex flex-wrap gap-2 border-t border-border pt-4">
        <Button onClick={onSave} disabled={saving}>
          <FloppyDisk /> {saving ? 'Saving…' : 'Save draft'}
        </Button>
        {selected?.status === 'draft' || selected?.status === 'approved' ? (
          <Button variant="outline" onClick={onPublish} disabled={saving}>
            <PaperPlaneTilt /> Publish
          </Button>
        ) : null}
        {selected?.status === 'submitted' ? (
          <Button variant="outline" onClick={onApprove} disabled={acting}>
            <CheckCircle /> Approve
          </Button>
        ) : null}
        {selected?.status === 'published' ? (
          <>
            <Button variant="outline" onClick={onFeature} disabled={acting}>
              <Star /> {selected.featured ? 'Unfeature' : 'Feature'}
            </Button>
            <Button variant="outline" onClick={onUnpublish} disabled={acting}>
              <Prohibit /> Unpublish
            </Button>
          </>
        ) : null}
        {selected ? (
          <Button variant="destructive" onClick={onDelete} disabled={acting}>
            <Trash /> Delete
          </Button>
        ) : null}
      </div>
    </div>
  )
}

function SettingsPanel({
  settings,
  onChange,
  onSave,
  saving,
}: {
  settings: RepositorySettings | null
  onChange: (settings: RepositorySettings) => void
  onSave: () => void
  saving: boolean
}) {
  if (!settings) {
    return <p className="mt-6 text-sm text-muted-foreground">Loading settings…</p>
  }
  return (
    <div className="mt-6 max-w-2xl space-y-5 rounded-lg border border-border p-6">
      <FormSwitch
        label="Public submissions open"
        description="When off, the public form returns a closed message. Admin authoring still works."
        checked={settings.submissionsOpen}
        onChange={(value) => onChange({ ...settings, submissionsOpen: value })}
      />
      <FormTextarea
        label="Submission intro"
        description="Shown at the top of the public submission page."
        value={settings.submissionIntro ?? ''}
        onChange={(value) => onChange({ ...settings, submissionIntro: value })}
      />
      <FormInput
        label="Terms version"
        value={settings.termsVersion}
        onChange={(value) => onChange({ ...settings, termsVersion: value })}
      />
      <Button onClick={onSave} disabled={saving}>
        <FloppyDisk /> {saving ? 'Saving…' : 'Save settings'}
      </Button>
    </div>
  )
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="font-mono text-[9px] uppercase tracking-[0.14em] text-muted-foreground">
        {label}
      </dt>
      <dd className="mt-0.5 break-words font-medium text-foreground">{value}</dd>
    </div>
  )
}
