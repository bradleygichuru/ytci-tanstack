/**
 * Pure recognition-admin rules.
 *
 * Everything a screen needs to explain itself — the staged/live diff, per-field
 * validation, simulation from staged inputs, rank recomputation, failure
 * grouping and publish gates — lives here so it can be tested without a router,
 * a browser or the Go API.
 */
import type {
  Award,
  AwardCause,
  AwardStatus,
  Badge,
  BoardRow,
  LeaderboardSnapshot,
  RecognitionSource,
  Rule,
  RuleDraft,
  RuleSimulation,
  RuleStatus,
} from "./types";

export const SOURCE_OPTIONS: {
  value: RecognitionSource;
  event: string;
  label: string;
  verify: string;
  weeklyCap: number | null;
}[] = [
  {
    value: "event",
    event: "ke.event.attended.v1",
    label: "Event attendance",
    verify: "QR or staff check-in",
    weeklyCap: null,
  },
  {
    value: "heritage_visit",
    event: "ke.heritage.visit.verified.v1",
    label: "Verified heritage visit",
    verify: "Verified site visit",
    weeklyCap: null,
  },
  {
    value: "audio_story",
    event: "ke.audio.story.completed.v1",
    label: "Audio Story completion",
    verify: "Server-recorded completion",
    weeklyCap: 5,
  },
  {
    value: "trail",
    event: "ke.trail.completed.v1",
    label: "Trail completed",
    verify: "Trail checkpoints verified",
    weeklyCap: null,
  },
  {
    value: "community_story",
    event: "ke.community.story.approved.v1",
    label: "Community story approved",
    verify: "Moderator approval",
    weeklyCap: null,
  },
];

export const VERIFY_OPTIONS = [
  "QR or staff check-in",
  "Verified site visit",
  "Server-recorded completion",
  "Trail checkpoints verified",
  "Moderator approval",
];

export const STATUS_LABEL: Record<RuleStatus, string> = {
  draft: "Draft",
  published: "Published",
  retired: "Retired",
};

export function sourceOption(sourceType: RecognitionSource) {
  return (
    SOURCE_OPTIONS.find((option) => option.value === sourceType) ??
    SOURCE_OPTIONS[0]
  );
}

export function ruleDraftFromRule(rule: Rule): RuleDraft {
  return {
    name: rule.name,
    sourceType: rule.sourceType,
    event: rule.event,
    verify: rule.verify,
    xpAmount: rule.xpAmount,
    badgeKey: rule.badgeKey ?? "none",
    effectiveFrom: rule.effectiveFrom.slice(0, 10),
  };
}

export function draftSignature(draft: RuleDraft): string {
  return JSON.stringify([
    draft.name.trim(),
    draft.sourceType,
    draft.event,
    draft.verify,
    draft.xpAmount,
    draft.badgeKey,
    draft.effectiveFrom,
  ]);
}

export interface RuleDiffRow {
  field: string;
  live: string;
  staged: string;
}

/** Human diff against the live version. Empty array means "no staged changes". */
export function diffRule(
  live: Rule,
  draft: RuleDraft,
  badges: Badge[],
): RuleDiffRow[] {
  const badgeName = (key: string | null) => {
    if (!key || key === "none") return "None";
    return badges.find((badge) => badge.badgeKey === key)?.nameEn ?? key;
  };
  const rows: [string, string, string][] = [
    ["Name", live.name, draft.name],
    ["Verified event", live.event, draft.event],
    ["Verification", live.verify, draft.verify],
    ["XP", String(live.xpAmount), String(draft.xpAmount)],
    ["Badge", badgeName(live.badgeKey), badgeName(draft.badgeKey)],
    ["Effective date", live.effectiveFrom.slice(0, 10), draft.effectiveFrom],
  ];
  return rows
    .filter(([, before, after]) => before !== after)
    .map(([field, before, after]) => ({ field, live: before, staged: after }));
}

export interface RuleValidationOptions {
  now?: Date;
  /** Published rule versions may never apply to past behaviour. */
  requireFutureDate?: boolean;
  badges?: Badge[];
}

export type RuleFieldErrors = Partial<Record<keyof RuleDraft, string>>;

