import AxeBuilder from "@axe-core/playwright";

import { test, expect } from "./utils";
import { ARTICLE_LIKE_ROUTES, DESKTOP_VIEWPORT, MOBILE_VIEWPORT } from "./long-form-routes";

/**
 * Accessibility guard for long-form reading surfaces.
 *
 * Two separate failure modes, both invisible to a normal layout test:
 *   1. **Contrast** — a token swap (or a `text-foreground/60` on a tinted card)
 *      drops body copy below WCAG AA. axe's colour-contrast rule catches it.
 *   2. **Readable typography** — body text shrinking below 16px on mobile, or a
 *      line-height/measure that makes a paragraph physically hard to track.
 *      axe has no rule for this, so we measure the rendered CSS directly.
 */

/** WCAG-adjacent typography floor for long-form body copy. */
const TYPOGRAPHY = {
  /** iOS zooms inputs and punishes sub-16px body text on mobile. */
  minMobileFontPx: 15,
  minDesktopFontPx: 15,
  /** WCAG 1.4.8 asks for 1.5× within blocks of text. */
  minLineHeightRatio: 1.4,
  /** Beyond ~95 characters a line becomes hard to track back. */
  maxLineLengthChars: 100,
};

async function open(page: import("@playwright/test").Page, route: string) {
  await page.goto(route, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(400);
  await page.evaluate(() => document.fonts?.ready);
}

for (const [label, viewport] of [
  ["mobile", MOBILE_VIEWPORT],
  ["desktop", DESKTOP_VIEWPORT],
] as const) {
  test.describe(`long-form accessibility — ${label}`, () => {
    test.use({ viewport });

    for (const route of ARTICLE_LIKE_ROUTES) {
      test(`${route} body copy meets contrast AA`, async ({ page }) => {
        await open(page, route);

        const results = await new AxeBuilder({ page })
          .withTags(["wcag2a", "wcag2aa", "wcag143"])
          .withRules(["color-contrast", "color-contrast-enhanced"])
          .disableRules(["color-contrast-enhanced"]) // AAA is aspirational, not a gate
          .analyze();

        const detail = results.violations
          .flatMap((v) =>
            v.nodes.map((n) => `${v.id}: ${n.target.join(" ")}\n    ${n.failureSummary ?? ""}`),
          )
          .join("\n");

        expect(results.violations, `${route}\n${detail}`).toEqual([]);
      });

      test(`${route} body copy is readably sized`, async ({ page }) => {
        await open(page, route);

        const problems = await page.evaluate(
          (limits) => {
            const found: string[] = [];
            const paragraphs = Array.from(document.querySelectorAll<HTMLElement>("p, li"));

            for (const el of paragraphs) {
              const text = el.innerText?.trim() ?? "";
              // Only judge real prose: labels, badges and captions are allowed
              // to be small.
              if (text.length < 80) continue;
              const style = getComputedStyle(el);
              if (style.display === "none" || style.visibility === "hidden") continue;

              const fontSize = parseFloat(style.fontSize);
              const lineHeight =
                style.lineHeight === "normal" ? fontSize * 1.2 : parseFloat(style.lineHeight);
              const rect = el.getBoundingClientRect();
              const approxChars = rect.width / (fontSize * 0.5);
              const label = `${el.tagName.toLowerCase()}.${(el.className || "").slice(0, 40)}`;

              if (fontSize < limits.minFontPx) {
                found.push(
                  `${label}: font-size ${fontSize}px < ${limits.minFontPx}px — "${text.slice(0, 50)}"`,
                );
              }
              if (lineHeight / fontSize < limits.minLineHeightRatio) {
                found.push(
                  `${label}: line-height ratio ${(lineHeight / fontSize).toFixed(2)} < ${limits.minLineHeightRatio}`,
                );
              }
              if (approxChars > limits.maxLineLengthChars) {
                found.push(
                  `${label}: ~${Math.round(approxChars)} chars per line > ${limits.maxLineLengthChars}`,
                );
              }
            }
            return found.slice(0, 10);
          },
          {
            minFontPx:
              label === "mobile" ? TYPOGRAPHY.minMobileFontPx : TYPOGRAPHY.minDesktopFontPx,
            minLineHeightRatio: TYPOGRAPHY.minLineHeightRatio,
            maxLineLengthChars: TYPOGRAPHY.maxLineLengthChars,
          },
        );

        expect(problems, `${route} @${label}\n${problems.join("\n")}`).toEqual([]);
      });
    }
  });
}
