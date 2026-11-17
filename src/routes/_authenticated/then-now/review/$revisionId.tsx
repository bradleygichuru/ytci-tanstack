import { useState } from 'react'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { toast } from 'sonner'
import {
  ArrowCounterClockwise,
  CheckCircle,
  ClockCounterClockwise,
  Eye,
  Lock,
  Shield,
  User,
  Warning,
} from '@phosphor-icons/react'
import { Button } from '#/components/ui/button'
import { useThenNow } from '#/lib/then-now/store'
import { formatEat } from '#/lib/then-now/format'
import {
  ACCESS_LABEL,
  SENSITIVITY_LABEL,
} from '#/lib/then-now/types'
import {
  AuditDialog,
  Callout,
  EmptyState,
  PageHeader,
  PreviewDialog,
  StatusPill,
} from '#/components/then-now/shared'
import {
  ActionDialog,
  ClientApprovalDialog,
  ExternalReviewerDialog,
  ReasonDialog,
  ScheduleDialog,
} from '#/components/then-now/dialogs'

export const Route = createFileRoute('/_authenticated/then-now/review/$revisionId')({
  component: ReviewDetailPage,
})

function ReviewDetailPage() {
  const { revisionId } = Route.useParams()
  const navigate = useNavigate()
  const { state, scenario, actor, can, actions } = useThenNow()
  const exp = state.experiences[revisionId]
  const site = exp ? state.sites.find((entry) => entry.id === exp.siteId) : undefined
  const [notes, setNotes] = useState('')
  const [previewOpen, setPreviewOpen] = useState(false)
  const [auditOpen, setAuditOpen] = useState(false)
  const [rejectOpen, setRejectOpen] = useState(false)
  const [returnOpen, setReturnOpen] = useState(false)
  const [externalOpen, setExternalOpen] = useState(false)
  const [clientOpen, setClientOpen] = useState(false)
  const [publishOpen, setPublishOpen] = useState(false)
  const [scheduleOpen, setScheduleOpen] = useState(false)

  if (!can('review')) {
    return (
      <div>
        <PageHeader kicker="Then & Now · Review" title="Review queue" back={{ to: '/then-now/review', label: 'Review queue' }} />
        <EmptyState
          title="Only administrators review revisions"
          body="You can draft, save, and submit experiences. An administrator records the review decision."
          action={<Button variant="outline" asChild><a href="/then-now/experiences">Back to experiences</a></Button>}
        />
      </div>
    )
  }

  if (!exp || (exp.draftStatus !== 'in_review' && exp.draftStatus !== 'approved')) {
    return (
      <div>
        <PageHeader kicker="Then & Now · Review" title="Revision not in review" back={{ to: '/then-now/review', label: 'Review queue' }} />
        <EmptyState
          title="Nothing to review here"
          body="The revision may have been approved, returned to draft, or published. Open the queue to see the current submitted revisions."
          action={<Button variant="outline" asChild><a href="/then-now/review">Back to queue</a></Button>}
        />
      </div>
    )
  }

  const assigned = exp.reviewer !== 'Unassigned'
  const assignedToMe = exp.reviewer === actor
  const selfReview = exp.uploadedBy === actor
  const sensitive = exp.sensitivity !== 'standard'
  const secondOk = !sensitive || exp.secondReviewerApproved
  const approved = exp.draftStatus === 'approved'
  const serverBlocked = scenario === 'offline' || scenario === 'conflict' || scenario === 'readonly'
  const decisionDisabled = !assigned || selfReview || serverBlocked
  const approveDisabled = decisionDisabled || !secondOk || exp.sensitivity === 'restricted'
  const events = state.audit.filter((event) => event.entity === exp.id || (site && event.entity === site.id))

  const approve = () => {
    try {
      actions.approveRevision(exp.id, notes)
      toast.success('Approved. Publishing is a separate step.')
      setNotes('')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not approve the revision.')
    }
  }

  const requestChanges = () => {
    if (!notes.trim()) {
      toast.error('Add a note explaining the decision.')
      return
    }
    try {
      actions.requestChanges(exp.id, notes)
      toast.success('Changes requested. The editor can revise and resubmit.', { duration: 5000 })
      navigate({ to: '/then-now/experiences/$experienceId', params: { experienceId: exp.id } })
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not request changes.')
    }
  }

  const reject = () => {
    if (!notes.trim()) {
      toast.error('Add a note explaining the decision.')
      return
    }
    setRejectOpen(true)
  }

  const confirmReject = () => {
    try {
      actions.rejectRevision(exp.id, notes)
      setRejectOpen(false)
      toast.success('Revision rejected. The editor must materially revise.', { duration: 5000 })
      navigate({ to: '/then-now/experiences/$experienceId', params: { experienceId: exp.id } })
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not reject the revision.')
    }
  }

  const publish = () => {
    try {
      actions.publishExperience(exp.id)
      setPublishOpen(false)
      toast.success(`Published v${exp.draftRevision}. The live site is updated.`)
      navigate({ to: '/then-now/experiences/$experienceId', params: { experienceId: exp.id } })
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not publish the revision.')
    }
  }

  return (
    <div>
      <PageHeader
        kicker={`Review · revision v${exp.draftRevision}`}
        title={exp.title}
        sub={
          <span className="flex flex-wrap items-center gap-2">
            <StatusPill status={approved ? 'approved' : 'in_review'} />
            <span>Submitted by {exp.submittedBy} · {formatEat(exp.submittedAt)}</span>
            {exp.uploadedBy !== exp.submittedBy && <span>· Uploaded by {exp.uploadedBy}</span>}
            <span>· {site?.name ?? 'Site'}</span>
            <span>· {SENSITIVITY_LABEL[exp.sensitivity]}</span>
          </span>
        }
        actions={
          <>
            <Button variant="outline" size="sm" onClick={() => setPreviewOpen(true)}><Eye className="h-4 w-4" weight="duotone" /> Preview</Button>
            <Button variant="outline" size="sm" onClick={() => setAuditOpen(true)}><ClockCounterClockwise className="h-4 w-4" weight="duotone" /> Audit</Button>
            <Button variant="ghost" size="sm" className="decision-jump" onClick={() => document.getElementById('decision-card')?.scrollIntoView({ behavior: 'smooth', block: 'start' })}>Decision</Button>
          </>
        }
        back={{ to: '/then-now/review', label: 'Review queue' }}
      />

      {sensitive && (
        <div className="mb-4">
          <Callout tone="gold" title="Sensitive site.">
            Two reviewers are required. One may be an external cultural reviewer; the client approver is recorded, not an account. One request-changes or reject blocks the revision.
          </Callout>
        </div>
      )}

      {exp.scheduledAt && (
        <div className="mb-4">
          <Callout tone="gold" title={`Scheduled for ${formatEat(exp.scheduledAt)} (EAT).`}>
            The live version stays public until the scheduler publishes this revision.
          </Callout>
        </div>
      )}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px] xl:items-start">
        <div className="min-w-0 space-y-4">
          <div className="overflow-hidden rounded-lg border border-border bg-card">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border bg-[var(--surface-2)] px-4 py-3">
              <div>
                <p className="font-semibold text-foreground">{approved ? 'Approved' : 'Frozen'} revision v{exp.draftRevision}</p>
                <p className="text-xs text-muted-foreground">Submitted by {exp.submittedBy} · {formatEat(exp.submittedAt)} · {exp.languages.join(' / ')}</p>
              </div>
              {approved ? <StatusPill status="approved" /> : <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-2.5 py-1 text-[10px] font-bold text-muted-foreground"><Lock className="h-3 w-3" weight="bold" /> Frozen</span>}
            </div>
            <div className="grid gap-4 p-4 sm:grid-cols-2">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">Story</p>
                <p className="mt-1 font-semibold text-foreground">{exp.title}</p>
                <p className="mt-1 text-sm text-muted-foreground">{exp.promise}</p>
                <p className="mt-2 text-xs text-muted-foreground">{exp.period} · {exp.duration}s · {ACCESS_LABEL[exp.mode]}</p>
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">Media &amp; accessibility</p>
                <p className="mt-1 text-sm text-foreground">{exp.videoMaster || 'No video master'}</p>
                <p className="text-xs text-muted-foreground">1080p {exp.renditions['1080'] ?? 'Missing'} · 720p {exp.renditions['720'] ?? 'Missing'} · 540p {exp.renditions['540'] ?? 'Missing'}</p>
                <p className="text-xs text-muted-foreground">EN captions {exp.captions.en ? 'ready' : 'missing'} · transcript {exp.transcript ? 'ready' : 'missing'} · SW captions {exp.captions.sw ? 'ready' : 'missing'}</p>
              </div>
            </div>
            <div className="border-t border-border px-4 py-3">
              <Callout tone={approved ? 'green' : 'neutral'} title={approved ? 'Approved and frozen until publish.' : 'Frozen at submission.'}>
                {approved ? 'Publishing is a separate step. Return to draft to make changes.' : 'Changes are not allowed in review. “Request changes” returns it to draft; “Return to draft” withdraws it with a reason.'}
              </Callout>
            </div>
          </div>

          <div className="overflow-hidden rounded-lg border border-border bg-card">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-4 py-3">
              <div>
                <p className="font-semibold text-foreground">What the visitor will see</p>
                <p className="text-xs text-muted-foreground">The text cards and a video still from this revision</p>
              </div>
              <span className="rounded-full border border-border bg-muted px-2.5 py-1 text-[10px] font-bold text-muted-foreground">{exp.textCards.length} cards · {exp.duration}s</span>
            </div>
            <div className="grid gap-4 p-4 sm:grid-cols-[180px_minmax(0,1fr)]">
              <button type="button" onClick={() => setPreviewOpen(true)} className="relative aspect-video overflow-hidden rounded-lg bg-[#07140a]" aria-label={`Open watermarked preview for ${exp.title}`}>
                {site?.image ? <img src={site.image} alt="" className="h-full w-full object-cover opacity-90" /> : <div className="h-full w-full bg-gradient-to-br from-[#154212] to-[#07140a]" />}
                <span className="absolute inset-0 flex items-center justify-center"><span className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--amber)] text-primary"><Eye className="h-4 w-4" weight="fill" /></span></span>
              </button>
              <div className="space-y-2">
                {exp.textCards.map((card, index) => (
                  <div key={index} className="flex items-start gap-2">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[var(--amber)] text-[9px] font-bold text-primary">{String(index + 1).padStart(2, '0')}</span>
                    <div>
                      <p className="text-[10px] font-semibold text-muted-foreground">{card.at}s</p>
                      <p className="text-sm text-foreground">{card.text}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="overflow-hidden rounded-lg border border-border bg-card">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-4 py-3">
              <div>
                <p className="font-semibold text-foreground">Diff against live v{exp.liveRevision || 0}</p>
                <p className="text-xs text-muted-foreground">What changed in this revision</p>
              </div>
              <span className="rounded-full border border-border bg-muted px-2.5 py-1 text-[10px] font-bold text-muted-foreground">{exp.diff.changes.length} changed</span>
            </div>
            <div className="grid gap-px bg-border sm:grid-cols-2">
              <div className="bg-card p-4">
                <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">Live v{exp.liveRevision || 0}</p>
                {exp.diff.live.map((line, index) => (
                  <p key={index} className={`mb-1 rounded px-2 py-1 text-sm ${exp.diff.changes.includes(index) ? 'bg-destructive/10 text-destructive dark:text-red-300' : 'text-foreground'}`}>{line}</p>
                ))}
              </div>
              <div className="bg-card p-4">
                <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">Revision v{exp.draftRevision}</p>
                {exp.diff.draft.map((line, index) => (
                  <p key={index} className={`mb-1 rounded px-2 py-1 text-sm ${exp.diff.changes.includes(index) ? 'bg-[var(--leaf-bg)] text-[var(--success-leaf)]' : 'text-foreground'}`}>{line}</p>
                ))}
              </div>
            </div>
          </div>

          <div className="overflow-hidden rounded-lg border border-border bg-card">
            <div className="border-b border-border px-4 py-3">
              <p className="font-semibold text-foreground">Evidence &amp; rights</p>
              <p className="text-xs text-muted-foreground">The record behind the decision</p>
            </div>
            <div className="grid gap-4 p-4 sm:grid-cols-2">
              <div className="space-y-2 text-sm">
                <SummaryRow label="Rights" value={exp.rights || 'Not recorded'} />
                <SummaryRow label="Evidence" value={exp.rightsEvidence || 'Not recorded'} />
                <SummaryRow label="Expiry" value={exp.rightsExpiry || 'Not set'} />
                <SummaryRow label="Consent" value={exp.consent || 'Not recorded'} />
              </div>
              <div className="space-y-2 text-sm">
                <SummaryRow label="Review tier" value={SENSITIVITY_LABEL[exp.sensitivity]} />
                <SummaryRow label="Second reviewer" value={exp.secondReviewer ? `${exp.secondReviewer.name} · ${exp.secondReviewer.org}` : sensitive ? 'Required' : 'Not required'} />
                <SummaryRow label="Client approval" value={exp.clientApproval ? `${exp.clientApproval.name} · ${exp.clientApproval.role}` : 'Not recorded'} />
                <SummaryRow label="Uploaded by" value={exp.uploadedBy} />
                <SummaryRow label="Reviewer ≠ uploader" value={!assigned ? 'Not assigned' : selfReview ? 'Blocked' : 'Yes'} />
              </div>
            </div>
            <div className="border-t border-border px-4 py-3">
              <Button variant="outline" size="sm" onClick={() => setClientOpen(true)} disabled={!can('manage_rights') || serverBlocked}>
                <User className="h-4 w-4" weight="duotone" /> Record client approval
              </Button>
            </div>
          </div>

          <div className="overflow-hidden rounded-lg border border-border bg-card">
            <div className="border-b border-border px-4 py-3">
              <p className="font-semibold text-foreground">Review thread</p>
              <p className="text-xs text-muted-foreground">Notes are part of the audit record</p>
            </div>
            <div className="p-4">
              {exp.reviewNotes.length === 0 ? (
                <p className="text-sm text-muted-foreground">No notes yet. Decisions and request-changes notes are recorded here.</p>
              ) : (
                <ol className="relative ml-2 border-l border-border pl-5">
                  {exp.reviewNotes.map((note, index) => (
                    <li key={index} className="relative pb-4 last:pb-0">
                      <span className="absolute -left-[25px] top-1.5 h-2.5 w-2.5 rounded-full border-2 border-card bg-[var(--amber)]" />
                      <p className="text-sm font-semibold text-foreground">{note.author} <span className="text-[11px] font-normal text-muted-foreground">· {note.role} · {formatEat(note.at)}</span></p>
                      <p className="mt-1 rounded bg-[var(--surface-2)] px-2.5 py-1.5 text-xs text-muted-foreground">{note.note}</p>
                    </li>
                  ))}
                </ol>
              )}
            </div>
          </div>
        </div>

        <aside className="space-y-3 xl:sticky xl:top-6">
          <div className="overflow-hidden rounded-lg border border-border bg-card shadow-sm">
            <div className="border-b border-border bg-[var(--surface-2)] px-4 py-3">
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--amber-deep)]">Assignment</p>
              <p className="mt-1 font-sans text-xl font-bold text-foreground">{exp.reviewer}</p>
              <p className="text-xs text-muted-foreground">{approved ? 'Review complete' : sensitive ? 'Sensitive · two reviewers' : 'Standard review'}</p>
            </div>
            <div className="space-y-2 p-4">
              {exp.draftStatus === 'in_review' ? (
                assignedToMe ? (
                  <>
                    <Callout tone="green" title="Assigned to you.">Review the frozen revision, then record a decision.</Callout>
                    <Button variant="outline" size="sm" className="w-full" onClick={() => { actions.unassignReviewer(exp.id); toast.success('Reviewer unassigned. The revision is back in the unassigned queue.') }} disabled={serverBlocked}>Unassign reviewer</Button>
                  </>
                ) : (
                  <Button variant="outline" size="sm" className="w-full" onClick={() => { try { actions.assignReviewer(exp.id, actor); toast.success(`Assigned to ${actor}.`) } catch (error) { toast.error(error instanceof Error ? error.message : 'Could not assign.') } }} disabled={selfReview || serverBlocked}>
                    <User className="h-4 w-4" weight="duotone" /> Assign to me
                  </Button>
                )
              ) : (
                <p className="text-xs text-muted-foreground">The decision is recorded. Publishing is a separate step.</p>
              )}
              {selfReview && <Callout tone="red" title="You are the uploader.">Reviewer ≠ uploader is enforced.</Callout>}
              <p className="text-[11px] text-muted-foreground">Reviewers see the frozen revision and its diff against live. Assignment is audited.</p>
            </div>
          </div>

          {sensitive && (
            <div className="overflow-hidden rounded-lg border border-border bg-card shadow-sm">
              <div className="border-b border-border bg-[var(--surface-2)] px-4 py-3">
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--amber-deep)]">Second reviewer</p>
                <p className="mt-1 font-sans text-lg font-bold text-foreground">{secondOk ? 'Recorded' : 'Required'}</p>
                <p className="text-xs text-muted-foreground">Sensitive / restricted tier</p>
              </div>
              <div className="space-y-2 p-4">
                {exp.secondReviewer ? (
                  <div className="rounded-md border border-border bg-[var(--surface-2)] px-3 py-2 text-sm">
                    <p className="font-semibold text-foreground">{exp.secondReviewer.name}</p>
                    <p className="text-xs text-muted-foreground">{exp.secondReviewer.org} · {exp.secondReviewer.decision === 'approved' ? 'Approved' : 'Changes requested'}</p>
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground">Record an external cultural reviewer or client approver. They do not need an account.</p>
                )}
                <Button variant={secondOk ? 'outline' : 'default'} size="sm" className="w-full" onClick={() => setExternalOpen(true)} disabled={!can('review') || serverBlocked}>
                  <Shield className="h-4 w-4" weight="duotone" /> {secondOk ? 'Record reviewer' : 'Record second reviewer'}
                </Button>
              </div>
            </div>
          )}

          <div className="overflow-hidden rounded-lg border border-border bg-card shadow-sm" id="decision-card">
            <div className="border-b border-border bg-[var(--surface-2)] px-4 py-3">
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--amber-deep)]">Decision</p>
              <p className="mt-1 font-sans text-xl font-bold text-foreground">{approved ? 'Approved' : !assigned ? 'Unassigned' : sensitive && !secondOk ? 'Second reviewer' : serverBlocked ? 'Blocked' : 'Ready'}</p>
              <p className="text-xs text-muted-foreground">{approved ? 'Publishing is a separate step' : 'Reviewer ≠ uploader'}</p>
            </div>
            <div className="p-4">
              {approved ? (
                <Callout tone="green" title={`Approved by ${exp.reviewer.replace(/\.$/, '')}.`}>
                  Publishing is a separate step. The approval note is in the review thread.
                </Callout>
              ) : (
                <>
                  <label className="space-y-1.5 text-xs font-semibold text-foreground">
                    Review notes
                    <textarea value={notes} onChange={(event) => setNotes(event.target.value)} rows={3} placeholder="Required for request changes or reject" className="w-full rounded-md border border-border bg-card px-3 py-2 text-sm font-normal" />
                  </label>
                  <div className="mt-2 space-y-1 rounded-md border border-border bg-[var(--surface-2)] p-2.5 text-[11px] leading-relaxed text-muted-foreground">
                    <p><strong className="text-foreground">Approve</strong> marks the revision ready to publish; it does not publish.</p>
                    <p><strong className="text-foreground">Request changes</strong> returns the same revision to the editor.</p>
                    <p><strong className="text-foreground">Reject</strong> records a rejection; the editor must revise materially.</p>
                    <p><strong className="text-foreground">Return to draft</strong> withdraws the revision without a review decision.</p>
                  </div>
                </>
              )}
              <div className="mt-3 space-y-2">
                {approved ? (
                  <>
                    <Button className="w-full" onClick={() => setPublishOpen(true)} disabled={serverBlocked}>Publish now</Button>
                    <Button variant="outline" className="w-full" onClick={() => setScheduleOpen(true)} disabled={serverBlocked}><ClockCounterClockwise className="h-4 w-4" weight="duotone" /> Schedule publish (EAT)</Button>
                    <Button variant="ghost" className="w-full" onClick={() => setReturnOpen(true)}>Return to draft</Button>
                  </>
                ) : (
                  <>
                    <Button className={`w-full ${approveDisabled ? 'bg-muted text-muted-foreground disabled:opacity-100' : ''}`} onClick={approve} disabled={approveDisabled} title={!secondOk ? 'Record the second reviewer before approving' : undefined}><CheckCircle className="h-4 w-4" weight="duotone" /> Approve revision</Button>
                    <Button variant="outline" className="w-full" onClick={requestChanges} disabled={decisionDisabled}><ArrowCounterClockwise className="h-4 w-4" weight="duotone" /> Request changes</Button>
                    <Button variant="destructive" className={`w-full ${decisionDisabled ? 'bg-muted text-muted-foreground disabled:opacity-100' : ''}`} onClick={reject} disabled={decisionDisabled}><Warning className="h-4 w-4" weight="duotone" /> Reject</Button>
                    <Button variant="ghost" className="w-full" onClick={() => setReturnOpen(true)}>Return to draft</Button>
                  </>
                )}
              </div>
              <div className="mt-2 text-[11px] text-muted-foreground">
                {!assigned
                  ? 'Assign a reviewer before deciding.'
                  : selfReview
                    ? 'You uploaded this revision; the decision is blocked.'
                    : sensitive && !secondOk
                      ? 'Record the second reviewer before approving. Request changes or reject can still be recorded.'
                      : serverBlocked
                        ? 'Server actions are paused in this fixture state.'
                        : 'Approve does not publish. Request changes returns the revision to draft.'}
              </div>
            </div>
          </div>

          <div className="rounded-lg border border-border bg-card p-3">
            <Button variant="outline" size="sm" className="w-full" onClick={() => setAuditOpen(true)}><ClockCounterClockwise className="h-4 w-4" weight="duotone" /> Open audit timeline</Button>
          </div>
        </aside>
      </div>

      <PreviewDialog
        open={previewOpen}
        onOpenChange={setPreviewOpen}
        image={site?.image}
        title={exp.title}
        subtitle={`${exp.duration}s · ${ACCESS_LABEL[exp.mode]} · ${exp.languages.join(' / ')}`}
        cardText={exp.textCards[0]?.text || exp.promise}
        meta={<span>{site?.publicRights || 'Public rights line not recorded.'} · Watermarked admin preview.</span>}
      />

      <AuditDialog open={auditOpen} onOpenChange={setAuditOpen} title={exp.title} events={events.map((event) => ({ id: event.id, title: event.title, meta: event.meta, note: event.note }))} />

      <ActionDialog
        open={rejectOpen}
        onOpenChange={setRejectOpen}
        title={`Reject revision v${exp.draftRevision}?`}
        description="This is recorded as a rejection, not a request for changes."
        confirmLabel="Reject revision"
        variant="destructive"
        onConfirm={confirmReject}
      >
        <Callout tone="red" title={exp.title}>
          Returns to draft with a rejected review record. The editor must materially revise the content before resubmitting; the note below stays in the audit trail.
        </Callout>
        <p className="rounded bg-[var(--surface-2)] px-2.5 py-2 text-xs text-muted-foreground">{notes}</p>
      </ActionDialog>

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
            navigate({ to: '/then-now/experiences/$experienceId', params: { experienceId: exp.id } })
          } catch (error) {
            toast.error(error instanceof Error ? error.message : 'Could not return to draft.')
          }
        }}
      />

      <ActionDialog
        open={publishOpen}
        onOpenChange={setPublishOpen}
        title={`Publish v${exp.draftRevision} now?`}
        description="The revision is approved; publishing is a separate step."
        confirmLabel="Publish now"
        onConfirm={publish}
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

      <ExternalReviewerDialog
        open={externalOpen}
        onOpenChange={setExternalOpen}
        onConfirm={(reviewer) => {
          actions.recordExternalReviewer(exp.id, reviewer)
          setExternalOpen(false)
          toast.success(reviewer.decision === 'approved' ? 'External reviewer recorded as approved.' : 'External reviewer requested changes.')
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
    </div>
  )
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-3 border-b border-border pb-1.5 last:border-0 last:pb-0">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right font-semibold text-foreground">{value}</span>
    </div>
  )
}