export function validateRuleDraft(
  draft: RuleDraft,
  {
    now = new Date(),
    requireFutureDate = true,
    badges = [],
  }: RuleValidationOptions = {},
): RuleFieldErrors {
  const errors: RuleFieldErrors = {};
  if (!draft.name.trim())
    errors.name = "Give the rule a name operators will recognise.";
  else if (draft.name.trim().length > 80)
    errors.name = "Keep the name under 80 characters.";

  if (!SOURCE_OPTIONS.some((option) => option.value === draft.sourceType)) {
    errors.sourceType = "Choose a verified event contract.";
  }
  if (!VERIFY_OPTIONS.includes(draft.verify)) {
    errors.verify = "Choose the verification the event contract provides.";
  }
  if (
    !Number.isInteger(draft.xpAmount) ||
    draft.xpAmount < 1 ||
    draft.xpAmount > 500
  ) {
    errors.xpAmount = "XP must be a whole number between 1 and 500.";
  }
  if (draft.badgeKey !== "none") {
    const badge = badges.find((entry) => entry.badgeKey === draft.badgeKey);
    if (!badge) errors.badgeKey = "Choose a badge from the catalogue.";
    else if (badge.status !== "published") {
      errors.badgeKey = "The badge must be published before a rule can use it.";
    }
  }
  if (!draft.effectiveFrom) {
    errors.effectiveFrom = "Choose the date the new version starts.";
  } else {
    const effective = new Date(`${draft.effectiveFrom}T00:00:00+03:00`);
    if (Number.isNaN(effective.getTime())) {
      errors.effectiveFrom = "Use a real date.";
    } else if (requireFutureDate) {
      const today = new Date(
        now.toLocaleDateString("en-CA", { timeZone: "Africa/Nairobi" }),
      );
      if (effective.getTime() < today.getTime()) {
        errors.effectiveFrom =
          "A new policy never applies retroactively. Choose today or later.";
      }
    }
  }
  return errors;
}

const BASE_ELIGIBLE: Record<RecognitionSource, number> = {
  event: 412,
  heritage_visit: 1204,
  audio_story: 2980,
  trail: 386,
  community_story: 86,
};

/** Share of eligible readers who do not already hold the badge. */
const BADGE_NEW_SHARE = 0.22;

/**
 * Simulation from the staged definition.
 *
 * Eligibility comes from the event contract; XP, badge and cap come from the
 * staged values. The estimate is deterministic so two operators get the same
 * numbers for the same draft, and duplicates stay at zero because award keys
 * are rule + reader + event.
 */
export function simulateDraft(
  draft: RuleDraft,
  live: Rule,
  {
    now = new Date(),
    windowLabel = "Last 30 days · 19 Oct – 18 Nov 2026",
  }: { now?: Date; windowLabel?: string } = {},
): RuleSimulation {
  const eligible = BASE_ELIGIBLE[draft.sourceType] ?? 300;
  const cap = sourceOption(draft.sourceType).weeklyCap;
  const cappedAwards = cap ? Math.min(eligible, cap * 4) : eligible;
  const wouldAward = cappedAwards;
  const xpTotal = wouldAward * draft.xpAmount;
  const badgeAwards =
    draft.badgeKey === "none" ? 0 : Math.round(wouldAward * BADGE_NEW_SHARE);
  return {
    ruleKey: live.ruleKey,
    draftVersion: live.version + 1,
    evaluated: eligible,
    wouldAward,
    wouldDeduct: 0,
    xpTotal,
    badgeAwards,
    duplicates: 0,
    cappedAwards: cap ? eligible - cappedAwards : 0,
    windowLabel,
    at: now.toISOString(),
    source: "staged-estimate",
    notes: cap
      ? `Capped at ${cap} awards per reader per week; readers above the cap are suppressed, not failed.`
      : "Once per verified event. No repeatable or daily award.",
  };
}

export interface PublishGateInput {
  live: Rule;
  draft: RuleDraft;
  simulation: RuleSimulation | null;
  simulationSignature: string | null;
  errors: RuleFieldErrors;
  engineOn: boolean;
  canPublish: boolean;
  actorId: string;
  draftAuthorId?: string;
  canSimulate: boolean;
}

