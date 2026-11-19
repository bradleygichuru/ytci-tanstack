import { describe, expect, it } from "vitest";
import {
  awardInTab,
  diffRule,
  draftSignature,
  groupAwardFailures,
  publicBoardSuppressed,
  publishGate,
  recomputeRanks,
  requiresSecondApprover,
  simulateDraft,
  validateRuleDraft,
} from "#/lib/recognition/logic";
import type {
  Award,
  Badge,
  BoardRow,
  Rule,
  RuleDraft,
} from "#/lib/recognition/types";

const live: Rule = {
  id: "rule-1",
  ruleKey: "event.attendance",
  version: 2,
  name: "Event attendance",
  status: "published",
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

const badge: Badge = {
  badgeKey: "event_attended",
  nameEn: "First Event",
  nameSw: "Hafla ya Kwanza",
  family: "Events",
  criteria: "First verified check-in",
  privacyClass: "public",
  hidden: false,
  publicEligible: true,
  status: "published",
  version: 2,
  updatedAt: "2026-09-18T09:10:00+03:00",
  usedBy: 1,
};

const draft: RuleDraft = {
  name: "Event attendance",
  sourceType: "event",
  event: "ke.event.attended.v1",
  verify: "QR or staff check-in",
  xpAmount: 75,
  badgeKey: "event_attended",
  effectiveFrom: "2026-12-01",
};

const now = new Date("2026-11-19T09:00:00+03:00");

describe("rule editor", () => {
  it("lists only fields that differ from live and resolves badge names", () => {
    expect(diffRule(live, draft, [badge])).toEqual([
      { field: "XP", live: "50", staged: "75" },
      { field: "Effective date", live: "2026-10-01", staged: "2026-12-01" },
    ]);
    expect(
      diffRule(live, { ...draft, xpAmount: 50, effectiveFrom: "2026-10-01" }, [
        badge,
      ]),
    ).toEqual([]);
  });

  it("returns per-field errors without a throw", () => {
    const errors = validateRuleDraft(
      { ...draft, name: " ", xpAmount: 900, effectiveFrom: "2020-01-01" },
      { now, badges: [badge], requireFutureDate: true },
    );
    expect(errors.name).toMatch(/name/i);
    expect(errors.xpAmount).toMatch(/between 1 and 500/i);
    expect(errors.effectiveFrom).toMatch(/retroactively/i);
  });

  it("blocks a rule from using an unpublished badge", () => {
    const errors = validateRuleDraft(draft, {
      now,
      badges: [{ ...badge, status: "draft" }],
      requireFutureDate: true,
    });
    expect(errors.badgeKey).toMatch(/published/i);
  });

  it("simulates from the staged XP and cap, with zero duplicates", () => {
    const sim = simulateDraft(draft, live, { now });
    expect(sim.evaluated).toBeGreaterThan(0);
    expect(sim.xpTotal).toBe(sim.wouldAward * 75);
    expect(sim.duplicates).toBe(0);

    const capped = simulateDraft(
      { ...draft, sourceType: "audio_story" },
      live,
      { now },
    );
    expect(capped.cappedAwards).toBeGreaterThan(0);
    expect(capped.wouldAward).toBeLessThan(capped.evaluated);
  });

  it("requires a second approver only for XP and audience changes", () => {
    expect(requiresSecondApprover(live, draft)).toBe(true);
    expect(requiresSecondApprover(live, { ...draft, xpAmount: 50 })).toBe(
      false,
    );
  });

  it("explains every publish blocker", () => {
    const gate = publishGate({
      live,
      draft,
      simulation: null,
      simulationSignature: null,
      errors: {},
      engineOn: false,
      canPublish: false,
      canSimulate: false,
      actorId: "sample-admin",
      draftAuthorId: "sample-admin",
    });
    expect(gate.allowed).toBe(false);
    expect(gate.reasons.length).toBeGreaterThanOrEqual(5);
    expect(gate.label).toBe("Publish v3");
  });

  it("allows publish when the simulation matches and the author is a second admin", () => {
    const sim = simulateDraft(draft, live, { now });
    const gate = publishGate({
      live,
      draft,
      simulation: sim,
      simulationSignature: draftSignature(draft),
      errors: {},
      engineOn: true,
      canPublish: true,
      canSimulate: true,
      actorId: "administrator-2",
      draftAuthorId: "content-editor-1",
    });
    expect(gate.allowed).toBe(true);
    expect(gate.reasons).toEqual([]);
  });

  it("blocks the author when XP changes", () => {
    const sim = simulateDraft(draft, live, { now });
    const gate = publishGate({
      live,
      draft,
      simulation: sim,
      simulationSignature: draftSignature(draft),
      errors: {},
      engineOn: true,
      canPublish: true,
      canSimulate: true,
      actorId: "content-editor-1",
      draftAuthorId: "content-editor-1",
    });
    expect(gate.allowed).toBe(false);
    expect(gate.reasons.join(" ")).toMatch(/second administrator/i);
  });
});

describe("leaderboard ranks", () => {
  const rows: BoardRow[] = [
    {
      rank: 9,
      displayName: "A",
      county: null,
      level: "Scout",
      xp: 10,
      verifiedSites: 2,
      trailCompletions: 2,
      status: "active",
    },
    {
      rank: 1,
      displayName: "B",
      county: null,
      level: "Scout",
      xp: 30,
      verifiedSites: 4,
      trailCompletions: 4,
      status: "active",
    },
    {
      rank: 4,
      displayName: "C",
      county: null,
      level: "Scout",
      xp: 20,
      verifiedSites: 3,
      trailCompletions: 3,
      status: "retracted",
    },
    {
      rank: 2,
      displayName: "D",
      county: null,
      level: "Scout",
      xp: 20,
      verifiedSites: 3,
      trailCompletions: 3,
      status: "active",
    },
  ];

  it("recomputes contiguous ranks and keeps retracted rows for restore", () => {
    const ranked = recomputeRanks(rows);
    expect(
      ranked
        .filter((row) => row.status === "active")
        .map((row) => row.displayName),
    ).toEqual(["B", "D", "A"]);
    expect(
      ranked.filter((row) => row.status === "active").map((row) => row.rank),
    ).toEqual([1, 2, 3]);
    expect(ranked.find((row) => row.displayName === "C")?.rank).toBe(0);
  });

  it("suppresses boards below ten active adults", () => {
    expect(publicBoardSuppressed(rows)).toBe(true);
    const big = Array.from({ length: 10 }, (_, index) => ({
      ...rows[0],
      displayName: `R${index}`,
      rank: index + 1,
    }));
    expect(publicBoardSuppressed(big)).toBe(false);
  });
});

describe("award failure grouping", () => {
  const awards: Award[] = [
    {
      id: "1",
      reader: "R1",
      ruleKey: "event.attendance",
      ruleVersion: 2,
      xp: 50,
      event: "E1",
      status: "failed",
      attempts: 5,
      at: "2026-11-18T09:00:00+03:00",
      cause: "outbox_retry_exhausted",
    },
    {
      id: "2",
      reader: "R2",
      ruleKey: "event.attendance",
      ruleVersion: 2,
      xp: 50,
      event: "E2",
      status: "failed",
      attempts: 5,
      at: "2026-11-18T08:00:00+03:00",
      cause: "outbox_retry_exhausted",
    },
    {
      id: "3",
      reader: "R3",
      ruleKey: "audio.story",
      ruleVersion: 2,
      xp: 25,
      event: "E3",
      status: "failed",
      attempts: 3,
      at: "2026-11-18T07:00:00+03:00",
      cause: "profile_locked",
    },
    {
      id: "4",
      reader: "R4",
      ruleKey: "audio.story",
      ruleVersion: 2,
      xp: 25,
      event: "E4",
      status: "queued",
      attempts: 1,
      at: "2026-11-18T06:00:00+03:00",
      cause: "pending_outbox",
    },
  ];

  it("groups by cause and explains each cause once", () => {
    const groups = groupAwardFailures(awards);
    expect(groups).toHaveLength(2);
    expect(groups[0].cause).toBe("outbox_retry_exhausted");
    expect(groups[0].count).toBe(2);
    expect(groups[0].xp).toBe(100);
    expect(groups[0].ruleVersions).toEqual(["event.attendance · v2"]);
    expect(groups[0].explanation).toMatch(/five attempts/i);
  });

  it("uses one state per tab", () => {
    expect(
      awards
        .filter((award) => awardInTab(award, "open"))
        .map((award) => award.id),
    ).toEqual(["1", "2", "3", "4"]);
    expect(
      awards
        .filter((award) => awardInTab(award, "failed"))
        .map((award) => award.id),
    ).toEqual(["1", "2", "3"]);
    expect(
      awards
        .filter((award) => awardInTab(award, "queued"))
        .map((award) => award.id),
    ).toEqual(["4"]);
    expect(awards.filter((award) => awardInTab(award, "delivered"))).toEqual(
      [],
    );
  });
});
