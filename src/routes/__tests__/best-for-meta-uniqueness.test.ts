/**
 * Duplicate-metadata lint for the /best-* and /for/* marketing routes.
 *
 * These pages target closely related queries, so it is easy for a copy edit
 * to leave two of them with an identical <title> or meta description. Google
 * treats near-identical titles/descriptions as duplicate-intent pages and
 * suppresses one of them, so this fails CI instead.
 *
 * Runs offline: each route's real loader + head() are executed directly, the
 * same way scripts/lint:seo does, so code-split routes are genuinely checked.
 */

import { describe, expect, it } from "vitest";
import { readdirSync } from "node:fs";
import { join } from "node:path";

const ROUTES_DIR = join(process.cwd(), "src", "routes");

type Meta = Record<string, string | undefined> & { title?: string };
type HeadResult = { meta?: Meta[] };
type RouteMod = {
  Route: {
    options: {
      head?: (ctx?: unknown) => HeadResult;
      loader?: (ctx?: unknown) => unknown;
    };
  };
};

/** best-*.tsx and for.*.tsx route files (no dynamic segments, no layouts). */
function marketingRouteFiles(): string[] {
  return readdirSync(ROUTES_DIR)
    .filter(
      (f) =>
        /\.tsx$/.test(f) &&
        !f.includes("$") &&
        !f.startsWith("_") &&
        (f.startsWith("best-") || f === "for.tsx" || f.startsWith("for.")),
    )
    .sort();
}

function filenameToPath(file: string): string {
  const base = file.replace(/\.tsx$/, "");
  return ("/" + base.replace(/\./g, "/")).replace(/\/index$/, "") || "/";
}

async function loadHead(file: string): Promise<HeadResult | null> {
  const mod = (await import(/* @vite-ignore */ join(ROUTES_DIR, file))) as RouteMod;
  const head = mod.Route?.options?.head;
  if (typeof head !== "function") return null;

  let loaderData: unknown = undefined;
  const loader = mod.Route?.options?.loader;
  if (typeof loader === "function") {
    try {
      loaderData = await loader({
        params: {},
        deps: {},
        context: {},
        location: { pathname: filenameToPath(file) },
        abortController: new AbortController(),
      });
    } catch {
      return null;
    }
  }
  try {
    return head({ params: {}, loaderData, matches: [] });
  } catch {
    return null;
  }
}

function metaValue(meta: Meta[] | undefined, key: "name" | "property", value: string) {
  return (meta ?? []).find((m) => m?.[key] === value)?.content?.trim();
}

/** Case/punctuation-insensitive key so "Best TRT app." == "Best TRT app". */
function normalize(text: string): string {
  return text
    .toLowerCase()
    .replace(/[\u2010-\u2015—–-]/g, "-")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

interface RouteMeta {
  path: string;
  title?: string;
  description?: string;
  ogTitle?: string;
  ogDescription?: string;
}

const collected: RouteMeta[] = [];

for (const file of marketingRouteFiles()) {
  const head = await loadHead(file);
  const meta = head?.meta;
  collected.push({
    path: filenameToPath(file),
    title: (meta ?? []).find((m) => typeof m?.title === "string")?.title?.trim(),
    description: metaValue(meta, "name", "description"),
    ogTitle: metaValue(meta, "property", "og:title"),
    ogDescription: metaValue(meta, "property", "og:description"),
  });
}

/** Groups of routes sharing the same normalized value. */
function duplicateGroups(field: keyof RouteMeta): string[] {
  const byValue = new Map<string, string[]>();
  for (const route of collected) {
    const raw = route[field];
    if (typeof raw !== "string" || !raw) continue;
    const key = normalize(raw);
    if (!key) continue;
    byValue.set(key, [...(byValue.get(key) ?? []), route.path]);
  }
  return [...byValue.entries()]
    .filter(([, paths]) => paths.length > 1)
    .map(([key, paths]) => `${String(field)} "${key}" shared by: ${paths.join(", ")}`)
    .sort();
}

describe("/best-* and /for/* metadata uniqueness", () => {
  it("discovers the marketing routes and their metadata", () => {
    expect(collected.length).toBeGreaterThan(5);
    expect(collected.every((r) => r.title && r.description)).toBe(true);
  });

  it("has no duplicate <title> values", () => {
    expect(duplicateGroups("title")).toEqual([]);
  });

  it("has no duplicate meta descriptions", () => {
    expect(duplicateGroups("description")).toEqual([]);
  });

  it("has no duplicate og:title values", () => {
    expect(duplicateGroups("ogTitle")).toEqual([]);
  });

  it("has no duplicate og:description values", () => {
    expect(duplicateGroups("ogDescription")).toEqual([]);
  });
});
