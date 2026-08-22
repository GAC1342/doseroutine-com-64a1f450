import AxeBuilder from "@axe-core/playwright";
import type { Page } from "@playwright/test";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { test, expect, AUTH_AVAILABLE, dismissFirstRunOverlays, dismissPaywall } from "./utils";

/**
 * axe-core accessibility scan across every authenticated route.
 *
 * scripts/axe-scan.mjs covers public pages and critical-flow-a11y.spec.ts
 * covers interactive flows. This one sweeps the signed-in surface: each
 * `/src/routes/_authenticated/*` screen is loaded in both light and dark mode
 * and audited with WCAG 2.1 A/AA + best-practice rules.
 *
 * Any violation with impact `critical` or `serious` fails the check.
 */

const OUT = path.join("test-results", "authenticated-axe");
mkdirSync(OUT, { recursive: true });

const MAJOR = new Set(["critical", "serious"]);
const TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "best-practice"];

/** Signed-in routes, mirroring src/routes/_authenticated/. */
export const AUTHENTICATED_ROUTES = [
  "/today",
  "/stack",
  "/timeline",
  "/adherence",
  "/checkins",
  "/side-effects",
  "/safety",
  "/insights",
  "/food",
  "/meal-plan",
  "/scan",
  "/fitness",
  "/body-metrics",
  "/timer",
  "/injection-sites",
  "/cycles",
  "/labs",
  "/progress-photos",
  "/reminders",
  "/notifications",
  "/templates",
  "/costs",
  "/doctor-report",
  "/health-sync",
  "/pill-id",
  "/export",
  "/plan",
  "/more",
];

type Violation = {
  id: string;
  impact: string | null;
  help: string;
  helpUrl: string;
  nodes: { target: unknown[]; html?: string; failureSummary?: string }[];
};

async function audit(page: Page, label: string) {
  const results = await new AxeBuilder({ page }).withTags(TAGS).analyze();
  const violations = results.violations as unknown as Violation[];
  writeFileSync(
    path.join(OUT, `${label.replace(/[^a-z0-9]+/gi, "_")}.json`),
    JSON.stringify(
      {
        label,
        url: page.url(),
        scannedAt: new Date().toISOString(),
        violations: violations.map((v) => ({
          id: v.id,
          impact: v.impact,
          help: v.help,
          helpUrl: v.helpUrl,
          nodes: v.nodes.length,
          targets: v.nodes.slice(0, 5).map((n) => n.target),
        })),
      },
      null,
      2,
    ),
  );
  return violations.filter((v) => MAJOR.has(v.impact ?? ""));
}

async function setTheme(page: Page, theme: "light" | "dark") {
  await page.emulateMedia({ colorScheme: theme });
  await page.evaluate((mode) => {
    document.documentElement.classList.toggle("dark", mode === "dark");
    window.localStorage.setItem("theme", mode);
  }, theme);
}

test.describe("authenticated routes — axe", () => {
  test.skip(!AUTH_AVAILABLE, "Set TEST_USER_EMAIL and TEST_USER_PASSWORD to run this sweep");
  test.describe.configure({ mode: "serial" });

  for (const route of AUTHENTICATED_ROUTES) {
    for (const theme of ["light", "dark"] as const) {
      test(`${route} (${theme})`, async ({ authedPage: page }) => {
        test.setTimeout(90_000);
        await page.goto(route, { waitUntil: "domcontentloaded" });
        await dismissFirstRunOverlays(page);
        await setTheme(page, theme);
        await dismissPaywall(page, 3_000);
        await page.waitForLoadState("networkidle", { timeout: 20_000 }).catch(() => undefined);
        // Let skeletons resolve so axe reads the settled DOM, not the loader.
        await page.waitForTimeout(750);

        const major = await audit(page, `${route}-${theme}`);
        const summary = major
          .map((v) => `${v.impact} · ${v.id} · ${v.help} (${v.nodes.length} node(s))`)
          .join("\n");
        expect(summary, `Major axe violations on ${route} (${theme}):\n${summary}`).toBe("");
      });
    }
  }
});
