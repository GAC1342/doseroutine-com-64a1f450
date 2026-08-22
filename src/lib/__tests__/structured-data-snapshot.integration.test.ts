import { beforeAll, describe, expect, it } from "vitest";
import { formatShape, structuredDataShape } from "../structured-data-shape";

/**
 * Schema snapshot gate.
 *
 * Fetches the server-rendered HTML of the pages that carry our rich-result
 * markup, reduces it to a shape (node types + field names + stable identity
 * values) and compares it against a committed snapshot. Any change to the
 * intended structure — a removed publisher, a renamed type, a lost itemprop —
 * fails here and must be reviewed by updating the snapshot deliberately.
 *
 * Prose, dates and headlines are normalised out, so ordinary content edits do
 * NOT churn the snapshot.
 *
 * Base URL: SEO_BASE_URL (default http://localhost:8080).
 * Set SEO_REQUIRE_SERVER=1 in CI so an unreachable server fails the build.
 * Refresh intentionally with: npm run test:schema-snapshot -- -u
 */
const BASE_URL = (process.env["SEO_BASE_URL"] ?? "http://localhost:8080").replace(/\/+$/, "");
const REQUIRE_SERVER = process.env["SEO_REQUIRE_SERVER"] === "1";

const ROUTES = ["/", "/blog", "/for", "/library/creatine", "/articles"];

const pages = new Map<string, string>();
let fetchError: string | null = null;

beforeAll(async () => {
  try {
    for (const route of ROUTES) {
      const res = await fetch(`${BASE_URL}${route}`, {
        headers: { accept: "text/html" },
        redirect: "follow",
      });
      if (!res.ok) throw new Error(`${route} returned ${res.status}`);
      pages.set(route, await res.text());
    }
  } catch (error) {
    fetchError = error instanceof Error ? error.message : String(error);
  }
}, 60_000);

describe("structured-data schema snapshot", () => {
  it("reached the server", () => {
    if (fetchError && !REQUIRE_SERVER) {
      console.warn(`[schema-snapshot] skipped — ${fetchError}`);
      return;
    }
    expect(fetchError, "server must be reachable when SEO_REQUIRE_SERVER=1").toBeNull();
  });

  for (const route of ROUTES) {
    it(`keeps the intended schema fields on ${route}`, () => {
      const html = pages.get(route);
      if (!html) {
        expect(REQUIRE_SERVER, `no HTML captured for ${route}`).toBe(false);
        return;
      }
      const shape = structuredDataShape(html);
      expect(shape.jsonLd.length, `${route} must ship JSON-LD`).toBeGreaterThan(0);
      expect(shape.microdata.length, `${route} must ship microdata`).toBeGreaterThan(0);
      expect(formatShape(shape)).toMatchSnapshot();
    });
  }
});
