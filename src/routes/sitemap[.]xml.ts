import { createFileRoute } from "@tanstack/react-router";
import type {} from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { GOALS } from "@/lib/goals";
import { HELP_LIST } from "@/lib/help-articles";
import { CALCULATOR_PAGES } from "@/lib/compound-calculators";
import { fetchPairPages } from "@/lib/interaction-pairs";
import { DEFAULT_LOCALE } from "@/lib/i18n";
import { BLOG_LAST_UPDATED, BLOG_POSTS_NEWEST_FIRST, BLOG_TAG_ARCHIVES } from "@/lib/blog-posts";
import { blogListSitemapPaths } from "@/lib/blog-list-canonical";
import { BLOG_FALLBACK_IMAGE, blogPostImageUrl } from "@/lib/blog-seo";
import { blogUrlHints, sitemapCachePolicy } from "@/lib/blog-freshness";
import { LOCAL_ARTICLES } from "@/lib/local-articles";
import { getOutrankArticles } from "@/lib/outrank-articles.server";
import { sitemapImageFor } from "@/lib/sitemap-images";
import { safeTimestamp } from "@/lib/sitemap-lastmod";

const BASE_URL = "https://doseroutine.com";

/** A hero / featured image attached to a sitemap URL. */
type SitemapImage = { loc: string; title?: string; caption?: string };

