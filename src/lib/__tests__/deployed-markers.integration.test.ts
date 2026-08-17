import { beforeAll, describe, expect, it } from "vitest";
import {
  DEFAULT_DEPLOY_BASE_URL,
  FALLBACK_COMPOUND_PATHS,
  FORBIDDEN_MARKERS,
  PROBE_CONCURRENCY,
  REQUIRED_MARKERS,
  auditMarkers,
} from "../deployed-markers";
import {
  discoverCompoundPaths,
  fetchTextDecompressed,
  filterCompoundPaths,
  mapWithConcurrency,
  parseSitemapLocs,
} from "../../../scripts/lib/sitemap-paths.mjs";

/**
 * Integration test: discovers EVERY compound URL from the deployed sitemap and
 * verifies the server-rendered HTML of each one carries the required UI markers
 * and none of the retired ones.
 *
 * This is the check that answers "did my changes actually ship?" — it reads the
 * live HTML rather than the source, so a stale build or a CDN serving old bytes
 * fails here.
 *
 * Base URL: DEPLOY_BASE_URL (default https://doseroutine.com).
 * Set DEPLOY_REQUIRE_SERVER=1 in CI to turn an unreachable site into a failure.
 * Set MARKER_MAX_PAGES=N to cap the probe to the first N pages.
 */
const BASE_URL = (process.env["DEPLOY_BASE_URL"] ?? DEFAULT_DEPLOY_BASE_URL).replace(/\/+$/, "");
const REQUIRE_SERVER = process.env["DEPLOY_REQUIRE_SERVER"] === "1";
const MAX_PAGES = Number(process.env["MARKER_MAX_PAGES"] ?? 0) || 0;

interface PageFailure {
  path: string;
  reasons: string[];
}

let discovery: { paths: string[]; source: string; reason: string } = {
  paths: [...FALLBACK_COMPOUND_PATHS],
  source: "fallback",
  reason: "not run",
};
let probed = 0;
const unreachable: PageFailure[] = [];
const badResponses: PageFailure[] = [];
const markerFailures: PageFailure[] = [];

beforeAll(async () => {
  if (BASE_URL.startsWith("about:")) return;

  discovery = await discoverCompoundPaths(BASE_URL);
  const paths = MAX_PAGES > 0 ? discovery.paths.slice(0, MAX_PAGES) : discovery.paths;

  await mapWithConcurrency(paths, PROBE_CONCURRENCY, async (path: string) => {
    let page: { status: number; contentType: string; text: string };
    try {
      page = await fetchTextDecompressed(`${BASE_URL}${path}`);
    } catch (err) {
      unreachable.push({ path, reasons: [err instanceof Error ? err.message : String(err)] });
      return;
    }

    probed++;

    const reasons: string[] = [];
    if (page.status !== 200) reasons.push(`HTTP ${page.status}`);
    if (!/text\/html/i.test(page.contentType))
      reasons.push(`content-type ${page.contentType || "(none)"}`);
    if (page.text.length <= 1000) reasons.push(`body only ${page.text.length} bytes`);
    if (reasons.length > 0) {
      badResponses.push({ path, reasons });
      return;
    }

    const { missing, forbidden } = auditMarkers(page.text);
    if (missing.length || forbidden.length) {
      markerFailures.push({
        path,
        reasons: [
          ...missing.map((l) => `missing: ${l}`),
          ...forbidden.map((l) => `still present: ${l}`),
        ],
      });
    }
  });
}, 600_000);

function report(failures: PageFailure[]): string {
  return failures
    .slice()
    .sort((a, b) => a.path.localeCompare(b.path))
    .map((f) => `${f.path} → ${f.reasons.join("; ")}`)
    .join("\n");
}

function siteReachable(): boolean {
  if (probed > 0) return true;
  if (REQUIRE_SERVER) {
    throw new Error(
      `no compound page on ${BASE_URL} was reachable (${discovery.reason})` +
        (unreachable.length ? `\n${report(unreachable)}` : ""),
    );
  }
  return false;
}

describe(`deployed compound pages at ${BASE_URL}`, () => {
  it("has a marker contract to check", () => {
    expect(REQUIRED_MARKERS.length).toBeGreaterThan(0);
    expect(FORBIDDEN_MARKERS.length).toBeGreaterThan(0);
    expect(FALLBACK_COMPOUND_PATHS.length).toBeGreaterThan(0);
  });

  it("discovers the compound URL set from the deployed sitemap", () => {
    if (!siteReachable()) return;
    if (REQUIRE_SERVER) {
      expect(discovery.source, `sitemap discovery failed: ${discovery.reason}`).toBe("sitemap");
    }
    expect(discovery.paths.length).toBeGreaterThanOrEqual(FALLBACK_COMPOUND_PATHS.length);
  });

  it("reaches every discovered compound page", () => {
    if (!siteReachable()) return;
    expect(unreachable, `unreachable pages:\n${report(unreachable)}`).toEqual([]);
  });

  it("serves 200 HTML for every discovered compound page", () => {
    if (!siteReachable()) return;
    expect(badResponses, `bad responses:\n${report(badResponses)}`).toEqual([]);
  });

  it("server-renders every required marker and no retired marker on every page", () => {
    if (!siteReachable()) return;
    expect(
      markerFailures,
      `${markerFailures.length}/${probed} pages failed the marker contract:\n${report(markerFailures)}`,
    ).toEqual([]);
  });
});

describe("sitemap discovery", () => {
  it("keeps only single-segment compound library URLs", () => {
    const paths = filterCompoundPaths(
      parseSitemapLocs(`
        <urlset>
          <url><loc>https://doseroutine.com/library/retatrutide</loc></url>
          <url><loc>https://doseroutine.com/library/creatine/</loc></url>
          <url><loc>https://doseroutine.com/library/guides/hexarelin-protocol</loc></url>
          <url><loc>https://doseroutine.com/library/womens-health/vitex</loc></url>
          <url><loc>https://doseroutine.com/library/mens-health</loc></url>
          <url><loc>https://doseroutine.com/blog/foo</loc></url>
        </urlset>`),
    );
    expect(paths).toEqual(["/library/creatine", "/library/retatrutide"]);
  });
});

describe("auditMarkers", () => {
  it("flags an empty document as missing everything", () => {
    const { missing, forbidden } = auditMarkers("<html></html>");
    expect(missing).toHaveLength(REQUIRED_MARKERS.length);
    expect(forbidden).toEqual([]);
  });

  it("flags retired markers when present", () => {
    const { forbidden } = auditMarkers('<meta name="tdm-reservation" content="1">');
    expect(forbidden).toContain("TDM reservation meta");
  });
});
