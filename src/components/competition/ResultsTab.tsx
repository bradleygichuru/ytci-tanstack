import { useCallback, useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import {
  ArrowsClockwise,
  Confetti,
  Lock,
  SealCheck,
  Snowflake,
  Trophy,
} from '@phosphor-icons/react'
import type { ApiClient } from '#/lib/api'
import type {
  Award,
  AwardForm,
  AwardInput,
  AwardType,
  CompetitionEntry,
  CompetitionResults,
  ResultEntry,
} from '#/lib/api/competition'
import { Button } from '#/components/ui/button'
import { ConfirmDialog } from '#/components/shared/ConfirmDialog'
import { FormSelect, FormTextarea } from '#/components/shared/FormField'
import { StatusBadge } from '#/components/shared/StatusBadge'
import {
  Detail,
  EmptyRow,
  LoadingRow,
  Panel,
  SectionHeading,
  Stat,
  TABLE_CELL,
  TABLE_HEAD,
  formatScore,
  percent,
  titleCase,
} from './shared'

const AWARD_TYPES: Array<{ value: AwardType; label: string }> = [
  { value: 'category_winner', label: 'Category award' },
  { value: 'overall', label: 'Overall award' },
  { value: 'people_choice', label: "People's Choice" },
]

const AWARD_FORMS: Array<{ value: AwardForm; label: string }> = [
  { value: 'grant', label: 'Grant' },
  { value: 'commission', label: 'Commission' },
  { value: 'certificate', label: 'Certificate' },
  { value: 'feature', label: 'Feature in the repository' },
  { value: 'recognition', label: 'Non-cash recognition' },
]

interface AwardDraft {
  entryId: string
  categoryId: string
  awardType: AwardType
  awardForm: AwardForm | ''
  citation: string
}

const emptyAward = (): AwardDraft => ({
  entryId: '',
  categoryId: '',
  awardType: 'category_winner',
  awardForm: 'grant',
  citation: '',
})

export function ResultsTab({
  api,
  editionId,
  canPublish,
  onAwardsChanged,
}: {
  api: ApiClient
  editionId: string
  canPublish: boolean
  onAwardsChanged: () => void
}) {
  const [results, setResults] = useState<CompetitionResults | null>(null)
  const [entries, setEntries] = useState<CompetitionEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [working, setWorking] = useState(false)
  const [confirm, setConfirm] = useState<'freeze' | 'recount' | null>(null)
  const [awardDraft, setAwardDraft] = useState<AwardDraft>(emptyAward())
  const [awardPanel, setAwardPanel] = useState(false)
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [result, entryResult] = await Promise.all([
        api.competition.results.get(editionId),
        api.competition.entries.list(editionId),
      ])
      setResults(result)
      setEntries(entryResult.items)
    } catch {
      toast.error('Failed to load results preview')
      setResults(null)
    } finally {
      setLoading(false)
    }
  }, [api, editionId])

  useEffect(() => {
    void load()
  }, [load])

  useEffect(() => {
    setAwardPanel(false)
    setConfirm(null)
  }, [editionId])

  const runSnapshot = async (kind: 'freeze' | 'recount') => {
    setWorking(true)
    try {
      if (kind === 'freeze') {
        await api.competition.results.freeze(editionId)
        toast.success('Board frozen. Final snapshot written and scores locked.')
      } else {
        await api.competition.results.recount(editionId)
        toast.success('Recounted from the ledger. A new final snapshot was written.')
      }
      setConfirm(null)
      await load()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Snapshot failed')
    } finally {
      setWorking(false)
    }
  }

  const openAward = (entry: ResultEntry, type: AwardType, categoryId?: string) => {
    setAwardDraft({
      entryId: entry.entryId,
      categoryId: categoryId ?? '',
      awardType: type,
      awardForm: type === 'people_choice' ? 'recognition' : 'grant',
      citation: '',
    })
    setAwardPanel(true)
  }

  const createAward = async () => {
    if (!awardDraft.entryId) {
      toast.error('Choose an entry')
      return
    }
    if (awardDraft.awardType === 'category_winner' && !awardDraft.categoryId) {
      toast.error('Choose the category for this award')
      return
    }
    setSaving(true)
    try {
      const body: AwardInput = {
        entryId: awardDraft.entryId,
        awardType: awardDraft.awardType,
        awardForm: awardDraft.awardForm || null,
        citation: awardDraft.citation.trim() || null,
        categoryId: awardDraft.awardType === 'category_winner' ? awardDraft.categoryId : null,
      }
      const created = await api.competition.awards.create(editionId, body)
      await api.competition.awards.publish(created.id)
      toast.success('Award recorded and published')
      setAwardPanel(false)
      onAwardsChanged()
      await load()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to publish award')
    } finally {
      setSaving(false)
    }
  }

  const peopleChoiceTarget = useMemo(() => {
    if (!results?.peopleChoice) return null
    for (const category of results.categories) {
      const found = category.entries.find((entry) => entry.entryId === results.peopleChoice!.entryId)
      if (found) return found
    }
    return {
      entryId: results.peopleChoice.entryId,
      title: results.peopleChoice.title,
    } as ResultEntry
  }, [results])

  const totalScores = useMemo(
    () =>
      (results?.categories ?? []).reduce(
        (total, category) => total + category.entries.reduce((sum, entry) => sum + entry.scoreCount, 0),
        0,
      ),
    [results],
  )

  const categoryById = useCallback(
    (id: string) => results?.categories.find((category) => category.category.id === id)?.category,
    [results],
  )

  const awardFor = useCallback(
    (entryId: string, categoryId?: string) =>
      (results?.awards ?? []).find(
        (award) =>
          award.entryId === entryId &&
          (categoryId ? award.categoryId === categoryId : award.awardType !== 'category_winner'),
      ),
    [results],
  )

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat
          label="Edition status"
          value={results ? titleCase(results.status) : '-'}
          foot={results?.frozen ? 'Board frozen' : 'Board live'}
          icon={results?.frozen ? Snowflake : ArrowsClockwise}
        />
        <Stat label="Panel scores" value={totalScores} foot="Individual scores private" />
        <Stat
          label="Awards published"
          value={(results?.awards ?? []).filter((award) => award.publishedAt).length}
          foot={`${(results?.awards ?? []).length} recorded`}
          icon={Trophy}
        />
        <Stat
          label="Public vote in awards"
          value={results ? percent(results.weights.public * 100) : '-'}
          foot="People's Choice is separate"
        />
      </div>

      <div className="flex flex-col gap-3 rounded-lg border border-border bg-card p-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-semibold">
            {results?.frozen ? 'Final snapshot is written' : 'Preview before freeze'}
          </p>
          <p className="mt-0.5 max-w-2xl text-xs text-muted-foreground">
            The panel selects grants, commissions, and awards. The public vote decides only the
            separate, non-cash People's Choice recognition.
          </p>
          {results?.ledgerHash ? (
            <p className="mt-1 truncate font-mono text-[10px] text-muted-foreground">
              Ledger hash {results.ledgerHash}
            </p>
          ) : null}
        </div>
        {canPublish ? (
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => setConfirm('recount')} disabled={working}>
              <ArrowsClockwise /> Recount
            </Button>
            <Button onClick={() => setConfirm('freeze')} disabled={working}>
              <Lock /> {results?.frozen ? 'Freeze again' : 'Freeze board'}
            </Button>
          </div>
        ) : null}
      </div>

      {loading ? (
        <div className="overflow-hidden rounded-lg border border-border">
          <table className="w-full text-left text-sm">
            <tbody>
              <LoadingRow colSpan={7} label="Computing results preview…" />
            </tbody>
          </table>
        </div>
      ) : !results || results.categories.every((category) => category.entries.length === 0) ? (
        <div className="rounded-lg border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
          No scored entries yet. Results appear after judges submit scores.
        </div>
      ) : (
        results.categories.map((category) => (
          <div key={category.category.id} className="space-y-3">
            <SectionHeading
              title={category.category.label}
              description={
                category.entries.some((entry) => entry.isTie)
                  ? 'A tie is flagged. Craft, then originality, then the panel chair decides.'
                  : 'Ranked by final score.'
              }
            />
            <div className="overflow-hidden rounded-lg border border-border">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[820px] text-left text-sm">
                  <thead className={TABLE_HEAD}>
                    <tr>
                      <th className="px-4 py-3 font-semibold">Rank</th>
                      <th className="px-4 py-3 font-semibold">Entry</th>
                      <th className="px-4 py-3 font-semibold">Panel score</th>
                      <th className="px-4 py-3 font-semibold">Scores</th>
                      <th className="px-4 py-3 font-semibold">Public votes</th>
                      <th className="px-4 py-3 font-semibold">Final</th>
                      <th className="px-4 py-3 text-right font-semibold">Award</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {category.entries.map((entry) => {
                      const award = awardFor(entry.entryId, category.category.id)
                      return (
                        <tr key={entry.entryId} className="align-top hover:bg-muted/30">
                          <td className={`${TABLE_CELL} font-mono text-sm font-semibold`}>
                            {entry.rank}
                            {entry.isTie ? (
                              <span className="ml-1 text-[10px] font-semibold text-[var(--amber-deep)]">
                                TIE
                              </span>
                            ) : null}
                          </td>
                          <td className={`${TABLE_CELL} font-medium`}>{entry.title}</td>
                          <td className={`${TABLE_CELL} font-mono text-xs`}>
                            {formatScore(entry.expertScore)}
                          </td>
                          <td className={`${TABLE_CELL} text-xs`}>{entry.scoreCount}</td>
                          <td className={`${TABLE_CELL} text-xs`}>{entry.publicVotes}</td>
                          <td className={`${TABLE_CELL} font-mono text-xs font-semibold`}>
                            {formatScore(entry.finalScore)}
                          </td>
                          <td className={TABLE_CELL}>
                            <div className="flex justify-end">
                              {award ? (
                                <StatusBadge
                                  status={award.publishedAt ? 'published' : 'pending'}
                                  label={
                                    award.publishedAt
                                      ? `${titleCase(award.awardType)} published`
                                      : 'Award recorded'
                                  }
                                />
                              ) : canPublish ? (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() =>
                                    openAward(entry, 'category_winner', category.category.id)
                                  }
                                >
                                  <SealCheck /> Publish award
                                </Button>
                              ) : null}
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        ))
      )}

      <div className="rounded-lg border border-[var(--amber)]/40 bg-[var(--amber-bg)]/30 p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
              Separate recognition
            </p>
            <h3 className="mt-1 flex items-center gap-2 text-lg font-bold">
              <Confetti className="size-5 text-[var(--amber-deep)]" weight="duotone" />
              People's Choice
            </h3>
            <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
              Decided by the public vote alone and always non-cash. It never changes a panel award
              or the overall award.
            </p>
          </div>
          {peopleChoiceTarget && canPublish ? (
            <Button
              onClick={() => openAward(peopleChoiceTarget, 'people_choice')}
              disabled={Boolean(results?.awards.find((award) => award.awardType === 'people_choice'))}
            >
              <Confetti /> Publish People's Choice
            </Button>
          ) : null}
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <Detail
            label="Current leader"
            value={peopleChoiceTarget?.title ?? 'No votes yet'}
          />
          <Detail
            label="Votes"
            value={results?.peopleChoice ? String(results.peopleChoice.votes) : '-'}
          />
        </div>
        {(results?.awards ?? []).some((award) => award.awardType === 'people_choice') ? (
          <p className="mt-3 text-xs font-medium text-[var(--amber-deep)]">
            People's Choice has been recorded. Edit the citation in Awards.
          </p>
        ) : null}
      </div>

      <SectionHeading
        title="Award records"
        description="Every award keeps its form, citation, and publication state."
      />
      <div className="overflow-hidden rounded-lg border border-border">
        <table className="w-full text-left text-sm">
          <thead className={TABLE_HEAD}>
            <tr>
              <th className="px-4 py-3 font-semibold">Award</th>
              <th className="px-4 py-3 font-semibold">Recipient</th>
              <th className="px-4 py-3 font-semibold">Form</th>
              <th className="px-4 py-3 font-semibold">State</th>
              <th className="px-4 py-3 font-semibold">Citation</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {(results?.awards ?? []).length === 0 ? (
              <EmptyRow colSpan={5}>No awards recorded for this edition.</EmptyRow>
            ) : (
              results!.awards.map((award: Award) => (
                <tr key={award.id} className="align-top">
                  <td className={`${TABLE_CELL} text-xs font-semibold`}>
                    {titleCase(award.awardType)}
                    {award.categoryId ? (
                      <span className="ml-1 font-normal text-muted-foreground">
                        · {categoryById(award.categoryId)?.label ?? ''}
                      </span>
                    ) : null}
                  </td>
                  <td className={`${TABLE_CELL} text-xs`}>{award.title}</td>
                  <td className={`${TABLE_CELL} text-xs`}>
                    {award.awardForm ? titleCase(award.awardForm) : '-'}
                  </td>
                  <td className={TABLE_CELL}>
                    <StatusBadge
                      status={award.publishedAt ? 'published' : 'pending'}
                      label={award.publishedAt ? 'Published' : 'Recorded'}
                    />
                  </td>
                  <td className={`${TABLE_CELL} max-w-sm text-xs text-muted-foreground`}>
                    {award.citation ?? '-'}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {awardPanel ? (
        <Panel
          kicker="Publish award"
          title="Record and publish an award"
          description="The panel selects the recipient. The citation is published; individual judge scores stay private."
          onClose={() => setAwardPanel(false)}
          footer={
            <>
              <Button onClick={() => void createAward()} disabled={saving}>
                <SealCheck /> {saving ? 'Publishing…' : 'Publish award'}
              </Button>
              <Button variant="outline" onClick={() => setAwardPanel(false)}>
                Cancel
              </Button>
            </>
          }
        >
          <FormSelect
            label="Award type"
            required
            value={awardDraft.awardType}
            onChange={(value) =>
              setAwardDraft((current) => ({
                ...current,
                awardType: value as AwardType,
                awardForm: value === 'people_choice' ? 'recognition' : current.awardForm,
              }))
            }
            options={AWARD_TYPES}
          />
          {awardDraft.awardType === 'category_winner' ? (
            <FormSelect
              label="Category"
              required
              value={awardDraft.categoryId}
              onChange={(value) =>
                setAwardDraft((current) => ({ ...current, categoryId: value }))
              }
              options={(results?.categories ?? []).map((category) => ({
                value: category.category.id,
                label: category.category.label,
              }))}
            />
          ) : null}
          <div>
            <label
              htmlFor="award-entry"
              className="font-mono text-[9px] uppercase tracking-[0.14em] text-muted-foreground"
            >
              Recipient
            </label>
            <select
              id="award-entry"
              className="mt-1 h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
              value={awardDraft.entryId}
              onChange={(event) =>
                setAwardDraft((current) => ({ ...current, entryId: event.target.value }))
              }
            >
              <option value="">Select an entry…</option>
              {entries.map((entry) => (
                <option key={entry.id} value={entry.id}>
                  {entry.title} · {entry.categoryLabel}
                </option>
              ))}
            </select>
          </div>
          <FormSelect
            label="Award form"
            value={awardDraft.awardForm}
            onChange={(value) =>
              setAwardDraft((current) => ({ ...current, awardForm: value as AwardForm }))
            }
            options={AWARD_FORMS}
            description="Grants, commissions, certificates, repository features, or non-cash recognition. The platform displays the award and does not pay it."
          />
          <FormTextarea
            label="Citation"
            value={awardDraft.citation}
            onChange={(value) => setAwardDraft((current) => ({ ...current, citation: value }))}
            description="Short public text about why this work was selected."
            maxLength={600}
          />
          <div className="grid gap-3 rounded-lg border border-border p-4 sm:grid-cols-2">
            <Detail label="Recipient response" value="14 days to accept and verify" />
            <Detail
              label="Forfeiture"
              value="The award may pass to the next eligible entry"
            />
          </div>
        </Panel>
      ) : null}

      <ConfirmDialog
        open={confirm !== null}
        onOpenChange={(open) => {
          if (!open) setConfirm(null)
        }}
        title={confirm === 'freeze' ? 'Freeze the board?' : 'Recount from the ledger?'}
        description={
          confirm === 'freeze'
            ? 'This writes the final snapshot, closes the edition, and locks every score. Published results should not move after this point.'
            : 'This rewrites the final snapshot from the live vote ledger without closing the edition. Use it after a reviewed invalidation.'
        }
        confirmLabel={confirm === 'freeze' ? 'Freeze board' : 'Recount'}
        variant={confirm === 'freeze' ? 'destructive' : 'default'}
        loading={working}
        loadingLabel="Working…"
        onConfirm={() => confirm && void runSnapshot(confirm)}
      />

    </div>
  )
}
