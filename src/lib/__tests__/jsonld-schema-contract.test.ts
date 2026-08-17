/**
 * CI contract: structured data on the homepage and every blog post must stay
 * valid for Google Rich Results and AI answer engines.
 *
 * Runs in the normal test suite (and .github/workflows/jsonld-contract.yml)
 * so a broken schema fails before deploy — the live-crawl equivalent is
 * scripts/validate-schema-sitemap.py.
 */
import { describe, expect, it } from "vitest";
import { homeAppSchema, homeFaqSchema, HOME_FAQ_KEYS } from "@/lib/home-jsonld";
import { TRUST_FAQ } from "@/lib/trust-faq";
import { BLOG_POSTS } from "@/lib/blog-posts";
import { blogPostHead } from "@/lib/blog-seo";
import {
  findByType,
  flattenJsonLd,
  validateJsonLd,
  validateJsonLdString,
} from "@/lib/jsonld-validate";

/** Deterministic stand-in for the i18n lookup used on the homepage. */
const t = (key: string) => `homepage copy for ${key}`;

describe("homepage JSON-LD", () => {
  it("emits a valid SoftwareApplication node", () => {
    expect(validateJsonLd(homeAppSchema(), ["SoftwareApplication"])).toEqual([]);
  });

  it("emits a valid FAQPage with every configured question answered", () => {
    const faq = homeFaqSchema(t);
    expect(validateJsonLd(faq, ["FAQPage"])).toEqual([]);
    expect(faq.mainEntity).toHaveLength(HOME_FAQ_KEYS.length + TRUST_FAQ.length);
  });

  it("survives serialization the way the route renders it", () => {
    for (const schema of [homeAppSchema(), homeFaqSchema(t)]) {
      expect(validateJsonLdString(JSON.stringify(schema))).toEqual([]);
    }
  });

  it("never ships an untranslated or empty FAQ answer", () => {
    const faq = homeFaqSchema((key) => (key.startsWith("faqA") ? "" : key));
    expect(validateJsonLd(faq).length).toBeGreaterThan(0);
  });
});

describe("blog post JSON-LD", () => {
  const posts = BLOG_POSTS;

  it("has posts to validate", () => {
    expect(posts.length).toBeGreaterThan(0);
  });

  for (const post of posts) {
    it(`${post.slug} emits valid BlogPosting + BreadcrumbList (+ FAQPage when present)`, () => {
      const head = blogPostHead(post);
      const scripts = (head.scripts ?? []).filter((s) => s.type === "application/ld+json");
      expect(scripts.length).toBeGreaterThan(0);

      const nodes = scripts.flatMap((s) => {
        const raw = String(s.children);
        expect(validateJsonLdString(raw)).toEqual([]);
        return flattenJsonLd(JSON.parse(raw));
      });

      expect(findByType(nodes, "BlogPosting")).toHaveLength(1);
      expect(findByType(nodes, "BreadcrumbList")).toHaveLength(1);

      const faqNodes = findByType(nodes, "FAQPage");
      const expectedFaq = (post.faqs ?? []).length > 0 ? 1 : 0;
      expect(faqNodes).toHaveLength(expectedFaq);
      if (expectedFaq) {
        expect((faqNodes[0].mainEntity as unknown[]).length).toBe(post.faqs.length);
      }

      // Canonical self-reference: the BlogPosting url must match the crumb tail.
      const article = findByType(nodes, "BlogPosting")[0];
      const crumbs = findByType(nodes, "BreadcrumbList")[0].itemListElement as Array<
        Record<string, unknown>
      >;
      expect(crumbs[crumbs.length - 1].item).toBe(article.url);
    });
  }
});

describe("validator guardrails", () => {
  it("flags a FAQPage with no questions", () => {
    expect(validateJsonLd({ "@type": "FAQPage", mainEntity: [] }, ["FAQPage"])).toContain(
      "FAQPage has no mainEntity",
    );
  });

  it("flags out-of-order breadcrumb positions", () => {
    const issues = validateJsonLd({
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 2, name: "Home", item: "https://x.test/" },
      ],
    });
    expect(issues.some((i) => i.includes("position"))).toBe(true);
  });

  it("flags a malformed JSON-LD string", () => {
    expect(validateJsonLdString("{not json")[0]).toMatch(/parse error/);
  });
});
