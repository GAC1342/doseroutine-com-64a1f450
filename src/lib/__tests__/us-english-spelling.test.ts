/**
 * Guard: site copy stays in US English.
 *
 * External SEO audits flag British spellings ("maths", "color", "labelled")
 * as misspellings on every page, because most of them live in shared copy.
 * This test fails the build if one comes back into user-facing content.
 */
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import fg from "fast-glob";

const config = JSON.parse(readFileSync(".cspell.json", "utf8")) as {
  flagWords: string[];
};

/** Approved domain vocabulary (compounds, acronyms, brands) — never "corrected". */
const WHITELIST = new Set(
  readFileSync("spelling/domain-terms.txt", "utf8")
    .split("\n")
    .map((line) => line.trim().toLowerCase())
    .filter((line) => line.length > 0 && !line.startsWith("#")),
);

const BRITISH = config.flagWords.filter((w) => !WHITELIST.has(w.toLowerCase()));

const PATTERN = new RegExp(`\\b(${BRITISH.join("|")})\\b`, "i");

describe("US English copy", () => {
  it("contains no British spellings in site content", async () => {
    const files = await fg(
      [
        "src/content/**/*.{ts,md}",
        "src/lib/blog-posts*.ts",
        "src/lib/compound-calculators.ts",
        "src/lib/feature-visuals.ts",
        "src/routes/**/*.tsx",
        "src/components/**/*.tsx",
      ],
      { ignore: ["**/__tests__/**", "**/*.test.*", "src/content/cms-articles/**"] },
    );

    const offenders: string[] = [];
    for (const file of files) {
      const source = readFileSync(file, "utf8");
      source.split("\n").forEach((line, index) => {
        const hit = PATTERN.exec(line);
        if (hit) offenders.push(`${file}:${index + 1} → ${hit[0]}`);
      });
    }

    expect(offenders).toEqual([]);
  });
});
