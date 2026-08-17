import { describe, expect, it } from "vitest";
import { cardMatchesTags, rowReasonTags } from "@/routes/_authenticated/safety";
import type { PairEvaluation } from "@/lib/interactions";

function ruleRow(
  mechanism: string,
  recommendation = "",
): { kind: "rule"; evaluation: PairEvaluation } {
  return {
    kind: "rule",
    evaluation: {
      a: { id: "a", name: "A" },
      b: { id: "b", name: "B" },
      severity: "caution",
      mechanism,
      recommendation,
      source_refs: [],
      same_axis: false,
      matchedBy: "compound",
    } as unknown as PairEvaluation,
  };
}

describe("reason tag filtering", () => {
  it("derives the same tags the card renders", () => {
    expect(rowReasonTags(ruleRow("Competes for absorption"))).toEqual(["Absorption"]);
  });

  it("passes everything when nothing is selected", () => {
    expect(cardMatchesTags(ruleRow("Competes for absorption"), [])).toBe(true);
  });

  it("matches a single selected tag", () => {
    expect(cardMatchesTags(ruleRow("Competes for absorption"), ["Absorption"])).toBe(true);
    expect(cardMatchesTags(ruleRow("Competes for absorption"), ["Sedation"])).toBe(false);
  });

  it("widens results across multiple selected tags", () => {
    const absorption = ruleRow("Competes for absorption");
    const sedation = ruleRow("Additive sedation");
    const selected = ["Absorption", "Sedation"] as const;
    expect(cardMatchesTags(absorption, [...selected])).toBe(true);
    expect(cardMatchesTags(sedation, [...selected])).toBe(true);
    expect(cardMatchesTags(ruleRow("Raises blood pressure"), [...selected])).toBe(false);
  });

  it("narrows results in all mode", () => {
    const both = ruleRow("Competes for absorption", "Watch for sedation");
    const single = ruleRow("Competes for absorption");
    const selected: ["Absorption", "Sedation"] = ["Absorption", "Sedation"];
    expect(cardMatchesTags(both, selected, "all")).toBe(true);
    expect(cardMatchesTags(single, selected, "all")).toBe(false);
    expect(cardMatchesTags(single, selected, "any")).toBe(true);
  });

  it("ignores mode when nothing is selected", () => {
    expect(cardMatchesTags(ruleRow("Competes for absorption"), [], "all")).toBe(true);
  });

  it("filters user notes by their derived tags", () => {
    const noteRow = {
      kind: "note" as const,
      a: { id: "a", name: "A" } as never,
      b: { id: "b", name: "B" } as never,
      note: { note: "Splitting these avoids an absorption clash" } as never,
    };
    expect(cardMatchesTags(noteRow, ["Absorption"])).toBe(true);
    expect(cardMatchesTags(noteRow, ["Hormonal"])).toBe(false);
  });
});
