/**
 * Offline contract test for the /library/* direct-answer CI check.
 *
 * The live sweep (scripts/check-direct-answers.mjs, run in CI against a booted
 * server) reuses auditHtml(), so these fixtures lock in exactly what that check
 * accepts and rejects: a 40-60 word answer paragraph immediately under the H1,
 * with no CTA or marketing copy above it.
 */

import { describe, it, expect } from "vitest";
import {
  auditHtml,
  wordCount,
  compoundSlugsFromSitemap,
} from "../../../scripts/check-direct-answers.mjs";


const FORTY_FOUR_WORDS =
  "Zinc bisglycinate is a chelated form of zinc bound to two glycine molecules, chosen for absorption and gastrointestinal tolerability. Research on zinc bisglycinate focuses on immune function, tissue recovery, and cognition. It is typically taken with a meal, and doses above forty milligrams daily can reduce copper status.";

function page(opts: { above?: string; answer?: string; answerClass?: string; between?: string }) {
  const {
    above = "",
    answer = FORTY_FOUR_WORDS,
    answerClass = "dr-speakable-intro mt-3",
    between = "",
  } = opts;
  return `<html><body><main>${above}<h1 class="x">Zinc Bisglycinate<span>Benefits, Dosage &amp; Interactions</span></h1>${between}<p class="${answerClass}">${answer}</p><div>rest of page</div></main></body></html>`;
}

describe("direct-answer CI check", () => {
  it("counts the reference fixture inside the 40-60 word band", () => {
    expect(wordCount(FORTY_FOUR_WORDS)).toBeGreaterThanOrEqual(40);
    expect(wordCount(FORTY_FOUR_WORDS)).toBeLessThanOrEqual(60);
  });

  it("passes a compliant page", () => {
    expect(auditHtml(page({}))).toEqual([]);
  });

  it("allows the alias line between the H1 and the answer", () => {
    const html = page({ between: `<p class="mt-2">Also known as: zinc glycinate</p>` });
    expect(auditHtml(html)).toEqual([]);
  });

  it("fails when a CTA sits above the H1", () => {
    const html = page({ above: `<a href="/auth">Start free</a>` });
    expect(auditHtml(html).join(" ")).toMatch(/above the H1/);
  });

  it("fails when pricing marketing sits above the H1", () => {
    const html = page({ above: `<a href="/pricing">See plans</a>` });
    expect(auditHtml(html).join(" ")).toMatch(/pricing link/);
  });

  it("fails when a marketing block is injected between the H1 and the answer", () => {
    const html = page({ between: `<div class="cta">Sign up free</div>` });
    expect(auditHtml(html).join(" ")).toMatch(/not the first element under the H1/);
  });

  it("fails when the answer paragraph is missing its marker class", () => {
    expect(auditHtml(page({ answerClass: "mt-3" })).join(" ")).toMatch(/not the first element/);
  });

  it("fails a too-short answer", () => {
    const html = page({ answer: "Zinc bisglycinate is a chelated form of zinc." });
    expect(auditHtml(html).join(" ")).toMatch(/words, expected 40-60/);
  });

  it("fails a too-long answer", () => {
    const html = page({ answer: `${FORTY_FOUR_WORDS} ${FORTY_FOUR_WORDS}` });
    expect(auditHtml(html).join(" ")).toMatch(/words, expected 40-60/);
  });

  it("fails product framing inside the answer", () => {
    const answer = FORTY_FOUR_WORDS.replace(
      "Research on",
      "DoseRoutine helps you review research on",
    );
    expect(auditHtml(page({ answer })).join(" ")).toMatch(/marketing framing/);
  });

  it("fails a page with no H1", () => {
    expect(auditHtml("<main><p>text</p></main>")).toEqual(["no <h1> found"]);
  });

  it("selects only compound detail slugs from the sitemap", () => {
    const xml = `<urlset>
      <url><loc>https://doseroutine.com/library</loc></url>
      <url><loc>https://doseroutine.com/library/zinc-bisglycinate</loc></url>
      <url><loc>https://doseroutine.com/library/compare</loc></url>
      <url><loc>https://doseroutine.com/library/guides/hexarelin-protocol</loc></url>
      <url><loc>https://doseroutine.com/blog</loc></url>
    </urlset>`;
    expect(compoundSlugsFromSitemap(xml)).toEqual(["zinc-bisglycinate"]);
  });
});
