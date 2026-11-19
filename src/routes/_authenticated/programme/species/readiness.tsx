import { useMemo, useState } from 'react'
import { createFileRoute, Link } from '@tanstack/react-router'
import { Check, CheckCircle, SealCheck, X } from '@phosphor-icons/react'
import { Button } from '#/components/ui/button'
import { Textarea } from '#/components/ui/textarea'
import { FormField } from '#/components/shared/FormField'
import { FormDialog } from '#/components/shell/FormDialog'
import { PageHeader } from '#/components/shell/PageHeader'
import { DataStateView } from '#/components/shell/DataState'
import {
  ContractGapNote,
  SectionCard,
  StatusPill,
} from '#/components/species/shared'
import { useSpecies } from '#/lib/species/store'
import { useSpeciesDetail } from '#/lib/species/api'
import { notify } from '#/lib/toast'
import {
  deriveReadiness,
  type ReadinessCheck,
} from '#/lib/species/model'

interface ReadinessSearch {
  species?: string
}

export const Route = createFileRoute('/_authenticated/programme/species/readiness')({
  validateSearch: (search: Record<string, unknown>): ReadinessSearch => ({
    species: typeof search.species === 'string' ? search.species : undefined,
  }),
  component: ReadinessPage,
})

function ReadinessPage() {
  const {
    fixtureState,
    setFixtureState,
    rows,
    details,
    sources,
    rights,
    reviewItems,
    tasks,
    overlay,
    can,
    actor,
    client,
  } = useSpecies()
  const search = Route.useSearch()
  const navigate = Route.useNavigate()
  const fallbackSlug = search.species ?? rows[0]?.slug ?? ''
  const selected = fallbackSlug
  const query = useSpeciesDetail(client, fixtureState, selected || null)
  const detail = query.data?.detail ?? details.find((entry) => entry.slug === selected) ?? null
  const [secondOpen, setSecondOpen] = useState(false)
  const [publishOpen, setPublishOpen] = useState(false)
  const [requestOpen, setRequestOpen] = useState(false)
  const [requestNote, setRequestNote] = useState('')
  const [note, setNote] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)
  const { recordSecondReview, publish, decideReview } = useSpecies()

  const readiness = useMemo(() => {
    if (!detail) return null
    return deriveReadiness({
      detail,
      sources,
      rights,
      reviewItems,
      overlay,
      tasks,
    })
  }, [detail, overlay, reviewItems, rights, sources, tasks])

  const canSecondReview = can('species.review_language') || can('species.expert_review')
  const canPublish = can('species.publish')
  const disabled = fixtureState === 'stale'

  if (fixtureState === 'empty') {
    return (
      <div className="space-y-4">
        <PageHeader title="Publication readiness" description="Blockers, second review and the publish gate." />
        <DataStateView
          state="empty"
          title="No species to review"
          description="The catalogue is empty for this state. Return to live data to review readiness."
          action={
            <Button variant="outline" size="sm" onClick={() => setFixtureState('default')}>
              Use live data
            </Button>
          }
        />
      </div>
    )
  }

  if (fixtureState === 'error') {
    return (
      <div className="space-y-4">
        <PageHeader title="Publication readiness" description="Blockers, second review and the publish gate." />
        <DataStateView
          state="error"
          title="Readiness could not load"
          description="Publishing is disabled from a partial read. Retry the panel."
          onRetry={() => setFixtureState('default')}
        />
      </div>
    )
  }

  if (!detail || !readiness) {
    return (
      <div className="space-y-4">
        <PageHeader title="Publication readiness" description="Blockers, second review and the publish gate." />
        {query.isPending && rows.length > 0 ? (
          <DataStateView state="loading" title="Loading readiness" />
        ) : (
          <DataStateView
            state="empty"
            title="Choose a species"
            description="Open a species from the catalogue to see its readiness checks."
            action={
              <Button variant="outline" size="sm" asChild>
                <Link to="/programme/species/catalogue">Open the catalogue</Link>
              </Button>
            }
          />
        )}
      </div>
    )
  }

  const secondReview = overlay.secondReviews[detail.slug]
  const blockers = readiness.blockers
  const rightsWithdrawn = rights.filter((record) => overlay.withdrawnRights[record.id])
  const pendingReview = reviewItems.find(
    (item) => item.speciesSlug === detail.slug && item.status === 'pending',
  )

  return (
    <div className="space-y-4">
      <PageHeader
        title="Publication readiness"
        description="Every blocker names its record and links to the exact variant. Publish stays blocked while any derived stale variant exists."
        badge={
          <StatusPill
            status={blockers.length === 0 ? 'reviewed' : 'stale'}
            label={`${blockers.length} blocker${blockers.length === 1 ? '' : 's'}`}
          />
        }
        actions={
          <>
            <label htmlFor="readiness-species" className="sr-only">
              Species
            </label>
            <select
              id="readiness-species"
              value={selected}
              onChange={(event) =>
                void navigate({ search: { species: event.target.value } })
              }
              className="h-8 rounded-md border border-border bg-card px-2 text-xs font-semibold"
            >
              {rows.map((row) => (
                <option key={row.slug} value={row.slug}>
                  {row.nameEn}
                </option>
              ))}
            </select>
            <Button variant="outline" size="sm" asChild>
              <Link to="/programme/species/catalogue">All species</Link>
            </Button>
          </>
        }
      />

      <div className="grid gap-4 xl:grid-cols-[1.4fr_0.9fr]">
        <SectionCard
          title="Readiness"
          description={`${detail.nameEn} · ${detail.scientificName}`}
          actions={<StatusPill status={detail.publicationState ?? 'draft'} />}
        >
          <p className="mb-3 text-xs text-muted-foreground">
            Contributor {detail.content?.translatorRef ?? actor.name} · reviewer must differ ·{' '}
            {detail.contentVersion ? `base v${detail.contentVersion}` : 'no base revision'}
          </p>
          <ul className="space-y-2">
            {readiness.checks.map((check) => (
              <li key={check.id} className="flex items-start gap-2.5">
                <span
                  className={`mt-0.5 inline-flex size-4 items-center justify-center rounded-full ${
                    check.ok ? 'bg-primary/10 text-primary' : 'bg-destructive/10 text-destructive'
                  }`}
                  aria-hidden
                >
                  {check.ok ? (
                    <Check className="size-3" weight="bold" />
                  ) : (
                    <X className="size-3" weight="bold" />
                  )}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-foreground">
                    {check.label}
                    {!check.ok ? (
                      <span className="ml-1 text-xs text-muted-foreground">({check.record.type})</span>
                    ) : null}
                  </p>
                  {!check.ok ? (
                    <p className="mt-0.5 text-[11px] text-muted-foreground">
                      {check.consequence} Record:{' '}
                      <span className="font-mono text-[10px]">{check.record.id}</span>
                    </p>
                  ) : null}
                </div>
                {!check.ok ? (
                  <BlockerLink check={check} />
                ) : null}
              </li>
            ))}
          </ul>

          <div className="mt-4 rounded-lg border border-border bg-muted/30 px-3 py-3">
            <p className="text-sm font-semibold text-foreground">Publish</p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {readiness.canPublish
                ? 'All checks pass. Publishing makes the species and its reviewed language variants live.'
                : 'Publishing is blocked until every item above is clear.'}
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              {canPublish ? (
                <Button
                  size="sm"
                  disabled={!readiness.canPublish || disabled}
                  onClick={() => setPublishOpen(true)}
                >
                  Publish
                </Button>
              ) : (
                <span className="self-center text-[11px] font-semibold text-muted-foreground">
                  Publish is limited to a publisher or administrator.
                </span>
              )}
              {canSecondReview ? (
                <Button
                  variant="outline"
                  size="sm"
                  disabled={disabled || Boolean(secondReview)}
                  onClick={() => {
                    setNote('')
                    setError(null)
                    setSecondOpen(true)
                  }}
                >
                  {secondReview ? 'Second review recorded' : 'Record second review'}
                </Button>
              ) : (
                <span className="self-center text-[11px] text-muted-foreground">
                  A language reviewer records the second review.
                </span>
              )}
              {canSecondReview ? (
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={disabled || !pendingReview}
                  onClick={() => {
                    setRequestNote('')
                    setError(null)
                    setRequestOpen(true)
                  }}
                  title={
                    pendingReview
                      ? 'Record a changes-requested decision on the open review item'
                      : 'No open review item for this species'
                  }
                >
                  Request changes
                </Button>
              ) : null}
            </div>
          </div>
        </SectionCard>

        <div className="space-y-4">
          <SectionCard title="Fallback preview" description="What a Kiswahili reader sees today.">
            <p className="text-xs">
              Name: <strong className="text-foreground">{readiness.fallback.name ?? '—'}</strong>
            </p>
            <p className="mt-1.5 text-xs text-muted-foreground">{readiness.fallback.prose}</p>
            {readiness.fallback.used ? (
              <p className="mt-2 rounded-md border border-dashed border-border bg-muted/40 px-2 py-1 text-[11px] font-semibold text-foreground">
                English fallback label is shown in the app.
              </p>
            ) : null}
            <Button variant="outline" size="sm" className="mt-3" asChild>
              <Link
                to="/programme/species/$speciesId/languages"
                params={{ speciesId: detail.slug }}
                search={{ variant: 'sw' }}
              >
                Open Kiswahili variant
              </Link>
            </Button>
          </SectionCard>

          <SectionCard
            title="Rights"
            actions={
              <StatusPill
                status={rightsWithdrawn.length === 0 ? 'active' : 'withdrawn'}
                label={rightsWithdrawn.length === 0 ? 'Clear' : 'Hold'}
              />
            }
          >
            <p className="text-xs text-muted-foreground">
              {rightsWithdrawn.length === 0
                ? 'All fact blocks point at an active source.'
                : 'A source or rights record was withdrawn. Replace it before publishing.'}
            </p>
            <Button variant="outline" size="sm" className="mt-3" asChild>
              <Link to="/programme/species/sources" search={{ source: 'none' }}>
                Open sources & rights
              </Link>
            </Button>
          </SectionCard>

          <SectionCard title="Second review" description="A recordable decision from a different reviewer.">
            {secondReview ? (
              <div className="text-xs">
                <p className="flex items-center gap-1.5 font-semibold text-foreground">
                  <SealCheck className="size-4 text-primary" weight="duotone" />
                  {secondReview.reviewer}
                </p>
                <p className="mt-1 text-muted-foreground">
                  {secondReview.role} · {new Date(secondReview.decidedAt).toLocaleString('en-GB')}
                </p>
                {secondReview.note ? (
                  <p className="mt-1 text-muted-foreground">{secondReview.note}</p>
                ) : null}
              </div>
            ) : (
              <p className="flex items-start gap-2 text-xs text-muted-foreground">
                <CheckCircle className="mt-0.5 size-4 shrink-0" weight="duotone" />
                No second review yet. A reviewer who is not the contributor records it here; publish
                stays blocked until then.
              </p>
            )}
          </SectionCard>
        </div>
      </div>

      <ContractGapNote>
        Readiness is computed from the loaded species detail, source registry, rights records and
        review queue. There is no species-audit endpoint in the contract, so the second-review record
        and decisions are kept in the browser overlay and the audit trail. The publish call itself is
        the frozen endpoint and returns the server's 409 when a gate is not met.
      </ContractGapNote>

      <FormDialog
        open={secondOpen}
        onOpenChange={setSecondOpen}
        title="Record second review"
        description={`${detail.nameEn} · the reviewer must differ from the contributor (${detail.content?.translatorRef ?? 'not recorded'}).`}
        submitLabel="Record review"
        error={error}
        pending={pending}
        onSubmit={async () => {
          setError(null)
          setPending(true)
          try {
            await recordSecondReview(detail, note)
            notify.success('Second review recorded.')
            setSecondOpen(false)
          } catch (reviewError) {
            setError(reviewError instanceof Error ? reviewError.message : 'Could not record the review.')
          } finally {
            setPending(false)
          }
        }}
      >
        <FormField label="Review note" description="What was checked against the base revision.">
          <Textarea value={note} onChange={(event) => setNote(event.target.value)} rows={3} />
        </FormField>
        <p className="text-[11px] text-muted-foreground">
          Signed in as {actor.name} · {actor.roleLabel}.
        </p>
      </FormDialog>

      <FormDialog
        open={requestOpen}
        onOpenChange={setRequestOpen}
        title="Request changes"
        description={`${detail.nameEn} · the decision is recorded against the open ${pendingReview?.stage ?? 'review'} item.`}
        submitLabel="Request changes"
        error={error}
        pending={pending}
        onSubmit={async () => {
          if (!pendingReview) {
            setError('No open review item for this species.')
            return
          }
          setError(null)
          setPending(true)
          try {
            await decideReview(pendingReview, 'changes_requested', requestNote)
            notify.success('Changes requested from the contributor.')
            setRequestOpen(false)
          } catch (requestError) {
            setError(
              requestError instanceof Error ? requestError.message : 'Could not record the decision.',
            )
          } finally {
            setPending(false)
          }
        }}
      >
        <FormField label="What needs to change" description="The contributor sees this note.">
          <Textarea
            value={requestNote}
            onChange={(event) => setRequestNote(event.target.value)}
            rows={3}
          />
        </FormField>
      </FormDialog>

      <FormDialog
        open={publishOpen}
        onOpenChange={setPublishOpen}
        title={`Publish ${detail.nameEn}`}
        description="Publishing makes the species and its reviewed language variants live."
        submitLabel="Publish"
        error={error}
        pending={pending}
        onSubmit={async () => {
          setError(null)
          setPending(true)
          try {
            const languages = [
              ...new Set(
                detail.coverage
                  ?.filter((entry) => entry.available)
                  .map((entry) => entry.language) ?? ['en'],
              ),
            ]
            for (const language of languages.length > 0 ? languages : ['en']) {
              await publish(detail, language)
            }
            notify.success(`${detail.nameEn} published for ${languages.length || 1} language(s).`)
            setPublishOpen(false)
          } catch (publishError) {
            setError(
              publishError instanceof Error ? publishError.message : 'The publish gate rejected this.',
            )
          } finally {
            setPending(false)
          }
        }}
      >
        <p className="text-xs text-muted-foreground">
          The server re-checks every gate. If a source, right, translation or review separation is
          missing, publish returns 409 and nothing goes live.
        </p>
      </FormDialog>
    </div>
  )
}

function BlockerLink({ check }: { check: ReadinessCheck }) {
  if (check.link.to === '/programme/species/$speciesId') {
    return (
      <Button variant="outline" size="xs" asChild>
        <Link to={check.link.to} params={check.link.params}>
          {check.fix}
        </Link>
      </Button>
    )
  }
  if (check.link.to === '/programme/species/$speciesId/languages') {
    return (
      <Button variant="outline" size="xs" asChild>
        <Link to={check.link.to} params={check.link.params} search={check.link.search}>
          {check.fix}
        </Link>
      </Button>
    )
  }
  if (check.link.to === '/programme/species/translation') {
    return (
      <Button variant="outline" size="xs" asChild>
        <Link to={check.link.to} search={check.link.search}>
          {check.fix}
        </Link>
      </Button>
    )
  }
  return (
    <Button variant="outline" size="xs" asChild>
      <Link to={check.link.to} search={check.link.search}>
        {check.fix}
      </Link>
    </Button>
  )
}


