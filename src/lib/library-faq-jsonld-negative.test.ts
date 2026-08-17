// Negative-path regression tests for the FAQPage JSON-LD validator logic
// used by src/lib/library-faq-jsonld.test.ts. These tests craft intentionally
// malformed payloads and assert the same predicates the live suite runs
// correctly REJECT them — guaranteeing the sweep fails loudly if a library
// page ever ships broken structured data.
//
// If any assertion here starts passing on a bad payload, the live suite has
// silently regressed and would let bad data through.

import { describe, expect, it } from "vitest";
import {
  contextMatchesSchemaOrg,
  findDuplicateGroups,
  hasNormalizedContent,
  isTrimmed,
  typeMatchesNormalized,
} from "./faq-normalize";

// ---------------------------------------------------------------------------
// Validation predicates (mirror the live suite in library-faq-jsonld.test.ts)

type Faq = Record<string, any>;

interface ValidationResult {
  ok: boolean;
  errors: string[];
}

function validateFaqPage(faq: Faq | null): ValidationResult {
  const errors: string[] = [];
  if (!faq) {
    errors.push("no FAQPage JSON-LD block found");
    return { ok: false, errors };
  }
  if (!typeMatchesNormalized(faq["@type"], "FAQPage")) errors.push("@type must be FAQPage");
  if (!contextMatchesSchemaOrg(faq["@context"])) {
    errors.push("@context must reference schema.org");
  }
  const entities = faq.mainEntity;
  if (!Array.isArray(entities)) {
    errors.push("mainEntity must be an array");
    return { ok: errors.length === 0, errors };
  }
  if (entities.length < 2) errors.push("mainEntity must have >=2 entries");

  const normalizedNames: string[] = [];
  for (const [i, e] of entities.entries()) {
    const p = `mainEntity[${i}]`;
    if (!e || typeof e !== "object") {
      errors.push(`${p} is not an object`);
      continue;
    }
    if (!typeMatchesNormalized(e["@type"], "Question")) errors.push(`${p}.@type must be Question`);
    if (typeof e.name !== "string") {
      errors.push(`${p}.name must be a string`);
    } else {
      if (!isTrimmed(e.name)) errors.push(`${p}.name is not trimmed`);
      if (!hasNormalizedContent(e.name)) {
        errors.push(`${p}.name is empty or whitespace-only`);
      }
    }
    const ans = e.acceptedAnswer;
    if (!ans || typeof ans !== "object") {
      errors.push(`${p}.acceptedAnswer must be an object`);
      continue;
    }
    if (!typeMatchesNormalized(ans["@type"], "Answer"))
      errors.push(`${p}.acceptedAnswer.@type must be Answer`);
    if (typeof ans.text !== "string") {
      errors.push(`${p}.acceptedAnswer.text must be a string`);
    } else {
      if (!isTrimmed(ans.text)) errors.push(`${p}.acceptedAnswer.text is not trimmed`);
      if (!hasNormalizedContent(ans.text)) {
        errors.push(`${p}.acceptedAnswer.text is empty or whitespace-only`);
      }
    }
  }
  const nameDupes = findDuplicateGroups(
    entities.filter((e) => e && typeof e.name === "string"),
    (e: any) => e.name,
  );
  if (nameDupes.length > 0) {
    errors.push(`duplicate Question.name entries: ${nameDupes.map((g) => g.key).join(", ")}`);
  }
  return { ok: errors.length === 0, errors };
}

// ---------------------------------------------------------------------------
// Fixture builders

const validQuestion = (name: string, text: string) => ({
  "@type": "Question",
  name,
  acceptedAnswer: { "@type": "Answer", text },
});

const validFaq = (): Faq => ({
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: [
    validQuestion("What is B12?", "A water-soluble vitamin."),
    validQuestion("How is it dosed?", "1000 mcg sublingually."),
  ],
});

// ---------------------------------------------------------------------------
// Positive baseline — the good fixture MUST pass so failures below are real.

