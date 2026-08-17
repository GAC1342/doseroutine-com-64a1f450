import { describe, expect, it } from "vitest";
import { BLOG_POSTS } from "@/lib/blog-posts";
import { blogPostHead } from "@/lib/blog-seo";
import { aeoFaqSchema, type AeoFaqPair } from "@/lib/aeo";
import * as AEO_FAQS from "@/lib/aeo-page-faqs";
import {
  extractFaqPageNodes,
  faqRichResultFailures,
  validateFaqPageJson,
  validateFaqPageNode,
  type FaqRichResultReport,
} from "@/lib/faqpage-rich-results";

const AEO_FAQ_SETS = Object.entries(AEO_FAQS).filter(
  (e): e is [string, AeoFaqPair[]] =>
    e[0].endsWith("_FAQ") && Array.isArray(e[1]) && e[1].every((p) => p && typeof p.q === "string"),
);

describe("FAQPage JSON-LD is Rich Results eligible", () => {
  const reports: FaqRichResultReport[] = [];

  for (const post of BLOG_POSTS) {
    const nodes = extractFaqPageNodes(blogPostHead(post) as never);
    for (const node of nodes) reports.push(validateFaqPageNode(node, `blog/${post.slug}`));
  }

  for (const [name, pairs] of AEO_FAQ_SETS) {
    reports.push(
      validateFaqPageNode(aeoFaqSchema("https://doseroutine.com/library", pairs), `aeo/${name}`),
    );
  }

  it("validates at least one FAQPage per FAQ source", () => {
    expect(reports.length).toBeGreaterThan(0);
    expect(AEO_FAQ_SETS.length).toBeGreaterThan(0);
  });

  it("has no Rich Results errors", () => {
    expect(faqRichResultFailures(reports)).toEqual([]);
  });

  it("every FAQPage carries at least one question", () => {
    expect(reports.filter((r) => r.questionCount === 0)).toEqual([]);
  });

  it("rejects schema that would fail the Rich Results Test", () => {
    const bad = validateFaqPageNode({
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: [
        { "@type": "Question", name: "", acceptedAnswer: { "@type": "Answer", text: "" } },
        { "@type": "Question", name: "Dup?", acceptedAnswer: { text: "Yes it is duplicated here." } },
        { "@type": "Question", name: "Dup?", acceptedAnswer: { "@type": "Answer", text: "Yes it is duplicated here." } },
      ],
    });
    const paths = bad.issues.map((i) => i.path);
    expect(bad.valid).toBe(false);
    expect(paths).toContain("mainEntity[0].name");
    expect(paths).toContain("mainEntity[1].acceptedAnswer.@type");
    expect(paths).toContain("mainEntity[2].name");
  });

  it("rejects unparseable JSON-LD", () => {
    expect(validateFaqPageJson("{broken").valid).toBe(false);
  });
});
