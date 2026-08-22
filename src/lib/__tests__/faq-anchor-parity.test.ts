import { beforeAll, describe, expect, it } from "vitest";
import {
  anchoredBlockText,
  checkFaqAnchorParity,
  extractFaqSchemaPairs,
} from "../faq-anchor-parity";
import { crawlSitemap } from "../crawl-cache";
import { faqAnchorId } from "../faq-snippet";

/**
 * FAQ anchor parity.
 *
 * Part 1 unit-tests the parser against synthetic HTML (always runs).
 * Part 2 crawls the rendered pages of a running site and asserts that every
 * FAQPage Question/Answer in the JSON-LD points at an anchored block whose
 * visible text contains that exact question and answer.
 *
 * Base URL: FAQ_PARITY_BASE_URL (default http://localhost:8080).
 * FAQ_PARITY_REQUIRE_SERVER=1 turns an unreachable server into a failure.
 * FAQ_PARITY_MAX_PAGES=N caps the crawl (default 80).
 */
const BASE_URL = (process.env["FAQ_PARITY_BASE_URL"] ?? "http://localhost:8080").replace(
  /\/+$/,
  "",
);
const REQUIRE_SERVER = process.env["FAQ_PARITY_REQUIRE_SERVER"] === "1";
const REQUIRE_ANCHORS = process.env["FAQ_PARITY_REQUIRE_ANCHORS"] === "1";
const MAX_PAGES = Number(process.env["FAQ_PARITY_MAX_PAGES"] ?? 80) || 80;
const CONCURRENCY = 6;

