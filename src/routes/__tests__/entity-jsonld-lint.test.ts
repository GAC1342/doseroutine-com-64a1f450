/**
 * Build-time entity lint: every Organization / Person node a page emits must
 * carry the fields Google needs to build the publisher entity and attribute
 * the content (name, logo/image, resolvable url, well-formed sameAs).
 *
 * Runs offline against each route's head() merged with the sitewide blocks
 * from __root.tsx — the exact union a crawler sees — plus the blog Article
 * schema, which is generated in a lib rather than a route file.
 */

import { describe, it, expect } from "vitest";
import { readdirSync } from "node:fs";
import { join } from "node:path";
import { findEntityIssues, formatEntityIssues } from "../../lib/entity-jsonld-lint";
import { articleSchema } from "../../lib/article-schema";
import { blogPostHead } from "../../lib/blog-seo";
import { BLOG_POSTS } from "../../lib/blog-posts";

const LINT_OPTIONS = {
  primaryOrgId: "https://doseroutine.com/#organization",
  siteOrigin: "https://doseroutine.com",
  brandNames: [
    "DoseRoutine",
    "Dose Routine",
    "DoseRoutine Editorial",
    "DoseRoutine Research & Updates",
  ],
};

type ScriptTag = { type?: string; children?: string };
type HeadResult = { scripts?: ScriptTag[] };
type RouteMod = { Route: { options: { head?: (ctx?: unknown) => HeadResult } } };

const ROUTES_DIR = join(process.cwd(), "src", "routes");

const SKIP_FILES = new Set<string>(["__root.tsx", "sitemap[.]xml.ts", "robots[.]txt.ts"]);

function isSkippableName(file: string): boolean {
  if (SKIP_FILES.has(file)) return true;
  if (!/\.tsx?$/.test(file)) return true;
  if (file.startsWith("_")) return true;
  if (file.includes("$")) return true;
  if (file.startsWith("api.")) return true;
  if (file.startsWith("lovable")) return true;
  return false;
}

function filenameToPath(file: string): string {
  const base = file.replace(/\.tsx?$/, "");
  if (base === "index") return "/";
  const p = ("/" + base.replace(/\./g, "/")).replace(/\/index$/, "");
  return p || "/";
}

function jsonLdBlocks(head: HeadResult | null): unknown[] {
  const blocks: unknown[] = [];
  for (const script of head?.scripts ?? []) {
    if (script?.type !== "application/ld+json") continue;
    const raw = typeof script.children === "string" ? script.children.trim() : "";
    if (!raw) continue;
    blocks.push(JSON.parse(raw)); // invalid JSON must fail the test loudly
  }
  return blocks;
}

async function loadHead(file: string, ctx: Record<string, unknown>): Promise<HeadResult | null> {
  const mod = (await import(/* @vite-ignore */ join(ROUTES_DIR, file))) as RouteMod;
  const head = mod.Route?.options?.head;
  if (typeof head !== "function") return null;
  try {
    return head(ctx);
  } catch {
    return null; // needs loader data — covered by the live sweep
  }
}

const ROOT_CTX = { matches: [], params: {}, loaderData: { locale: "en" } };
const ROUTE_CTX = { matches: [], params: {}, loaderData: undefined };

const FILES = readdirSync(ROUTES_DIR)
  .filter((f) => !isSkippableName(f))
  .sort();

describe("Organization / Person JSON-LD lint (routes)", () => {
  it("finds route files to lint", () => {
    expect(FILES.length).toBeGreaterThan(20);
  });

  it("__root.tsx declares a complete primary Organization", async () => {
    const head = await loadHead("__root.tsx", ROOT_CTX);
    const blocks = jsonLdBlocks(head);
    expect(blocks.length).toBeGreaterThan(0);
    const issues = findEntityIssues(blocks, LINT_OPTIONS);
    expect(formatEntityIssues(issues)).toBe("");
  });

  for (const file of FILES) {
    const routePath = filenameToPath(file);

    it(`${routePath} emits valid Organization / Person entities`, async () => {
      const rootHead = await loadHead("__root.tsx", ROOT_CTX);
      const routeHead = await loadHead(file, ROUTE_CTX);
      if (!routeHead) return;

      const issues = findEntityIssues(
        [...jsonLdBlocks(rootHead), ...jsonLdBlocks(routeHead)],
        LINT_OPTIONS,
      );

      expect(formatEntityIssues(issues), `${file} has incomplete entity structured data`).toBe(
        "",
      );
    });
  }

  it("articleSchema() produces a valid publisher / author entity", async () => {
    const schema = articleSchema({
      url: "https://doseroutine.com/library/example",
      headline: "Example",
      description: "Example description.",
      datePublished: "2026-01-01",
    });
    const rootHead = await loadHead("__root.tsx", ROOT_CTX);
    const issues = findEntityIssues([...jsonLdBlocks(rootHead), schema], LINT_OPTIONS);
    expect(formatEntityIssues(issues)).toBe("");
  });

  it("every blog post emits a valid publisher / author entity", async () => {
    const rootHead = await loadHead("__root.tsx", ROOT_CTX);
    const rootBlocks = jsonLdBlocks(rootHead);
    const failures: string[] = [];

    for (const post of BLOG_POSTS) {
      const head = blogPostHead(post) as HeadResult;
      const issues = findEntityIssues([...rootBlocks, ...jsonLdBlocks(head)], LINT_OPTIONS);
      if (issues.length) failures.push(`${post.slug}\n${formatEntityIssues(issues)}`);
    }

    expect(BLOG_POSTS.length).toBeGreaterThan(5);
    expect(failures.join("\n\n")).toBe("");
  });
});
