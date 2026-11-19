/**
 * Recognition admin layout.
 *
 * The shared sidebar has one Recognition entry. This layout owns the surface's
 * internal operation groups, the data-state switcher, the engine-off banner and
 * the dataset marker. Route content is the only thing the child screens render.
 */
import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { Lock } from "@phosphor-icons/react";
import { canAccessAdmin, normaliseRole } from "#/lib/contracts/roles";
import { hasContractPermission } from "#/lib/contracts/session";
import { RecognitionProvider, useRecognition } from "#/lib/recognition/store";
import {
  EngineOffBanner,
  FixtureStateControl,
  RecognitionNav,
  ScenarioBanner,
} from "#/components/recognition/shared";
import { StatusPill } from "#/components/recognition/shared";

export const Route = createFileRoute("/_authenticated/recognition")({
  beforeLoad: ({ context }) => {
    const role = normaliseRole(context.user?.role);
    if (
      !canAccessAdmin(role) ||
      !hasContractPermission(role, "recognition.read")
    ) {
      throw redirect({ to: "/no-access" });
    }
  },
  component: RecognitionLayout,
});

function RecognitionLayout() {
  return (
    <RecognitionProvider>
      <RecognitionShell />
    </RecognitionProvider>
  );
}

function RecognitionShell() {
  const { source, scenario, state, engineOn, apiStatus } = useRecognition();
  const sourceLabel =
    scenario === "empty"
      ? "Empty dataset"
      : source === "api"
        ? "Contract API"
        : source === "mixed"
          ? "Contract API + sample overlay"
          : "Sample data";
  const sourceStatus =
    source === "api" ? "published" : source === "mixed" ? "triaged" : "draft";

  return (
    <div className="space-y-4" style={{ wordSpacing: "0.04em" }}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <RecognitionNav />
        <div className="flex flex-wrap items-center gap-2">
          {!engineOn ? (
            <span className="inline-flex items-center gap-1 rounded-full border border-destructive/40 bg-destructive/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-destructive dark:text-red-300">
              <Lock className="h-3 w-3" weight="bold" /> Engine off
            </span>
          ) : null}
          <FixtureStateControl />
        </div>
      </div>

      <EngineOffBanner />
      <ScenarioBanner />

      {scenario === "error" ? (
        <div className="rounded-xl border border-destructive/30 bg-destructive/5 px-6 py-10 text-center">
          <p className="text-base font-semibold text-foreground">
            Recognition is unavailable
          </p>
          <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">
            The service returned an error and nothing was changed. Choose
            another data state or reset the sample to keep reviewing structure.
          </p>
        </div>
      ) : (
        <Outlet />
      )}

      <div className="flex flex-wrap items-center gap-2 border-t border-border pt-3 text-[11px] text-muted-foreground">
        <StatusPill status={sourceStatus} label={sourceLabel} />
        <span>
          {scenario === "stale"
            ? "Stale read: last-known values, writes disabled."
            : scenario === "readonly"
              ? "Read-only preview: browse and export only."
              : "Awards are server-authoritative. Operator overlays (retraction, mission pause, award retry) are written to the same audit log and labelled."}
        </span>
        <span className="ml-auto">
          {state.rules.filter((rule) => rule.status === "published").length}{" "}
          published rules · {state.awards.length} sample awards ·{" "}
          {apiStatus === "loading" ? "refreshing…" : "reads settled"}
        </span>
      </div>
    </div>
  );
}
