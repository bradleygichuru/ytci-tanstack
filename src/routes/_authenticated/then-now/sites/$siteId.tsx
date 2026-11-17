import { useEffect, useMemo, useState } from 'react'
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { toast } from 'sonner'
import {
  ClockCounterClockwise,
  Eye,
  FloppyDisk,
  MapPin,
  Plus,
} from '@phosphor-icons/react'
import { Button } from '#/components/ui/button'
import { FormInput, FormSelect, FormTextarea } from '#/components/shared/FormField'
import { useThenNow } from '#/lib/then-now/store'
import { siteReadiness } from '#/lib/then-now/readiness'
import { relativeAge, formatDateEat } from '#/lib/then-now/format'
import { validateSiteDraft } from '#/lib/then-now/validation'
import {
  ACCESS_LABEL,
  SENSITIVITY_LABEL,
  type AccessMode,
  type HeritageSite,
  type Sensitivity,
  type SiteType,
} from '#/lib/then-now/types'
import {
  AuditDialog,
  Callout,
  DirtyGuard,
  PageHeader,
  PreviewDialog,
  ReadinessRail,
  SensitivityBadge,
  StatCard,
  StatusPill,
} from '#/components/then-now/shared'
import { ActionDialog, ReasonDialog } from '#/components/then-now/dialogs'

type SiteTab = 'identity' | 'policy' | 'location' | 'experiences' | 'sources'
const TABS: { key: SiteTab; label: string }[] = [
  { key: 'identity', label: 'Identity' },
  { key: 'policy', label: 'Policy' },
  { key: 'location', label: 'Location' },
  { key: 'experiences', label: 'Experiences' },
  { key: 'sources', label: 'Sources' },
]

export const Route = createFileRoute('/_authenticated/then-now/sites/$siteId')({
  validateSearch: (search: Record<string, unknown>): { tab?: SiteTab } => {
    const tab = typeof search.tab === 'string' ? search.tab : 'identity'
    return { tab: (TABS.some((entry) => entry.key === tab) ? tab : 'identity') as SiteTab }
  },
  component: SiteEditorPage,
})

