import { useMemo, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Plus, ShieldCheck } from "@phosphor-icons/react";
import { Button } from "#/components/ui/button";
import { Input } from "#/components/ui/input";
import { Can } from "#/components/shell/Gates";
import { useRecognition } from "#/lib/recognition/store";
import { relativeAge } from "#/lib/recognition/format";
import {
  SOURCE_OPTIONS,
  sourceOption,
  STATUS_LABEL,
} from "#/lib/recognition/logic";
import {
  AdminPage,
  DataState,
  Notice,
  ScopeNote,
  StatusPill,
} from "#/components/recognition/shared";
import { ActionDialog, ReasonDialog } from "#/components/recognition/dialogs";
import type { Rule, RuleDraft } from "#/lib/recognition/types";

export const Route = createFileRoute("/_authenticated/recognition/rules/")({
  component: RulesPage,
});

type RuleFilter = "all" | "published" | "draft" | "retired";

function RulesPage() {
  const { state, loads, actions, publishedRule, draftRule } = useRecognition();
  const navigate = useNavigate();
  const [filter, setFilter] = useState<RuleFilter>("all");
  const [search, setSearch] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [retireTarget, setRetireTarget] = useState<Rule | null>(null);
  const [retireError, setRetireError] = useState<string | null>(null);
  const [newRule, setNewRule] = useState({
    ruleKey: "",
    name: "",
    sourceType: SOURCE_OPTIONS[0].value,
    xpAmount: 50,
    effectiveFrom: new Date().toISOString().slice(0, 10),
    error: "",
  });

  const latestRules = useMemo(() => {
    // One row per rule key: latest published version, plus its draft if one exists.
    const keys = [...new Set(state.rules.map((rule) => rule.ruleKey))].sort();
    return keys
      .map((key) => {
        const published = publishedRule(key);
        const draft = draftRule(key);
        return (
          draft ?? published ?? state.rules.find((rule) => rule.ruleKey === key)
        );
      })
      .filter((rule): rule is Rule => Boolean(rule));
  }, [state.rules, publishedRule, draftRule]);

  const query = search.trim().toLowerCase();
  const visible = latestRules.filter((rule) => {
    const status = rule.status === "draft" ? "draft" : rule.status;
    if (filter !== "all" && status !== filter) return false;
    if (!query) return true;
    return `${rule.name} ${rule.ruleKey}`.toLowerCase().includes(query);
  });

  if (loads.rules === "loading" && state.rules.length === 0) {
    return (
      <AdminPage kicker="Recognition · Rules" title="Rules">
        <DataState state="loading">{null}</DataState>
      </AdminPage>
    );
  }
  if (loads.rules === "error" && state.rules.length === 0) {
    return (
      <AdminPage kicker="Recognition · Rules" title="Rules">
        <DataState state="error" onRetry={() => actions.refresh()}>
          {null}
        </DataState>
      </AdminPage>
    );
  }

  const createRule = () => {
    const ruleKey = newRule.ruleKey.trim();
    if (!/^[a-z][a-z0-9]*(\.[a-z0-9]+)+$/.test(ruleKey)) {
      setNewRule((prev) => ({
        ...prev,
        error: "Use a dotted contract key, e.g. heritage.visit.verified.",
      }));
      return;
    }
    if (!newRule.name.trim()) {
      setNewRule((prev) => ({ ...prev, error: "Give the rule a name." }));
      return;
    }
    if (
      !Number.isInteger(newRule.xpAmount) ||
      newRule.xpAmount < 1 ||
      newRule.xpAmount > 500
    ) {
      setNewRule((prev) => ({
        ...prev,
        error: "XP must be a whole number between 1 and 500.",
      }));
      return;
    }
    const option = sourceOption(newRule.sourceType);
    const draft: RuleDraft = {
      name: newRule.name.trim(),
      sourceType: newRule.sourceType,
      event: option.event,
      verify: option.verify,
      xpAmount: newRule.xpAmount,
      badgeKey: "none",
      effectiveFrom: newRule.effectiveFrom,
    };
    actions.saveRuleDraft(ruleKey, draft);
    setCreateOpen(false);
    setNewRule({
      ruleKey: "",
      name: "",
      sourceType: SOURCE_OPTIONS[0].value,
      xpAmount: 50,
      effectiveFrom: new Date().toISOString().slice(0, 10),
      error: "",
    });
    void navigate({
      to: "/recognition/rules/$ruleId",
      params: { ruleId: ruleKey },
    });
  };

  return (
    <AdminPage
      kicker="Recognition · Rules"
      title="Rules"
      sub="Versioned award rules. Publish creates a new version; the award key stays stable, so a rule change never re-awards a reader."
      actions={
        <Can permission="recognition.author_rule">
          <Button size="sm" onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4" weight="bold" /> Create rule
          </Button>
        </Can>
      }
    >
      <ScopeNote>
        No daily or random fields · rule version is not part of the award key ·
        retired rules keep their awards
      </ScopeNote>

      <div className="mb-3 flex flex-wrap items-center gap-2">
        <div
          className="flex flex-wrap gap-1"
          role="group"
          aria-label="Rule status"
        >
          {(
            [
              ["all", "All rules"],
              ["published", "Published"],
              ["draft", "Draft"],
              ["retired", "Retired"],
            ] as [RuleFilter, string][]
          ).map(([value, label]) => (
            <button
              key={value}
              type="button"
              aria-pressed={filter === value}
              onClick={() => setFilter(value)}
              className={`rounded-full px-3 py-1 text-xs font-semibold ${
                filter === value
                  ? "bg-primary text-primary-foreground"
                  : "border border-border bg-card text-muted-foreground hover:text-foreground"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        <Input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search name or rule key"
          aria-label="Search rules"
          className="h-9 w-full sm:w-64"
        />
        <span className="ml-auto text-xs font-semibold text-muted-foreground">
          {visible.length} shown
        </span>
      </div>

      <div className="overflow-hidden rounded-lg border border-border bg-card">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[860px] text-sm">
            <caption className="sr-only">
              Recognition rules with status, version and award
            </caption>
            <thead>
              <tr className="border-b bg-[var(--surface-2)] text-left text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
                <th scope="col" className="px-4 py-3">
                  Rule
                </th>
                <th scope="col" className="px-4 py-3">
                  Status
                </th>
                <th scope="col" className="px-4 py-3">
                  Version
                </th>
                <th scope="col" className="px-4 py-3 text-right">
                  Award
                </th>
                <th scope="col" className="px-4 py-3">
                  Badge
                </th>
                <th scope="col" className="px-4 py-3">
                  Updated
                </th>
                <th scope="col" className="px-4 py-3 text-right">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {visible.map((rule) => {
                const draft = draftRule(rule.ruleKey);
                const published = publishedRule(rule.ruleKey);
                const version =
                  draft?.version ?? published?.version ?? rule.version;
                const status = draft
                  ? "draft"
                  : (published?.status ?? rule.status);
                const badge = state.badges.find(
                  (entry) => entry.badgeKey === rule.badgeKey,
                );
                return (
                  <tr
                    key={rule.ruleKey}
                    className="border-b last:border-0 hover:bg-[var(--surface-2)]"
                  >
                    <td className="px-4 py-3">
                      <Link
                        to="/recognition/rules/$ruleId"
                        params={{ ruleId: rule.ruleKey }}
                        className="block"
                      >
                        <span className="font-semibold text-foreground hover:text-primary">
                          {rule.name}
                        </span>
                        <span className="block font-mono text-[11px] text-muted-foreground">
                          {rule.ruleKey}
                        </span>
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      <StatusPill
                        status={status}
                        label={STATUS_LABEL[status]}
                      />
                    </td>
                    <td className="px-4 py-3 font-mono text-xs">
                      v{version}
                      {draft && published ? (
                        <span className="ml-1 text-[10px] text-[var(--amber-deep)]">
                          staged
                        </span>
                      ) : null}
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-xs">
                      {rule.xpAmount} XP
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">
                      {badge ? badge.nameEn : (rule.badgeKey ?? "None")}
                      {badge && badge.status !== "published" ? (
                        <span
                          className="ml-1 text-destructive"
                          title="Badge is not published"
                        >
                          · unpublished
                        </span>
                      ) : null}
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">
                      {relativeAge(rule.updatedAt)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="inline-flex gap-1">
                        <Button variant="outline" size="sm" asChild>
                          <Link
                            to="/recognition/rules/$ruleId"
                            params={{ ruleId: rule.ruleKey }}
                          >
                            Open
                          </Link>
                        </Button>
                        <Can permission="recognition.publish_rule">
                          {published && !draft ? (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setRetireError(null);
                                setRetireTarget(published);
                              }}
                            >
                              Retire
                            </Button>
                          ) : null}
                        </Can>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {visible.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    className="px-4 py-8 text-center text-sm text-muted-foreground"
                  >
                    No rules in this view. Choose All rules or create one.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>

      <Notice tone="green" title="Publishing is a version, not an edit.">
        A simulation of the staged values is required, and a second
        administrator must publish when XP or the audience changes. The live
        version stays intact until then.
      </Notice>

      <ActionDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        title="Create a rule draft"
        description="The draft is staged. Nothing is live until it is simulated and published."
        confirmLabel="Create draft"
        onConfirm={createRule}
        error={newRule.error || null}
        size="lg"
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block space-y-1.5">
            <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Rule key
            </span>
            <Input
              value={newRule.ruleKey}
              onChange={(event) =>
                setNewRule((prev) => ({
                  ...prev,
                  ruleKey: event.target.value,
                  error: "",
                }))
              }
              placeholder="heritage.visit.verified"
              aria-label="Rule key"
            />
          </label>
          <label className="block space-y-1.5">
            <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Name
            </span>
            <Input
              value={newRule.name}
              onChange={(event) =>
                setNewRule((prev) => ({
                  ...prev,
                  name: event.target.value,
                  error: "",
                }))
              }
              placeholder="Verified heritage visit"
              aria-label="Rule name"
            />
          </label>
          <label className="block space-y-1.5">
            <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Verified event
            </span>
            <select
              value={newRule.sourceType}
              onChange={(event) =>
                setNewRule((prev) => ({
                  ...prev,
                  sourceType: event.target.value as typeof prev.sourceType,
                }))
              }
              aria-label="Verified event"
              className="h-9 w-full rounded-md border border-border bg-card px-2 text-sm"
            >
              {SOURCE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label} · {option.event}
                </option>
              ))}
            </select>
          </label>
          <label className="block space-y-1.5">
            <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              XP
            </span>
            <Input
              type="number"
              min={1}
              max={500}
              value={newRule.xpAmount}
              onChange={(event) =>
                setNewRule((prev) => ({
                  ...prev,
                  xpAmount: Number(event.target.value),
                  error: "",
                }))
              }
              aria-label="XP amount"
            />
          </label>
          <label className="block space-y-1.5 sm:col-span-2">
            <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Effective date
            </span>
            <Input
              type="date"
              value={newRule.effectiveFrom}
              onChange={(event) =>
                setNewRule((prev) => ({
                  ...prev,
                  effectiveFrom: event.target.value,
                }))
              }
              aria-label="Effective date"
            />
            <span className="text-xs text-muted-foreground">
              A new policy never applies retroactively.
            </span>
          </label>
        </div>
        <div className="flex items-start gap-2 rounded-md border border-border bg-muted/50 px-3 py-2 text-xs text-muted-foreground">
          <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" weight="duotone" />
          <span>
            Badge selection and verification are completed in the editor before
            simulation.
          </span>
        </div>
      </ActionDialog>

      <ReasonDialog
        open={Boolean(retireTarget)}
        onOpenChange={(open) => {
          if (!open) setRetireTarget(null);
        }}
        title={retireTarget ? `Retire ${retireTarget.name}?` : "Retire rule"}
        description="Retiring stops new awards. Awards already written and readers’ XP are kept. The rule stays in version history."
        confirmLabel="Retire rule"
        danger
        error={retireError}
        onConfirm={(reason) => {
          if (!retireTarget) return;
          try {
            actions.retireRule(retireTarget.ruleKey, reason);
            setRetireTarget(null);
          } catch (error) {
            setRetireError(
              error instanceof Error
                ? error.message
                : "Could not retire the rule.",
            );
          }
        }}
      />
    </AdminPage>
  );
}
