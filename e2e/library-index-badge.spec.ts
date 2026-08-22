import { test, expect, type APIRequestContext } from "@playwright/test";

/**
 * E2E: the library index-status badge must agree with the robots headers the
 * environment actually serves.
 *
 * For every /library URL listed in sitemap.xml this test:
 *   1. Fetches the URL and reads its `X-Robots-Tag` header.
 *   2. Loads the page and waits for the badge to finish its own check.
 *   3. Asserts the badge reads "Indexable" when no noindex signal is served,
 *      and "NOINDEX" when one is.
 *
 * So on any build serving indexable headers (production-equivalent), every
 * library page must report Indexable — a regression that re-adds a noindex
 * header or drops the badge fails here.
 *
 * The badge is intentionally hidden on the canonical production host, so the
 * suite skips when PLAYWRIGHT_BASE_URL points at doseroutine.com.
 *
 * Env:
 *   LIBRARY_BADGE_LIMIT  max pages to check (default 25, "0" = all)
 *   REQUIRE_INDEXABLE    "1" = fail if the environment serves any noindex header
 *                        (use before publishing to assert every library page
 *                        reads "Indexable")
 */

const LIMIT = Number(process.env.LIBRARY_BADGE_LIMIT ?? "25");
const REQUIRE_INDEXABLE = process.env.REQUIRE_INDEXABLE === "1";

function isProdHost(base: string): boolean {
  try {
    const host = new URL(base).hostname;
    return host === "doseroutine.com" || host === "www.doseroutine.com";
  } catch {
    return false;
  }
}

async function libraryPathsFromSitemap(
  request: APIRequestContext,
  base: string,
): Promise<string[]> {
  const res = await request.get(new URL("/sitemap.xml", base).toString());
  expect(res.status(), "sitemap.xml must be served").toBe(200);
  const xml = await res.text();
  const paths = Array.from(xml.matchAll(/<loc>([^<]+)<\/loc>/g))
    .map((m) => {
      try {
        return new URL(m[1].trim()).pathname;
      } catch {
        return "";
      }
    })
    .filter((p) => p === "/library" || p.startsWith("/library/"));
  const unique = Array.from(new Set(paths)).sort();
  return LIMIT > 0 ? unique.slice(0, LIMIT) : unique;
}

test.describe("library index-status badge", () => {
  // Each page is fetched, loaded and polled until its badge settles, so the
  // default 30s test timeout is far too small once more than a couple of URLs
  // are checked. Budget ~10s per page (bounded) instead of timing out midway
  // and reporting the remaining URLs as bogus "request failed" entries.
  test.setTimeout(Math.min(30 * 60_000, 60_000 + Math.max(LIMIT, 25) * 10_000));
  test("every library page's badge matches the served robots headers", async ({
    page,
    request,
    baseURL,
  }) => {
    const base = baseURL ?? "http://localhost:8080";
    // On the canonical production host the badge is hidden for real visitors,
    // so the test opts in explicitly with ?indexcheck=1. That is also the only
    // environment that serves indexable headers, i.e. where the badge must
    // read "Indexable".
    const forceParam = isProdHost(base) ? "?indexcheck=1" : "";

    const paths = await libraryPathsFromSitemap(request, base);
    expect(paths.length, "sitemap.xml must list at least one /library URL").toBeGreaterThan(0);

    const failures: string[] = [];

    for (const path of paths) {
      const url = new URL(path + forceParam, base).toString();

      // Redirects are followed (e.g. trailing-slash normalisation); the final
      // response is what search engines see.
      const res = await request.get(url).catch(() => null);
      if (!res || res.status() !== 200) {
        failures.push(`${path}: expected HTTP 200, got ${res ? res.status() : "request failed"}`);
        continue;
      }
      const headerRobots = res.headers()["x-robots-tag"] ?? "";
      const headerNoindex = headerRobots.toLowerCase().includes("noindex");

      if (REQUIRE_INDEXABLE && headerNoindex) {
        failures.push(
          `${path}: REQUIRE_INDEXABLE is set but server sent X-Robots-Tag: ${headerRobots}`,
        );
        continue;
      }

      await page.goto(url, { waitUntil: "domcontentloaded" });

      // The badge mounts after hydration, then runs its own HEAD check.
      const badge = page.getByTestId("index-status-badge").first();
      try {
        await badge.waitFor({ state: "visible", timeout: 15_000 });
      } catch {
        failures.push(`${path}: index-status badge never rendered in the library shell`);
        continue;
      }
      await expect
        .poll(async () => badge.getAttribute("data-status"), { timeout: 15_000 })
        .not.toBe("checking");

      const status = await badge.getAttribute("data-status");
      const detail = (await badge.getAttribute("data-detail")) ?? "";
      const text = ((await badge.textContent()) ?? "").trim();

      if (headerNoindex) {
        // Environment serves noindex (preview/dev): the badge must say so.
        if (status !== "noindex" || !/NOINDEX/i.test(text)) {
          failures.push(
            `${path}: server sent "${headerRobots}" but badge read "${text}" (${status})`,
          );
        }
        continue;
      }

      // noindex headers are off -> the badge must read "Indexable".
      if (status !== "indexable" || !/Indexable/i.test(text)) {
        failures.push(
          `${path}: no noindex header served but badge read "${text}" (${status}; ${detail})`,
        );
      }
    }

    expect(failures, `Index badge mismatches:\n${failures.join("\n")}`).toEqual([]);
  });
});
