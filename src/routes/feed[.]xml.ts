import { createFileRoute } from "@tanstack/react-router";
import type {} from "@tanstack/react-start";
import { BLOG_POSTS_NEWEST_FIRST } from "@/lib/blog-posts";

/**
 * /feed.xml — RSS 2.0 feed of DoseRoutine guides, comparisons and reference
 * landing pages. Aggregators and several AI crawler pipelines use feeds for
 * freshness discovery, which is why new content gets picked up faster here
 * than by waiting for a full sitemap recrawl.
 *
 * Entries are curated and hand-dated: pubDate must reflect when the page was
 * actually published, never the build or request time.
 */

const BASE_URL = "https://doseroutine.com";

type FeedItem = {
  path: string;
  title: string;
  description: string;
  /** ISO date the page was published. */
  published: string;
};

const ITEMS: FeedItem[] = [
  {
    path: "/blog",
    title: "DoseRoutine Research & Updates",
    description: "Sourced updates on peptide, GLP-1, hormone and longevity research.",
    published: "2026-08-10",
  },
  // Blog posts are derived from BLOG_POSTS so every new post appears in the
  // feed automatically with its real publication date.
  ...BLOG_POSTS_NEWEST_FIRST.map((post) => ({
    path: `/blog/${post.slug}`,
    title: post.heading,
    description: post.description,
    published: post.published,
  })),

  {
    path: "/dose-routine",
    title: "Dose Routine and DoseRoutine are the same app",
    description: "Why our name shows up written both ways, and what the app actually does.",
    published: "2026-08-01",
  },
  {
    path: "/editorial-policy",
    title: "DoseRoutine editorial and review policy",
    description: "Sources, review cadence, AI disclosure and how we handle corrections.",
    published: "2026-08-01",
  },
  {
    path: "/library/guides/glp1-dopamine-and-relationships",
    title: "GLP-1s, dopamine and relationships",
    description: "How GLP-1 medications change reward signalling, and what people report.",
    published: "2026-07-31",
  },
  {
    path: "/library/cjc-1295-ipamorelin",
    title: "CJC-1295 with ipamorelin",
    description: "Dosing, DAC vs no-DAC, timing, reconstitution math and risks.",
    published: "2026-08-02",
  },
  {
    path: "/library/retatrutide-dosage",
    title: "Retatrutide dosage reference",
    description: "Dosing ranges, titration and cautions for retatrutide.",
    published: "2026-07-30",
  },
  {
    path: "/library/guides/hexarelin-protocol",
    title: "Hexarelin routine and benefits",
    description: "Hexarelin dosing, timing, tolerance and interaction cautions.",
    published: "2026-07-29",
  },
  {
    path: "/library/guides/erectile-dysfunction-supplements",
    title: "Supplements studied for erectile function",
    description: "What the evidence supports, and what to avoid combining.",
    published: "2026-07-28",
  },
  {
    path: "/library/guides/low-testosterone-symptoms",
    title: "Low testosterone symptoms",
    description: "Common signs, what to test, and where supplements fit.",
    published: "2026-07-28",
  },
  {
    path: "/library/guides/bph-natural-support",
    title: "Natural support for BPH",
    description: "Saw palmetto, beta-sitosterol and friends — evidence and cautions.",
    published: "2026-07-27",
  },
  {
    path: "/library/compare/semaglutide-vs-tirzepatide",
    title: "Semaglutide vs tirzepatide",
    description: "Mechanism, dosing and interaction differences side by side.",
    published: "2026-07-26",
  },
  {
    path: "/library/compare/bpc-157-vs-tb-500",
    title: "BPC-157 vs TB-500",
    description: "Two repair peptides compared on mechanism, dosing and stacking.",
    published: "2026-07-26",
  },
  {
    path: "/library/womens-health",
    title: "Women's health compound library",
    description:
      "Menopause, longevity, sexual health and fertility compounds with interaction detail.",
    published: "2026-07-25",
  },
  {
    path: "/library/mens-health",
    title: "Men's health compound library",
    description:
      "Testosterone support, prostate, libido and longevity compounds with interaction detail.",
    published: "2026-07-25",
  },
];

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function rfc822(isoDate: string): string {
  return new Date(`${isoDate}T00:00:00Z`).toUTCString();
}

export const Route = createFileRoute("/feed.xml")({
  server: {
    handlers: {
      GET: async () => {
        const sorted = [...ITEMS].sort((a, b) => (a.published < b.published ? 1 : -1));

        const items = sorted
          .map((item) =>
            [
              "    <item>",
              `      <title>${escapeXml(item.title)}</title>`,
              `      <link>${BASE_URL}${item.path}</link>`,
              `      <guid isPermaLink="true">${BASE_URL}${item.path}</guid>`,
              `      <description>${escapeXml(item.description)}</description>`,
              `      <pubDate>${rfc822(item.published)}</pubDate>`,
              "      <author>support@doseroutine.com (DoseRoutine)</author>",
              "    </item>",
            ].join("\n"),
          )
          .join("\n");

        const xml = [
          '<?xml version="1.0" encoding="UTF-8"?>',
          '<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">',
          "  <channel>",
          "    <title>DoseRoutine — supplement, peptide and TRT interaction reference</title>",
          `    <link>${BASE_URL}</link>`,
          "    <description>New guides, comparisons and compound references from DoseRoutine (Dose Routine).</description>",
          "    <language>en</language>",
          `    <copyright>© ${new Date().getFullYear()} DoseRoutine — doseroutine.com</copyright>`,
          `    <atom:link href="${BASE_URL}/feed.xml" rel="self" type="application/rss+xml" />`,
          `    <lastBuildDate>${rfc822(sorted[0].published)}</lastBuildDate>`,
          "    <image>",
          "      <title>DoseRoutine</title>",
          `      <url>${BASE_URL}/icon-512.png</url>`,
          `      <link>${BASE_URL}</link>`,
          "    </image>",
          items,
          "  </channel>",
          "</rss>",
        ].join("\n");

        return new Response(xml, {
          headers: {
            "Content-Type": "application/rss+xml; charset=utf-8",
            "Cache-Control": "public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800",
          },
        });
      },
    },
  },
});
