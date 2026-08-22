import {
  test,
  expect,
  devices,
  chromium,
  webkit,
  type BrowserContext,
  type Page,
} from "@playwright/test";

/**
 * Landing page bottom-layer collision guard.
 *
 * Three fixed layers can occupy the bottom of the screen (phone, tablet
 * portrait/landscape and small desktop widths are all covered):
 *   - the cookie notice          [data-testid="cookie-banner"]
 *   - the install banner         [data-testid="install-sticky"]
 *   - the sticky signup CTA bar  [data-testid="signup-sticky"]
 *
 * They must never physically overlap, and only one "Sign up free" primary CTA
 * may be inside the viewport at a time (hero/final button OR the sticky bar).
 *
 * Reliability rules for this spec (no arbitrary sleeps):
 *   - animations/transitions are disabled and reduced-motion is forced
 *   - storage is seeded via an init script so the *first* load is the state
 *     under test (no reload races)
 *   - every measurement waits until layout is stable across consecutive frames
 *   - scrolling is instant and verified to have actually landed
 */

const COOKIE_CONSENT_KEY = "doseroutine:cookie-consent:v1";
const PAGEVIEWS_KEY = "doseroutine_pageviews";
const INSTALL_DISMISSED_KEY = "doseroutine_install_sticky_dismissed";

const LAYERS = ["cookie-banner", "install-sticky", "signup-sticky"] as const;

const iPadPortrait = devices["iPad (gen 7)"];
const iPadLandscape = devices["iPad (gen 7) landscape"];

/** Plain (non-touch) desktop context options at a given width. */
const desktopViewport = (width: number, height = 800) => ({
  viewport: { width, height },
  deviceScaleFactor: 1,
  isMobile: false,
  hasTouch: false,
});

const DEVICE_MATRIX = [
  { label: "iOS (iPhone 14, WebKit)", device: devices["iPhone 14"], engine: webkit },
  { label: "Android (Pixel 7, Chromium)", device: devices["Pixel 7"], engine: chromium },
  { label: "iPad portrait (WebKit)", device: iPadPortrait, engine: webkit },
  { label: "iPad landscape (WebKit)", device: iPadLandscape, engine: webkit },
  {
    label: "Small desktop 1024x768 (Chromium)",
    device: desktopViewport(1024, 768),
    engine: chromium,
  },
  {
    label: "Small desktop 1280x720 (Chromium)",
    device: desktopViewport(1280, 720),
    engine: chromium,
  },
  {
    label: "Narrow desktop 900x900 (Chromium)",
    device: desktopViewport(900, 900),
    engine: chromium,
  },
];

type Rect = { x: number; y: number; width: number; height: number };

function intersects(a: Rect, b: Rect, tolerance = 1): boolean {
  return (
    a.x < b.x + b.width - tolerance &&
    b.x < a.x + a.width - tolerance &&
    a.y < b.y + b.height - tolerance &&
    b.y < a.y + a.height - tolerance
  );
}

const DISABLE_ANIMATIONS_CSS = `
  *, *::before, *::after {
    animation-duration: 0s !important;
    animation-delay: 0s !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0s !important;
    transition-delay: 0s !important;
    scroll-behavior: auto !important;
  }
  html { scroll-behavior: auto !important; }
`;

/**
 * Wait until the geometry of every tracked layer is identical across three
 * consecutive animation frames — i.e. nothing is still sliding/fading in.
 */
async function waitForStableLayout(page: Page): Promise<void> {
  await page.waitForFunction(
    (ids) => {
      const w = window as unknown as { __overlapProbe?: { key: string; hits: number } };
      const key = ids
        .map((id) => {
          const el = document.querySelector(`[data-testid="${id}"]`);
          if (!el) return `${id}:none`;
          const r = el.getBoundingClientRect();
          const s = getComputedStyle(el);
          return `${id}:${Math.round(r.x)},${Math.round(r.y)},${Math.round(r.width)},${Math.round(
            r.height,
          )},${s.opacity},${s.visibility},${s.display}`;
        })
        .join("|");
      const probe = w.__overlapProbe;
      if (!probe || probe.key !== key) {
        w.__overlapProbe = { key, hits: 1 };
        return false;
      }
      probe.hits += 1;
      return probe.hits >= 3;
    },
    LAYERS as unknown as string[],
    { timeout: 15_000, polling: "raf" },
  );
}

