/**
 * Regression tests for the citation preview SSRF allowlist.
 *
 * Original vulnerability: the classifier matched trusted sources by testing
 * the raw URL string with substring regexes (e.g. /ods\.od\.nih\.gov/i), so
 * an attacker could point the server at any host by placing the trusted
 * substring anywhere in the URL — including query params, userinfo, or
 * path segments — while the actual `hostname` was attacker-controlled.
 *
 * These tests lock in the hostname-based allowlist behavior. Anything that
 * regresses to substring matching will fail here.
 */
import { describe, it, expect } from "vitest";
import {
  classifyCitationUrl,
  GENERIC_ALLOWED_HOSTS,
  ODS_HOSTS,
  PUBMED_HOST,
} from "./citation-allowlist";

describe("classifyCitationUrl — allowed sources", () => {
  it("accepts PubMed PMID URLs and extracts the numeric id from the path", () => {
    const r = classifyCitationUrl("https://pubmed.ncbi.nlm.nih.gov/12345678/");
    expect(r).toEqual({ kind: "pubmed", host: PUBMED_HOST, pmid: "12345678" });
  });

  it("accepts PubMed URLs without trailing slash", () => {
    const r = classifyCitationUrl("https://pubmed.ncbi.nlm.nih.gov/98765");
    expect(r.kind).toBe("pubmed");
  });

  it("accepts the ODS host", () => {
    for (const host of ODS_HOSTS) {
      const r = classifyCitationUrl(`https://${host}/factsheets/Zinc-HealthProfessional/`);
      expect(r).toEqual({ kind: "ods", host });
    }
  });

  it("accepts each generic allowlisted health domain", () => {
    for (const host of GENERIC_ALLOWED_HOSTS) {
      const r = classifyCitationUrl(`https://${host}/some/path`);
      expect(r).toEqual({ kind: "generic", host });
    }
  });

  it("is case-insensitive for hostnames", () => {
    const r = classifyCitationUrl("https://WWW.FDA.GOV/drugs/example");
    expect(r).toEqual({ kind: "generic", host: "www.fda.gov" });
  });
});

describe("classifyCitationUrl — SSRF bypass attempts (regression)", () => {
  const SSRF_ATTACKS: Array<{ name: string; url: string }> = [
    // Substring-in-query regressions — the original bug.
    {
      name: "trusted substring hidden in query param, attacker host",
      url: "https://attacker.example.com/x?ref=https://ods.od.nih.gov/factsheets/Zinc",
    },
    {
      name: "PubMed substring hidden in query param",
      url: "https://attacker.example.com/?u=pubmed.ncbi.nlm.nih.gov/12345678",
    },
    // Userinfo spoofing — hostname is what comes after '@'.
    {
      name: "trusted host in userinfo, attacker host after @",
      url: "https://ods.od.nih.gov@attacker.example.com/",
    },
    {
      name: "trusted host in userinfo with credentials",
      url: "https://pubmed.ncbi.nlm.nih.gov:x@169.254.169.254/latest/meta-data/",
    },
    // Subdomain / suffix confusion — must be exact hostname match.
    {
      name: "attacker subdomain of trusted domain suffix",
      url: "https://ods.od.nih.gov.attacker.example.com/",
    },
    {
      name: "trusted host as subdomain of attacker",
      url: "https://www.fda.gov.evil.example.com/",
    },
    // Cloud metadata & internal ranges (classic SSRF targets).
    {
      name: "AWS/GCP metadata endpoint",
      url: "http://169.254.169.254/latest/meta-data/iam/",
    },
    {
      name: "localhost IPv4",
      url: "http://127.0.0.1:8080/admin",
    },
    {
      name: "localhost IPv6",
      url: "http://[::1]/",
    },
    {
      name: "RFC1918 private range",
      url: "http://10.0.0.5/internal",
    },
    // Protocol smuggling — only http(s) is fetchable.
    {
      name: "file:// scheme",
      url: "file:///etc/passwd",
    },
    {
      name: "gopher:// scheme (classic SSRF vector)",
      url: "gopher://127.0.0.1:6379/_INFO",
    },
    {
      name: "javascript: scheme",
      url: "javascript:fetch('/steal')",
    },
    {
      name: "data: scheme",
      url: "data:text/html,<script>1</script>",
    },
    // Path-based substring smuggling.
    {
      name: "trusted host appearing in path segment",
      url: "https://attacker.example.com/ods.od.nih.gov/factsheets",
    },
    // Malformed inputs.
    { name: "empty string", url: "" },
    { name: "not a URL", url: "not a url at all" },
  ];

  it.each(SSRF_ATTACKS)("rejects: $name", ({ url }) => {
    const r = classifyCitationUrl(url);
    expect(r.kind).toBe("reject");
  });

  it("PubMed classifier requires exact hostname AND numeric PMID path", () => {
    // Correct host but no PMID in path — must not fall through to fetching.
    const r = classifyCitationUrl("https://pubmed.ncbi.nlm.nih.gov/about/");
    expect(r.kind).toBe("reject");
  });

  it("does not treat query-only PMID as a valid PubMed target", () => {
    const r = classifyCitationUrl("https://pubmed.ncbi.nlm.nih.gov/search?term=12345678");
    expect(r.kind).toBe("reject");
  });
});

describe("classifyCitationUrl — allowlist invariants", () => {
  it("PubMed and ODS hosts are not duplicated in the generic allowlist", () => {
    for (const h of ODS_HOSTS) {
      expect(GENERIC_ALLOWED_HOSTS.has(h)).toBe(false);
    }
    expect(GENERIC_ALLOWED_HOSTS.has(PUBMED_HOST)).toBe(false);
  });

  it("every allowlisted host is a normalized lowercase hostname (no schemes, paths, or ports)", () => {
    const HOSTNAME_RE = /^[a-z0-9.-]+$/;
    for (const h of [PUBMED_HOST, ...ODS_HOSTS, ...GENERIC_ALLOWED_HOSTS]) {
      expect(h).toMatch(HOSTNAME_RE);
      expect(h).toBe(h.toLowerCase());
    }
  });
});
