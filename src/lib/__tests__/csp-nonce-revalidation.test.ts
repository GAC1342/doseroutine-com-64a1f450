import { describe, expect, it } from "vitest";
import { addHtmlValidators } from "@/server";
import { secureResponse } from "@/lib/security-headers";

/**
 * Guards the exact failure that blanked the published site: a cached HTML body
 * keeps the nonce from its original 200, so a revalidation (304) must never
 * hand the browser a *different* Content-Security-Policy. If it does, every
 * inline startup script is refused and the page renders blank.
 */

const HTML = `<!DOCTYPE html><html><head><script>window.__BOOT__=1</script></head>
<body><div id="root">hi</div><script type="module" src="/_build/app.js"></script>
<script>window.__ROUTER__={u:1786509766624}</script></body></html>`;

function htmlResponse() {
  return new Response(HTML, {
    status: 200,
    headers: { "content-type": "text/html; charset=utf-8" },
  });
}

function req(headers: Record<string, string> = {}) {
  return new Request("https://doseroutine.com/", { headers });
}

/** Full origin pipeline: security headers first, then validators (as in src/server.ts). */
async function serve(request: Request) {
  const secured = await secureResponse(request, htmlResponse());
  return addHtmlValidators(request, secured);
}

function nonceOf(csp: string | null): string | null {
  return csp?.match(/'nonce-([^']+)'/)?.[1] ?? null;
}

describe("CSP nonce vs. cached HTML", () => {
  it("stamps every inline script with the nonce advertised in the header", async () => {
    const res = await serve(req());
    const body = await res.text();
    const headerNonce = nonceOf(res.headers.get("content-security-policy"));

    expect(headerNonce).toBeTruthy();

    const inline = [...body.matchAll(/<script((?:[^>"']|"[^"]*"|'[^']*')*)>/gi)]
      .map((m) => m[1] ?? "")
      .filter((attrs) => !/\bsrc\s*=/i.test(attrs));

    expect(inline.length).toBeGreaterThan(0);
    for (const attrs of inline) {
      expect(attrs).toContain(`nonce="${headerNonce}"`);
    }
  });

  it("produces a stable ETag even though the nonce changes per response", async () => {
    const a = await serve(req());
    const b = await serve(req());

    const nonceA = nonceOf(a.headers.get("content-security-policy"));
    const nonceB = nonceOf(b.headers.get("content-security-policy"));

    expect(nonceA).not.toBe(nonceB);
    expect(a.headers.get("etag")).toBe(b.headers.get("etag"));
  });

  it("never sends a fresh policy on a 304, so cached HTML keeps a matching CSP", async () => {
    const first = await serve(req());
    const etag = first.headers.get("etag")!;
    const cachedCsp = first.headers.get("content-security-policy")!;
    const cachedBody = await first.text();

    const revalidated = await serve(req({ "if-none-match": etag }));

    expect(revalidated.status).toBe(304);
    expect(revalidated.headers.get("content-security-policy")).toBeNull();
    expect(revalidated.headers.get("content-security-policy-report-only")).toBeNull();
    expect(revalidated.headers.get("reporting-endpoints")).toBeNull();

    // The browser therefore keeps `cachedCsp`, which still matches the nonce
    // baked into `cachedBody` — no refused scripts, no blank render.
    const cachedNonce = nonceOf(cachedCsp)!;
    expect(cachedBody).toContain(`nonce="${cachedNonce}"`);
  });

  it("invalidates the cached copy when the HTML content actually changes", async () => {
    const base = await serve(req());
    const changed = await addHtmlValidators(
      req(),
      await secureResponse(
        req(),
        new Response(HTML.replace("hi", "different content"), {
          status: 200,
          headers: { "content-type": "text/html; charset=utf-8" },
        }),
      ),
    );

    expect(changed.headers.get("etag")).not.toBe(base.headers.get("etag"));
    expect(changed.status).toBe(200);
  });
});
