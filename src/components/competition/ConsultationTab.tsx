import { useCallback, useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { ChatCircleText, DownloadSimple, EnvelopeOpen } from '@phosphor-icons/react'
import type { ApiClient } from '#/lib/api'
import type { ConsultationResponse } from '#/lib/api/competition'
import { Button } from '#/components/ui/button'
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
  formatDateTime,
} from './shared'

const PAGE_SIZE = 50

function answersPreview(answers: unknown): string {
  if (answers === null || answers === undefined) return '-'
  if (typeof answers === 'string') return answers
  if (Array.isArray(answers)) return `${answers.length} answers`
  if (typeof answers === 'object') {
    const values = Object.values(answers as Record<string, unknown>)
    const first = values.find((value) => typeof value === 'string' && value.trim().length > 0)
    return typeof first === 'string' ? first : `${values.length} answers`
  }
  return String(answers)
}

function answersJson(answers: unknown): string {
  if (answers === null || answers === undefined) return 'No answers recorded.'
  try {
    return JSON.stringify(answers, null, 2)
  } catch {
    return String(answers)
  }
}

export function ConsultationTab({
  api,
  editionId,
  canPublish,
}: {
  api: ApiClient
  editionId: string
  canPublish: boolean
}) {
  const [responses, setResponses] = useState<ConsultationResponse[] | null>(null)
  const [loading, setLoading] = useState(true)
  const [offset, setOffset] = useState(0)
  const [selected, setSelected] = useState<ConsultationResponse | null>(null)
  const [exporting, setExporting] = useState(false)

  const load = useCallback(
    async (nextOffset: number) => {
      setLoading(true)
      try {
        const result = await api.competition.consultation.list(editionId, {
          limit: PAGE_SIZE,
          offset: nextOffset,
        })
        setResponses(result.items)
        setOffset(nextOffset)
      } catch {
        toast.error('Failed to load consultation responses')
        setResponses([])
      } finally {
        setLoading(false)
      }
    },
    [api, editionId],
  )

  useEffect(() => {
    void load(0)
  }, [load])

  const exportCsv = async () => {
    setExporting(true)
    try {
      const blob = await api.competition.consultation.exportCsv(editionId)
      const url = URL.createObjectURL(blob)
      const anchor = document.createElement('a')
      anchor.href = url
      anchor.download = 'consultation-responses.csv'
      document.body.appendChild(anchor)
      anchor.click()
      anchor.remove()
      URL.revokeObjectURL(url)
      toast.success('Consultation responses exported')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to export responses')
    } finally {
      setExporting(false)
    }
  }

  const stats = useMemo(() => {
    const list = responses ?? []
    return {
      shown: list.length,
      consenting: list.filter((response) => response.consent).length,
      latest: list[0]?.createdAt ? formatDateTime(list[0].createdAt) : '-',
      page: Math.floor(offset / PAGE_SIZE) + 1,
    }
  }, [offset, responses])

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Responses on page" value={stats.shown} icon={ChatCircleText} />
        <Stat label="Consent recorded" value={stats.consenting} foot="For publication" />
        <Stat label="Latest response" value={stats.latest} />
        <Stat label="Page" value={stats.page} foot={`${PAGE_SIZE} per page`} />
      </div>

      <div className="rounded-lg border border-border bg-card p-4 text-sm">
        <p className="font-semibold">Consultation record</p>
        <p className="mt-1 text-muted-foreground">
          Responses inform the final rulebook. Names and emails stay in the admin export and are
          never published. The feedback report summarises what changed and why.
        </p>
      </div>

      <SectionHeading
        title="Consultation responses"
        description="Eight-question survey across the three-week consultation."
        actions={
          canPublish ? (
            <Button variant="outline" onClick={() => void exportCsv()} disabled={exporting}>
              <DownloadSimple /> {exporting ? 'Exporting…' : 'Export CSV'}
            </Button>
          ) : null
        }
      />

      <div className="overflow-hidden rounded-lg border border-border">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className={TABLE_HEAD}>
              <tr>
                <th className="px-4 py-3 font-semibold">Respondent</th>
                <th className="px-4 py-3 font-semibold">Email</th>
                <th className="px-4 py-3 font-semibold">Answer preview</th>
                <th className="px-4 py-3 font-semibold">Consent</th>
                <th className="px-4 py-3 font-semibold">Received</th>
                <th className="px-4 py-3 text-right font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading ? (
                <LoadingRow colSpan={6} label="Loading consultation responses…" />
              ) : !responses || responses.length === 0 ? (
                <EmptyRow colSpan={6}>
                  No consultation responses in this edition yet.
                </EmptyRow>
              ) : (
                responses.map((response) => (
                  <tr key={response.id} className="align-top hover:bg-muted/30">
                    <td className={`${TABLE_CELL} text-xs font-medium`}>
                      {response.name ?? 'Anonymous'}
                    </td>
                    <td className={`${TABLE_CELL} text-xs text-muted-foreground`}>
                      {response.email ?? '-'}
                    </td>
                    <td className={`${TABLE_CELL} max-w-md text-xs text-muted-foreground`}>
                      <span className="line-clamp-1">{answersPreview(response.answers)}</span>
                    </td>
                    <td className={TABLE_CELL}>
                      <StatusBadge
                        status={response.consent ? 'verified' : 'unverified'}
                        label={response.consent ? 'Consented' : 'No consent'}
                      />
                    </td>
                    <td className={`${TABLE_CELL} text-xs`}>
                      {formatDateTime(response.createdAt)}
                    </td>
                    <td className={TABLE_CELL}>
                      <div className="flex justify-end">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setSelected(response)}
                        >
                          <EnvelopeOpen /> Open
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <Button
          variant="outline"
          onClick={() => void load(Math.max(0, offset - PAGE_SIZE))}
          disabled={loading || offset === 0}
        >
          Previous
        </Button>
        <p className="text-xs text-muted-foreground">
          Showing {responses?.length ?? 0} responses from offset {offset}
        </p>
        <Button
          variant="outline"
          onClick={() => void load(offset + PAGE_SIZE)}
          disabled={loading || (responses?.length ?? 0) < PAGE_SIZE}
        >
          Next
        </Button>
      </div>

      {selected ? (
        <Panel
          kicker="Consultation response"
          title={selected.name ?? 'Anonymous response'}
          description="Raw survey answers. Treat respondent details as confidential."
          onClose={() => setSelected(null)}
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <Detail label="Email" value={selected.email ?? 'Not provided'} />
            <Detail label="Consent" value={selected.consent ? 'Recorded' : 'Not recorded'} />
            <Detail label="Received" value={formatDateTime(selected.createdAt)} />
            <Detail label="Reference" value={selected.id} />
          </div>
          <div>
            <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
              Answers
            </p>
            <pre className="mt-1 max-h-[420px] overflow-auto rounded-lg border border-border bg-muted/30 p-4 text-xs leading-relaxed">
              {answersJson(selected.answers)}
            </pre>
          </div>
        </Panel>
      ) : null}
    </div>
  )
}
