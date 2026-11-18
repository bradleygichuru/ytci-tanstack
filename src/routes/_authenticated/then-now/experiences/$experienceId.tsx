import { useEffect, useMemo, useState } from 'react'
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { toast } from 'sonner'
import {
  Calendar,
  CheckCircle,
  ClockCounterClockwise,
  Eye,
  FloppyDisk,
  ListBullets,
  Play,
  Plus,
  Upload,
  X,
} from '@phosphor-icons/react'
import { Button } from '#/components/ui/button'
import { Badge } from '#/components/ui/badge'
import { FormInput, FormSelect, FormTextarea } from '#/components/shared/FormField'
import { useThenNow } from '#/lib/then-now/store'
import { experienceReadiness } from '#/lib/then-now/readiness'
import { formatDateEat, formatEat, relativeAge } from '#/lib/then-now/format'
import { materialChangeNeeded } from '#/lib/then-now/workflow'
import {
  ACCESS_LABEL,
  SENSITIVITY_LABEL,
  type Experience,
  type Sensitivity,
  type TextCard,
} from '#/lib/then-now/types'
import {
  AuditDialog,
  Callout,
  DirtyGuard,
  PageHeader,
  PreviewDialog,
  ReadinessRail,
  StatusPill,
} from '#/components/then-now/shared'
import {
  ActionDialog,
  ClientApprovalDialog,
  ExternalReviewerDialog,
  ReasonDialog,
  RevisionsDialog,
  ScheduleDialog,
  VideoUploadDialog,
} from '#/components/then-now/dialogs'

type ExpTab = 'story' | 'media' | 'cards' | 'accessibility' | 'rights' | 'preview'
const TABS: { key: ExpTab; label: string }[] = [
  { key: 'story', label: 'Story & sources' },
  { key: 'media', label: 'Video & media' },
  { key: 'cards', label: 'Text cards' },
  { key: 'accessibility', label: 'Accessibility' },
  { key: 'rights', label: 'Rights & review' },
  { key: 'preview', label: 'Preview' },
]

export const Route = createFileRoute('/_authenticated/then-now/experiences/$experienceId')({
  validateSearch: (search: Record<string, unknown>): { tab?: ExpTab } => {
    const tab = typeof search.tab === 'string' ? search.tab : 'story'
    return { tab: (TABS.some((entry) => entry.key === tab) ? tab : 'story') as ExpTab }
  },
  component: ExperienceEditorPage,
})

