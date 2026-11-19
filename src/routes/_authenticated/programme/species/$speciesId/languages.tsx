import { useMemo, useState } from 'react'
import { createFileRoute, Link } from '@tanstack/react-router'
import { ArrowSquareOut, GlobeHemisphereWest, Microphone } from '@phosphor-icons/react'
import { Button } from '#/components/ui/button'
import { Input } from '#/components/ui/input'
import { Textarea } from '#/components/ui/textarea'
import { FormField } from '#/components/shared/FormField'
import { FormDialog } from '#/components/shell/FormDialog'
import { PageHeader } from '#/components/shell/PageHeader'
import { DataStateView } from '#/components/shell/DataState'
import {
  ContractGapNote,
  SectionCard,
  StatusPill,
  VariantStatusPill,
} from '#/components/species/shared'
import { useSpecies } from '#/lib/species/store'
import { useSpeciesDetail } from '#/lib/species/api'
import { contractsApi, unwrap } from '#/lib/contracts/client'
import { notify } from '#/lib/toast'
import {
  buildVariantViews,
  formatDate,
  languageLabel,
  type SpeciesDetail,
  type VariantView,
} from '#/lib/species/model'

interface LanguageSearch {
  variant?: string
}

export const Route = createFileRoute('/_authenticated/programme/species/$speciesId/languages')({
  validateSearch: (search: Record<string, unknown>): LanguageSearch => ({
    variant: typeof search.variant === 'string' ? search.variant : undefined,
  }),
  loader: async ({ params, context }) => {
    await context.queryClient.ensureQueryData({
      queryKey: ['species', 'detail', 'default', params.speciesId],
      queryFn: async () => {
        const result = await contractsApi.GET('/v1/admin/species/{id}', {
          params: { path: { id: params.speciesId } },
        })
        return { detail: unwrap(result) as SpeciesDetail, stale: false }
      },
    })
  },
  component: SpeciesLanguagesRoute,
})

function SpeciesLanguagesRoute() {
  const { speciesId } = Route.useParams()
  const { client, fixtureState, details } = useSpecies()
  const query = useSpeciesDetail(client, fixtureState, speciesId)
  const detail = query.data?.detail ?? details.find((entry) => entry.slug === speciesId) ?? null

  if (fixtureState === 'error' || query.isError) {
    return (
      <div className="space-y-4">
        <PageHeader title="Language coverage" description="Names, prose and audio per language." />
        <DataStateView
          state="error"
          title="Language coverage could not load"
          description="No partial variants are shown. Retry the panel."
          onRetry={() => void query.refetch()}
        />
      </div>
    )
  }

  if (!detail) {
    return (
      <div className="space-y-4">
        <PageHeader title="Language coverage" description="Names, prose and audio per language." />
        {query.isPending ? (
          <DataStateView state="loading" title="Loading language coverage" />
        ) : (
          <DataStateView
            state="empty"
            title="Species not found"
            description="Open a species from the catalogue to review its language coverage."
            action={
              <Button variant="outline" size="sm" asChild>
                <Link to="/programme/species/catalogue">Back to the catalogue</Link>
              </Button>
            }
          />
        )}
      </div>
    )
  }

  return <LanguagesView detail={detail} />
}

type DialogKind = 'name' | 'prose' | 'audio'

