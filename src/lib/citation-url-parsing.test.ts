/**
 * Regression guard: every citation code path must funnel URL parsing
 * through `parseSafeUrl` (directly or via `classifyCitationUrl`).
 *
 * A single choke point keeps the SSRF rules (protocol allowlist, userinfo
 * ban, IP-literal detection, IDN normalization) uniform across the
 * server-fn allowlist, the redirect guard, and the client-side
 * "is this previewable?" check in the citation modal.
 *
 * If this test fails, do NOT paper over it with an eslint-disable — port
 * the offending callsite to `parseSafeUrl` / `classifyCitationUrl` so the
 * rules stay in one place.
 */

import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * Files that participate in citation URL handling. Any new module that
 * classifies, previews, or fetches a citation URL MUST be added here so
 * the legacy-parsing scanner covers it.
 */
const CITATION_FILES = [
  "src/lib/citations.functions.ts",
  "src/lib/citation-allowlist.ts",
  "src/components/citation-modal.tsx",
];

/**
 * Only place in the repo allowed to call `new URL(...)` directly.
 * Everyone else routes through it.
 */
const SAFE_URL_MODULE = "src/lib/safe-url.ts";

/** Legacy / raw URL-parsing patterns that must not appear in citation code. */
const LEGACY_URL_PATTERNS: { name: string; re: RegExp }[] = [
  { name: "new URL(", re: /\bnew\s+URL\s*\(/ },
  // Node's legacy `url` module.
  { name: 'require("url")', re: /require\s*\(\s*["']url["']\s*\)/ },
  { name: 'from "url"', re: /from\s+["']url["']/ },
  { name: 'from "node:url"', re: /from\s+["']node:url["']/ },
  // `URL.parse` (Node ≥ 22 static) — do not use in citation code.
  { name: "URL.parse(", re: /\bURL\.parse\s*\(/ },
];

/** Strip line + block comments so doc examples don't trip the scanner. */
function stripComments(src: string): string {
  return src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/[^\n]*/g, "$1");
}

function loadCode(path: string): string {
  return stripComments(readFileSync(join(process.cwd(), path), "utf8"));
}

describe("citation URL parsing choke point", () => {
  it("safe-url is the only module that constructs URL objects directly", () => {
    const safeUrlSrc = loadCode(SAFE_URL_MODULE);
    expect(
      /\bnew\s+URL\s*\(/.test(safeUrlSrc),
      `${SAFE_URL_MODULE}: expected to contain the ONE new URL(...) call that backs parseSafeUrl; scanner assumption broken if absent`,
    ).toBe(true);
  });

  for (const file of CITATION_FILES) {
    describe(file, () => {
      const src = loadCode(file);

      for (const { name, re } of LEGACY_URL_PATTERNS) {
        it(`does not use legacy URL parsing pattern: ${name}`, () => {
          const match = src.match(re);
          const lineNo = match ? src.slice(0, match.index ?? 0).split("\n").length : -1;
          expect(
            match,
            `${file}:${lineNo}: found legacy URL parsing "${name}". ` +
              `Use parseSafeUrl (from @/lib/safe-url) or classifyCitationUrl ` +
              `(from @/lib/citation-allowlist) instead so SSRF rules stay ` +
              `in one place.`,
          ).toBeNull();
        });
      }

      it("imports parseSafeUrl or classifyCitationUrl (proves it goes through the choke point)", () => {
        const usesSafeUrl = /parseSafeUrl|classifyCitationUrl/.test(src);
        // citations.functions.ts uses classifyCitationUrl via fetchCitationCore.
        // citation-allowlist.ts uses parseSafeUrl directly.
        // citation-modal.tsx uses classifyCitationUrl.
        expect(
          usesSafeUrl,
          `${file}: expected to import parseSafeUrl or classifyCitationUrl; ` +
            `neither symbol referenced. Citation URL handling must route ` +
            `through the shared safe-url pipeline.`,
        ).toBe(true);
      });
    });
  }
});
