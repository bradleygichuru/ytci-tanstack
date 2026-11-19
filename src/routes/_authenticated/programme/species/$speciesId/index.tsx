import { useEffect, useMemo, useState } from 'react'
import { createFileRoute, Link } from '@tanstack/react-router'
import { ArrowSquareOut, SealCheck, WarningCircle } from '@phosphor-icons/react'
import { Button } from '#/components/ui/button'
import { Input } from '#/components/ui/input'
import { FormField } from '#/components/shared/FormField'
import { PageHeader } from '#/components/shell/PageHeader'
import { DataStateView } from '#/components/shell/DataState'
import { Can } from '#/components/shell/Gates'
import { ContractGapNote, SectionCard, StatusPill, VariantStatusPill } from '#/components/species/shared'
import { DirtyStatus, useDirtyGuard } from '#/components/species/dirty-guard'
import { useSpecies } from '#/lib/species/store'
import { useSpeciesDetail } from '#/lib/species/api'
import { contractsApi, unwrap } from '#/lib/contracts/client'
import { notify } from '#/lib/toast'
import {
  buildVariantViews,
  formatDate,
  type BaseDraft,
  type SpeciesDetail,
} from '#/lib/species/model'

export const Route = createFileRoute('/_authenticated/programme/species/$speciesId/')({
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
  component: SpeciesEditorRoute,
})

const IUCN_CATEGORIES = ['CR', 'EN', 'VU', 'NT', 'LC', 'DD', 'NE'] as const

