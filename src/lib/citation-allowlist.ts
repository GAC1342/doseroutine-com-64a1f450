/**
 * Pure allowlist logic for the citation preview endpoint.
 *
 * Extracted so the SSRF guard is unit-testable without going through the
 * server-function RPC layer. Both this module and the server function
 * (`src/lib/citations.functions.ts`) must stay in sync — regression tests
 * in `citation-allowlist.test.ts` lock the behavior.
 *
 * URL parsing is delegated to `parseSafeUrl` in `./safe-url` so every
 * SSRF-sensitive callsite shares the same protocol / userinfo / IP-literal
 * checks. Never re-implement URL parsing here.
 */

import { parseSafeUrl } from "./safe-url";

export const PUBMED_HOST = "pubmed.ncbi.nlm.nih.gov";
export const PUBMED_PATH_RE = /^\/(\d{5,9})(?:\/|$)/;
export const ODS_HOSTS: ReadonlySet<string> = new Set(["ods.od.nih.gov", "www.ods.od.nih.gov"]);
export const GENERIC_ALLOWED_HOSTS: ReadonlySet<string> = new Set([
  // Government / public-health databases
  "medlineplus.gov",
  "dailymed.nlm.nih.gov",
  "www.ncbi.nlm.nih.gov",
  "pmc.ncbi.nlm.nih.gov",
  "pubchem.ncbi.nlm.nih.gov",
  "clinicaltrials.gov",
  "www.clinicaltrials.gov",
  "www.fda.gov",
  "www.cdc.gov",
  "www.who.int",
  "www.ema.europa.eu",
  "www.nhs.uk",
  // Clinical reference / patient monographs
  "www.mayoclinic.org",
  "my.clevelandclinic.org",
  "www.cochrane.org",
  "www.cochranelibrary.com",
  "go.drugbank.com",
  "lpi.oregonstate.edu",
  "www.wada-ama.org",
  "examine.com",
  "www.examine.com",
  // Peer-reviewed publishers and persistent identifiers
  "doi.org",
  "dx.doi.org",
  "europepmc.org",
  "www.europepmc.org",
  "www.thelancet.com",
  "www.nejm.org",
  "jamanetwork.com",
  "www.bmj.com",
  "www.nature.com",
  "www.sciencedirect.com",
  "link.springer.com",
  "onlinelibrary.wiley.com",
  "www.frontiersin.org",
  "www.mdpi.com",
  "journals.plos.org",
  "www.cell.com",
  "academic.oup.com",
  "www.ahajournals.org",
  "diabetesjournals.org",
  "en.wikipedia.org",
]);

export type CitationTarget =
  | { kind: "pubmed"; host: string; pmid: string }
  | { kind: "ods"; host: string }
  | { kind: "generic"; host: string }
  | { kind: "reject"; reason: string };

/**
 * Classify a citation URL against the SSRF-safe allowlist.
 *
 * Rules (must match the server function):
 *  - Delegates URL parsing to `parseSafeUrl` (single SSRF-safe parser).
 *  - Host is derived from `URL.hostname`, never from a substring of the
 *    raw URL string.
 *  - IP literals in ANY encoding (decimal, octal, hex, integer, IPv6)
 *    are rejected before allowlist membership is checked.
 *  - Host must appear in an exact-match allowlist (Set membership).
 *  - PubMed PMIDs are parsed from `pathname`, not the full URL string.
 */
export function classifyCitationUrl(url: string): CitationTarget {
  const parsed = parseSafeUrl(url);
  if (!parsed.ok) {
    // Map safe-url reasons to the allowlist's error taxonomy. Existing
    // reasons are preserved so downstream telemetry doesn't regress.
    if (parsed.reason === "invalid_url") return { kind: "reject", reason: "invalid_url" };
    if (parsed.reason === "bad_protocol") return { kind: "reject", reason: "bad_protocol" };
    // Userinfo and empty-host both collapse into the general "host not
    // allowed" bucket since neither can ever match an allowlisted host.
    return { kind: "reject", reason: "host_not_allowed" };
  }

  // Reject every IP literal form — no allowlisted source is an IP, and
  // this closes decimal/hex/octal/IPv6 SSRF bypasses in one place.
  if (parsed.isIpLiteral) {
    return { kind: "reject", reason: "host_not_allowed" };
  }

  const host = parsed.hostname;

  if (host === PUBMED_HOST) {
    const m = parsed.url.pathname.match(PUBMED_PATH_RE);
    if (m) return { kind: "pubmed", host, pmid: m[1] };
    // PubMed host but no PMID — fall through to generic allowlist check.
  }

  if (ODS_HOSTS.has(host)) {
    return { kind: "ods", host };
  }

  if (GENERIC_ALLOWED_HOSTS.has(host)) {
    return { kind: "generic", host };
  }

  return { kind: "reject", reason: "host_not_allowed" };
}
