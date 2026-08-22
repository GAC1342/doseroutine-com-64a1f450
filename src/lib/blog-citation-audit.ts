/**
 * Blog citation audit.
 *
 * Every claim in a `/blog` post must be traceable to a reference in `refs`.
 * This module holds the *static* (offline, deterministic) rules that can run
 * on every build/deploy, plus the shared vocabulary the live link-checker in
 * `scripts/check-blog-citations.mjs` reports against.
 *
 * Static rules cannot detect a dead link — that needs network access. They
 * can detect malformed, duplicated, low-authority, or aging sourcing, which
 * is what actually rots first.
 */

import { BLOG_POSTS, type BlogPost } from "@/lib/blog-posts";

/** Source authority tiers, strongest first. */
export type SourceTier = "primary" | "regulatory" | "trade" | "unknown";

/** Peer-reviewed literature and trial registries. */
export const PRIMARY_HOSTS: ReadonlySet<string> = new Set([
  "pubmed.ncbi.nlm.nih.gov",
  "pmc.ncbi.nlm.nih.gov",
  "www.ncbi.nlm.nih.gov",
  "clinicaltrials.gov",
  "www.clinicaltrials.gov",
  "doi.org",
  "dx.doi.org",
  "europepmc.org",
  "www.nature.com",
  "www.nejm.org",
  "www.thelancet.com",
  "jamanetwork.com",
  "www.bmj.com",
  "www.cell.com",
  "diabetesjournals.org",
  "academic.oup.com",
  "link.springer.com",
  "onlinelibrary.wiley.com",
  "www.sciencedirect.com",
  "journals.plos.org",
  "www.ahajournals.org",
]);

/** Regulators, agencies, sponsors' own labels and investor disclosures. */
export const REGULATORY_HOSTS: ReadonlySet<string> = new Set([
  "www.fda.gov",
  "www.ema.europa.eu",
  "www.who.int",
  "www.cdc.gov",
  "dailymed.nlm.nih.gov",
  "medlineplus.gov",
  "www.nhs.uk",
  "www.nice.org.uk",
  "ods.od.nih.gov",
  "pi.lilly.com",
  "investor.regeneron.com",
  "investor.lilly.com",
  "www.novonordisk.com",
  "www.pbrc.edu",
  "www.prnewswire.com",
  "www.businesswire.com",
]);

/** Reputable trade and science press. Allowed, but never as a post's only sourcing. */
export const TRADE_HOSTS: ReadonlySet<string> = new Set([
  "www.biospace.com",
  "www.biopharmadive.com",
  "www.ajmc.com",
  "www.statnews.com",
  "www.endpts.com",
  "endpts.com",
  "medicalxpress.com",
  "www.medicalnewstoday.com",
  "longevity.technology",
  "www.fiercebiotech.com",
  "www.reuters.com",
]);

export function hostTier(host: string): SourceTier {
  if (PRIMARY_HOSTS.has(host)) return "primary";
  if (REGULATORY_HOSTS.has(host)) return "regulatory";
  if (TRADE_HOSTS.has(host)) return "trade";
  return "unknown";
}

/** A post whose `updated` date is older than this is flagged for re-review. */
export const STALE_AFTER_DAYS = 365;

export type CitationIssue = {
  slug: string;
  url?: string;
  /** `error` fails the build; `warning` is reported but non-blocking. */
  level: "error" | "warning";
  code:
    | "missing_refs"
    | "empty_cite"
    | "invalid_url"
    | "insecure_url"
    | "unknown_host"
    | "duplicate_url"
    | "bad_pubmed_id"
    | "trade_only_sourcing"
    | "stale_post";
  message: string;
};

const PUBMED_PATH_RE = /^\/(\d{5,9})\/?$/;

/** Parse a citation URL; returns null when it is not a usable https URL. */
export function parseCitationUrl(raw: string): URL | null {
  try {
    const u = new URL(raw);
    return u.protocol === "https:" || u.protocol === "http:" ? u : null;
  } catch {
    return null;
  }
}

/**
 * Run every offline citation rule over the given posts.
 *
 * `now` is injectable so the staleness rule is testable and deterministic.
 */
export function auditBlogCitations(
  posts: readonly BlogPost[] = BLOG_POSTS,
  now: Date = new Date(),
): CitationIssue[] {
  const issues: CitationIssue[] = [];

  for (const post of posts) {
    const refs = post.refs ?? [];
    if (refs.length < 2) {
      issues.push({
        slug: post.slug,
        level: "error",
        code: "missing_refs",
        message: `Post has ${refs.length} reference(s); every post needs at least 2.`,
      });
    }

    const seen = new Set<string>();
    const tiers: SourceTier[] = [];

    for (const ref of refs) {
      if (!ref.cite || ref.cite.trim().length < 8) {
        issues.push({
          slug: post.slug,
          url: ref.url,
          level: "error",
          code: "empty_cite",
          message: "Reference is missing a descriptive citation label.",
        });
      }

      const parsed = parseCitationUrl(ref.url ?? "");
      if (!parsed) {
        issues.push({
          slug: post.slug,
          url: ref.url,
          level: "error",
          code: "invalid_url",
          message: `Reference URL is not a valid http(s) URL: ${ref.url}`,
        });
        continue;
      }

      if (parsed.protocol !== "https:") {
        issues.push({
          slug: post.slug,
          url: ref.url,
          level: "error",
          code: "insecure_url",
          message: "Reference URL must use https.",
        });
      }

      const key = parsed.href.replace(/\/$/, "");
      if (seen.has(key)) {
        issues.push({
          slug: post.slug,
          url: ref.url,
          level: "warning",
          code: "duplicate_url",
          message: "Same source cited twice in one post.",
        });
      }
      seen.add(key);

      const tier = hostTier(parsed.hostname);
      tiers.push(tier);
      if (tier === "unknown") {
        issues.push({
          slug: post.slug,
          url: ref.url,
          level: "error",
          code: "unknown_host",
          message: `Host "${parsed.hostname}" is not an approved citation source. Add it to blog-citation-audit.ts only if it is a journal, regulator, sponsor disclosure or reputable trade outlet.`,
        });
      }

      if (parsed.hostname === "pubmed.ncbi.nlm.nih.gov" && !PUBMED_PATH_RE.test(parsed.pathname)) {
        issues.push({
          slug: post.slug,
          url: ref.url,
          level: "error",
          code: "bad_pubmed_id",
          message: "PubMed citation must point at /<PMID>/ with a 5-9 digit PMID.",
        });
      }
    }

    if (tiers.length > 0 && tiers.every((t) => t === "trade")) {
      issues.push({
        slug: post.slug,
        level: "warning",
        code: "trade_only_sourcing",
        message:
          "Post is sourced entirely from trade press — add a primary study, registry entry or regulatory document.",
      });
    }

    const updated = Date.parse(post.updated);
    if (!Number.isNaN(updated)) {
      const ageDays = Math.floor((now.getTime() - updated) / 86_400_000);
      if (ageDays > STALE_AFTER_DAYS) {
        issues.push({
          slug: post.slug,
          level: "warning",
          code: "stale_post",
          message: `Last reviewed ${ageDays} days ago (limit ${STALE_AFTER_DAYS}). Re-verify the citations and bump \`updated\`.`,
        });
      }
    }
  }

  return issues;
}

export const errorsOf = (issues: readonly CitationIssue[]) =>
  issues.filter((i) => i.level === "error");
