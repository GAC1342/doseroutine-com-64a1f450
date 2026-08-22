/**
 * Every /articles post, served first-party from the repo.
 *
 * Two markdown sources are parsed at build time:
 *  - src/content/article-drafts/*.md — long-form SEO posts written in-house.
 *  - src/content/cms-articles/*.md   — posts previously served by the hosted
 *    CMS, snapshotted into the repo when that dependency was removed so the
 *    indexed URLs keep working with no third-party request at render time.
 */

import type { OutrankArticleRow } from "./outrank-articles.server";
import { safeTimestamp } from "@/lib/sitemap-lastmod";

export type LocalFaq = { question: string; answer: string };

export type LocalArticle = {
  slug: string;
  title: string;
  metaTitle: string;
  metaDescription: string;
  targetKeyword: string;
  /** Answer-first paragraph rendered as the speakable summary. */
  answer: string;
  /** Markdown body (headings, lists, paragraphs) without H1/answer/FAQs. */
  body: string;
  faqs: LocalFaq[];
  firstPublishedAt: string;
  modifiedAt: string;
  /** BCP-47 language of the body text (a few posts are not English). */
  lang: string;
  /** Which hero artwork set the slug's illustration lives in. */
  heroSet: "local" | "cms";
};

export type ArticleSource = "local" | "outrank";

/** Article shape used at runtime, whether it came from markdown or outrank.so. */
export type UnifiedArticle = Omit<LocalArticle, "heroSet"> & {
  heroSet: "local" | "cms" | "outrank";
  source: ArticleSource;
  bodyFormat: "markdown" | "html";
  /** Optional outrank featured image URL (used when heroSet is outrank). */
  featuredImageUrl?: string | null;
};

export const MEDICAL_DISCLAIMER =
  "This article is for informational purposes only and does not replace professional medical advice. Always consult your healthcare provider before changing medications or supplements.";

/** Publication dates, kept stable so JSON-LD and sitemap output is deterministic. */
const PUBLISHED_AT: Record<string, string> = {
  "best-apps-managing-prescriptions": "2026-08-18T09:00:00.000Z",
  "medication-reminder-app": "2026-08-18T09:10:00.000Z",
  "pill-reminder-app": "2026-08-18T09:20:00.000Z",
  "best-apps-for-health": "2026-08-18T09:30:00.000Z",
  "set-up-medication-reminder-health-app": "2026-08-18T09:40:00.000Z",
  // Week 1 of the 60-day editorial calendar (see src/lib/content-calendar.ts).
  "best-medication-reminder-apps": "2026-08-19T09:00:00.000Z",
  "best-free-medication-reminder-apps": "2026-08-20T09:00:00.000Z",
  "best-pill-reminder-apps-for-seniors": "2026-08-21T09:00:00.000Z",
  "best-medication-reminder-apps-iphone": "2026-08-22T09:00:00.000Z",
  "best-medication-reminder-apps-android": "2026-08-23T09:00:00.000Z",
  "best-apps-for-tracking-supplements": "2026-08-24T09:00:00.000Z",
  "best-apps-for-peptide-tracking": "2026-08-25T09:00:00.000Z",
  // Keyword-map gaps closed (see src/lib/keyword-page-map.ts).
  "missed-dose-what-to-do": "2026-08-26T09:00:00.000Z",
  "multiple-daily-dose-reminders": "2026-08-27T09:00:00.000Z",
};

const FALLBACK_DATE = "2026-08-18T09:00:00.000Z";

function parseFrontmatter(raw: string): { meta: Record<string, string>; rest: string } {
  const match = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/.exec(raw);
  if (!match) return { meta: {}, rest: raw };
  const meta: Record<string, string> = {};
  for (const line of match[1].split(/\r?\n/)) {
    const idx = line.indexOf(":");
    if (idx === -1) continue;
    meta[line.slice(0, idx).trim()] = line.slice(idx + 1).trim();
  }
  return { meta, rest: raw.slice(match[0].length) };
}

function parseFaqs(section: string): LocalFaq[] {
  const faqs: LocalFaq[] = [];
  const re = /\*\*(.+?)\*\*\s*\r?\n([\s\S]*?)(?=\r?\n\*\*|\r?\n---|\s*$)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(section)) !== null) {
    const question = m[1].trim();
    const answer = m[2].trim().replace(/\s*\n\s*/g, " ");
    if (question && answer) faqs.push({ question, answer });
  }
  return faqs;
}

