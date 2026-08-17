/**
 * SEO metadata snapshots for the /best-* and /for/* marketing routes.
 *
 * These routes are code-split and build head() from loader data, so an
 * unrelated loader/copy edit can silently rewrite a title, description,
 * canonical, or og:* tag on pages that already rank. The snapshot makes any
 * such change explicit in the diff: CI fails until someone reviews it and
 * re-runs `bun run test:meta-snapshot -u` on purpose.
 *
 * Runs fully offline — each route's real loader and head() are executed here.
 */

import { describe, expect, it } from "vitest";
import { readdirSync } from "node:fs";
import { join } from "node:path";

const ROUTES_DIR = join(process.cwd(), "src", "routes");

type Meta = Record<string, string | undefined> & { title?: string };
type LinkTag = { rel?: string; href?: string };
type HeadResult = { meta?: Meta[]; links?: LinkTag[]; scripts?: { type?: string }[] };
type RouteMod = {
  Route: {
    options: {
      head?: (ctx?: unknown) => HeadResult;
      loader?: (ctx?: unknown) => unknown;
    };
  };
};

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

/** Deterministic, human-reviewable shape of a route's head output. */
function shape(head: HeadResult | null) {
  const meta = head?.meta ?? [];
  const pick = (key: "name" | "property", value: string) =>
    meta.find((m) => m?.[key] === value)?.content?.trim() ?? null;

  return {
    title: meta.find((m) => typeof m?.title === "string")?.title?.trim() ?? null,
    description: pick("name", "description"),
    robots: pick("name", "robots"),
    canonical: (head?.links ?? []).find((l) => l.rel === "canonical")?.href ?? null,
    og: {
      title: pick("property", "og:title"),
      description: pick("property", "og:description"),
      url: pick("property", "og:url"),
      type: pick("property", "og:type"),
      image: pick("property", "og:image"),
    },
    twitter: {
      card: pick("name", "twitter:card"),
      title: pick("name", "twitter:title"),
      description: pick("name", "twitter:description"),
      image: pick("name", "twitter:image"),
    },
    // Structural only: schema types, not their full payloads (those are
    // covered by the JSON-LD contract tests).
    jsonLdScripts: (head?.scripts ?? []).filter((s) => s?.type === "application/ld+json").length,
  };
}

const ROUTE_FILES = marketingRouteFiles();

describe("/best-* and /for/* SEO meta snapshots", () => {
  it("covers every marketing route file", () => {
    expect(ROUTE_FILES.length).toBeGreaterThan(5);
  });

  it("matches the recorded metadata for all marketing routes", async () => {
    const out: Record<string, ReturnType<typeof shape>> = {};
    for (const file of ROUTE_FILES) {
      out[filenameToPath(file)] = shape(await loadHead(file));
    }
    expect(out).toMatchSnapshot();
  });
});
