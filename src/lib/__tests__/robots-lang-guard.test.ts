import { describe, expect, it } from "vitest";
// @ts-expect-error - plain .mjs script without types
import { findLangBlockingRules } from "../../../scripts/robots-lang-guard.mjs";

const detect = findLangBlockingRules as (
  txt: string,
) => { line: number; userAgent: string; rule: string }[];

describe("robots lang guard", () => {
  it("passes a clean robots.txt", () => {
    expect(
      detect(["User-agent: *", "Allow: /", "Disallow: /manual", ""].join("\n")),
    ).toEqual([]);
  });

  it("flags ?lang= disallow rules", () => {
    const offenders = detect("User-agent: *\nDisallow: /*?lang=\n");
    expect(offenders).toHaveLength(1);
    expect(offenders[0].rule).toBe("Disallow: /*?lang=");
  });

  it("flags &lang= disallow rules", () => {
    expect(detect("User-agent: *\nDisallow: /*&lang=\n")).toHaveLength(1);
  });

  it("flags a blanket Disallow: /", () => {
    expect(detect("User-agent: Googlebot\nDisallow: /\n")[0].userAgent).toBe(
      "Googlebot",
    );
  });

  it("ignores comments and empty Disallow", () => {
    expect(
      detect("User-agent: *\n# Disallow: /*?lang=\nDisallow:\n"),
    ).toEqual([]);
  });
});
