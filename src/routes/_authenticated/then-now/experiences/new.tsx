import { useState } from 'react'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { toast } from 'sonner'
import { CaretLeft, CaretRight, Plus, Upload, X } from '@phosphor-icons/react'
import { Button } from '#/components/ui/button'
import { FormInput, FormSelect } from '#/components/shared/FormField'
import { useThenNow, type CreateExperienceInput } from '#/lib/then-now/store'
import {
  ACCESS_LABEL,
  SENSITIVITY_LABEL,
  type Sensitivity,
  type TextCard,
} from '#/lib/then-now/types'
import { Callout, DirtyGuard, Kicker, PageHeader } from '#/components/then-now/shared'

export const Route = createFileRoute('/_authenticated/then-now/experiences/new')({
  validateSearch: (search: Record<string, unknown>): { siteId?: string } => ({
    siteId: typeof search.siteId === 'string' ? search.siteId : undefined,
  }),
  component: NewExperiencePage,
})

const STEPS = ['Site', 'Identity', 'Video', 'Text cards', 'Rights']

function NewExperiencePage() {
  const navigate = useNavigate()
  const { state, can, actions } = useThenNow()
  const { siteId } = Route.useSearch()
  const [step, setStep] = useState(1)
  const [dirty, setDirty] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [form, setForm] = useState<CreateExperienceInput>({
    siteId: siteId ?? state.sites[0]?.id ?? '',
    title: '',
    promise: '',
    mode: 'camera_video',
    period: '',
    duration: 77,
    rights: '',
    rightsExpiry: '',
    consent: '',
    sensitivity: 'standard',
    textCards: [{ at: 6, text: '' }],
  })
  const [videoFile, setVideoFile] = useState<{ name: string; size: number } | null>(null)

  if (!can('create')) {
    return (
      <div>
        <PageHeader kicker="Then & Now · Experiences" title="New experience" back={{ to: '/then-now/experiences', label: 'All experiences' }} />
        <Callout tone="red" title="You do not have permission to create experiences.">
          Ask an administrator for access to Then & Now authoring.
        </Callout>
      </div>
    )
  }

  const site = state.sites.find((entry) => entry.id === form.siteId)
  const setField = <K extends keyof CreateExperienceInput>(key: K, value: CreateExperienceInput[K]) => {
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
  const setCard = (index: number, patch: Partial<TextCard>) => {
    setForm((prev) => ({
      ...prev,
      textCards: (prev.textCards ?? []).map((card, cardIndex) => cardIndex === index ? { ...card, ...patch } : card),
    }))
    setDirty(true)
  }

  const continueStep = () => {
    if (step === 1 && !form.siteId) {
      toast.error('Choose a heritage site.')
      return
    }
    if (step === 2) {
      const nextErrors: Record<string, string> = {}
      if (!form.title.trim()) nextErrors.title = 'Experience title is required'
      if (!form.duration || form.duration < 30 || form.duration > 180) nextErrors.duration = 'Duration must be between 30 and 180 seconds'
      if (Object.keys(nextErrors).length > 0) {
        setErrors(nextErrors)
        return
      }
    }
    setStep((value) => Math.min(5, value + 1))
  }

  const create = async () => {
    if (!form.siteId || !form.title.trim()) {
      toast.error('Choose a site and add an experience title.')
      return
    }
    try {
      const id = await actions.createExperience({
        ...form,
        videoMaster: videoFile?.name ?? form.videoMaster,
        videoSize: videoFile ? `${(videoFile.size / 1_000_000).toFixed(1)} MB` : form.videoSize,
        poster: Boolean(videoFile) || form.poster,
      })
      setDirty(false)
      toast.success('Experience draft created.')
      // Let the dirty guard observe the cleared flag before the route change.
      window.setTimeout(() => navigate({ to: '/then-now/experiences/$experienceId', params: { experienceId: id } }), 0)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not create the experience.')
    }
  }

  return (
    <div>
      <PageHeader
        kicker="Then & Now · Experiences"
        title="New experience"
        sub="A short wizard creates the draft and opens the full editor. It does not bypass readiness or review."
        back={{ to: '/then-now/experiences', label: 'All experiences' }}
      />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_300px] lg:items-start">
        <div className="overflow-hidden rounded-lg border border-border bg-card shadow-sm">
          <div className="flex flex-wrap items-center gap-0 overflow-x-auto border-b border-border px-4 py-3">
            {STEPS.map((label, index) => {
              const number = index + 1
              return (
                <div key={label} className="flex items-center">
                  {number > 1 && <span className="mx-2 h-px w-5 bg-border" aria-hidden="true" />}
                  <div className={`flex items-center gap-1.5 text-xs font-semibold ${step === number ? 'text-foreground' : 'text-muted-foreground'}`}>
                    <span className={`flex h-6 w-6 items-center justify-center rounded-full border text-[10px] ${step === number ? 'border-primary bg-primary text-primary-foreground' : step > number ? 'border-[var(--amber)] bg-[var(--amber)] text-primary' : 'border-border bg-card'}`}>
                      {step > number ? '✓' : number}
                    </span>
                    {label}
                  </div>
                </div>
              )
            })}
          </div>

          <div className="p-5 sm:p-6">
            {step === 1 && (
              <div className="space-y-4">
                <FormSelect label="Heritage site" required value={form.siteId} options={state.sites.map((entry) => ({ value: entry.id, label: `${entry.name} · ${entry.county}` }))} onChange={(value) => setField('siteId', value)} />
                <div>
                  <p className="mb-1.5 text-xs font-semibold text-foreground">Primary mode</p>
                  <div className="inline-flex flex-wrap gap-1 rounded-lg bg-muted p-1" role="group" aria-label="Primary mode">
                    {(['camera_video', 'video_only'] as const).map((value) => (
                      <button key={value} type="button" aria-pressed={form.mode === value} onClick={() => setField('mode', value)} className={`rounded-md px-3 py-1.5 text-xs font-semibold ${form.mode === value ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}>
                        {ACCESS_LABEL[value]}
                      </button>
                    ))}
                  </div>
                  <p className="mt-1.5 text-xs text-muted-foreground">Camera + video adds the on-site portal. Video only is the 2D experience. Both use the same site video.</p>
                </div>
                {site && (
                  <Callout tone="neutral" title={site.name}>
                    {site.access === 'not_available' ? 'This site is not available yet. The draft can be prepared, but the experience cannot publish until the site policy clears.' : `${site.locality} · ${site.county} · ${ACCESS_LABEL[site.access]}`}
                  </Callout>
                )}
              </div>
            )}

            {step === 2 && (
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <FormInput label="Experience title" required value={form.title} onChange={(value) => setField('title', value)} error={errors.title} />
                </div>
                <div className="sm:col-span-2">
                  <FormInput label="Promise" value={form.promise ?? ''} onChange={(value) => setField('promise', value)} description="One line. What will the visitor see?" />
                </div>
                <FormInput label="Historical period" value={form.period ?? ''} onChange={(value) => setField('period', value)} placeholder="e.g. 1899–1971" />
                <FormInput label="Duration (seconds)" value={String(form.duration ?? 77)} onChange={(value) => setField('duration', Number(value) || 0)} error={errors.duration} />
              </div>
            )}

            {step === 3 && (
              <div className="space-y-4">
                <label className="flex cursor-pointer flex-col items-center gap-2 rounded-lg border border-dashed border-border bg-[var(--surface-2)] px-4 py-10 text-center">
                  <Upload className="h-6 w-6 text-muted-foreground" weight="duotone" />
                  <span className="text-sm font-semibold text-foreground">{videoFile ? videoFile.name : 'Choose the current-scene video master'}</span>
                  <span className="text-xs text-muted-foreground">Pre-compressed 4K MP4, 16:9, 60–110 seconds. Fixture mode records metadata only.</span>
                  <input
                    type="file"
                    accept="video/mp4"
                    className="sr-only"
                    onChange={(event) => {
                      const file = event.target.files?.[0]
                      if (!file) return
                      setVideoFile({ name: file.name, size: file.size })
                      setDirty(true)
                    }}
                  />
                </label>
                {videoFile && (
                  <div className="flex items-center justify-between rounded-md border border-border bg-card px-3 py-2 text-xs">
                    <span className="font-semibold text-foreground">{videoFile.name}</span>
                    <span className="text-muted-foreground">{(videoFile.size / 1_000_000).toFixed(1)} MB</span>
                    <button type="button" onClick={() => { setVideoFile(null); setDirty(true) }} className="text-muted-foreground hover:text-foreground" aria-label="Remove video">
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                )}
                <Callout tone="neutral" title="Renditions are added in the editor.">
                  4K is stream-only; 1080p is the default offline video file. The editor simulates the upload states until R2 is wired.
                </Callout>
              </div>
            )}

            {step === 4 && (
              <div className="space-y-3">
                <Callout tone="gold" title="Two or three short cards from the client description.">
                  They are context, not a historical reconstruction. Each card has a timecode in seconds.
                </Callout>
                {(form.textCards ?? []).map((card, index) => (
                  <div key={index} className="grid gap-2 rounded-lg border border-border bg-[var(--surface-2)] p-3 sm:grid-cols-[90px_minmax(0,1fr)_36px]">
                    <div className="flex items-center gap-1">
                      <span className="font-sans text-lg font-bold text-[var(--amber-deep)]">{String(index + 1).padStart(2, '0')}</span>
                      <input aria-label={`Card ${index + 1} time in seconds`} type="number" min={0} value={card.at} onChange={(event) => setCard(index, { at: Number(event.target.value) || 0 })} className="h-8 w-16 rounded border border-border bg-card px-2 text-center text-xs" />
                      <span className="text-[10px] text-muted-foreground">s</span>
                    </div>
                    <textarea aria-label={`Card ${index + 1} text`} value={card.text} onChange={(event) => setCard(index, { text: event.target.value })} rows={2} className="rounded border border-border bg-card px-2 py-1.5 text-sm" />
                    <button type="button" aria-label={`Remove card ${index + 1}`} onClick={() => { setForm((prev) => ({ ...prev, textCards: (prev.textCards ?? []).filter((_, cardIndex) => cardIndex !== index) })); setDirty(true) }} className="flex h-8 w-8 items-center justify-center rounded border border-border bg-card text-muted-foreground hover:text-foreground">
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ))}
                <Button variant="outline" size="sm" disabled={(form.textCards ?? []).length >= 3} onClick={() => { setForm((prev) => ({ ...prev, textCards: [...(prev.textCards ?? []), { at: 40, text: '' }] })); setDirty(true) }}>
                  <Plus className="h-4 w-4" weight="bold" /> Add a card
                </Button>
              </div>
            )}

            {step === 5 && (
              <div className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <FormInput label="Rights record" value={form.rights ?? ''} onChange={(value) => setField('rights', value)} placeholder="Client footage · signed release" />
                  <FormInput label="Rights expiry" type="date" value={form.rightsExpiry ?? ''} onChange={(value) => setField('rightsExpiry', value)} />
                  <div className="sm:col-span-2">
                    <FormInput label="Cultural authority / consent" value={form.consent ?? ''} onChange={(value) => setField('consent', value)} placeholder="Recorded consent" />
                  </div>
                  <FormSelect label="Review tier" value={form.sensitivity ?? 'standard'} options={Object.entries(SENSITIVITY_LABEL).map(([value, label]) => ({ value, label }))} onChange={(value) => setField('sensitivity', value as Sensitivity)} />
                </div>
                <Callout tone="neutral" title="The wizard creates a draft.">
                  Review and readiness happen in the full editor; publish is disabled until the gate is clear. An administrator reviews; the editor can submit.
                </Callout>
              </div>
            )}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border px-5 py-4">
            <Button variant="outline" size="sm" onClick={() => setStep((value) => Math.max(1, value - 1))} disabled={step === 1}>
              <CaretLeft className="h-4 w-4" weight="bold" /> Back
            </Button>
            <span className="text-xs text-muted-foreground">Step {step} of {STEPS.length} · {STEPS[step - 1]}</span>
            {step < STEPS.length ? (
              <Button size="sm" onClick={continueStep}>Continue <CaretRight className="h-4 w-4" weight="bold" /></Button>
            ) : (
              <Button size="sm" onClick={create}><Plus className="h-4 w-4" weight="bold" /> Create draft</Button>
            )}
          </div>
        </div>

        <aside className="rounded-lg border border-border bg-card p-4 shadow-sm">
          <Kicker>Draft summary</Kicker>
          <p className="mt-2 font-sans text-xl font-bold text-foreground">{form.title || 'Untitled experience'}</p>
          <p className="text-xs text-muted-foreground">{site?.name ?? 'Site not set'} · {ACCESS_LABEL[form.mode]}</p>
          <div className="mt-4 space-y-2 text-xs text-muted-foreground">
            <p><strong className="text-foreground">Cards:</strong> {(form.textCards ?? []).length} of 3</p>
            <p><strong className="text-foreground">Rights:</strong> {form.rights ? form.rights : 'Not recorded'}</p>
            <p><strong className="text-foreground">Review tier:</strong> {SENSITIVITY_LABEL[form.sensitivity ?? 'standard']}</p>
          </div>
          <p className="mt-4 text-xs text-muted-foreground">At least two text cards, English captions, a transcript, a video master, a 1080p video file, a poster, rights, and consent are required before publish.</p>
        </aside>
      </div>

      <DirtyGuard dirty={dirty} />
    </div>
  )
}
