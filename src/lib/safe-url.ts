/**
 * SSRF-safe URL parser shared by the citation preview allowlist and any
 * other server-side fetcher that accepts caller-supplied URLs.
 *
 * The goal is a SINGLE choke point for URL parsing so that:
 *  - Every consumer applies the same protocol/userinfo/hostname rules.
 *  - Fixes to encoding bypasses land in one place.
 *  - Parameterized regression tests in `safe-url.test.ts` lock behavior.
 *
 * Rules enforced:
 *  - Only http: and https: are accepted. file:, gopher:, javascript:,
 *    data:, ftp:, ws(s): are rejected up front.
 *  - Userinfo (username/password) is rejected outright. Otherwise
 *    `https://allowed.example@evil.com/…` would parse with hostname
 *    "evil.com" but read as trusted by a naive substring check upstream.
 *  - Hostname must be non-empty and is lowercased for exact-match
 *    comparisons against allowlist Sets.
 *  - IP literals (dotted-decimal, dotted-octal, dotted-hex, integer,
 *    IPv6 in brackets) are detected and flagged so allowlists can
 *    reject them without ever adding an IP to the trusted set.
 */

export type SafeUrlResult =
  | {
      ok: true;
      url: URL;
      /** Lowercased hostname exactly as WHATWG URL exposed it (no brackets stripped). */
      hostname: string;
      /** True if the hostname is any IPv4/IPv6 literal form the URL parser accepts. */
      isIpLiteral: boolean;
    }
  | {
      ok: false;
      reason: "invalid_url" | "bad_protocol" | "has_userinfo" | "empty_host";
    };

const ALLOWED_PROTOCOLS = new Set(["http:", "https:"]);

/**
 * Detect whether a WHATWG-normalized hostname is an IP literal in ANY of
 * the encodings the URL parser leaves intact.
 *
 * The WHATWG URL parser normalizes dotted-decimal IPv4 (`127.0.0.1`) and
 * IPv6-in-brackets (`[::1]`) but preserves less common encodings verbatim
 * so callers can still reason about them:
 *   - integer:     `2130706433`               → 127.0.0.1
 *   - hex:         `0x7f000001` / `0x7f.0.0.1`
 *   - octal:       `0177.0.0.1`
 *   - mixed:       `0x7f.0.0.01`
 * All of these must count as "IP literal" so the citation allowlist can
 * refuse them without ever whitelisting an IP.
 */
function isIpLiteral(host: string): boolean {
  if (!host) return false;
  // IPv6 literals are wrapped in brackets by the URL parser.
  if (host.startsWith("[") && host.endsWith("]")) return true;
  // Whole-integer IPv4 (e.g. "2130706433" or "0x7f000001").
  if (/^\d+$/.test(host)) return true;
  if (/^0x[0-9a-f]+$/i.test(host)) return true;
  // Dotted IPv4 in decimal, octal (leading 0), or hex (0x…) components.
  // 2–4 components covers the historically-valid IPv4 shorthand forms.
  const parts = host.split(".");
  if (parts.length >= 2 && parts.length <= 4) {
    const isNumericPart = (p: string) =>
      p !== "" && (/^0x[0-9a-f]+$/i.test(p) || /^0[0-7]*$/.test(p) || /^[1-9][0-9]*$/.test(p));
    if (parts.every(isNumericPart)) return true;
  }
  return false;
}

/**
 * Parse `input` through the WHATWG URL API and enforce SSRF-safety
 * invariants. Returns a discriminated union; callers should only trust
 * `result.hostname` when `result.ok === true` AND `result.isIpLiteral`
 * matches their allowlist policy.
 */
export function parseSafeUrl(input: string): SafeUrlResult {
  let url: URL;
  try {
    url = new URL(input);
  } catch {
    return { ok: false, reason: "invalid_url" };
  }
  if (!ALLOWED_PROTOCOLS.has(url.protocol)) {
    return { ok: false, reason: "bad_protocol" };
  }
  if (url.username !== "" || url.password !== "") {
    return { ok: false, reason: "has_userinfo" };
  }
  const hostname = url.hostname.toLowerCase();
  if (hostname.length === 0) {
    return { ok: false, reason: "empty_host" };
  }
  return { ok: true, url, hostname, isIpLiteral: isIpLiteral(hostname) };
}
