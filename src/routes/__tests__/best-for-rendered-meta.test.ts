/**
 * Rendered-vs-loader metadata parity for the /best-* and /for/* marketing
 * routes.
 *
 * These routes are code-split and build their head() from loader data, so a
 * loader change can silently stop reaching the served HTML. This test runs
 * each route's real loader + head() offline to get the EXPECTED title and
 * meta description, then fetches the server-rendered HTML for the same path
 * and asserts the rendered tags match exactly.
 *
 * Base URL: RENDERED_META_BASE_URL (default http://localhost:8080).
 * Set RENDERED_META_REQUIRE_SERVER=1 in CI to turn an unreachable server into
 * a failure instead of a skip.
 */

import { beforeAll, describe, expect, it } from "vitest";
import { readdirSync } from "node:fs";
import { join } from "node:path";

const ROUTES_DIR = join(process.cwd(), "src", "routes");
const BASE_URL = (process.env["RENDERED_META_BASE_URL"] ?? "http://localhost:8080").replace(
  /\/+$/,
  "",
);
const REQUIRE_SERVER = process.env["RENDERED_META_REQUIRE_SERVER"] === "1";

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

/** best-*.tsx and for.*.tsx, excluding dynamic and layout files. */
function marketingRouteFiles(): string[] {
  return readdirSync(ROUTES_DIR)
    .filter((f) => /\.tsx?$/.test(f))
    .filter((f) => !f.includes("$") && !f.startsWith("_"))
    .filter((f) => f.startsWith("best-") || f.startsWith("for."))
    .sort();
}

function filenameToPath(file: string): string {
  const base = file.replace(/\.tsx?$/, "");
  const p = ("/" + base.replace(/\./g, "/")).replace(/\/index$/, "");
  return p || "/";
}

function decodeEntities(value: string): string {
  return value
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#x27;/g, "'")
    .replace(/&nbsp;/g, "\u00a0")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();
}

function renderedTitle(html: string): string | null {
  const m = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  return m ? decodeEntities(m[1]) : null;
}

function renderedDescription(html: string): string | null {
  const tags = html.match(/<meta\b[^>]*>/gi) ?? [];
  for (const tag of tags) {
    if (!/\bname\s*=\s*["']description["']/i.test(tag)) continue;
    const content = tag.match(/\bcontent\s*=\s*["']([\s\S]*?)["']/i);
    if (content) return decodeEntities(content[1]);
  }
  return null;
}

/** Count of description meta tags, to catch duplicate/conflicting emissions. */
function descriptionTagCount(html: string): number {
  return (html.match(/<meta\b[^>]*\bname\s*=\s*["']description["'][^>]*>/gi) ?? []).length;
}

async function expectedMeta(file: string): Promise<{ title?: string; description?: string }> {
  const mod = (await import(/* @vite-ignore */ join(ROUTES_DIR, file))) as RouteMod;
  const head = mod.Route?.options?.head;
  if (typeof head !== "function") return {};

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
      loaderData = undefined;
    }
  }

  const result = head({ params: {}, loaderData }) ?? {};
  const metas = result.meta ?? [];
  const title = metas.find((m) => typeof m.title === "string")?.title;
  const description = metas.find((m) => m["name"] === "description")?.["content"];
  return {
    title: title ? decodeEntities(title) : undefined,
    description: description ? decodeEntities(description) : undefined,
  };
}

const FILES = marketingRouteFiles();
let serverUp = false;
let serverReason = "";

beforeAll(async () => {
  try {
    const res = await fetch(`${BASE_URL}/`, { redirect: "follow" });
    serverUp = res.ok;
    serverReason = res.ok ? "" : `HTTP ${res.status}`;
  } catch (error) {
    serverUp = false;
    serverReason = error instanceof Error ? error.message : String(error);
  }
}, 30_000);

describe("/best-* and /for/* rendered metadata", () => {
  it("discovers the marketing routes", () => {
    expect(FILES.length).toBeGreaterThan(5);
  });

  it("every route produces a title and description from its loader", async () => {
    const missing: string[] = [];
    for (const file of FILES) {
      const { title, description } = await expectedMeta(file);
      if (!title || !description) missing.push(`${filenameToPath(file)} (${file})`);
    }
    expect(missing, `routes with no loader-derived title/description: ${missing.join(", ")}`).toEqual(
      [],
    );
  }, 60_000);

  it("server is reachable (or the check is explicitly optional)", () => {
    if (!serverUp && REQUIRE_SERVER) {
      throw new Error(`${BASE_URL} unreachable: ${serverReason}`);
    }
    expect(true).toBe(true);
  });

  for (const file of FILES) {
    const path = filenameToPath(file);

    it(`renders the loader title/description for ${path}`, async () => {
      if (!serverUp) {
        // Offline run: the loader/head parity above still executed.
        return;
      }

      const expected = await expectedMeta(file);
      const res = await fetch(`${BASE_URL}${path}`, { redirect: "follow" });
      expect(res.status, `${path} HTTP status`).toBe(200);
      const html = await res.text();

      expect(descriptionTagCount(html), `${path} description tag count`).toBe(1);
      expect(renderedTitle(html), `${path} rendered <title>`).toBe(expected.title);
      expect(renderedDescription(html), `${path} rendered meta description`).toBe(
        expected.description,
      );
    }, 45_000);
  }
});
