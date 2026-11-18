import { useState } from 'react'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { toast } from 'sonner'
import { CaretLeft, CaretRight, Plus } from '@phosphor-icons/react'
import { Button } from '#/components/ui/button'
import { FormInput, FormSelect, FormTextarea } from '#/components/shared/FormField'
import { useThenNow, type CreateSiteInput } from '#/lib/then-now/store'
import { validateSiteDraft } from '#/lib/then-now/validation'
import {
  ACCESS_LABEL,
  SENSITIVITY_LABEL,
  type AccessMode,
  type Sensitivity,
  type SiteType,
} from '#/lib/then-now/types'
import { Callout, DirtyGuard, Kicker, PageHeader } from '#/components/then-now/shared'

export const Route = createFileRoute('/_authenticated/then-now/sites/new')({
  component: NewSitePage,
})

const STEPS = [
  { number: 1, label: 'Identity' },
  { number: 2, label: 'Policy' },
  { number: 3, label: 'Location & review' },
]

function NewSitePage() {
  const navigate = useNavigate()
  const { can, actions } = useThenNow()
  const [step, setStep] = useState(1)
  const [dirty, setDirty] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [form, setForm] = useState<CreateSiteInput>({
    name: '',
    county: '',
    locality: '',
    type: 'Historical',
    access: 'camera_video',
    sensitivity: 'standard',
    managingAuthority: '',
    photography: '',
    culturalAuthority: '',
    consent: '',
    siteRules: '',
    safety: '',
    latitude: '',
    longitude: '',
    geofenceRadius: '150',
    standingPointNote: '',
  })

  if (!can('create')) {
    return (
      <div>
        <PageHeader kicker="Then & Now · Sites" title="New heritage site" back={{ to: '/then-now', label: 'All sites' }} />
        <Callout tone="red" title="You do not have permission to create sites.">
          Ask an administrator for access to Then & Now authoring.
        </Callout>
      </div>
    )
  }

  const setField = <K extends keyof CreateSiteInput>(key: K, value: CreateSiteInput[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }))
    setDirty(true)
    if (errors[key as string]) {
      setErrors((prev) => {
        const next = { ...prev }
        delete next[key as string]
        return next
      })
    }
  }

  const continueStep = () => {
    if (step === 1) {
      const nextErrors: Record<string, string> = {}
      if (!form.name.trim()) nextErrors.name = 'Site name is required'
      if (!form.county.trim()) nextErrors.county = 'County is required'
      if (Object.keys(nextErrors).length > 0) {
        setErrors(nextErrors)
        return
      }
    }
    setStep((value) => Math.min(3, value + 1))
  }

  const create = async () => {
    const nextErrors = validateSiteDraft(form)
    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors)
      toast.error('Check the required site fields.')
      return
    }
    try {
      const id = await actions.createSite(form)
      setDirty(false)
      toast.success('Site draft created.')
      // Let the dirty guard observe the cleared flag before the route change.
      window.setTimeout(() => navigate({ to: '/then-now/sites/$siteId', params: { siteId: id } }), 0)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not create the site.')
    }
  }

  return (
    <div>
      <PageHeader
        kicker="Then & Now · Sites"
        title="New heritage site"
        sub="A short wizard creates the draft. The full editor owns the policy, location, experiences, and sources."
        back={{ to: '/then-now', label: 'All sites' }}
      />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_300px] lg:items-start">
        <div className="overflow-hidden rounded-lg border border-border bg-card shadow-sm">
          <div className="flex flex-wrap items-center gap-0 overflow-x-auto border-b border-border px-4 py-3">
            {STEPS.map((entry) => (
              <div key={entry.number} className="flex items-center">
                {entry.number > 1 && <span className="mx-2 h-px w-6 bg-border" aria-hidden="true" />}
                <div className={`flex items-center gap-2 text-sm font-semibold ${step === entry.number ? 'text-foreground' : 'text-muted-foreground'}`}>
                  <span className={`flex h-6 w-6 items-center justify-center rounded-full border text-[11px] ${step === entry.number ? 'border-primary bg-primary text-primary-foreground' : step > entry.number ? 'border-[var(--amber)] bg-[var(--amber)] text-primary' : 'border-border bg-card'}`}>
                    {step > entry.number ? '✓' : entry.number}
                  </span>
                  {entry.label}
                </div>
              </div>
            ))}
          </div>

          <div className="p-5 sm:p-6">
            {step === 1 && (
              <div className="grid gap-4 sm:grid-cols-2">
                <FormInput label="Site name" required value={form.name} onChange={(value) => setField('name', value)} error={errors.name} placeholder="e.g. Nairobi Railway Museum" />
                <FormInput label="County" required value={form.county} onChange={(value) => setField('county', value)} error={errors.county} placeholder="Nairobi" />
                <FormInput label="Locality" value={form.locality ?? ''} onChange={(value) => setField('locality', value)} placeholder="Nairobi" />
                <FormSelect label="Site type" required value={form.type} options={['Historical', 'Cultural']} onChange={(value) => setField('type', value as SiteType)} error={errors.type} />
                <div className="sm:col-span-2">
                  <FormInput label="Managing authority" value={form.managingAuthority ?? ''} onChange={(value) => setField('managingAuthority', value)} placeholder="e.g. National Museums of Kenya" />
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-4">
                <div>
                  <p className="mb-1.5 text-xs font-semibold text-foreground">Access mode</p>
                  <div className="inline-flex flex-wrap gap-1 rounded-lg bg-muted p-1" role="group" aria-label="Access mode">
                    {(Object.keys(ACCESS_LABEL) as AccessMode[]).map((value) => (
                      <button
                        key={value}
                        type="button"
                        aria-pressed={form.access === value}
                        onClick={() => setField('access', value)}
                        className={`rounded-md px-3 py-1.5 text-xs font-semibold ${form.access === value ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
                      >
                        {ACCESS_LABEL[value]}
                      </button>
                    ))}
                  </div>
                  <p className="mt-1.5 text-xs text-muted-foreground">Camera + video is the on-site portal. Video only is the 2D experience. Not available yet keeps the page up but non-playable.</p>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <FormSelect label="Sensitivity" value={form.sensitivity} options={Object.entries(SENSITIVITY_LABEL).map(([value, label]) => ({ value, label }))} onChange={(value) => setField('sensitivity', value as Sensitivity)} />
                  <FormInput label="Cultural authority" value={form.culturalAuthority ?? ''} onChange={(value) => setField('culturalAuthority', value)} placeholder="Who speaks for the site?" />
                  <div className="sm:col-span-2">
                    <FormTextarea label="Photography policy" value={form.photography ?? ''} onChange={(value) => setField('photography', value)} placeholder="What may be photographed or filmed?" />
                  </div>
                  <div className="sm:col-span-2">
                    <FormInput label="Consent record" value={form.consent ?? ''} onChange={(value) => setField('consent', value)} placeholder="Record the community or custodian consent" description="Required before publish for cultural and sensitive sites." />
                  </div>
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <FormInput label="Latitude" value={form.latitude ?? ''} onChange={(value) => setField('latitude', value)} placeholder="-1.293613" />
                  <FormInput label="Longitude" value={form.longitude ?? ''} onChange={(value) => setField('longitude', value)} placeholder="36.822641" />
                  <FormInput label="Geofence radius (metres)" value={form.geofenceRadius ?? '150'} onChange={(value) => setField('geofenceRadius', value)} />
                  <div className="sm:col-span-2">
                    <FormTextarea label="Standing point note" value={form.standingPointNote ?? ''} onChange={(value) => setField('standingPointNote', value)} placeholder="Where should the visitor stand?" />
                  </div>
                  <div className="sm:col-span-2">
                    <FormTextarea label="Safety note" value={form.safety ?? ''} onChange={(value) => setField('safety', value)} placeholder="Steps, uneven ground, opening hours…" />
                  </div>
                </div>
                <Callout tone="gold" title="Map picker.">
                  Production opens MapLibre with a draggable pin. V1 uses a site geofence and a standing-point note; camera anchors and ghost frames are post-v1.
                </Callout>
                <Callout tone="neutral" title="The draft can be created now.">
                  Readiness is checked in the site editor. A site needs at least one published experience before it can go live.
                </Callout>
              </div>
            )}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border px-5 py-4">
            <Button variant="outline" size="sm" onClick={() => setStep((value) => Math.max(1, value - 1))} disabled={step === 1}>
              <CaretLeft className="h-4 w-4" weight="bold" /> Back
            </Button>
            <span className="text-xs text-muted-foreground">Step {step} of {STEPS.length}</span>
            {step < 3 ? (
              <Button size="sm" onClick={continueStep}>Continue <CaretRight className="h-4 w-4" weight="bold" /></Button>
            ) : (
              <Button size="sm" onClick={create}><Plus className="h-4 w-4" weight="bold" /> Create draft</Button>
            )}
          </div>
        </div>

        <aside className="rounded-lg border border-border bg-card p-4 shadow-sm">
          <Kicker>Draft summary</Kicker>
          <p className="mt-2 font-sans text-xl font-bold text-foreground">{form.name || 'Untitled site'}</p>
          <p className="text-xs text-muted-foreground">{form.county || 'County not set'} · {ACCESS_LABEL[form.access]}</p>
          <div className="mt-4 space-y-2 text-xs text-muted-foreground">
            <p><strong className="text-foreground">Consent:</strong> {form.consent ? form.consent : 'Not recorded'}</p>
            <p><strong className="text-foreground">Sensitivity:</strong> {SENSITIVITY_LABEL[form.sensitivity]}</p>
          </div>
          <p className="mt-4 text-xs text-muted-foreground">The site will start as a draft. Add an experience and clear the readiness rail before publishing.</p>
        </aside>
      </div>

      <DirtyGuard dirty={dirty} />
    </div>
  )
}
