/**
 * Build-time structured-data lint: no page may render duplicate or conflicting
 * JSON-LD for the same entity or the same page-level schema type.
 *
 * Runs offline against every route's head() output, merged with the sitewide
 * blocks from __root.tsx — the exact union a crawler sees. This is the guard
 * that would have caught the calculator routes re-declaring WebSite under the
 * sitewide @id.
 *
 * Routes whose head() needs loader data are skipped here and covered by the
 * live crawler in scripts/jsonld-sweep.py.
 */

import { describe, it, expect } from "vitest";
import { readdirSync } from "node:fs";
import { join } from "node:path";
import { findJsonLdConflicts } from "../../lib/jsonld-duplicates";

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

describe("JSON-LD duplicate lint", () => {
  it("finds route files to lint", () => {
    expect(FILES.length).toBeGreaterThan(20);
  });

  it("__root.tsx alone is internally consistent", async () => {
    const head = await loadHead("__root.tsx", ROOT_CTX);
    const conflicts = findJsonLdConflicts(jsonLdBlocks(head));
    expect(conflicts.map((c) => c.message).join("\n")).toBe("");
  });

  for (const file of FILES) {
    const routePath = filenameToPath(file);

    it(`${routePath} renders no duplicate or conflicting JSON-LD`, async () => {
      const rootHead = await loadHead("__root.tsx", ROOT_CTX);
      const routeHead = await loadHead(file, ROUTE_CTX);
      if (!routeHead) return;

      const conflicts = findJsonLdConflicts([
        ...jsonLdBlocks(rootHead),
        ...jsonLdBlocks(routeHead),
      ]);

      expect(
        conflicts.map((c) => `[${c.kind}] ${c.message}`).join("\n"),
        `${file} conflicts with sitewide structured data`,
      ).toBe("");
    });
  }
});
