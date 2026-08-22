/**
 * Anchor-text regression guard for the /for use-case hub.
 *
 * The /for index links out to every use-case page. Generic labels
 * ("Read more", "Learn more", "Click here") strip the destination signal for
 * both search engines and screen-reader users, and the same label pointing at
 * two different pages sends conflicting signals. This test locks that in:
 *
 *  1. Source scan — the /for route files may not contain a generic anchor
 *     label in JSX link text (catches a regression before it ships).
 *  2. Data check — every use-case card label derived from USE_CASE_LIST is
 *     unique and mentions its destination.
 *  3. Rendered check (when a dev server is reachable) — the served HTML for
 *     /for and each /for/<slug> passes the shared anchor-text lint with zero
 *     issues, and each use-case link's text matches its destination page.
 *
 * Base URL: FOR_ANCHOR_BASE_URL (default http://localhost:8080). Offline runs
 * skip step 3; steps 1 and 2 always run.
 */

import { beforeAll, describe, expect, it } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { GENERIC_ANCHOR_TEXT, lintAnchorText } from "@/lib/anchor-text-lint";
import { USE_CASE_LIST } from "@/lib/app-roundups";

const ROUTES_DIR = join(process.cwd(), "src", "routes");
const BASE_URL = (process.env["FOR_ANCHOR_BASE_URL"] ?? "http://localhost:8080").replace(
  /\/+$/,
  "",
);
const SITE_ORIGIN = "https://doseroutine.com";

function forRouteFiles(): string[] {
  return readdirSync(ROUTES_DIR)
    .filter((f) => /\.tsx$/.test(f) && (f === "for.tsx" || f.startsWith("for.")))
    .sort();
}

/** Visible text of every <a>/<Link> in a route source file. */
function jsxLinkTexts(source: string): string[] {
  const out: string[] = [];
  for (const match of source.matchAll(/<(a|Link)\b[^>]*>([\s\S]*?)<\/\1>/g)) {
    const text = match[2]
      .replace(/<[^>]+>/g, " ") // nested elements/icons
      .replace(/\{[^{}]*\}/g, " ") // interpolations are dynamic, checked below
      .replace(/\s+/g, " ")
      .trim();
    if (text) out.push(text);
  }
  return out;
}

const FILES = forRouteFiles();

describe("/for anchor text", () => {
  it("finds the /for route files", () => {
    expect(FILES).toContain("for.index.tsx");
    expect(FILES.length).toBeGreaterThan(1);
  });

  it("uses no generic anchor labels in the route source", () => {
    const offenders: string[] = [];
    for (const file of FILES) {
      const source = readFileSync(join(ROUTES_DIR, file), "utf8");
      for (const text of jsxLinkTexts(source)) {
        if (GENERIC_ANCHOR_TEXT.has(text.toLowerCase().replace(/[.…»>→\s]+$/, ""))) {
          offenders.push(`${file}: "${text}"`);
        }
      }
    }
    expect(offenders, `generic link text found: ${offenders.join(", ")}`).toEqual([]);
  });

  it("gives every use-case card a unique, destination-describing label", () => {
    const labels = USE_CASE_LIST.map((u) => `Read about ${u.h1}`);
    expect(new Set(labels.map((l) => l.toLowerCase())).size).toBe(labels.length);
    for (const [i, label] of labels.entries()) {
      expect(GENERIC_ANCHOR_TEXT.has(label.toLowerCase())).toBe(false);
      expect(label.length).toBeGreaterThan(12);
      expect(label).toContain(USE_CASE_LIST[i].h1);
    }
  });
});

describe("/for rendered anchor text", () => {
  const paths = ["/for", ...USE_CASE_LIST.map((u) => `/for/${u.slug}`)];
  let serverUp = false;
  const html = new Map<string, string>();

  beforeAll(async () => {
    try {
      const probe = await fetch(`${BASE_URL}/for`, { redirect: "follow" });
      serverUp = probe.ok;
      if (!serverUp) return;
      html.set("/for", await probe.text());
      for (const path of paths.slice(1)) {
        const res = await fetch(`${BASE_URL}${path}`, { redirect: "follow" });
        if (res.ok) html.set(path, await res.text());
      }
    } catch {
      serverUp = false;
    }
  }, 60_000);

  for (const path of paths) {
    it(`has clean internal anchor text on ${path}`, () => {
      if (!serverUp) return;
      const body = html.get(path);
      expect(body, `${path} did not render`).toBeTruthy();
      const result = lintAnchorText(body!, { siteOrigin: SITE_ORIGIN });
      expect(
        result.issues.map((i) => `${i.code}: "${i.text}" -> ${i.href}`),
        `${path} anchor issues`,
      ).toEqual([]);
    });
  }

  it("links each use-case card to a distinct page with matching text", () => {
    if (!serverUp) return;
    const body = html.get("/for")!;
    const { links } = lintAnchorText(body, { siteOrigin: SITE_ORIGIN });
    for (const useCase of USE_CASE_LIST) {
      const match = links.find((l) => l.href.replace(SITE_ORIGIN, "") === `/for/${useCase.slug}`);
      expect(match, `no link to /for/${useCase.slug}`).toBeTruthy();
      expect(match!.text).toContain(useCase.h1);
      // The destination page renders the same subject as its label promises.
      expect(html.get(`/for/${useCase.slug}`)).toContain(useCase.h1);
    }
  });
});
