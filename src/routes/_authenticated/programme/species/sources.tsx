import { useMemo, useState } from 'react'
import { createFileRoute, Link } from '@tanstack/react-router'
import { ArrowSquareOut, Lock, ShieldWarning } from '@phosphor-icons/react'
import { Button } from '#/components/ui/button'
import { Textarea } from '#/components/ui/textarea'
import { FormField } from '#/components/shared/FormField'
import { FormDialog } from '#/components/shell/FormDialog'
import { PageHeader } from '#/components/shell/PageHeader'
import { DataStateView } from '#/components/shell/DataState'
import { Can } from '#/components/shell/Gates'
import {
  ContractGapNote,
  SectionCard,
  StatusPill,
} from '#/components/species/shared'
import { useSpecies } from '#/lib/species/store'
import { notify } from '#/lib/toast'
import {
  computeRightsImpact,
  computeSourceImpact,
  formatDate,
  isRevocableSource,
  rightsImpactLabel,
  rightsIsActive,
  rightsStatus,
  type RightsImpactEntry,
  type SpeciesRights,
  type SpeciesSource,
} from '#/lib/species/model'

interface SourcesSearch {
  source?: string
}

export const Route = createFileRoute('/_authenticated/programme/species/sources')({
  validateSearch: (search: Record<string, unknown>): SourcesSearch => ({
    source: typeof search.source === 'string' ? search.source : undefined,
  }),
  component: SourcesPage,
})

const WITHDRAW_REASONS = [
  'Choose a reason',
  'Licence changed',
  'Permission expired',
  'Attribution dispute',
  'Source withdrawn',
]

