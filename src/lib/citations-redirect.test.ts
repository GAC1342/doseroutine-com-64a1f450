/**
 * Regression tests for the citation preview endpoint's SSRF hardening
 * against redirect-based and URL-encoded allowlist bypasses.
 *
 * Threat model recap:
 *  - The allowlist classifier (`classifyCitationUrl`) inspects the ORIGINAL
 *    URL only. If the outbound fetch follows a 3xx redirect, the response
 *    body ends up sourced from an attacker-controlled origin even though
 *    the initial hostname passed the allowlist. Redirects MUST NOT be
 *    followed.
 *  - Percent-encoded hostnames, `@`-userinfo tricks, mixed-case hosts,
 *    IDN/punycode, and raw IPs must all be classified based on the parsed
 *    `URL.hostname`, never on the raw URL string.
 *
 * These tests stub the global `fetch` so no real network I/O happens.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fetchCitationCore } from "./citations.functions";
import { classifyCitationUrl } from "./citation-allowlist";

type FetchInit = RequestInit | undefined;
type FetchArgs = { url: string; init: FetchInit };

function makeFetchSpy(responder: (args: FetchArgs) => Response) {
  const calls: FetchArgs[] = [];
  const spy = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === "string" ? input : input.toString();
    calls.push({ url, init });
    return responder({ url, init });
  });
  vi.stubGlobal("fetch", spy);
  return { spy, calls };
}

function htmlResponse(body: string, status = 200): Response {
  return new Response(body, {
    status,
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}

function redirectResponse(location: string, status = 302): Response {
  // Simulates what workerd/undici return when redirect: "manual" is set:
  // the underlying 3xx status is preserved on the Response.
  return new Response(null, { status, headers: { Location: location } });
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("citation preview — redirect bypass protection", () => {
  it("passes redirect: 'manual' to fetch for allowlisted hosts", async () => {
    const { calls } = makeFetchSpy(() => htmlResponse("<title>ok</title><p>body</p>"));
    await fetchCitationCore("https://medlineplus.gov/vitaminb12.html");
    expect(calls.length).toBeGreaterThan(0);
    for (const c of calls) {
      expect((c.init as RequestInit).redirect).toBe("manual");
    }
  });

  it("refuses to expose a 3xx redirect from an allowlisted host", async () => {
    // Attacker-controlled destination the redirect points at. If the guard
    // regresses, the worker would fetch this URL and surface its body.
    makeFetchSpy(() => redirectResponse("http://169.254.169.254/latest/meta-data/"));
    const result = await fetchCitationCore("https://medlineplus.gov/redirect-me").catch((e) => e);
    // Core throws; the server-fn wrapper converts to a safe error payload.
    // Either way, the internal metadata URL must NEVER be fetched.
    expect(result instanceof Error ? result.message : String(result)).toMatch(/redirect/i);
  });

  it("blocks a 301 redirect that would point to a different allowlisted host", async () => {
    // Even a redirect between two trusted hosts is refused — the classifier
    // approved the ORIGINAL URL, not the destination. This keeps the guard
    // simple (never trust any 3xx) and prevents chained redirect abuse.
    makeFetchSpy(() => redirectResponse("https://www.fda.gov/some/page", 301));
    await expect(fetchCitationCore("https://medlineplus.gov/moved.html")).rejects.toThrow(
      /redirect/i,
    );
  });

  it("blocks a 307 redirect from PubMed's esummary endpoint", async () => {
    // PubMed path uses two parallel fetches; either one returning a 3xx
    // must abort the response, not silently fall through with defaults.
    makeFetchSpy(() => redirectResponse("https://evil.example.com/x", 307));
    await expect(fetchCitationCore("https://pubmed.ncbi.nlm.nih.gov/12345678/")).rejects.toThrow(
      /redirect/i,
    );
  });

  it("treats an opaqueredirect response type as a refusal", async () => {
    // Some fetch implementations mask 3xx as type: "opaqueredirect" when
    // redirect: "manual" is set. The guard must catch that shape too, not
    // just numeric 3xx statuses. We construct a 200 body and override
    // .type to simulate that (Response can't be built with status 0).
    makeFetchSpy(() => {
      const r = new Response("ignored", { status: 200 });
      Object.defineProperty(r, "type", { value: "opaqueredirect" });
      return r;
    });
    await expect(fetchCitationCore("https://www.cdc.gov/moved")).rejects.toThrow(/redirect/i);
  });

  it("never issues a network call when the URL is rejected by the allowlist", async () => {
    // Sanity check: an unlisted host is rejected before any fetch fires,
    // so a "redirect" from the attacker's own server can't matter.
    const { spy } = makeFetchSpy(() => htmlResponse("should not be reached"));
    await expect(fetchCitationCore("https://evil.example.com/anything")).rejects.toThrow(
      /not available/i,
    );
    expect(spy).not.toHaveBeenCalled();
  });
});

describe("citation preview — URL-encoded / spoofed destination bypass", () => {
  it("rejects userinfo@ tricks that visually mimic an allowlisted host", () => {
    // `https://medlineplus.gov@evil.com/x` parses with hostname === "evil.com".
    // The regex-based classifier we replaced would have accepted this.
    const r = classifyCitationUrl("https://medlineplus.gov@evil.com/x");
    expect(r.kind).toBe("reject");
  });

  it("rejects percent-encoded @ that would smuggle an evil host", () => {
    // %40 == "@". URL parser normalizes and the resulting hostname is still
    // the segment after the (decoded) @, which is attacker-controlled.
    const r = classifyCitationUrl("https://medlineplus.gov%40evil.com/x");
    expect(r.kind).toBe("reject");
  });

  it("rejects an allowlisted host appearing only in the path", () => {
    const r = classifyCitationUrl("https://evil.com/pubmed.ncbi.nlm.nih.gov/12345678/");
    expect(r.kind).toBe("reject");
  });

  it("rejects an allowlisted host appearing only in the query string", () => {
    const r = classifyCitationUrl("https://evil.com/x?redirect=https://medlineplus.gov");
    expect(r.kind).toBe("reject");
  });

  it("rejects allowlisted host as a suffix of an attacker-controlled domain", () => {
    // Substring match would accept "notmedlineplus.gov" and
    // "medlineplus.gov.evil.com". Hostname equality does not.
    expect(classifyCitationUrl("https://notmedlineplus.gov/x").kind).toBe("reject");
    expect(classifyCitationUrl("https://medlineplus.gov.evil.com/x").kind).toBe("reject");
  });

  it("rejects raw IPv4 and IPv6 loopback / metadata addresses", () => {
    expect(classifyCitationUrl("http://127.0.0.1/x").kind).toBe("reject");
    expect(classifyCitationUrl("http://169.254.169.254/latest/meta-data").kind).toBe("reject");
    // Decimal/hex encodings of 127.0.0.1 — the URL parser leaves the
    // hostname as-is; it's still not in the allowlist Set.
    expect(classifyCitationUrl("http://0x7f000001/x").kind).toBe("reject");
    expect(classifyCitationUrl("http://2130706433/x").kind).toBe("reject");
    expect(classifyCitationUrl("http://[::1]/x").kind).toBe("reject");
  });

  it("rejects non-http(s) schemes even when the host looks allowlisted", () => {
    expect(classifyCitationUrl("file://medlineplus.gov/etc/passwd").kind).toBe("reject");
    expect(classifyCitationUrl("gopher://medlineplus.gov:70/1").kind).toBe("reject");
    // javascript: URLs don't parse as having a hostname; also rejected.
    expect(classifyCitationUrl("javascript:fetch('https://medlineplus.gov')").kind).toBe("reject");
  });

  it("rejects an IDN / punycode host that visually mimics an allowlisted one", () => {
    // "www.fdа.gov" with a Cyrillic "а" becomes punycode xn--www-fd-... —
    // definitely not in the exact-match allowlist.
    const r = classifyCitationUrl("https://www.fdа.gov/x");
    expect(r.kind).toBe("reject");
  });
});
