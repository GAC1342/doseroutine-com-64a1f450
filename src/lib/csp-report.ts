/**
 * Normalisation for browser CSP violation reports.
 *
 * Browsers send three different shapes at this endpoint:
 *   • legacy `report-uri`      → { "csp-report": { "blocked-uri": ... } }
 *   • Reporting API `report-to`→ [ { type: "csp-violation", body: {...} } ]
 *   • Reporting API (single)   → { type: "csp-violation", body: {...} }
 *
 * We flatten all three into one record so a single log line / alert query
 * covers every browser. Kept dependency-free and pure so it can be unit tested
 * without a Worker runtime.
 */

export type NormalizedCspReport = {
  documentUrl: string | null;
  blockedUrl: string | null;
  violatedDirective: string | null;
  effectiveDirective: string | null;
  disposition: string | null;
  statusCode: number | null;
  sourceFile: string | null;
  lineNumber: number | null;
  sample: string | null;
};

function str(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  // Reports are attacker-influencable text that lands in our logs. Cap length
  // and strip control characters so nothing can forge extra log lines.
  // eslint-disable-next-line no-control-regex -- stripping control bytes is the point.
  return trimmed.replace(/[\u0000-\u001f\u007f]/g, " ").slice(0, 512);
}

function num(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function fromBody(body: Record<string, unknown>): NormalizedCspReport {
  return {
    documentUrl: str(body["document-uri"] ?? body["documentURL"] ?? body["documentUri"]),
    blockedUrl: str(body["blocked-uri"] ?? body["blockedURL"] ?? body["blockedUri"]),
    violatedDirective: str(body["violated-directive"] ?? body["violatedDirective"]),
    effectiveDirective: str(body["effective-directive"] ?? body["effectiveDirective"]),
    disposition: str(body["disposition"]),
    statusCode: num(body["status-code"] ?? body["statusCode"]),
    sourceFile: str(body["source-file"] ?? body["sourceFile"]),
    lineNumber: num(body["line-number"] ?? body["lineNumber"]),
    sample: str(body["script-sample"] ?? body["sample"]),
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

/** Parse any supported payload shape into zero or more normalised reports. */
export function parseCspReports(payload: unknown): NormalizedCspReport[] {
  if (Array.isArray(payload)) {
    return payload.flatMap((entry) => parseCspReports(entry));
  }
  if (!isRecord(payload)) return [];

  if (isRecord(payload["csp-report"])) {
    return [fromBody(payload["csp-report"])];
  }
  if (isRecord(payload["body"])) {
    const type = payload["type"];
    if (typeof type === "string" && type !== "csp-violation") return [];
    return [fromBody(payload["body"])];
  }
  // Some browsers post the body fields at the top level.
  if ("blocked-uri" in payload || "blockedURL" in payload || "violated-directive" in payload) {
    return [fromBody(payload)];
  }
  return [];
}

/**
 * Violations we deliberately don't page on. Browser extensions and injected
 * page-translation scripts generate a constant background of `chrome-extension:`
 * / `about:` / inline-eval noise that has nothing to do with our policy.
 */
const IGNORED_BLOCKED_PREFIXES = [
  "chrome-extension:",
  "moz-extension:",
  "safari-extension:",
  "safari-web-extension:",
  "webkit-masked-url:",
  "about:",
];

export function isNoiseReport(report: NormalizedCspReport): boolean {
  const blocked = (report.blockedUrl ?? "").toLowerCase();
  const source = (report.sourceFile ?? "").toLowerCase();
  return IGNORED_BLOCKED_PREFIXES.some(
    (prefix) => blocked.startsWith(prefix) || source.startsWith(prefix),
  );
}

/**
 * True for the class of failure we specifically want to hear about: a
 * first-party script that our own policy blocked (the `/~flock.js` regression).
 */
export function isFirstPartyScriptBlock(report: NormalizedCspReport, origin: string): boolean {
  const directive = report.effectiveDirective ?? report.violatedDirective ?? "";
  if (!directive.startsWith("script-src")) return false;
  const blocked = report.blockedUrl ?? "";
  if (!blocked) return false;
  if (blocked === "inline" || blocked === "eval" || blocked === "self") return true;
  return blocked.startsWith("/") || blocked.startsWith(origin);
}