function ExperienceEditorPage() {
  const { experienceId } = Route.useParams()
  const { tab = 'story' } = Route.useSearch()
  const navigate = useNavigate()
  const { state, scenario, can, actions, setScenario } = useThenNow()
  const exp = state.experiences[experienceId]
  const site = exp ? state.sites.find((entry) => entry.id === exp.siteId) : undefined

  const [form, setForm] = useState<Experience | null>(exp ?? null)
  const [dirty, setDirty] = useState(false)
  const [previewOpen, setPreviewOpen] = useState(false)
  const [auditOpen, setAuditOpen] = useState(false)
  const [revisionsOpen, setRevisionsOpen] = useState(false)
  const [uploadOpen, setUploadOpen] = useState(false)
  const [submitOpen, setSubmitOpen] = useState(false)
  const [publishOpen, setPublishOpen] = useState(false)
  const [scheduleOpen, setScheduleOpen] = useState(false)
  const [returnOpen, setReturnOpen] = useState(false)
  const [unpublishOpen, setUnpublishOpen] = useState(false)
  const [archiveOpen, setArchiveOpen] = useState(false)
  const [revokeOpen, setRevokeOpen] = useState(false)
  const [clientOpen, setClientOpen] = useState(false)
  const [externalOpen, setExternalOpen] = useState(false)
  const [conflictOpen, setConflictOpen] = useState(false)
  const [captionsOn, setCaptionsOn] = useState(true)

  useEffect(() => {
    setForm(exp ?? null)
    setDirty(false)
  }, [exp])

  const readiness = useMemo(
    () => (form ? experienceReadiness(form) : { blockers: [], warnings: [], readyToSubmit: false, readyToPublish: false }),
    [form],
  )

  if (!exp || !form) {
    return (
      <div>
        <PageHeader kicker="Then & Now · Experiences" title="Experience not found" back={{ to: '/then-now/experiences', label: 'All experiences' }} />
        <Callout tone="red" title="This fixture is not available.">Return to the experiences list and choose a record.</Callout>
      </div>
    )
  }

  const serverBlocked = scenario === 'offline' || scenario === 'conflict'
  const frozen = exp.draftStatus === 'in_review' || exp.draftStatus === 'approved'
  const canEditContent = can('edit') && scenario !== 'readonly' && exp.draftStatus === 'draft' && exp.status !== 'archived' && exp.status !== 'revoked'
  const canManageRights = can('manage_rights') && canEditContent
  const needsChange = materialChangeNeeded(form)
  const submitReason = scenario === 'conflict'
    ? 'Resolve the 409 conflict before submitting'
    : scenario === 'offline'
      ? 'Reconnect before submitting'
      : !readiness.readyToSubmit
        ? 'Resolve the blocking checks first'
        : needsChange
          ? 'Make a material change before resubmitting a rejected revision'
          : ''
  const publishReason = scenario === 'conflict'
    ? 'Resolve the 409 conflict before publishing'
    : scenario === 'offline'
      ? 'Reconnect before publishing'
      : !readiness.readyToPublish
        ? 'Resolve the blocking checks first'
        : ''
  const noOpenRevision = exp.liveRevision > 0 && exp.draftRevision <= exp.liveRevision
  const authoringBlockers = readiness.blockers.filter((item) => item.section !== 'review')
  const reviewBlockers = readiness.blockers.filter((item) => item.section === 'review')
  const stage = exp.draftStatus === 'in_review'
    ? 'Frozen for review'
    : exp.scheduledAt
      ? 'Scheduled'
      : exp.draftStatus === 'approved'
        ? 'Ready to publish'
        : exp.status === 'archived'
          ? 'Archived'
          : exp.status === 'revoked'
            ? 'Revoked'
            : exp.status === 'unpublished'
              ? 'Unpublished'
              : noOpenRevision
                ? 'Live'
                : exp.lastDecision === 'rejected'
                  ? 'Rejected'
                  : exp.lastDecision === 'changes'
                    ? 'Changes requested'
                    : exp.lastDecision === 'returned'
                      ? 'Returned to draft'
                      : authoringBlockers.length > 0
                        ? `${authoringBlockers.length} blocker${authoringBlockers.length === 1 ? '' : 's'}`
                        : 'Ready to submit'
  const siteEvents = state.audit.filter((event) => event.entity === exp.id || (site && event.entity === site.id))

  const setTab = (next: ExpTab) => {
    navigate({ to: '/then-now/experiences/$experienceId', params: { experienceId: exp.id }, search: { tab: next }, replace: true })
  }

  const setField = <K extends keyof Experience>(key: K, value: Experience[K]) => {
    setForm((prev) => (prev ? { ...prev, [key]: value } : prev))
    setDirty(true)
  }

  const setCards = (cards: TextCard[]) => {
    setForm((prev) => (prev ? { ...prev, textCards: cards } : prev))
    setDirty(true)
  }

  const save = () => {
    if (!canEditContent) return
    if (scenario === 'conflict') {
      setConflictOpen(true)
      return
    }
    try {
      actions.saveExperience(exp.id, form)
      setDirty(false)
      toast.success(scenario === 'offline' ? 'Saved locally; will sync when you’re back online.' : `Draft saved · v${exp.draftRevision}`)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not save the draft.')
    }
  }

  const confirmSubmit = () => {
    try {
      actions.submitExperience(exp.id, form)
      setDirty(false)
      setSubmitOpen(false)
      toast.success(`Submitted v${exp.draftRevision} for review.`)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not submit the revision.')
    }
  }

  const confirmPublish = () => {
    try {
      actions.publishExperience(exp.id)
      setPublishOpen(false)
      setDirty(false)
      toast.success(`Published v${exp.draftRevision}. The live site is updated.`)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not publish the revision.')
    }
  }

  const feedbackLabel = exp.lastDecision === 'rejected'
    ? 'Rejected by'
    : exp.lastDecision === 'returned'
      ? 'Returned to draft by'
      : 'Changes requested by'
  const feedbackNote = exp.reviewNotes[0]

  return (
    <div>
      <PageHeader
        kicker={`Experience · ${site?.name ?? 'Site'}`}
        title={exp.title}
        sub={
          <span className="flex flex-wrap items-center gap-2">
            <StatusPill status={exp.draftStatus} />
            {exp.status === 'published' && <StatusPill status="published" label={`Live v${exp.liveRevision}`} />}
            {exp.scheduledAt && <StatusPill status="scheduled" label="Scheduled" />}
            <span>{ACCESS_LABEL[exp.mode]}</span>
            <span>·</span>
            <span>{exp.languages.join(' / ')}</span>
            <span>·</span>
            <span>rights {formatDateEat(exp.rightsExpiry)}</span>
            <span>·</span>
            <span>last saved {relativeAge(exp.lastSavedAt)}</span>
          </span>
        }
        actions={
          <>
            <Button variant="outline" size="sm" onClick={() => setPreviewOpen(true)}>
              <Eye className="h-4 w-4" weight="duotone" /> Preview
            </Button>
            {exp.draftStatus === 'in_review' && can('review') && (
              <Button size="sm" asChild>
                <Link to="/then-now/review/$revisionId" params={{ revisionId: exp.id }}>
                  <CheckCircle className="h-4 w-4" weight="duotone" /> Open review
                </Link>
              </Button>
            )}
            {canEditContent && (
              <span className={`rounded-full border px-2.5 py-1 text-[10px] font-bold ${dirty ? 'border-[var(--amber)] bg-[var(--amber-bg)] text-[var(--amber-deep)]' : 'border-border bg-muted text-muted-foreground'}`}>
                {dirty ? 'Unsaved changes' : 'Saved'}
              </span>
            )}
            {canEditContent && (
              <Button variant="outline" size="sm" onClick={save}>
                <FloppyDisk className="h-4 w-4" weight="duotone" /> Save draft
              </Button>
            )}
            {exp.draftStatus === 'draft' && can('submit') && (
              <Button size="sm" onClick={() => setSubmitOpen(true)} disabled={Boolean(submitReason)} title={submitReason || undefined}>
                Submit for review
              </Button>
            )}
            {exp.draftStatus === 'approved' && can('publish') && (
              <>
                <Button variant="outline" size="sm" onClick={() => setScheduleOpen(true)} disabled={Boolean(publishReason)} title={publishReason || undefined}>
                  <Calendar className="h-4 w-4" weight="duotone" /> Schedule
                </Button>
                <Button size="sm" onClick={() => setPublishOpen(true)} disabled={Boolean(publishReason)} title={publishReason || undefined}>
                  Publish now
                </Button>
              </>
            )}
            {exp.scheduledAt && can('publish') && (
              <Button variant="outline" size="sm" onClick={() => { actions.cancelSchedule(exp.id); toast.success('Publish schedule cancelled.') }}>
                Cancel schedule
              </Button>
            )}
            {exp.status === 'published' && exp.draftRevision <= exp.liveRevision && can('edit') && (
              <Button variant="outline" size="sm" onClick={() => { actions.newRevision(exp.id); toast.success(`Draft v${exp.liveRevision + 1} created. Live v${exp.liveRevision} stays public.`) }}>
                Edit new revision
              </Button>
            )}
            {(exp.draftStatus === 'in_review' || exp.draftStatus === 'approved') && can('edit') && (
              <Button variant="outline" size="sm" onClick={() => setReturnOpen(true)}>Return to draft</Button>
            )}
            {exp.status === 'published' && can('unpublish') && (
              <Button variant="outline" size="sm" onClick={() => setUnpublishOpen(true)} disabled={serverBlocked}>Unpublish</Button>
            )}
            {can('archive') && exp.status !== 'archived' && (
              <Button variant="outline" size="sm" className="text-destructive dark:text-red-300" onClick={() => setArchiveOpen(true)}>Archive</Button>
            )}
            {can('revoke') && exp.status !== 'revoked' && (
              <Button variant="outline" size="sm" className="text-destructive dark:text-red-300" onClick={() => setRevokeOpen(true)}>Revoke</Button>
            )}
          </>
        }
        back={{ to: '/then-now/experiences', label: 'All experiences' }}
      />

      {!can('edit') && (
        <div className="mb-4">
          <Callout tone="neutral" title="Read-only.">You can inspect this experience but not edit, submit, review, or publish it.</Callout>
        </div>
      )}

      {feedbackNote && exp.lastDecision && !frozen && (
        <div className="mb-4">
          <Callout
            tone={exp.lastDecision === 'rejected' ? 'red' : 'gold'}
            title={`${feedbackLabel} ${feedbackNote.author}${feedbackNote.author.endsWith('.') ? '' : '.'}`}
            action={<Button variant="ghost" size="sm" onClick={() => setAuditOpen(true)}>View audit</Button>}
          >
            <p>{feedbackNote.note}</p>
            {exp.lastDecision === 'rejected' && (
              <p className="mt-1 text-xs font-semibold">{needsChange ? 'Edit the content to enable resubmission.' : 'Content changed. You can resubmit for review.'}</p>
            )}
          </Callout>
        </div>
      )}

      {frozen && (
        <div className="mb-4">
          <Callout tone={exp.draftStatus === 'approved' ? 'green' : 'gold'} title={exp.draftStatus === 'approved' ? 'Approved and frozen until publish.' : 'Frozen for review.'}>
            {exp.draftStatus === 'approved'
              ? 'Publishing is a separate step. Return to draft to make changes.'
              : 'Reviewers see this snapshot and a diff against live. Return to draft to make changes.'}
          </Callout>
        </div>
      )}

      {exp.liveRevision > 0 && exp.draftRevision > exp.liveRevision && (
        <div className="mb-4">
          <Callout
            tone="gold"
            title={`Editing draft v${exp.draftRevision}.`}
            action={<Button variant="ghost" size="sm" onClick={() => setRevisionsOpen(true)}>View revision history</Button>}
          >
            Live v{exp.liveRevision} stays public until this revision is published.
          </Callout>
        </div>
      )}

      {exp.scheduledAt && (
        <div className="mb-4">
          <Callout tone="gold" title={`Scheduled for ${formatEat(exp.scheduledAt)} (EAT).`}>
            The live version stays public until the scheduler publishes this revision. Rights expiry is checked again at publish time.
          </Callout>
        </div>
      )}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px] xl:items-start">
        <div className="min-w-0">
          <div className="overflow-hidden rounded-lg border border-border bg-card shadow-sm">
            <div className="flex gap-1 overflow-x-auto border-b border-border px-4 pt-2" role="tablist" aria-label="Experience editor sections">
              {TABS.map((entry) => (
                <button
                  key={entry.key}
                  type="button"
                  role="tab"
                  aria-selected={tab === entry.key}
                  onClick={() => setTab(entry.key)}
                  onKeyDown={(event) => {
                    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return
                    event.preventDefault()
                    const index = TABS.findIndex((item) => item.key === entry.key)
                    const next = event.key === 'Home' ? 0 : event.key === 'End' ? TABS.length - 1 : (index + (event.key === 'ArrowRight' ? 1 : -1) + TABS.length) % TABS.length
                    setTab(TABS[next].key)
                  }}
                  className={`inline-flex min-h-9 items-center gap-1.5 whitespace-nowrap border-b-2 px-3 text-sm font-semibold ${
                    tab === entry.key ? 'border-[var(--amber)] text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {entry.label}
                  {entry.key === 'cards' && <span className="rounded-full bg-muted px-1.5 text-[10px] font-bold text-muted-foreground">{form.textCards.length}</span>}
                </button>
              ))}
            </div>

            <div className="p-5 sm:p-6" role="tabpanel">
              {tab === 'story' && (
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="sm:col-span-2">
                    <FormInput label="Title" value={form.title} onChange={(value) => setField('title', value)} disabled={!canEditContent} />
                  </div>
                  <div className="sm:col-span-2">
                    <FormInput label="Promise" value={form.promise} onChange={(value) => setField('promise', value)} disabled={!canEditContent} description="One line. What will the visitor see?" />
                  </div>
                  <div className="sm:col-span-2">
                    <FormTextarea label="Story" value={form.story} onChange={(value) => setField('story', value)} disabled={!canEditContent} />
                  </div>
                  <FormInput label="Historical period" value={form.period} onChange={(value) => setField('period', value)} disabled={!canEditContent} />
                  <FormInput label="Duration (seconds)" value={String(form.duration)} onChange={(value) => setField('duration', Number(value) || 0)} disabled={!canEditContent} description="Short: 60–110 seconds in v1." />
                  <div className="sm:col-span-2">
                    <FormTextarea label="Content notes" value={form.contentNotes} onChange={(value) => setField('contentNotes', value)} disabled={!canEditContent} />
                  </div>
                  <div className="sm:col-span-2">
                    <FormTextarea label="Safety notes" value={form.safetyNotes} onChange={(value) => setField('safetyNotes', value)} disabled={!canEditContent} />
                  </div>
                  <div className="sm:col-span-2">
                    <FormTextarea label="Sources" value={form.sources} onChange={(value) => setField('sources', value)} disabled={!canEditContent} />
                  </div>
                  <FormInput label="Fact-check sign-off" value={form.factCheck} onChange={(value) => setField('factCheck', value)} disabled={!canEditContent} />
                  <div className="sm:col-span-2">
                    <Callout tone="gold" title="Current scene only.">
                      The site video shows the place as it is today. Text cards add short context from the client description; they are not a historical reconstruction.
                    </Callout>
                  </div>
                </div>
              )}

              {tab === 'media' && (
                <div className="space-y-5">
                  <div className="grid gap-4 sm:grid-cols-[190px_minmax(0,1fr)] sm:items-center">
                    <button type="button" onClick={() => setPreviewOpen(true)} className="relative aspect-video overflow-hidden rounded-lg bg-[#07140a]" aria-label={`Open preview for ${exp.title}`}>
                      {site?.image ? <img src={site.image} alt="" className="h-full w-full object-cover opacity-90" /> : <div className="h-full w-full bg-gradient-to-br from-[#154212] to-[#07140a]" />}
                      <span className="absolute inset-0 flex items-center justify-center">
                        <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--amber)] text-primary shadow-lg"><Play className="h-5 w-5" weight="fill" /></span>
                      </span>
                    </button>
                    <div className="space-y-1 text-sm">
                      <p className="font-semibold text-foreground">{form.videoMaster || 'No video master yet'}</p>
                      <p className="text-xs text-muted-foreground">{form.videoSize || 'Upload the pre-compressed 4K current-scene master.'}</p>
                      <p className="text-xs text-muted-foreground">H.264 MP4 · 16:9 · stereo · {form.duration}s</p>
                      <div className="flex flex-wrap gap-2 pt-1">
                        {canEditContent && (
                          <Button variant="outline" size="sm" onClick={() => setUploadOpen(true)}>
                            <Upload className="h-4 w-4" weight="duotone" /> {form.videoMaster ? 'Replace video' : 'Upload video'}
                          </Button>
                        )}
                        <Button variant="ghost" size="sm" onClick={() => setPreviewOpen(true)}>Preview</Button>
                      </div>
                    </div>
                  </div>

                  <div>
                    <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                      <p className="font-semibold text-foreground">Video files</p>
                      <span className="text-xs text-muted-foreground">Pre-compressed for the app and offline pack</span>
                    </div>
                    <div className="overflow-hidden rounded-lg border border-border">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b bg-[var(--surface-2)] text-left text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
                            <th className="px-3 py-2">Video file</th>
                            <th className="px-3 py-2">Status</th>
                            <th className="px-3 py-2">Size</th>
                            <th className="px-3 py-2 text-right">Action</th>
                          </tr>
                        </thead>
                        <tbody>
                          {[
                            ['1080', '1080p', 'H.264 · 8 Mbps', '210 MB'],
                            ['720', '720p', 'H.264 · 5 Mbps', '120 MB'],
                            ['540', '540p', 'H.264 · 3 Mbps', '64 MB'],
                          ].map(([key, label, format, size]) => {
                            const status = form.renditions[key] ?? 'Missing'
                            return (
                              <tr key={key} className="border-b last:border-0">
                                <td className="px-3 py-2"><span className="font-semibold text-foreground">{label}</span><span className="block text-[11px] text-muted-foreground">{format}</span></td>
                                <td className="px-3 py-2"><StatusPill status={status === 'Ready' ? 'ready' : 'missing'} label={status} /></td>
                                <td className="px-3 py-2 text-xs text-muted-foreground">{status === 'Ready' ? size : '—'}</td>
                                <td className="px-3 py-2 text-right">
                                  {status === 'Ready' ? (
                                    <Button variant="ghost" size="sm" onClick={() => setPreviewOpen(true)}>Preview</Button>
                                  ) : (
                                    <Button variant="ghost" size="sm" onClick={() => setUploadOpen(true)} disabled={!canEditContent}>Upload</Button>
                                  )}
                                </td>
                              </tr>
                            )
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="rounded-lg border border-border bg-[var(--surface-2)] p-3">
                      <p className="text-sm font-semibold text-foreground">Poster &amp; preview</p>
                      <div className="mt-2 flex items-center gap-3">
                        {site?.image ? <img src={site.image} alt="" className="h-14 w-24 rounded object-cover" /> : <div className="h-14 w-24 rounded bg-muted" />}
                        <div className="text-xs text-muted-foreground">
                          <p className="font-semibold text-foreground">{form.poster ? 'Poster ready' : 'Poster missing'}</p>
                          <p>16:9 · 1920×1080</p>
                          {canEditContent && <Button variant="ghost" size="sm" className="mt-1 px-0" onClick={() => { setField('poster', true); toast.success('Poster marked ready in this fixture.') }}>Replace poster</Button>}
                        </div>
                      </div>
                    </div>
                    <div className="rounded-lg border border-border bg-[var(--surface-2)] p-3">
                      <p className="text-sm font-semibold text-foreground">Media checks</p>
                      <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
                        <li><CheckCircle className="mr-1 inline h-3.5 w-3.5 text-[var(--success-leaf)]" weight="fill" /> Magic bytes match MP4</li>
                        <li><CheckCircle className="mr-1 inline h-3.5 w-3.5 text-[var(--success-leaf)]" weight="fill" /> Dimensions 3840×2160</li>
                        <li><CheckCircle className="mr-1 inline h-3.5 w-3.5 text-[var(--success-leaf)]" weight="fill" /> Checksum verified</li>
                        <li><CheckCircle className="mr-1 inline h-3.5 w-3.5 text-[var(--success-leaf)]" weight="fill" /> Rights expiry current</li>
                      </ul>
                    </div>
                  </div>

                  <Callout tone="neutral" title="Replacing media on a published experience creates a new revision.">
                    The live version stays public while the replacement is reviewed and promoted. Upload states are simulated until the R2 pipeline lands.
                  </Callout>
                </div>
              )}

              {tab === 'cards' && (
                <div className="space-y-4">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <p className="font-semibold text-foreground">Text cards</p>
                      <p className="text-xs text-muted-foreground">Short context from the client description. Two or three cards; readable over the site video; no historical reconstruction.</p>
                    </div>
                    <Badge variant="outline" className="rounded-full border-border bg-muted text-muted-foreground">{form.textCards.length} of 3</Badge>
                  </div>
                  <div className="space-y-2">
                    {form.textCards.map((card, index) => (
                      <div key={index} className="grid gap-2 rounded-lg border border-border bg-[var(--surface-2)] p-3 sm:grid-cols-[90px_minmax(0,1fr)_36px]">
                        <div className="flex items-center gap-1">
                          <span className="font-sans text-lg font-bold text-[var(--amber-deep)]">{String(index + 1).padStart(2, '0')}</span>
                          <input aria-label={`Card ${index + 1} time in seconds`} type="number" min={0} value={card.at} disabled={!canEditContent} onChange={(event) => setCards(form.textCards.map((entry, cardIndex) => cardIndex === index ? { ...entry, at: Number(event.target.value) || 0 } : entry))} className="h-8 w-16 rounded border border-border bg-card px-2 text-center text-xs disabled:opacity-50" />
                          <span className="text-[10px] text-muted-foreground">s</span>
                        </div>
                        <textarea aria-label={`Card ${index + 1} text`} value={card.text} disabled={!canEditContent} onChange={(event) => setCards(form.textCards.map((entry, cardIndex) => cardIndex === index ? { ...entry, text: event.target.value } : entry))} rows={2} className="rounded border border-border bg-card px-2 py-1.5 text-sm disabled:opacity-50" />
                        <button
                          type="button"
                          aria-label={`Remove card ${index + 1}`}
                          disabled={!canEditContent}
                          onClick={() => {
                            const removed = card
                            setCards(form.textCards.filter((_, cardIndex) => cardIndex !== index))
                            toast.success('Card removed.', {
                              action: {
                                label: 'Undo',
                                onClick: () => setCards([...form.textCards.slice(0, index), removed, ...form.textCards.slice(index)]),
                              },
                            })
                          }}
                          className="flex h-8 w-8 items-center justify-center rounded border border-border bg-card text-muted-foreground hover:text-foreground disabled:opacity-50"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                  {canEditContent && form.textCards.length < 3 && (
                    <Button variant="outline" size="sm" onClick={() => setCards([...form.textCards, { at: 40, text: '' }])}>
                      <Plus className="h-4 w-4" weight="bold" /> Add a card
                    </Button>
                  )}
                  {form.textCards.length >= 3 && <p className="text-xs text-muted-foreground">Three cards is the v1 maximum. Remove one to add another.</p>}
                  <Callout tone="neutral" title="Not a narrated Story cut.">
                    These are short text cards from the site description. Audio Stories owns narration; Then &amp; Now does not.
                  </Callout>
                </div>
              )}

              {tab === 'accessibility' && (
                <div className="space-y-5">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <p className="font-semibold text-foreground">Accessibility</p>
                      <p className="text-xs text-muted-foreground">Captions, transcript, and audio description. Publication requires English captions and a transcript; warnings do not block.</p>
                    </div>
                    <Badge variant="outline" className={`rounded-full ${form.captions.en && form.transcript ? 'border-[var(--success-leaf)] bg-[var(--leaf-bg)] text-[var(--success-leaf)]' : 'border-destructive bg-destructive/10 text-destructive dark:text-red-300'}`}>
                      {form.captions.en && form.transcript ? 'Required files ready' : 'Required files missing'}
                    </Badge>
                  </div>
                  <div className="overflow-hidden rounded-lg border border-border">
                    <AssetRow label="English captions · WebVTT" note="Required · synced to the site video" ready={form.captions.en} disabled={!canEditContent} onAdd={() => { setField('captions', { ...form.captions, en: true }); toast.success('English captions marked ready in this fixture.') }} />
                    <AssetRow label="Swahili captions · WebVTT" note="Warning in v1 · Swahili copy is provisional, review before release" ready={form.captions.sw} disabled={!canEditContent} onAdd={() => { setField('captions', { ...form.captions, sw: true }); toast.success('Swahili captions marked ready in this fixture.') }} />
                    <AssetRow label="Transcript · plain text" note="Required · full text for screen readers and search" ready={form.transcript} disabled={!canEditContent} onAdd={() => { setField('transcript', true); toast.success('Transcript marked ready in this fixture.') }} />
                    <AssetRow label="Audio description" note="Optional warning · describe visual context" ready={form.audioDescription} disabled={!canEditContent} onAdd={() => { setField('audioDescription', true); toast.success('Audio description marked ready in this fixture.') }} />
                  </div>
                  <div className="overflow-hidden rounded-lg border border-border">
                    <div className="flex items-center justify-between border-b border-border bg-[var(--surface-2)] px-4 py-2.5">
                      <p className="text-sm font-semibold text-foreground">Caption preview</p>
                      <Button variant="outline" size="sm" onClick={() => setCaptionsOn((value) => !value)}>{captionsOn ? 'Captions on' : 'Captions off'}</Button>
                    </div>
                    <div className="relative aspect-video bg-[#07140a]">
                      {site?.image ? <img src={site.image} alt="" className="h-full w-full object-cover opacity-80" /> : <div className="h-full w-full bg-gradient-to-br from-[#154212] to-[#07140a]" />}
                      {captionsOn && (
                        <div className="absolute inset-x-3 bottom-3 rounded border border-white/20 bg-black/85 px-2.5 py-2 text-xs text-white">
                          {form.textCards[0]?.text || 'Add a text card to preview captions over the site video.'}
                        </div>
                      )}
                    </div>
                  </div>
                  <Callout tone="gold" title="Swahili is provisional for v1.">
                    The copy review was waived; keep the Swahili captions and transcript on the release checklist. They are a warning, not a publish blocker in this fixture.
                  </Callout>
                </div>
              )}

              {tab === 'rights' && (
                <div className="space-y-5">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="rounded-lg border border-border bg-[var(--surface-2)] p-4">
                      <p className="font-semibold text-foreground">Rights record</p>
                      <div className="mt-3 space-y-3">
                        <FormInput label="Rights holder / basis" value={form.rights} onChange={(value) => setField('rights', value)} disabled={!canManageRights} />
                        <FormInput label="Evidence" value={form.rightsEvidence} onChange={(value) => setField('rightsEvidence', value)} disabled={!canManageRights} />
                        <FormInput label="Rights expiry" type="date" value={form.rightsExpiry} onChange={(value) => setField('rightsExpiry', value)} disabled={!canManageRights} />
                      </div>
                      {!canManageRights && <p className="mt-2 text-[11px] text-muted-foreground">Administrators manage rights evidence. Content editors can view it.</p>}
                    </div>
                    <div className="rounded-lg border border-border bg-[var(--surface-2)] p-4">
                      <p className="font-semibold text-foreground">Cultural authority</p>
                      <div className="mt-3 space-y-3">
                        <p className="text-sm"><span className="text-muted-foreground">Authority:</span> {site?.culturalAuthority || 'Not set'}</p>
                        <FormInput label="Consent" value={form.consent} onChange={(value) => setField('consent', value)} disabled={!canManageRights} />
                        <FormSelect label="Review tier" value={form.sensitivity} options={Object.entries(SENSITIVITY_LABEL).map(([value, label]) => ({ value, label }))} onChange={(value) => setField('sensitivity', value as Sensitivity)} disabled={!canManageRights} />
                        <p className="text-sm"><span className="text-muted-foreground">Reviewer:</span> {form.reviewer}</p>
                        <p className="text-sm"><span className="text-muted-foreground">Second reviewer:</span> {form.secondReviewer ? `${form.secondReviewer.name} · ${form.secondReviewer.org}` : form.sensitivity === 'standard' ? 'Not required' : 'Required for approval'}</p>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-lg border border-border p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <p className="font-semibold text-foreground">Client approval</p>
                        <p className="text-xs text-muted-foreground">Recorded by an administrator; no client account.</p>
                      </div>
                      {form.clientApproval ? <StatusPill status="approved" label="Recorded" /> : <StatusPill status="in_review" label="Not recorded" />}
                    </div>
                    {form.clientApproval ? (
                      <p className="mt-2 text-sm text-muted-foreground">{form.clientApproval.name} · {form.clientApproval.role} · {formatDateEat(form.clientApproval.at)}</p>
                    ) : (
                      <p className="mt-2 text-sm text-muted-foreground">The client approver does not get an admin account. An administrator records their decision with a name and date.</p>
                    )}
                    {can('manage_rights') && (
                      <Button variant="outline" size="sm" className="mt-2" onClick={() => setClientOpen(true)}>
                        <Plus className="h-4 w-4" weight="bold" /> Record client approval
                      </Button>
                    )}
                  </div>

                  {form.sensitivity !== 'standard' ? (
                    <Callout tone="gold" title={`${SENSITIVITY_LABEL[form.sensitivity]} review.`}>
                      Two reviewers are required: an administrator and an external cultural reviewer or client approver. One request-changes or reject blocks the revision. Restricted content cannot be approved until a super-admin records resolution.
                    </Callout>
                  ) : (
                    <Callout tone="neutral" title="Standard review.">
                      Reviewer ≠ uploader. An approved revision does not auto-publish; an administrator schedules or publishes it.
                    </Callout>
                  )}
                  {form.sensitivity !== 'standard' && can('review') && (
                    <Button variant="outline" size="sm" onClick={() => setExternalOpen(true)}>
                      <Plus className="h-4 w-4" weight="bold" /> Record external reviewer
                    </Button>
                  )}
                </div>
              )}

              {tab === 'preview' && (
                <div className="space-y-4">
                  <div className="rounded-xl bg-[#07140a] p-4">
                    <div className="relative mx-auto max-w-2xl overflow-hidden rounded-lg border-2 border-[var(--amber)]">
                      {site?.image ? <img src={site.image} alt="" className="aspect-video w-full object-cover opacity-90" /> : <div className="aspect-video w-full bg-gradient-to-br from-[#154212] to-[#07140a]" />}
                      <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                        <span className="-rotate-12 rounded border border-[var(--amber)]/50 bg-black/30 px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.18em] text-[var(--amber)]">Admin preview · not public</span>
                      </div>
                      {form.textCards[0]?.text && (
                        <div className="absolute inset-x-3 bottom-3 flex items-start gap-2 rounded border border-white/20 bg-black/80 p-2 text-xs text-white">
                          <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[var(--amber)] text-[9px] font-bold text-primary">01</span>
                          {form.textCards[0].text}
                        </div>
                      )}
                    </div>
                    <div className="mx-auto mt-2 flex max-w-2xl items-center justify-between gap-3 text-xs text-white/70">
                      <span>{form.title}</span>
                      <span>{form.duration}s · {ACCESS_LABEL[form.mode]}</span>
                    </div>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="rounded-lg border border-border bg-[var(--surface-2)] p-4">
                      <p className="font-semibold text-foreground">Device preview</p>
                      <div className="mt-2 flex items-center gap-3">
                        <div aria-label="QR placeholder" className="h-24 w-24 rounded border-4 border-card bg-[repeating-linear-gradient(90deg,var(--foreground)_0_4px,var(--card)_4px_8px),repeating-linear-gradient(0deg,var(--foreground)_0_4px,var(--card)_4px_8px)] bg-blend-multiply shadow-sm" />
                        <p className="text-xs text-muted-foreground">Signed admin deep link. Field calibration is separate. No browser camera simulator.</p>
                      </div>
                    </div>
                    <div className="rounded-lg border border-border bg-[var(--surface-2)] p-4">
                      <p className="font-semibold text-foreground">Preview checks</p>
                      <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
                        <li><CheckCircle className="mr-1 inline h-3.5 w-3.5 text-[var(--success-leaf)]" weight="fill" /> Watermark visible</li>
                        <li><CheckCircle className="mr-1 inline h-3.5 w-3.5 text-[var(--success-leaf)]" weight="fill" /> Current-scene video, no historical overlay</li>
                        <li><CheckCircle className="mr-1 inline h-3.5 w-3.5 text-[var(--success-leaf)]" weight="fill" /> Text cards readable over the video</li>
                        <li><CheckCircle className="mr-1 inline h-3.5 w-3.5 text-[var(--success-leaf)]" weight="fill" /> Captions and transcript available</li>
                        <li><CheckCircle className="mr-1 inline h-3.5 w-3.5 text-[var(--success-leaf)]" weight="fill" /> No public URL is generated</li>
                      </ul>
                      <Button size="sm" className="mt-3" onClick={() => setPreviewOpen(true)}>Open full preview</Button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        <ReadinessRail
          kicker={exp.draftStatus === 'draft' ? 'Review readiness' : 'Publish readiness'}
          stage={stage}
          ready={exp.draftStatus === 'approved' || (!frozen && !readiness.blockers.length)}
          sub={`${exp.liveRevision ? `Live v${exp.liveRevision} · ` : ''}Draft v${exp.draftRevision} · ${readiness.warnings.length} warning${readiness.warnings.length === 1 ? '' : 's'}`}
          blockers={authoringBlockers}
          warnings={readiness.warnings}
          beforePublish={reviewBlockers}
          onSelect={(section) => {
            const map: Record<string, ExpTab> = { story: 'story', media: 'media', cards: 'cards', accessibility: 'accessibility', rights: 'rights', review: 'rights' }
            setTab(map[section] ?? 'story')
          }}
          footer={
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground">
                {!can('edit')
                  ? 'Read-only. You cannot edit, submit, review, or publish.'
                  : exp.draftStatus === 'in_review'
                    ? 'Frozen. The review decision is pending.'
                    : exp.scheduledAt
                      ? 'Scheduled. The live revision stays public until the scheduler publishes this one.'
                      : exp.draftStatus === 'approved'
                        ? 'Approved. Use Publish now or Schedule in the header. Publishing is a separate step.'
                        : noOpenRevision
                          ? 'The live revision is public. Start a new revision to make changes.'
                          : exp.status === 'unpublished'
                            ? 'Unpublished. Republish when rights and review are current.'
                            : exp.lastDecision === 'rejected'
                              ? 'Rejected. Make a material change, then resubmit for review.'
                              : exp.lastDecision === 'changes'
                                ? 'Changes requested. Address the reviewer’s note, then resubmit for review.'
                                : exp.lastDecision === 'returned'
                                  ? 'Returned to draft. Revise, then resubmit for review.'
                                  : authoringBlockers.length
                                    ? 'Resolve the blocking checks before submitting.'
                                    : 'Ready to submit. Use Submit for review in the header.'}
              </p>
              <div className="flex flex-wrap gap-1">
                <Button variant="ghost" size="sm" onClick={() => toast.success('Readiness refreshed from the fixture contract.')}>Refresh readiness</Button>
                <Button variant="ghost" size="sm" onClick={() => setAuditOpen(true)}>
                  <ClockCounterClockwise className="h-4 w-4" weight="duotone" /> Audit
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setRevisionsOpen(true)}>
                  <ListBullets className="h-4 w-4" weight="duotone" /> Revisions
                </Button>
              </div>
            </div>
          }
        />
      </div>

      <PreviewDialog
        open={previewOpen}
        onOpenChange={setPreviewOpen}
        image={site?.image}
        title={form.title}
        subtitle={`${form.duration}s · ${ACCESS_LABEL[form.mode]} · ${form.languages.join(' / ')}`}
        cardText={form.textCards[0]?.text || form.promise}
        meta={<span>{site?.publicRights || 'Public rights line not recorded.'} · Swahili copy provisional.</span>}
      />

      <AuditDialog
        open={auditOpen}
        onOpenChange={setAuditOpen}
        title={form.title}
        events={siteEvents.map((event) => ({ id: event.id, title: event.title, meta: event.meta, note: event.note }))}
      />

      <RevisionsDialog open={revisionsOpen} onOpenChange={setRevisionsOpen} exp={exp} onPreview={() => setPreviewOpen(true)} />

      <VideoUploadDialog
        open={uploadOpen}
        onOpenChange={setUploadOpen}
        onComplete={(file) => {
          setForm((prev) => prev ? {
            ...prev,
            videoMaster: file.name,
            videoSize: `${(file.size / 1_000_000).toFixed(1)} MB · 4K master`,
            poster: true,
            renditions: { '1080': 'Ready', '720': 'Ready', '540': 'Ready' },
          } : prev)
          setDirty(true)
          toast.success('Video attached. Save the draft to apply it.')
        }}
      />

      <ActionDialog
        open={submitOpen}
        onOpenChange={setSubmitOpen}
        title={`Submit v${exp.draftRevision} for review?`}
        description="The revision will be frozen and appear in the review queue."
        confirmLabel="Submit for review"
        onConfirm={confirmSubmit}
      >
        <Callout tone="neutral" title="The live version stays public.">
          Reviewers see this snapshot and a diff against live v{exp.liveRevision}. An approval does not auto-publish. 
        </Callout>
      </ActionDialog>

      <ActionDialog
        open={publishOpen}
        onOpenChange={setPublishOpen}
        title={`Publish v${exp.draftRevision} now?`}
        description="The revision is approved; publishing is a separate step."
        confirmLabel="Publish now"
        onConfirm={confirmPublish}
      >
        <Callout tone="green" title="The live revision will advance.">
          The site page and offline packs update on the next sync. No email or push is sent.
        </Callout>
      </ActionDialog>

      <ScheduleDialog
        open={scheduleOpen}
        onOpenChange={setScheduleOpen}
        onConfirm={(at, note) => {
          try {
            actions.scheduleExperience(exp.id, at, note)
            setScheduleOpen(false)
            toast.success(`Scheduled for ${formatEat(at)}.`)
          } catch (error) {
            toast.error(error instanceof Error ? error.message : 'Could not schedule the revision.')
          }
        }}
      />

      <ReasonDialog
        open={returnOpen}
        onOpenChange={setReturnOpen}
        title="Return to draft?"
        description="This withdraws the revision from review and unfreezes it."
        label="Reason"
        confirmLabel="Return to draft"
        variant="destructive"
        onConfirm={(reason) => {
          try {
            actions.returnToDraft(exp.id, reason)
            setReturnOpen(false)
            toast.success('Returned to draft. The live revision is unchanged.')
          } catch (error) {
            toast.error(error instanceof Error ? error.message : 'Could not return to draft.')
          }
        }}
      />

      <ReasonDialog
        open={unpublishOpen}
        onOpenChange={setUnpublishOpen}
        title="Unpublish experience?"
        description="The record stays; the public surface is hidden."
        label="Reason"
        confirmLabel="Unpublish"
        onConfirm={(reason) => {
          actions.unpublishExperience(exp.id)
          setUnpublishOpen(false)
          toast.success(`Experience unpublished. ${reason ? 'Reason recorded.' : ''}`)
        }}
      />

      <ReasonDialog
        open={archiveOpen}
        onOpenChange={setArchiveOpen}
        title="Archive experience?"
        description="Super-admin only. This is not a hard delete."
        label="Reason"
        confirmLabel="Archive"
        variant="destructive"
        onConfirm={(reason) => {
          actions.archiveExperience(exp.id)
          setArchiveOpen(false)
          toast.success(`Experience archived. ${reason ? 'Reason recorded.' : ''}`)
        }}
      />

      <ReasonDialog
        open={revokeOpen}
        onOpenChange={setRevokeOpen}
        title="Revoke experience?"
        description="Tombstone the experience and cancel its open revisions."
        label="Reason and evidence"
        confirmLabel="Revoke"
        variant="destructive"
        onConfirm={(reason) => {
          actions.revokeExperience(exp.id)
          setRevokeOpen(false)
          toast.success(`Experience revoked. ${reason ? 'Reason recorded.' : ''}`)
        }}
      />

      <ClientApprovalDialog
        open={clientOpen}
        onOpenChange={setClientOpen}
        onConfirm={(approval) => {
          actions.recordClientApproval(exp.id, approval)
          setClientOpen(false)
          toast.success('Client approval recorded.')
        }}
      />

      <ExternalReviewerDialog
        open={externalOpen}
        onOpenChange={setExternalOpen}
        onConfirm={(reviewer) => {
          actions.recordExternalReviewer(exp.id, reviewer)
          setExternalOpen(false)
          toast.success(reviewer.decision === 'approved' ? 'External reviewer recorded as approved.' : 'External reviewer requested changes.')
        }}
      />

      <ActionDialog
        open={conflictOpen}
        onOpenChange={setConflictOpen}
        title="409 · Version conflict"
        description="Your draft is based on v4; the server has v5."
        confirmLabel="Reload latest"
        onConfirm={() => {
          setScenario('default')
          setForm(exp)
          setDirty(false)
          setConflictOpen(false)
          toast.success('Reloaded the server revision v5. Your local edits were discarded.')
        }}
      >
        <Callout tone="red" title="Daniel M. saved a newer revision at 10:14.">
          Reload the latest version or keep editing and resolve manually. This fixture does not merge. Use “Cancel” to keep editing.
        </Callout>
      </ActionDialog>

      <DirtyGuard dirty={dirty && canEditContent} />
    </div>
  )
}

function AssetRow({
  label,
  note,
  ready,
  disabled,
  onAdd,
}: {
  label: string
  note: string
  ready: boolean
  disabled: boolean
  onAdd: () => void
}) {
  return (
    <div className="flex flex-wrap items-center gap-3 border-b border-border px-4 py-3 last:border-0">
      <StatusPill status={ready ? 'ready' : 'missing'} label={ready ? 'Ready' : 'Missing'} />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-foreground">{label}</p>
        <p className="text-[11px] text-muted-foreground">{note}</p>
      </div>
      {!disabled && (
        <Button variant="ghost" size="sm" onClick={onAdd}>{ready ? 'Replace' : 'Add'}</Button>
      )}
    </div>
  )
}
