/**
 * Offline SEO scoring for /blog posts.
 *
 * Deterministic, network-free rules that can run on every build so an
 * unoptimised post fails CI on the commit that introduced it. Scores four
 * things that measurably move blog rankings:
 *
 *   1. <title>        — length, uniqueness, brand suffix, keyword presence
 *   2. meta description — length, uniqueness, completeness
 *   3. H1 / H2 structure — one H1, enough unique H2s, sane heading lengths
 *   4. keyword in the first 100 words of the speakable intro
 *
 * Rendering contract (src/routes/blog.$slug.tsx):
 *   post.title       -> <title>
 *   post.description -> <meta name="description">
 *   post.heading     -> the single <h1>
 *   section.heading  -> each <h2>
 *   post.intro       -> the first paragraph of body copy
 */

import { BLOG_POSTS, type BlogPost } from "@/lib/blog-posts";
import {
  DEFAULT_SEO_SCORE_CONFIG,
  type SeoCheckId,
  type SeoScoreConfig,
} from "@/lib/seo-score-config";

const D = DEFAULT_SEO_SCORE_CONFIG.rules;

/** Default thresholds, kept as named exports for existing callers/tests. */
export const TITLE_MIN = D.title_length.min!;
export const TITLE_MAX = D.title_length.max!;
export const DESCRIPTION_MIN = D.description_length.min!;
export const DESCRIPTION_MAX = D.description_length.max!;
export const MIN_SECTIONS = D.h2_count.min!;
export const INTRO_KEYWORD_WINDOW = D.intro_keyword.windowWords!;
/** A post scoring below this fails CI (default; see seo-score.config.json). */
export const PASSING_SCORE = DEFAULT_SEO_SCORE_CONFIG.passingScore;

export type SeoCheck = {
  id: SeoCheckId;
  label: string;
  /** Points this check contributes when it passes. */
  weight: number;
  passed: boolean;
  detail: string;
};

export type BlogSeoScore = {
  slug: string;
  score: number;
  checks: SeoCheck[];
  failed: SeoCheck[];
  /** Keyword variants accepted for this post. */
  keywords: string[];
};

const STOPWORDS = new Set([
  "the","a","an","and","or","for","to","of","in","on","is","it","its","your","you",
  "what","how","why","when","does","do","with","without","that","this","are","be",
  "will","can","from","my","at","as","much","long","take","really","actually","guide",
  "best","before","after","more","than","into","about","should","has","have","gone",
  "bad","not","but","out","per","use","using","need","know",
]);

