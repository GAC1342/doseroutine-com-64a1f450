import { describe, expect, it } from "vitest";

import { isFirstPartyScriptBlock, isNoiseReport, parseCspReports } from "@/lib/csp-report";

describe("parseCspReports", () => {
  it("parses the legacy report-uri shape", () => {
    const [report] = parseCspReports({
      "csp-report": {
        "document-uri": "https://doseroutine.com/",
        "blocked-uri": "https://doseroutine.com/~flock.js",
        "violated-directive": "script-src-elem",
        "effective-directive": "script-src-elem",
        disposition: "enforce",
        "status-code": 200,
        "line-number": 12,
      },
    });
    expect(report).toMatchObject({
      documentUrl: "https://doseroutine.com/",
      blockedUrl: "https://doseroutine.com/~flock.js",
      effectiveDirective: "script-src-elem",
      statusCode: 200,
      lineNumber: 12,
    });
  });

  it("parses the Reporting API array shape", () => {
    const reports = parseCspReports([
      {
        type: "csp-violation",
        body: { blockedURL: "https://evil.test/x.js", effectiveDirective: "script-src" },
      },
      { type: "deprecation", body: { id: "whatever" } },
    ]);
    expect(reports).toHaveLength(1);
    expect(reports[0]?.blockedUrl).toBe("https://evil.test/x.js");
  });

  it("returns nothing for junk payloads", () => {
    for (const junk of [null, 42, "text", {}, [], { nope: true }]) {
      expect(parseCspReports(junk)).toEqual([]);
    }
  });

  it("sanitises control characters and caps length", () => {
    const [report] = parseCspReports({
      "csp-report": { "blocked-uri": `bad\n\u0000value${"x".repeat(1000)}` },
    });
    // eslint-disable-next-line no-control-regex -- asserting control chars are stripped
    expect(report?.blockedUrl).not.toMatch(/[\n\u0000]/);
    expect((report?.blockedUrl ?? "").length).toBeLessThanOrEqual(512);
  });
});

describe("classification", () => {
  const empty = parseCspReports({ "csp-report": {} })[0]!;

  it("treats extension noise as ignorable", () => {
    expect(isNoiseReport({ ...empty, blockedUrl: "chrome-extension://abc/x.js" })).toBe(true);
    expect(isNoiseReport({ ...empty, sourceFile: "moz-extension://abc/x.js" })).toBe(true);
    expect(isNoiseReport({ ...empty, blockedUrl: "https://doseroutine.com/x.js" })).toBe(false);
  });

  it("flags a blocked first-party script as critical", () => {
    const origin = "https://doseroutine.com";
    expect(
      isFirstPartyScriptBlock(
        { ...empty, effectiveDirective: "script-src-elem", blockedUrl: `${origin}/~flock.js` },
        origin,
      ),
    ).toBe(true);
    expect(
      isFirstPartyScriptBlock(
        { ...empty, effectiveDirective: "script-src", blockedUrl: "inline" },
        origin,
      ),
    ).toBe(true);
    expect(
      isFirstPartyScriptBlock(
        { ...empty, effectiveDirective: "script-src", blockedUrl: "https://evil.test/x.js" },
        origin,
      ),
    ).toBe(false);
    expect(
      isFirstPartyScriptBlock(
        { ...empty, effectiveDirective: "img-src", blockedUrl: `${origin}/a.png` },
        origin,
      ),
    ).toBe(false);
  });
});
