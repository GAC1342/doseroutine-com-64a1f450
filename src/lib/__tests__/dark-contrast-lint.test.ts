import { describe, expect, it } from "vitest";
// @ts-expect-error -- plain ESM lint script without types
import { findViolations, runLint } from "../../../scripts/check-dark-contrast.mjs";
// @ts-expect-error -- plain ESM lint script without types
import { suggestToken, mirrorDarkVariant } from "../../../scripts/dark-contrast-token-map.mjs";
import allowlist from "../../../scripts/dark-contrast-allowlist.json";

const allowed = new Set(allowlist.entries as string[]);

type Violation = {
  key: string;
  file: string;
  line: number;
  rule: string;
  offending: string;
  suggestion: string | null;
  message: string;
};

describe("dark contrast lint", () => {
  it("flags a light-only severity chip", () => {
    const violations = findViolations(
      '<span className="bg-amber-50 text-amber-800">Caution</span>',
      "src/demo.tsx",
    );
    expect(violations.map((v: Violation) => v.key)).toEqual([
      "src/demo.tsx::bg-amber-50",
      "src/demo.tsx::text-amber-800",
    ]);
  });

  it("accepts a chip that pairs light and dark variants", () => {
    expect(
      findViolations(
        '<span className="bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-200" />',
        "src/demo.tsx",
      ),
    ).toEqual([]);
  });

  it("accepts semantic severity tokens", () => {
    expect(
      findViolations(
        '<span className="bg-[color:var(--severity-note-bg)] text-[color:var(--severity-note)]" />',
        "src/demo.tsx",
      ),
    ).toEqual([]);
  });

  it("flags malformed severity token usage", () => {
    const violations = findViolations(
      'className="bg-[color:var(--severity-avoid-bg))]"',
      "src/demo.tsx",
    );
    expect(violations).toHaveLength(1);
    expect(violations[0].message).toContain("malformed");
  });

  it("suggests a severity token for a light-only chip", () => {
    const [violation] = findViolations('<span className="bg-amber-50" />', "src/demo.tsx");
    expect(violation.suggestion).toBe("bg-[color:var(--severity-caution-bg)]");
  });

  it("flags a link colored with a raw palette class and suggests text-primary", () => {
    const [violation] = findViolations(
      '<a href="/x" className="text-blue-700">Read more</a>',
      "src/demo.tsx",
    );
    expect(violation.rule).toBe("link");
    expect(violation.suggestion).toBe("text-primary");
  });

  it("flags a tinted skeleton placeholder and suggests bg-muted", () => {
    const [violation] = findViolations('<Skeleton className="bg-teal-100" />', "src/demo.tsx");
    expect(violation.rule).toBe("skeleton");
    expect(violation.suggestion).toBe("bg-muted");
  });

  it("flags helper text faded below the readable alpha", () => {
    const [violation] = findViolations(
      '<p className="text-muted-foreground/40">Hint</p>',
      "src/demo.tsx",
    );
    expect(violation.rule).toBe("muted");
    expect(violation.suggestion).toBe("text-muted-foreground");
  });

  it("accepts helper text at a readable alpha", () => {
    expect(
      findViolations('<p className="text-muted-foreground/80">Hint</p>', "src/demo.tsx"),
    ).toEqual([]);
  });

  it("flags a light-only hover state on a button", () => {
    const [violation] = findViolations(
      '<button className="bg-background hover:bg-amber-50">x</button>',
      "src/demo.tsx",
    );
    expect(violation.rule).toBe("state");
    expect(violation.offending).toBe("hover:bg-amber-50");
    expect(violation.suggestion).toBe("hover:bg-[color:var(--severity-caution-bg)]");
  });

  it("accepts a hover state that defines its own dark counterpart", () => {
    expect(
      findViolations(
        '<button className="hover:bg-amber-50 dark:hover:bg-amber-950">x</button>',
        "src/demo.tsx",
      ),
    ).toEqual([]);
  });

  it("maps neutral palettes onto themed surface tokens", () => {
    expect(suggestToken("bg-gray-100").token).toBe("bg-muted");
    expect(suggestToken("text-slate-500").token).toBe("text-muted-foreground");
    expect(suggestToken("border-zinc-200").token).toBe("border-border");
  });

  it("mirrors a shade when no semantic token applies", () => {
    expect(mirrorDarkVariant("shadow-amber-100")).toBe("dark:shadow-amber-900");
  });

  it("has no un-allowlisted violations in src", async () => {
    const violations = await runLint();
    const failures = violations
      .filter((v: Violation) => !allowed.has(v.key))
      .map((v: Violation) => `${v.file}:${v.line} — ${v.message}`);
    expect(failures).toEqual([]);
  });
});
