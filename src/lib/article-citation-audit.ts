/**
 * Citation + medical-disclaimer consistency audit for first-party `/articles`
 * drafts (src/content/article-drafts/*.md).
 *
 * The `/blog` equivalent (`blog-citation-audit.ts`) audits a structured `refs`
 * array. Article drafts are markdown, so sourcing lives in inline links — this
 * module extracts those links and applies proportionate rules based on the
 * draft's declared `content_type`.
 *
 * Rules are split into blocking errors (fail the pre-publish gate) and
 * warnings (reported, non-blocking). Everything here is offline and pure; the
 * live dead-link pass lives in scripts/check-article-citations.mjs.
 */

import { hostTier, type SourceTier } from "@/lib/blog-citation-audit";

/**
 * How strictly a draft is held to sourcing rules.
 * - `medical`  — makes clinical claims (dosing, side effects, drug behavior, safety).
 * - `roundup`  — product/feature comparison; opinion, not clinical claims.
 * - `howto`    — product instructions for using the app.
 */
export type ArticleContentType = "medical" | "roundup" | "howto";

export const ARTICLE_CONTENT_TYPES: readonly ArticleContentType[] = ["medical", "roundup", "howto"];

export type ArticleDraft = {
  /** Source file name, used in reports so a human can find the draft. */
  file: string;
  slug: string;
  contentType: ArticleContentType | null;
  /** Raw markdown body including frontmatter-stripped content. */
  markdown: string;
};

export type ArticleCitation = {
  slug: string;
  file: string;
  text: string;
  url: string;
  host: string;
  tier: SourceTier;
};

export type ArticleCitationIssue = {
  slug: string;
  file: string;
  url?: string;
  level: "error" | "warning";
  code:
    | "missing_content_type"
    | "invalid_content_type"
    | "no_citations"
    | "thin_citations"
    | "invalid_url"
    | "insecure_url"
    | "unknown_host"
    | "duplicate_url"
    | "inline_disclaimer"
    | "roundup_uncited"
    | "stale_source"
    | "trade_only_sourcing"
    | "unsupported_safety_language";
  message: string;
};

/** Medical drafts need at least this many external sources. */
export const MIN_MEDICAL_CITATIONS = 2;

/** A cited source dated older than this many years is flagged for re-review. */
export const STALE_SOURCE_YEARS = 5;

/** Phrases that mean the draft is repeating the disclaimer the page already renders. */
const INLINE_DISCLAIMER_RE =
  /(medical disclaimer\s*:?|this article is for informational purposes only)/i;

/** Claim language that needs primary or regulatory backing. */
const SAFETY_LANGUAGE_RE =
  /\b(is safe|are safe|cures?|treats?|prevents?|clinically proven|proven to)\b/i;

const MARKDOWN_LINK_RE = /\[([^\]\n]+)\]\((https?:\/\/[^)\s]+)\)/g;

/** Parse `content_type` out of a draft's frontmatter. */
export function parseFrontmatterField(raw: string, field: string): string | null {
  const match = /^---\r?\n([\s\S]*?)\r?\n---/.exec(raw);
  if (!match) return null;
  for (const line of match[1].split(/\r?\n/)) {
    const idx = line.indexOf(":");
    if (idx === -1) continue;
    if (line.slice(0, idx).trim() === field) return line.slice(idx + 1).trim();
  }
  return null;
}

/** Build an {@link ArticleDraft} from a raw markdown file. */
export function toArticleDraft(file: string, raw: string): ArticleDraft {
  const slug = parseFrontmatterField(raw, "suggested_slug") ?? file.replace(/\.md$/, "");
  const declared = parseFrontmatterField(raw, "content_type");
  const contentType = (ARTICLE_CONTENT_TYPES as readonly string[]).includes(declared ?? "")
    ? (declared as ArticleContentType)
    : null;
  return { file, slug, contentType, markdown: raw };
}

/** Extract every external markdown link in a draft. */
export function extractCitations(draft: ArticleDraft): ArticleCitation[] {
  const out: ArticleCitation[] = [];
  MARKDOWN_LINK_RE.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = MARKDOWN_LINK_RE.exec(draft.markdown)) !== null) {
    const url = m[2].replace(/[.,;)]+$/, "");
    let host = "";
    try {
      host = new URL(url).hostname;
    } catch {
      host = "";
    }
    out.push({
      slug: draft.slug,
      file: draft.file,
      text: m[1].trim(),
      url,
      host,
      tier: host ? hostTier(host) : "unknown",
    });
  }
  return out;
}

function yearsFromSource(citation: ArticleCitation): number | null {
  const fromUrl = /\/((?:19|20)\d{2})(?:\/|-)/.exec(citation.url);
  const fromText = /\b((?:19|20)\d{2})\b/.exec(citation.text);
  const year = Number(fromUrl?.[1] ?? fromText?.[1] ?? NaN);
  return Number.isFinite(year) ? year : null;
}

