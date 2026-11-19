import { useMemo, useState } from 'react'
import { createFileRoute, Link } from '@tanstack/react-router'
import { Eye, EyeSlash, Lock, Snowflake } from '@phosphor-icons/react'
import { Button } from '#/components/ui/button'
import { Input } from '#/components/ui/input'
import { Can } from '#/components/shell/Gates'
import { useRecognition } from '#/lib/recognition/store'
import { formatDateTime, relativeAge } from '#/lib/recognition/format'
import { boardStateLabel } from '#/lib/recognition/logic'
import {
  AdminPage,
  BoardRows,
  DataState,
  Notice,
  ScopeNote,
  StatusPill,
} from '#/components/recognition/shared'
import { ReasonDialog } from '#/components/recognition/dialogs'
import type { BoardRow } from '#/lib/recognition/types'

export const Route = createFileRoute('/_authenticated/recognition/leaderboard')({
  component: LeaderboardPage,
})

function LeaderboardPage() {
  const { state, actions, engineOn, loads, can } = useRecognition()
  const activeSeason = state.seasons.find((season) => season.status === 'active') ?? state.seasons[0]
  const [seasonKey, setSeasonKey] = useState(activeSeason?.key ?? '')
  const [search, setSearch] = useState('')
  const [retractTarget, setRetractTarget] = useState<BoardRow | null>(null)
  const [retractError, setRetractError] = useState<string | null>(null)
  const [visibilityOpen, setVisibilityOpen] = useState(false)
  const [visibilityError, setVisibilityError] = useState<string | null>(null)

  const season = state.seasons.find((entry) => entry.key === seasonKey) ?? activeSeason
  const board = season ? state.boards[season.key] : undefined
  const closed = season?.status === 'closed'
  const rows = board?.rows ?? []
  const activeRows = rows.filter((row) => row.status === 'active')
  const retractedRows = rows.filter((row) => row.status === 'retracted')
  const query = search.trim().toLowerCase()
  const visibleRows = useMemo(
    () => (query ? rows.filter((row) => row.displayName.toLowerCase().includes(query)) : rows),
    [rows, query]
  )
  const pendingNames = state.moderation.filter(
    (entry) =>
      (entry.kind === 'display_name' || entry.kind === 'leaderboard_cheat') &&
      entry.status !== 'decided' &&
      entry.status !== 'closed'
  )
  const retractDisabledReason = board?.frozen ? 'The board is frozen. Unfreeze before retracting.' : undefined

  if (!season || !board) {
    return (
      <AdminPage kicker="Recognition · Leaderboard" title="Leaderboard">
        <DataState
          state={loads.leaderboard === 'loading' ? 'loading' : 'empty'}
          emptyTitle="No season board"
          emptyDescription="Create and publish a season to open a board."
          emptyAction={
            <Button asChild>
              <Link to="/recognition/seasons">Open seasons</Link>
            </Button>
          }
        >
          {null}
        </DataState>
      </AdminPage>
    )
  }

  return (
    <AdminPage
      kicker="Recognition · Leaderboard"
      title="Leaderboard"
      sub={
        <>
          {season.nameEn} · {season.status === 'closed' ? 'closed' : 'open'} · {activeRows.length} opted-in
          adults · top 50 plus own rank · boards under 10 are suppressed
        </>
      }
      actions={
        <label className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
          Season
          <select
            value={season.key}
            onChange={(event) => setSeasonKey(event.target.value)}
            aria-label="Season"
            className="h-8 rounded-md border border-border bg-card px-2 text-sm font-medium text-foreground"
          >
            {state.seasons.map((entry) => (
              <option key={entry.key} value={entry.key}>
                {entry.nameEn} · {entry.status}
              </option>
            ))}
          </select>
        </label>
      }
    >
      <ScopeNote>
        Ranks are recomputed from verified trail completions, then verified sites, XP, and earliest
        completion. Retraction closes the gap; it never leaves a hole.
      </ScopeNote>

      {closed ? (
        <Notice tone="neutral" title="This season is closed.">
          The board is a read-only snapshot from {formatDateTime(season.closedAt)}. Retractions and restores
          are not available after a season closes.
        </Notice>
      ) : null}
      {board.publicHidden ? (
        <Notice tone="gold" title="Public board is hidden.">
          Ranks are visible to operators only. Hiding the public page does not change XP or ranks.
        </Notice>
      ) : null}
      {board.frozen && !closed ? (
        <Notice tone="gold" title="Board frozen.">
          Ranks stay readable and no new placements are written until it is unfrozen.
        </Notice>
      ) : null}
      {board.suppressed ? (
        <Notice tone="gold" title={`Public board suppressed: ${activeRows.length} active adults.`}>
          The public board shows no ranks below the 10-person threshold. The operator view below is private
          and audited.
        </Notice>
      ) : null}

      <div className="mb-3 flex flex-wrap items-center gap-2">
        <Input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search display name"
          aria-label="Search display names"
          className="h-9 w-full sm:w-64"
        />
        <span className="text-xs font-semibold text-muted-foreground">
          {visibleRows.filter((row) => row.status === 'active').length} of {activeRows.length} active
        </span>
        {retractedRows.length > 0 ? (
          <span className="text-xs font-semibold text-destructive dark:text-red-300">
            {retractedRows.length} retracted
          </span>
        ) : null}
      </div>

      <div className="overflow-hidden rounded-lg border border-border bg-card">
        <BoardRows
          rows={visibleRows}
          closed={closed}
          retractDisabledReason={retractDisabledReason}
          onRetract={(row) => {
            setRetractError(null)
            setRetractTarget(row)
          }}
          onRestore={(row) => {
            try {
              actions.restoreEntry(season.key, row.displayName)
            } catch (cause) {
              setRetractError(cause instanceof Error ? cause.message : 'Could not restore the entry.')
            }
          }}
        />
        <div className="border-t border-border px-4 py-2 text-xs text-muted-foreground">
          Ranks recomputed {relativeAge(board.updatedAt)} · {board.rankingNote}
        </div>
      </div>

      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <section className="rounded-lg border border-border bg-card">
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <h2 className="font-sans text-base font-bold text-foreground">Display names</h2>
            <span className="text-xs text-muted-foreground">{pendingNames.length} pending</span>
          </div>
          <div className="p-4">
            {pendingNames.length > 0 ? (
              <>
                <p className="text-sm font-semibold text-foreground">{pendingNames[0].subject}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {pendingNames[0].reason} · {relativeAge(pendingNames[0].createdAt)} ago · 48-hour target
                </p>
                <Button variant="outline" size="sm" className="mt-3" asChild>
                  <Link to="/recognition/reports">Open decision</Link>
                </Button>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">No display name is waiting for a decision.</p>
            )}
          </div>
        </section>

        <section className="rounded-lg border border-border bg-card">
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <h2 className="font-sans text-base font-bold text-foreground">Board state</h2>
            <StatusPill
              status={
                board.suppressed
                  ? 'suppressed'
                  : board.frozen
                    ? 'frozen'
                    : board.publicHidden
                      ? 'published'
                      : 'draft'
              }
              label={boardStateLabel(board, engineOn)}
            />
          </div>
          <div className="p-4">
            <p className="text-xs text-muted-foreground">
              Freezing stops new placements and keeps ranks readable. Hiding removes the public page. They are
              separate controls.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Can permission="recognition.publish_season">
                {board.frozen ? (
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={closed}
                    onClick={() =>
                      actions.setBoardFrozen(
                        season.key,
                        false,
                        'Investigation concluded; placements resumed.'
                      )
                    }
                  >
                    <Snowflake className="h-4 w-4" weight="duotone" /> Unfreeze board
                  </Button>
                ) : (
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={closed}
                    onClick={async () => {
                      try {
                        await actions.freezeSeason(season.key)
                      } catch (cause) {
                        setRetractError(
                          cause instanceof Error ? cause.message : 'Could not freeze the board.'
                        )
                      }
                    }}
                  >
                    <Snowflake className="h-4 w-4" weight="duotone" /> Freeze board
                  </Button>
                )}
              </Can>
              <Can permission="recognition.kill_switch">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setVisibilityError(null)
                    setVisibilityOpen(true)
                  }}
                >
                  {board.publicHidden ? (
                    <Eye className="h-4 w-4" weight="duotone" />
                  ) : (
                    <EyeSlash className="h-4 w-4" weight="duotone" />
                  )}
                  {board.publicHidden ? 'Show public board' : 'Hide public board'}
                </Button>
              </Can>
              <Button variant="ghost" size="sm" asChild>
                <Link to="/recognition/kill-switches">Public visibility</Link>
              </Button>
            </div>
            {closed ? (
              <p className="mt-3 flex items-center gap-1.5 text-xs text-muted-foreground">
                <Lock className="h-3.5 w-3.5" weight="bold" /> A closed board cannot be frozen, hidden,
                retracted or restored.
              </p>
            ) : null}
          </div>
        </section>
      </div>

      {retractError ? (
        <Notice tone="red" title="Board action blocked">
          {retractError}
        </Notice>
      ) : null}

      <ReasonDialog
        open={Boolean(retractTarget)}
        onOpenChange={(open) => {
          if (!open) setRetractTarget(null)
        }}
        title={retractTarget ? `Retract ${retractTarget.displayName}?` : 'Retract entry'}
        description="The entry leaves the public board, ranks are recomputed, and the action is audited. Private progress and badges are kept."
        confirmLabel="Retract entry"
        danger
        minLength={10}
        error={retractError}
        onConfirm={(reason) => {
          if (!retractTarget) return
          try {
            actions.retractEntry(season.key, retractTarget.displayName, reason)
            setRetractTarget(null)
          } catch (cause) {
            setRetractError(cause instanceof Error ? cause.message : 'Could not retract the entry.')
          }
        }}
      />

      <ReasonDialog
        open={visibilityOpen}
        onOpenChange={setVisibilityOpen}
        title={board.publicHidden ? 'Show the public board?' : 'Hide the public board?'}
        description="The public switch is checked server-side on every read. Hiding removes the page and public rank badges; it never removes XP."
        confirmLabel={board.publicHidden ? 'Show public board' : 'Hide public board'}
        danger={!board.publicHidden}
        minLength={5}
        error={visibilityError}
        onConfirm={async (reason) => {
          try {
            await actions.setPublicHidden(!board.publicHidden, reason)
            setVisibilityOpen(false)
          } catch (cause) {
            setVisibilityError(cause instanceof Error ? cause.message : 'Could not change public visibility.')
          }
        }}
      />
      {!can('recognition.publish_season') ? (
        <p className="mt-3 text-xs text-muted-foreground">
          Your role can read the board but not freeze or close it.
        </p>
      ) : null}
    </AdminPage>
  )
}
