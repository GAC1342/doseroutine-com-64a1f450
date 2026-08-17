import { test, expect } from "./utils";
import { openYogaWorkoutSheet, settle, yogaThumbnail, yogaLightbox } from "./exercise-art-helpers";

/**
 * Slow-network ("Regular 3G"-ish) behaviour of the full-size illustration modal.
 *
 * The modal must be usable long before the illustration bytes land: the dialog
 * chrome paints immediately, reserves the image box up front (aspect-square +
 * explicit dimensions), and the late-arriving image must drop into that
 * reserved box without moving anything.
 *
 * Assertions:
 *   1. the dialog is visible within OPEN_BUDGET_MS of the tap, even while the
 *      image is still in flight,
 *   2. the image frame's geometry is identical before and after the bytes
 *      arrive (no layout shift), and the dialog box does not move,
 *   3. no layout-shift entries are attributed to nodes inside the dialog
 *      (Chromium only — the API is not implemented in WebKit/Firefox),
 *   4. the image finishes decoding within PAINT_BUDGET_MS.
 */

/** Round-trip latency injected before each throttled response. */
const RTT_MS = 400;
/** ~400 kbps: bytes are released in slices with a delay between them. */
const BYTES_PER_TICK = 8_000;
const TICK_MS = 160;

const OPEN_BUDGET_MS = 2_000;
const PAINT_BUDGET_MS = 15_000;

type ShiftReport = {
  total: number;
  insideDialog: number;
  supported: boolean;
  nodes: string[];
};

test.describe("illustration modal under slow network", () => {
  test.describe.configure({ timeout: 180_000 });

  test("opens fast and lands the image with no layout shift", async ({ authedPage: page }) => {
    await openYogaWorkoutSheet(page);

    const thumb = yogaThumbnail(page);
    await expect(thumb).toBeVisible();
    await settle(page);

    const src = await thumb.locator("img").first().evaluate((el: HTMLImageElement) => el.src);
    expect(src).toBeTruthy();

    // Cold start: drop anything the list already warmed so the modal has to
    // fetch over the throttled link.
    await page.evaluate(() => {
      (window as unknown as { __imageWarm?: { reset(): void } }).__imageWarm?.reset();
    });

    // Throttle *only* the illustration asset: everything else stays fast so the
    // measurement isolates the modal's image path.
    await page.route(src, async (route) => {
      const response = await route.fetch();
      const body = await response.body();
      await new Promise((r) => setTimeout(r, RTT_MS));
      // Emulating a narrow pipe: hold the response for as long as the payload
      // would realistically take to stream in.
      const ticks = Math.max(1, Math.ceil(body.length / BYTES_PER_TICK));
      await new Promise((r) => setTimeout(r, ticks * TICK_MS));
      await route.fulfill({ response, body });
    });

    // Start collecting layout shifts before the dialog opens.
    await page.evaluate(() => {
      const w = window as unknown as { __shifts?: ShiftReport };
      const report: ShiftReport = { total: 0, insideDialog: 0, supported: false, nodes: [] };
      w.__shifts = report;
      try {
        const observer = new PerformanceObserver((list) => {
          for (const entry of list.getEntries() as unknown as Array<{
            value: number;
            hadRecentInput: boolean;
            sources?: Array<{ node?: Node | null }>;
          }>) {
            if (entry.hadRecentInput) continue;
            report.total += entry.value;
            const inside = (entry.sources ?? []).some((s) => {
              const node = s.node as Element | null;
              const el = node && "closest" in node ? node : (node?.parentElement ?? null);
              return Boolean(el?.closest('[role="dialog"]'));
            });
            if (inside) {
              report.insideDialog += entry.value;
              for (const s of entry.sources ?? []) {
                const node = s.node as Element | null;
                const el = node && "closest" in node ? node : (node?.parentElement ?? null);
                if (el?.closest('[role="dialog"]')) {
                  report.nodes.push(
                    `${el.tagName.toLowerCase()}.${(el.className || "").toString().slice(0, 80)}`,
                  );
                }
              }
            }
          }
        });
        observer.observe({ type: "layout-shift", buffered: false });
        report.supported = true;
      } catch {
        report.supported = false;
      }
    });

    const dialog = yogaLightbox(page);
    const openedAt = Date.now();
    await thumb.click();

    // 1. The dialog chrome must not wait on the image.
    await expect(dialog).toBeVisible({ timeout: OPEN_BUDGET_MS });
    const openMs = Date.now() - openedAt;
    expect(openMs, `dialog took ${openMs}ms to appear`).toBeLessThanOrEqual(OPEN_BUDGET_MS);

    const image = dialog.locator("img").first();
    await expect(image).toBeVisible();

    // The image is still streaming at this point; capture the reserved boxes.
    const before = {
      dialog: await dialog.boundingBox(),
      image: await image.boundingBox(),
      loaded: await image.evaluate((el: HTMLImageElement) => el.complete && el.naturalWidth > 0),
    };
    expect(before.dialog).not.toBeNull();
    expect(before.image).not.toBeNull();
    expect(before.image!.width).toBeGreaterThan(0);
    expect(before.image!.height).toBeGreaterThan(0);

    // 4. The bytes must still land inside the paint budget.
    await expect
      .poll(
        () => image.evaluate((el: HTMLImageElement) => el.complete && el.naturalWidth > 0),
        { timeout: PAINT_BUDGET_MS, message: "illustration never finished decoding" },
      )
      .toBe(true);
    const paintMs = Date.now() - openedAt;
    expect(paintMs, `illustration painted after ${paintMs}ms`).toBeLessThanOrEqual(PAINT_BUDGET_MS);

    // Give the compositor a couple of frames to expose any reflow.
    await page.evaluate(
      () =>
        new Promise<void>((r) => requestAnimationFrame(() => requestAnimationFrame(() => r()))),
    );

    // 2. Geometry must be byte-for-byte stable across the load.
    const after = { dialog: await dialog.boundingBox(), image: await image.boundingBox() };
    for (const key of ["dialog", "image"] as const) {
      const a = before[key]!;
      const b = after[key]!;
      expect(Math.abs(a.x - b.x), `${key} moved horizontally`).toBeLessThanOrEqual(1);
      expect(Math.abs(a.y - b.y), `${key} moved vertically`).toBeLessThanOrEqual(1);
      expect(Math.abs(a.width - b.width), `${key} width changed`).toBeLessThanOrEqual(1);
      expect(Math.abs(a.height - b.height), `${key} height changed`).toBeLessThanOrEqual(1);
    }

    // 3. No layout shift attributed to the dialog subtree (Chromium only).
    const shifts = await page.evaluate(
      () => (window as unknown as { __shifts?: ShiftReport }).__shifts ?? null,
    );
    if (shifts?.supported) {
      expect(
        shifts.insideDialog,
        `layout shift inside the illustration dialog: ${shifts.nodes.join(" | ")}`,
      ).toBeLessThan(0.01);
    }

    await page.unroute(src);
  });
});
