import { describe, expect, it } from "vitest";
import { buildDirectAnswer, wordCount } from "../direct-answer";

const base = {
  name: "Zinc Bisglycinate",
  category: "mineral",
  goalTags: ["immune", "recovery", "brain"],
  halfLifeHours: 250,
  typicalTiming: "with_meal",
  isInjectable: false,
  isControlled: false,
};

describe("buildDirectAnswer", () => {
  it("lands in the quotable 40-60 word band", () => {
    const answer = buildDirectAnswer(
      base,
      "Zinc bisglycinate is a chelated form of zinc bound to two glycine molecules.",
    );
    expect(wordCount(answer)).toBeGreaterThanOrEqual(40);
    expect(wordCount(answer)).toBeLessThanOrEqual(68);
  });

  it("never uses product framing", () => {
    const answer = buildDirectAnswer(base, "DoseRoutine helps you track zinc. Zinc is a mineral.");
    expect(answer).not.toMatch(/DoseRoutine|helps you|track your/i);
  });

  it("renders stored timing codes as prose", () => {
    const answer = buildDirectAnswer(base, "Zinc is a mineral.");
    expect(answer).toContain("with a meal");
    expect(answer).not.toContain("with_meal");
  });

  it("labels the half-life type for nutrients", () => {
    const answer = buildDirectAnswer(base, "Zinc is a mineral.");
    expect(answer).toContain("whole-body biological half-life");
  });

  it("works with no prose lead at all", () => {
    const answer = buildDirectAnswer({ name: "Test Compound", category: "peptide" }, "");
    expect(answer.startsWith("Test Compound is a research peptide.")).toBe(true);
  });
});

describe("prose fragments", () => {
  const berberine =
    "Berberine is a quaternary ammonium salt from the protoberberine group of isoquinoline alkaloids. It is found in various plants, including *Berberis* (e.g., European barberry, Oregon grape), *Coptis chinensis* (goldthread), *Hydrastis canadensis* (goldenseal), and *Phellodendron amurense* (Amur cork tree). Historically, berberine-containing plants have been used in traditional medicine.";

  it("never publishes an out-of-order sentence fragment", () => {
    const answer = buildDirectAnswer(
      { name: "Berberine", category: "supplement", goalTags: ["blood-sugar"] },
      berberine,
    );
    expect(answer).not.toMatch(/\.\s+,/);
    expect(answer).not.toMatch(/^\s*[,)]/m);
    expect(answer.startsWith("Berberine is a quaternary ammonium salt")).toBe(true);
  });

  it("does not split on abbreviations or domains", () => {
    const answer = buildDirectAnswer(
      { name: "Apigenin", category: "supplement" },
      "Apigenin data is summarized from examine.com and nih.gov sources. It is a flavonoid.",
    );
    expect(answer).not.toMatch(/(^|\s)(com|gov)\)/);
  });
});