function page(question: string, answer: string, anchor = faqAnchorId(question)): string {
  return `<!doctype html><html><body>
    <section id="faq">
      <div id="${anchor}"><h3>${question}</h3><p>${answer}</p></div>
    </section>
    <script type="application/ld+json">${JSON.stringify({
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: [
        {
          "@type": "Question",
          "@id": `https://doseroutine.com/x#${anchor}`,
          url: `https://doseroutine.com/x#${anchor}`,
          name: question,
          acceptedAnswer: { "@type": "Answer", text: answer },
        },
      ],
    })}</script>
  </body></html>`;
}

const Q = "How long does retatrutide stay in your system?";
const A =
  "Retatrutide has a half-life of about six days, so a single dose clears over roughly a month.";

describe("faq-anchor-parity parser", () => {
  it("extracts question/answer pairs and their anchors", () => {
    const pairs = extractFaqSchemaPairs(page(Q, A));
    expect(pairs).toHaveLength(1);
    expect(pairs[0]!.question).toBe(Q);
    expect(pairs[0]!.answer).toBe(A);
    expect(pairs[0]!.anchor).toBe(faqAnchorId(Q));
  });

  it("passes when the anchored block contains both texts", () => {
    expect(checkFaqAnchorParity(page(Q, A)).ok).toBe(true);
  });

  it("reads only the anchored block, not the next FAQ entry", () => {
    const html = `<div id="faq-one"><h3>One</h3><p>First answer.</p></div><div id="faq-two"><h3>Two</h3><p>Second answer.</p></div>`;
    const text = anchoredBlockText(html, "faq-one")!;
    expect(text).toContain("First answer.");
    expect(text).not.toContain("Second answer.");
  });

  it("flags a missing anchor element", () => {
    const html = page(Q, A).replace(`id="${faqAnchorId(Q)}"`, 'id="faq-wrong"');
    const result = checkFaqAnchorParity(html);
    expect(result.issues.map((i) => i.code)).toContain("anchor-not-in-html");
  });

  it("flags an answer that differs from the rendered text", () => {
    const html = page(Q, A).replace(`<p>${A}</p>`, "<p>Something else entirely.</p>");
    const result = checkFaqAnchorParity(html);
    expect(result.issues.map((i) => i.code)).toContain("answer-text-mismatch");
  });

  it("flags a question rendered with different wording", () => {
    const html = page(Q, A).replace(`<h3>${Q}</h3>`, "<h3>Different heading</h3>");
    expect(checkFaqAnchorParity(html).issues.map((i) => i.code)).toContain(
      "question-text-mismatch",
    );
  });

  it("flags schema questions with no anchor fragment", () => {
    const html = page(Q, A).replace(/#faq-[a-z0-9-]+/g, "");
    expect(checkFaqAnchorParity(html).issues.map((i) => i.code)).toContain("missing-anchor");
  });

  it("falls back to whole-page text parity when anchors are not required", () => {
    const html = page(Q, A).replace(/#faq-[a-z0-9-]+/g, "");
    expect(checkFaqAnchorParity(html, { requireAnchors: false }).ok).toBe(true);
    const drifted = html.replace(`<p>${A}</p>`, "<p>Different answer copy.</p>");
    expect(
      checkFaqAnchorParity(drifted, { requireAnchors: false }).issues.map((i) => i.code),
    ).toContain("answer-not-on-page");
  });

  it("tolerates entities and smart quotes between schema and DOM", () => {
    const q = "What’s a “safe” starting dose?";
    const anchor = faqAnchorId(q);
    const answer = "Start low and titrate slowly, reviewing tolerance every week with a clinician.";
    const html = `<div id="${anchor}"><h3>What&rsquo;s a &ldquo;safe&rdquo; starting dose?</h3><p>${answer}</p></div>
      <script type="application/ld+json">${JSON.stringify({
        "@context": "https://schema.org",
        "@type": "FAQPage",
        mainEntity: [
          {
            "@type": "Question",
            "@id": `https://doseroutine.com/x#${anchor}`,
            name: q,
            acceptedAnswer: { "@type": "Answer", text: answer },
          },
        ],
      })}</script>`;
    expect(checkFaqAnchorParity(html).ok).toBe(true);
  });
});

interface PageResult {
  path: string;
  faqCount: number;
  issues: string[];
}

let serverUp = false;
let results: PageResult[] = [];
let crawled = 0;

beforeAll(async () => {
  const crawl = await crawlSitemap({
    baseUrl: BASE_URL,
    max: MAX_PAGES,
    concurrency: CONCURRENCY,
  });
  if (!crawl.reachable) return;
  serverUp = true;

  const pageResults = crawl.pages.map((page) => {
    const result = checkFaqAnchorParity(page.html, { requireAnchors: REQUIRE_ANCHORS });
    return {
      path: page.path,
      faqCount: result.pairs.length,
      issues: result.issues.map((i) => `[${i.code}] ${i.question} — ${i.detail}`),
    } satisfies PageResult;
  });

  crawled = crawl.paths.length;
  results = pageResults.filter((r) => r.faqCount > 0 || r.issues.length > 0);
}, 180_000);

describe("rendered pages: FAQ schema matches anchored on-page blocks", () => {
  it("reaches the site (or is explicitly allowed to skip)", () => {
    if (!serverUp && !REQUIRE_SERVER) {
      console.warn(`[faq-anchor-parity] ${BASE_URL} unreachable — crawl skipped`);
      return;
    }
    expect(serverUp, `${BASE_URL} unreachable`).toBe(true);
  });

  it("has every Question/Answer anchored to its exact rendered block", () => {
    if (!serverUp) return;
    const failing = results.filter((r) => r.issues.length > 0);
    const report = failing.map((r) => `${r.path}\n  ${r.issues.join("\n  ")}`).join("\n");
    expect(
      failing.length,
      `FAQ parity failures on ${failing.length}/${crawled} pages:\n${report}`,
    ).toBe(0);
  });

  it("found at least one page emitting FAQ schema", () => {
    if (!serverUp) return;
    expect(results.reduce((n, r) => n + r.faqCount, 0)).toBeGreaterThan(0);
  });
});
