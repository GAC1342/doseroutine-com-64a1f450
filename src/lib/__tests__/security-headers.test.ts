import { describe, expect, it } from "vitest";
import {
  HSTS_VALUE,
  PERMISSIONS_POLICY,
  REFERRER_POLICY,
  applyNonceToHtml,
  buildContentSecurityPolicy,
  buildSecurityHeaders,
  computeScriptHashes,
  createNonce,
  secureResponse,
} from "../security-headers";

const prodUrl = new URL("https://doseroutine.com/library/creatine");

function directive(csp: string, name: string): string | undefined {
  return csp
    .split(";")
    .map((part) => part.trim())
    .find((part) => part === name || part.startsWith(`${name} `));
}

describe("security headers", () => {
  it("sets the baseline hardening headers on every response", () => {
    const headers = buildSecurityHeaders({ url: prodUrl, isHtml: true, nonce: "abc" });
    expect(headers["X-Content-Type-Options"]).toBe("nosniff");
    expect(headers["Referrer-Policy"]).toBe(REFERRER_POLICY);
    expect(headers["Strict-Transport-Security"]).toBe(HSTS_VALUE);
    expect(headers["X-Frame-Options"]).toBe("DENY");
    expect(headers["Permissions-Policy"]).toBe(PERMISSIONS_POLICY);
    expect(headers["Cross-Origin-Opener-Policy"]).toBe("same-origin");
  });

  it("still hardens non-HTML responses, minus the document-only rules", () => {
    const headers = buildSecurityHeaders({ url: prodUrl, isHtml: false });
    expect(headers["X-Content-Type-Options"]).toBe("nosniff");
    expect(headers["Referrer-Policy"]).toBe(REFERRER_POLICY);
    expect(headers["Content-Security-Policy"]).toBeUndefined();
  });

  it("never pins HSTS on a plain-http origin", () => {
    const headers = buildSecurityHeaders({ url: new URL("http://localhost:8080/"), isHtml: true });
    expect(headers["Strict-Transport-Security"]).toBeUndefined();
  });

  it("enforces CSP in production and only reports in dev", () => {
    expect(
      buildSecurityHeaders({ url: prodUrl, isHtml: true, nonce: "abc" })["Content-Security-Policy"],
    ).toBeTruthy();
    const dev = buildSecurityHeaders({ url: prodUrl, isHtml: true, dev: true });
    expect(dev["Content-Security-Policy"]).toBeUndefined();
    expect(dev["Content-Security-Policy-Report-Only"]).toBeTruthy();
  });
});

describe("content security policy", () => {
  const csp = buildContentSecurityPolicy({ nonce: "n0nce" });

  it("locks down the dangerous directives", () => {
    expect(directive(csp, "default-src")).toBe("default-src 'self'");
    expect(directive(csp, "object-src")).toBe("object-src 'none'");
    expect(directive(csp, "frame-ancestors")).toBe("frame-ancestors 'none'");
    expect(directive(csp, "base-uri")).toBe("base-uri 'self'");
    expect(directive(csp, "form-action")).toBe("form-action 'self'");
    expect(csp).toContain("upgrade-insecure-requests");
  });

  it("uses a nonce with strict-dynamic and never unsafe-inline scripts", () => {
    const scriptSrc = directive(csp, "script-src")!;
    expect(scriptSrc).toContain("'nonce-n0nce'");
    expect(scriptSrc).toContain("'strict-dynamic'");
    expect(scriptSrc).not.toContain("'unsafe-inline'");
    expect(scriptSrc).not.toContain("'unsafe-eval'");
  });

  it("allows only the origins the browser actually needs", () => {
    expect(directive(csp, "connect-src")).toContain("https://*.supabase.co");
    expect(directive(csp, "img-src")).toContain("https://wsrv.nl");
    expect(directive(csp, "img-src")).toContain("blob:");
    // Third-party blog SDK (script + payload fetches) must stay reachable.
    expect(directive(csp, "connect-src")).not.toContain("*;");
    expect(directive(csp, "connect-src")).not.toContain("ws:");
  });

  it("relaxes scripts and websockets in dev only", () => {
    const devCsp = buildContentSecurityPolicy({ dev: true });
    expect(directive(devCsp, "script-src")).toContain("'unsafe-eval'");
    expect(directive(devCsp, "connect-src")).toContain("ws:");
    expect(devCsp).not.toContain("upgrade-insecure-requests");
  });
});

