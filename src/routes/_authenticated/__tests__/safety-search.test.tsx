import { describe, it, expect, afterEach } from "vitest";
import { cleanup } from "@testing-library/react";
import { cardMatchesQuery } from "@/routes/_authenticated/safety";
import type { Compound, PairEvaluation, Severity } from "@/lib/interactions";
import type { PairNote } from "@/components/pair-note-dialog";

afterEach(cleanup);

const compoundA = {
  id: "c1",
  name: "Omega-3 Fish Oil",
  category: "supplement",
  goal_tags: [],
  slug: "omega-3",
} as unknown as Compound;

const compoundB = {
  id: "c2",
  name: "Vitamin D3",
  category: "supplement",
  goal_tags: [],
  slug: "vitamin-d3",
} as unknown as Compound;

const compoundC = {
  id: "c3",
  name: "Caffeine",
  category: "supplement",
  goal_tags: [],
  slug: "caffeine",
} as unknown as Compound;

function makeEvaluation(
  severity: Severity,
  overrides: Partial<PairEvaluation> = {},
): PairEvaluation {
  return {
    a: compoundA,
    b: compoundB,
    severity,
    mechanism: "Competes for absorption pathways",
    recommendation: "Take with food to reduce GI upset",
    same_axis: false,
    matchedBy: "pair",
    source_refs: [],
    confidence: "theoretical",
    mechanism_shared_with: null,
    no_known_interaction: false,
    ...overrides,
  };
}

function makePairNote(severity: string): PairNote {
  return {
    id: "n1",
    compound_a_id: "c1",
    compound_b_id: "c2",
    note: "I take these together in the morning.",
    severity,
    source: null,
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
    user_id: "u1",
  };
}

describe("cardMatchesQuery", () => {
  it("matches rule cards by compound name", () => {
    const row = { kind: "rule" as const, evaluation: makeEvaluation("note") };
    expect(cardMatchesQuery(row, "omega")).toBe(true);
    expect(cardMatchesQuery(row, "vitamin")).toBe(true);
    expect(cardMatchesQuery(row, "caffeine")).toBe(false);
  });

  it("matches rule cards by recommendation or mechanism", () => {
    const row = { kind: "rule" as const, evaluation: makeEvaluation("note") };
    expect(cardMatchesQuery(row, "food")).toBe(true);
    expect(cardMatchesQuery(row, "absorption")).toBe(true);
    expect(cardMatchesQuery(row, "sleep")).toBe(false);
  });

  it("matches user note cards by compound name or note text", () => {
    const row = {
      kind: "note" as const,
      a: compoundA,
      b: compoundB,
      note: makePairNote("note"),
    };
    expect(cardMatchesQuery(row, "morning")).toBe(true);
    expect(cardMatchesQuery(row, "omega-3")).toBe(true);
    expect(cardMatchesQuery(row, "evening")).toBe(false);
  });

  it("is case-insensitive and ignores leading/trailing whitespace", () => {
    const row = { kind: "rule" as const, evaluation: makeEvaluation("note") };
    expect(cardMatchesQuery(row, "  OMEGA  ")).toBe(true);
  });

  it("returns true for empty or whitespace-only queries", () => {
    const row = { kind: "rule" as const, evaluation: makeEvaluation("note") };
    expect(cardMatchesQuery(row, "")).toBe(true);
    expect(cardMatchesQuery(row, "   ")).toBe(true);
  });
});

describe("cardMatchesQuery regression coverage", () => {
  it("does not mutate query strings or card content", () => {
    const row = { kind: "rule" as const, evaluation: makeEvaluation("note") };
    const q = "  OMEGA  ";
    cardMatchesQuery(row, q);
    expect(q).toBe("  OMEGA  ");
    expect(row.evaluation.a.name).toBe("Omega-3 Fish Oil");
  });

  it("matches severity-agnostic text in avoid/caution cards", () => {
    const avoid = {
      kind: "rule" as const,
      evaluation: makeEvaluation("avoid", { recommendation: "Do not combine" }),
    };
    const caution = {
      kind: "rule" as const,
      evaluation: makeEvaluation("caution", { recommendation: "Monitor blood pressure" }),
    };
    expect(cardMatchesQuery(avoid, "combine")).toBe(true);
    expect(cardMatchesQuery(caution, "blood pressure")).toBe(true);
  });
});
