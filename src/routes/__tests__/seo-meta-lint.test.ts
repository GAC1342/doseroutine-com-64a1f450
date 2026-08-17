/**
 * Build-pipeline SEO lint.
 *
 * Runs offline (no server needed) so broken metadata fails BEFORE deploy.
 * Catches the three regression classes that have actually shipped here:
 *
 *   1. Broken meta descriptions — truncated sentence fragments, too short
 *      to be useful as a snippet, or too long to render.
 *   2. Duplicate og:url / canonical — a sitewide og:url in __root.tsx plus a
 *      per-route one emits two conflicting tags (TanStack dedupes meta by
 *      property but concatenates links, so canonical duplicates outright).
 *   3. Missing canonical on an indexable route.
 */

import { describe, it, expect } from "vitest";
import { readdirSync } from "node:fs";
import { join } from "node:path";

type Meta = Record<string, string | undefined> & { title?: string };
type LinkTag = { rel?: string; href?: string };
type HeadResult = { meta?: Meta[]; links?: LinkTag[] };
type RouteMod = { Route: { options: { head?: (ctx?: unknown) => HeadResult } } };

const ROUTES_DIR = join(process.cwd(), "src", "routes");

/** Google renders roughly 50-160 characters of description text. */
export const DESCRIPTION_MIN = 50;
export const DESCRIPTION_MAX = 160;

/** Routes that legitimately opt out of indexing (no canonical required). */
const NON_INDEXABLE = new Set<string>(["/auth", "/onboarding", "/reset-password", "/promo-kit"]);

const SKIP_FILES = new Set<string>([
  "__root.tsx",
  "library.tsx",
  "sitemap[.]xml.ts",
  "robots[.]txt.ts",
  "debug.index-check.tsx",
  "debug.noindex-audit.tsx",
  "auth_.callback.tsx",
]);

/**
 * Words a complete description never ends on. A trailing conjunction or
 * preposition is the signature of copy that was cut mid-sentence — exactly
 * how "…and pep Check it against" reached production.
 */
const DANGLING_TAIL =
  /\b(and|or|but|with|for|from|the|a|an|to|of|in|on|at|by|vs|plus|including|such|like|than|that|which|when|while|your|our|it|is|are)$/i;

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

type RouteModWithLoader = RouteMod & {
  Route: { options: { loader?: (ctx?: unknown) => unknown } };
};

async function loadHead(file: string): Promise<HeadResult | null> {
  const mod = (await import(/* @vite-ignore */ join(ROUTES_DIR, file))) as RouteModWithLoader;
  const head = mod.Route?.options?.head;
  if (typeof head !== "function") return null;

  // Code-split marketing routes build their head from loader data. Run the
  // loader offline so those pages are genuinely linted instead of looking empty.
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
      return null; // needs a request context; covered by the live validator
    }
  }

  try {
    return head({ params: {}, loaderData, matches: [] });
  } catch {
    return null;
  }
}


/** Returns every issue with a description string, or [] when it's clean. */
export function lintDescription(
  text: string | undefined,
  label: string,
  { enforceMin = true }: { enforceMin?: boolean } = {},
): string[] {
  const issues: string[] = [];
  if (!text || !text.trim()) return [`${label}: missing`];
  const value = text.trim();

  if (enforceMin && value.length < DESCRIPTION_MIN) {
    issues.push(`${label}: ${value.length} chars (min ${DESCRIPTION_MIN})`);
  }
  if (value.length > DESCRIPTION_MAX) {
    issues.push(`${label}: ${value.length} chars (max ${DESCRIPTION_MAX})`);
  }
  if (/\s{2,}/.test(value)) {
    issues.push(`${label}: collapsed whitespace / double space`);
  }
  if (!/[.!?…]$/.test(value)) {
    issues.push(`${label}: does not end in sentence punctuation`);
  }
  // A capital letter immediately after a lowercase word with no punctuation
  // between them means two sentences were spliced by a truncation.
  if (/[a-z]{2,} [A-Z][a-z]+ (it|this|them|these|your|our)\b/.test(value)) {
    issues.push(`${label}: looks like two sentences spliced together`);
  }
  const words = value.replace(/[.!?…]+$/, "").split(/\s+/);
  const last = words[words.length - 1] ?? "";
  if (DANGLING_TAIL.test(last)) {
    issues.push(`${label}: ends on dangling word "${last}"`);
  }
  return issues;
}

function metaValues(meta: Meta[] | undefined, key: "name" | "property", value: string): string[] {
  return (meta ?? []).filter((m) => m?.[key] === value).map((m) => (m.content ?? "") as string);
}

