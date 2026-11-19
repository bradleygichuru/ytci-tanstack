import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { DownloadSimple } from "@phosphor-icons/react";
import { Button } from "#/components/ui/button";
import { Input } from "#/components/ui/input";
import { useRecognition } from "#/lib/recognition/store";
import { formatDateTime, relativeAge } from "#/lib/recognition/format";
import { downloadCsv, toCsv } from "#/lib/recognition/logic";
import {
  AdminPage,
  DataState,
  Notice,
  ScopeNote,
  StatusPill,
} from "#/components/recognition/shared";
import type { AuditCategory } from "#/lib/recognition/types";

export const Route = createFileRoute("/_authenticated/recognition/audit")({
  component: AuditPage,
});

type AuditFilter = "all" | AuditCategory;

const FILTERS: { value: AuditFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "awards", label: "Awards" },
  { value: "rules", label: "Rules" },
  { value: "events", label: "Seasons & events" },
  { value: "moderation", label: "Safety & moderation" },
  { value: "safety", label: "Kill switches" },
  { value: "system", label: "System" },
];

function AuditPage() {
  const { state, loads } = useRecognition();
  const [filter, setFilter] = useState<AuditFilter>("all");
  const [search, setSearch] = useState("");

  const query = search.trim().toLowerCase();
  const visible = useMemo(
    () =>
      state.audit
        .filter((entry) =>
          filter === "all" ? true : entry.category === filter,
        )
        .filter(
          (entry) =>
            !query ||
            `${entry.actor} ${entry.action} ${entry.entity} ${entry.detail}`
              .toLowerCase()
              .includes(query),
        )
        .slice()
        .sort((a, b) => b.at.localeCompare(a.at)),
    [state.audit, filter, query],
  );

  const exportCsv = () => {
    const csv = toCsv(
      ["at", "actor", "role", "action", "entity", "detail", "category"],
      visible.map((entry) => [
        formatDateTime(entry.at),
        entry.actor,
        entry.role,
        entry.action,
        entry.entity,
        entry.detail,
        entry.category,
      ]),
    );
    downloadCsv("recognition-audit.csv", csv);
  };

  if (loads.audit === "loading" && state.audit.length === 0) {
    return (
      <AdminPage kicker="Recognition · Audit" title="Audit log">
        <DataState state="loading">{null}</DataState>
      </AdminPage>
    );
  }

  return (
    <AdminPage
      kicker="Recognition · Audit"
      title="Audit log"
      sub="The same append-only log as the rest of the programme, shown for recognition. Actor, role and absolute time on every entry."
      actions={
        <Button
          variant="outline"
          size="sm"
          onClick={exportCsv}
          disabled={visible.length === 0}
        >
          <DownloadSimple className="h-4 w-4" weight="duotone" /> Export CSV
        </Button>
      }
    >
      <ScopeNote>
        {visible.length} of {state.audit.length} entries · exports respect the
        active filter
      </ScopeNote>

      <div className="mb-3 flex flex-wrap items-center gap-2">
        <div
          className="flex flex-wrap gap-1"
          role="group"
          aria-label="Audit category"
        >
          {FILTERS.map((entry) => (
            <button
              key={entry.value}
              type="button"
              aria-pressed={filter === entry.value}
              onClick={() => setFilter(entry.value)}
              className={`rounded-full px-3 py-1 text-xs font-semibold ${
                filter === entry.value
                  ? "bg-primary text-primary-foreground"
                  : "border border-border bg-card text-muted-foreground hover:text-foreground"
              }`}
            >
              {entry.label}
            </button>
          ))}
        </div>
        <Input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search actor, action or entity"
          aria-label="Search audit log"
          className="h-9 w-full sm:w-64"
        />
      </div>

      <div className="overflow-hidden rounded-lg border border-border bg-card">
        {visible.length === 0 ? (
          <div className="px-6 py-10 text-center">
            <p className="font-sans text-lg font-bold text-foreground">
              No entries in this filter
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              Choose All to see the whole activity log.
            </p>
            <Button
              variant="outline"
              size="sm"
              className="mt-3"
              onClick={() => setFilter("all")}
            >
              Show all
            </Button>
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {visible.map((entry) => (
              <li
                key={entry.id}
                className="grid gap-2 px-4 py-3 sm:grid-cols-[190px_1fr_170px]"
              >
                <div className="text-xs text-muted-foreground">
                  <span className="block font-mono text-[11px] text-foreground">
                    {formatDateTime(entry.at)}
                  </span>
                  <span className="block">{relativeAge(entry.at)}</span>
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-foreground">
                    {entry.action}
                  </p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {entry.entity}
                  </p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {entry.detail}
                  </p>
                  <div className="mt-1 flex flex-wrap items-center gap-1.5">
                    <StatusPill status="draft" label={entry.category} />
                  </div>
                </div>
                <div className="text-xs text-muted-foreground sm:text-right">
                  <p className="font-semibold text-foreground">{entry.actor}</p>
                  <p>{entry.role}</p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <Notice tone="neutral" title="One log, one name.">
        Recognition decisions, adjustments, kill switches and rule versions all
        land in this stream. The entries are append-only; correcting an award
        adds a compensating entry rather than removing history.
      </Notice>
    </AdminPage>
  );
}