/**
 * XP and audience changes are the blast-radius fields, so they need a second
 * administrator. Name and copy edits do not.
 */
export function requiresSecondApprover(live: Rule, draft: RuleDraft): boolean {
  return (
    live.status === "draft" ||
    live.xpAmount !== draft.xpAmount ||
    live.sourceType !== draft.sourceType ||
    (live.badgeKey ?? "none") !== draft.badgeKey
  );
}

export interface PublishGate {
  allowed: boolean;
  reasons: string[];
  label: string;
}

/** Every reason publish is blocked, in the order the operator should fix them. */
export function publishGate({
  live,
  draft,
  simulation,
  simulationSignature,
  errors,
  engineOn,
  canPublish,
  actorId,
  draftAuthorId,
  canSimulate,
}: PublishGateInput): PublishGate {
  const reasons: string[] = [];
  if (!engineOn)
    reasons.push(
      "The recognition engine is off. Publishing is disabled until it is turned back on.",
    );
  if (!canPublish) reasons.push("Your role cannot publish recognition rules.");
  if (Object.keys(errors).length > 0)
    reasons.push("Fix the invalid fields before publishing.");
  if (!canSimulate)
    reasons.push(
      "Your role cannot simulate rules, so the publish gate cannot be satisfied.",
    );
  if (!simulation)
    reasons.push("Run a simulation of these staged values first.");
  else if (simulationSignature !== draftSignature(draft)) {
    reasons.push(
      "The staged values changed since the last simulation. Run it again.",
    );
  }
  if (
    requiresSecondApprover(live, draft) &&
    draftAuthorId &&
    draftAuthorId === actorId
  ) {
    reasons.push(
      "XP or audience changes need a second administrator. You authored this draft.",
    );
  }
  const label =
    live.status === "draft" ? "Publish v1" : `Publish v${live.version + 1}`;
  return { allowed: reasons.length === 0, reasons, label };
}

/**
 * Recompute contiguous ranks from verified activity.
 *
 * Retractions leave the board; every remaining row moves up. The result is a new
 * array and ranks are never patched in place, so a row can never keep a stale
 * rank after a mutation.
 */
export function recomputeRanks(rows: BoardRow[]): BoardRow[] {
  const active = rows
    .filter((row) => row.status !== "retracted")
    .slice()
    .sort((a, b) => {
      if (b.trailCompletions !== a.trailCompletions) {
        return b.trailCompletions - a.trailCompletions;
      }
      if (b.verifiedSites !== a.verifiedSites)
        return b.verifiedSites - a.verifiedSites;
      if (b.xp !== a.xp) return b.xp - a.xp;
      return a.displayName.localeCompare(b.displayName);
    })
    .map((row, index) => ({ ...row, rank: index + 1 }));
  // Retracted rows stay on the record so they can be restored, but they carry no
  // rank and never leave a gap in the active board.
  const retracted = rows
    .filter((row) => row.status === "retracted")
    .map((row) => ({ ...row, rank: 0 }));
  return [...active, ...retracted];
}

export const SUPPRESSION_THRESHOLD = 10;

export function publicBoardSuppressed(rows: BoardRow[]): boolean {
  return (
    rows.filter((row) => row.status === "active").length < SUPPRESSION_THRESHOLD
  );
}

export function boardStateLabel(
  board: LeaderboardSnapshot,
  engineOn: boolean,
): string {
  if (board.suppressed) return "Suppressed";
  if (board.frozen) return "Frozen";
  if (board.publicHidden) return "Hidden";
  return engineOn ? "Public" : "Engine off";
}

// ---------------------------------------------------------------------------
// Awards ledger
// ---------------------------------------------------------------------------

export type AwardTab =
  "open" | "failed" | "queued" | "delivered" | "suppressed";

export function awardInTab(award: Award, tab: AwardTab): boolean {
  if (tab === "open")
    return award.status === "failed" || award.status === "queued";
  return award.status === tab;
}

const CAUSE_COPY: Record<
  AwardCause,
  { label: string; explanation: string; action: string }
