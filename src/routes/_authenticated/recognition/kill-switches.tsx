import { useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { CheckCircle, Clock, Power } from '@phosphor-icons/react'
import { Switch } from '#/components/ui/switch'
import { useRecognition } from '#/lib/recognition/store'
import { formatDateTime, relativeAge } from '#/lib/recognition/format'
import { AdminPage, DataState, Notice, ScopeNote, StatusPill } from '#/components/recognition/shared'
import { ReasonDialog } from '#/components/recognition/dialogs'
import type { KillSwitch } from '#/lib/recognition/types'

export const Route = createFileRoute('/_authenticated/recognition/kill-switches')({
  component: KillSwitchesPage,
})

function KillSwitchesPage() {
  const { state, actions, loads, can, engineOn } = useRecognition()
  const [target, setTarget] = useState<{
    entry: KillSwitch
    enabled: boolean
  } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  const history = state.audit.filter((entry) => entry.category === 'safety')
  const requiresTyped = target?.entry.key === 'global' && !target.enabled

  if (loads.killSwitches === 'loading' && state.killSwitches.length === 0) {
    return (
      <AdminPage kicker="Recognition · Safety" title="Kill switches">
        <DataState state="loading">{null}</DataState>
      </AdminPage>
    )
  }

  return (
    <AdminPage
      kicker="Recognition · Safety"
      title="Kill switches"
      sub="Each switch records actor, time and reason. Turning a source off stops new awards; it never removes earned XP or badges."
      actions={
        <span className="text-xs font-semibold text-muted-foreground">
          Checked server-side on every write
        </span>
      }
    >
      <ScopeNote>
        Engine {engineOn ? 'on' : 'off'} · {state.killSwitches.filter((entry) => entry.enabled).length} of{' '}
        {state.killSwitches.length} switches on
      </ScopeNote>

      {!can('recognition.kill_switch') ? (
        <Notice tone="gold" title="Read-only for your role.">
          Only a super administrator can flip a recognition kill switch. Current state, reason and history
          stay readable.
        </Notice>
      ) : null}

      <div className="grid gap-4 xl:grid-cols-[1.6fr_1fr]">
        <div className="rounded-lg border border-border bg-card">
          <ul className="divide-y divide-border">
            {state.killSwitches.map((entry) => (
              <li key={entry.key} className="px-4 py-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-bold text-foreground">{entry.label}</p>
                      <StatusPill
                        status={entry.enabled ? 'published' : 'failed'}
                        label={entry.enabled ? 'On' : 'Off'}
                      />
                    </div>
                    <p className="mt-1 max-w-xl text-xs text-muted-foreground">{entry.description}</p>
                    <p className="mt-1 text-[11px] text-muted-foreground">
                      <span className="font-semibold text-foreground">Blocks:</span> {entry.blocks}
                    </p>
                    <p className="mt-1 text-[11px] text-muted-foreground">
                      {entry.updatedBy ?? '—'} · {formatDateTime(entry.updatedAt)} · reason:{' '}
                      {entry.reason ?? '—'}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
                      {entry.enabled ? 'On' : 'Off'}
                    </span>
                    <Switch
                      checked={entry.enabled}
                      disabled={!can('recognition.kill_switch')}
                      onCheckedChange={(checked) => {
                        setError(null)
                        setTarget({ entry, enabled: checked })
                      }}
                      aria-label={`${entry.label} switch`}
                    />
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>

        <div className="space-y-4">
          <section className="rounded-lg border border-border bg-card">
            <div className="border-b border-border px-4 py-3">
              <h2 className="font-sans text-base font-bold text-foreground">Engine-off behaviour</h2>
            </div>
            <ul className="space-y-2 p-4 text-xs">
              <li className="flex items-start gap-2">
                <CheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-[var(--success-leaf)]" weight="fill" />
                <span>Awards stop; earned XP and badges remain readable.</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-[var(--success-leaf)]" weight="fill" />
                <span>Public recognition pages stay up with no new placements.</span>
              </li>
              <li className="flex items-start gap-2">
                <Clock className="mt-0.5 h-4 w-4 shrink-0 text-[var(--amber-deep)]" weight="fill" />
                <span>
                  Backfill, batch approval, rule publishing and award retry are blocked while the engine is
                  off.
                </span>
              </li>
            </ul>
          </section>

          <section className="rounded-lg border border-border bg-card">
            <div className="border-b border-border px-4 py-3">
              <h2 className="font-sans text-base font-bold text-foreground">Switch history</h2>
            </div>
            <ul className="divide-y divide-border">
              {history.slice(0, 5).map((entry) => (
                <li key={entry.id} className="px-4 py-3">
                  <p className="text-xs font-semibold text-foreground">{entry.action}</p>
                  <p className="mt-0.5 text-[11px] text-muted-foreground">
                    {entry.actor} · {formatDateTime(entry.at)} · {entry.detail}
                  </p>
                </li>
              ))}
              {history.length === 0 ? (
                <li className="px-4 py-6 text-center text-sm text-muted-foreground">
                  No switch changes recorded yet.
                </li>
              ) : null}
            </ul>
          </section>

          <section className="rounded-lg border border-border bg-card p-4">
            <div className="flex items-center gap-2 text-sm font-bold text-foreground">
              <Power className="h-4 w-4" weight="duotone" /> Dependency summary
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              The global switch blocks every write in this surface. Source switches block only their event
              contract. The public-leaderboard switch affects reads and never changes XP.
            </p>
            <p className="mt-2 text-[11px] text-muted-foreground">
              Last change: {state.killSwitches.map((entry) => relativeAge(entry.updatedAt)).sort()[0] ?? '—'}.
            </p>
          </section>
        </div>
      </div>

      <Notice tone="red" title="Turning the engine off is a typed confirmation.">
        The global switch needs the word OFF and a reason. It stops new awards immediately; readers keep
        everything they already earned.
      </Notice>

      <ReasonDialog
        open={Boolean(target)}
        onOpenChange={(open) => {
          if (!open) setTarget(null)
        }}
        title={
          target ? `${target.enabled ? 'Turn on' : 'Turn off'} ${target.entry.label}?` : 'Change kill switch'
        }
        description={
          target
            ? `${target.entry.description} ${target.enabled ? 'Turning it on resumes new awards for this source.' : 'Turning it off stops new awards; earned XP and badges are kept.'}`
            : undefined
        }
        confirmLabel={target?.enabled ? 'Turn on' : 'Turn off'}
        danger={!target?.enabled}
        minLength={5}
        requireTypedWord={requiresTyped ? 'OFF' : undefined}
        pending={pending}
        error={error}
        onConfirm={async (reason) => {
          if (!target) return
          setPending(true)
          setError(null)
          try {
            await actions.setKillSwitch(target.entry.key, target.enabled, reason)
            setTarget(null)
          } catch (cause) {
            setError(cause instanceof Error ? cause.message : 'Could not change the switch.')
          } finally {
            setPending(false)
          }
        }}
      />
    </AdminPage>
  )
}