export function parseArticleMarkdown(raw: string): LocalArticle | null {
  const { meta, rest } = parseFrontmatter(raw);
  const slug = meta["suggested_slug"];
  if (!slug) return null;

  const h1 = /^#\s+(.+)$/m.exec(rest);
  const title = h1 ? h1[1].trim() : (meta["meta_title"] ?? slug);

  const answerMatch = /<p class="dr-speakable-answer">([\s\S]*?)<\/p>/.exec(rest);
  const answer = answerMatch ? answerMatch[1].trim().replace(/\s*\n\s*/g, " ") : "";

  // Body = everything after the answer block, before the FAQs heading.
  const afterAnswer = answerMatch
    ? rest.slice(answerMatch.index + answerMatch[0].length)
    : rest.replace(/^#\s+.+$/m, "");
  const faqSplit = afterAnswer.split(/\r?\n##\s+FAQs?\s*\r?\n/);
  const body = faqSplit[0].trim();
  const faqs = faqSplit[1] ? parseFaqs(faqSplit[1].split(/\r?\n---\r?\n/)[0]) : [];

  // The editorial calendar stamps upcoming posts with their scheduled slot,
  // but the page itself is already live — so clamp to "now" and never tell a
  // crawler a published article was written in the future.
  const rawPublishedAt = meta["published_at"] ?? PUBLISHED_AT[slug] ?? FALLBACK_DATE;
  const publishedAt = safeTimestamp(rawPublishedAt) ?? FALLBACK_DATE;
  const modifiedAt = safeTimestamp(meta["modified_at"] ?? rawPublishedAt) ?? publishedAt;

  return {
    slug,
    title,
    metaTitle: meta["meta_title"] ?? title,
    metaDescription: meta["meta_description"] ?? answer.slice(0, 155),
    targetKeyword: meta["target_keyword"] ?? "",
    answer,
    body,
    faqs,
    firstPublishedAt: publishedAt,
    modifiedAt,
    lang: meta["lang"] || "en",
    heroSet: meta["hero_set"] === "cms" ? "cms" : "local",
  };
}

const modules = {
  ...(import.meta.glob("../content/article-drafts/*.md", {
    query: "?raw",
    import: "default",
    eager: true,
  }) as Record<string, string>),
  ...(import.meta.glob("../content/cms-articles/*.md", {
    query: "?raw",
    import: "default",
    eager: true,
  }) as Record<string, string>),
};

export const LOCAL_ARTICLES: LocalArticle[] = Object.keys(modules)
  .sort()
  .map((key) => parseArticleMarkdown(modules[key]))
  .filter((a): a is LocalArticle => a !== null);

/** Only the in-house drafts — CMS snapshots are excluded from editorial contracts. */
export const DRAFT_ARTICLES: LocalArticle[] = LOCAL_ARTICLES.filter((a) => a.heroSet === "local");

export const LOCAL_ARTICLE_SLUGS: string[] = LOCAL_ARTICLES.map((a) => a.slug);

export function getLocalArticle(slug: string): LocalArticle | null {
  return LOCAL_ARTICLES.find((a) => a.slug === slug) ?? null;
}

/** Converts a database outrank article into the runtime UnifiedArticle shape. */
export function outrankArticleToUnified(row: OutrankArticleRow): UnifiedArticle {
  const publishedAt = row.published_at ?? row.created_at ?? FALLBACK_DATE;
  const modifiedAt = row.modified_at ?? row.updated_at ?? publishedAt;
  const rawFaqs = Array.isArray(row.faqs) ? row.faqs : [];
  const faqs = rawFaqs
    .map((item: unknown) => {
      if (!item || typeof item !== "object") return null;
      const record = item as Record<string, unknown>;
      const question = typeof record.question === "string" ? record.question : "";
      const answer = typeof record.answer === "string" ? record.answer : "";
      if (!question || !answer) return null;
      return { question, answer };
    })
    .filter((f): f is { question: string; answer: string } => f !== null);

  const answerText =
    row.answer ??
    row.body
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 300) + "…";

  return {
    slug: row.slug,
    title: row.title,
    metaTitle: row.meta_title ?? row.title,
    metaDescription: row.meta_description ?? answerText.slice(0, 155),
    targetKeyword: row.target_keyword ?? "",
    answer: answerText,
    body: row.body,
    faqs,
    firstPublishedAt: publishedAt,
    modifiedAt,
    lang: row.lang ?? "en",
    heroSet: row.featured_image_url ? "outrank" : "local",
    source: "outrank",
    bodyFormat: (row.body_format as "markdown" | "html") ?? "markdown",
    featuredImageUrl: row.featured_image_url,
  };
}
