import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Lock, Plus } from "@phosphor-icons/react";
import { Button } from "#/components/ui/button";
import { Input } from "#/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "#/components/ui/dialog";
import { Can } from "#/components/shell/Gates";
import { useRecognition } from "#/lib/recognition/store";
import { formatDate, formatNumber } from "#/lib/recognition/format";
import {
  AdminPage,
  DataState,
  Notice,
  ScopeNote,
  StatusPill,
} from "#/components/recognition/shared";
import { ActionDialog, ReasonDialog } from "#/components/recognition/dialogs";
import type { Season } from "#/lib/recognition/types";

export const Route = createFileRoute("/_authenticated/recognition/seasons")({
  component: SeasonsPage,
});

interface SeasonForm {
  key: string;
  nameEn: string;
  nameSw: string;
  startsAt: string;
  endsAt: string;
  badgeKey: string;
  xpAward: number;
  missionFamilies: string[];
}

const FAMILIES = [
  "Discovery",
  "Events",
  "Conservation",
  "Learning",
  "Listening",
];

function SeasonsPage() {
  const { state, actions, engineOn, actor } = useRecognition();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState<SeasonForm>({
    key: "",
    nameEn: "",
    nameSw: "",
    startsAt: "2027-01-01",
    endsAt: "2027-03-31",
    badgeKey: "none",
    xpAward: 500,
    missionFamilies: FAMILIES,
  });
  const [error, setError] = useState<string | null>(null);
  const [snapshotSeason, setSnapshotSeason] = useState<Season | null>(null);
  const [closing, setClosing] = useState<Season | null>(null);
  const [closeError, setCloseError] = useState<string | null>(null);
  const [freezing, setFreezing] = useState<Season | null>(null);

  const publishedBadges = state.badges.filter(
    (badge) => badge.status === "published",
  );

  const createSeason = () => {
    if (!/^[a-z0-9-]+$/.test(form.key.trim()))
      return setError("Use a short key such as 2027-q1.");
    if (!form.nameEn.trim()) return setError("Give the season a name.");
    if (!form.startsAt || !form.endsAt)
      return setError("Choose the start and end dates.");
    if (new Date(form.endsAt) <= new Date(form.startsAt))
      return setError("The end date must be after the start date.");
    actions.createSeason({
      key: form.key.trim(),
      nameEn: form.nameEn.trim(),
      nameSw: form.nameSw.trim() || form.nameEn.trim(),
      startsAt: `${form.startsAt}T00:00:00+03:00`,
      endsAt: `${form.endsAt}T23:59:59+03:00`,
      badgeKey: form.badgeKey === "none" ? null : form.badgeKey,
      xpAward: form.xpAward,
      missionFamilies: form.missionFamilies,
    });
    setDialogOpen(false);
  };

  if (state.seasons.length === 0) {
    return (
      <AdminPage kicker="Recognition · Seasons" title="Seasons">
        <DataState
          state="empty"
          emptyTitle="No seasons in this view"
          emptyDescription="Create a quarterly season, prepare its families, then publish it. Closing snapshots the board."
          emptyAction={
            <Button onClick={() => setDialogOpen(true)}>Create a season</Button>
          }
        >
          {null}
        </DataState>
      </AdminPage>
    );
  }

  return (
    <AdminPage
      kicker="Recognition · Seasons"
      title="Seasons"
      sub="Quarterly seasons. Closing snapshots the board; XP, levels and badges never decay."
      actions={
        <Can permission="recognition.prepare_season">
          <Button
            size="sm"
            onClick={() => {
              setError(null);
              setDialogOpen(true);
            }}
          >
            <Plus className="h-4 w-4" weight="bold" /> Create season
          </Button>
        </Can>
      }
    >
      <ScopeNote>
        Closing a season is a two-person action. A closed board is a read-only
        snapshot.
      </ScopeNote>

      <div className="overflow-hidden rounded-lg border border-border bg-card">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[860px] text-sm">
            <caption className="sr-only">Seasons and board state</caption>
            <thead>
              <tr className="border-b bg-[var(--surface-2)] text-left text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
                <th scope="col" className="px-4 py-3">
                  Season
                </th>
                <th scope="col" className="px-4 py-3">
                  Dates
                </th>
                <th scope="col" className="px-4 py-3">
                  State
                </th>
                <th scope="col" className="px-4 py-3 text-right">
                  Board
                </th>
                <th scope="col" className="px-4 py-3">
                  Board state
                </th>
                <th scope="col" className="px-4 py-3 text-right">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {state.seasons.map((season) => {
                const board = state.boards[season.key];
                const activeRows =
                  board?.rows.filter((row) => row.status === "active") ?? [];
                const closed = season.status === "closed";
                return (
                  <tr
                    key={season.key}
                    className="border-b last:border-0 hover:bg-[var(--surface-2)]"
                  >
                    <td className="px-4 py-3">
                      <span className="font-semibold text-foreground">
                        {season.nameEn}
                      </span>
                      <span className="block text-xs text-muted-foreground">
                        {season.nameSw} · {season.key}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">
                      {formatDate(season.startsAt)} –{" "}
                      {formatDate(season.endsAt)}
                    </td>
                    <td className="px-4 py-3">
                      <StatusPill status={season.status} />
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-xs">
                      {formatNumber(activeRows.length)}
                    </td>
                    <td className="px-4 py-3 text-xs">
                      {board?.suppressed ? (
                        <span className="font-semibold text-[var(--amber-deep)]">
                          Suppressed · under 10 active
                        </span>
                      ) : board?.publicHidden ? (
                        <span className="font-semibold text-[var(--amber-deep)]">
                          Hidden publicly
                        </span>
                      ) : board?.frozen ? (
                        <span className="font-semibold text-[var(--amber-deep)]">
                          Frozen
                        </span>
                      ) : (
                        <span className="text-muted-foreground">Public</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="inline-flex flex-wrap justify-end gap-1">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setSnapshotSeason(season)}
                        >
                          {closed ? "View snapshot" : "Board"}
                        </Button>
                        <Can permission="recognition.publish_season">
                          {season.status === "upcoming" ? (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() =>
                                void actions.publishSeason(season.key)
                              }
                            >
                              Publish
                            </Button>
                          ) : null}
                        </Can>
                        <Can permission="recognition.publish_season">
                          {season.status === "active" ? (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setFreezing(season)}
                            >
                              Freeze
                            </Button>
                          ) : null}
                          {season.status === "frozen" ? (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() =>
                                actions.setBoardFrozen(
                                  season.key,
                                  false,
                                  "Investigation concluded; placements resumed.",
                                )
                              }
                            >
                              Unfreeze
                            </Button>
                          ) : null}
                        </Can>
                        <Can permission="recognition.close_season">
                          {!closed && season.status !== "upcoming" ? (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setCloseError(null);
                                setClosing(season);
                              }}
                            >
                              Close season
                            </Button>
                          ) : null}
                        </Can>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <Notice tone="neutral" title="No countdown, no loss framing.">
        Closing snapshots the final board and allows only audited corrections.
        There is no countdown pressure or loss-framed messaging. A season close
        needs a second administrator: the preparer cannot close it alone.
      </Notice>

      <ActionDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        title="Create a season"
        description="A season starts as upcoming. Publishing opens its board; closing snapshots it."
        confirmLabel="Prepare season"
        onConfirm={createSeason}
        error={error}
        size="lg"
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block space-y-1.5">
            <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Key
            </span>
            <Input
              value={form.key}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, key: event.target.value }))
              }
              placeholder="2027-q1"
              aria-label="Season key"
            />
          </label>
          <label className="block space-y-1.5">
            <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              English name
            </span>
            <Input
              value={form.nameEn}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, nameEn: event.target.value }))
              }
              placeholder="Roots"
              aria-label="English name"
            />
          </label>
          <label className="block space-y-1.5">
            <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Kiswahili name
            </span>
            <Input
              value={form.nameSw}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, nameSw: event.target.value }))
              }
              placeholder="Mizizi"
              aria-label="Kiswahili name"
            />
          </label>
          <label className="block space-y-1.5">
            <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              XP award
            </span>
            <Input
              type="number"
              min={0}
              value={form.xpAward}
              onChange={(event) =>
                setForm((prev) => ({
                  ...prev,
                  xpAward: Number(event.target.value),
                }))
              }
              aria-label="XP award"
            />
          </label>
          <label className="block space-y-1.5">
            <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Starts
            </span>
            <Input
              type="date"
              value={form.startsAt}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, startsAt: event.target.value }))
              }
              aria-label="Start date"
            />
            <span className="text-xs text-muted-foreground">
              {formatDate(form.startsAt)}
            </span>
          </label>
          <label className="block space-y-1.5">
            <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Ends
            </span>
            <Input
              type="date"
              value={form.endsAt}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, endsAt: event.target.value }))
              }
              aria-label="End date"
            />
            <span className="text-xs text-muted-foreground">
              {formatDate(form.endsAt)}
            </span>
          </label>
          <label className="block space-y-1.5">
            <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Season badge
            </span>
            <select
              value={form.badgeKey}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, badgeKey: event.target.value }))
              }
              aria-label="Season badge"
              className="h-9 w-full rounded-md border border-border bg-card px-2 text-sm"
            >
              <option value="none">None</option>
              {publishedBadges.map((badge) => (
                <option key={badge.badgeKey} value={badge.badgeKey}>
                  {badge.nameEn}
                </option>
              ))}
            </select>
          </label>
          <fieldset className="sm:col-span-2">
            <legend className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Mission families
            </legend>
            <div className="mt-1 flex flex-wrap gap-3">
              {FAMILIES.map((family) => (
                <label
                  key={family}
                  className="flex items-center gap-1.5 text-sm"
                >
                  <input
                    type="checkbox"
                    checked={form.missionFamilies.includes(family)}
                    onChange={(event) =>
                      setForm((prev) => ({
                        ...prev,
                        missionFamilies: event.target.checked
                          ? [...prev.missionFamilies, family]
                          : prev.missionFamilies.filter(
                              (entry) => entry !== family,
                            ),
                      }))
                    }
                  />
                  {family}
                </label>
              ))}
            </div>
          </fieldset>
        </div>
      </ActionDialog>

      <ReasonDialog
        open={Boolean(closing)}
        onOpenChange={(open) => {
          if (!open) setClosing(null);
        }}
        title={closing ? `Close ${closing.nameEn}?` : "Close season"}
        description={
          closing
            ? `Closing snapshots ${state.boards[closing.key]?.rows.filter((row) => row.status === "active").length ?? 0} active rows and makes the board read-only. The season badge is awarded from the snapshot.`
            : undefined
        }
        confirmLabel="Close and snapshot"
        danger
        minLength={10}
        requireTypedWord={closing?.key}
        error={closeError}
        notice={
          closing && closing.preparedBy === actor.id ? (
            <Notice
              tone="red"
              title="A second administrator must close this season."
            >
              You prepared this season. Switch to another administrator to
              record the close.
            </Notice>
          ) : null
        }
        onConfirm={async (reason) => {
          if (!closing) return;
          try {
            await actions.closeSeason(closing.key, reason);
            setClosing(null);
          } catch (cause) {
            setCloseError(
              cause instanceof Error
                ? cause.message
                : "Could not close the season.",
            );
          }
        }}
      />

      <ActionDialog
        open={Boolean(freezing)}
        onOpenChange={(open) => {
          if (!open) setFreezing(null);
        }}
        title={freezing ? `Freeze ${freezing.nameEn}?` : "Freeze board"}
        description="Freezing stops new placements and keeps ranks readable. It is separate from hiding the public board."
        confirmLabel="Freeze board"
        onConfirm={async () => {
          if (!freezing) return;
          await actions.freezeSeason(freezing.key);
          setFreezing(null);
        }}
      >
        <p className="text-sm text-muted-foreground">
          Use freeze during an investigation. Readers keep their XP and badges;
          the board simply stops accepting new placements until it is unfrozen.
        </p>
      </ActionDialog>

      <Dialog
        open={Boolean(snapshotSeason)}
        onOpenChange={(open) => {
          if (!open) setSnapshotSeason(null);
        }}
      >
        <DialogContent className="sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>{snapshotSeason?.nameEn} board</DialogTitle>
            <DialogDescription>
              {snapshotSeason?.status === "closed"
                ? `Read-only snapshot from ${formatDate(snapshotSeason.closedAt)} · closed by ${snapshotSeason.closedBy ?? "—"}`
                : "Live operator view · retraction is available from the Leaderboard screen"}
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-96 overflow-auto">
            <table className="w-full min-w-[640px] text-sm">
              <caption className="sr-only">Season board snapshot</caption>
              <thead>
                <tr className="border-b bg-[var(--surface-2)] text-left text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
                  <th scope="col" className="px-3 py-2 text-right">
                    Rank
                  </th>
                  <th scope="col" className="px-3 py-2">
                    Display name
                  </th>
                  <th scope="col" className="px-3 py-2">
                    County
                  </th>
                  <th scope="col" className="px-3 py-2 text-right">
                    XP
                  </th>
                  <th scope="col" className="px-3 py-2">
                    Level
                  </th>
                  <th scope="col" className="px-3 py-2 text-right">
                    Sites
                  </th>
                  <th scope="col" className="px-3 py-2 text-right">
                    Trails
                  </th>
                </tr>
              </thead>
              <tbody>
                {(state.boards[snapshotSeason?.key ?? ""]?.rows ?? [])
                  .filter((row) => row.status === "active")
                  .map((row) => (
                    <tr
                      key={row.displayName}
                      className="border-b last:border-0"
                    >
                      <td className="px-3 py-2 text-right font-mono text-xs">
                        {row.rank}
                      </td>
                      <td className="px-3 py-2 font-medium">
                        {row.displayName}
                      </td>
                      <td className="px-3 py-2 text-xs text-muted-foreground">
                        {row.county ?? "—"}
                      </td>
                      <td className="px-3 py-2 text-right font-mono text-xs">
                        {formatNumber(row.xp)}
                      </td>
                      <td className="px-3 py-2">{row.level}</td>
                      <td className="px-3 py-2 text-right">
                        {row.verifiedSites}
                      </td>
                      <td className="px-3 py-2 text-right">
                        {row.trailCompletions}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
            {(state.boards[snapshotSeason?.key ?? ""]?.rows.filter(
              (row) => row.status === "active",
            ).length ?? 0) === 0 ? (
              <p className="px-3 py-6 text-center text-sm text-muted-foreground">
                No ranked entries on this board.
              </p>
            ) : null}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSnapshotSeason(null)}>
              Close
            </Button>
            {snapshotSeason?.status === "closed" ? (
              <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                <Lock className="h-3.5 w-3.5" weight="bold" /> Read-only
                snapshot
              </span>
            ) : null}
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {!engineOn ? (
        <Notice tone="gold" title="Engine off">
          Season closes and freezes stay visible, but new awards are paused.
        </Notice>
      ) : null}
    </AdminPage>
  );
}
