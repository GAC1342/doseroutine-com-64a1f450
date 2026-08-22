import { describe, expect, it } from "vitest";

import { KEYWORD_CLUSTERS, KEYWORD_PAGE_MAP } from "@/lib/keyword-page-map";
import { CONTENT_BRIEFS, briefsToCsv, pageBrief, unbriefedClusters } from "@/lib/content-briefs";
import {
  COMPARISON_PAGES,
  internalLinkPlan,
  internalLinkPlanToCsv,
  internalLinksFor,
  orphanPages,
} from "@/lib/internal-linking";

const NEW_ARTICLES = [
  "/articles/missed-dose-what-to-do",
  "/articles/multiple-daily-dose-reminders",
];

describe("content briefs", () => {
  it("covers every keyword cluster exactly once", () => {
    expect(unbriefedClusters()).toEqual([]);
    expect(CONTENT_BRIEFS).toHaveLength(KEYWORD_CLUSTERS.length);
    expect(new Set(CONTENT_BRIEFS.map((b) => b.cluster)).size).toBe(CONTENT_BRIEFS.length);
  });

  it("gives each brief an outline, FAQs and supporting terms", () => {
    for (const brief of CONTENT_BRIEFS) {
      expect(brief.outline.length, brief.cluster).toBeGreaterThanOrEqual(4);
      expect(brief.faqs.length, brief.cluster).toBeGreaterThanOrEqual(3);
      expect(brief.supportingTerms.length, brief.cluster).toBeGreaterThanOrEqual(4);
      expect(brief.wordCount[0]).toBeLessThan(brief.wordCount[1]);
      expect(brief.primaryCta.trim()).not.toBe("");
      for (const section of brief.outline) expect(section.heading.trim()).not.toBe("");
    }
  });

  it("merges row questions and keywords into the page brief", () => {
    for (const row of KEYWORD_PAGE_MAP) {
      const brief = pageBrief(row.targetPath);
      expect(brief, row.targetPath).not.toBeNull();
      for (const q of row.questions) expect(brief!.faqs).toContain(q);
      for (const k of row.supportingKeywords) expect(brief!.supportingTerms).toContain(k);
      // De-duplicated, case-insensitively.
      const lower = brief!.supportingTerms.map((t) => t.toLowerCase());
      expect(new Set(lower).size).toBe(lower.length);
    }
  });

  it("exports a CSV with one row per brief", () => {
    expect(briefsToCsv().trim().split("\n")).toHaveLength(CONTENT_BRIEFS.length + 1);
  });
});

describe("internal linking plan", () => {
  it("recommends links for every mapped page", () => {
    for (const { target, links } of internalLinkPlan()) {
      expect(links.length, target.targetPath).toBeGreaterThanOrEqual(3);
      // Never self-links, never duplicates.
      const paths = links.map((l) => l.path);
      expect(paths).not.toContain(target.targetPath);
      expect(new Set(paths).size).toBe(paths.length);
      for (const link of links) {
        expect(link.anchor.trim()).not.toBe("");
        expect(link.reason.trim()).not.toBe("");
        expect(link.path.startsWith("/")).toBe(true);
      }
    }
  });

  it("only points at live pages or known evergreen destinations", () => {
    const live = new Set(
      KEYWORD_PAGE_MAP.filter((r) => r.status === "live").map((r) => r.targetPath),
    );
    const evergreen = new Set([
      "/faq",
      "/adherence",
      "/interaction-checker",
      "/doctor-report",
      "/install",
      ...COMPARISON_PAGES.map((c) => c.path),
    ]);
    for (const { links } of internalLinkPlan()) {
      for (const link of links) {
        expect(live.has(link.path) || evergreen.has(link.path), link.path).toBe(true);
      }
    }
  });

  it("leaves no live page orphaned in the plan", () => {
    expect(orphanPages()).toEqual([]);
  });

  it("is deterministic", () => {
    expect(internalLinksFor(NEW_ARTICLES[0])).toEqual(internalLinksFor(NEW_ARTICLES[0]));
    expect(internalLinkPlanToCsv()).toBe(internalLinkPlanToCsv());
  });

  it("gives both new articles a related-pages module with a comparison and the FAQ hub", () => {
    for (const path of NEW_ARTICLES) {
      const links = internalLinksFor(path);
      expect(links.length, path).toBeGreaterThanOrEqual(4);
      expect(
        links.some((l) => l.kind === "comparison"),
        path,
      ).toBe(true);
      expect(
        links.some((l) => l.path === "/faq"),
        path,
      ).toBe(true);
      expect(
        links.some((l) => l.kind === "hub"),
        path,
      ).toBe(true);
    }
  });
});
