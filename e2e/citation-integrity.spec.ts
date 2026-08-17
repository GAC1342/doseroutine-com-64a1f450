import { test, expect, type Page } from "@playwright/test";
import { dismissFirstRunOverlays } from "./utils";

/**
 * Citation integrity guard.
 *
 * Fails when any inline citation marker ("[3]") points at a source entry that
 * does not exist, or at an entry whose visible/announced number differs from
 * the marker's number. Also fails when the "Sources and references" list is
 * itself misnumbered (gaps, duplicates, or not starting at 1), because that is
 * the other way a marker can silently mean the wrong reference.
 *
 * Runs across several public pages so a regression in one renderer (library
 * pages vs interaction pages) can't hide behind another.
 */
type CitedPage = {
  path: string;
  /**
   * Library pages always cite documents inline, so a page without markers is a
   * regression. Interaction pairs only render markers once their stored refs
   * resolve to a real document (search-only fallbacks are never marked up), so
   * there the markers are checked when present but not required.
   */
  requireMarkers: boolean;
};

const PAGES: CitedPage[] = [
  { path: "/library/creatine", requireMarkers: true },
  { path: "/library/retatrutide", requireMarkers: true },
  { path: "/library/bpc-157", requireMarkers: true },
  // Interaction pages number their sources with the same renderer, so the same
  // guard runs there: misnumbered lists, duplicate anchors and markers pointing
  // at the wrong entry all fail here too.
  { path: "/interactions/ala-and-metformin", requireMarkers: false },
  { path: "/interactions/5-htp-and-sertraline-hcl", requireMarkers: false },
  { path: "/interactions/alpha-gpc-and-piracetam", requireMarkers: false },
];

/**
 * Library pages title the list "Sources and references"; interaction pages use
 * "Sources and how to verify this". Either counts as a resolvable list.
 */
const SOURCES_HEADING = /Sources and (references|how to verify this)/i;

/**
 * Markers only move focus once React has hydrated; clicking earlier follows the
 * plain anchor and leaves focus on <body>. Poll an interactive control until it
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

/**
 * Clicks a marker and waits for its target entry to take focus, retrying the
 * click a few times so a slow hydration doesn't masquerade as a broken anchor.
 */