function normalise(value: string): string {
  return value
    .toLowerCase()
    .replace(/[’']/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function words(value: string): string[] {
  return normalise(value).split(" ").filter(Boolean);
}

/** First `n` words of the post's speakable intro. */
export function firstWords(value: string, n = INTRO_KEYWORD_WINDOW): string {
  return words(value).slice(0, n).join(" ");
}

/**
 * Accepted keyword variants for a post: every tag label plus the meaningful
 * tokens of the slug. Slug tokens are what a searcher actually typed, tags are
 * the hand-curated entity names.
 */
export function keywordsFor(post: BlogPost): string[] {
  const fromTags = post.tags.map((t) => normalise(t.label)).filter(Boolean);
  const fromSlug = normalise(post.slug.replace(/-/g, " "))
    .split(" ")
    .filter((w) => w.length >= 3 && !STOPWORDS.has(w));
  return Array.from(new Set([...fromTags, ...fromSlug]));
}

/** Share of a post's slug keywords that appear in the given text. */
export function keywordCoverage(text: string, keywords: string[]): number {
  if (keywords.length === 0) return 0;
  const haystack = ` ${normalise(text)} `;
  const hits = keywords.filter((k) => haystack.includes(` ${k} `) || haystack.includes(k));
  return hits.length / keywords.length;
}

export function scoreBlogPost(
  post: BlogPost,
  config: SeoScoreConfig = DEFAULT_SEO_SCORE_CONFIG,
): BlogSeoScore {
  const r = config.rules;
  const keywords = keywordsFor(post);
  const introWindow = r.intro_keyword.windowWords ?? INTRO_KEYWORD_WINDOW;
  const intro = firstWords(post.intro, introWindow);
  const introWordCount = words(post.intro).length;
  const h2s = post.sections.map((s) => s.heading);
  const uniqueH2s = new Set(h2s.map(normalise));
  const titleCoverage = keywordCoverage(post.title, keywords);
  const introCoverage = keywordCoverage(intro, keywords);

  const candidates: Array<Omit<SeoCheck, "weight">> = [
    {
      id: "title_length",
      label: `Title is ${r.title_length.min}–${r.title_length.max} characters`,
      passed:
        post.title.length >= (r.title_length.min ?? 0) &&
        post.title.length <= (r.title_length.max ?? Infinity),
      detail: `${post.title.length} chars`,
    },
    {
      id: "title_brand",
      label: "Title carries the DoseRoutine brand suffix",
      passed: new RegExp(r.title_brand.suffixPattern ?? "").test(post.title),
      detail: post.title,
    },
    {
      id: "title_keyword",
      label: "Title contains at least one target keyword",
      passed: titleCoverage >= (r.title_keyword.minCoverage ?? 0.01),
      detail: `coverage ${(titleCoverage * 100).toFixed(0)}%`,
    },
    {
      id: "description_length",
      label: `Meta description is ${r.description_length.min}–${r.description_length.max} characters`,
      passed:
        post.description.length >= (r.description_length.min ?? 0) &&
        post.description.length <= (r.description_length.max ?? Infinity),
      detail: `${post.description.length} chars`,
    },
    {
      id: "description_sentence",
      label: "Meta description ends in terminal punctuation",
      passed: /[.!?]$/.test(post.description.trim()),
      detail: post.description.slice(-40),
    },
    {
      id: "h1_present",
      label: `Post has an H1 of at least ${r.h1_present.min} characters`,
      passed: post.heading.trim().length >= (r.h1_present.min ?? 0),
      detail: `${post.heading.length} chars`,
    },
    {
      id: "h1_distinct",
      label: "H1 is not a byte-for-byte copy of the <title>",
      passed: normalise(post.heading) !== normalise(post.title),
      detail: post.heading,
    },
    {
      id: "h2_count",
      label: `Post has at least ${r.h2_count.min} H2 sections`,
      passed: h2s.length >= (r.h2_count.min ?? 0),
      detail: `${h2s.length} sections`,
    },
    {
      id: "h2_unique",
      label: "Every H2 heading is unique",
      passed: uniqueH2s.size === h2s.length,
      detail: `${uniqueH2s.size}/${h2s.length} unique`,
    },
    {
      id: "h2_length",
      label: `No H2 heading exceeds ${r.h2_length.max} characters`,
      passed: h2s.every((h) => h.trim().length > 0 && h.length <= (r.h2_length.max ?? Infinity)),
      detail: `longest ${Math.max(0, ...h2s.map((h) => h.length))} chars`,
    },
    {
      id: "intro_keyword",
      label: `Target keyword appears in the first ${introWindow} words`,
      passed: introCoverage >= (r.intro_keyword.minCoverage ?? 0),
      detail: `coverage ${(introCoverage * 100).toFixed(0)}%`,
    },
    {
      id: "intro_length",
      label: `Intro is ${r.intro_length.min}–${r.intro_length.max} words (quotable answer length)`,
      passed:
        introWordCount >= (r.intro_length.min ?? 0) &&
        introWordCount <= (r.intro_length.max ?? Infinity),
      detail: `${introWordCount} words`,
    },
  ];

  const checks: SeoCheck[] = candidates
    .filter((c) => r[c.id].enabled)
    .map((c) => ({ ...c, weight: r[c.id].weight }));

  // Normalised to 100 so disabling or reweighting a rule keeps the
  // passingScore threshold meaningful.
  const total = checks.reduce((sum, c) => sum + c.weight, 0);
  const earned = checks.reduce((sum, c) => sum + (c.passed ? c.weight : 0), 0);
  const score = total > 0 ? Math.round((earned / total) * 100) : 100;
  return { slug: post.slug, score, checks, failed: checks.filter((c) => !c.passed), keywords };
}

export function scoreAllBlogPosts(
  posts: readonly BlogPost[] = BLOG_POSTS,
  config: SeoScoreConfig = DEFAULT_SEO_SCORE_CONFIG,
): BlogSeoScore[] {
  return posts.map((post) => scoreBlogPost(post, config));
}

/** Posts that fail the configured gate: below threshold or failing a blocking check. */
export function failingPosts(
  results: readonly BlogSeoScore[],
  config: SeoScoreConfig = DEFAULT_SEO_SCORE_CONFIG,
): BlogSeoScore[] {
  return results.filter(
    (r) =>
      r.score < config.passingScore ||
      r.failed.some((f) => config.blockingChecks.includes(f.id)),
  );
}

/** Human-readable one-line summary used in CI output. */
export function formatScore(result: BlogSeoScore): string {
  const failures = result.failed.map((f) => `${f.id} (${f.detail})`).join(", ");
  return `${result.slug}: ${result.score}/100${failures ? ` — failed: ${failures}` : ""}`;
}
