import { describe, expect, it } from "vitest";

import {
  auditArticleCitations,
  extractCitations,
  splitIssues,
  toArticleDraft,
} from "@/lib/article-citation-audit";

const NOW = new Date("2026-08-19T00:00:00.000Z");

function draft(body: string, frontmatter = "content_type: medical\nsuggested_slug: test-slug") {
  return toArticleDraft("test.md", `---\n${frontmatter}\n---\n\n# Title\n\n${body}\n`);
}

function codes(body: string, frontmatter?: string) {
  return auditArticleCitations([draft(body, frontmatter)], NOW).map((i) => i.code);
}

describe("toArticleDraft", () => {
  it("reads slug and content type from frontmatter", () => {
    const d = draft("body");
    expect(d.slug).toBe("test-slug");
    expect(d.contentType).toBe("medical");
  });

  it("rejects an unknown content type", () => {
    expect(draft("body", "content_type: opinion\nsuggested_slug: s").contentType).toBeNull();
  });
});

describe("extractCitations", () => {
  it("extracts external links and ignores internal ones", () => {
    const cites = extractCitations(
      draft("See [FDA](https://www.fda.gov/drugs) and [Today](/today)."),
    );
    expect(cites).toHaveLength(1);
    expect(cites[0]).toMatchObject({ host: "www.fda.gov", tier: "regulatory" });
  });

  it("strips trailing punctuation captured inside the URL", () => {
    const cites = extractCitations(draft("[CDC](https://www.cdc.gov/page.)"));
    expect(cites[0].url).toBe("https://www.cdc.gov/page");
  });
});

describe("auditArticleCitations", () => {
  it("passes a clean medical draft", () => {
    const issues = codes(
      "Backed by [FDA](https://www.fda.gov/drugs/a) and [CDC](https://www.cdc.gov/b).",
    );
    expect(issues).toEqual([]);
  });

  it("errors when a medical draft has no citations", () => {
    expect(codes("Plain prose with no sources.")).toContain("no_citations");
  });

  it("errors when a medical draft has only one citation", () => {
    expect(codes("Only [FDA](https://www.fda.gov/drugs/a).")).toContain("thin_citations");
  });

  it("errors on a host outside the allow list", () => {
    expect(
      codes("[Blog](https://random-supplement-blog.example/x) [FDA](https://www.fda.gov/a)"),
    ).toContain("unknown_host");
  });

  it("errors on http citations", () => {
    expect(codes("[FDA](http://www.fda.gov/a) [CDC](https://www.cdc.gov/b)")).toContain(
      "insecure_url",
    );
  });

  it("errors when the same URL is cited as two different sources", () => {
    const issues = auditArticleCitations(
      [draft("[FDA](https://www.fda.gov/a) and [Agency](https://www.fda.gov/a)")],
      NOW,
    );
    const dup = issues.find((i) => i.code === "duplicate_url");
    expect(dup?.level).toBe("error");
  });

  it("only warns when the same URL is linked twice with identical text", () => {
    const issues = auditArticleCitations(
      [draft("[FDA](https://www.fda.gov/a) and [FDA](https://www.fda.gov/a)")],
      NOW,
    );
    expect(issues.find((i) => i.code === "duplicate_url")?.level).toBe("warning");
  });

  it("errors when a draft hardcodes its own medical disclaimer", () => {
    expect(
      codes(
        "[FDA](https://www.fda.gov/a) [CDC](https://www.cdc.gov/b)\n\n*Medical disclaimer:* consult your provider.",
      ),
    ).toContain("inline_disclaimer");
  });

  it("errors when content_type is missing", () => {
    expect(codes("[FDA](https://www.fda.gov/a)", "suggested_slug: s")).toContain(
      "missing_content_type",
    );
  });

  it("errors on an unknown content_type value", () => {
    expect(
      codes("[FDA](https://www.fda.gov/a)", "content_type: news\nsuggested_slug: s"),
    ).toContain("invalid_content_type");
  });

  it("warns on a stale source", () => {
    expect(codes("[FDA 2015](https://www.fda.gov/2015/a) [CDC](https://www.cdc.gov/b)")).toContain(
      "stale_source",
    );
  });

  it("warns when clinical claims rest on trade press alone", () => {
    const issues = codes("[Reuters](https://www.reuters.com/a) [STAT](https://www.statnews.com/b)");
    expect(issues).toContain("trade_only_sourcing");
  });

  it("warns on safety language without an authority source", () => {
    expect(
      codes(
        "This is safe. [Reuters](https://www.reuters.com/a) [STAT](https://www.statnews.com/b)",
      ),
    ).toContain("unsupported_safety_language");
  });

  it("only warns when a roundup has no citations", () => {
    const issues = auditArticleCitations(
      [draft("Feature comparison prose.", "content_type: roundup\nsuggested_slug: s")],
      NOW,
    );
    expect(splitIssues(issues).errors).toEqual([]);
    expect(issues.map((i) => i.code)).toEqual(["roundup_uncited"]);
  });

  it("does not require citations for how-to drafts", () => {
    const issues = auditArticleCitations(
      [draft("Step one. Step two.", "content_type: howto\nsuggested_slug: s")],
      NOW,
    );
    expect(splitIssues(issues).errors).toEqual([]);
  });
});