function LanguagesView({ detail }: { detail: SpeciesDetail }) {
  const { overlay, can, fixtureState } = useSpecies()
  const search = Route.useSearch()
  const views = buildVariantViews(detail, overlay)
  const [dialog, setDialog] = useState<{ kind: DialogKind; language: string } | null>(null)
  const focused = views.find((view) => view.language === search.variant) ?? null
  const [selected, setSelected] = useState(focused?.language ?? views[0]?.language ?? 'en')
  const selectedView = views.find((view) => view.language === selected) ?? views[0] ?? null
  const canEdit = can('species.translate') || can('species.edit_base')
  const canReview = can('species.review_language')
  const disabled = fixtureState === 'stale'

  return (
    <div className="space-y-4">
      <PageHeader
        title={`Language coverage · ${detail.nameEn}`}
        description="Per-language names, prose and audio. Missing prose falls back to English visibly."
        badge={<span className="text-xs text-muted-foreground">{detail.scientificName}</span>}
        actions={
          <>
            <Button variant="outline" size="sm" asChild>
              <Link to="/programme/species/$speciesId" params={{ speciesId: detail.slug }}>
                Base record
              </Link>
            </Button>
            <Button variant="outline" size="sm" asChild>
              <Link to="/programme/species/readiness" search={{ species: detail.slug }}>
                Readiness
              </Link>
            </Button>
          </>
        }
      />

      <SectionCard
        title="Variants"
        description="Contributor, region and source are visible where the name is reviewed."
        actions={<span className="text-[11px] text-muted-foreground">{views.length} languages</span>}
      >
        <div className="overflow-x-auto">
          <table className="w-full min-w-[960px] text-sm">
            <caption className="sr-only">Language variants with name, prose, audio and provenance</caption>
            <thead>
              <tr className="border-b border-border text-left text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
                <th className="px-2 py-2">Language</th>
                <th className="px-2 py-2">Name</th>
                <th className="px-2 py-2">Name review</th>
                <th className="px-2 py-2">Prose</th>
                <th className="px-2 py-2">Audio</th>
                <th className="px-2 py-2">Contributor / reviewer</th>
                <th className="px-2 py-2">Region / source</th>
                <th className="px-2 py-2">Updated</th>
                <th className="px-2 py-2 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {views.map((view) => (
                <tr
                  key={view.language}
                  className={`border-b border-border last:border-0 ${
                    selected === view.language ? 'bg-muted/40' : ''
                  }`}
                >
                  <td className="px-2 py-2">
                    <button
                      type="button"
                      onClick={() => setSelected(view.language)}
                      className="text-left font-semibold text-foreground hover:text-primary"
                    >
                      {view.label}
                    </button>
                    <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
                      {view.language} · {view.tier}
                    </p>
                  </td>
                  <td className="px-2 py-2 text-xs">{view.name ?? '—'}</td>
                  <td className="px-2 py-2">
                    <VariantStatusPill status={view.nameStatus} />
                  </td>
                  <td className="px-2 py-2">
                    <VariantStatusPill status={view.proseStatus} />
                  </td>
                  <td className="px-2 py-2">
                    <VariantStatusPill status={view.audioStatus} />
                  </td>
                  <td className="px-2 py-2 text-xs text-muted-foreground">
                    {view.contributor ?? '—'}
                    <span className="block text-[10px]">reviewer {view.reviewer ?? '—'}</span>
                  </td>
                  <td className="px-2 py-2 text-xs text-muted-foreground">
                    {view.region ?? 'Region not set'}
                    <span className="block text-[10px]">{view.sourceLabel ?? 'Source not recorded'}</span>
                  </td>
                  <td className="px-2 py-2 text-xs text-muted-foreground">
                    {formatDate(view.updatedAt)}
                  </td>
                  <td className="px-2 py-2">
                    <div className="flex flex-wrap justify-end gap-1">
                      <Button
                        variant="outline"
                        size="xs"
                        disabled={!canEdit || disabled}
                        onClick={() => setDialog({ kind: 'name', language: view.language })}
                      >
                        Name
                      </Button>
                      <Button
                        variant="outline"
                        size="xs"
                        disabled={!canEdit || disabled}
                        onClick={() => setDialog({ kind: 'prose', language: view.language })}
                      >
                        Prose
                      </Button>
                      <Button
                        variant="outline"
                        size="xs"
                        disabled={!canEdit || disabled}
                        onClick={() => setDialog({ kind: 'audio', language: view.language })}
                      >
                        Audio
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </SectionCard>

      <div className="grid gap-4 xl:grid-cols-[1.4fr_0.9fr]">
        <SectionCard
          title={`Audio records · ${selectedView?.label ?? 'language'}`}
          description="Speaker, consent reference, duration and playback. Audio is never a text field."
          actions={<StatusPill status={selectedView?.audioStatus ?? 'missing'} />}
        >
          <AudioRecords detail={detail} language={selectedView?.language ?? 'en'} />
        </SectionCard>

        <div className="space-y-4">
          <SectionCard title="Fallback preview" description="What the app shows when prose is missing.">
            <div className="rounded-lg border border-border bg-muted/30 px-3 py-2 text-xs">
              <p className="font-semibold text-foreground">
                Name: {selectedView?.name ?? detail.nameSw ?? detail.nameEn}
              </p>
              <p className="mt-1 text-muted-foreground">
                {selectedView && selectedView.proseStatus === 'reviewed'
                  ? `${selectedView.label} prose is complete.`
                  : `${selectedView?.label ?? 'This language'} prose is incomplete, so the app shows English prose with a visible “English fallback” label.`}
              </p>
            </div>
            <p className="mt-2 flex items-start gap-2 text-[11px] text-muted-foreground">
              <GlobeHemisphereWest className="mt-0.5 size-4 shrink-0 text-primary" weight="duotone" />
              Fallback is never silent and never labelled as the local language.
            </p>
          </SectionCard>

          <SectionCard title="Per-variant provenance" description="Who contributed, where, and from which source.">
            {selectedView ? (
              <dl className="grid grid-cols-[8rem_1fr] gap-x-3 gap-y-2 text-xs">
                <dt className="font-semibold text-muted-foreground">Language</dt>
                <dd className="text-foreground">{languageLabel(selectedView.language)}</dd>
                <dt className="font-semibold text-muted-foreground">Contributor</dt>
                <dd className="text-foreground">{selectedView.contributor ?? 'Not recorded'}</dd>
                <dt className="font-semibold text-muted-foreground">Reviewer</dt>
                <dd className="text-foreground">{selectedView.reviewer ?? 'Not reviewed'}</dd>
                <dt className="font-semibold text-muted-foreground">Region</dt>
                <dd className="text-foreground">{selectedView.region ?? 'Not recorded'}</dd>
                <dt className="font-semibold text-muted-foreground">Source</dt>
                <dd className="text-foreground">{selectedView.sourceLabel ?? 'Not recorded'}</dd>
                <dt className="font-semibold text-muted-foreground">Stale</dt>
                <dd className={selectedView.stale ? 'font-semibold text-destructive' : 'text-foreground'}>
                  {selectedView.stale ? selectedView.staleReason ?? 'Yes' : 'No'}
                </dd>
              </dl>
            ) : null}
            <p className="mt-2 text-[11px] text-muted-foreground">
              Contributor and reviewer must differ. Review is limited to a language reviewer; the
              server enforces it.
            </p>
          </SectionCard>
        </div>
      </div>

      <ContractGapNote>
        The admin detail returns the requested language's prose and a coverage summary, not every
        variant. Rows outside the resolved language show the coverage tier and reviewed name/audio
        records; their per-field review state arrives when the detail contract returns a variants
        array.
      </ContractGapNote>

      {dialog ? (
        <VariantDialog
          key={`${dialog.kind}:${dialog.language}`}
          kind={dialog.kind}
          detail={detail}
          language={dialog.language}
          view={views.find((entry) => entry.language === dialog.language) ?? null}
          canReview={canReview}
          onClose={() => setDialog(null)}
        />
      ) : null}
    </div>
  )
}

