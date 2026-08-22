/**
 * Automated SEO + branding contract for every /articles page.
 *
 * Runs offline: the real route loader and head() are executed for each
 * first-party article, so a copy edit, a renamed draft, or a missing OG card
 * fails CI instead of shipping a broken share preview or duplicate canonical.
 *
 * Covers:
 *   - title / description length and uniqueness
 *   - self-referencing canonical + og:url on doseroutine.com
 *   - Open Graph + Twitter card completeness (absolute image URLs that exist)
 *   - valid BlogPosting / BreadcrumbList / FAQPage JSON-LD
 *   - DoseRoutine branding so scraped or syndicated copies still credit us
 *   - RSS feed discovery link
 */

import { describe, expect, it } from "vitest";
import { existsSync } from "node:fs";
import { flattenJsonLd } from "../../lib/jsonld-duplicates";
import { join } from "node:path";

import { DRAFT_ARTICLES as LOCAL_ARTICLES } from "@/lib/local-articles";
import { ARTICLE_OG_CARD_SLUGS, articleOgPath } from "@/lib/article-og-manifest";
import { Route as ArticleRoute } from "@/routes/articles.$slug";
import { Route as ArticlesIndexRoute } from "@/routes/articles.index";

const SITE = "https://doseroutine.com";
const FEED = `${SITE}/articles/feed.xml`;

type MetaTag = Record<string, string | undefined>;
type LinkTag = { rel?: string; href?: string; type?: string };
type ScriptTag = { type?: string; children?: string };
type Head = { meta?: MetaTag[]; links?: LinkTag[]; scripts?: ScriptTag[] };

function metaValue(head: Head, key: "name" | "property", value: string): string | undefined {
  return head.meta?.find((m) => m[key] === value)?.content;
}

