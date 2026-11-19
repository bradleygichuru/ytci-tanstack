import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { BoardRows, RuleDiff } from "#/components/recognition/shared";
import type { BoardRow } from "#/lib/recognition/types";

afterEach(cleanup);

describe("RuleDiff", () => {
  it("renders live and staged values with a field label", () => {
    render(
      <RuleDiff
        rows={[
          { field: "XP", live: "50", staged: "75" },
          { field: "Effective date", live: "2026-10-01", staged: "2026-12-01" },
        ]}
      />,
    );
    expect(screen.getByText("XP")).toBeInTheDocument();
    expect(screen.getByText("50")).toBeInTheDocument();
    expect(screen.getByText("75")).toBeInTheDocument();
    expect(screen.getByText("2026-12-01")).toBeInTheDocument();
  });

  it("explains an empty diff instead of rendering empty rows", () => {
    render(<RuleDiff rows={[]} />);
    expect(screen.getByText(/no staged changes yet/i)).toBeInTheDocument();
  });
});

describe("BoardRows", () => {
  const rows: BoardRow[] = [
    {
      rank: 1,
      displayName: "Njeri M.",
      county: "Nairobi",
      level: "Keeper",
      xp: 4820,
      verifiedSites: 18,
      trailCompletions: 6,
      status: "active",
    },
    {
      rank: 0,
      displayName: "TrailKing",
      county: null,
      level: "Scout",
      xp: 900,
      verifiedSites: 2,
      trailCompletions: 0,
      status: "retracted",
      retractedReason: "Impersonation confirmed",
    },
  ];

  it("keeps retracted rows visible with a restore action", () => {
    render(
      <BoardRows
        rows={rows}
        closed={false}
        onRetract={vi.fn()}
        onRestore={vi.fn()}
      />,
    );
    expect(screen.getByText("Njeri M.")).toBeInTheDocument();
    expect(screen.getByText("TrailKing")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /restore/i }),
    ).toBeInTheDocument();
    expect(screen.getByText(/impersonation confirmed/i)).toBeInTheDocument();
  });

  it("disables retraction on a closed season", () => {
    render(
      <BoardRows rows={rows} closed onRetract={vi.fn()} onRestore={vi.fn()} />,
    );
    expect(screen.getByRole("button", { name: /retract/i })).toBeDisabled();
    expect(screen.getByRole("button", { name: /restore/i })).toBeDisabled();
  });
});