function AudioRecords({ detail, language }: { detail: SpeciesDetail; language: string }) {
  const { overlay, can, fixtureState } = useSpecies()
  const draft = overlay.audioDrafts[`${detail.slug}:${language}`]
  const record = detail.audio?.find((entry) => entry.language === language)
  const canEdit = can('species.translate') || can('species.edit_base')

  if (!record && !draft) {
    return (
      <div className="space-y-2">
        <p className="flex items-start gap-2 rounded-lg border border-dashed border-border bg-muted/30 px-3 py-4 text-sm text-muted-foreground">
          <Microphone className="mt-0.5 size-4 text-muted-foreground" weight="duotone" />
          No audio record for this language. The app shows an explicit unavailable state rather than
          labelling English audio as this language.
        </p>
        {canEdit ? (
          <p className="text-[11px] text-muted-foreground">
            Use the Audio action in the row above to attach the speaker, consent and duration.
          </p>
        ) : null}
      </div>
    )
  }

  const url = draft?.url || record?.url
  return (
    <div className="space-y-3">
      {url ? (
        <audio controls src={url} className="w-full" aria-label={`${languageLabel(language)} audio record`}>
          Your browser cannot play this audio.
        </audio>
      ) : null}
      <dl className="grid grid-cols-[8rem_1fr] gap-x-3 gap-y-2 text-xs">
        <dt className="font-semibold text-muted-foreground">Speaker</dt>
        <dd className="text-foreground">{draft?.narrator ?? record?.narrator ?? 'Not recorded'}</dd>
        <dt className="font-semibold text-muted-foreground">Consent</dt>
        <dd className="text-foreground">
          {draft?.consentRecord ?? record?.rights?.consentRecord ?? 'Not recorded'}
        </dd>
        <dt className="font-semibold text-muted-foreground">Duration</dt>
        <dd className="text-foreground">
          {draft?.durationSeconds ?? record?.durationSeconds ?? '—'} seconds
        </dd>
        <dt className="font-semibold text-muted-foreground">Review</dt>
        <dd>
          <StatusPill status={draft?.status ?? record?.reviewStatus ?? 'draft'} />
        </dd>
        <dt className="font-semibold text-muted-foreground">Rights</dt>
        <dd className="text-foreground">
          {record?.rights ? (
            <span>
              {record.rights.rightsHolder} · {record.rights.licenceCode}
            </span>
          ) : draft ? (
            <span>
              {draft.rightsHolder || 'Rights holder not set'} · {draft.licenceCode || 'Licence not set'}
            </span>
          ) : (
            'Not recorded'
          )}
        </dd>
      </dl>
      {record?.transcript || draft?.transcript ? (
        <div className="rounded-lg border border-border bg-muted/30 px-3 py-2">
          <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">Transcript</p>
          <p className="mt-1 text-xs text-foreground">{draft?.transcript ?? record?.transcript}</p>
        </div>
      ) : null}
      {fixtureState === 'stale' ? (
        <p className="text-[11px] text-muted-foreground">Writes are disabled in a stale snapshot.</p>
      ) : null}
    </div>
  )
}

