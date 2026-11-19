import { useMemo, useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { Plus } from '@phosphor-icons/react'
import { Button } from '#/components/ui/button'
import { Input } from '#/components/ui/input'
import { Textarea } from '#/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '#/components/ui/dialog'
import { Can } from '#/components/shell/Gates'
import { useRecognition } from '#/lib/recognition/store'
import { formatDateTime, formatNumber, formatXp } from '#/lib/recognition/format'
import { AdminPage, DataState, Notice, ScopeNote, StatusPill } from '#/components/recognition/shared'
import { ActionDialog, ReasonDialog } from '#/components/recognition/dialogs'
import type { Mission } from '#/lib/recognition/types'

export const Route = createFileRoute('/_authenticated/recognition/missions')({
  component: MissionsPage,
})

const FAMILIES = ['Discovery', 'Events', 'Conservation', 'Learning', 'Listening']

interface MissionForm {
  id?: string
  nameEn: string
  nameSw: string
  family: string
  condition: string
  xpReward: number
  badgeKey: string
  target: number
  status: Mission['status']
}

const EMPTY: MissionForm = {
  nameEn: '',
  nameSw: '',
  family: 'Discovery',
  condition: '',
  xpReward: 150,
  badgeKey: 'none',
  target: 3,
  status: 'active',
}

function MissionsPage() {
  const { state, loads, actions, can } = useRecognition()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [form, setForm] = useState<MissionForm>(EMPTY)
  const [error, setError] = useState<string | null>(null)
  const [ledgerMission, setLedgerMission] = useState<Mission | null>(null)
  const [correcting, setCorrecting] = useState<{ mission: Mission; completionId: string } | null>(null)
  const [correctError, setCorrectError] = useState<string | null>(null)

  const publishedBadges = state.badges.filter((badge) => badge.status === 'published')
  const total = state.missions.reduce((sum, mission) => sum + mission.completions, 0)

  const byFamily = useMemo(
    () =>
      FAMILIES.map((family) => ({
        family,
        missions: state.missions.filter((mission) => mission.family === family),
      })).filter((group) => group.missions.length > 0),
    [state.missions],
  )

  if (loads.badges === 'loading' && state.missions.length === 0) {
    return (
      <AdminPage kicker="Recognition · Missions" title="Missions">
        <DataState state="loading">{null}</DataState>
      </AdminPage>
    )
  }

  const openCreate = () => {
    setForm(EMPTY)
    setError(null)
    setDialogOpen(true)
  }

  const openEdit = (mission: Mission) => {
    setForm({
      id: mission.id,
      nameEn: mission.nameEn,
      nameSw: mission.nameSw,
      family: mission.family,
      condition: mission.condition,
      xpReward: mission.xpReward,
      badgeKey: mission.badgeKey,
      target: mission.target,
      status: mission.status,
    })
    setError(null)
    setDialogOpen(true)
  }

  const save = () => {
    if (!form.nameEn.trim()) return setError('Give the mission a name.')
    if (!form.condition.trim()) return setError('Describe the completion condition.')
    if (!Number.isFinite(form.xpReward) || form.xpReward < 0) return setError('XP reward must be zero or more.')
    const badge = state.badges.find((entry) => entry.badgeKey === form.badgeKey)
    if (badge && badge.status !== 'published') {
      return setError('The badge must be published before a mission can use it.')
    }
    actions.saveMission({
      id: form.id,
      nameEn: form.nameEn.trim(),
      nameSw: form.nameSw.trim() || form.nameEn.trim(),
      family: form.family,
      condition: form.condition.trim(),
      xpReward: form.xpReward,
      badgeKey: form.badgeKey,
      status: form.status,
      target: form.target,
    })
    setDialogOpen(false)
  }

  return (
    <AdminPage
      kicker="Recognition · Missions"
      title="Missions"
      sub="Five mission families. Once per season, no daily reset. Completions show the current season."
      actions={
        <Can permission="recognition.author_rule">
          <Button size="sm" onClick={openCreate}>
            <Plus className="h-4 w-4" weight="bold" /> New mission
          </Button>
        </Can>
      }
    >
      <ScopeNote>
        {state.missions.length} missions · {formatNumber(total)} completions · {state.missions.filter((mission) => mission.status === 'paused').length} paused
      </ScopeNote>

      {state.missions.length === 0 ? (
        <DataState
          state="empty"
          emptyTitle="No missions in this view"
          emptyDescription="Create a mission in one of the five families. A mission badge must be published first."
          emptyAction={<Button onClick={openCreate}>Create a mission</Button>}
        >
          {null}
        </DataState>
      ) : (
        <div className="space-y-4">
          {byFamily.map((group) => (
            <section key={group.family} className="rounded-lg border border-border bg-card">
              <div className="flex items-center justify-between border-b border-border px-4 py-3">
                <h2 className="font-sans text-base font-bold text-foreground">{group.family}</h2>
                <span className="text-xs text-muted-foreground">
                  {group.missions.length} mission{group.missions.length === 1 ? '' : 's'}
                </span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[920px] text-sm">
                  <caption className="sr-only">{group.family} missions</caption>
                  <thead>
                    <tr className="border-b bg-[var(--surface-2)] text-left text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
                      <th scope="col" className="px-4 py-2">Mission</th>
                      <th scope="col" className="px-4 py-2">Condition</th>
                      <th scope="col" className="px-4 py-2">Reward</th>
                      <th scope="col" className="px-4 py-2">Badge</th>
                      <th scope="col" className="px-4 py-2 text-right">Completions</th>
                      <th scope="col" className="px-4 py-2">Status</th>
                      <th scope="col" className="px-4 py-2 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {group.missions.map((mission) => {
                      const badge = state.badges.find((entry) => entry.badgeKey === mission.badgeKey)
                      const badgeUnpublished = badge && badge.status !== 'published'
                      return (
                        <tr key={mission.id} className="border-b last:border-0 hover:bg-[var(--surface-2)]">
                          <td className="px-4 py-3">
                            <span className="font-semibold text-foreground">{mission.nameEn}</span>
                            <span className="block text-xs text-muted-foreground">{mission.nameSw}</span>
                          </td>
                          <td className="px-4 py-3 text-xs text-muted-foreground">{mission.condition}</td>
                          <td className="px-4 py-3 text-xs">{formatXp(mission.xpReward)} + badge</td>
                          <td className="px-4 py-3 text-xs">
                            {badge?.nameEn ?? mission.badgeKey}
                            {badgeUnpublished ? <span className="ml-1 font-semibold text-destructive">· unpublished</span> : null}
                          </td>
                          <td className="px-4 py-3 text-right font-mono text-xs">{formatNumber(mission.completions)}</td>
                          <td className="px-4 py-3"><StatusPill status={mission.status} /></td>
                          <td className="px-4 py-3 text-right">
                            <div className="inline-flex flex-wrap justify-end gap-1">
                              <Button variant="outline" size="sm" onClick={() => setLedgerMission(mission)}>
                                Completions
                              </Button>
                              <Can permission="recognition.author_rule">
                                <Button variant="ghost" size="sm" onClick={() => openEdit(mission)}>Edit</Button>
                                <Button variant="ghost" size="sm" onClick={() => actions.toggleMission(mission.id)}>
                                  {mission.status === 'active' ? 'Pause' : 'Resume'}
                                </Button>
                              </Can>
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </section>
          ))}
        </div>
      )}

      <Notice tone="gold" title="Pause and resume are symmetric.">
        Pausing a mission stops new completions but keeps progress and earned badges. Resuming continues from the same
        progress; there is no daily reset and no countdown pressure.
      </Notice>

      <ActionDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        title={form.id ? 'Edit mission' : 'New mission'}
        description="A mission belongs to one family and runs once per season."
        confirmLabel={form.id ? 'Save mission' : 'Create mission'}
        onConfirm={save}
        error={error}
        size="lg"
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block space-y-1.5">
            <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">English name</span>
            <Input value={form.nameEn} onChange={(event) => setForm((prev) => ({ ...prev, nameEn: event.target.value }))} aria-label="English name" />
          </label>
          <label className="block space-y-1.5">
            <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Kiswahili name</span>
            <Input value={form.nameSw} onChange={(event) => setForm((prev) => ({ ...prev, nameSw: event.target.value }))} aria-label="Kiswahili name" />
          </label>
          <label className="block space-y-1.5">
            <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Family</span>
            <select value={form.family} onChange={(event) => setForm((prev) => ({ ...prev, family: event.target.value }))} aria-label="Family" className="h-9 w-full rounded-md border border-border bg-card px-2 text-sm">
              {FAMILIES.map((family) => <option key={family} value={family}>{family}</option>)}
            </select>
          </label>
          <label className="block space-y-1.5">
            <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Reward badge</span>
            <select value={form.badgeKey} onChange={(event) => setForm((prev) => ({ ...prev, badgeKey: event.target.value }))} aria-label="Reward badge" className="h-9 w-full rounded-md border border-border bg-card px-2 text-sm">
              <option value="none">None</option>
              {publishedBadges.map((badge) => <option key={badge.badgeKey} value={badge.badgeKey}>{badge.nameEn}</option>)}
              {form.badgeKey !== 'none' && !publishedBadges.some((badge) => badge.badgeKey === form.badgeKey) ? (
                <option value={form.badgeKey}>{(state.badges.find((badge) => badge.badgeKey === form.badgeKey)?.nameEn ?? form.badgeKey) + ' (not published)'}</option>
              ) : null}
            </select>
          </label>
          <label className="block space-y-1.5 sm:col-span-2">
            <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Condition</span>
            <Textarea value={form.condition} onChange={(event) => setForm((prev) => ({ ...prev, condition: event.target.value }))} rows={2} aria-label="Condition" />
          </label>
          <label className="block space-y-1.5">
            <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">XP reward</span>
            <Input type="number" min={0} value={form.xpReward} onChange={(event) => setForm((prev) => ({ ...prev, xpReward: Number(event.target.value) }))} aria-label="XP reward" />
          </label>
          <label className="block space-y-1.5">
            <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Target count</span>
            <Input type="number" min={1} value={form.target} onChange={(event) => setForm((prev) => ({ ...prev, target: Number(event.target.value) }))} aria-label="Target count" />
          </label>
          <label className="block space-y-1.5">
            <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Status</span>
            <select value={form.status} onChange={(event) => setForm((prev) => ({ ...prev, status: event.target.value as Mission['status'] }))} aria-label="Status" className="h-9 w-full rounded-md border border-border bg-card px-2 text-sm">
              <option value="active">Active</option>
              <option value="paused">Paused</option>
            </select>
          </label>
        </div>
        {!can('recognition.publish_badge') ? (
          <p className="text-xs text-muted-foreground">A badge must already be published; mission authoring does not publish the badge.</p>
        ) : null}
      </ActionDialog>

      <Dialog open={Boolean(ledgerMission)} onOpenChange={(open) => { if (!open) setLedgerMission(null) }}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{ledgerMission?.nameEn} completions</DialogTitle>
            <DialogDescription>
              {ledgerMission ? `${ledgerMission.family} · ${ledgerMission.completions} total · ${formatXp(ledgerMission.xpReward)} + ${state.badges.find((badge) => badge.badgeKey === ledgerMission.badgeKey)?.nameEn ?? 'badge'}` : ''}
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-80 overflow-auto">
            <table className="w-full text-sm">
              <caption className="sr-only">Mission completion ledger</caption>
              <thead>
                <tr className="border-b bg-[var(--surface-2)] text-left text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
                  <th scope="col" className="px-3 py-2">Reader</th>
                  <th scope="col" className="px-3 py-2">Completed</th>
                  <th scope="col" className="px-3 py-2">Status</th>
                  <th scope="col" className="px-3 py-2 text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {ledgerMission?.completionsLedger.map((completion) => (
                  <tr key={completion.id} className="border-b last:border-0">
                    <td className="px-3 py-2">{completion.reader}</td>
                    <td className="px-3 py-2 text-xs text-muted-foreground">{formatDateTime(completion.completedAt)}</td>
                    <td className="px-3 py-2">
                      <StatusPill status={completion.status === 'credited' ? 'delivered' : 'withdrawn'} label={completion.status} />
                      {completion.note ? <span className="mt-1 block text-[10px] text-muted-foreground">{completion.note}</span> : null}
                    </td>
                    <td className="px-3 py-2 text-right">
                      <Can permission="recognition.adjust_xp">
                        {completion.status === 'credited' ? (
                          <Button variant="ghost" size="xs" onClick={() => setCorrecting({ mission: ledgerMission!, completionId: completion.id })}>
                            Correct
                          </Button>
                        ) : (
                          <span className="text-xs text-muted-foreground">Corrected</span>
                        )}
                      </Can>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {ledgerMission?.completionsLedger.length === 0 ? (
              <p className="px-3 py-6 text-center text-sm text-muted-foreground">No completions recorded in the sample for this mission.</p>
            ) : null}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setLedgerMission(null)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ReasonDialog
        open={Boolean(correcting)}
        onOpenChange={(open) => { if (!open) setCorrecting(null) }}
        title="Correct this mission completion?"
        description="The completion is marked corrected and the season count is reduced. The badge and XP entry are kept for audit."
        confirmLabel="Correct completion"
        danger
        error={correctError}
        onConfirm={(reason) => {
          if (!correcting) return
          try {
            actions.correctMissionCompletion(correcting.mission.id, correcting.completionId, reason)
            setCorrecting(null)
            setLedgerMission(null)
          } catch (cause) {
            setCorrectError(cause instanceof Error ? cause.message : 'Could not correct the completion.')
          }
        }}
      />
    </AdminPage>
  )
}
