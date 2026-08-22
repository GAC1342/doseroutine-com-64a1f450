import AxeBuilder from "@axe-core/playwright";
import type { Page } from "@playwright/test";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { test, expect, AUTH_AVAILABLE, dismissFirstRunOverlays, dismissPaywall } from "./utils";

/**
 * Automated accessibility checks for the app's critical flows.
 *
 * scripts/axe-scan.mjs already covers static public pages. What it can't
 * reach is the state a real user spends time in: the scanner screen, the
 * meal review sheet (a modal with dozens of inputs), and the dose actions on
 * Today. Those are the flows where a missing label or an unreachable control
 * actually blocks someone, so they get their own axe run here.
 *
 * A "major issue" = any violation with impact `critical` or `serious`.
 * Those fail the test (and therefore CI). Moderate/minor findings are written
 * to the report for triage but do not fail.
 *
 * Reports land in test-results/critical-flow-a11y/<flow>.json so CI can
 * publish them as artifacts.
 */

const OUT = path.join("test-results", "critical-flow-a11y");
mkdirSync(OUT, { recursive: true });

const MAJOR = new Set(["critical", "serious"]);

/** WCAG 2.1 A/AA plus best-practice, matching scripts/axe-scan.mjs. */
const TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "best-practice"];

type Violation = {
  id: string;
  impact: string | null;
  help: string;
  helpUrl: string;
  nodes: { target: unknown[]; html?: string; failureSummary?: string }[];
};

async function auditFlow(page: Page, flow: string, include?: string) {
  // document-title / html-has-lang are document-level rules already covered by
  // the static page scan (scripts/axe-scan.mjs). Inside a client-side flow they
  // can be observed mid-transition, so they are excluded here to keep the gate
  // signal about the flow's own controls.
  let builder = new AxeBuilder({ page })
    .withTags(TAGS)
    .disableRules(["document-title", "html-has-lang"]);
  if (include) builder = builder.include(include);
  const results = await builder.analyze();

  const violations = results.violations as unknown as Violation[];
  writeFileSync(
    path.join(OUT, `${flow}.json`),
    JSON.stringify(
      {
        flow,
        url: page.url(),
        scannedAt: new Date().toISOString(),
        violations: violations.map((v) => ({
          id: v.id,
          impact: v.impact,
          help: v.help,
          helpUrl: v.helpUrl,
          nodes: v.nodes.map((n) => ({
            target: n.target,
            html: n.html,
            failureSummary: n.failureSummary,
          })),
        })),
      },
      null,
      2,
    ),
  );

  const major = violations.filter((v) => MAJOR.has(v.impact ?? ""));
  const report = major
    .map(
      (v) =>
        `[${v.impact}] ${v.id}: ${v.help}\n  ${v.helpUrl}\n  ${v.nodes
          .slice(0, 5)
          .map((n) => JSON.stringify(n.target))
          .join("\n  ")}`,
    )
    .join("\n\n");

  expect(major, `Major a11y violations in "${flow}" flow:\n\n${report}`).toEqual([]);
}

test.describe("critical flow accessibility (axe)", () => {
  test.describe("authenticated flows", () => {
    test.skip(!AUTH_AVAILABLE, "Requires TEST_USER_EMAIL / TEST_USER_PASSWORD");

    test("scan screen has no major a11y violations", async ({ authedPage: page }) => {
      await page.goto("/scan", { waitUntil: "domcontentloaded" });
      await dismissFirstRunOverlays(page);
      await dismissPaywall(page);
      await page.waitForLoadState("networkidle").catch(() => undefined);
      await auditFlow(page, "scan");
    });

    test("meal add + review sheet has no major a11y violations", async ({ authedPage: page }) => {
      await page.goto("/food");
      await dismissFirstRunOverlays(page);
      await dismissPaywall(page);
      await page.waitForLoadState("networkidle").catch(() => undefined);

      // Entry point (hero camera button + "More ways to add a meal").
      await auditFlow(page, "meal-add-entry");

      await page.getByText("More ways to add a meal").click();
      await page.getByRole("button", { name: "Enter by hand" }).click();
      await expect(page.getByLabel("Item 1 name")).toBeVisible();

      // Fill one item so the macro rows, cue hints and totals are all rendered
      // before axe walks the dialog.
      await page.getByLabel("Item 1 name").fill("Grilled chicken breast");
      await page.getByLabel("Item 1 kcal").fill("165");
      await page.getByLabel("Item 1 Protein").fill("31");
      await page.getByLabel("Item 1 Carbs").fill("0");
      await page.getByLabel("Item 1 portion").fill("200 g");
      // Portion scaling itself is covered by e2e/meal-portion-scaling.spec.ts;
      // here we only need the fully populated sheet on screen for axe.
      await expect(page.getByLabel("Item 1 name")).toHaveValue("Grilled chicken breast");

      // Scope to the modal: it owns the focus and is what the user is in.
      const dialog = page.getByRole("dialog").first();
      await expect(dialog).toBeVisible();
      await auditFlow(page, "meal-review-sheet", '[role="dialog"]');
    });

    test("dosing actions on Today have no major a11y violations", async ({ authedPage: page }) => {
      await page.goto("/today");
      await dismissFirstRunOverlays(page);
      await dismissPaywall(page);
      await page.waitForLoadState("networkidle").catch(() => undefined);
      await auditFlow(page, "today-dosing");

      // Dose logging sheet, when a pending dose exists.
      const logBtn = page.getByRole("button", { name: /^\s*Taken\s*$/i }).first();
      if (await logBtn.isVisible().catch(() => false)) {
        await expect(logBtn).toBeEnabled();
        // Keyboard reachability of the primary dose action.
        await logBtn.focus();
        const focused = await page.evaluate(
          () => document.activeElement?.textContent?.trim() ?? "",
        );
        expect(focused).toMatch(/taken/i);
      }
    });
  });
});