/**
 * Run every offline rule over the given drafts.
 *
 * `now` is injectable so the staleness rule is deterministic in tests.
 */
export function auditArticleCitations(
  drafts: readonly ArticleDraft[],
  now: Date = new Date(),
): ArticleCitationIssue[] {
  const issues: ArticleCitationIssue[] = [];

  for (const draft of drafts) {
    const base = { slug: draft.slug, file: draft.file };
    const declared = parseFrontmatterField(draft.markdown, "content_type");

    if (!declared) {
      issues.push({
        ...base,
        level: "error",
        code: "missing_content_type",
        message: "Draft has no `content_type` in frontmatter. Add one of: medical, roundup, howto.",
      });
    } else if (!draft.contentType) {
      issues.push({
        ...base,
        level: "error",
        code: "invalid_content_type",
        message: `Unknown content_type "${declared}". Use: medical, roundup, howto.`,
      });
    }

    if (INLINE_DISCLAIMER_RE.test(draft.markdown)) {
      issues.push({
        ...base,
        level: "error",
        code: "inline_disclaimer",
        message:
          "Draft hardcodes its own medical disclaimer. The article page already renders the standard disclaimer — remove the inline copy so it is not shown twice.",
      });
    }

    const citations = extractCitations(draft);
    const seen = new Map<string, string>();
    const tiers = new Set<SourceTier>();

    for (const citation of citations) {
      if (!citation.host) {
        issues.push({
          ...base,
          url: citation.url,
          level: "error",
          code: "invalid_url",
          message: `Citation URL is not a valid URL: ${citation.url}`,
        });
        continue;
      }

      if (citation.url.startsWith("http://")) {
        issues.push({
          ...base,
          url: citation.url,
          level: "error",
          code: "insecure_url",
          message: "Citation URL must use https.",
        });
      }

      const key = citation.url.replace(/\/$/, "").toLowerCase();
      const priorText = seen.get(key);
      if (priorText !== undefined) {
        issues.push({
          ...base,
          url: citation.url,
          level: priorText === citation.text ? "warning" : "error",
          code: "duplicate_url",
          message:
            priorText === citation.text
              ? "Same source linked twice with the same anchor text."
              : `Same URL cited as two different sources ("${priorText}" and "${citation.text}").`,
        });
      } else {
        seen.set(key, citation.text);
      }

      tiers.add(citation.tier);
      if (citation.tier === "unknown") {
        issues.push({
          ...base,
          url: citation.url,
          level: "error",
          code: "unknown_host",
          message: `Host "${citation.host}" is not an approved citation source. Add it to the host tiers only if it is a journal, regulator, health agency or reputable trade outlet.`,
        });
      }

      const year = yearsFromSource(citation);
      if (year !== null && now.getFullYear() - year > STALE_SOURCE_YEARS) {
        issues.push({
          ...base,
          url: citation.url,
          level: "warning",
          code: "stale_source",
          message: `Source is dated ${year}, older than ${STALE_SOURCE_YEARS} years — check for a newer authority.`,
        });
      }
    }

    const external = citations.filter((c) => c.host);

    if (draft.contentType === "medical") {
      if (external.length === 0) {
        issues.push({
          ...base,
          level: "error",
          code: "no_citations",
          message:
            "Medical-claim article has no external citations. Cite a regulator, health agency or primary source.",
        });
      } else if (external.length < MIN_MEDICAL_CITATIONS) {
        issues.push({
          ...base,
          level: "error",
          code: "thin_citations",
          message: `Medical-claim article has ${external.length} citation(s); at least ${MIN_MEDICAL_CITATIONS} are required.`,
        });
      }

      const hasAuthority = tiers.has("primary") || tiers.has("regulatory");
      if (external.length > 0 && !hasAuthority) {
        issues.push({
          ...base,
          level: "warning",
          code: "trade_only_sourcing",
          message:
            "Clinical claims are backed only by trade press. Add a primary or regulatory source.",
        });
      }

      if (SAFETY_LANGUAGE_RE.test(draft.markdown) && !hasAuthority) {
        issues.push({
          ...base,
          level: "warning",
          code: "unsupported_safety_language",
          message:
            "Draft uses safety/efficacy language without a primary or regulatory source backing it.",
        });
      }
    } else if (external.length === 0) {
      issues.push({
        ...base,
        level: "warning",
        code: "roundup_uncited",
        message:
          "No external citations. Fine for product comparisons and how-tos, but add sourcing for any factual claim.",
      });
    }
  }

  return issues;
}

/** Convenience split used by the CLI and the pre-publish gate. */
export function splitIssues(issues: readonly ArticleCitationIssue[]) {
  return {
    errors: issues.filter((i) => i.level === "error"),
    warnings: issues.filter((i) => i.level === "warning"),
  };
}