/** Fonts + hydration + no in-flight layout shifts. */
async function waitForPageReady(page: Page): Promise<void> {
  await page.waitForLoadState("load");
  await page.evaluate(() => document.fonts?.ready).catch(() => undefined);
  await page.waitForLoadState("networkidle").catch(() => undefined);
  await waitForStableLayout(page);
}

/** Bounding boxes of the bottom-fixed layers that are actually on screen. */
async function visibleLayerRects(page: Page): Promise<Record<string, Rect>> {
  await waitForStableLayout(page);
  return page.evaluate(
    (ids) => {
      const out: Record<string, Rect> = {};
      for (const id of ids) {
        const el = document.querySelector(`[data-testid="${id}"]`);
        if (!el) continue;
        const s = getComputedStyle(el);
        if (s.visibility === "hidden" || s.display === "none" || Number(s.opacity) === 0) continue;
        const r = el.getBoundingClientRect();
        if (r.width > 0 && r.height > 0) {
          out[id] = { x: r.x, y: r.y, width: r.width, height: r.height };
        }
      }
      return out;
    },
    LAYERS as unknown as string[],
  );
}

/** Count of "Sign up free"-style primary CTAs currently inside the viewport. */
async function visiblePrimaryCtaCount(page: Page): Promise<number> {
  await waitForStableLayout(page);
  return page.evaluate(() => {
    const vh = window.innerHeight;
    const vw = window.innerWidth;
    const links = Array.from(document.querySelectorAll("a, button"));
    return links.filter((el) => {
      const text = (el.textContent ?? "").trim().toLowerCase();
      if (!/^sign up free/.test(text)) return false;
      const r = el.getBoundingClientRect();
      if (r.width === 0 || r.height === 0) return false;
      const style = window.getComputedStyle(el);
      if (style.visibility === "hidden" || style.display === "none") return false;
      if (Number(style.opacity) === 0) return false;
      return r.bottom > 0 && r.top < vh && r.right > 0 && r.left < vw;
    }).length;
  });
}

/**
 * Open the landing page with deterministic state: storage seeded before any
 * app code runs, animations disabled, reduced motion honoured.
 */
async function openLanding(
  context: BrowserContext,
  opts: { consent?: boolean; pageviews?: number } = {},
): Promise<Page> {
  const page = await context.newPage();
  await page.addInitScript(
    ([consentKey, pageviewsKey, dismissedKey, consent, pageviews]) => {
      try {
        if (consent) localStorage.setItem(consentKey as string, "accepted");
        else localStorage.removeItem(consentKey as string);
        localStorage.setItem(pageviewsKey as string, String(pageviews));
        sessionStorage.removeItem(dismissedKey as string);
      } catch {
        // storage blocked — the default state is still a meaningful check
      }
    },
    [
      COOKIE_CONSENT_KEY,
      PAGEVIEWS_KEY,
      INSTALL_DISMISSED_KEY,
      opts.consent ?? false,
      opts.pageviews ?? 0,
    ] as const,
  );
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await page.addStyleTag({ content: DISABLE_ANIMATIONS_CSS });
  await waitForPageReady(page);
  return page;
}

/**
 * Wait until the scroll position has actually settled at (or clamped to) the
 * target and stopped changing — momentum/rubber-banding safe on WebKit —
 * then wait for layout to stop moving.
 */
