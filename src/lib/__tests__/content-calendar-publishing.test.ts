import { describe, expect, it } from "vitest";
import { CONTENT_CALENDAR, calendarEntry, faqSchema } from "@/lib/content-calendar";
import {
  LINK_MAP,
  PRIMARY_PILLAR,
  checkLinks,
  internalLinksIn,
  linkPlan,
} from "@/lib/article-link-map";
import { LOCAL_ARTICLES, LOCAL_ARTICLE_SLUGS } from "@/lib/local-articles";

describe("60-day content calendar", () => {
  it("has 60 entries with unique kebab-case slugs", () => {
    expect(CONTENT_CALENDAR).toHaveLength(60);
    const slugs = CONTENT_CALENDAR.map((e) => e.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
    for (const s of slugs) expect(s).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
  });

  it("gives every entry an SEO title, description and FAQ block", () => {
    for (const e of CONTENT_CALENDAR) {
      expect(e.metaTitle.length).toBeGreaterThan(15);
      expect(e.metaTitle.length).toBeLessThanOrEqual(60);
      expect(e.metaDescription.length).toBeGreaterThanOrEqual(70);
      expect(e.metaDescription.length).toBeLessThanOrEqual(158);
      expect(e.faqs.length).toBeGreaterThanOrEqual(3);
      for (const f of e.faqs) {
        expect(f.question.trim()).not.toBe("");
        expect(f.answer.length).toBeGreaterThan(40);
      }
    }
  });

  it("emits valid FAQPage JSON-LD", () => {
    const schema = faqSchema(CONTENT_CALENDAR[0]) as {
      "@type": string;
      mainEntity: { "@type": string; acceptedAnswer: { "@type": string } }[];
    };
    expect(schema["@type"]).toBe("FAQPage");
    expect(schema.mainEntity[0]["@type"]).toBe("Question");
    expect(schema.mainEntity[0].acceptedAnswer["@type"]).toBe("Answer");
  });

  it("runs consecutive days from 2026-08-19", () => {
    expect(CONTENT_CALENDAR[0].publishDate).toBe("2026-08-19");
    CONTENT_CALENDAR.forEach((e, i) => expect(e.day).toBe(i + 1));
  });
});

describe("internal linking map", () => {
  it("plans a pillar for every calendar entry and never self-links", () => {
    expect(LINK_MAP).toHaveLength(CONTENT_CALENDAR.length);
    for (const p of LINK_MAP) expect(p.pillar).not.toBe(p.path);
  });

  it("requires roundups to point at the primary pillar", () => {
    const plan = linkPlan("best-pill-reminder-apps-for-seniors");
    expect(plan?.requiresPrimaryPillar).toBe(true);
    expect(plan?.pillar).toBe(PRIMARY_PILLAR);
  });

  it("extracts internal links from markdown", () => {
    expect(internalLinksIn("see [x](/articles/a) and [y](https://ext.com)")).toEqual([
      "/articles/a",
    ]);
  });

  it("flags a roundup that omits the pillar", () => {
    const violations = checkLinks(
      "best-free-medication-reminder-apps",
      "[a](/manual) [b](/calculator) [c](/library)",
      LOCAL_ARTICLE_SLUGS,
    );
    expect(violations.map((v) => v.rule)).toContain("pillar-link");
  });
});

describe("published week 1 posts", () => {
  const week1 = CONTENT_CALENDAR.slice(0, 7).map((e) => e.slug);

  it("are all live on /articles", () => {
    for (const slug of week1) expect(LOCAL_ARTICLE_SLUGS).toContain(slug);
  });

  it("satisfy the internal linking rules", () => {
    for (const slug of week1) {
      const a = LOCAL_ARTICLES.find((x) => x.slug === slug)!;
      const md = `${a.answer}\n${a.body}\n${a.faqs.map((f) => f.answer).join("\n")}`;
      expect(checkLinks(slug, md, LOCAL_ARTICLE_SLUGS)).toEqual([]);
    }
  });

  it("carry at least three FAQs and a speakable answer", () => {
    for (const slug of week1) {
      const a = LOCAL_ARTICLES.find((x) => x.slug === slug)!;
      expect(a.faqs.length).toBeGreaterThanOrEqual(3);
      expect(a.answer.length).toBeGreaterThan(120);
      expect(calendarEntry(slug)).not.toBeNull();
    }
  });
});
