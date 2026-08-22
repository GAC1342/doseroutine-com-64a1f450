/**
 * Rich-results + canonical/locale regression guard for the /for use-case hub.
 *
 * Fetches the server-rendered HTML for /for and every /for/<slug> page and runs
 * the shared rich-results validator, which mirrors Google's Rich Results Test
 * expectations for FAQPage and BreadcrumbList plus this site's canonical,
 * hreflang, and social-tag contract. Any warning fails the test, so a new
 * schema or canonical regression can't ship silently.
 *
 * Base URL: FOR_ANCHOR_BASE_URL (default http://localhost:8080). Offline runs
 * skip the rendered assertions.
 */

import { beforeAll, describe, expect, it } from "vitest";
import { USE_CASE_LIST } from "@/lib/app-roundups";
import { validateRichResults, headLinks, metaContent } from "@/lib/rich-results-validate";

const BASE_URL = (process.env["FOR_ANCHOR_BASE_URL"] ?? "http://localhost:8080").replace(
  /\/+$/,
  "",
);
const SITE = "https://doseroutine.com";

const PATHS = ["/for", ...USE_CASE_LIST.map((u) => `/for/${u.slug}`)];

const html = new Map<string, string>();
let serverUp = false;

beforeAll(async () => {
  try {
    const probe = await fetch(`${BASE_URL}/for`, { redirect: "follow" });
    serverUp = probe.ok;
    if (!serverUp) return;
    html.set("/for", await probe.text());
    for (const path of PATHS.slice(1)) {
      const res = await fetch(`${BASE_URL}${path}`, { redirect: "follow" });
      if (res.ok) html.set(path, await res.text());
    }
  } catch {
    serverUp = false;
  }
}, 120_000);

describe("/for rich results", () => {
  for (const path of PATHS) {
    it(`${path} publishes valid FAQPage + BreadcrumbList and clean meta`, () => {
      if (!serverUp) return;
      const body = html.get(path);
      expect(body, `${path} did not render`).toBeTruthy();
      const leaf = USE_CASE_LIST.find((u) => `/for/${u.slug}` === path);
      const warnings = validateRichResults(body!, {
        canonical: `${SITE}${path}`,
        origin: SITE,
        requireFaq: true,
        requireBreadcrumb: true,
        breadcrumbLeafName: leaf?.h1,
      });
      expect(warnings, `${path} rich-results warnings`).toEqual([]);
    });
  }
});

describe("/for canonical and locale tags", () => {
  for (const path of PATHS) {
    it(`${path} self-references its canonical and hreflang cluster`, () => {
      if (!serverUp) return;
      const body = html.get(path)!;
      const canonicals = headLinks(body, "canonical").map((l) => l["href"]);
      expect(canonicals, `${path} canonical`).toEqual([`${SITE}${path}`]);

      const alternates = headLinks(body, "alternate").filter((l) => l["hreflang"]);
      const langs = alternates.map((l) => l["hreflang"].toLowerCase()).sort();
      expect(langs, `${path} hreflang languages`).toEqual(["en", "x-default"]);
      for (const alt of alternates) {
        expect(alt["href"], `${path} hreflang ${alt["hreflang"]} href`).toBe(`${SITE}${path}`);
      }

      expect(metaContent(body, "og:url"), `${path} og:url`).toEqual([`${SITE}${path}`]);
      const locale = metaContent(body, "og:locale");
      expect(locale[0], `${path} og:locale`).toBe("en_US");
      expect(metaContent(body, "robots").join(" ").toLowerCase()).not.toContain("noindex");
    });
  }

  it("gives every /for page a distinct canonical", () => {
    if (!serverUp) return;
    const seen = PATHS.map((p) => headLinks(html.get(p)!, "canonical")[0]?.["href"]);
    expect(new Set(seen).size).toBe(PATHS.length);
  });
});