async function settleScroll(page: Page, target: number): Promise<void> {
  await page.waitForFunction(
    (expected) => {
      const w = window as unknown as { __scrollProbe?: { y: number; hits: number } };
      const y = Math.round(window.scrollY);
      const max = Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
      const settled = Math.abs(y - expected) <= 2 || Math.abs(y - Math.round(max)) <= 2;
      const probe = w.__scrollProbe;
      if (!probe || probe.y !== y) {
        w.__scrollProbe = { y, hits: 1 };
        return false;
      }
      probe.hits += 1;
      return settled && probe.hits >= 3;
    },
    target,
    { timeout: 15_000, polling: "raf" },
  );

  await waitForStableLayout(page);
}

/** Scroll to a fraction of the page, verify it landed, then settle layout. */
async function scrollTo(page: Page, fraction: number): Promise<void> {
  const target = await page.evaluate((f) => {
    const max = Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
    const top = Math.round(max * f);
    window.scrollTo(0, top);
    return top;
  }, fraction);

  await settleScroll(page, target);
}

/**
 * Content-anchored stops. Fractions alone can skip straight past a section on
 * a long page, so we also park each of these landmarks at the top of the
 * viewport and re-measure there.
 */
const SECTION_ANCHORS: { name: string; pattern: string }[] = [
  { name: "how-it-works", pattern: "how it works|how doseroutine works" },
  { name: "testimonials", pattern: "testing since|three compounds in my protocol" },
  { name: "trust-safety", pattern: "privacy|your data" },
  { name: "pricing", pattern: "7-day free trial|\\$9\\.99" },
  { name: "faq", pattern: "questions people ask" },
  { name: "final-cta", pattern: "" }, // resolved via [data-testid="primary-cta"]
  { name: "footer", pattern: "cookie policy|terms" },
];

/**
 * Scroll a landmark to just below the top of the viewport.
 * Returns false when the landmark isn't on the page (copy changed) so the
 * caller can account for coverage instead of silently passing.
 */
async function scrollToAnchor(
  page: Page,
  anchor: { name: string; pattern: string },
): Promise<boolean> {
  const top = await page.evaluate(({ name, pattern }) => {
    let el: Element | null = null;
    if (name === "final-cta") {
      el = document.querySelector('[data-testid="primary-cta"]');
    }
    if (!el && pattern) {
      const re = new RegExp(pattern, "i");
      const candidates = Array.from(
        document.querySelectorAll("h1, h2, h3, p, a, span, li, button"),
      );
      el =
        candidates.find((node) => {
          const text = (node.textContent ?? "").trim();
          if (!text || text.length > 300) return false;
          if (!re.test(text)) return false;
          const r = node.getBoundingClientRect();
          return r.width > 0 && r.height > 0;
        }) ?? null;
    }
    if (!el) return null;
    const max = Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
    const target = Math.min(
      max,
      Math.max(0, Math.round(window.scrollY + el.getBoundingClientRect().top - 8)),
    );
    window.scrollTo(0, target);
    return target;
  }, anchor);
  if (top === null) return false;
  await settleScroll(page, top);
  return true;
}

/** Every eighth of the page, so no long stretch goes unmeasured. */
const SCROLL_STOPS = [0, 0.125, 0.25, 0.35, 0.5, 0.625, 0.75, 0.875, 1];

/** Assert no two visible bottom layers overlap at the current position. */
async function expectNoOverlapHere(page: Page, where: string): Promise<number> {
  const rects = await visibleLayerRects(page);
  const ids = Object.keys(rects);
  for (let i = 0; i < ids.length; i += 1) {
    for (let j = i + 1; j < ids.length; j += 1) {
      expect(
        intersects(rects[ids[i]], rects[ids[j]]),
        `${ids[i]} overlaps ${ids[j]} at ${where}`,
      ).toBe(false);
    }
  }
  return ids.length;
}