function VariantDialog({
  kind,
  detail,
  language,
  view,
  canReview,
  onClose,
}: {
  kind: DialogKind
  detail: SpeciesDetail
  language: string
  view: VariantView | null
  canReview: boolean
  onClose: () => void
}) {
  const { overlay, saveName, saveVariant, saveAudio, reviewName, reviewVariant, reviewAudio } =
    useSpecies()
  const key = `${detail.slug}:${language}`
  const nameDraft = overlay.nameDrafts[key]
  const variantDraft = overlay.variantDrafts[key]
  const audioDraft = overlay.audioDrafts[key]
  const existingProse = detail.content?.language === language ? detail.content : null
  const nameRecord = detail.names?.find((entry) => entry.language === language)
  const audioRecord = detail.audio?.find((entry) => entry.language === language)

  const [name, setName] = useState(nameDraft?.name ?? nameRecord?.name ?? '')
  const [region, setRegion] = useState(nameDraft?.region ?? nameRecord?.region ?? '')
  const [sourceLabel, setSourceLabel] = useState(
    nameDraft?.sourceLabel ?? nameRecord?.source?.attribution ?? '',
  )
  const [summary, setSummary] = useState(variantDraft?.summary ?? existingProse?.summary ?? '')
  const [description, setDescription] = useState(
    variantDraft?.description ?? existingProse?.description ?? '',
  )
  const [habitat, setHabitat] = useState(variantDraft?.habitat ?? existingProse?.habitat ?? '')
  const [range, setRange] = useState(variantDraft?.range ?? existingProse?.range ?? '')
  const [whereToSee, setWhereToSee] = useState(
    variantDraft?.whereToSee ?? existingProse?.whereToSee ?? '',
  )
  const [conservation, setConservation] = useState(
    variantDraft?.conservation ?? existingProse?.conservation ?? '',
  )
  const [narrator, setNarrator] = useState(audioDraft?.narrator ?? audioRecord?.narrator ?? '')
  const [consent, setConsent] = useState(
    audioDraft?.consentRecord ?? audioRecord?.rights?.consentRecord ?? '',
  )
  const [duration, setDuration] = useState(
    String(audioDraft?.durationSeconds ?? audioRecord?.durationSeconds ?? ''),
  )
  const [url, setUrl] = useState(audioDraft?.url ?? audioRecord?.url ?? '')
  const [storageKey, setStorageKey] = useState(audioDraft?.storageKey ?? '')
  const [transcript, setTranscript] = useState(
    audioDraft?.transcript ?? audioRecord?.transcript ?? '',
  )
  const [error, setError] = useState<string | null>(null)

  const title =
    kind === 'name'
      ? `${view?.label ?? language} name · ${detail.nameEn}`
      : kind === 'prose'
        ? `${view?.label ?? language} prose · ${detail.nameEn}`
        : `${view?.label ?? language} audio · ${detail.nameEn}`

  const review = useMemo(
    () =>
      kind === 'name'
        ? nameDraft?.status === 'reviewed'
        : kind === 'audio'
          ? audioDraft?.status === 'reviewed'
          : variantDraft?.status === 'reviewed',
    [audioDraft?.status, kind, nameDraft?.status, variantDraft?.status],
  )
  const hasRevision =
    kind === 'name'
      ? Boolean(nameDraft || nameRecord)
      : kind === 'audio'
        ? Boolean(audioDraft || audioRecord)
        : Boolean(variantDraft || existingProse)

  async function save() {
    setError(null)
    try {
      if (kind === 'name') {
        if (!name.trim()) throw new Error('Record the name.')
        if (!sourceLabel.trim()) throw new Error('Record the source for this name.')
        await saveName(detail, language, { name: name.trim(), region, sourceLabel })
        notify.success(`${view?.label ?? language} name saved as a draft.`)
      } else if (kind === 'prose') {
        await saveVariant(detail, language, {
          tier: (existingProse?.coverageTier ?? view?.tier ?? 'full') as
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
        notify.success(`${view?.label ?? language} prose saved as a draft.`)
      } else {
        if (!narrator.trim()) throw new Error('Record the speaker.')
        if (!consent.trim()) throw new Error('Record the consent reference.')
        const seconds = Number(duration)
        if (!Number.isFinite(seconds) || seconds <= 0) throw new Error('Record the duration.')
        if (!url.trim() && !storageKey.trim()) throw new Error('Attach the audio file.')
        await saveAudio(detail, language, {
          narrator: narrator.trim(),
          consentRecord: consent.trim(),
          durationSeconds: Math.round(seconds),
          storageKey: storageKey.trim() || url.trim(),
          url: url.trim() || storageKey.trim(),
          transcript,
          rightsHolder: audioDraft?.rightsHolder ?? audioRecord?.rights?.rightsHolder ?? '',
          licenceCode: audioDraft?.licenceCode ?? audioRecord?.rights?.licenceCode ?? '',
        })
        notify.success(`${view?.label ?? language} audio record saved.`)
      }
      onClose()
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Could not save this variant.')
    }
  }

  async function markReviewed() {
    setError(null)
    if (!hasRevision) {
      setError('Save the variant before reviewing it.')
      return
    }
    try {
      if (kind === 'name') await reviewName(detail, language, 'Reviewed in the language screen')
      else if (kind === 'prose') await reviewVariant(detail, language, 'Reviewed in the language screen')
      else await reviewAudio(detail, language, 'Reviewed in the language screen')
      notify.success(`${view?.label ?? language} variant reviewed.`)
      onClose()
    } catch (reviewError) {
      setError(reviewError instanceof Error ? reviewError.message : 'Could not record this review.')
    }
  }

  return (
    <FormDialog
      open
      onOpenChange={(open) => {
        if (!open) onClose()
      }}
      title={title}
      description="Names are per language and region. The reviewer must differ from the contributor."
      submitLabel={kind === 'audio' ? 'Save audio record' : kind === 'name' ? 'Save name' : 'Save prose'}
      error={error}
      onSubmit={save}
    >
      {kind === 'name' ? (
        <>
          <FormField label="Local name">
            <Input value={name} onChange={(event) => setName(event.target.value)} />
          </FormField>
          <div className="grid gap-3 sm:grid-cols-2">
            <FormField label="Region / community">
              <Input value={region} onChange={(event) => setRegion(event.target.value)} />
            </FormField>
            <FormField label="Source">
              <Input value={sourceLabel} onChange={(event) => setSourceLabel(event.target.value)} />
            </FormField>
          </div>
          <p className="text-[11px] text-muted-foreground">
            Contributor {nameDraft?.contributor ?? 'you'} · current review{' '}
            {nameDraft?.status ?? nameRecord?.reviewStatus ?? 'missing'}
          </p>
        </>
      ) : null}

      {kind === 'prose' ? (
        <>
          <FormField label="Summary">
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
        </>
      ) : null}

      {kind === 'audio' ? (
        <>
          {url ? (
            <audio controls src={url} className="w-full" aria-label="Audio preview">
              Your browser cannot play this audio.
            </audio>
          ) : null}
          <div className="grid gap-3 sm:grid-cols-2">
            <FormField label="Speaker / narrator">
              <Input value={narrator} onChange={(event) => setNarrator(event.target.value)} />
            </FormField>
            <FormField label="Consent reference">
              <Input value={consent} onChange={(event) => setConsent(event.target.value)} />
            </FormField>
            <FormField label="Duration (seconds)">
              <Input
                type="number"
                min={1}
                value={duration}
                onChange={(event) => setDuration(event.target.value)}
              />
            </FormField>
            <FormField label="Storage key">
              <Input value={storageKey} onChange={(event) => setStorageKey(event.target.value)} />
            </FormField>
          </div>
          <FormField label="Audio URL">
            <Input value={url} onChange={(event) => setUrl(event.target.value)} />
          </FormField>
          <FormField label="Transcript">
            <Textarea
              value={transcript}
              onChange={(event) => setTranscript(event.target.value)}
              rows={3}
            />
          </FormField>
          <p className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
            <Microphone className="size-3.5" weight="bold" />
            Consent and rights are records, not copy. Rights review happens on the sources screen.
          </p>
        </>
      ) : null}

      {canReview ? (
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={markReviewed}
          disabled={review || !hasRevision}
          title={!hasRevision ? 'Save the variant before reviewing it' : undefined}
        >
          {review ? 'Already reviewed' : 'Mark reviewed · reviewer only'}
        </Button>
      ) : null}
      <a
        href={`https://www.iucnredlist.org/search?query=${encodeURIComponent(detail.scientificName)}`}
        target="_blank"
        rel="noreferrer"
        className="inline-flex items-center gap-1 text-[11px] font-semibold text-primary hover:underline"
      >
        IUCN reference for the scientific name <ArrowSquareOut className="size-3" weight="bold" />
      </a>
    </FormDialog>
  )
}
