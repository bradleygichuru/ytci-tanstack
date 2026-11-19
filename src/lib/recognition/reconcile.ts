/**
 * Contract → operator read-model reconciliation.
 *
 * The mock and the live API return the frozen contract objects. The operator
 * screens need names, verification copy, board XP and delivery causes, so sample
 * rows and contract rows are merged by stable keys. Contract values always win
 * for the fields the contract owns; sample values fill the operator-only fields.
 */
import type { ContractsSchemas } from "#/lib/contracts/client";
import type {
  AuditCategory,
  AuditEntry,
  Award,
  BackfillBatch,
  Badge,
  BoardRow,
  KillSwitch,
  Mission,
  ModerationCase,
  RecognitionSource,
  Rule,
  Season,
} from "./types";
import { recomputeRanks } from "./logic";

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object"
    ? (value as Record<string, unknown>)
    : {};
}

function str(value: unknown, fallback = ""): string {
  return typeof value === "string" && value.length > 0 ? value : fallback;
}

function nowIso(): string {
  return new Date().toISOString();
}

function humanise(value: string): string {
  return value
    .replace(/[._-]+/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

export function sourceFromApi(value: string): RecognitionSource {
  if (value === "event") return "event";
  if (value === "heritage_visit" || value === "heritage")
    return "heritage_visit";
  if (value === "audio_story" || value === "audio") return "audio_story";
  if (value === "trail") return "trail";
  if (value === "community_story" || value === "community")
    return "community_story";
  return "event";
}

export function mapApiRule(
  row: ContractsSchemas["RecognitionRule"],
  existing?: Rule,
): Rule {
  const criteria = asRecord(row.criteria);
  const sourceType = sourceFromApi(row.sourceType);
  return {
    id: row.id,
    ruleKey: row.ruleKey,
    version: row.version,
    name: str(criteria.name, existing?.name ?? humanise(row.ruleKey)),
    status: row.status,
    sourceType,
    event: str(criteria.event, existing?.event ?? `ke.${row.ruleKey}.v1`),
    verify: str(criteria.verify, existing?.verify ?? "Verified event"),
    xpAmount: row.xpAmount ?? existing?.xpAmount ?? 0,
    badgeKey: row.badgeKey ?? null,
    effectiveFrom: row.effectiveFrom.slice(0, 10),
    effectiveTo: row.effectiveTo ? row.effectiveTo.slice(0, 10) : null,
    createdBy: row.createdBy ?? existing?.createdBy ?? "contract",
    publishedBy: row.publishedBy ?? existing?.publishedBy ?? null,
    updatedAt: row.effectiveFrom,
    weeklyCap: existing?.weeklyCap ?? null,
  };
}

export function mergeRules(sample: Rule[], api: Rule[]): Rule[] {
  const merged = new Map<string, Rule>();
  for (const rule of sample)
    merged.set(`${rule.ruleKey}@${rule.version}`, rule);
  for (const rule of api) {
    const key = `${rule.ruleKey}@${rule.version}`;
    const existing = merged.get(key);
    merged.set(key, {
      ...existing,
      ...rule,
      name: rule.name || existing?.name || humanise(rule.ruleKey),
      weeklyCap: existing?.weeklyCap ?? rule.weeklyCap,
    });
  }
  return [...merged.values()].sort((a, b) => {
    if (a.ruleKey !== b.ruleKey) return a.ruleKey.localeCompare(b.ruleKey);
    return b.version - a.version;
  });
}

export function mapApiBadge(
  row: ContractsSchemas["BadgeDefinition"],
  existing?: Badge,
): Badge {
  const criteria = asRecord(row.criteria);
  return {
    badgeKey: row.badgeKey,
    nameEn: row.nameEn,
    nameSw: row.nameSw ?? existing?.nameSw ?? null,
    family: row.family,
    criteria: str(criteria.label, existing?.criteria ?? humanise(row.badgeKey)),
    privacyClass: row.privacyClass,
    hidden: row.hidden ?? existing?.hidden ?? false,
    publicEligible:
      row.publicEligible ??
      existing?.publicEligible ??
      row.privacyClass === "public",
    status: row.status,
    version: row.version ?? existing?.version ?? 1,
    updatedAt: existing?.updatedAt ?? new Date().toISOString(),
    usedBy: existing?.usedBy ?? 0,
  };
}

export function mergeBadges(sample: Badge[], api: Badge[]): Badge[] {
  const merged = new Map(sample.map((badge) => [badge.badgeKey, badge]));
  for (const badge of api)
    merged.set(badge.badgeKey, { ...merged.get(badge.badgeKey), ...badge });
  return [...merged.values()];
}

export function mergeBadgeUsage(
  badges: Badge[],
  rules: Rule[],
  missions: Mission[],
): Badge[] {
  return badges.map((badge) => ({
    ...badge,
    usedBy:
      rules.filter(
        (rule) => rule.badgeKey === badge.badgeKey && rule.status !== "retired",
      ).length +
      missions.filter((mission) => mission.badgeKey === badge.badgeKey).length,
  }));
}

export function mapApiSeason(
  row: ContractsSchemas["Season"],
  existing?: Season,
): Season {
  return {
    key: row.key,
    nameEn: row.nameEn,
    nameSw: row.nameSw ?? existing?.nameSw ?? row.nameEn,
    startsAt: row.startsAt,
    endsAt: row.endsAt,
    status: row.status,
    badgeKey: row.badgeKey ?? existing?.badgeKey ?? null,
    xpAward: row.xpAward ?? existing?.xpAward ?? 500,
    missionFamilies: row.missionFamilies ?? existing?.missionFamilies ?? [],
    boardSize: existing?.boardSize ?? 0,
    preparedBy: existing?.preparedBy ?? "contract",
    closedAt: existing?.closedAt ?? null,
    closedBy: existing?.closedBy ?? null,
  };
}

export function mergeSeasons(sample: Season[], api: Season[]): Season[] {
  const merged = new Map(sample.map((season) => [season.key, season]));
  for (const season of api)
    merged.set(season.key, { ...merged.get(season.key), ...season });
  return [...merged.values()];
}

export function mapApiModeration(
  row: ContractsSchemas["ModerationCase"],
  existing?: ModerationCase,
): ModerationCase {
  const kindLabel =
    row.kind === "display_name"
      ? "Display name"
      : row.kind === "leaderboard_cheat"
        ? "Cheating"
        : row.kind === "leaderboard_report"
          ? "Leaderboard report"
          : "Event report";
  return {
    id: row.id,
    kind: row.kind,
    subject: existing?.subject ?? row.subjectRef ?? kindLabel,
    subjectRef: row.subjectRef ?? null,
    reason: row.reason,
    reporter: existing?.reporter ?? "Private",
    evidence: existing?.evidence ?? "No evidence attached.",
    status: row.status,
    decision: row.decision ?? "none",
    decidedAt: row.decidedAt ?? existing?.decidedAt ?? null,
    resolution: existing?.resolution ?? null,
    createdAt: row.createdAt,
  };
}

export function mergeModeration(
  sample: ModerationCase[],
  api: ModerationCase[],
): ModerationCase[] {
  const merged = new Map(sample.map((entry) => [entry.id, entry]));
  for (const entry of api)
    merged.set(entry.id, { ...merged.get(entry.id), ...entry });
  return [...merged.values()].sort((a, b) =>
    b.createdAt.localeCompare(a.createdAt),
  );
}

export function mapApiBackfill(
  row: ContractsSchemas["BackfillBatch"],
  existing?: BackfillBatch,
): BackfillBatch {
  const status: BackfillBatch["status"] =
    row.status === "dry_run"
      ? "dry_run"
      : row.status === "paused"
        ? "running"
        : row.status;
  return {
    id: row.id,
    ruleKey: row.ruleKey,
    ruleVersion: row.ruleVersion,
    windowLabel: existing?.windowLabel ?? "Contract window",
    from: existing?.from ?? row.createdAt ?? nowIso(),
    to: existing?.to ?? row.createdAt ?? nowIso(),
    status,
    scanned: row.processed || existing?.scanned || 0,
    unit: existing?.unit ?? "events",
    rows: existing?.rows ?? [],
    requestedBy: row.createdBy || existing?.requestedBy || "contract",
    approvedBy: row.approvedBy ?? null,
    createdAt: row.createdAt ?? nowIso(),
    approvedAt: existing?.approvedAt ?? null,
    note: existing?.note,
  };
}

export function mergeBackfill(
  sample: BackfillBatch[],
  api: BackfillBatch[],
): BackfillBatch[] {
  const merged = new Map(sample.map((batch) => [batch.id, batch]));
  for (const batch of api)
    merged.set(batch.id, { ...merged.get(batch.id), ...batch });
  return [...merged.values()].sort((a, b) =>
    b.createdAt.localeCompare(a.createdAt),
  );
}

export function mapApiKillSwitch(
  row: ContractsSchemas["KillSwitch"],
  existing?: KillSwitch,
): KillSwitch | null {
  const key = row.key as KillSwitch["key"];
  if (
    !["global", "public_leaderboard", "source:event", "source:audio"].includes(
      key,
    )
  )
    return null;
  return {
    key,
    label: existing?.label ?? humanise(key),
    description:
      existing?.description ?? "Controlled by the recognition contract.",
    blocks: existing?.blocks ?? "Server-side writes.",
    enabled: row.enabled,
    reason: row.reason ?? existing?.reason ?? null,
    updatedBy: row.updatedBy ?? existing?.updatedBy ?? null,
    updatedAt: row.updatedAt ?? existing?.updatedAt ?? nowIso(),
  };
}

export function mergeKillSwitches(
  sample: KillSwitch[],
  api: KillSwitch[],
): KillSwitch[] {
  const merged = new Map(sample.map((entry) => [entry.key, entry]));
  for (const entry of api)
    merged.set(entry.key, { ...merged.get(entry.key), ...entry });
  return ["global", "public_leaderboard", "source:audio", "source:event"]
    .map((key) => merged.get(key as KillSwitch["key"]))
    .filter((entry): entry is KillSwitch => Boolean(entry));
}

function auditCategory(entityType: string, action: string): AuditCategory {
  const haystack = `${entityType} ${action}`.toLowerCase();
  if (
    haystack.includes("award") ||
    haystack.includes("xp") ||
    haystack.includes("backfill")
  )
    return "awards";
  if (haystack.includes("kill") || haystack.includes("switch")) return "safety";
  if (
    haystack.includes("moderation") ||
    haystack.includes("display") ||
    haystack.includes("leaderboard")
  )
    return "moderation";
  if (
    haystack.includes("rule") ||
    haystack.includes("badge") ||
    haystack.includes("simulation")
  )
    return "rules";
  if (haystack.includes("season") || haystack.includes("event"))
    return "events";
  return "system";
}

export function mapApiAudit(row: ContractsSchemas["AuditEntry"]): AuditEntry {
  const entity = row.entityId
    ? `${row.entityType} · ${row.entityId}`
    : row.entityType;
  return {
    id: row.id,
    actor: row.actorRef ?? "System",
    role: "Contract actor",
    action: humanise(row.action),
    entity,
    detail: row.reason ?? "Recorded by the contracts API.",
    category: auditCategory(row.entityType, row.action),
    at: row.createdAt,
  };
}

export function mergeAudit(
  sample: AuditEntry[],
  api: AuditEntry[],
): AuditEntry[] {
  const merged = new Map(sample.map((entry) => [entry.id, entry]));
  for (const entry of api) merged.set(entry.id, entry);
  return [...merged.values()].sort((a, b) => b.at.localeCompare(a.at));
}

/** Contract leaderboard entries merged onto operator rows, then re-ranked. */
export function mergeBoardRows(
  sample: BoardRow[],
  api: ContractsSchemas["Leaderboard"] | null,
): BoardRow[] {
  if (!api) return recomputeRanks(sample);
  const merged = new Map(sample.map((row) => [row.displayName, row]));
  for (const entry of api.entries) {
    const existing = merged.get(entry.displayName);
    merged.set(entry.displayName, {
      rank: entry.rank,
      displayName: entry.displayName,
      county: entry.county ?? existing?.county ?? null,
      level: String(entry.level),
      xp: existing?.xp ?? entry.level * 750,
      verifiedSites: entry.verifiedSites,
      trailCompletions: entry.trailCompletions,
      status: existing?.status ?? "active",
      isSelf: entry.isSelf || existing?.isSelf,
      retractedReason: existing?.retractedReason,
      retractedBy: existing?.retractedBy,
      retractedAt: existing?.retractedAt,
    });
  }
  return recomputeRanks([...merged.values()]);
}

export function countsByStatus<T extends { status: string }>(
  rows: T[],
): Record<string, number> {
  return rows.reduce<Record<string, number>>((counts, row) => {
    counts[row.status] = (counts[row.status] ?? 0) + 1;
    return counts;
  }, {});
}

export function boardFromApi(
  sampleRows: BoardRow[],
  api: ContractsSchemas["Leaderboard"] | null,
): BoardRow[] {
  return mergeBoardRows(sampleRows, api);
}

export function isAwardTabEmpty(awards: Award[], tab: string): boolean {
  return awards.filter((award) => award.status === tab).length === 0;
}
