import { useEffect, useMemo, useRef, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  CheckCircle,
  FloppyDisk,
  Play,
  Trash,
  Warning,
} from "@phosphor-icons/react";
import { Button } from "#/components/ui/button";
import { Input } from "#/components/ui/input";
import { Can } from "#/components/shell/Gates";
import { useRecognition } from "#/lib/recognition/store";
import {
  diffRule,
  draftSignature,
  publishGate,
  ruleDraftFromRule,
  sourceOption,
  SOURCE_OPTIONS,
  STATUS_LABEL,
  validateRuleDraft,
  VERIFY_OPTIONS,
  type RuleFieldErrors,
} from "#/lib/recognition/logic";
import {
  formatDate,
  formatNumber,
  formatXp,
  relativeAge,
} from "#/lib/recognition/format";
import {
  AdminPage,
  DataState,
  Notice,
  RuleDiff,
  ScopeNote,
  StatusPill,
} from "#/components/recognition/shared";
import { ActionDialog } from "#/components/recognition/dialogs";
import { DirtyGuard } from "#/components/recognition/DirtyGuard";
import type { Rule, RuleDraft } from "#/lib/recognition/types";

export const Route = createFileRoute(
  "/_authenticated/recognition/rules/$ruleId",
)({
  component: RuleEditorPage,
});

function blankDraft(last?: Rule): RuleDraft {
  const option = SOURCE_OPTIONS[0];
  return {
    name: last?.name ?? "",
    sourceType: last?.sourceType ?? option.value,
    event: last?.event ?? option.event,
    verify: last?.verify ?? option.verify,
    xpAmount: last?.xpAmount ?? 50,
    badgeKey: last?.badgeKey ?? "none",
    effectiveFrom: last?.effectiveFrom ?? new Date().toISOString().slice(0, 10),
  };
}

function syntheticRule(ruleKey: string, draft: RuleDraft): Rule {
  return {
    id: "unsaved",
    ruleKey,
    version: 1,
    name: draft.name,
    status: "draft",
    sourceType: draft.sourceType,
    event: draft.event,
    verify: draft.verify,
    xpAmount: draft.xpAmount,
    badgeKey: draft.badgeKey === "none" ? null : draft.badgeKey,
    effectiveFrom: draft.effectiveFrom,
    effectiveTo: null,
    createdBy: "",
    publishedBy: null,
    updatedAt: new Date().toISOString(),
    weeklyCap: sourceOption(draft.sourceType).weeklyCap,
  };
}