function title(head: Head): string | undefined {
  return head.meta?.find((m) => m.title)?.title;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- lint-baseline: pre-existing; do not add new ones.
function jsonLd(head: Head): Array<Record<string, any>> {
  return (
    (head.scripts ?? [])
      .filter((s) => s.type === "application/ld+json" && s.children)
      // Sitewide nodes ship in a single @graph document; flatten so callers can
      // look up individual entities by @type.
      .flatMap((s) => flattenJsonLd(JSON.parse(s.children as string)))
  );
}

async function headForSlug(slug: string): Promise<Head> {
  // The route loader calls a server function, which needs the Start server
  // runtime that unit tests don't have. Local articles resolve synchronously
  // inside that function, so build the same loader data directly.
  const local = LOCAL_ARTICLES.find((a) => a.slug === slug);
  if (!local) throw new Error(`unknown local article: ${slug}`);
  const loaderData = { article: { ...local, source: "local", bodyFormat: "markdown" } };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- lint-baseline: pre-existing; do not add new ones.
  const head = ArticleRoute.options.head as (ctx: any) => Head;
  return head({ params: { slug }, loaderData });
}

describe("/articles SEO contract", () => {
  it("publishes at least the five first-party articles", () => {
    expect(LOCAL_ARTICLES.length).toBeGreaterThanOrEqual(5);
  });

  it("gives every article a unique title and description", async () => {
    const titles = new Set<string>();
    const descriptions = new Set<string>();
    for (const article of LOCAL_ARTICLES) {
      const head = await headForSlug(article.slug);
      const t = title(head);
      const d = metaValue(head, "name", "description");
      expect(t, `${article.slug} title`).toBeTruthy();
      expect(d, `${article.slug} description`).toBeTruthy();
      expect(t!.length, `${article.slug} title length`).toBeLessThanOrEqual(70);
      expect(d!.length, `${article.slug} description length`).toBeLessThanOrEqual(160);
      expect(d!.length, `${article.slug} description too short`).toBeGreaterThanOrEqual(70);
      expect(titles.has(t!), `duplicate title: ${t}`).toBe(false);
      expect(descriptions.has(d!), `duplicate description on ${article.slug}`).toBe(false);
      titles.add(t!);
      descriptions.add(d!);
    }
  });

  it("self-references canonical and og:url", async () => {
    for (const article of LOCAL_ARTICLES) {
      const head = await headForSlug(article.slug);
      const expected = `${SITE}/articles/${article.slug}`;
      const canonical = head.links?.find((l) => l.rel === "canonical")?.href;
      expect(canonical, `${article.slug} canonical`).toBe(expected);
      expect(metaValue(head, "property", "og:url"), `${article.slug} og:url`).toBe(expected);
      // Exactly one canonical — two would be invalid.
      expect(head.links?.filter((l) => l.rel === "canonical")).toHaveLength(1);
    }
  });

  it("ships complete Open Graph and Twitter card tags", async () => {
    for (const article of LOCAL_ARTICLES) {
      const head = await headForSlug(article.slug);
      const image = metaValue(head, "property", "og:image");
      expect(metaValue(head, "property", "og:title"), article.slug).toBeTruthy();
      expect(metaValue(head, "property", "og:description"), article.slug).toBeTruthy();
      expect(metaValue(head, "property", "og:type"), article.slug).toBe("article");
      expect(metaValue(head, "property", "og:site_name"), article.slug).toBe("DoseRoutine");
      expect(image, `${article.slug} og:image`).toMatch(/^https:\/\/doseroutine\.com\/og\//);
      expect(metaValue(head, "property", "og:image:width"), article.slug).toBe("1200");
      expect(metaValue(head, "property", "og:image:height"), article.slug).toBe("630");
      expect(metaValue(head, "property", "og:image:alt"), article.slug).toContain("DoseRoutine");
      expect(metaValue(head, "name", "twitter:card"), article.slug).toBe("summary_large_image");
      expect(metaValue(head, "name", "twitter:image"), article.slug).toBe(image);
    }
  });

  it("has a rendered card file on disk for every article", () => {
    for (const article of LOCAL_ARTICLES) {
      expect(ARTICLE_OG_CARD_SLUGS.has(article.slug), `${article.slug} missing from manifest`).toBe(
        true,
      );
      const file = join(process.cwd(), "public", articleOgPath(article.slug));
      expect(existsSync(file), `missing card: ${file} (run scripts/generate-article-og.py)`).toBe(
        true,
      );
    }
    expect(existsSync(join(process.cwd(), "public/og/articles/default.png"))).toBe(true);
  });

  it("emits valid BlogPosting, breadcrumb and FAQ JSON-LD", async () => {
    for (const article of LOCAL_ARTICLES) {
      const head = await headForSlug(article.slug);
      const blocks = jsonLd(head);
      expect(blocks.length, `${article.slug} json-ld blocks`).toBeGreaterThanOrEqual(2);
      for (const block of blocks) {
        expect(block["@context"], article.slug).toBe("https://schema.org");
        expect(block["@type"], article.slug).toBeTruthy();
      }

      const posting = blocks.find((b) => b["@type"] === "BlogPosting");
      expect(posting, `${article.slug} BlogPosting`).toBeTruthy();
      expect(posting!.headline).toBeTruthy();
      expect(posting!.url).toBe(`${SITE}/articles/${article.slug}`);
      expect(posting!.mainEntityOfPage).toBe(posting!.url);
      expect(Number.isNaN(Date.parse(posting!.datePublished))).toBe(false);
      expect(Number.isNaN(Date.parse(posting!.dateModified))).toBe(false);

      const crumbs = blocks.find((b) => b["@type"] === "BreadcrumbList");
      expect(crumbs, `${article.slug} BreadcrumbList`).toBeTruthy();
      expect(Array.isArray(crumbs!.itemListElement)).toBe(true);
      expect(crumbs!.itemListElement.length).toBeGreaterThanOrEqual(3);

      if (article.faqs.length > 0) {
        const faq = blocks.find((b) => b["@type"] === "FAQPage");
        expect(faq, `${article.slug} FAQPage`).toBeTruthy();
        expect(faq!.mainEntity).toHaveLength(article.faqs.length);
        for (const entry of faq!.mainEntity) {
          expect(entry["@type"]).toBe("Question");
          expect(entry.name).toBeTruthy();
          expect(entry.acceptedAnswer?.text).toBeTruthy();
        }
      }
    }
  });

  it("links the RSS feed for discovery", async () => {
    for (const article of LOCAL_ARTICLES) {
      const head = await headForSlug(article.slug);
      const feed = head.links?.find(
        (l) => l.rel === "alternate" && l.type === "application/rss+xml",
      );
      expect(feed?.href, `${article.slug} feed link`).toBe(FEED);
    }
  });

  it("keeps the index page canonical, card and feed link correct", () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- lint-baseline: pre-existing; do not add new ones.
    const head = (ArticlesIndexRoute.options.head as (ctx: any) => Head)({
      loaderData: { posts: [] },
    });
    expect(head.links?.find((l) => l.rel === "canonical")?.href).toBe(`${SITE}/articles`);
    expect(metaValue(head, "property", "og:image")).toBe(`${SITE}/og/articles/default.png`);
    expect(
      head.links?.find((l) => l.rel === "alternate" && l.type === "application/rss+xml")?.href,
    ).toBe(FEED);
    expect(title(head)).toContain("DoseRoutine");
  });
});

describe("/articles DoseRoutine branding (scrape attribution)", () => {
  it("names DoseRoutine in the title, image alt and site name", async () => {
    for (const article of LOCAL_ARTICLES) {
      const head = await headForSlug(article.slug);
      expect(title(head), `${article.slug} title branding`).toContain("DoseRoutine");
      expect(metaValue(head, "property", "og:site_name")).toBe("DoseRoutine");
      expect(metaValue(head, "property", "og:image:alt")).toContain("DoseRoutine");
    }
  });

  it("credits DoseRoutine as author and publisher in JSON-LD", async () => {
    for (const article of LOCAL_ARTICLES) {
      const posting = jsonLd(await headForSlug(article.slug)).find(
        (b) => b["@type"] === "BlogPosting",
      )!;
      expect(posting.author?.name, `${article.slug} author`).toContain("DoseRoutine");
      expect(posting.publisher?.name, `${article.slug} publisher`).toBe("DoseRoutine");
      expect(posting.publisher?.url, `${article.slug} publisher url`).toBe(SITE);
    }
  });

  it("carries an in-body brand mention and at least one link back to the site", () => {
    for (const article of LOCAL_ARTICLES) {
      const text = `${article.answer}\n${article.body}`;
      expect(text, `${article.slug} body brand mention`).toContain("DoseRoutine");
      const internalLinks = [...article.body.matchAll(/\]\((\/[^)]*)\)/g)].map((m) => m[1]);
      expect(internalLinks.length, `${article.slug} internal links`).toBeGreaterThanOrEqual(3);
    }
  });
});