describe("script hashes", () => {
  it("hashes inline scripts and skips src scripts", async () => {
    const html = `<script>boot()</script><script src="/a.js"></script>`;
    const hashes = await computeScriptHashes(html);
    expect(hashes).toHaveLength(1);
    expect(hashes[0]).toMatch(/^sha256-/);
  });

  it("puts the hashes in script-src with strict-dynamic and no unsafe-inline", async () => {
    const hashes = await computeScriptHashes("<script>boot()</script>");
    const csp = buildContentSecurityPolicy({ scriptHashes: hashes });
    const scriptSrc = directive(csp, "script-src")!;
    expect(scriptSrc).toContain(`'${hashes[0]}'`);
    expect(scriptSrc).toContain("'strict-dynamic'");
    expect(scriptSrc).not.toContain("'unsafe-inline'");
  });
});

describe("nonce stamping", () => {
  it("mints a fresh random nonce each call", () => {
    const a = createNonce();
    const b = createNonce();
    expect(a).not.toBe(b);
    expect(a.length).toBeGreaterThanOrEqual(16);
  });

  it("adds the nonce to every script tag", () => {
    const html = `<html><body><script>hydrate()</script><script src="/a.js" type="module"></script></body></html>`;
    const out = applyNonceToHtml(html, "N1");
    expect(out).toContain(`<script nonce="N1">hydrate()</script>`);
    expect(out).toContain(`<script nonce="N1" src="/a.js" type="module">`);
  });

  it("leaves an existing nonce and the document body untouched", () => {
    const html = `<p>use a &lt;script&gt; tag</p><script nonce="keep">x</script>`;
    expect(applyNonceToHtml(html, "N2")).toBe(html);
  });

  it("does not confuse attribute text for a tag boundary", () => {
    const html = `<script data-x="a>b">y</script>`;
    expect(applyNonceToHtml(html, "N3")).toBe(`<script nonce="N3" data-x="a>b">y</script>`);
  });
});

describe("secureResponse", () => {
  const htmlResponse = () =>
    new Response("<html><head><script>boot()</script></head><body>hi</body></html>", {
      headers: { "content-type": "text/html; charset=utf-8" },
    });

  it("nonces the inline scripts in the body and the policy", async () => {
    const out = await secureResponse(new Request("https://doseroutine.com/"), htmlResponse());
    const csp = out.headers.get("content-security-policy")!;
    expect(csp).toMatch(/'nonce-[A-Za-z0-9+/=]+'/);
    expect(csp).toContain("'strict-dynamic'");
    expect(out.headers.get("content-security-policy-report-only")).toBeNull();
    const body = await out.text();
    const nonce = /'nonce-([A-Za-z0-9+/=]+)'/.exec(csp)![1];
    expect(body).toContain(`<script nonce="${nonce}">boot()</script>`);
  });

  it("uses a fresh nonce for every response", async () => {
    const read = async () =>
      (await secureResponse(new Request("https://doseroutine.com/"), htmlResponse())).headers.get(
        "content-security-policy",
      );
    expect(await read()).not.toBe(await read());
  });

  it("reports only and leaves the body alone in dev", async () => {
    const out = await secureResponse(new Request("http://localhost:8080/"), htmlResponse(), {
      dev: true,
    });
    expect(out.headers.get("content-security-policy")).toBeNull();
    expect(out.headers.get("content-security-policy-report-only")).toBeTruthy();
    expect(await out.text()).not.toContain("nonce=");
  });

  it("hardens JSON without CSP or body rewriting", async () => {
    const out = await secureResponse(
      new Request("https://doseroutine.com/api/x"),
      new Response('{"ok":true}', { headers: { "content-type": "application/json" } }),
    );
    expect(out.headers.get("x-content-type-options")).toBe("nosniff");
    expect(out.headers.get("content-security-policy")).toBeNull();
    expect(await out.text()).toBe('{"ok":true}');
  });

  it("passes a 304 through without touching the body", async () => {
    const out = await secureResponse(
      new Request("https://doseroutine.com/"),
      new Response(null, { status: 304, headers: { "content-type": "text/html" } }),
    );
    expect(out.status).toBe(304);
    expect(out.headers.get("strict-transport-security")).toBe(HSTS_VALUE);
  });
});