function RuleEditorPage() {
  const { ruleId } = Route.useParams();
  const {
    state,
    loads,
    actions,
    publishedRule,
    draftRule,
    rulesFor,
    can,
    actor,
    engineOn,
    scenario,
    simulations,
  } = useRecognition();
  const ruleKey = decodeURIComponent(ruleId);
  const live = publishedRule(ruleKey);
  const draft = draftRule(ruleKey);
  const versions = rulesFor(ruleKey);

  const base = draft ?? live;
  const [form, setForm] = useState<RuleDraft>(() =>
    base ? ruleDraftFromRule(base) : blankDraft(),
  );
  const [initial, setInitial] = useState<RuleDraft>(() =>
    base ? ruleDraftFromRule(base) : blankDraft(),
  );
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [attempted, setAttempted] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [discardOpen, setDiscardOpen] = useState(false);

  const initialisedFor = useRef<string | null>(null);
  useEffect(() => {
    // Hydrate once per rule key, including when a contract-only rule arrives
    // after the first render. Saving a draft must not erase in-progress edits.
    if (!base || initialisedFor.current === ruleKey) return;
    const nextBase = ruleDraftFromRule(base);
    setForm(nextBase);
    setInitial(nextBase);
    setTouched({});
    setAttempted(false);
    setNotice(null);
    setError(null);
    initialisedFor.current = ruleKey;
  }, [ruleKey, base]);

  const dirty = draftSignature(form) !== draftSignature(initial);
  const errors: RuleFieldErrors = useMemo(
    () =>
      validateRuleDraft(form, {
        now: new Date(),
        badges: state.badges,
        requireFutureDate: dirty || !live,
      }),
    [form, state.badges, dirty, live],
  );
  const simEntry = simulations[ruleKey];
  const simMatches = Boolean(
    simEntry && simEntry.signature === draftSignature(form),
  );
  const readOnly =
    !can("recognition.author_rule") ||
    scenario === "readonly" ||
    scenario === "stale" ||
    scenario === "error";
  const gateLive = live ?? draft ?? syntheticRule(ruleKey, form);
  const changes = diffRule(
    live ?? base ?? syntheticRule(ruleKey, form),
    form,
    state.badges,
  );
  const gate = publishGate({
    live: gateLive,
    draft: form,
    simulation: simEntry?.simulation ?? null,
    simulationSignature: simEntry?.signature ?? null,
    errors,
    engineOn,
    canPublish: can("recognition.publish_rule"),
    canSimulate: can("recognition.simulate_rule"),
    actorId: actor.id,
    draftAuthorId: draft?.createdBy ?? actor.id,
  });
  const cap = sourceOption(form.sourceType).weeklyCap;

  if (loads.rules === "loading" && !base) {
    return (
      <AdminPage kicker="Recognition · Rules" title="Rule editor">
        <DataState state="loading">{null}</DataState>
      </AdminPage>
    );
  }
  if (!base) {
    return (
      <AdminPage
        kicker="Recognition · Rules"
        title="Rule not found"
        back={{ to: "/recognition/rules", label: "All rules" }}
      >
        <Notice tone="red" title="This rule key has no version.">
          Choose a rule from the list, or create a draft first.
        </Notice>
        <Button variant="outline" asChild>
          <Link to="/recognition/rules">Back to rules</Link>
        </Button>
      </AdminPage>
    );
  }

  const versionLabel = `v${draft?.version ?? live?.version ?? base.version}`;
  const status = draft ? "draft" : (live?.status ?? base.status);

  const showError = (field: keyof RuleDraft) =>
    Boolean(errors[field] && (attempted || touched[field]));
  const fieldClass = (field: keyof RuleDraft) =>
    `h-9 w-full rounded-md border bg-card px-2 text-sm text-foreground outline-none focus:ring-1 ${
      showError(field)
        ? "border-destructive focus:border-destructive focus:ring-destructive/30"
        : "border-border focus:border-primary focus:ring-primary"
    }`;
  const setField = <K extends keyof RuleDraft>(
    field: K,
    value: RuleDraft[K],
  ) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setNotice(null);
    setError(null);
  };
  const onSource = (sourceType: RuleDraft["sourceType"]) => {
    const option = sourceOption(sourceType);
    setForm((prev) => ({
      ...prev,
      sourceType,
      event: option.event,
      verify: option.verify,
    }));
    setNotice(null);
  };

  const runSimulation = async () => {
    setAttempted(true);
    setError(null);
    if (Object.keys(errors).length > 0) {
      setError("Fix the invalid fields before running a simulation.");
      return;
    }
    if (!dirty && !draft) {
      setError("Change at least one field to simulate a new version.");
      return;
    }
    setPending(true);
    try {
      const simulation = await actions.simulateRule(ruleKey, form);
      setNotice(
        `Simulation passed: ${formatNumber(simulation.evaluated)} evaluated · ${formatNumber(simulation.wouldAward)} would award · ${formatNumber(simulation.xpTotal)} XP · 0 duplicates.`,
      );
      actions.note({
        action: "Rule simulated",
        entity: `${ruleKey} · ${versionLabel}`,
        detail: `${formatNumber(simulation.evaluated)} evaluated · ${formatNumber(simulation.wouldAward)} would award · ${formatNumber(simulation.xpTotal)} XP`,
        category: "rules",
      });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Simulation failed.");
    } finally {
      setPending(false);
    }
  };

  const saveDraft = () => {
    setAttempted(true);
    setError(null);
    if (Object.keys(errors).length > 0) {
      setError("Fix the invalid fields before saving the draft.");
      return;
    }
    actions.saveRuleDraft(ruleKey, form);
    setInitial(form);
    setNotice("Draft saved. Nothing is live until it is published.");
  };

  const publish = async () => {
    setAttempted(true);
    setError(null);
    if (!gate.allowed) {
      setError(gate.reasons[0] ?? "The publish gate is not satisfied.");
      return;
    }
    setPending(true);
    try {
      await actions.publishRule(ruleKey, form);
      setInitial(form);
      setNotice(
        `Published ${gate.label.toLowerCase()}. The previous version is retired and keeps its awards.`,
      );
      setTouched({});
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Publishing failed.");
    } finally {
      setPending(false);
    }
  };

  const restoreVersion = (rule: Rule) => {
    const next = ruleDraftFromRule(rule);
    setForm(next);
    setTouched({});
    setNotice(
      `Loaded the values from v${rule.version} into the staged draft. Nothing is live until published.`,
    );
  };

  return (
    <AdminPage
      kicker="Recognition · Rules"
      title={form.name || ruleKey}
      back={{ to: "/recognition/rules", label: "All rules" }}
      sub={
        <span className="font-mono text-xs">
          {ruleKey} · {STATUS_LABEL[status]} {versionLabel}
          {dirty ? " · unsaved changes" : ""}
        </span>
      }
      actions={
        <>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setDiscardOpen(true)}
            disabled={readOnly || (!dirty && !draft)}
          >
            <Trash className="h-4 w-4" weight="duotone" /> Discard draft
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={saveDraft}
            disabled={readOnly || !dirty}
          >
            <FloppyDisk className="h-4 w-4" weight="duotone" /> Save staged
            draft
          </Button>
        </>
      }
    >
      <DirtyGuard dirty={dirty && !pending} />
      <ScopeNote>
        Edits are staged against live {live ? `v${live.version}` : "—"}. Nothing
        is live until published. A new policy never applies retroactively.
      </ScopeNote>

      {readOnly ? (
        <Notice tone="gold" title="Read-only">
          {scenario === "readonly" || scenario === "stale"
            ? "This preview disables writes. Switch the data state back to Default to edit."
            : "Your role can read this rule but not author a version. Ask a content editor or administrator."}
        </Notice>
      ) : null}
      {!engineOn ? (
        <Notice tone="red" title="The recognition engine is off.">
          Simulation and publishing are blocked until the global switch is
          turned back on. The live definition and version history stay readable.
        </Notice>
      ) : null}
      {notice ? (
        <Notice tone="green" title="Passed">
          {notice}
        </Notice>
      ) : null}
      {error ? (
        <Notice tone="red" title="Not saved">
          {error}
        </Notice>
      ) : null}

      <div className="grid gap-4 xl:grid-cols-[1.6fr_1fr]">
        <div className="space-y-4">
          <section className="rounded-lg border border-border bg-card">
            <div className="border-b border-border px-4 py-3">
              <h2 className="font-sans text-base font-bold text-foreground">
                Definition
              </h2>
              <p className="text-xs text-muted-foreground">
                Verified event contracts only. RSVP alone never awards.
              </p>
            </div>
            <div className="grid gap-4 p-4 sm:grid-cols-2">
              <label className="block space-y-1.5">
                <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Rule name
                </span>
                <Input
                  value={form.name}
                  onChange={(event) => setField("name", event.target.value)}
                  onBlur={() => setTouched((prev) => ({ ...prev, name: true }))}
                  aria-invalid={showError("name")}
                  aria-label="Rule name"
                  disabled={readOnly}
                />
                {showError("name") ? (
                  <span role="alert" className="text-xs text-destructive">
                    {errors.name}
                  </span>
                ) : null}
              </label>

              <label className="block space-y-1.5">
                <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Verified event
                </span>
                <select
                  value={form.sourceType}
                  onChange={(event) =>
                    onSource(event.target.value as RuleDraft["sourceType"])
                  }
                  aria-label="Verified event"
                  disabled={readOnly}
                  className={fieldClass("sourceType")}
                >
                  {SOURCE_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.event} · {option.label}
                    </option>
                  ))}
                </select>
                <span className="text-xs text-muted-foreground">
                  Event contract, not a free-text label. {form.event}
                </span>
              </label>

              <label className="block space-y-1.5">
                <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Verification
                </span>
                <select
                  value={form.verify}
                  onChange={(event) => setField("verify", event.target.value)}
                  aria-label="Verification"
                  disabled={readOnly}
                  className={fieldClass("verify")}
                >
                  {VERIFY_OPTIONS.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
                <span className="text-xs text-muted-foreground">
                  A switch cannot override verification.
                </span>
                {showError("verify") ? (
                  <span role="alert" className="text-xs text-destructive">
                    {errors.verify}
                  </span>
                ) : null}
              </label>

              <label className="block space-y-1.5">
                <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  XP
                </span>
                <Input
                  type="number"
                  min={1}
                  max={500}
                  value={form.xpAmount}
                  onChange={(event) =>
                    setField("xpAmount", Number(event.target.value))
                  }
                  onBlur={() =>
                    setTouched((prev) => ({ ...prev, xpAmount: true }))
                  }
                  aria-invalid={showError("xpAmount")}
                  aria-label="XP amount"
                  disabled={readOnly}
                />
                <span className="text-xs text-muted-foreground">
                  Once per verified event. No repeatable or daily award.
                </span>
                {showError("xpAmount") ? (
                  <span role="alert" className="text-xs text-destructive">
                    {errors.xpAmount}
                  </span>
                ) : null}
              </label>

              <label className="block space-y-1.5">
                <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Badge
                </span>
                <select
                  value={form.badgeKey}
                  onChange={(event) => setField("badgeKey", event.target.value)}
                  aria-label="Badge"
                  disabled={readOnly}
                  className={fieldClass("badgeKey")}
                >
                  <option value="none">None</option>
                  {state.badges
                    .filter(
                      (badge) =>
                        badge.status === "published" ||
                        badge.badgeKey === form.badgeKey,
                    )
                    .sort((a, b) => a.nameEn.localeCompare(b.nameEn))
                    .map((badge) => (
                      <option key={badge.badgeKey} value={badge.badgeKey}>
                        {badge.nameEn} · {badge.family}
                        {badge.status !== "published" ? " (not published)" : ""}
                      </option>
                    ))}
                </select>
                {showError("badgeKey") ? (
                  <span role="alert" className="text-xs text-destructive">
                    {errors.badgeKey}
                  </span>
                ) : null}
              </label>

              <label className="block space-y-1.5">
                <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Effective date
                </span>
                <Input
                  type="date"
                  value={form.effectiveFrom}
                  onChange={(event) =>
                    setField("effectiveFrom", event.target.value)
                  }
                  onBlur={() =>
                    setTouched((prev) => ({ ...prev, effectiveFrom: true }))
                  }
                  aria-invalid={showError("effectiveFrom")}
                  aria-label="Effective date"
                  disabled={readOnly}
                />
                <span className="text-xs text-muted-foreground">
                  {formatDate(form.effectiveFrom)} · a new policy never applies
                  retroactively.
                </span>
                {showError("effectiveFrom") ? (
                  <span role="alert" className="text-xs text-destructive">
                    {errors.effectiveFrom}
                  </span>
                ) : null}
              </label>

              <label className="block space-y-1.5 sm:col-span-2">
                <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Cap
                </span>
                <Input
                  value={cap ? `${cap} per reader per week` : "No cap"}
                  readOnly
                  aria-label="Weekly cap"
                />
                <span className="text-xs text-muted-foreground">
                  Caps come from the event contract, not from this form.
                </span>
              </label>
            </div>
          </section>

          <section className="rounded-lg border border-border bg-card">
            <div className="border-b border-border px-4 py-3">
              <h2 className="font-sans text-base font-bold text-foreground">
                Changes against live {live ? `v${live.version}` : "—"}
              </h2>
              <p className="text-xs text-muted-foreground">
                Only changed fields are listed. The live version is untouched.
              </p>
            </div>
            <div className="p-4">
              <RuleDiff rows={changes} />
            </div>
          </section>

          <section className="rounded-lg border border-border bg-card">
            <div className="border-b border-border px-4 py-3">
              <h2 className="font-sans text-base font-bold text-foreground">
                Version history
              </h2>
              <p className="text-xs text-muted-foreground">
                Immutable versions. Restoring values stages a new version; it
                never rewrites history.
              </p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] text-sm">
                <caption className="sr-only">Rule versions</caption>
                <thead>
                  <tr className="border-b bg-[var(--surface-2)] text-left text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
                    <th scope="col" className="px-4 py-2">
                      Version
                    </th>
                    <th scope="col" className="px-4 py-2">
                      Status
                    </th>
                    <th scope="col" className="px-4 py-2 text-right">
                      XP
                    </th>
                    <th scope="col" className="px-4 py-2">
                      Effective
                    </th>
                    <th scope="col" className="px-4 py-2">
                      Author / publisher
                    </th>
                    <th scope="col" className="px-4 py-2 text-right">
                      Action
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {versions.map((rule) => (
                    <tr key={rule.id} className="border-b last:border-0">
                      <td className="px-4 py-2 font-mono text-xs">
                        v{rule.version}
                      </td>
                      <td className="px-4 py-2">
                        <StatusPill
                          status={rule.status}
                          label={STATUS_LABEL[rule.status]}
                        />
                      </td>
                      <td className="px-4 py-2 text-right font-mono text-xs">
                        {rule.xpAmount}
                      </td>
                      <td className="px-4 py-2 text-xs text-muted-foreground">
                        {formatDate(rule.effectiveFrom)}
                      </td>
                      <td className="px-4 py-2 text-xs text-muted-foreground">
                        {rule.createdBy}
                        {rule.publishedBy ? ` → ${rule.publishedBy}` : ""}
                      </td>
                      <td className="px-4 py-2 text-right">
                        <Button
                          variant="ghost"
                          size="xs"
                          onClick={() => restoreVersion(rule)}
                          disabled={readOnly}
                        >
                          Use values
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </div>

        <div className="space-y-4">
          <section className="rounded-lg border border-border bg-card">
            <div className="flex items-center justify-between border-b border-border px-4 py-3">
              <h2 className="font-sans text-base font-bold text-foreground">
                Test
              </h2>
              <span className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
                Required before publish
              </span>
            </div>
            <div className="p-4">
              <p className="text-sm text-muted-foreground">
                Runs the staged definition over 30 days of events without
                writing an award. Eligibility comes from the event contract; XP
                and badge come from the staged values.
              </p>
              <Button
                variant="secondary"
                className="mt-3 w-full"
                onClick={runSimulation}
                disabled={
                  pending ||
                  readOnly ||
                  !engineOn ||
                  !can("recognition.simulate_rule")
                }
              >
                <Play className="h-4 w-4" weight="fill" /> Run simulation
              </Button>
              {!dirty && !draft ? (
                <p className="mt-2 text-xs text-muted-foreground">
                  Change at least one field to simulate a new version.
                </p>
              ) : null}
              {simEntry ? (
                <div className="mt-3 space-y-2">
                  <div
                    className={
                      simMatches
                        ? "rounded-md border border-[var(--success-leaf)]/40 bg-[var(--leaf-bg)] px-3 py-2 text-xs text-[var(--success-leaf)]"
                        : "rounded-md border border-[var(--amber)] bg-[var(--amber-bg)] px-3 py-2 text-xs text-[var(--amber-deep)]"
                    }
                  >
                    <p className="font-semibold">
                      {simMatches
                        ? "Simulation matches these staged values."
                        : "Staged values changed since this simulation."}
                    </p>
                    <p className="mt-1">
                      {formatNumber(simEntry.simulation.evaluated)} evaluated ·{" "}
                      {formatNumber(simEntry.simulation.wouldAward)} would award
                      · {formatXp(simEntry.simulation.xpTotal)} ·{" "}
                      {formatNumber(simEntry.simulation.badgeAwards)} badge
                      awards
                    </p>
                    <p className="mt-1">
                      {formatNumber(simEntry.simulation.duplicates)} duplicates
                      · {formatNumber(simEntry.simulation.cappedAwards)} capped
                      · 0 deductions
                    </p>
                    <p className="mt-1 opacity-80">
                      {simEntry.simulation.windowLabel} ·{" "}
                      {relativeAge(simEntry.simulation.at)}
                    </p>
                    {simEntry.simulation.serverEvaluated !== undefined ? (
                      <p className="mt-1 opacity-80">
                        Server dry-run:{" "}
                        {formatNumber(simEntry.simulation.serverEvaluated)}{" "}
                        evaluated ·{" "}
                        {formatNumber(
                          simEntry.simulation.serverWouldAward ?? 0,
                        )}{" "}
                        would award
                      </p>
                    ) : null}
                  </div>
                  {simEntry.simulation.notes ? (
                    <p className="text-xs text-muted-foreground">
                      {simEntry.simulation.notes}
                    </p>
                  ) : null}
                </div>
              ) : (
                <p className="mt-2 text-xs text-muted-foreground">
                  No simulation for these staged values yet.
                </p>
              )}
            </div>
          </section>

          <section className="rounded-lg border border-border bg-card">
            <div className="border-b border-border px-4 py-3">
              <h2 className="font-sans text-base font-bold text-foreground">
                Publish
              </h2>
            </div>
            <div className="p-4">
              <p className="text-sm text-muted-foreground">
                Publishing creates a new version and writes an audit entry with
                your name. The award key stays stable, so no reader is
                re-awarded.
              </p>
              <ul className="mt-3 space-y-1.5 text-xs">
                {gate.reasons.length === 0 ? (
                  <li className="flex items-center gap-1.5 font-semibold text-[var(--success-leaf)]">
                    <CheckCircle className="h-3.5 w-3.5" weight="fill" /> Every
                    publish check passes.
                  </li>
                ) : (
                  gate.reasons.map((reason) => (
                    <li
                      key={reason}
                      className="flex items-start gap-1.5 text-muted-foreground"
                    >
                      <Warning
                        className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[var(--amber-deep)]"
                        weight="fill"
                      />
                      <span>{reason}</span>
                    </li>
                  ))
                )}
              </ul>
              <Can permission="recognition.publish_rule">
                <Button
                  className="mt-3 w-full"
                  onClick={publish}
                  disabled={pending || !gate.allowed}
                >
                  {gate.label}
                </Button>
              </Can>
              {!can("recognition.publish_rule") ? (
                <p className="mt-2 text-xs text-muted-foreground">
                  Your role can stage drafts but not publish them.
                </p>
              ) : null}
            </div>
          </section>

          <section className="rounded-lg border border-border bg-card p-4">
            <h2 className="font-sans text-base font-bold text-foreground">
              Audience
            </h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Verified profiles only · under-18 identified analytics off ·
              sensitive sites excluded before evaluation.
            </p>
          </section>
        </div>
      </div>

      <ActionDialog
        open={discardOpen}
        onOpenChange={setDiscardOpen}
        title="Discard the staged draft?"
        description="The draft is removed from this browser. The published version and its award history are untouched."
        confirmLabel="Discard draft"
        variant="destructive"
        onConfirm={() => {
          actions.discardRuleDraft(ruleKey);
          const next = live ? ruleDraftFromRule(live) : blankDraft();
          setForm(next);
          setInitial(next);
          setDiscardOpen(false);
          setNotice(
            live
              ? `Draft discarded. Live v${live.version} is unchanged.`
              : "Draft discarded.",
          );
        }}
      />
    </AdminPage>
  );
}