function xmlEscape(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/** <image:image> child for Google Images discovery. */
function imageTag(image: SitemapImage) {
  return [
    `    <image:image>`,
    `      <image:loc>${xmlEscape(image.loc)}</image:loc>`,
    image.title ? `      <image:title>${xmlEscape(image.title)}</image:title>` : null,
    image.caption ? `      <image:caption>${xmlEscape(image.caption)}</image:caption>` : null,
    `    </image:image>`,
  ]
    .filter(Boolean)
    .join("\n");
}

function hreflangLinks(path: string) {
  // Server HTML is English on every URL (the ?lang= switcher is client-side
  // UI only), so we no longer advertise ?lang= alternates. Emitting them made
  // Google crawl a duplicate parameterised copy of every page.
  return [
    `    <xhtml:link rel="alternate" hreflang="${DEFAULT_LOCALE}" href="${BASE_URL}${path}" />`,
    `    <xhtml:link rel="alternate" hreflang="x-default" href="${BASE_URL}${path}" />`,
  ].join("\n");
}

/**
 * Sitemap caching. The URL set only changes when compounds/goals/help
 * articles change, so regenerating (and re-querying the database) on every
 * crawler hit is pure waste. We keep the last rendered XML in module memory
 * for an hour and serve it with an ETag so repeat crawls end in a 304.
 * Emitted URLs are byte-for-byte identical to before.
 *
 * The TTL and Cache-Control are freshness-aware (see `blog-freshness.ts`):
 * while a post is newly published or revised, the sitemap is cached for
 * minutes instead of hours so new long-tail URLs reach crawlers quickly.
 */
let sitemapCache: { xml: string; etag: string; expiresAt: number; cacheControl: string } | null =
  null;

/** Small, stable, dependency-free hash (FNV-1a) for the ETag. */
function weakEtag(input: string): string {
  let hash = 0x811c9dc5;
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return `W/"sitemap-${input.length.toString(36)}-${hash.toString(36)}"`;
}

/** Serves the XML, or a 304 when the crawler already has this exact sitemap. */
function sitemapResponse(
  xml: string,
  etag: string,
  request: Request,
  cacheControl: string,
): Response {
  const headers: Record<string, string> = {
    "Content-Type": "application/xml",
    "Cache-Control": cacheControl,
    ETag: etag,
  };

  const ifNoneMatch = request.headers.get("if-none-match");
  if (ifNoneMatch && ifNoneMatch.split(",").some((tag) => tag.trim() === etag)) {
    return new Response(null, { status: 304, headers });
  }

  return new Response(xml, { headers });
}

export const Route = createFileRoute("/sitemap.xml")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const now = Date.now();
        const cached = sitemapCache && sitemapCache.expiresAt > now ? sitemapCache : null;

        if (cached) {
          return sitemapResponse(cached.xml, cached.etag, request, cached.cacheControl);
        }

        const [{ data: compounds }, pairPages, outrankArticles] = await Promise.all([
          supabase.from("compounds").select("slug").order("slug"),
          // "Can you take X with Y?" pages — one per specific compound pair rule.
          fetchPairPages().catch(() => []),
          getOutrankArticles().catch(() => []),
        ]);

        const staticEntries = [
          { path: "/", changefreq: "weekly", priority: "1.0" },

          { path: "/library", changefreq: "weekly", priority: "0.9" },
          { path: "/booty-workout", changefreq: "monthly", priority: "0.8" },
          { path: "/interaction-checker", changefreq: "monthly", priority: "0.9" },
          { path: "/interactions", changefreq: "weekly", priority: "0.9" },
          { path: "/peptide-interaction-checker", changefreq: "monthly", priority: "0.9" },
          { path: "/trt-supplement-interactions", changefreq: "monthly", priority: "0.9" },
          { path: "/reconstitution-calculator", changefreq: "monthly", priority: "0.8" },
          { path: "/peptide-calculator", changefreq: "monthly", priority: "0.8" },
          { path: "/calculator", changefreq: "monthly", priority: "0.85" },
          { path: "/calculators", changefreq: "monthly", priority: "0.85" },
          { path: "/peptide-dosage-calculator", changefreq: "monthly", priority: "0.85" },
          { path: "/peptide-reconstitution-calculator", changefreq: "monthly", priority: "0.8" },
          { path: "/trt-dosage-calculator", changefreq: "monthly", priority: "0.8" },
          { path: "/dosage-units-guide", changefreq: "monthly", priority: "0.75" },
          // Per-compound calculator landing pages (see src/lib/compound-calculators.ts).
          ...CALCULATOR_PAGES.map((p) => ({
            path: `/calculators/${p.slug}`,
            changefreq: "monthly",
            priority: "0.85",
          })),

          { path: "/compare", changefreq: "monthly", priority: "0.7" },
          { path: "/vs", changefreq: "monthly", priority: "0.8" },
          { path: "/about", changefreq: "monthly", priority: "0.5" },
          { path: "/dose-routine", changefreq: "monthly", priority: "0.7" },
          { path: "/editorial-policy", changefreq: "monthly", priority: "0.5" },
          { path: "/sources", changefreq: "monthly", priority: "0.5" },

          { path: "/status", changefreq: "weekly", priority: "0.4" },
          { path: "/privacy", changefreq: "monthly", priority: "0.3" },
          { path: "/legal", changefreq: "monthly", priority: "0.3" },
          { path: "/medical-disclaimer", changefreq: "monthly", priority: "0.3" },
          { path: "/refund-policy", changefreq: "monthly", priority: "0.3" },
          { path: "/ai-policy", changefreq: "monthly", priority: "0.3" },
          { path: "/cookies", changefreq: "monthly", priority: "0.3" },
          { path: "/install", changefreq: "monthly", priority: "0.6" },
          { path: "/closed-testing", changefreq: "weekly", priority: "0.7" },
          { path: "/data-deletion", changefreq: "monthly", priority: "0.3" },
          { path: "/vs-supplement-planner", changefreq: "monthly", priority: "0.7" },
          { path: "/help", changefreq: "weekly", priority: "0.6" },
          { path: "/manual", changefreq: "monthly", priority: "0.7" },
          { path: "/articles", changefreq: "weekly", priority: "0.8" },
          { path: "/library/compare/bpc-157-vs-tb-500", changefreq: "monthly", priority: "0.7" },
          // /library/peptide-stacks is an alias that canonicalises to the
          // muscle-growth page — only the canonical URL belongs in the sitemap.
          {
            path: "/library/peptide-stacks-for-muscle-growth",
            changefreq: "monthly",
            priority: "0.8",
          },
          // "Best app for X" roundups + /for use-case pages (AEO).
          { path: "/alternatives", changefreq: "monthly", priority: "0.85" },
          { path: "/best-medication-reminder-app", changefreq: "monthly", priority: "0.9" },
          { path: "/best-supplement-tracker-app", changefreq: "monthly", priority: "0.9" },
          { path: "/best-trt-tracking-app", changefreq: "monthly", priority: "0.9" },
          { path: "/best-peptide-tracking-app", changefreq: "monthly", priority: "0.9" },
          {
            path: "/best-app-for-tracking-peptides-supplements-hormones",
            changefreq: "monthly",
            priority: "0.9",
          },
          { path: "/best-hormone-therapy-app-for-men", changefreq: "monthly", priority: "0.9" },
          { path: "/best-hrt-tracking-app-for-women", changefreq: "monthly", priority: "0.9" },

          { path: "/best-biohacking-tracker-app", changefreq: "monthly", priority: "0.9" },
          { path: "/best-health-stack-insights-app", changefreq: "monthly", priority: "0.9" },
          { path: "/best-glp-1-tracking-app", changefreq: "monthly", priority: "0.9" },
          { path: "/for", changefreq: "monthly", priority: "0.8" },
          { path: "/for/trt", changefreq: "monthly", priority: "0.85" },
          { path: "/for/peptides", changefreq: "monthly", priority: "0.85" },
          { path: "/for/glp-1", changefreq: "monthly", priority: "0.85" },
          { path: "/for/biohackers", changefreq: "monthly", priority: "0.85" },
          { path: "/vs/medisafe", changefreq: "monthly", priority: "0.8" },
          { path: "/vs/mytherapy", changefreq: "monthly", priority: "0.8" },
          { path: "/vs/cronometer", changefreq: "monthly", priority: "0.8" },
          { path: "/vs/round-health", changefreq: "monthly", priority: "0.8" },
          { path: "/vs/pill-reminder", changefreq: "monthly", priority: "0.8" },
          { path: "/best-dose-tracking-apps", changefreq: "monthly", priority: "0.9" },
          { path: "/vs/peptide-tracker", changefreq: "monthly", priority: "0.85" },
          { path: "/vs/optipin", changefreq: "monthly", priority: "0.8" },
          { path: "/vs/bearable", changefreq: "monthly", priority: "0.8" },
          { path: "/vs/dosecast", changefreq: "monthly", priority: "0.8" },
          { path: "/vs/myfitnesspal", changefreq: "monthly", priority: "0.8" },
          { path: "/vs/spreadsheet", changefreq: "monthly", priority: "0.8" },
          { path: "/peptides", changefreq: "monthly", priority: "0.9" },
          { path: "/peptides/bpc-157", changefreq: "monthly", priority: "0.9" },
          { path: "/peptides/tb-500", changefreq: "monthly", priority: "0.9" },
          { path: "/peptides/semax", changefreq: "monthly", priority: "0.85" },
          { path: "/peptides/bacteriostatic-water", changefreq: "monthly", priority: "0.9" },
          {
            path: "/peptides/how-to-reconstitute-peptides",
            changefreq: "monthly",
            priority: "0.9",
          },
          { path: "/peptides/peptide-dosage-chart", changefreq: "monthly", priority: "0.85" },
          { path: "/peptides/cjc-1295-ipamorelin", changefreq: "monthly", priority: "0.85" },
          { path: "/peptides/retatrutide-dosing", changefreq: "monthly", priority: "0.85" },
          { path: "/peptides-calculator", changefreq: "monthly", priority: "0.9" },
          { path: "/peptides/collagen-peptides", changefreq: "monthly", priority: "0.85" },
          { path: "/peptides/peptide-bond", changefreq: "monthly", priority: "0.8" },
          {
            path: "/peptides/cell-penetrating-peptides",
            changefreq: "monthly",
            priority: "0.8",
          },
          {
            path: "/peptides/how-to-vet-a-peptide-supplier",
            changefreq: "monthly",
            priority: "0.8",
          },

          {
            path: "/library/compare/semaglutide-vs-tirzepatide",
            changefreq: "monthly",
            priority: "0.8",
          },
          { path: "/faq", changefreq: "weekly", priority: "0.8" },
          // /auth, /onboarding, /reset-password intentionally excluded
          // (private/non-indexable — they set robots: noindex).
          // /p/$token (private share links) is intentionally excluded: the
          // route sets robots "noindex, nofollow" and each token is a
          // per-user secret, so it must never be advertised for crawling.
          // /body-metrics and /chat live under _authenticated and must
          // never appear in the sitemap.

          { path: "/library/mens-health", changefreq: "weekly", priority: "0.9" },
          { path: "/library/prostate-health", changefreq: "weekly", priority: "0.85" },
          { path: "/library/testosterone-support", changefreq: "weekly", priority: "0.85" },
          {
            path: "/library/compare/saw-palmetto-vs-beta-sitosterol",
            changefreq: "monthly",
            priority: "0.8",
          },
          {
            path: "/library/compare/tongkat-ali-vs-fadogia-agrestis",
            changefreq: "monthly",
            priority: "0.8",
          },
          {
            path: "/library/compare/ashwagandha-vs-tongkat-ali",
            changefreq: "monthly",
            priority: "0.8",
          },
          { path: "/library/guides/bph-natural-support", changefreq: "monthly", priority: "0.8" },
          {
            path: "/library/guides/low-testosterone-symptoms",
            changefreq: "monthly",
            priority: "0.8",
          },
          {
            path: "/library/guides/erectile-dysfunction-supplements",
            changefreq: "monthly",
            priority: "0.8",
          },
          { path: "/library/guides/hexarelin-protocol", changefreq: "monthly", priority: "0.8" },
          {
            path: "/library/guides/glp1-dopamine-and-relationships",
            changefreq: "monthly",
            priority: "0.8",
          },
          { path: "/library/retatrutide-dosage", changefreq: "monthly", priority: "0.8" },
          { path: "/library/cjc-1295-ipamorelin", changefreq: "monthly", priority: "0.8" },
          // /blog plus each paginated page at the default page size. Other
          // pageSize / sort values canonicalize back to these URLs, so they
          // are deliberately not listed as separate entries.
          ...blogListSitemapPaths(BLOG_POSTS_NEWEST_FIRST.length).map((path, i) => ({
            path,
            lastmod: BLOG_LAST_UPDATED,
            changefreq: "weekly" as const,
            priority: i === 0 ? "0.9" : "0.6",
          })),
          // Every published post, derived from BLOG_POSTS so new posts are
          // always discoverable without editing this file. Each carries its
          // hero / per-post social card as an <image:image> child so Google
          // Images can discover it (the generic site-wide fallback card is
          // deliberately skipped — it is not unique to the post).
          ...BLOG_POSTS_NEWEST_FIRST.map((post) => {
            const image = blogPostImageUrl(post.slug, post.featuredImage);
            // Crawl hints decay with the post's own updated date: newly
            // published long-tail posts advertise daily change + higher
            // priority, older posts fall back to monthly.
            const hints = blogUrlHints(post.updated);
            return {
              path: `/blog/${post.slug}`,
              lastmod: post.updated,
              changefreq: hints.changefreq,
              priority: hints.priority,

              images:
                image === BLOG_FALLBACK_IMAGE
                  ? []
                  : [
                      {
                        loc: image,
                        title: post.heading,
                        caption: post.featuredImageAlt?.trim() || post.description || post.heading,
                      },
                    ],
            };
          }),

          { path: "/blog/tag", lastmod: BLOG_LAST_UPDATED, changefreq: "weekly", priority: "0.7" },
          // One archive URL per compound / mechanism / trial-phase tag.
          ...BLOG_TAG_ARCHIVES.map((archive) => ({
            path: archive.path,
            lastmod: archive.lastmod,
            changefreq: "weekly" as const,
            priority: "0.7",
          })),

          // Women's Health
          { path: "/library/womens-health", changefreq: "weekly", priority: "0.9" },
          {
            path: "/library/womens-health/menopause-hormones",
            changefreq: "weekly",
            priority: "0.85",
          },
          { path: "/library/womens-health/longevity", changefreq: "weekly", priority: "0.85" },
          { path: "/library/womens-health/sexual-health", changefreq: "weekly", priority: "0.85" },
          {
            path: "/library/womens-health/fertility-cycle",
            changefreq: "weekly",
            priority: "0.85",
          },
          { path: "/library/womens-health/black-cohosh", changefreq: "monthly", priority: "0.8" },
          {
            path: "/library/womens-health/soy-isoflavones",
            changefreq: "monthly",
            priority: "0.8",
          },
          { path: "/library/womens-health/vitex", changefreq: "monthly", priority: "0.8" },
          {
            path: "/library/womens-health/evening-primrose-oil",
            changefreq: "monthly",
            priority: "0.8",
          },
          { path: "/library/womens-health/dhea-women", changefreq: "monthly", priority: "0.8" },
          { path: "/library/womens-health/red-clover", changefreq: "monthly", priority: "0.8" },
          { path: "/library/womens-health/maca-menopause", changefreq: "monthly", priority: "0.8" },
          { path: "/library/womens-health/estradiol-hrt", changefreq: "monthly", priority: "0.85" },
          {
            path: "/library/womens-health/progesterone-women",
            changefreq: "monthly",
            priority: "0.85",
          },
          // Women's Health — Longevity
          { path: "/library/womens-health/nmn-women", changefreq: "monthly", priority: "0.8" },
          { path: "/library/womens-health/nad-precursors", changefreq: "monthly", priority: "0.8" },
          {
            path: "/library/womens-health/collagen-peptides-women",
            changefreq: "monthly",
            priority: "0.8",
          },
          {
            path: "/library/womens-health/spermidine-women",
            changefreq: "monthly",
            priority: "0.8",
          },
          {
            path: "/library/womens-health/resveratrol-women",
            changefreq: "monthly",
            priority: "0.8",
          },
          {
            path: "/library/womens-health/magnesium-glycinate-women",
            changefreq: "monthly",
            priority: "0.8",
          },
          { path: "/library/womens-health/coq10-women", changefreq: "monthly", priority: "0.8" },
          { path: "/library/womens-health/creatine-women", changefreq: "monthly", priority: "0.8" },
          { path: "/library/womens-health/omega-3-women", changefreq: "monthly", priority: "0.8" },
          // Women's Health — Sexual Health
          {
            path: "/library/womens-health/testosterone-women",
            changefreq: "monthly",
            priority: "0.85",
          },
          { path: "/library/womens-health/maca-libido", changefreq: "monthly", priority: "0.8" },
          {
            path: "/library/womens-health/l-arginine-women",
            changefreq: "monthly",
            priority: "0.8",
          },
          { path: "/library/womens-health/tribulus-women", changefreq: "monthly", priority: "0.8" },
          {
            path: "/library/womens-health/vaginal-probiotics",
            changefreq: "monthly",
            priority: "0.8",
          },
          {
            path: "/library/womens-health/ashwagandha-women",
            changefreq: "monthly",
            priority: "0.8",
          },
          // Women's Health — Fertility & Cycle
          { path: "/library/womens-health/myo-inositol", changefreq: "monthly", priority: "0.85" },
          {
            path: "/library/womens-health/d-chiro-inositol",
            changefreq: "monthly",
            priority: "0.8",
          },
          {
            path: "/library/womens-health/coq10-fertility",
            changefreq: "monthly",
            priority: "0.8",
          },
          {
            path: "/library/womens-health/vitamin-d-fertility",
            changefreq: "monthly",
            priority: "0.8",
          },
          {
            path: "/library/womens-health/folate-vs-folic-acid",
            changefreq: "monthly",
            priority: "0.8",
          },
          { path: "/library/womens-health/iron-cycle", changefreq: "monthly", priority: "0.8" },
          { path: "/library/womens-health/b6-luteal", changefreq: "monthly", priority: "0.8" },
          {
            path: "/menopause-supplement-interaction-checker",
            changefreq: "monthly",
            priority: "0.9",
          },
        ];
        staticEntries.push({ path: "/goals", changefreq: "weekly", priority: "0.8" });
        const goalEntries = GOALS.map((g) => ({
          path: `/goals/${g.slug}`,
          changefreq: "weekly",
          priority: "0.8",
        }));
        const compoundEntries = (compounds ?? []).map((c) => ({
          path: `/library/${c.slug}`,
          changefreq: "monthly",
          priority: "0.7",
        }));
        const pairEntries = pairPages.map((p) => ({
          path: `/interactions/${p.slug}`,
          changefreq: "monthly",
          priority: "0.75",
        }));
        // Every /articles post is first-party markdown in the repo, merged
        // with published outrank.so articles from the database.
        const articleEntries = [
          ...LOCAL_ARTICLES.map((a) => ({
            path: `/articles/${a.slug}`,
            lastmod: a.modifiedAt,
            changefreq: "weekly",
            priority: "0.8",
          })),
          ...outrankArticles.map((a) => ({
            path: `/articles/${a.slug}`,
            lastmod: a.modified_at ?? a.published_at ?? a.updated_at ?? a.created_at,
            changefreq: "weekly",
            priority: "0.8",
          })),
        ];
        const helpEntries = HELP_LIST.map((h) => ({
          path: `/help/${h.slug}`,
          changefreq: "monthly",
          priority: "0.5",
        }));

        const all = [
          ...staticEntries,
          ...goalEntries,
          ...compoundEntries,
          ...pairEntries,
          ...helpEntries,
          ...articleEntries,
        ];

        const urls = all
          .map((e) => {
            // lastmod is only emitted when the entry carries a real,
            // content-derived timestamp (e.g. a post's `updated` date).
            // Never fall back to build/generation time, and never publish a
            // future date — Google discards the whole sitemap's lastmod
            // signal when it sees one (scheduled articles used to do this).
            const lastmod = safeTimestamp((e as { lastmod?: string }).lastmod);
            // Entry-supplied images win (blog posts carry their own card);
            // otherwise fall back to the branded card mapped for this path.
            const own = (e as { images?: SitemapImage[] }).images;
            const mapped = sitemapImageFor(e.path);
            const images = own?.length ? own : mapped ? [mapped] : [];
            return [
              `  <url>`,
              `    <loc>${BASE_URL}${e.path}</loc>`,
              `    <xhtml:link rel="canonical" href="${BASE_URL}${e.path}" />`,
              hreflangLinks(e.path),
              lastmod ? `    <lastmod>${lastmod}</lastmod>` : null,
              `    <changefreq>${e.changefreq}</changefreq>`,
              `    <priority>${e.priority}</priority>`,
              ...images.map(imageTag),
              `  </url>`,
            ]
              .filter(Boolean)
              .join("\n");
          })
          .join("\n");

        const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">

${urls}
</urlset>`;

        const etag = weakEtag(xml);
        const policy = sitemapCachePolicy(BLOG_POSTS_NEWEST_FIRST.map((p) => p.updated));
        sitemapCache = {
          xml,
          etag,
          expiresAt: Date.now() + policy.ttlMs,
          cacheControl: policy.cacheControl,
        };

        return sitemapResponse(xml, etag, request, policy.cacheControl);
      },
    },
  },
});
