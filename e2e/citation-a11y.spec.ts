import { test, expect, type Page } from "@playwright/test";
import { dismissFirstRunOverlays } from "./utils";

/**
 * Accessibility guard for per-claim sourcing.
 *
 * Screen-reader and keyboard users reach citations through three things:
 * the marker's accessible name, the description that tells them where the
 * marker lands, and the ability to tab to it and activate it with the
 * keyboard. This spec fails when any of those regress.
 */
const PAGES = [
  "/library/creatine",
  "/library/retatrutide",
  "/library/bpc-157",
  "/interactions/ala-and-metformin",
];

const SOURCES_HEADING = /Sources and (references|how to verify this)/i;

/**
 * Markers only move focus after hydration; poll an interactive control until it
 * actually reacts, which is the cheapest reliable hydration signal.
 */
async function waitForHydration(page: Page) {
  const trigger = page.locator('[data-slot="accordion-trigger"]').first();
  if ((await trigger.count()) === 0) {
    await page.waitForTimeout(1_500);
    return;
  }
  await expect
    .poll(
      async () => {
        await trigger.click({ timeout: 1_000 }).catch(() => undefined);
        return trigger.getAttribute("aria-expanded");
      },
      { timeout: 15_000, intervals: [250, 500, 500, 1_000] },
    )
    .toBe("true");
}

async function expandEverything(page: Page) {
  const triggers = page.locator('[data-slot="accordion-trigger"], button[aria-expanded="false"]');
  const count = await triggers.count();
  for (let i = 0; i < count; i++) {
    await triggers
      .nth(i)
      .click({ timeout: 2_000 })
      .catch(() => undefined);
  }
}

for (const path of PAGES) {
  test(`citation markers are announced, focusable and keyboard-operable on ${path}`, async ({
    page,
  }) => {
    const response = await page.goto(path);
    if (!response || response.status() >= 400) {
      test.skip(true, `${path} is not available (${response?.status()})`);
    }
    await dismissFirstRunOverlays(page);
    await page.goto(path);

    if ((await page.getByRole("heading", { name: SOURCES_HEADING }).count()) === 0) {
      test.skip(true, "page has no resolvable sources");
    }

    await waitForHydration(page);
    await expandEverything(page);

    // --- 1. Source targets: programmatically focusable, never in the tab order,
    //        and each announces its own reference number.
    const entries = page.locator('li[id^="source-"]');
    const entryCount = await entries.count();
    expect(entryCount, "expected at least one source entry").toBeGreaterThan(0);

    for (let i = 0; i < entryCount; i++) {
      const entry = entries.nth(i);
      const n = i + 1;
      await expect(entry, `#source-${n} must not sit in the natural tab order`).toHaveAttribute(
        "tabindex",
        "-1",
      );
      await expect(entry, `#source-${n} is missing an accessible name`).toHaveAttribute(
        "aria-label",
        new RegExp(`^Reference ${n}: .+`),
      );
      // -1 still has to be reachable programmatically, which is what the
      // marker's focus handoff relies on.
      const focusable = await entry.evaluate((el) => {
        (el as HTMLElement).focus();
        return el === document.activeElement;
      });
      expect(focusable, `#source-${n} cannot receive programmatic focus`).toBe(true);
    }

    // --- 2. Markers: correct role, accessible name, and a description that
    //        resolves to real elements (the target entry + the hint).
    const markers = page.locator('a[href^="#source-"][data-no-citation-modal="true"]');
    const markerCount = await markers.count();
    if (path.startsWith("/library/")) {
      expect(markerCount, "library pages must cite claims inline").toBeGreaterThan(0);
    }

    for (let i = 0; i < markerCount; i++) {
      const marker = markers.nth(i);
      const href = (await marker.getAttribute("href")) ?? "";
      const n = Number(href.replace("#source-", ""));

      await expect(marker, `${href} marker is missing role="doc-noteref"`).toHaveAttribute(
        "role",
        "doc-noteref",
      );
      await expect(marker, `${href} marker has no accessible name`).toHaveAttribute(
        "aria-label",
        new RegExp(`^Reference ${n}: .+`),
      );

      const describedby = (await marker.getAttribute("aria-describedby")) ?? "";
      const ids = describedby.split(/\s+/).filter(Boolean);
      expect(ids, `${href} marker has no aria-describedby`).not.toHaveLength(0);
      expect(ids[0], `${href} must describe its destination entry first`).toBe(`source-${n}`);
      for (const id of ids) {
        await expect(
          page.locator(`#${id}`),
          `aria-describedby id "${id}" does not resolve`,
        ).toHaveCount(1);
      }

      // The bracketed glyph is decorative; the label carries the meaning.
      await expect(marker.locator('[aria-hidden="true"]')).toHaveCount(1);
    }

    // --- 3. Focus order: markers are reachable by Tab and appear in DOM order.
    if (markerCount > 0) {
      const first = markers.first();
      await first.scrollIntoViewIfNeeded();
      await first.focus();
      await expect(first, "first marker cannot take keyboard focus").toBeFocused();

      if (markerCount > 1) {
        const orderOk = await page.evaluate(() => {
          const els = Array.from(
            document.querySelectorAll<HTMLAnchorElement>(
              'a[href^="#source-"][data-no-citation-modal="true"]',
            ),
          );
          // No positive tabindex anywhere in the markers: tab order == DOM order.
          return els.every((el) => {
            const t = el.getAttribute("tabindex");
            return t === null || Number(t) <= 0;
          });
        });
        expect(orderOk, "citation markers override the natural tab order").toBe(true);

        // Tabbing forward from the first marker eventually reaches the next
        // one without skipping backwards through the document.
        const nextHref = (await markers.nth(1).getAttribute("href")) ?? "";
        let reached = false;
        for (let step = 0; step < 25 && !reached; step++) {
          await page.keyboard.press("Tab");
          reached = await page.evaluate((h) => {
            const el = document.activeElement as HTMLAnchorElement | null;
            return Boolean(el && el.getAttribute("href") === h);
          }, nextHref);
        }
        expect(reached, `tabbing never reached the marker for ${nextHref}`).toBe(true);
      }

      // --- 4. Keyboard activation moves focus to the cited entry.
      const href = (await first.getAttribute("href")) ?? "";
      await first.focus();
      await expect
        .poll(
          async () => {
            await first.focus().catch(() => undefined);
            await page.keyboard.press("Enter");
            return page
              .locator(href)
              .evaluate((el) => el === document.activeElement)
              .catch(() => false);
          },
          { timeout: 15_000, intervals: [250, 500, 1_000] },
        )
        .toBe(true);
    }
  });
}