describe("validateFaqPage positive baseline", () => {
  it("accepts a well-formed FAQPage", () => {
    const result = validateFaqPage(validFaq());
    expect(result.ok, result.errors.join("; ")).toBe(true);
    expect(result.errors).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// Negative cases — every one must flag at least one error.

describe("validateFaqPage rejects malformed payloads", () => {
  it("rejects null / missing FAQPage block", () => {
    const r = validateFaqPage(null);
    expect(r.ok).toBe(false);
    expect(r.errors.join("|")).toMatch(/no FAQPage/i);
  });

  it("rejects wrong @type", () => {
    const faq = validFaq();
    faq["@type"] = "WebPage";
    const r = validateFaqPage(faq);
    expect(r.ok).toBe(false);
    expect(r.errors.join("|")).toMatch(/@type must be FAQPage/);
  });

  it("rejects missing @context", () => {
    const faq = validFaq();
    delete faq["@context"];
    const r = validateFaqPage(faq);
    expect(r.ok).toBe(false);
    expect(r.errors.join("|")).toMatch(/schema\.org/);
  });

  it("rejects @context that doesn't reference schema.org", () => {
    const faq = validFaq();
    faq["@context"] = "https://example.com";
    const r = validateFaqPage(faq);
    expect(r.ok).toBe(false);
    expect(r.errors.join("|")).toMatch(/schema\.org/);
  });

  it("rejects missing mainEntity entirely", () => {
    const faq = validFaq();
    delete faq.mainEntity;
    const r = validateFaqPage(faq);
    expect(r.ok).toBe(false);
    expect(r.errors.join("|")).toMatch(/mainEntity must be an array/);
  });

  it("rejects mainEntity as an object instead of array", () => {
    const faq = validFaq();
    faq.mainEntity = validQuestion("only one", "single");
    const r = validateFaqPage(faq);
    expect(r.ok).toBe(false);
    expect(r.errors.join("|")).toMatch(/mainEntity must be an array/);
  });

  it("rejects mainEntity with fewer than 2 entries", () => {
    const faq = validFaq();
    faq.mainEntity = [validQuestion("only?", "yes")];
    const r = validateFaqPage(faq);
    expect(r.ok).toBe(false);
    expect(r.errors.join("|")).toMatch(/>=2 entries/);
  });

  it("rejects a Question with the wrong @type", () => {
    const faq = validFaq();
    faq.mainEntity[0]["@type"] = "Thing";
    const r = validateFaqPage(faq);
    expect(r.ok).toBe(false);
    expect(r.errors.join("|")).toMatch(/@type must be Question/);
  });

  it("rejects a Question.name that is empty string", () => {
    const faq = validFaq();
    faq.mainEntity[0].name = "";
    const r = validateFaqPage(faq);
    expect(r.ok).toBe(false);
    expect(r.errors.join("|")).toMatch(/name is empty or whitespace-only/);
  });

  it("rejects a Question.name that is whitespace-only", () => {
    const faq = validFaq();
    faq.mainEntity[0].name = "   \n\t  ";
    const r = validateFaqPage(faq);
    expect(r.ok).toBe(false);
    expect(r.errors.join("|")).toMatch(/name is empty or whitespace-only/);
  });

  it("rejects a Question.name with leading/trailing whitespace (not trimmed)", () => {
    const faq = validFaq();
    faq.mainEntity[0].name = "  What is B12?  ";
    const r = validateFaqPage(faq);
    expect(r.ok).toBe(false);
    expect(r.errors.join("|")).toMatch(/name is not trimmed/);
  });

  it("rejects a Question.name that is not a string", () => {
    const faq = validFaq();
    faq.mainEntity[0].name = 42 as any;
    const r = validateFaqPage(faq);
    expect(r.ok).toBe(false);
    expect(r.errors.join("|")).toMatch(/name must be a string/);
  });

  it("rejects missing acceptedAnswer", () => {
    const faq = validFaq();
    delete faq.mainEntity[0].acceptedAnswer;
    const r = validateFaqPage(faq);
    expect(r.ok).toBe(false);
    expect(r.errors.join("|")).toMatch(/acceptedAnswer must be an object/);
  });

  it("rejects acceptedAnswer with wrong @type", () => {
    const faq = validFaq();
    faq.mainEntity[0].acceptedAnswer["@type"] = "Comment";
    const r = validateFaqPage(faq);
    expect(r.ok).toBe(false);
    expect(r.errors.join("|")).toMatch(/acceptedAnswer.@type must be Answer/);
  });

  it("rejects empty acceptedAnswer.text", () => {
    const faq = validFaq();
    faq.mainEntity[0].acceptedAnswer.text = "";
    const r = validateFaqPage(faq);
    expect(r.ok).toBe(false);
    expect(r.errors.join("|")).toMatch(/text is empty or whitespace-only/);
  });

  it("rejects whitespace-only acceptedAnswer.text", () => {
    const faq = validFaq();
    faq.mainEntity[0].acceptedAnswer.text = "\n   \t  ";
    const r = validateFaqPage(faq);
    expect(r.ok).toBe(false);
    expect(r.errors.join("|")).toMatch(/text is empty or whitespace-only/);
  });

  it("rejects acceptedAnswer.text that has leading/trailing whitespace", () => {
    const faq = validFaq();
    faq.mainEntity[0].acceptedAnswer.text = "  A vitamin.  ";
    const r = validateFaqPage(faq);
    expect(r.ok).toBe(false);
    expect(r.errors.join("|")).toMatch(/text is not trimmed/);
  });

  it("rejects duplicate Question.name entries (exact)", () => {
    const faq = validFaq();
    faq.mainEntity = [
      validQuestion("What is B12?", "Answer A."),
      validQuestion("What is B12?", "Answer B."),
    ];
    const r = validateFaqPage(faq);
    expect(r.ok).toBe(false);
    expect(r.errors.join("|")).toMatch(/duplicate Question\.name/);
  });

  it("rejects duplicate Question.name entries after case + whitespace normalization", () => {
    const faq = validFaq();
    faq.mainEntity = [
      validQuestion("What is B12?", "Answer A."),
      validQuestion("what   is  b12?", "Answer B."),
    ];
    const r = validateFaqPage(faq);
    expect(r.ok).toBe(false);
    expect(r.errors.join("|")).toMatch(/duplicate Question\.name/);
  });

  it("accumulates multiple errors when several fields are malformed at once", () => {
    const faq: Faq = {
      "@type": "FAQPage",
      "@context": "https://example.com",
      mainEntity: [
        { "@type": "Thing", name: "  ", acceptedAnswer: { "@type": "Answer", text: "" } },
      ],
    };
    const r = validateFaqPage(faq);
    expect(r.ok).toBe(false);
    expect(r.errors.length).toBeGreaterThanOrEqual(3);
  });
});

// ---------------------------------------------------------------------------
// Tolerance — normalization must accept trivial formatting variants.

describe("validateFaqPage tolerates whitespace/case variants (semantic equality only)", () => {
  it("accepts @type values with different case and whitespace", () => {
    const faq = validFaq();
    faq["@type"] = "  faqpage\n";
    faq.mainEntity[0]["@type"] = " QUESTION ";
    faq.mainEntity[0].acceptedAnswer["@type"] = "answer";
    const r = validateFaqPage(faq);
    expect(r.ok, r.errors.join("; ")).toBe(true);
  });

  it("accepts @context with different case, http/https, and trailing slashes", () => {
    for (const ctx of [
      "http://schema.org",
      "HTTPS://SCHEMA.ORG/",
      "  https://schema.org  ",
      "https://schema.org///",
    ]) {
      const faq = validFaq();
      faq["@context"] = ctx;
      const r = validateFaqPage(faq);
      expect(r.ok, `${ctx}: ${r.errors.join("; ")}`).toBe(true);
    }
  });

  it("accepts @type as an array containing the expected value", () => {
    const faq = validFaq();
    faq["@type"] = ["Thing", "FAQPage"];
    faq.mainEntity[0]["@type"] = ["Question", "Thing"];
    const r = validateFaqPage(faq);
    expect(r.ok, r.errors.join("; ")).toBe(true);
  });
});