function SourcesPage() {
  const {
    fixtureState,
    setFixtureState,
    sources,
    rights,
    details,
    overlay,
    can,
    withdrawSource,
    withdrawRights,
    actor,
  } = useSpecies()
  const search = Route.useSearch()
  const [sourceTarget, setSourceTarget] = useState<SpeciesSource | null>(null)
  const [rightsTarget, setRightsTarget] = useState<SpeciesRights | null>(null)

  const sourceImpact = useMemo(
    () => (sourceTarget ? computeSourceImpact(sourceTarget, details, sources, rights) : null),
    [details, rights, sourceTarget, sources],
  )
  const rightsImpact = useMemo(
    () => (rightsTarget ? computeRightsImpact(rightsTarget, details) : []),
    [details, rightsTarget],
  )

  const canSeeRights =
    can('species.edit_base') || can('species.review_rights') || can('species.publish')

  if (fixtureState === 'empty') {
    return (
      <div className="space-y-4">
        <PageHeader title="Sources & rights" description="Licence, attribution, coverage and withdrawal." />
        <DataStateView
          state="empty"
          title="No source records"
          description="The source registry is empty for this state. Return to live data to see the sample records."
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
        <PageHeader title="Sources & rights" description="Licence, attribution, coverage and withdrawal." />
        <DataStateView
          state="error"
          title="Sources and rights could not load"
          description="No partial rights are shown; a withdrawal cannot be recorded from a partial read."
          onRetry={() => setFixtureState('default')}
        />
      </div>
    )
  }

  if (!canSeeRights) {
    return (
      <div className="space-y-4">
        <PageHeader title="Sources & rights" description="Licence, attribution, coverage and withdrawal." />
        <DataStateView
          state="empty"
          title="Permission required"
          description="Only content editors, rights reviewers and publishers can open rights records. Translators can see coverage and attribution on the language screen."
          action={
            <Button variant="outline" size="sm" asChild>
              <Link to="/programme/species">Back to overview</Link>
            </Button>
          }
        />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title="Sources & rights"
        description="Attribution and permission are publish gates. A withdrawal names its blast radius and requires a replacement source in the same act."
      />

      <SectionCard
        title="Source registry"
        description="Only revocable sources can be withdrawn. Taxonomy, link-out and public-domain sources stay fixed."
        actions={<span className="text-[11px] text-muted-foreground">{sources.length} sources</span>}
      >
        {sources.length === 0 ? (
          <p className="text-sm text-destructive">No source records. Publishing is blocked.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-sm">
              <caption className="sr-only">Sources, licences, attribution and withdrawal state</caption>
              <thead>
                <tr className="border-b border-border text-left text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
                  <th className="px-2 py-2">Source</th>
                  <th className="px-2 py-2">Licence</th>
                  <th className="px-2 py-2">Attribution</th>
                  <th className="px-2 py-2">Coverage</th>
                  <th className="px-2 py-2">Status</th>
                  <th className="px-2 py-2">Evidence</th>
                  <th className="px-2 py-2 text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {sources.map((source) => {
                  const withdrawn = overlay.withdrawnSources[source.id]
                  const impact = computeSourceImpact(source, details, sources, rights)
                  const revocable = isRevocableSource(source)
                  const highlighted = search.source === source.id
                  return (
                    <tr
                      key={source.id}
                      className={`border-b border-border last:border-0 ${
                        highlighted ? 'bg-primary/5' : ''
                      }`}
                    >
                      <td className="px-2 py-2">
                        <p className="font-semibold text-foreground">{source.publisher}</p>
                        <p className="max-w-[18rem] text-[11px] text-muted-foreground">{source.citation}</p>
                      </td>
                      <td className="px-2 py-2 text-xs">
                        {source.licenceCode}
                        <span className="block text-[10px] text-muted-foreground">
                          {source.permittedUse.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="px-2 py-2 text-xs text-muted-foreground">{source.attribution}</td>
                      <td className="px-2 py-2 text-xs">
                        {impact.affected.length} loaded species
                        {impact.rights.length > 0 ? (
                          <span className="block text-[10px] text-muted-foreground">
                            {impact.rights.length} rights record{impact.rights.length === 1 ? '' : 's'}
                          </span>
                        ) : null}
                      </td>
                      <td className="px-2 py-2">
                        <StatusPill status={withdrawn ? 'withdrawn' : source.reviewStatus ?? 'draft'} />
                        {withdrawn ? (
                          <p className="mt-0.5 text-[10px] text-muted-foreground">
                            {formatDate(withdrawn.withdrawnAt)} · {withdrawn.reason}
                          </p>
                        ) : null}
                      </td>
                      <td className="px-2 py-2 text-xs">
                        {source.url ? (
                          <a
                            href={source.url}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 font-semibold text-primary hover:underline"
                          >
                            Open <ArrowSquareOut className="size-3" weight="bold" />
                          </a>
                        ) : (
                          <span className="text-muted-foreground">No link</span>
                        )}
                        <span className="block text-[10px] text-muted-foreground">
                          accessed {formatDate(source.accessedAt)}
                        </span>
                      </td>
                      <td className="px-2 py-2 text-right">
                        {withdrawn ? (
                          <span className="text-[11px] text-muted-foreground">Withdrawn</span>
                        ) : revocable ? (
                          <Can permission="species.rights_withdraw">
                            <Button
                              variant="destructive"
                              size="xs"
                              onClick={() => setSourceTarget(source)}
                              aria-label={`Withdraw ${source.publisher}`}
                            >
                              Withdraw
                            </Button>
                          </Can>
                        ) : (
                          <span
                            className="inline-flex items-center gap-1 text-[11px] text-muted-foreground"
                            title="Taxonomy, link-out and public-domain sources cannot be revoked by us."
                          >
                            <Lock className="size-3" weight="bold" /> Not revocable
                          </span>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </SectionCard>

      <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-xs text-destructive">
        <p className="flex items-start gap-2">
          <ShieldWarning className="mt-0.5 size-4 shrink-0" weight="duotone" />
          <span>
            Withdrawing a source is not a delete: dependent species are unpublished, the audit entry
            keeps the reason, and publishing stays blocked until a replacement source covers every
            affected fact block. GBIF (CC0) and the IUCN link-out are never targets.
          </span>
        </p>
      </div>

      <SectionCard
        title="Rights records"
        description="Media and audio rights with consent, expiry and withdrawal."
        actions={<span className="text-[11px] text-muted-foreground">{rights.length} records</span>}
      >
        {rights.length === 0 ? (
          <p className="text-sm text-muted-foreground">No rights records loaded.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[820px] text-sm">
              <caption className="sr-only">Rights records for media and audio</caption>
              <thead>
                <tr className="border-b border-border text-left text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
                  <th className="px-2 py-2">Subject</th>
                  <th className="px-2 py-2">Rights holder</th>
                  <th className="px-2 py-2">Licence / consent</th>
                  <th className="px-2 py-2">Expiry</th>
                  <th className="px-2 py-2">Status</th>
                  <th className="px-2 py-2 text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {rights.map((record) => {
                  const withdrawn = overlay.withdrawnRights[record.id]
                  const impact = computeRightsImpact(record, details)
                  return (
                    <tr key={record.id} className="border-b border-border last:border-0">
                      <td className="px-2 py-2">
                        <p className="font-semibold capitalize text-foreground">{record.subjectType}</p>
                        <p className="text-[10px] text-muted-foreground">{record.subjectId}</p>
                        <p className="text-[10px] text-muted-foreground">
                          {impact.length} loaded species affected
                        </p>
                      </td>
                      <td className="px-2 py-2 text-xs">{record.rightsHolder}</td>
                      <td className="px-2 py-2 text-xs">
                        {record.licenceCode}
                        <span className="block text-[10px] text-muted-foreground">
                          consent {record.consentRecord ?? 'not recorded'}
                        </span>
                      </td>
                      <td className="px-2 py-2 text-xs text-muted-foreground">
                        {record.expiresAt ? formatDate(record.expiresAt) : 'No expiry'}
                      </td>
                      <td className="px-2 py-2">
                        <StatusPill status={withdrawn ? 'withdrawn' : rightsStatus(record)} />
                        {!rightsIsActive(record) && !withdrawn ? (
                          <p className="mt-0.5 text-[10px] text-destructive">Not publishable</p>
                        ) : null}
                      </td>
                      <td className="px-2 py-2 text-right">
                        {withdrawn ? (
                          <span className="text-[11px] text-muted-foreground">
                            {withdrawn.reason}
                          </span>
                        ) : (
                          <Can permission="species.rights_withdraw">
                            <Button
                              variant="destructive"
                              size="xs"
                              onClick={() => setRightsTarget(record)}
                            >
                              Withdraw
                            </Button>
                          </Can>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </SectionCard>

      <ContractGapNote>
        The frozen contract has no rights-withdrawal or source-withdrawal endpoint. The impact is
        computed from the loaded species, rights and source records, and the withdrawal plus its
        replacement are recorded in the audit overlay until the write lands. Publish is blocked
        locally for every affected species.
      </ContractGapNote>

      {sourceTarget && sourceImpact ? (
        <SourceWithdrawDialog
          key={sourceTarget.id}
          impact={sourceImpact}
          onClose={() => setSourceTarget(null)}
          onConfirm={async (replacementId, reason, note) => {
            try {
              await withdrawSource(sourceImpact, { replacementId, reason, note })
              notify.success(
                `${sourceTarget.publisher} withdrawn. ${sourceImpact.affected.length} species unpublished until the replacement is reviewed.`,
              )
              setSourceTarget(null)
            } catch (error) {
              notify.error(error)
            }
          }}
        />
      ) : null}

      {rightsTarget ? (
        <RightsWithdrawDialog
          key={rightsTarget.id}
          record={rightsTarget}
          affected={rightsImpact}
          onClose={() => setRightsTarget(null)}
          onConfirm={async (reason, note) => {
            try {
              await withdrawRights(rightsTarget, { reason, note })
              notify.success(
                `${rightsTarget.subjectType} rights withdrawn. ${rightsImpact.length} species unpublished.`,
              )
              setRightsTarget(null)
            } catch (error) {
              notify.error(error)
            }
          }}
        />
      ) : null}

      <p className="text-[11px] text-muted-foreground">
        Signed in as {actor.name} · {actor.roleLabel}. A rights reviewer may not review the assets
        they uploaded; the server enforces that separation.
      </p>
    </div>
  )
}

function SourceWithdrawDialog({
  impact,
  onClose,
  onConfirm,
}: {
  impact: ReturnType<typeof computeSourceImpact>
  onClose: () => void
  onConfirm: (replacementId: string | null, reason: string, note: string) => Promise<void>
}) {
  const [replacementId, setReplacementId] = useState(
    impact.replacementOptions[0]?.id ?? '',
  )
  const [reason, setReason] = useState(WITHDRAW_REASONS[0])
  const [note, setNote] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  return (
    <FormDialog
      open
      onOpenChange={(open) => {
        if (!open) onClose()
      }}
      title={`Withdraw ${impact.source.publisher}`}
      description="This is a rights action. Dependent species are unpublished until a replacement source is recorded in the same act."
      submitLabel="Withdraw and replace"
      variant="destructive"
      error={error}
      pending={pending}
      onSubmit={async () => {
        setError(null)
        if (reason === WITHDRAW_REASONS[0]) {
          setError('Choose a reason.')
          return
        }
        if (!replacementId) {
          setError('Choose a replacement source that covers the same permitted use.')
          return
        }
        setPending(true)
        try {
          await onConfirm(replacementId, reason, note)
        } catch (confirmError) {
          setError(confirmError instanceof Error ? confirmError.message : 'Could not withdraw.')
        } finally {
          setPending(false)
        }
      }}
    >
      <div className="rounded-lg border border-border bg-muted/30 px-3 py-2 text-xs">
        <dl className="grid grid-cols-[8rem_1fr] gap-x-3 gap-y-1.5">
          <dt className="font-semibold text-muted-foreground">Licence</dt>
          <dd>{impact.source.licenceCode}</dd>
          <dt className="font-semibold text-muted-foreground">Permitted use</dt>
          <dd className="capitalize">{impact.source.permittedUse.replace('_', ' ')}</dd>
          <dt className="font-semibold text-muted-foreground">Blast radius</dt>
          <dd>
            {impact.affected.length} loaded species unpublished
            {impact.affected.length > 0 ? `: ${impact.affected.map((entry) => entry.name).join(', ')}` : ''}
          </dd>
          <dt className="font-semibold text-muted-foreground">Rights records</dt>
          <dd>{impact.rights.length} dependent records</dd>
          <dt className="font-semibold text-muted-foreground">Reversible</dt>
          <dd>Only by recording a replacement source</dd>
        </dl>
      </div>

      <FormField label="Replacement source" description="Same permitted use and reviewed.">
        <select
          value={replacementId}
          onChange={(event) => setReplacementId(event.target.value)}
          className="h-9 w-full rounded-md border border-input bg-card px-3 text-sm"
        >
          <option value="">Choose a replacement…</option>
          {impact.replacementOptions.map((option) => (
            <option key={option.id} value={option.id}>
              {option.publisher} · {option.licenceCode}
            </option>
          ))}
        </select>
      </FormField>
      {impact.replacementOptions.length === 0 ? (
        <p className="text-xs font-semibold text-destructive">
          No replacement source with the same permitted use is loaded. Record one before withdrawing.
        </p>
      ) : null}

      <FormField label="Reason">
        <select
          value={reason}
          onChange={(event) => setReason(event.target.value)}
          className="h-9 w-full rounded-md border border-input bg-card px-3 text-sm"
        >
          {WITHDRAW_REASONS.map((value) => (
            <option key={value} value={value}>
              {value}
            </option>
          ))}
        </select>
      </FormField>
      <FormField label="Note for the audit log">
        <Textarea value={note} onChange={(event) => setNote(event.target.value)} rows={3} />
      </FormField>
    </FormDialog>
  )
}

function RightsWithdrawDialog({
  record,
  affected,
  onClose,
  onConfirm,
}: {
  record: SpeciesRights
  affected: RightsImpactEntry[]
  onClose: () => void
  onConfirm: (reason: string, note: string) => Promise<void>
}) {
  const [reason, setReason] = useState(WITHDRAW_REASONS[0])
  const [note, setNote] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  return (
    <FormDialog
      open
      onOpenChange={(open) => {
        if (!open) onClose()
      }}
      title={`Withdraw ${record.subjectType} rights`}
      description="Withdrawal keeps the audit reason and unpublishes every dependent species until a replacement rights record is recorded."
      submitLabel="Withdraw rights"
      variant="destructive"
      error={error}
      pending={pending}
      onSubmit={async () => {
        if (reason === WITHDRAW_REASONS[0]) {
          setError('Choose a reason.')
          return
        }
        setPending(true)
        try {
          await onConfirm(reason, note)
        } catch (confirmError) {
          setError(confirmError instanceof Error ? confirmError.message : 'Could not withdraw.')
        } finally {
          setPending(false)
        }
      }}
    >
      <div className="rounded-lg border border-border bg-muted/30 px-3 py-2 text-xs">
        <dl className="grid grid-cols-[8rem_1fr] gap-x-3 gap-y-1.5">
          <dt className="font-semibold text-muted-foreground">Rights holder</dt>
          <dd>{record.rightsHolder}</dd>
          <dt className="font-semibold text-muted-foreground">Consent</dt>
          <dd>{record.consentRecord ?? 'Not recorded'}</dd>
          <dt className="font-semibold text-muted-foreground">Blast radius</dt>
          <dd>
            {affected.length} loaded species unpublished
            {affected.length > 0 ? (
              <ul className="mt-1 space-y-1">
                {affected.map((entry) => (
                  <li key={entry.slug}>
                    <span className="font-semibold text-foreground">{rightsImpactLabel(entry)}</span>
                    <span className="block text-[10px] text-muted-foreground">
                      Affected use: {entry.uses.join(', ')}
                    </span>
                  </li>
                ))}
              </ul>
            ) : null}
          </dd>
        </dl>
      </div>
      <FormField label="Reason">
        <select
          value={reason}
          onChange={(event) => setReason(event.target.value)}
          className="h-9 w-full rounded-md border border-input bg-card px-3 text-sm"
        >
          {WITHDRAW_REASONS.map((value) => (
            <option key={value} value={value}>
              {value}
            </option>
          ))}
        </select>
      </FormField>
      <FormField label="Note for the audit log">
        <Textarea value={note} onChange={(event) => setNote(event.target.value)} rows={3} />
      </FormField>
    </FormDialog>
  )
}
