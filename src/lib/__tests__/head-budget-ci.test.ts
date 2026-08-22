/**
 * Unit coverage for the CI gates that police head size and microdata scopes.
 * These run in vitest so the rules are verified even when no server is up;
 * the shell scripts apply the same functions to live HTML.
 */

import { describe, expect, it } from "vitest";
import {
  HEAD_CHILD_BUDGET,
  checkHeadBudget,
  countHeadChildren,
} from "../../../scripts/lib/head-budget-check.mjs";
import { checkScopes, parseScopes } from "../../../scripts/lib/microdata-scopes.mjs";

function headWith(children: string): string {
  return `<!doctype html><html><head>${children}</head><body></body></html>`;
}

describe("head budget", () => {
  it("uses a 60-child budget", () => {
    expect(HEAD_CHILD_BUDGET).toBe(60);
  });

  it("counts direct element children only", () => {
    const html = headWith(
      `<title>t</title><meta name="a" content="1"><link rel="canonical" href="/">` +
        `<script type="application/ld+json">{"@type":"WebPage","x":"<b>not a tag</b>"}</script>`,
    );
    expect(countHeadChildren(html)).toBe(4);
  });

  it("passes a lean head and fails a bloated one", () => {
    const lean = headWith(
      Array.from({ length: 40 }, (_, i) => `<meta name="m${i}" content="x">`).join(""),
    );
    const bloated = headWith(
      Array.from({ length: 61 }, (_, i) => `<meta name="m${i}" content="x">`).join(""),
    );
    expect(checkHeadBudget("/", lean).ok).toBe(true);
    const fail = checkHeadBudget("/library/retatrutide", bloated);
    expect(fail.ok).toBe(false);
    expect(fail.message).toContain("61");
  });
});

const GOOD_PAGE = `
<div itemscope itemtype="https://schema.org/WebPage">
  <span itemprop="name">DoseRoutine</span>
  <span itemprop="description">Track your protocol</span>
  <div itemprop="publisher" itemscope itemtype="https://schema.org/Organization">
    <span itemprop="name">DoseRoutine</span>
  </div>
</div>`;

describe("microdata scopes", () => {
  it("accepts exactly one populated page scope", () => {
    expect(checkScopes("/", GOOD_PAGE)).toEqual([]);
  });

  it("rejects duplicate page-level scopes", () => {
    const problems = checkScopes("/", GOOD_PAGE + GOOD_PAGE);
    expect(problems.some((p: string) => p.includes("2 page-level scopes"))).toBe(true);
  });

  it("rejects an empty scope", () => {
    const problems = checkScopes(
      "/x",
      `<div itemscope itemtype="https://schema.org/WebPage"></div>`,
    );
    expect(problems.some((p: string) => p.includes("no itemprop values"))).toBe(true);
  });

  it("rejects an itemscope with no itemtype", () => {
    const problems = checkScopes(
      "/x",
      GOOD_PAGE + `<div itemscope><span itemprop="name">x</span></div>`,
    );
    expect(problems.some((p: string) => p.includes("without itemtype"))).toBe(true);
  });

  it("reports missing microdata entirely", () => {
    expect(checkScopes("/x", "<div>nothing</div>")).toEqual(["/x: no itemscope elements at all"]);
  });

  it("treats nested itemprop scopes as children, not page scopes", () => {
    const scopes = parseScopes(GOOD_PAGE);
    expect(scopes).toHaveLength(2);
    expect(scopes[1].prop).toBe("publisher");
  });
});
