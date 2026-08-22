import { createFileRoute } from "@tanstack/react-router";
import type {} from "@tanstack/react-start";

import { LOCAL_ARTICLES } from "@/lib/local-articles";
import { getOutrankArticles } from "@/lib/outrank-articles.server";
import { articleOgPath } from "@/lib/article-og-manifest";
import { ARTICLES_PREFIX, SITE_URL } from "@/lib/article-config";

/**
 * /articles/feed.xml — RSS 2.0 feed for the DoseRoutine articles blog.
 *
 * Includes every first-party post (src/content/article-drafts and the
 * snapshotted src/content/cms-articles) in one subscribable stream.
 * pubDate always reflects real publication dates, never build/request time.
 */

const FEED_URL = `${SITE_URL}${ARTICLES_PREFIX}/feed.xml`;

type FeedItem = {
  url: string;
  title: string;
  description: string;
  published: string;
  image?: string;
};

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function rfc822(iso: string): string {
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? new Date(0).toUTCString() : date.toUTCString();
}

function renderItem(item: FeedItem): string {
  return [
    "    <item>",
    `      <title>${escapeXml(item.title)}</title>`,
    `      <link>${escapeXml(item.url)}</link>`,
    `      <guid isPermaLink="true">${escapeXml(item.url)}</guid>`,
    `      <pubDate>${rfc822(item.published)}</pubDate>`,
    `      <description>${escapeXml(item.description)}</description>`,
    `      <dc:creator>DoseRoutine Editorial Team</dc:creator>`,
    `      <source url="${escapeXml(FEED_URL)}">DoseRoutine Articles</source>`,
    item.image
      ? `      <enclosure url="${escapeXml(item.image)}" type="image/png" length="0" />`
      : null,
    "    </item>",
  ]
    .filter(Boolean)
    .join("\n");
}

export const Route = createFileRoute("/articles/feed.xml")({
  server: {
    handlers: {
      GET: async () => {
        const [outrankArticles] = await Promise.all([getOutrankArticles().catch(() => [])]);

        const local: FeedItem[] = LOCAL_ARTICLES.map((a) => ({
          url: `${SITE_URL}${ARTICLES_PREFIX}/${a.slug}`,
          title: a.title,
          description: a.metaDescription,
          published: a.firstPublishedAt,
          image: `${SITE_URL}${articleOgPath(a.slug)}`,
        }));

        const outrank: FeedItem[] = outrankArticles.map((a) => ({
          url: `${SITE_URL}${ARTICLES_PREFIX}/${a.slug}`,
          title: a.title,
          description: a.meta_description ?? a.answer ?? "",
          published: a.published_at ?? a.created_at ?? new Date(0).toISOString(),
          image: a.featured_image_url ?? `${SITE_URL}${articleOgPath(a.slug)}`,
        }));

        const items = [...local, ...outrank].sort(
          (a, b) => new Date(b.published).getTime() - new Date(a.published).getTime(),
        );

        const lastBuild = items[0]?.published ?? new Date(0).toISOString();

        const xml = [
          '<?xml version="1.0" encoding="UTF-8"?>',
          '<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:dc="http://purl.org/dc/elements/1.1/">',
          "  <channel>",
          "    <title>DoseRoutine Articles</title>",
          `    <link>${SITE_URL}${ARTICLES_PREFIX}</link>`,
          `    <atom:link href="${FEED_URL}" rel="self" type="application/rss+xml" />`,
          "    <description>Nutrition, training and protocol tracking guides from DoseRoutine.</description>",
          "    <language>en-us</language>",
          "    <copyright>DoseRoutine</copyright>",
          "    <managingEditor>hello@doseroutine.com (DoseRoutine Editorial Team)</managingEditor>",
          `    <lastBuildDate>${rfc822(lastBuild)}</lastBuildDate>`,
          "    <image>",
          `      <url>${SITE_URL}/og/articles/default.png</url>`,
          "      <title>DoseRoutine Articles</title>",
          `      <link>${SITE_URL}${ARTICLES_PREFIX}</link>`,
          "    </image>",
          ...items.map(renderItem),
          "  </channel>",
          "</rss>",
        ].join("\n");

        return new Response(xml, {
          headers: {
            "Content-Type": "application/rss+xml; charset=utf-8",
            "Cache-Control": "public, max-age=1800",
          },
        });
      },
    },
  },
});
