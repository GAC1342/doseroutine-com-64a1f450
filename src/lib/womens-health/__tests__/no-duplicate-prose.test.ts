import { describe, it, expect } from "vitest";
import type { WomensCompoundContent } from "@/components/womens-compound-article";
import * as fertility from "../fertility-content";
import * as longevity from "../longevity-content";
import * as menopause from "../menopause-content";
import * as sexual from "../sexual-health-content";

/**
 * Near-duplicate paragraph detector for women's-health clinical prose.
 *
 * Catches copy-paste drift across compounds (research[].body and faq[].a)
 * BEFORE route/schema tests run. Uses word 5-gram Jaccard similarity.
 *
 * Thresholds (tuned; adjust if false positives appear):
 *   - MIN_WORDS = 25   : ignore short strings (boilerplate CTAs, tiny FAQs)
 *   - SHINGLE_N = 5    : 5-word shingles
 *   - JACCARD_FAIL = 0.55 : anything above this across DIFFERENT compounds fails
 *
 * To intentionally share a paragraph across compounds, add its normalised
 * form to ALLOWLIST below (e.g. the interaction-checker CTA).
 */

const MIN_WORDS = 25;
const SHINGLE_N = 5;
const JACCARD_FAIL = 0.55;

const ALLOWLIST_SUBSTRINGS: string[] = [
  // Intentionally-shared boilerplate. Keep this list tiny.
  "doseroutine.com/interaction-checker",
];

type Paragraph = {
  compound: string;
  location: string; // e.g. "research[2].body" or "faq[0].a"
  text: string;
  normalised: string;
  shingles: Set<string>;
};

function normalise(s: string): string {
  return s
    .toLowerCase()
    .replace(/[\u2018\u2019\u201C\u201D]/g, "'")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function shingle(words: string[], n: number): Set<string> {
  const out = new Set<string>();
  if (words.length < n) {
    out.add(words.join(" "));
    return out;
  }
  for (let i = 0; i <= words.length - n; i++) {
    out.add(words.slice(i, i + n).join(" "));
  }
  return out;
}

function jaccard(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 && b.size === 0) return 0;
  let inter = 0;
  for (const s of a) if (b.has(s)) inter++;
  const union = a.size + b.size - inter;
  return union === 0 ? 0 : inter / union;
}

function collect(mod: Record<string, unknown>): WomensCompoundContent[] {
  return Object.values(mod).filter(
    (v): v is WomensCompoundContent =>
      !!v && typeof v === "object" && "slug" in (v as object) && "research" in (v as object),
  );
}

function buildCorpus(): Paragraph[] {
  const all: WomensCompoundContent[] = [
    ...collect(fertility),
    ...collect(longevity),
    ...collect(menopause),
    ...collect(sexual),
  ];
  const paras: Paragraph[] = [];
  for (const c of all) {
    (c.research ?? []).forEach((r, i) => {
      paras.push(makePara(c.slug, `research[${i}].body`, r.body));
    });
    (c.faq ?? []).forEach((f, i) => {
      paras.push(makePara(c.slug, `faq[${i}].a`, f.a));
    });
  }
  return paras.filter((p) => {
    if (p.normalised.split(" ").filter(Boolean).length < MIN_WORDS) return false;
    for (const allow of ALLOWLIST_SUBSTRINGS) {
      const needle = normalise(allow);
      if (p.normalised.includes(needle) || p.text.toLowerCase().includes(allow.toLowerCase())) {
        return false;
      }
    }
    return true;
  });
}

function makePara(compound: string, location: string, text: string): Paragraph {
  const normalised = normalise(text);
  const words = normalised.split(" ").filter(Boolean);
  return { compound, location, text, normalised, shingles: shingle(words, SHINGLE_N) };
}

describe("women's-health clinical prose: near-duplicate detector", () => {
  const corpus = buildCorpus();

  it("indexed at least 100 substantial paragraphs (guards accidental empty run)", () => {
    expect(corpus.length).toBeGreaterThan(100);
  });

  it("no cross-compound paragraph exceeds Jaccard similarity threshold", () => {
    const offenders: Array<{
      a: string;
      b: string;
      score: number;
    }> = [];

    for (let i = 0; i < corpus.length; i++) {
      for (let j = i + 1; j < corpus.length; j++) {
        const p = corpus[i];
        const q = corpus[j];
        if (p.compound === q.compound) continue; // same-compound repetition is not the target
        const score = jaccard(p.shingles, q.shingles);
        if (score >= JACCARD_FAIL) {
          offenders.push({
            a: `${p.compound} ${p.location}`,
            b: `${q.compound} ${q.location}`,
            score: Math.round(score * 100) / 100,
          });
        }
      }
    }

    if (offenders.length > 0) {
      const top = offenders
        .sort((x, y) => y.score - x.score)
        .slice(0, 20)
        .map((o) => `  ${o.score}  ${o.a}  <->  ${o.b}`)
        .join("\n");
      throw new Error(
        `Found ${offenders.length} near-duplicate paragraph pair(s) across different compounds (Jaccard >= ${JACCARD_FAIL}).\n` +
          `Rewrite one side, or if intentionally shared, add a distinctive substring to ALLOWLIST_SUBSTRINGS in this test.\n\nTop offenders:\n${top}`,
      );
    }
    expect(offenders).toEqual([]);
  });
});
