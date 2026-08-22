import type { Page } from "@playwright/test";

/**
 * Routes whose primary content is long-form prose. These are the pages where a
 * missing padded container shows up as text running edge-to-edge on mobile
 * (the /articles + /calculators + /vs/* regression).
 */
export const ARTICLE_LIKE_ROUTES = [
  "/articles",
  "/calculators",
  "/vs",
  "/vs/cronometer",
  "/vs/mytherapy",
  "/vs/round-health",
  "/vs/medisafe",
  "/vs/pill-reminder",
] as const;

/** Everything above, plus the other marketing/legal long-form pages. */
export const LONG_FORM_ROUTES = [
  ...ARTICLE_LIKE_ROUTES,
  "/blog",
  "/library",
  "/faq",
  "/about",
  "/privacy",
  "/cookies",
  "/legal",
  "/install",
  "/compare",
  "/for",
  "/dose-routine",
  "/help",
  "/medical-disclaimer",
  "/data-deletion",
  "/closed-testing",
  "/editorial-policy",
  "/alternatives",
  "/interactions",
  "/best-medication-reminder-app",
  "/best-peptide-tracking-app",
  "/reconstitution-calculator",
  "/dosage-units-guide",
] as const;

export const DESKTOP_VIEWPORT = { width: 1440, height: 1000 };
export const MOBILE_VIEWPORT = { width: 390, height: 844 };
/**
 * iPad portrait / small-laptop breakpoint. 768px is exactly Tailwind's `md`
 * boundary, which is where a layout is most likely to be half-way between the
 * mobile and desktop rules and lose its container padding.
 */
export const TABLET_VIEWPORT = { width: 768, height: 1024 };

/** Minimum gap (px) required between rendered text and the viewport edge. */
export const MIN_EDGE_GUTTER = 12;

export type EdgeViolation = {
  tag: string;
  left: number;
  right: number;
  viewportWidth: number;
  text: string;
  selectorPath: string;
};

export type EdgeAudit = {
  violations: EdgeViolation[];
  scrollWidth: number;
  viewportWidth: number;
};

/**
 * Measures every visible text block and reports any whose *content box* (border
 * box minus horizontal padding — padding is exactly what keeps text off the
 * edge) reaches within `minGutter` px of the viewport edge.
 */
export async function auditTextEdges(page: Page, minGutter = MIN_EDGE_GUTTER): Promise<EdgeAudit> {
  return page.evaluate((gutter) => {
    const viewportWidth = document.documentElement.clientWidth;
    const violations: EdgeAudit["violations"] = [];

    const describe = (el: Element): string => {
      const parts: string[] = [];
      let node: Element | null = el;
      while (node && node !== document.body) {
        const cls =
          typeof node.className === "string" && node.className.trim()
            ? `.${node.className.trim().split(/\s+/).slice(0, 3).join(".")}`
            : "";
        parts.unshift(node.tagName.toLowerCase() + cls);
        node = node.parentElement;
      }
      return parts.slice(-4).join(" > ");
    };

    for (const el of Array.from(
      document.querySelectorAll("p, h1, h2, h3, h4, li, blockquote, dd, dt"),
    )) {
      const text = (el as HTMLElement).innerText?.trim() ?? "";
      if (text.length < 25) continue;

      const style = getComputedStyle(el);
      if (style.visibility === "hidden" || style.display === "none") continue;
      // Fixed/sticky chrome (toasts, banners) is intentionally full-bleed.
      if (style.position === "fixed") continue;

      const rect = el.getBoundingClientRect();
      if (rect.width < 40 || rect.height < 5) continue;

      const left = rect.left + parseFloat(style.paddingLeft || "0");
      const right = rect.right - parseFloat(style.paddingRight || "0");

      if (left < gutter || right > viewportWidth - gutter) {
        violations.push({
          tag: el.tagName,
          left: Math.round(left),
          right: Math.round(right),
          viewportWidth,
          text: text.slice(0, 70),
          selectorPath: describe(el),
        });
      }
    }

    return {
      violations,
      scrollWidth: document.documentElement.scrollWidth,
      viewportWidth,
    };
  }, minGutter);
}

export function formatViolations(route: string, audit: EdgeAudit): string {
  return [
    `${route} @${audit.viewportWidth}px — ${audit.violations.length} block(s) reaching the viewport edge:`,
    ...audit.violations.map(
      (v) => `  ${v.tag} [${v.left}..${v.right}] ${v.selectorPath}\n    "${v.text}"`,
    ),
  ].join("\n");
}