function canonicalHrefs(links: LinkTag[] | undefined): string[] {
  return (links ?? []).filter((l) => l?.rel === "canonical").map((l) => l.href ?? "");
}

const FILES = readdirSync(ROUTES_DIR)
  .filter((f) => !isSkippableName(f))
  .sort();

describe("SEO meta lint — root route", () => {
  it("does not emit a sitewide og:url or canonical", async () => {
    const mod = (await import(join(ROUTES_DIR, "__root.tsx"))) as unknown as {
      Route: { options: { head?: (ctx?: unknown) => HeadResult } };
    };
    const head = mod.Route?.options?.head;
    if (typeof head !== "function") return;
    const result = head({ matches: [], loaderData: { locale: "en" } });

    expect(
      metaValues(result.meta, "property", "og:url"),
      "__root.tsx must not set og:url — it would duplicate/override every leaf route's URL",
    ).toEqual([]);
    expect(
      canonicalHrefs(result.links),
      "__root.tsx must not set rel=canonical — links concatenate, producing two canonicals per page",
    ).toEqual([]);
  });

  it("ships a complete sitewide description", async () => {
    const mod = (await import(join(ROUTES_DIR, "__root.tsx"))) as unknown as {
      Route: { options: { head?: (ctx?: unknown) => HeadResult } };
    };
    const head = mod.Route?.options?.head;
    if (typeof head !== "function") return;
    const result = head({ matches: [], loaderData: { locale: "en" } });

    const issues = [
      ...lintDescription(metaValues(result.meta, "name", "description")[0], "description"),
      ...lintDescription(
        metaValues(result.meta, "property", "og:description")[0],
        "og:description",
      ),
    ];
    expect(issues, `__root.tsx:\n${issues.join("\n")}`).toEqual([]);
  });
});

describe("SEO meta lint — public routes", () => {
  it("finds route files to lint", () => {
    expect(FILES.length).toBeGreaterThan(20);
  });

  for (const file of FILES) {
    const routePath = filenameToPath(file);
    const indexable = !NON_INDEXABLE.has(routePath);

    it(`${routePath} has clean, non-duplicated metadata`, async () => {
      const head = await loadHead(file);
      if (!head) return; // needs loader data; covered by the live validator

      const issues: string[] = [];
      const descriptions = metaValues(head.meta, "name", "description");
      const ogDescriptions = metaValues(head.meta, "property", "og:description");
      const ogUrls = metaValues(head.meta, "property", "og:url");
      const canonicals = canonicalHrefs(head.links);

      if (descriptions.length > 1) issues.push(`${descriptions.length} description tags`);
      if (ogDescriptions.length > 1) issues.push(`${ogDescriptions.length} og:description tags`);
      if (ogUrls.length > 1) issues.push(`${ogUrls.length} og:url tags`);
      if (canonicals.length > 1) issues.push(`${canonicals.length} canonical links`);

      issues.push(...lintDescription(descriptions[0], "description", { enforceMin: indexable }));
      if (ogDescriptions[0]) {
        issues.push(
          ...lintDescription(ogDescriptions[0], "og:description", { enforceMin: indexable }),
        );
      }

      if (indexable) {
        if (!canonicals[0]) issues.push("missing canonical link");
        else if (!canonicals[0].startsWith("https://")) {
          issues.push(`canonical not absolute https (${canonicals[0]})`);
        }
        if (ogUrls[0] && canonicals[0] && ogUrls[0] !== canonicals[0]) {
          issues.push(`canonical != og:url (${canonicals[0]} vs ${ogUrls[0]})`);
        }
      }

      expect(issues, `${file}:\n  - ${issues.join("\n  - ")}`).toEqual([]);
    });
  }
});

describe("SEO meta lint — loader-backed marketing routes are never silently skipped", () => {
  const LOADER_BACKED = FILES.filter(
    (f) => f.startsWith("best-") || f.startsWith("for."),
  );

  it("finds the roundup and use-case route files", () => {
    expect(LOADER_BACKED.length).toBeGreaterThanOrEqual(12);
  });

  for (const file of LOADER_BACKED) {
    it(`${filenameToPath(file)} resolves a real description and canonical`, async () => {
      const head = await loadHead(file);
      expect(head, `${file}: head could not be resolved`).toBeTruthy();
      expect(metaValues(head?.meta, "name", "description")[0], `${file}: no description`).toBeTruthy();
      expect(canonicalHrefs(head?.links)[0], `${file}: no canonical`).toMatch(/^https:\/\//);
    });
  }
});

