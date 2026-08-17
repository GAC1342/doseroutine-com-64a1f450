/**
 * Parameterized regression tests for the shared SSRF-safe URL parser.
 *
 * Each table row locks a specific encoding bypass class the parser must
 * defeat. Adding a new encoding? Add a row here first, watch it fail,
 * then extend `parseSafeUrl` — never the other way around.
 */
import { describe, expect, it } from "vitest";
import { parseSafeUrl } from "./safe-url";

describe("parseSafeUrl — accepts well-formed http(s) URLs", () => {
  const OK_CASES: Array<{ input: string; hostname: string; isIp?: boolean }> = [
    { input: "https://medlineplus.gov/x", hostname: "medlineplus.gov" },
    { input: "http://www.fda.gov/", hostname: "www.fda.gov" },
    { input: "https://PUBMED.ncbi.nlm.nih.gov/12345678/", hostname: "pubmed.ncbi.nlm.nih.gov" },
    { input: "https://www.who.int:443/topics/x", hostname: "www.who.int" },
    // Trailing dot is a valid FQDN form; the parser preserves it so
    // allowlists (which don't include a trailing dot) still reject it.
    // We assert here only that parsing SUCCEEDS with the hostname intact.
    { input: "https://medlineplus.gov./x", hostname: "medlineplus.gov." },
  ];
  it.each(OK_CASES)("parses $input", ({ input, hostname, isIp }) => {
    const r = parseSafeUrl(input);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.hostname).toBe(hostname);
      expect(r.isIpLiteral).toBe(!!isIp);
    }
  });
});

describe("parseSafeUrl — rejects non-http(s) protocols", () => {
  const BAD_PROTOCOLS = [
    "file:///etc/passwd",
    "gopher://medlineplus.gov:70/1",
    "javascript:fetch('https://medlineplus.gov')",
    "data:text/html,<script>alert(1)</script>",
    "ftp://medlineplus.gov/x",
    "ws://medlineplus.gov/x",
    "wss://medlineplus.gov/x",
    "chrome-extension://abcdef/x",
  ];
  it.each(BAD_PROTOCOLS)("rejects %s with bad_protocol", (input) => {
    const r = parseSafeUrl(input);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe("bad_protocol");
  });
});

describe("parseSafeUrl — rejects malformed input", () => {
  const INVALID = ["", "not-a-url", "http://", "://noscheme.com", "https://[not-ipv6"];
  it.each(INVALID)("rejects %s as invalid_url", (input) => {
    const r = parseSafeUrl(input);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe("invalid_url");
  });
});

describe("parseSafeUrl — rejects userinfo smuggling", () => {
  const USERINFO_CASES = [
    "https://medlineplus.gov@evil.com/x",
    "https://user:pass@medlineplus.gov/x",
    "https://:pw@medlineplus.gov/x",
    "https://medlineplus.gov%40evil.com/x", // %40 decoded == "@"
  ];
  it.each(USERINFO_CASES)("rejects %s", (input) => {
    const r = parseSafeUrl(input);
    expect(r.ok).toBe(false);
    // Either has_userinfo (when the @ resolves to userinfo) or bad_protocol/host —
    // the important invariant is that we never return ok:true.
    if (!r.ok) {
      expect(["has_userinfo", "invalid_url", "empty_host"]).toContain(r.reason);
    }
  });
});

describe("parseSafeUrl — flags IPv4 literals in every encoding", () => {
  const IPV4_CASES = [
    // dotted-decimal
    "http://127.0.0.1/x",
    "http://169.254.169.254/latest/meta-data",
    "http://10.0.0.1/",
    // integer form
    "http://2130706433/x",
    // hex whole-integer
    "http://0x7f000001/x",
    // dotted hex components
    "http://0x7f.0x0.0x0.0x1/x",
    // dotted octal components
    "http://0177.0.0.1/x",
    // mixed decimal + hex
    "http://127.0.0.0x1/x",
  ];
  it.each(IPV4_CASES)("flags %s as IP literal", (input) => {
    const r = parseSafeUrl(input);
    // Some encodings may be rejected as invalid_url by strict URL parsers;
    // if the URL parses at all, isIpLiteral MUST be true.
    if (r.ok) {
      expect(r.isIpLiteral, `${input} → hostname ${r.hostname}`).toBe(true);
    } else {
      expect(r.reason).toBe("invalid_url");
    }
  });
});

describe("parseSafeUrl — flags IPv6 literals", () => {
  const IPV6_CASES = [
    "http://[::1]/x",
    "http://[::]/x",
    "http://[fe80::1]/x",
    "http://[2001:db8::1]:8080/x",
    // IPv4-mapped IPv6
    "http://[::ffff:127.0.0.1]/x",
  ];
  it.each(IPV6_CASES)("flags %s as IP literal", (input) => {
    const r = parseSafeUrl(input);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.isIpLiteral).toBe(true);
  });
});

describe("parseSafeUrl — does NOT confuse text hostnames with IP literals", () => {
  const HOSTNAMES = [
    "https://medlineplus.gov/",
    "https://www.fda.gov/",
    "https://a.b.c.d/", // 4 non-numeric parts — not an IP
    "https://123abc.example.com/", // numeric prefix but text overall
    "https://v6.example.com/",
  ];
  it.each(HOSTNAMES)("keeps %s as a text hostname", (input) => {
    const r = parseSafeUrl(input);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.isIpLiteral).toBe(false);
  });
});

describe("parseSafeUrl — normalizes mixed Unicode / IDN hostnames", () => {
  // The WHATWG URL parser converts IDN to punycode automatically. The
  // resulting hostname must not equal any Latin allowlist entry, so an
  // upstream allowlist Set-membership check will reject it.
  const UNICODE_CASES: Array<{ input: string; expectedHostContains: string }> = [
    // Cyrillic "а" masquerading as Latin "a" in fda.gov
    { input: "https://www.fdа.gov/x", expectedHostContains: "xn--" },
    // Full Cyrillic domain
    { input: "https://пример.рф/x", expectedHostContains: "xn--" },
    // Mixed-case + IDN
    { input: "HTTPS://MedlinePlus.GOV/X", expectedHostContains: "medlineplus.gov" },
    // Emoji domain (some parsers accept via IDN)
    { input: "https://i❤.ws/x", expectedHostContains: "xn--" },
  ];
  it.each(UNICODE_CASES)("normalizes $input", ({ input, expectedHostContains }) => {
    const r = parseSafeUrl(input);
    // Emoji domains may or may not parse depending on the runtime; either
    // outcome is safe — we just require that NO Unicode input smuggles a
    // Latin allowlist match.
    if (r.ok) {
      expect(r.hostname).toContain(expectedHostContains);
      // Uppercase-of-a-real-allowlist entry SHOULD normalize to the
      // canonical lowercase host; every other Unicode case must NOT
      // resolve to any allowlisted host.
      if (input.toLowerCase().includes("medlineplus.gov")) {
        expect(r.hostname).toBe("medlineplus.gov");
      } else {
        expect(r.hostname).not.toBe("www.fda.gov");
        expect(r.hostname).not.toBe("medlineplus.gov");
      }
    } else {
      expect(r.reason).toBe("invalid_url");
    }
  });
});

describe("parseSafeUrl — hostname is always lowercased", () => {
  const CASES = [
    ["https://EXAMPLE.COM/", "example.com"],
    ["https://Mixed.Case.EXAMPLE.org/", "mixed.case.example.org"],
  ] as const;
  it.each(CASES)("lowercases %s → %s", (input, expected) => {
    const r = parseSafeUrl(input);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.hostname).toBe(expected);
  });
});
