/**
 * Canonicalization guard.
 *
 * The edge worker in src/server.ts must 301-redirect every non-canonical
 * variant of a public URL to its single canonical form so we never serve
 * duplicate content:
 *
 *   - www.doseroutine.com  ->  doseroutine.com  (301, path preserved)
 *   - trailing slash       ->  no trailing slash (301, "/" is exempt)
 *   - both at once         ->  single 301 to canonical host + no slash
 *
 * These redirects run before the SSR entry is imported, so the tests can
 * exercise `default.fetch` directly without booting TanStack Start.
 */

import { describe, it, expect, vi, beforeAll, afterAll } from "vitest";
import server from "../../server";

async function head(url: string, init?: RequestInit) {
  return server.fetch(new Request(url, { method: "GET", ...init }), {}, {});
}

/**
 * Non-redirect requests fall through to the SSR entry, which cannot be
 * imported in this unit context (the bundled `#tanstack-router-entry`
 * specifier only exists in a real build). That path is expected here, so we
 * assert it deliberately instead of letting a genuine live 500 hide behind a
 * permissive `if (res.status === 301)` branch.
 */
async function expectPassThroughToSsr(res: Response) {
  expect(res.status, "canonical URL must never be canonicalised again").not.toBe(301);
  expect([200, 500]).toContain(res.status);
  if (res.status === 500) {
    // The wrapper in src/server.ts must convert the h3-swallowed JSON error
    // into the branded HTML fallback rather than leaking `{"unhandled":true}`.
    expect(res.headers.get("content-type") ?? "").toContain("text/html");
    await expect(res.text()).resolves.not.toContain('"unhandled":true');
  }
}

// src/server.ts intentionally console.errors the swallowed SSR error. That is
// correct production behaviour; keep it out of the test output.
let errorSpy: ReturnType<typeof vi.spyOn>;
beforeAll(() => {
  errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
});
afterAll(() => {
  errorSpy.mockRestore();
});

describe("canonical URL redirects", () => {
  it.each(["/library", "/library/mens-health", "/help", "/interaction-checker", "/vs/medisafe"])(
    "redirects www.doseroutine.com%s to apex host (301)",
    async (path) => {
      const res = await head(`https://www.doseroutine.com${path}`);
      expect(res.status).toBe(301);
      expect(res.headers.get("location")).toBe(`https://doseroutine.com${path}`);
    },
  );

  it.each([
    "/library/",
    "/library/mens-health/",
    "/help/",
    "/vs/medisafe/",
    "/interaction-checker/",
  ])("strips trailing slash from %s (301)", async (path) => {
    const res = await head(`https://doseroutine.com${path}`);
    expect(res.status).toBe(301);
    const loc = new URL(res.headers.get("location")!);
    expect(loc.pathname).toBe(path.replace(/\/+$/, ""));
    expect(loc.pathname.endsWith("/")).toBe(false);
  });

  it("keeps the root path '/' unredirected (not a trailing-slash case)", async () => {
    const res = await head("https://doseroutine.com/");
    // Root must not 301 to an empty path — it either renders or falls through
    // to the SSR entry, but it must never be one of our canonicalization 301s.
    await expectPassThroughToSsr(res);
  });

  it("combines host + trailing-slash fixes into one 301", async () => {
    const res = await head("https://www.doseroutine.com/library/mens-health/");
    expect(res.status).toBe(301);
    const loc = new URL(res.headers.get("location")!);
    expect(loc.hostname).toBe("doseroutine.com");
    expect(loc.pathname).toBe("/library/mens-health");
  });

  it("preserves query strings across the host redirect", async () => {
    const res = await head("https://www.doseroutine.com/library?q=creatine");
    expect(res.status).toBe(301);
    const loc = new URL(res.headers.get("location")!);
    expect(loc.hostname).toBe("doseroutine.com");
    expect(loc.pathname).toBe("/library");
    expect(loc.searchParams.get("q")).toBe("creatine");
  });

  it("preserves query strings across the trailing-slash redirect", async () => {
    const res = await head("https://doseroutine.com/library/?q=creatine");
    expect(res.status).toBe(301);
    const loc = new URL(res.headers.get("location")!);
    expect(loc.pathname).toBe("/library");
    expect(loc.searchParams.get("q")).toBe("creatine");
  });

  it("does not 301 an already-canonical URL back onto itself", async () => {
    // If a canonical URL 301s, we have a redirect loop.
    const res = await head("https://doseroutine.com/library");
    await expectPassThroughToSsr(res);
  });
});

describe("legacy ?lang= parameter", () => {
  it.each([
    "/interactions/ala-and-metformin?lang=pt",
    "/calculators?lang=de",
    "/dosage-units-guide?lang=nl",
  ])("301-redirects %s to the clean URL", async (path) => {
    const res = await head(`https://doseroutine.com${path}`);
    expect(res.status).toBe(301);
    const loc = new URL(res.headers.get("location")!);
    expect(loc.searchParams.has("lang")).toBe(false);
    expect(loc.pathname).toBe(path.split("?")[0]);
  });

  it("preserves other query params while dropping lang", async () => {
    const res = await head("https://doseroutine.com/library?lang=fr&q=test");
    expect(res.status).toBe(301);
    const loc = new URL(res.headers.get("location")!);
    expect(loc.searchParams.get("q")).toBe("test");
    expect(loc.searchParams.has("lang")).toBe(false);
  });
});
