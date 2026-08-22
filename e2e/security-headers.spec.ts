import { test, expect } from "@playwright/test";

/**
 * Security headers contract, read straight off the HTTP response.
 *
 * In dev the CSP ships as Content-Security-Policy-Report-Only (Vite's client
 * needs eval and a websocket); in a production build it is enforced with a
 * per-response nonce. Both shapes are accepted here — what must never regress
 * is the presence of the policy and of the transport/sniffing/referrer rules.
 */
const HTML_ROUTES = ["/", "/blog", "/library/creatine"];

function cspOf(headers: Record<string, string>): string {
  return headers["content-security-policy"] ?? headers["content-security-policy-report-only"] ?? "";
}

for (const route of HTML_ROUTES) {
  test(`security headers on ${route}`, async ({ request }) => {
    const res = await request.get(route, { headers: { accept: "text/html" } });
    expect(res.status()).toBe(200);
    const headers = res.headers();

    expect(headers["x-content-type-options"]).toBe("nosniff");
    expect(headers["referrer-policy"]).toBe("strict-origin-when-cross-origin");
    expect(headers["x-frame-options"]).toBe("DENY");
    expect(headers["permissions-policy"]).toContain("geolocation=()");

    const csp = cspOf(headers);
    expect(csp, "a content security policy must be present").toBeTruthy();
    expect(csp).toContain("default-src 'self'");
    expect(csp).toContain("object-src 'none'");
    expect(csp).toContain("frame-ancestors 'none'");
    expect(csp).toContain("base-uri 'self'");

    // https origins carry HSTS; a plain-http dev origin must not.
    const isHttps = new URL(res.url()).protocol === "https:";
    if (isHttps) {
      expect(headers["strict-transport-security"]).toContain("max-age=");
      expect(headers["strict-transport-security"]).toContain("includeSubDomains");
    } else {
      expect(headers["strict-transport-security"]).toBeUndefined();
    }
  });
}

test("enforced production CSP carries a nonce for every script", async ({ request }) => {
  const res = await request.get("/", { headers: { accept: "text/html" } });
  const headers = res.headers();
  const enforced = headers["content-security-policy"];
  test.skip(!enforced, "dev server reports instead of enforcing");

  const nonce = /'nonce-([^']+)'/.exec(enforced!)?.[1];
  expect(nonce, "enforced policy must use a nonce").toBeTruthy();
  expect(enforced).toContain("'strict-dynamic'");
  expect(enforced).not.toContain("'unsafe-eval'");

  const html = await res.text();
  const scripts = Array.from(html.matchAll(/<script(?=[\s>])[^>]*>/gi)).map((m) => m[0]);
  expect(scripts.length).toBeGreaterThan(0);
  for (const tag of scripts) {
    expect(tag, "every rendered script needs the nonce or it will be blocked").toContain(
      `nonce="${nonce}"`,
    );
  }
});

test("static assets are hardened but skip the document-only rules", async ({ request }) => {
  const doc = await request.get("/");
  test.skip(
    Boolean(doc.headers()["content-security-policy-report-only"]),
    "dev serves assets straight from Vite, bypassing the worker that sets headers",
  );

  const html = await doc.text();
  const asset = /src="(\/[^"]+\.js)"/.exec(html)?.[1] ?? /href="(\/[^"]+\.css)"/.exec(html)?.[1];
  test.skip(!asset, "no static asset referenced in the document");

  const res = await request.get(asset!);
  expect(res.status()).toBe(200);
  expect(res.headers()["x-content-type-options"]).toBe("nosniff");
  // Document-only rules do not belong on a subresource.
  expect(res.headers()["content-security-policy"]).toBeUndefined();
});