for (const { label, device, engine } of DEVICE_MATRIX) {
  test.describe(`Landing bottom layers — ${label}`, () => {
    let context: BrowserContext | undefined;

    // Both engines are required: CI installs chromium *and* webkit, so a
    // missing binary is a real failure, not something to skip past.
    test.beforeAll(async () => {
      const browser = await engine.launch({
        ...(engine === chromium && process.env.PLAYWRIGHT_CHROMIUM_PATH
          ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH }
          : {}),
        ...(engine === webkit && process.env.PLAYWRIGHT_WEBKIT_PATH
          ? { executablePath: process.env.PLAYWRIGHT_WEBKIT_PATH }
          : {}),
      });
      context = await browser.newContext({ ...device, reducedMotion: "reduce" });
    });

    test.afterAll(async () => {
      await context?.browser()?.close();
    });

    test("cookie banner, install banner and sticky CTA never overlap", async () => {
      // Second pageview + no consent => the install banner is eligible and the
      // cookie notice is showing: the worst case for stacking.
      const page = await openLanding(context!, { consent: false, pageviews: 1 });

      let seenLayers = 0;
      for (const stop of SCROLL_STOPS) {
        await scrollTo(page, stop);
        seenLayers = Math.max(seenLayers, await expectNoOverlapHere(page, `scroll ${stop}`));
      }

      let anchorsHit = 0;
      for (const anchor of SECTION_ANCHORS) {
        if (!(await scrollToAnchor(page, anchor))) continue;
        anchorsHit += 1;
        seenLayers = Math.max(
          seenLayers,
          await expectNoOverlapHere(page, `section "${anchor.name}"`),
        );
      }

      // Guard against a vacuous pass: at least one bottom layer must render,
      // and the section sweep must have actually found sections.
      expect(seenLayers, "no bottom-fixed layer ever rendered").toBeGreaterThan(0);
      expect(anchorsHit, "no landing section anchors resolved").toBeGreaterThanOrEqual(4);
      await page.close();
    });

    test("only one primary signup CTA is visible per viewport", async () => {
      const page = await openLanding(context!, { consent: true, pageviews: 1 });

      for (const stop of SCROLL_STOPS) {
        await scrollTo(page, stop);
        const count = await visiblePrimaryCtaCount(page);
        expect(count, `primary CTAs visible at scroll ${stop}`).toBeLessThanOrEqual(1);
      }

      for (const anchor of SECTION_ANCHORS) {
        if (!(await scrollToAnchor(page, anchor))) continue;
        const count = await visiblePrimaryCtaCount(page);
        expect(count, `primary CTAs visible at section "${anchor.name}"`).toBeLessThanOrEqual(1);
      }
      await page.close();
    });

    test("install banner stays hidden on a first, short visit", async () => {
      const page = await openLanding(context!, { consent: true, pageviews: 0 });

      await scrollTo(page, 0.8);
      await expect(page.locator('[data-testid="install-sticky"]')).toHaveCount(0);
      await page.close();
    });

    test("cookie notice and sticky CTA coexist without covering each other", async () => {
      const page = await openLanding(context!, { consent: false, pageviews: 0 });

      for (const stop of [0.25, 0.5, 0.75]) {
        await scrollTo(page, stop);
        const rects = await visibleLayerRects(page);
        if (rects["cookie-banner"] && rects["signup-sticky"]) {
          expect(
            intersects(rects["cookie-banner"], rects["signup-sticky"]),
            `cookie notice covers sticky CTA at scroll ${stop}`,
          ).toBe(false);
        }
      }

      for (const anchor of [
        { name: "faq", pattern: "questions people ask" },
        { name: "pricing", pattern: "7-day free trial|\\$9\\.99" },
      ]) {
        if (!(await scrollToAnchor(page, anchor))) continue;
        const rects = await visibleLayerRects(page);
        if (rects["cookie-banner"] && rects["signup-sticky"]) {
          expect(
            intersects(rects["cookie-banner"], rects["signup-sticky"]),
            `cookie notice covers sticky CTA at section "${anchor.name}"`,
          ).toBe(false);
        }
      }
      await page.close();
    });
  });
}
