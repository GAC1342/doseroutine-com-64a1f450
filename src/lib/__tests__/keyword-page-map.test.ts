import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import {
  KEYWORD_PAGE_MAP,
  findCannibalization,
  keywordMapToCsv,
  keywordsByCluster,
  plannedPages,
  totalMappedVolume,
} from "@/lib/keyword-page-map";

const routeTree = readFileSync("src/routeTree.gen.ts", "utf8");
const localArticles = readFileSync("src/lib/local-articles.ts", "utf8");

function routeExists(path: string): boolean {
  if (path.startsWith("/articles/")) {
    const slug = path.slice("/articles/".length);
    return localArticles.includes(`"${slug}"`);
  }
  return routeTree.includes(`'${path}'`);
}

describe("keyword → page map", () => {
  it("never points one keyword at two pages", () => {
    expect(findCannibalization()).toEqual([]);
  });

  it("gives every live target an existing page", () => {
    const missing = KEYWORD_PAGE_MAP.filter(
      (r) => r.status === "live" && !routeExists(r.targetPath),
    );
    expect(missing.map((r) => `${r.primaryKeyword} → ${r.targetPath}`)).toEqual([]);
  });

  it("only marks a target planned when the page really is missing", () => {
    const alreadyBuilt = plannedPages().filter((r) => routeExists(r.targetPath));
    expect(alreadyBuilt.map((r) => r.targetPath)).toEqual([]);
  });

  it("keeps every row complete and plausible", () => {
    for (const row of KEYWORD_PAGE_MAP) {
      expect(row.primaryKeyword.trim()).not.toBe("");
      expect(row.targetPath.startsWith("/")).toBe(true);
      expect(row.volume).toBeGreaterThan(0);
      expect(row.supportingKeywords.length).toBeGreaterThan(0);
      expect(row.questions.length).toBeGreaterThan(0);
      expect(row.pageJob.length).toBeGreaterThan(20);
      if (row.difficulty !== null) {
        expect(row.difficulty).toBeGreaterThanOrEqual(0);
        expect(row.difficulty).toBeLessThanOrEqual(100);
      }
    }
  });

  it("covers every cluster and reports total demand", () => {
    expect(keywordsByCluster().length).toBeGreaterThanOrEqual(6);
    expect(totalMappedVolume()).toBeGreaterThan(5000);
  });

  it("exports CSV with one row per keyword", () => {
    const csv = keywordMapToCsv();
    expect(csv.split("\n")).toHaveLength(KEYWORD_PAGE_MAP.length + 1);
    expect(csv).toContain('"Primary keyword"');
  });
});
