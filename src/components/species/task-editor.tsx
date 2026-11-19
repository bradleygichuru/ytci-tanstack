/**
 * Type-specific translation editors.
 *
 * An audio task gets an audio record (speaker, consent, duration, playback), a
 * name task gets region and source, and prose gets the prose fields. No task is
 * forced through a prose-shaped textarea.
 */
import { useState } from 'react'
import { CheckCircle, LinkSimple, Microphone, WarningCircle } from '@phosphor-icons/react'
import { Button } from '#/components/ui/button'
import { Input } from '#/components/ui/input'
import { Textarea } from '#/components/ui/textarea'
import { FormField } from '#/components/shared/FormField'
import { Can } from '#/components/shell/Gates'
import { SectionCard, StatusPill } from '#/components/species/shared'
import { notify } from '#/lib/toast'
import { useSpecies } from '#/lib/species/store'
import {
  buildVariantViews,
  formatDate,
  type SpeciesDetail,
  type SpeciesTask,
} from '#/lib/species/model'

export function TaskEditor({
  task,
  detail,
}: {
  task: SpeciesTask
  detail: SpeciesDetail | null
}) {
  const {
    overlay,
    can,
    fixtureState,
    saveVariant,
    saveName,
    saveAudio,
    reviewVariant,
    reviewName,
    reviewAudio,
    decideReview,
    submitTask,
  } = useSpecies()
  const [note, setNote] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const language = task.language ?? 'en'
  const key = `${detail?.slug ?? task.speciesSlug}:${language}`
  const variant = detail ? buildVariantViews(detail, overlay).find((view) => view.language === language) : null
  const existingProse = detail?.content?.language === language ? detail.content : null
  const nameRecord = detail?.names?.find((entry) => entry.language === language)
  const audioRecord = detail?.audio?.find((entry) => entry.language === language)
  const proseDraft = overlay.variantDrafts[key]
  const nameDraft = overlay.nameDrafts[key]
  const audioDraft = overlay.audioDrafts[key]

  const [summary, setSummary] = useState(proseDraft?.summary ?? existingProse?.summary ?? '')
  const [description, setDescription] = useState(
    proseDraft?.description ?? existingProse?.description ?? '',
  )
  const [habitat, setHabitat] = useState(proseDraft?.habitat ?? existingProse?.habitat ?? '')
  const [range, setRange] = useState(proseDraft?.range ?? existingProse?.range ?? '')
  const [whereToSee, setWhereToSee] = useState(
    proseDraft?.whereToSee ?? existingProse?.whereToSee ?? '',
  )
  const [conservation, setConservation] = useState(
    proseDraft?.conservation ?? existingProse?.conservation ?? '',
  )
  const [name, setName] = useState(nameDraft?.name ?? nameRecord?.name ?? '')
  const [region, setRegion] = useState(nameDraft?.region ?? nameRecord?.region ?? '')
  const [sourceLabel, setSourceLabel] = useState(
    nameDraft?.sourceLabel ?? nameRecord?.source?.attribution ?? nameRecord?.source?.publisher ?? '',
  )
  const [narrator, setNarrator] = useState(audioDraft?.narrator ?? audioRecord?.narrator ?? '')
  const [consent, setConsent] = useState(audioDraft?.consentRecord ?? audioRecord?.rights?.consentRecord ?? '')
  const [duration, setDuration] = useState(
    String(audioDraft?.durationSeconds ?? audioRecord?.durationSeconds ?? ''),
  )
  const [storageKey, setStorageKey] = useState(audioDraft?.storageKey ?? '')
  const [url, setUrl] = useState(audioDraft?.url ?? audioRecord?.url ?? '')
  const [transcript, setTranscript] = useState(audioDraft?.transcript ?? audioRecord?.transcript ?? '')
  const [rightsHolder, setRightsHolder] = useState(
    audioDraft?.rightsHolder ?? audioRecord?.rights?.rightsHolder ?? '',
  )
  const [licenceCode, setLicenceCode] = useState(
    audioDraft?.licenceCode ?? audioRecord?.rights?.licenceCode ?? '',
  )

  if (!detail) {
    return (
      <SectionCard title={`Target · ${task.languageText}`}>
        <p className="text-sm text-muted-foreground">
          This species detail is outside the loaded sample. Open the species record to edit it.
        </p>
      </SectionCard>
    )
  }

  const disabled = fixtureState === 'stale'
  const canEdit = can('species.translate') || can('species.edit_base')
  const canReview = can('species.review_language')
  const hasRevision = Boolean(
    proseDraft ||
      nameDraft ||
      audioDraft ||
      (task.type === 'prose' && existingProse) ||
      (task.type === 'name' && nameRecord) ||
      (task.type === 'audio' && audioRecord),
  )

  async function persistDraft() {
    if (task.type === 'name') {
      if (!name.trim()) throw new Error('Record the local name.')
      if (!sourceLabel.trim()) throw new Error('Record the source for this name.')
      await saveName(detail!, language, { name: name.trim(), region, sourceLabel })
      return
    }
    if (task.type === 'audio') {
      if (!narrator.trim()) throw new Error('Record the speaker.')
      if (!consent.trim()) throw new Error('Record the consent reference.')
      const seconds = Number(duration)
      if (!Number.isFinite(seconds) || seconds <= 0) {
        throw new Error('Record the duration in seconds.')
      }
      if (!url.trim() && !storageKey.trim()) {
        throw new Error('Attach the audio file or its storage key.')
      }
      await saveAudio(detail!, language, {
        narrator: narrator.trim(),
        consentRecord: consent.trim(),
        durationSeconds: Math.round(seconds),
        storageKey: storageKey.trim() || url.trim(),
        url: url.trim() || storageKey.trim(),
        transcript,
        rightsHolder,
        licenceCode,
      })
      return
    }
    await saveVariant(detail!, language, {
      tier: (existingProse?.coverageTier ?? variant?.tier ?? 'full') as
        | 'full'
        | 'summary'
        | 'names'
        | 'audio',
      summary,
      description,
      habitat,
      range,
      whereToSee,
      conservation,
    })
  }

  async function saveDraft() {
    setError(null)
    setSaving(true)
    try {
      await persistDraft()
      notify.success(
        task.type === 'audio'
          ? `${task.languageText} audio record saved.`
          : task.type === 'name'
            ? `${task.languageText} name saved as a draft.`
            : `${task.languageText} prose saved as a draft.`,
      )
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Could not save this task.')
    } finally {
      setSaving(false)
    }
  }

  async function submit() {
    setError(null)
    setSaving(true)
    try {
      await persistDraft()
      await submitTask(task)
      notify.success('Submitted for review. The stale flag clears only on review.')
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Could not submit this task.')
    } finally {
      setSaving(false)
    }
  }

  async function approve() {
    setError(null)
    setSaving(true)
    try {
      if (task.type === 'name') {
        await reviewName(detail!, language, note)
      } else if (task.type === 'audio') {
        await reviewAudio(detail!, language, note)
      } else if (task.type === 'prose') {
        await reviewVariant(detail!, language, note)
      }
      if (task.reviewItemId) {
        const item = { ...task }
        await decideReview(
          {
            id: task.reviewItemId,
            entityType:
              item.type === 'audio'
                ? 'audio'
                : item.type === 'name'
                  ? 'name'
                  : item.type === 'media'
                    ? 'media'
                    : item.type === 'where_to_see'
                      ? 'where_to_see'
                      : 'content',
            entityId: item.entityId,
            speciesSlug: item.speciesSlug,
            language: item.language,
            stage: item.stage,
            status: 'pending',
            translatorRef: item.contributor,
          },
          'approved',
          note,
        )
      }
      notify.success(`${task.languageText} ${task.type} reviewed.`)
    } catch (reviewError) {
      setError(reviewError instanceof Error ? reviewError.message : 'Could not record this review.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <SectionCard
      title={`Target · ${task.languageText}`}
      description={`${task.type.replace('_', ' ')} task · ${task.stage} stage`}
      actions={<StatusPill status={task.state} />}
    >
      {task.state === 'stale' ? (
        <div className="mb-3 flex gap-2 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-xs text-destructive" role="status">
          <WarningCircle className="mt-0.5 size-4 shrink-0" weight="duotone" />
          <span>
            <strong>Stale, derived from the base revision.</strong> {task.staleReason} Saving a
            draft keeps the flag; only a review clears it.
          </span>
        </div>
      ) : null}

      {task.type === 'base' ? (
        <div className="space-y-3 text-sm text-muted-foreground">
          <p>The base record is edited on the species screen; it carries no language prose.</p>
          <Button variant="outline" size="sm" asChild>
            <a href={`/programme/species/${task.speciesSlug}`}>Open the species base</a>
          </Button>
        </div>
      ) : null}

      {task.type === 'prose' ? (
        <div className="space-y-3">
          <FormField label="Summary" description="One or two sentences for the app card.">
            <Textarea value={summary} onChange={(event) => setSummary(event.target.value)} rows={2} />
          </FormField>
          <FormField label="Habitat">
            <Textarea value={habitat} onChange={(event) => setHabitat(event.target.value)} rows={2} />
          </FormField>
          <div className="grid gap-3 sm:grid-cols-2">
            <FormField label="Range">
              <Textarea value={range} onChange={(event) => setRange(event.target.value)} rows={2} />
            </FormField>
            <FormField label="Where to see">
              <Textarea value={whereToSee} onChange={(event) => setWhereToSee(event.target.value)} rows={2} />
            </FormField>
          </div>
          <FormField label="Conservation">
            <Textarea
              value={conservation}
              onChange={(event) => setConservation(event.target.value)}
              rows={2}
            />
          </FormField>
          <FormField label="Full description">
            <Textarea
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              rows={3}
            />
          </FormField>
        </div>
      ) : null}

      {task.type === 'name' ? (
        <div className="space-y-3">
          <div className="rounded-lg border border-border bg-muted/30 px-3 py-2 text-xs">
            <p className="font-semibold text-foreground">Contributor {nameDraft?.contributor ?? 'not recorded'}</p>
            <p className="text-muted-foreground">
              Reviewer must differ. {nameDraft?.status === 'reviewed' ? 'Reviewed.' : 'Not yet reviewed.'}
            </p>
          </div>
          <FormField label="Local name" description="Record the name as written.">
            <Input value={name} onChange={(event) => setName(event.target.value)} />
          </FormField>
          <div className="grid gap-3 sm:grid-cols-2">
            <FormField label="Region / community">
              <Input value={region} onChange={(event) => setRegion(event.target.value)} placeholder="e.g. Nyeri" />
            </FormField>
            <FormField label="Source" description="Named elder, speaker or archive.">
              <Input value={sourceLabel} onChange={(event) => setSourceLabel(event.target.value)} />
            </FormField>
          </div>
        </div>
      ) : null}

      {task.type === 'audio' ? (
        <div className="space-y-3">
          <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/30 px-3 py-2 text-xs">
            <Microphone className="size-4 text-primary" weight="duotone" />
            <span className="font-semibold text-foreground">Audio is a record, not a paragraph.</span>
            <span className="text-muted-foreground">Speaker, consent, duration and playback.</span>
          </div>
          {url ? (
            <audio controls src={url} className="w-full" aria-label={`${task.languageText} pronunciation audio`}>
              Your browser cannot play this audio.
            </audio>
          ) : null}
          <div className="grid gap-3 sm:grid-cols-2">
            <FormField label="Speaker / narrator">
              <Input value={narrator} onChange={(event) => setNarrator(event.target.value)} />
            </FormField>
            <FormField label="Consent reference">
              <Input value={consent} onChange={(event) => setConsent(event.target.value)} placeholder="consent-2026-03" />
            </FormField>
            <FormField label="Duration (seconds)">
              <Input
                type="number"
                min={1}
                value={duration}
                onChange={(event) => setDuration(event.target.value)}
              />
            </FormField>
            <FormField label="Rights holder">
              <Input value={rightsHolder} onChange={(event) => setRightsHolder(event.target.value)} />
            </FormField>
            <FormField label="Licence">
              <Input value={licenceCode} onChange={(event) => setLicenceCode(event.target.value)} />
            </FormField>
            <FormField label="Storage key">
              <Input value={storageKey} onChange={(event) => setStorageKey(event.target.value)} />
            </FormField>
          </div>
          <FormField label="Audio URL / playback">
            <Input value={url} onChange={(event) => setUrl(event.target.value)} placeholder="https://cdn.example.ke/…" />
          </FormField>
          <FormField label="Transcript">
            <Textarea value={transcript} onChange={(event) => setTranscript(event.target.value)} rows={3} />
          </FormField>
          {variant?.audioStatus === 'reviewed' ? (
            <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <CheckCircle className="size-4 text-primary" weight="duotone" />
              Reviewed record on file {audioRecord?.durationSeconds ? `· ${audioRecord.durationSeconds}s` : ''}
            </p>
          ) : null}
        </div>
      ) : null}

      {task.type === 'media' ? (
        <div className="space-y-2 text-sm text-muted-foreground">
          <p>Media tasks carry credit, rights holder, licence and per-language alt text.</p>
          <Button variant="outline" size="sm" asChild>
            <a href="/programme/species/sources">
              <LinkSimple className="size-4" weight="bold" /> Open sources and rights
            </a>
          </Button>
        </div>
      ) : null}

      {task.type === 'where_to_see' ? (
        <div className="space-y-2 text-sm text-muted-foreground">
          <p>Where-to-see tasks are evidence records: site, evidence type, confidence and source.</p>
          <Button variant="outline" size="sm" asChild>
            <a href={`/programme/species/${task.speciesSlug}`}>Open the evidence records</a>
          </Button>
        </div>
      ) : null}

      <FormField label="Review note" description="Shared with the contributor when changes are requested.">
        <Input value={note} onChange={(event) => setNote(event.target.value)} placeholder="What changed, and why?" />
      </FormField>

      {error ? (
        <p className="mt-2 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-xs font-semibold text-destructive" role="alert">
          {error}
        </p>
      ) : null}

      <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-border pt-3">
        <Can permission="species.translate">
          <Button size="sm" onClick={saveDraft} disabled={saving || disabled || !canEdit}>
            Save draft
          </Button>
        </Can>
        <Can permission="species.translate">
          <Button variant="outline" size="sm" onClick={submit} disabled={saving || disabled}>
            Submit for review
          </Button>
        </Can>
        {canReview ? (
          <Button
            size="sm"
            variant="secondary"
            onClick={approve}
            disabled={saving || disabled || task.state === 'reviewed' || !hasRevision}
            title={!hasRevision ? 'Save the record before reviewing it' : undefined}
          >
            Mark reviewed · reviewer only
          </Button>
        ) : (
          <span className="text-xs text-muted-foreground">Review is limited to a language reviewer.</span>
        )}
        <span className="ml-auto text-[11px] text-muted-foreground">
          Contributor {nameDraft?.contributor ?? task.contributor ?? 'not recorded'} · updated{' '}
          {formatDate(nameDraft?.updatedAt ?? variant?.updatedAt ?? null)}
        </span>
      </div>
    </SectionCard>
  )
}
