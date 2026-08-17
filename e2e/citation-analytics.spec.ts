import { test, expect, dismissFirstRunOverlays } from "./utils";
import type { Page, Request } from "@playwright/test";

/**
 * Browser-level verification of the two citation engagement events.
 *
 * Library pages are public, so an anonymous visitor's trackEvent() lands on
 * POST /api/public/analytics. We intercept both that endpoint and the
 * Supabase REST insert (used when a session happens to exist), capture the
 * JSON body without writing anything, and assert the exact payload shape:
 * reference_number, publisher, host, section and path.
 */

type Captured = { event_name: string; properties: Record<string, unknown>; path: string };

async function stubAnalytics(page: Page): Promise<Captured[]> {
  const events: Captured[] = [];
  const capture = (req: Request) => {
    if (req.method() !== "POST") return;
    try {
      const body = req.postDataJSON() as Captured | Captured[] | undefined;
      if (Array.isArray(body)) events.push(...body);
      else if (body) events.push(body);
    } catch {
      /* ignore malformed */
    }
  };

  await page.route(/\/api\/public\/analytics/, async (route) => {
    capture(route.request());
    await route.fulfill({ status: 200, contentType: "application/json", body: "{}" });
  });
  await page.route(/\/rest\/v1\/analytics_events(\?|$)/, async (route) => {
    capture(route.request());
    await route.fulfill({ status: 201, contentType: "application/json", body: "[]" });
  });

  // Source links are target="_blank" to real publishers — never let a test
  // hit the open internet, and close any popup the click spawns.
  page.context().on("page", (p) => void p.close().catch(() => undefined));

  return events;
}

async function waitForEvent(
  events: Captured[],
  predicate: (e: Captured) => boolean,
  timeoutMs = 5_000,
): Promise<Captured> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const hit = events.find(predicate);
    if (hit) return hit;
    await new Promise((r) => setTimeout(r, 50));
  }
  throw new Error(
    `Timed out waiting for analytics event. Captured: ${JSON.stringify(
      events.map((e) => e.event_name),
    )}`,
  );
}

/**
 * Analytics handlers only exist after React hydrates, and a pre-hydration
 * click is a plain anchor activation that emits nothing. Retry the click
 * until the matching event lands.
 */
async function clickUntilEvent(
  page: Page,
  click: () => Promise<void>,
  events: Captured[],
  predicate: (e: Captured) => boolean,
): Promise<Captured> {
  const deadline = Date.now() + 20_000;
  while (Date.now() < deadline) {
    await click();
    try {
      return await waitForEvent(events, predicate, 1_500);
    } catch {
      await page.waitForTimeout(200);
    }
  }
  throw new Error(
    `No matching analytics event after retried clicks. Captured: ${JSON.stringify(
      events.map((e) => e.event_name),
    )}`,
  );
}

const PAGES = ["/library/creatine", "/library/retatrutide"] as const;

/** Reads what the visible sources list says for entry n. */
async function readSourceEntry(page: Page, n: number) {
  const li = page.locator(`li#source-${n}`).first();
  await li.waitFor({ state: "attached" });
  const ariaLabel = (await li.getAttribute("aria-label")) ?? "";
  const link = li.locator("a[href^='http']").first();
  const href = (await link.count()) > 0 ? await link.getAttribute("href") : null;
  // aria-label is "Reference n: <title>, <publisher>" — publisher is the tail.
  const publisher = ariaLabel.slice(ariaLabel.lastIndexOf(", ") + 2);
  return { publisher, href };
}

/**
 * First reference number that actually has an outbound link. Entries without a
 * resolvable URL render as plain text by design and emit nothing.
 */
async function firstLinkedSource(page: Page): Promise<number> {
  const items = page.locator("li[id^='source-']");
  await items.first().waitFor({ state: "attached" });
  const count = await items.count();
  for (let i = 0; i < count; i++) {
    const id = (await items.nth(i).getAttribute("id")) ?? "";
    const n = Number(id.replace("source-", ""));
    if (!Number.isInteger(n)) continue;
    if ((await items.nth(i).locator("a[href^='http']").count()) > 0) return n;
  }
  throw new Error("No source entry with an outbound link on this page");
}

function hostOf(url: string | null): string | null {
  if (!url) return null;
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return null;
  }
}

for (const path of PAGES) {
  test.describe(`citation analytics payloads — ${path}`, () => {
    test("citation_marker_click reports number, publisher, host, section and path", async ({
      page,
    }) => {
      const events = await stubAnalytics(page);
      await page.goto(path);
      await dismissFirstRunOverlays(page);

      const group = page.locator("span[role='group'][aria-label]").first();
      await group.waitFor({ state: "visible" });
      const section = await group.getAttribute("aria-label");
      expect(section, "marker group must carry a section label").toBeTruthy();

      const marker = group.locator("a[role='doc-noteref']").first();
      const markerLabel = (await marker.getAttribute("aria-label")) ?? "";
      const n = Number(/^Reference (\d+):/.exec(markerLabel)?.[1]);
      expect(Number.isInteger(n)).toBe(true);

      const entry = await readSourceEntry(page, n);

      const evt = await clickUntilEvent(
        page,
        () => marker.click(),
        events,
        (e) =>
          e.event_name === "citation_marker_click" &&
          (e.properties as { reference_number?: number }).reference_number === n,
      );

      expect(evt.properties).toMatchObject({
        reference_number: n,
        publisher: entry.publisher,
        host: hostOf(entry.href),
        section,
        path,
      });
      // trackEvent's own top-level path includes the hash added by the marker.
      expect(evt.path).toContain(path);
    });

    test("citation_source_open reports number, publisher, host, url and path", async ({ page }) => {
      const events = await stubAnalytics(page);
      await page.goto(path);
      await dismissFirstRunOverlays(page);

      const n = await firstLinkedSource(page);
      const li = page.locator(`li#source-${n}`).first();
      const entry = await readSourceEntry(page, n);
      expect(entry.href, `source ${n} must have an outbound link`).toBeTruthy();

      const link = li.locator("a[href^='http']").first();
      await link.scrollIntoViewIfNeeded();

      const evt = await clickUntilEvent(
        page,
        async () => {
          // Outbound source links open the citation interstitial dialog, which
          // covers the page — dismiss it before any retry click.
          const dialog = page.getByRole("dialog");
          if (
            await dialog
              .first()
              .isVisible()
              .catch(() => false)
          ) {
            await page.keyboard.press("Escape");
            await dialog
              .first()
              .waitFor({ state: "hidden", timeout: 3_000 })
              .catch(() => undefined);
          }
          await link.click();
        },
        events,
        (e) =>
          e.event_name === "citation_source_open" &&
          (e.properties as { reference_number?: number }).reference_number === n,
      );

      expect(evt.properties).toMatchObject({
        reference_number: n,
        publisher: entry.publisher,
        host: hostOf(entry.href),
        url: entry.href,
        path,
      });
      expect(typeof (evt.properties as { is_search_link: unknown }).is_search_link).toBe("boolean");
      // Source-open events carry no section — that field belongs to markers.
      expect((evt.properties as Record<string, unknown>).section).toBeUndefined();
    });
  });
}