function SiteEditorPage() {
  const { siteId } = Route.useParams()
  const { tab = 'identity' } = Route.useSearch()
  const navigate = useNavigate()
  const { state, scenario, can, actions } = useThenNow()
  const site = state.sites.find((entry) => entry.id === siteId)
  const [form, setForm] = useState<HeritageSite | null>(site ?? null)
  const [dirty, setDirty] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [previewOpen, setPreviewOpen] = useState(false)
  const [auditOpen, setAuditOpen] = useState(false)
  const [saveOpen, setSaveOpen] = useState(false)
  const [unpublishOpen, setUnpublishOpen] = useState(false)
  const [archiveOpen, setArchiveOpen] = useState(false)

  useEffect(() => {
    setForm(site ?? null)
    setDirty(false)
  }, [site])

  const readiness = useMemo(
    () => (form ? siteReadiness(form, state.experiences) : { blockers: [], warnings: [], readyToSubmit: false, readyToPublish: false }),
    [form, state.experiences],
  )

  if (!site || !form) {
    return (
      <div>
        <PageHeader kicker="Then & Now · Sites" title="Site not found" back={{ to: '/then-now', label: 'All sites' }} />
        <Callout tone="red" title="This fixture is not available.">
          Return to the sites list and choose a record.
        </Callout>
      </div>
    )
  }

  const serverBlocked = scenario === 'offline' || scenario === 'conflict'
  const readOnly = !can('edit') || scenario === 'readonly' || site.status === 'archived'
  const canPublish = can('publish') && !readOnly && !serverBlocked
  const canArchive = can('archive') && !readOnly
  const experiences = form.experiences.map((id) => state.experiences[id]).filter(Boolean)
  const liveExperiences = experiences.filter((exp) => exp.status === 'published').length
  const siteEvents = state.audit.filter((event) => event.entity === site.id || form.experiences.includes(event.entity))

  const setTab = (next: SiteTab) => {
    navigate({ to: '/then-now/sites/$siteId', params: { siteId: site.id }, search: { tab: next }, replace: true })
  }

  const setField = <K extends keyof HeritageSite>(key: K, value: HeritageSite[K]) => {
    setForm((prev) => (prev ? { ...prev, [key]: value } : prev))
    setDirty(true)
    if (errors[key as string]) {
      setErrors((prev) => {
        const next = { ...prev }
        delete next[key as string]
        return next
      })
    }
  }

  const save = () => {
    if (readOnly) return
    const nextErrors = validateSiteDraft(form)
    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors)
      setTab('identity')
      toast.error('Check the required site fields.')
      return
    }
    if (site.status === 'published') {
      setSaveOpen(true)
      return
    }
    actions.saveSite(site.id, form)
    setDirty(false)
    toast.success('Site draft saved.')
  }

  const confirmSave = () => {
    actions.saveSite(site.id, form)
    setDirty(false)
    setSaveOpen(false)
    toast.success('Public site updated.')
  }

  const publish = () => {
    if (!readiness.readyToPublish) {
      toast.error('Resolve the site readiness blockers first.')
      return
    }
    try {
      actions.publishSite(site.id, form)
      setDirty(false)
      toast.success('Site published.')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not publish the site.')
    }
  }

  const stage = site.status === 'published'
    ? 'Live'
    : readiness.blockers.length > 0
      ? `${readiness.blockers.length} blocker${readiness.blockers.length === 1 ? '' : 's'}`
      : 'Ready to publish'

  return (
    <div>
      <PageHeader
        kicker="Heritage site"
        title={site.name}
        sub={
          <span className="flex flex-wrap items-center gap-2">
            <StatusPill status={site.status} />
            <span>{site.locality === site.county ? site.locality : `${site.locality} · ${site.county}`}</span>
            <span>·</span>
            <span>{site.type}</span>
            <span>·</span>
            <span>{experiences.length} experience{experiences.length === 1 ? '' : 's'}</span>
            <span>·</span>
            <span>updated {relativeAge(site.updatedAt)}</span>
          </span>
        }
        actions={
          <>
            <Button variant="outline" size="sm" onClick={() => setPreviewOpen(true)}>
              <Eye className="h-4 w-4" weight="duotone" /> Preview
            </Button>
            {!readOnly && (
              <span className={`rounded-full border px-2.5 py-1 text-[10px] font-bold ${dirty ? 'border-[var(--amber)] bg-[var(--amber-bg)] text-[var(--amber-deep)]' : 'border-border bg-muted text-muted-foreground'}`}>
                {dirty ? 'Unsaved changes' : 'Saved'}
              </span>
            )}
            {!readOnly && (
              <Button variant="outline" size="sm" onClick={save}>
                <FloppyDisk className="h-4 w-4" weight="duotone" /> {site.status === 'published' ? 'Save changes' : 'Save draft'}
              </Button>
            )}
            {can('publish') && site.status !== 'published' && (
              <Button size="sm" onClick={publish} disabled={!canPublish || !readiness.readyToPublish} title={!readiness.readyToPublish ? 'Resolve the readiness blockers first' : undefined}>
                Publish site
              </Button>
            )}
            {site.status === 'published' && can('unpublish') && (
              <Button variant="outline" size="sm" onClick={() => setUnpublishOpen(true)} disabled={serverBlocked}>
                Unpublish
              </Button>
            )}
            {canArchive && site.status !== 'archived' && (
              <Button variant="outline" size="sm" className="text-destructive dark:text-red-300" onClick={() => setArchiveOpen(true)}>
                Archive
              </Button>
            )}
          </>
        }
        back={{ to: '/then-now', label: 'All sites' }}
      />

      {readOnly && (
        <div className="mb-4">
          <Callout tone="neutral" title="Read-only.">
            {scenario === 'readonly' ? 'This fixture is in read-only mode.' : 'You can inspect this site but not edit, publish, or archive it.'}
          </Callout>
        </div>
      )}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px] xl:items-start">
        <div className="min-w-0">
          <div className="overflow-hidden rounded-lg border border-border bg-card shadow-sm">
            <div className="flex gap-1 overflow-x-auto border-b border-border px-4 pt-2" role="tablist" aria-label="Site editor sections">
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
                  {entry.key === 'experiences' && <span className="rounded-full bg-muted px-1.5 text-[10px] font-bold text-muted-foreground">{experiences.length}</span>}
                </button>
              ))}
            </div>

            <div className="p-5 sm:p-6" role="tabpanel">
              {tab === 'identity' && (
                <div className="grid gap-4 sm:grid-cols-2">
                  <FormInput label="Site name" required value={form.name} onChange={(value) => setField('name', value)} error={errors.name} />
                  <FormInput label="County" required value={form.county} onChange={(value) => setField('county', value)} error={errors.county} />
                  <FormInput label="Locality" value={form.locality} onChange={(value) => setField('locality', value)} />
                  <FormSelect label="Site type" required value={form.type} options={['Historical', 'Cultural']} onChange={(value) => setField('type', value as SiteType)} error={errors.type} />
                  <FormInput label="Linked Destination" value={form.destination} onChange={(value) => setField('destination', value)} description="Optional catalog link." />
                  <FormInput label="Managing authority" value={form.managingAuthority} onChange={(value) => setField('managingAuthority', value)} />
                  <div className="sm:col-span-2">
                    <FormInput label="Short description" value={form.shortDescription} onChange={(value) => setField('shortDescription', value)} />
                  </div>
                  <div className="sm:col-span-2">
                    <FormTextarea label="Full description" value={form.fullDescription} onChange={(value) => setField('fullDescription', value)} />
                  </div>
                  <div className="sm:col-span-2">
                    <Callout tone="neutral">
                      This record describes the site as it is today. Historical reconstruction, camera anchors, and ghost frames are post-v1.
                    </Callout>
                  </div>
                </div>
              )}

              {tab === 'policy' && (
                <div className="space-y-4">
                  <div>
                    <p className="mb-1.5 text-xs font-semibold text-foreground">Access mode</p>
                    <div className="inline-flex flex-wrap gap-1 rounded-lg bg-muted p-1" role="group" aria-label="Access mode">
                      {(Object.keys(ACCESS_LABEL) as AccessMode[]).map((value) => (
                        <button
                          key={value}
                          type="button"
                          aria-pressed={form.access === value}
                          disabled={readOnly}
                          onClick={() => setField('access', value)}
                          className={`rounded-md px-3 py-1.5 text-xs font-semibold ${form.access === value ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'} disabled:cursor-not-allowed disabled:opacity-50`}
                        >
                          {ACCESS_LABEL[value]}
                        </button>
                      ))}
                    </div>
                    <p className="mt-1.5 text-xs text-muted-foreground">Camera + video enables the on-site portal. Video only is the 2D experience. Not available yet keeps the site page up but non-playable.</p>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <FormSelect label="Sensitivity tier" value={form.sensitivity} options={Object.entries(SENSITIVITY_LABEL).map(([value, label]) => ({ value, label }))} onChange={(value) => setField('sensitivity', value as Sensitivity)} />
                    <FormInput label="Cultural authority" value={form.culturalAuthority} onChange={(value) => setField('culturalAuthority', value)} />
                    <div className="sm:col-span-2">
                      <FormTextarea label="Photography and filming policy" value={form.photography} onChange={(value) => setField('photography', value)} />
                    </div>
                    <FormInput label="Consent record" value={form.consent} onChange={(value) => setField('consent', value)} description={form.consent ? `Recorded ${formatDateEat(form.consentDate)}` : 'Required before publish for cultural and sensitive sites.'} />
                    <div className="sm:col-span-2">
                      <FormTextarea label="Site rules" value={form.siteRules} onChange={(value) => setField('siteRules', value)} />
                    </div>
                    <div className="sm:col-span-2">
                      <FormTextarea label="Safety notes" value={form.safety} onChange={(value) => setField('safety', value)} />
                    </div>
                  </div>
                  {form.access === 'not_available' && (
                    <Callout tone="gold" title="Not available yet.">
                      The site page can stay visible with the reason and a save action. The video and camera portal are disabled until rights and consent are recorded.
                    </Callout>
                  )}
                  {form.sensitivity !== 'standard' && (
                    <Callout tone="gold" title={`${SENSITIVITY_LABEL[form.sensitivity]} site.`}>
                      A second reviewer is required for sensitive revisions. The review queue records external cultural reviewers and client approvers without accounts.
                    </Callout>
                  )}
                </div>
              )}

              {tab === 'location' && (
                <div className="space-y-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <FormInput label="Latitude" value={form.latitude} onChange={(value) => setField('latitude', value)} />
                    <FormInput label="Longitude" value={form.longitude} onChange={(value) => setField('longitude', value)} />
                    <FormInput label="Geofence radius (metres)" value={form.geofenceRadius} onChange={(value) => setField('geofenceRadius', value)} />
                    <div className="sm:col-span-2">
                      <FormTextarea label="Standing point note" value={form.standingPointNote} onChange={(value) => setField('standingPointNote', value)} />
                    </div>
                  </div>
                  <div className="relative flex h-56 items-center justify-center overflow-hidden rounded-lg border border-border bg-gradient-to-br from-[#e7f0e8] to-[#f8f9fa] dark:from-[#1a2b1c] dark:to-[#101713]">
                    <div className="absolute inset-0 opacity-40" style={{ backgroundImage: 'linear-gradient(rgba(21,66,18,.12) 1px, transparent 1px), linear-gradient(90deg, rgba(21,66,18,.12) 1px, transparent 1px)', backgroundSize: '28px 28px' }} />
                    <div className="relative text-center">
                      <span className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-[var(--amber)] text-primary shadow-lg">
                        <MapPin className="h-5 w-5" weight="fill" />
                      </span>
                      <p className="mt-2 text-sm font-bold text-foreground">{form.latitude && form.longitude ? `${form.latitude}, ${form.longitude}` : 'No coordinates yet'}</p>
                      <p className="text-xs text-muted-foreground">MapLibre map + draggable pin in production; numeric fields remain the fallback.</p>
                    </div>
                  </div>
                  <Callout tone="gold" title="Post-v1: camera anchor, heading, pitch, HFOV, and ghost frames.">
                    V1 ships a site geofence and a standing-point note for the camera portal.
                  </Callout>
                </div>
              )}

              {tab === 'experiences' && (
                <div className="space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="font-semibold text-foreground">Experiences at this site</p>
                      <p className="text-xs text-muted-foreground">One primary experience per site in v1. The experience owns the site video, text cards, captions, rights, and review.</p>
                    </div>
                    {can('create') && (
                      <Button size="sm" asChild>
                        <Link to="/then-now/experiences/new" search={{ siteId: site.id }}><Plus className="h-4 w-4" weight="bold" /> New experience</Link>
                      </Button>
                    )}
                  </div>
                  {experiences.length === 0 ? (
                    <Callout tone="neutral" title="No experience yet.">
                      Add the site video and the context cards. The site cannot publish until at least one experience is live.
                    </Callout>
                  ) : (
                    <div className="space-y-2">
                      {experiences.map((exp) => (
                        <div key={exp.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-[var(--surface-2)] px-4 py-3">
                          <div>
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="font-semibold text-foreground">{exp.title}</span>
                              <StatusPill status={exp.draftStatus} />
                              <SensitivityBadge sensitivity={exp.sensitivity} />
                            </div>
                            <p className="mt-1 text-xs text-muted-foreground">
                              {exp.mode === 'camera_video' ? 'Camera + video' : 'Video only'} · {exp.languages.join(' / ')} · rights {formatDateEat(exp.rightsExpiry)}
                            </p>
                          </div>
                          <Button variant="outline" size="sm" asChild>
                            <Link to="/then-now/experiences/$experienceId" params={{ experienceId: exp.id }}>Open</Link>
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {tab === 'sources' && (
                <div className="grid gap-4">
                  <FormTextarea label="Sources" value={form.sources} onChange={(value) => setField('sources', value)} description="For the review record, not the public page." />
                  <FormInput label="Fact-check sign-off" value={form.factCheck} onChange={(value) => setField('factCheck', value)} />
                  <FormInput label="Review date" value={form.consentDate} onChange={(value) => setField('consentDate', value)} description="Consent and review dates use EAT." />
                  <FormTextarea label="Public rights line" value={form.publicRights} onChange={(value) => setField('publicRights', value)} description="Shown at the bottom of the public site page." />
                  <Callout tone="neutral" title="Review evidence.">
                    Rights, consent, and the fact-check are part of the readiness gate. The admin preview is watermarked; no public draft links.
                  </Callout>
                </div>
              )}
            </div>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <StatCard label="Experiences" value={experiences.length} foot={`${liveExperiences} published`} accent="none" />
            <StatCard label="Readiness" value={readiness.blockers.length === 0 ? 'Clear' : `${readiness.blockers.length} blocked`} foot={`${readiness.warnings.length} warnings`} accent={readiness.blockers.length === 0 ? 'forest' : 'danger'} />
            <StatCard label="Rights" value={form.consent ? 'Recorded' : 'Pending'} foot={form.consent ? formatDateEat(form.consentDate) : 'Consent is required before publish'} accent={form.consent ? 'none' : 'gold'} />
          </div>
        </div>

        <ReadinessRail
          kicker="Site readiness"
          stage={stage}
          ready={site.status === 'published' || readiness.readyToPublish}
          sub={`${liveExperiences} published experience${liveExperiences === 1 ? '' : 's'} · ${readiness.warnings.length} warning${readiness.warnings.length === 1 ? '' : 's'}`}
          blockers={readiness.blockers}
          warnings={readiness.warnings}
          onSelect={(section) => {
            const map: Record<string, SiteTab> = { identity: 'identity', policy: 'policy', location: 'location', experiences: 'experiences', sources: 'sources' }
            setTab(map[section] ?? 'identity')
          }}
          footer={
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground">
                {site.status === 'published'
                  ? 'The public site is live. Use Unpublish in the header to hide it; the records stay published internally.'
                  : !can('publish')
                    ? 'Administrators publish. You can save the draft.'
                    : readiness.readyToPublish
                      ? 'All site checks pass. Use Publish site in the header.'
                      : 'Resolve the blocking checks before publishing.'}
              </p>
              <div className="flex flex-wrap gap-1">
                <Button variant="ghost" size="sm" onClick={() => toast.success('Readiness refreshed from the fixture contract.')}>Refresh readiness</Button>
                <Button variant="ghost" size="sm" onClick={() => setAuditOpen(true)}>
                  <ClockCounterClockwise className="h-4 w-4" weight="duotone" /> Audit
                </Button>
              </div>
            </div>
          }
        />
      </div>

      <PreviewDialog
        open={previewOpen}
        onOpenChange={setPreviewOpen}
        image={form.image}
        title={form.name}
        subtitle={`${form.locality} · ${form.county} · ${ACCESS_LABEL[form.access]}`}
        cardText={form.shortDescription}
        meta={<span>{form.publicRights || 'Public rights line not recorded.'}</span>}
      />

      <AuditDialog
        open={auditOpen}
        onOpenChange={setAuditOpen}
        title={form.name}
        events={siteEvents.map((event) => ({ id: event.id, title: event.title, meta: event.meta, note: event.note }))}
      />

      <DirtyGuard dirty={dirty && !readOnly} />

      <ActionDialog
        open={saveOpen}
        onOpenChange={setSaveOpen}
        title="Save changes to the public site?"
        description="This site has no staged revision."
        confirmLabel="Save changes"
        onConfirm={confirmSave}
      >
        <Callout tone="gold" title="These changes update the public site immediately.">
          Policy, sensitivity, and consent changes should be reviewed before saving. A staged site revision is not part of this prototype.
        </Callout>
      </ActionDialog>

      <ReasonDialog
        open={unpublishOpen}
        onOpenChange={setUnpublishOpen}
        title="Unpublish site?"
        description="The record stays; the public surface is hidden."
        label="Reason"
        confirmLabel="Unpublish"
        onConfirm={(reason) => {
          actions.unpublishSite(site.id)
          setUnpublishOpen(false)
          setDirty(false)
          toast.success(`Site unpublished. ${reason ? 'Reason recorded.' : ''}`)
        }}
      />

      <ReasonDialog
        open={archiveOpen}
        onOpenChange={setArchiveOpen}
        title="Archive site?"
        description="Super-admin only. This is not a hard delete."
        label="Reason"
        confirmLabel="Archive"
        variant="destructive"
        onConfirm={(reason) => {
          actions.archiveSite(site.id)
          setArchiveOpen(false)
          setDirty(false)
          toast.success(`Site archived. ${reason ? 'Reason recorded.' : ''}`)
        }}
      />
    </div>
  )
}