function SpeciesEditorRoute() {
  const { speciesId } = Route.useParams()
  const { client, fixtureState, details, overlay } = useSpecies()
  const query = useSpeciesDetail(client, fixtureState, speciesId)
  const detail = query.data?.detail ?? details.find((entry) => entry.slug === speciesId) ?? null

  if (fixtureState === 'error' || query.isError) {
    return (
      <div className="space-y-4">
        <PageHeader title="Species editor" description="Language-neutral base, taxonomy and evidence." />
        <DataStateView
          state="error"
          title="This species record could not load"
          description="No partial record is shown. Retry the panel; the live content stays unchanged."
          onRetry={() => void query.refetch()}
        />
      </div>
    )
  }

  if (!detail) {
    return (
      <div className="space-y-4">
        <PageHeader title="Species editor" description="Language-neutral base, taxonomy and evidence." />
        {query.isPending ? (
          <DataStateView state="loading" title="Loading the species record" />
        ) : (
          <DataStateView
            state="empty"
            title="Species not found"
            description="This record is outside the loaded sample or no longer exists. Return to the catalogue and open a species from the list."
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

  return (
    <BaseEditor
      key={`${detail.slug}:${overlay.baseDrafts[detail.slug]?.savedAt ?? detail.contentVersion ?? 0}`}
      detail={detail}
    />
  )
}

function toDraft(detail: SpeciesDetail): BaseDraft {
  return {
    scientificName: detail.scientificName,
    slug: detail.slug,
    authorship: detail.authorship ?? '',
    taxonomicRank: detail.rank ?? 'species',
    taxonomicStatus: detail.taxonomicStatus ?? 'accepted',
    gbifKey: detail.gbifKey ?? '',
    iucnCategory: detail.iucn?.category ?? detail.iucnCategory ?? 'NE',
    iucnAssessmentId: detail.iucn?.assessmentId ?? '',
    redListVersion: detail.iucn?.redListVersion ?? '',
    baseRevision: detail.contentVersion ?? 0,
    savedAt: '',
  }
}

function BaseEditor({ detail }: { detail: SpeciesDetail }) {
  const {
    fixtureState,
    can,
    overlay,
    saveBase,
    submitForPublication,
  } = useSpecies()
  const retained = overlay.baseDrafts[detail.slug]
  const baseline = useMemo(() => retained ?? toDraft(detail), [detail, retained])
  const [draft, setDraft] = useState<BaseDraft>(baseline)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const dirty = JSON.stringify(draft) !== JSON.stringify(baseline)
  const guard = useDirtyGuard({
    dirty,
    onDiscard: () => setDraft(baseline),
  })

  useEffect(() => {
    setDraft(baseline)
  }, [baseline])

  const views = buildVariantViews(detail, overlay)
  const published = Boolean(overlay.published[detail.slug]) || detail.publicationState === 'published'
  const stagedRevision = dirty || Boolean(retained)
  const disabled = fixtureState === 'stale' || !can('species.edit_base')
  const liveState = overlay.published[detail.slug]
    ? 'published'
    : overlay.publicationRequests[detail.slug]
      ? 'in_review'
      : detail.publicationState ?? 'draft'

  function set<K extends keyof BaseDraft>(key: K, value: BaseDraft[K]) {
    setDraft((current) => ({ ...current, [key]: value }))
  }

  async function save() {
    setError(null)
    setSaving(true)
    try {
      const result = await saveBase(detail, {
        scientificName: draft.scientificName.trim(),
        slug: draft.slug.trim(),
        authorship: draft.authorship,
        taxonomicRank: draft.taxonomicRank,
        taxonomicStatus: draft.taxonomicStatus,
        gbifKey: draft.gbifKey,
        iucnCategory: draft.iucnCategory,
        iucnAssessmentId: draft.iucnAssessmentId,
        redListVersion: draft.redListVersion,
      })
      notify.success(
        published
          ? 'Revision saved. Live content is unchanged until publish.'
          : result.changedProse
            ? 'Base saved. Dependent translations now derive stale.'
            : 'Base saved.',
      )
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Could not save the base record.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-4">
      {guard.dialog}
      <PageHeader
        title={`Edit · ${detail.nameEn}`}
        description="The base is language-neutral. Names, prose and audio live in per-language variants."
        badge={
          <div className="flex flex-wrap items-center gap-1.5">
            <StatusPill status={liveState} />
            {stagedRevision ? <StatusPill status="draft" label="Revision draft" /> : null}
            {retained ? <StatusPill status="draft" label="Retained draft" /> : null}
          </div>
        }
        actions={
          <>
            <Button variant="outline" size="sm" asChild>
              <Link
                to="/programme/species/$speciesId/languages"
                params={{ speciesId: detail.slug }}
                search={{ variant: 'sw' }}
              >
                Language coverage
              </Link>
            </Button>
            <Button variant="outline" size="sm" asChild>
              <Link to="/programme/species/readiness" search={{ species: detail.slug }}>
                Publication readiness
              </Link>
            </Button>
          </>
        }
      />

      {retained ? (
        <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/40 px-3 py-2 text-xs text-muted-foreground" role="status">
          <SealCheck className="size-4 text-primary" weight="duotone" />
          <span>
            A draft from {formatDate(retained.savedAt)} is retained in this browser. Saving updates it;
            publishing is still gated by readiness.
          </span>
          <Button
            variant="ghost"
            size="xs"
            className="ml-auto"
            onClick={() => {
              setDraft(toDraft(detail))
              setError(null)
            }}
          >
            Restore live values
          </Button>
        </div>
      ) : null}

      {!can('species.edit_base') ? (
        <div className="rounded-lg border border-border bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
          Your role can read this record but not edit the base. The fields stay visible with the
          save actions hidden.
        </div>
      ) : null}

      <div className="grid gap-4 xl:grid-cols-[1.4fr_0.9fr]">
        <div className="space-y-4">
          <SectionCard title="Identity" description="Language-neutral taxonomy. English names are a variant.">
            <div className="grid gap-3 sm:grid-cols-2">
              <FormField label="Scientific name" description="Edits need a source before publish.">
                <Input
                  value={draft.scientificName}
                  onChange={(event) => set('scientificName', event.target.value)}
                  disabled={disabled}
                />
              </FormField>
              <FormField label="Slug" description="Used by the public route.">
                <Input
                  value={draft.slug}
                  onChange={(event) => set('slug', event.target.value)}
                  disabled={disabled}
                />
              </FormField>
              <FormField label="Authorship">
                <Input
                  value={draft.authorship}
                  onChange={(event) => set('authorship', event.target.value)}
                  disabled={disabled}
                />
              </FormField>
              <FormField label="Taxonomic rank">
                <Input
                  value={draft.taxonomicRank}
                  onChange={(event) => set('taxonomicRank', event.target.value)}
                  disabled={disabled}
                />
              </FormField>
              <FormField label="Taxonomic status">
                <select
                  value={draft.taxonomicStatus}
                  onChange={(event) => set('taxonomicStatus', event.target.value)}
                  disabled={disabled}
                  className="h-9 w-full rounded-md border border-input bg-card px-3 text-sm disabled:opacity-50"
                >
                  {['accepted', 'synonym', 'provisional', 'uncertain'].map((value) => (
                    <option key={value} value={value}>
                      {value}
                    </option>
                  ))}
                </select>
              </FormField>
              <FormField label="GBIF key">
                <Input
                  value={draft.gbifKey}
                  onChange={(event) => set('gbifKey', event.target.value)}
                  disabled={disabled}
                />
              </FormField>
            </div>
            <p className="mt-3 text-[11px] text-muted-foreground">
              English common name: <strong className="text-foreground">{detail.nameEn}</strong>. Edit it
              on the language screen; the base never carries a language-specific name.
            </p>
          </SectionCard>

          <SectionCard
            title="Conservation status"
            description="Category only. The Red List page is linked out; no status text is copied."
          >
            <div className="grid gap-3 sm:grid-cols-2">
              <FormField label="IUCN category">
                <select
                  value={draft.iucnCategory}
                  onChange={(event) => set('iucnCategory', event.target.value)}
                  disabled={disabled}
                  className="h-9 w-full rounded-md border border-input bg-card px-3 text-sm disabled:opacity-50"
                >
                  {IUCN_CATEGORIES.map((code) => (
                    <option key={code} value={code}>
                      {code}
                    </option>
                  ))}
                </select>
              </FormField>
              <FormField label="Assessment id">
                <Input
                  value={draft.iucnAssessmentId}
                  onChange={(event) => set('iucnAssessmentId', event.target.value)}
                  disabled={disabled}
                />
              </FormField>
              <FormField label="Red List version">
                <Input
                  value={draft.redListVersion}
                  onChange={(event) => set('redListVersion', event.target.value)}
                  disabled={disabled}
                />
              </FormField>
              <div className="rounded-lg border border-border bg-muted/30 px-3 py-2 text-xs">
                <p className="font-semibold text-foreground">Link-out</p>
                <a
                  href={`https://www.iucnredlist.org/search?query=${encodeURIComponent(detail.scientificName)}`}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-1 inline-flex items-center gap-1 font-semibold text-primary hover:underline"
                >
                  Search the IUCN Red List <ArrowSquareOut className="size-3.5" weight="bold" />
                </a>
                <p className="mt-1 text-[11px] text-muted-foreground">
                  Assessment {draft.iucnAssessmentId || 'not recorded'} · version{' '}
                  {draft.redListVersion || 'not recorded'}
                </p>
              </div>
            </div>
          </SectionCard>

          <SectionCard
            title="Habitat and range"
            description="Language-neutral base, English prose reference. Other languages fall back visibly."
            actions={
              <Button variant="outline" size="xs" asChild>
                <Link
                  to="/programme/species/$speciesId/languages"
                  params={{ speciesId: detail.slug }}
                  search={{ variant: 'en' }}
                >
                  Edit English prose
                </Link>
              </Button>
            }
          >
            <dl className="grid gap-3 text-xs sm:grid-cols-2">
              <div className="rounded-lg border border-border bg-muted/30 px-3 py-2">
                <dt className="font-semibold text-muted-foreground">Habitat</dt>
                <dd className="mt-0.5 text-foreground">
                  {detail.content?.habitat ?? 'Not set · the English variant has no habitat yet.'}
                </dd>
              </div>
              <div className="rounded-lg border border-border bg-muted/30 px-3 py-2">
                <dt className="font-semibold text-muted-foreground">Range</dt>
                <dd className="mt-0.5 text-foreground">
                  {detail.content?.range ?? 'Not set · the English variant has no range yet.'}
                </dd>
              </div>
            </dl>
            <p className="mt-2 text-[11px] text-muted-foreground">
              The base record holds taxonomy and conservation only; habitat and range are prose
              fields on the English variant, so a base edit stales every dependent translation.
            </p>
          </SectionCard>

          <SectionCard
            title="Where to see"
            description="Evidence records, not free text. Every site carries a source and confidence."
            actions={
              <span className="text-[11px] text-muted-foreground">
                {detail.whereToSee?.length ?? 0} record{detail.whereToSee?.length === 1 ? '' : 's'}
              </span>
            }
          >
            {(detail.whereToSee ?? []).length === 0 ? (
              <p className="flex items-center gap-2 rounded-lg border border-dashed border-border bg-muted/30 px-3 py-4 text-sm text-muted-foreground">
                <WarningCircle className="size-4 text-destructive" weight="duotone" />
                No where-to-see evidence. Publishing stays blocked until a site has a source.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[640px] text-sm">
                  <caption className="sr-only">Where-to-see evidence records</caption>
                  <thead>
                    <tr className="border-b border-border text-left text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
                      <th className="px-2 py-2">Site</th>
                      <th className="px-2 py-2">Evidence</th>
                      <th className="px-2 py-2">Confidence</th>
                      <th className="px-2 py-2">Source</th>
                      <th className="px-2 py-2">Review</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(detail.whereToSee ?? []).map((record, index) => (
                      <tr
                        key={`${record.destinationSlug ?? record.protectedArea ?? index}`}
                        className="border-b border-border last:border-0"
                      >
                        <td className="px-2 py-2">
                          <p className="font-semibold text-foreground">
                            {record.protectedArea ?? record.destinationSlug ?? 'Unnamed site'}
                          </p>
                          <p className="text-[11px] text-muted-foreground">
                            {record.county ?? 'County not set'}
                            {record.countyGid ? ` · GID ${record.countyGid}` : ''}
                          </p>
                        </td>
                        <td className="px-2 py-2 text-xs capitalize">
                          {record.evidenceType?.replace('_', ' ')}
                          {record.copy ? (
                            <span className="block text-[11px] text-muted-foreground">{record.copy}</span>
                          ) : null}
                        </td>
                        <td className="px-2 py-2 text-xs capitalize">{record.confidence}</td>
                        <td className="px-2 py-2 text-xs">
                          {record.source ? (
                            <span title={record.source.attribution}>{record.source.publisher}</span>
                          ) : (
                            <span className="font-semibold text-destructive">No source</span>
                          )}
                        </td>
                        <td className="px-2 py-2">
                          <StatusPill status={record.reviewStatus ?? 'draft'} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <p className="mt-2 text-[11px] text-muted-foreground">
              The evidence record is read-only in this contract; the write endpoint is not frozen
              yet. Existing records are rendered with their provenance rather than a text field.
            </p>
          </SectionCard>

          <SectionCard
            title="Language variants"
            description="Names, prose and audio per language. A base edit stales dependent prose."
            actions={
              <Button variant="outline" size="sm" asChild>
                <Link
                  to="/programme/species/$speciesId/languages"
                  params={{ speciesId: detail.slug }}
                  search={{ variant: 'sw' }}
                >
                  Manage languages
                </Link>
              </Button>
            }
          >
            <div className="overflow-x-auto">
              <table className="w-full min-w-[620px] text-sm">
                <caption className="sr-only">Language variant status</caption>
                <thead>
                  <tr className="border-b border-border text-left text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
                    <th className="px-2 py-2">Language</th>
                    <th className="px-2 py-2">Name</th>
                    <th className="px-2 py-2">Name review</th>
                    <th className="px-2 py-2">Prose</th>
                    <th className="px-2 py-2">Audio</th>
                    <th className="px-2 py-2 text-right">Open</th>
                  </tr>
                </thead>
                <tbody>
                  {views.map((view) => (
                    <tr key={view.language} className="border-b border-border last:border-0">
                      <td className="px-2 py-2">
                        <p className="font-semibold text-foreground">{view.label}</p>
                        <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
                          {view.language}
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
                      <td className="px-2 py-2 text-right">
                        <Button variant="ghost" size="xs" asChild>
                          <Link
                            to="/programme/species/$speciesId/languages"
                            params={{ speciesId: detail.slug }}
                            search={{ variant: view.language }}
                          >
                            Open
                          </Link>
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </SectionCard>
        </div>

        <div className="space-y-4">
          <SectionCard title="Revision state" description="A published edit stays staged until publish.">
            <dl className="grid grid-cols-[8rem_1fr] gap-x-3 gap-y-2 text-xs">
              <dt className="font-semibold text-muted-foreground">Live state</dt>
              <dd>
                <StatusPill status={liveState} />
              </dd>
              <dt className="font-semibold text-muted-foreground">Base revision</dt>
              <dd className="text-foreground">
                v{draft.baseRevision}
                {retained ? ` · draft saved ${formatDate(retained.savedAt)}` : ' · no staged draft'}
              </dd>
              <dt className="font-semibold text-muted-foreground">Content version</dt>
              <dd className="text-foreground">v{detail.contentVersion ?? 0}</dd>
              <dt className="font-semibold text-muted-foreground">Stale variants</dt>
              <dd className={views.some((view) => view.stale) ? 'font-semibold text-destructive' : 'text-foreground'}>
                {views.filter((view) => view.stale).length}
              </dd>
              <dt className="font-semibold text-muted-foreground">Review state</dt>
              <dd className="text-foreground">{detail.content?.reviewStatus ?? 'missing'}</dd>
            </dl>
            {views.some((view) => view.stale) ? (
              <p className="mt-3 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-xs text-destructive">
                A base change staled {views.filter((view) => view.stale).length} dependent variant(s).
                Publishing stays blocked until a reviewer clears them.
              </p>
            ) : null}
            <div className="mt-3 flex flex-wrap gap-2">
              <Can permission="species.edit_base">
                <Button size="sm" onClick={save} disabled={saving || disabled || !dirty}>
                  {published ? 'Save revision' : 'Save draft'}
                </Button>
              </Can>
              <Can permission="species.edit_base">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={saving || disabled}
                  onClick={async () => {
                    await save()
                    await submitForPublication(detail)
                    notify.success('Submitted for review. Readiness still gates publish.')
                  }}
                >
                  Submit for review
                </Button>
              </Can>
            </div>
            <div className="mt-2">
              <DirtyStatus dirty={dirty} />
            </div>
            {error ? (
              <p className="mt-2 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-xs font-semibold text-destructive" role="alert">
                {error}
              </p>
            ) : null}
          </SectionCard>

          <SectionCard title="Sources on this record" description="Rights and attribution are publish gates.">
            {(detail.sources ?? []).length === 0 ? (
              <p className="text-sm text-destructive">No source is attached. Publishing is blocked.</p>
            ) : (
              <ul className="space-y-2">
                {(detail.sources ?? []).map((source) => (
                  <li key={source.id} className="rounded-lg border border-border px-3 py-2 text-xs">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-semibold text-foreground">{source.publisher}</span>
                      <StatusPill status={source.reviewStatus ?? 'draft'} />
                    </div>
                    <p className="mt-0.5 text-muted-foreground">
                      {source.licenceCode} · {source.permittedUse.replace('_', ' ')}
                    </p>
                    {source.url ? (
                      <a
                        href={source.url}
                        target="_blank"
                        rel="noreferrer"
                        className="mt-1 inline-flex items-center gap-1 font-semibold text-primary hover:underline"
                      >
                        Open evidence <ArrowSquareOut className="size-3" weight="bold" />
                      </a>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
            <Button variant="outline" size="sm" className="mt-3" asChild>
              <Link to="/programme/species/sources" search={{ source: 'none' }}>
                Open sources & rights
              </Link>
            </Button>
          </SectionCard>

          <ContractGapNote>
            The admin detail returns only the requested language's prose. This editor therefore shows
            the English habitat through its variant record and links to the language screen for other
            languages. The base write contract has no habitat or where-to-see fields; those stay
            variant/evidence records.
          </ContractGapNote>
        </div>
      </div>
    </div>
  )
}
