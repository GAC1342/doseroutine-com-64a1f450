/**
 * Rich-results regression guard for the /goals hub and every goal page.
 *
 * The /goals hub is the breadcrumb parent for all 20 goal pages, so its
 * BreadcrumbList and the leaf pages' crumbs must agree, and each page needs a
 * valid FAQPage for rich results. Validated against the server-rendered HTML
 * with the shared validator (Google Rich Results Test field expectations).
 *
 * Base URL: FOR_ANCHOR_BASE_URL (default http://localhost:8080). Offline runs
 * skip the rendered assertions.
 */

import { beforeAll, describe, expect, it } from "vitest";
import { GOALS } from "@/lib/goals";
import { GOAL_HUB_FAQS } from "@/lib/aeo-faqs-hubs";
import { extractJsonLd, headLinks, validateRichResults } from "@/lib/rich-results-validate";

const BASE_URL = (process.env["FOR_ANCHOR_BASE_URL"] ?? "http://localhost:8080").replace(
  /\/+$/,
  "",
);
const SITE = "https://doseroutine.com";
const PATHS = ["/goals", ...GOALS.map((g) => `/goals/${g.slug}`)];

const html = new Map<string, string>();
let serverUp = false;

beforeAll(async () => {
  try {
    const probe = await fetch(`${BASE_URL}/goals`, { redirect: "follow" });
    serverUp = probe.ok;
    if (!serverUp) return;
    html.set("/goals", await probe.text());
    for (const path of PATHS.slice(1)) {
      const res = await fetch(`${BASE_URL}${path}`, { redirect: "follow" });
      if (res.ok) html.set(path, await res.text());
    }
  } catch {
    serverUp = false;
  }
}, 180_000);

describe("goal FAQ data", () => {
  it("has FAQ pairs for every goal", () => {
    for (const goal of GOALS) {
      const pairs = GOAL_HUB_FAQS[goal.slug] ?? [];
      expect(pairs.length, `${goal.slug} has no FAQ pairs`).toBeGreaterThan(2);
      for (const pair of pairs) {
        expect(pair.q.trim().length).toBeGreaterThan(10);
        expect(pair.a.trim().length).toBeGreaterThan(40);
      }
    }
  });
});

describe("/goals rich results", () => {
  for (const path of PATHS) {
    it(`${path} publishes valid FAQPage + BreadcrumbList and clean meta`, () => {
      if (!serverUp) return;
      const body = html.get(path);
      expect(body, `${path} did not render`).toBeTruthy();
      const goal = GOALS.find((g) => `/goals/${g.slug}` === path);
      const warnings = validateRichResults(body!, {
        canonical: `${SITE}${path}`,
        origin: SITE,
        requireFaq: true,
        requireBreadcrumb: true,
        breadcrumbLeafName: goal?.title,
      });
      expect(warnings, `${path} rich-results warnings`).toEqual([]);
    });
  }

  it("routes every goal breadcrumb through the /goals hub", () => {
    if (!serverUp) return;
    for (const goal of GOALS) {
      const body = html.get(`/goals/${goal.slug}`);
      if (!body) continue;
      const { nodes } = extractJsonLd(body);
      const crumb = nodes.find((n) => String(n["@type"]) === "BreadcrumbList");
      expect(crumb, `${goal.slug} has no BreadcrumbList`).toBeTruthy();
      const names = (crumb!.itemListElement as Array<{ name: string; item: string }>).map(
        (i) => i.name,
      );
      expect(names, `${goal.slug} crumbs`).toEqual(["Home", "Goals", goal.title]);
    }
  });

  it("gives every goal page a distinct canonical", () => {
    if (!serverUp) return;
    const rendered = PATHS.filter((p) => html.has(p));
    const canon = rendered.map((p) => headLinks(html.get(p)!, "canonical")[0]?.["href"]);
    expect(new Set(canon).size).toBe(rendered.length);
  });
});