> = {
  outbox_retry_exhausted: {
    label: "Outbox retry exhausted",
    explanation:
      "The delivery worker made five attempts and stopped. The award is still queued, so XP is not lost.",
    action:
      "Retry after checking the outbox, or credit manually with a support reference.",
  },
  profile_locked: {
    label: "Profile locked during write",
    explanation:
      "The reader’s profile was being written when the award arrived. The lock clears on its own.",
    action: "Retry once the lock clears; no correction is needed.",
  },
  duplicate_suppressed: {
    label: "Duplicate suppressed then released",
    explanation:
      "A second scan was suppressed, then the first award failed. Only the original award key may be retried.",
    action: "Retry the original award. Do not create a second credit.",
  },
  weekly_cap: {
    label: "Weekly cap reached",
    explanation:
      "The event contract caps Audio Story awards at five per reader per week. The sixth completion is suppressed by design.",
    action: "No action. Suppression is the correct outcome.",
  },
  pending_outbox: {
    label: "Awaiting outbox",
    explanation:
      "The award is committed and waiting for the next delivery pass.",
    action: "Wait for the outbox; retry only if the window has passed.",
  },
  none: {
    label: "Delivered",
    explanation: "The outbox confirmed the write.",
    action: "No action.",
  },
};

export function failureCopy(cause: AwardCause) {
  return CAUSE_COPY[cause];
}

export interface FailureGroup {
  cause: AwardCause;
  label: string;
  explanation: string;
  action: string;
  count: number;
  xp: number;
  ruleVersions: string[];
  awards: Award[];
}

/** Failures grouped by cause; cause explained once, not per row. */
export function groupAwardFailures(awards: Award[]): FailureGroup[] {
  const groups = new Map<AwardCause, FailureGroup>();
  for (const award of awards) {
    if (award.status !== "failed") continue;
    const copy = CAUSE_COPY[award.cause];
    const group = groups.get(award.cause) ?? {
      cause: award.cause,
      label: copy.label,
      explanation: copy.explanation,
      action: copy.action,
      count: 0,
      xp: 0,
      ruleVersions: [],
      awards: [],
    };
    group.count += 1;
    group.xp += award.xp;
    const version = `${award.ruleKey} · v${award.ruleVersion}`;
    if (!group.ruleVersions.includes(version)) group.ruleVersions.push(version);
    group.awards.push(award);
    groups.set(award.cause, group);
  }
  return [...groups.values()].sort((a, b) => b.count - a.count);
}

export function awardStatusLabel(status: AwardStatus): string {
  return status.charAt(0).toUpperCase() + status.slice(1);
}

// ---------------------------------------------------------------------------
// Moderation
// ---------------------------------------------------------------------------

export const MODERATION_KIND_LABEL: Record<string, string> = {
  display_name: "Display name",
  leaderboard_cheat: "Cheating",
  leaderboard_report: "Leaderboard report",
  event_report: "Event report",
};

export const MODERATION_DECISIONS: Record<
  string,
  { value: string; label: string }[]
> = {
  display_name: [
    { value: "rename", label: "Require a rename" },
    { value: "warn", label: "Warn the reader" },
    { value: "dismiss", label: "Dismiss the report" },
  ],
  leaderboard_cheat: [
    { value: "disqualify", label: "Disqualify from the season" },
    { value: "revoke", label: "Revoke affected awards" },
    { value: "warn", label: "Warn the reader" },
    { value: "dismiss", label: "Dismiss the report" },
  ],
  leaderboard_report: [
    { value: "warn", label: "Warn the reported reader" },
    { value: "dismiss", label: "Dismiss the report" },
  ],
  event_report: [
    { value: "warn", label: "Warn the organiser" },
    { value: "dismiss", label: "Dismiss the report" },
  ],
};

/** 48-hour triage target used by the names & reports queue. */
export const TRIAGE_HOURS = 48;

// ---------------------------------------------------------------------------
// CSV
// ---------------------------------------------------------------------------

function csvCell(value: unknown): string {
  const text = String(value ?? "");
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export function toCsv(headers: string[], rows: (string | number)[][]): string {
  return [headers, ...rows].map((row) => row.map(csvCell).join(",")).join("\n");
}

export function downloadCsv(filename: string, csv: string): void {
  if (typeof document === "undefined") return;
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