async function clickMarkerAndFocusTarget(page: Page, href: string) {
  const marker = page.locator(`a[href="${href}"][data-no-citation-modal="true"]`).first();
  const target = page.locator(href);
  await expect
    .poll(
      async () => {
        await marker.scrollIntoViewIfNeeded().catch(() => undefined);
        await marker.click({ timeout: 2_000 }).catch(() => undefined);
        return target.evaluate((el) => el === document.activeElement).catch(() => false);
      },
      { timeout: 15_000, intervals: [200, 400, 800, 1_000] },
    )
    .toBe(true);
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

for (const { path, requireMarkers } of PAGES) {
  test(`citation markers resolve to correctly numbered sources on ${path}`, async ({ page }) => {
    const response = await page.goto(path);
    if (!response || response.status() >= 400) {
      test.skip(true, `${path} is not available (${response?.status()})`);
    }
    await dismissFirstRunOverlays(page);
    await page.goto(path);

    const sourcesHeading = page.getByRole("heading", { name: SOURCES_HEADING });
    if ((await sourcesHeading.count()) === 0) {
      test.skip(true, "page has no resolvable sources");
    }

    await waitForHydration(page);
    await expandEverything(page);

    // --- 1. The sources list itself must be 1..N with no gaps or duplicates.
    const entryNumbers = await page
      .locator('li[id^="source-"]')
      .evaluateAll((els) =>
        els.map((el) => Number((el.getAttribute("id") ?? "").replace("source-", ""))),
      );
    expect(entryNumbers.length, "expected at least one source entry").toBeGreaterThan(0);
    expect(entryNumbers, `sources list ids are not sequential: ${entryNumbers.join(",")}`).toEqual(
      entryNumbers.map((_, i) => i + 1),
    );

    // Each entry's visible number must match its anchor id, and its accessible
    // name must announce the same reference number.
    for (const n of entryNumbers) {
      const entry = page.locator(`#source-${n}`);
      await expect(entry, `#source-${n} missing`).toHaveCount(1);
      await expect(entry, `#source-${n} shows the wrong number`).toContainText(
        new RegExp(`^\\s*${n}\\.`),
      );
      const label = (await entry.getAttribute("aria-label")) ?? "";
      expect(label, `#source-${n} has a mismatched aria-label: "${label}"`).toMatch(
        new RegExp(`^Reference ${n}:`),
      );
    }

    // --- 2. Every inline marker must point at one of those entries.
    const markers = page.locator('a[href^="#source-"][data-no-citation-modal="true"]');
    const total = await markers.count();
    if (requireMarkers) {
      expect(total, "expected at least one inline citation marker").toBeGreaterThan(0);
    }

    const marked = await markers.evaluateAll((els) =>
      els.map((el) => ({
        href: el.getAttribute("href") ?? "",
        aria: el.getAttribute("aria-label") ?? "",
        text: (el.textContent ?? "").trim(),
      })),
    );

    const maxEntry = entryNumbers.length;
    for (const m of marked) {
      const n = Number(m.href.replace("#source-", ""));
      expect(Number.isInteger(n) && n >= 1, `bad marker href: ${m.href}`).toBe(true);
      expect(
        n,
        `marker ${m.href} points past the ${maxEntry}-entry sources list`,
      ).toBeLessThanOrEqual(maxEntry);
      // Visible "[n]" must equal the target number...
      expect(m.text, `marker text ${m.text} does not match ${m.href}`).toBe(`[${n}]`);
      // ...and so must the announced label.
      expect(m.aria, `marker ${m.href} announces the wrong reference`).toMatch(
        new RegExp(`^Reference ${n}:`),
      );
    }

    // --- 3. Marker labels must agree with the entry they land on (same publisher).
    for (const m of marked.slice(0, 8)) {
      const n = Number(m.href.replace("#source-", ""));
      const entryLabel = (await page.locator(`#source-${n}`).getAttribute("aria-label")) ?? "";
      const publisher = entryLabel.split(",").pop()?.trim() ?? "";
      expect(publisher.length, `#source-${n} has no publisher in its label`).toBeGreaterThan(0);
      expect(
        m.aria.includes(publisher),
        `marker ${m.href} cites "${m.aria}" but entry ${n} is "${entryLabel}"`,
      ).toBe(true);
    }
  });
}

/**
 * Anchor-collision guard.
 *
 * Even when the numbering lines up, a duplicated `id="source-n"` (two lists on
 * one page, a footer repeating references, a component rendered twice) makes
 * the browser jump to whichever copy comes first. This test asserts every
 * `#source-n` id appears exactly once and that clicking each marker really
 * scrolls the matching list item into view.
 */
for (const { path, requireMarkers } of PAGES) {
  test(`#source-n anchors are unique and every marker scrolls to its entry on ${path}`, async ({
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

    // 1. No duplicate anchor ids anywhere in the document.
    const ids = await page.locator('[id^="source-"]').evaluateAll((els) => els.map((el) => el.id));
    expect(ids.length, "expected source anchors").toBeGreaterThan(0);
    const dupes = ids.filter((id, i) => ids.indexOf(id) !== i);
    expect(dupes, `duplicate source anchor ids: ${[...new Set(dupes)].join(", ")}`).toEqual([]);

    // 2. Clicking each distinct marker scrolls its own entry into view.
    const markers = page.locator('a[href^="#source-"][data-no-citation-modal="true"]');
    const hrefs = await markers.evaluateAll((els) =>
      els.map((el) => el.getAttribute("href") ?? ""),
    );
    const distinct = [...new Set(hrefs)];
    if (requireMarkers) {
      expect(distinct.length, "expected at least one marker").toBeGreaterThan(0);
    }

    for (const href of distinct) {
      // Focus must land on this exact element (the marker focuses its target),
      // proving no earlier duplicate stole the anchor.
      await clickMarkerAndFocusTarget(page, href);
      await expect(page).toHaveURL(new RegExp(`${href.replace("#", "\\#")}$`));

      const target = page.locator(href);
      await expect(target, `${href} resolves to more than one element`).toHaveCount(1);
      await expect(target, `${href} did not scroll into view`).toBeInViewport({ timeout: 5_000 });

      // And it must be the element the document resolves that id to.
      const resolvesToSame = await target.evaluate((el) => el === document.getElementById(el.id));
      expect(resolvesToSame, `${href} is shadowed by another element with the same id`).toBe(true);
    }
  });
}
