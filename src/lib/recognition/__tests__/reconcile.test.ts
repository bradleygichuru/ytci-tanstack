import { describe, expect, it } from "vitest";
import type { ContractsSchemas } from "#/lib/contracts/client";
import {
  mapApiAudit,
  mapApiBadge,
  mapApiRule,
  mergeBoardRows,
  mergeKillSwitches,
  mergeRules,
} from "#/lib/recognition/reconcile";
import type { BoardRow, KillSwitch, Rule } from "#/lib/recognition/types";

const apiRule: ContractsSchemas["RecognitionRule"] = {
  id: "ffffffff-ffff-4fff-8fff-ffffffffffff",
  ruleKey: "event.attendance",
  version: 3,
  sourceType: "event",
  status: "published",
  effectiveFrom: "2026-11-01T00:00:00+03:00",
  criteria: { name: "Event attendance", verify: "QR or staff check-in" },
  xpAmount: 60,
  badgeKey: "event_attended",
  createdBy: "content-editor-1",
  publishedBy: "administrator-1",
};

const sampleRule: Rule = {
  id: "local-2",
  ruleKey: "event.attendance",
  version: 2,
  name: "Event attendance",
  status: "retired",
  sourceType: "event",
  event: "ke.event.attended.v1",
  verify: "QR or staff check-in",
  xpAmount: 50,
  badgeKey: "event_attended",
  effectiveFrom: "2026-10-01",
  effectiveTo: null,
  createdBy: "content-editor-1",
  publishedBy: "administrator-1",
  updatedAt: "2026-11-17T16:40:00+03:00",
  weeklyCap: null,
};

describe("contract reconciliation", () => {
  it("maps contract rule criteria into operator fields", () => {
    const mapped = mapApiRule(apiRule, sampleRule);
    expect(mapped.name).toBe("Event attendance");
    expect(mapped.verify).toBe("QR or staff check-in");
    expect(mapped.event).toBe("ke.event.attended.v1");
    expect(mapped.xpAmount).toBe(60);
    expect(mapped.effectiveFrom).toBe("2026-11-01");
    expect(mapped.weeklyCap).toBeNull();
  });

  it("keeps sample version history while overlaying the contract version", () => {
    const merged = mergeRules([sampleRule], [mapApiRule(apiRule, sampleRule)]);
    expect(merged.map((rule) => rule.version)).toEqual([3, 2]);
    expect(merged[0].xpAmount).toBe(60);
  });

  it("derives badge name fields from the contract", () => {
    const badge = mapApiBadge({
      badgeKey: "event_attended",
      nameEn: "Event attendee",
      nameSw: "Mhudhuriaji wa tukio",
      family: "events",
      criteria: { label: "First verified check-in" },
      privacyClass: "public",
      hidden: false,
      publicEligible: true,
      status: "published",
      version: 2,
    });
    expect(badge.criteria).toBe("First verified check-in");
    expect(badge.nameSw).toBe("Mhudhuriaji wa tukio");
  });

  it("merges contract board entries and recomputes ranks", () => {
    const sample: BoardRow[] = [
      {
        rank: 1,
        displayName: "SavannaFox",
        county: "Nairobi",
        level: "3",
        xp: 2500,
        verifiedSites: 22,
        trailCompletions: 4,
        status: "active",
      },
      {
        rank: 2,
        displayName: "RiftReader",
        county: "Nakuru",
        level: "2",
        xp: 1800,
        verifiedSites: 17,
        trailCompletions: 3,
        status: "active",
      },
    ];
    const rows = mergeBoardRows(sample, {
      seasonKey: "2026-q4",
      suppressed: false,
      entries: [
        {
          rank: 2,
          displayName: "SavannaFox",
          county: "Nairobi",
          level: 3,
          publicBadgeCount: 9,
          verifiedSites: 20,
          trailCompletions: 5,
          isSelf: false,
        },
        {
          rank: 1,
          displayName: "RiftReader",
          county: "Nakuru",
          level: 2,
          publicBadgeCount: 6,
          verifiedSites: 17,
          trailCompletions: 6,
          isSelf: true,
        },
      ],
    });
    expect(rows[0].displayName).toBe("RiftReader");
    expect(rows[0].rank).toBe(1);
    expect(rows[0].isSelf).toBe(true);
    expect(rows[1].trailCompletions).toBe(5);
    expect(rows[1].xp).toBe(2500);
  });

  it("keeps the canonical switch order and labels", () => {
    const sample: KillSwitch[] = [
      {
        key: "global",
        label: "Recognition engine",
        description: "d",
        blocks: "b",
        enabled: true,
        reason: null,
        updatedBy: null,
        updatedAt: "2026-11-01T00:00:00Z",
      },
      {
        key: "public_leaderboard",
        label: "Public leaderboard",
        description: "d",
        blocks: "b",
        enabled: true,
        reason: null,
        updatedBy: null,
        updatedAt: "2026-11-01T00:00:00Z",
      },
      {
        key: "source:audio",
        label: "Audio reward source",
        description: "d",
        blocks: "b",
        enabled: true,
        reason: null,
        updatedBy: null,
        updatedAt: "2026-11-01T00:00:00Z",
      },
      {
        key: "source:event",
        label: "Event attendance source",
        description: "d",
        blocks: "b",
        enabled: true,
        reason: null,
        updatedBy: null,
        updatedAt: "2026-11-01T00:00:00Z",
      },
    ];
    const merged = mergeKillSwitches(sample, [
      {
        key: "public_leaderboard",
        label: "Public leaderboard",
        description: "d",
        blocks: "b",
        enabled: false,
        reason: "board review",
        updatedBy: "admin-2",
        updatedAt: "2026-11-18T06:00:00Z",
      },
    ]);
    expect(merged.map((entry) => entry.key)).toEqual([
      "global",
      "public_leaderboard",
      "source:audio",
      "source:event",
    ]);
    expect(merged[1].enabled).toBe(false);
    expect(merged[1].label).toBe("Public leaderboard");
  });

  it("categorises contract audit rows for the one log", () => {
    const award = mapApiAudit({
      id: "1",
      actorRef: "administrator-1",
      action: "rule.publish",
      entityType: "recognition_rule",
      entityId: "r1",
      reason: "simulated",
      createdAt: "2026-11-18T06:00:00Z",
    });
    expect(award.category).toBe("rules");
    expect(award.actor).toBe("administrator-1");
    expect(award.action).toContain("Rule");
  });
});
