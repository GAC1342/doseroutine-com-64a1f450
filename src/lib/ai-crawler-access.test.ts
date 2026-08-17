import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { compoundDefinitionLead, fallbackCompoundDefinition } from "./compound-definition";

const ROBOTS = readFileSync(resolve(process.cwd(), "public/robots.txt"), "utf8");

/** Parse robots.txt into { agent -> { allow: string[], disallow: string[] } }. */
function parseRobots(txt: string) {
  const groups: Record<string, { allow: string[]; disallow: string[] }> = {};
  let current: string[] = [];
  let expectingAgents = true;
  for (const rawLine of txt.split("\n")) {
    const line = rawLine.replace(/#.*$/, "").trim();
    if (!line) continue;
    const [rawKey, ...rest] = line.split(":");
    const key = rawKey.trim().toLowerCase();
    const value = rest.join(":").trim();
    if (key === "user-agent") {
      if (!expectingAgents) {
        current = [];
        expectingAgents = true;
      }
      current.push(value.toLowerCase());
      groups[value.toLowerCase()] ??= { allow: [], disallow: [] };
      continue;
    }
    if (key === "allow" || key === "disallow") {
      expectingAgents = false;
      for (const agent of current)
        groups[agent][key === "allow" ? "allow" : "disallow"].push(value);
    }
  }
  return groups;
}

const REQUIRED_AI_AGENTS = [
  "gptbot",
  "oai-searchbot",
  "chatgpt-user",
  "claudebot",
  "perplexitybot",
  "google-extended",
  "ccbot",
];

describe("robots.txt AI crawler access", () => {
  const groups = parseRobots(ROBOTS);

  it.each(REQUIRED_AI_AGENTS)("explicitly allows %s on public content", (agent) => {
    const group = groups[agent];
    expect(group, `missing User-agent: ${agent} block`).toBeTruthy();
    expect(group.allow).toContain("/");
    // Never a blanket block for an AI agent.
    expect(group.disallow).not.toContain("/");
  });

  it("still keeps authenticated app surfaces out for AI agents", () => {
    for (const agent of REQUIRED_AI_AGENTS) {
      expect(groups[agent].disallow).toContain("/today");
      expect(groups[agent].disallow).toContain("/settings");
    }
  });

  it("keeps the wildcard group permissive for public pages", () => {
    expect(groups["*"].allow).toContain("/");
    expect(groups["*"].disallow).not.toContain("/");
  });
});

describe("compound definition lead", () => {
  it("prefers a curated quick answer", () => {
    const lead = compoundDefinitionLead(
      { name: "BPC-157", category: "Peptide" },
      {
        rescueAnswer:
          "BPC-157 is a synthetic peptide studied for tissue repair. Human evidence is limited.",
      },
    );
    expect(lead.startsWith("BPC-157 is a synthetic peptide")).toBe(true);
  });

  it("falls back to overview markdown, stripped of syntax, max two sentences", () => {
    const lead = compoundDefinitionLead(
      { name: "L-Theanine", category: "Amino acid" },
      {
        overviewMd:
          "## Overview\n\n**L-theanine** is an amino acid found in [green tea](https://x.com). It is studied for calm focus. A third sentence should be dropped.",
      },
    );
    expect(lead).toContain("L-theanine is an amino acid found in green tea.");
    expect(lead).not.toContain("third sentence");
    expect(lead).not.toContain("**");
  });

  it("ignores placeholder overviews and uses the structured fallback", () => {
    const lead = compoundDefinitionLead(
      { name: "Foo", category: "Peptide", goalTags: ["recovery"], isInjectable: true },
      {
        overviewMd:
          "Foo is catalogued in DoseRoutine as a Peptide. A detailed evidence-based summary is being prepared.",
      },
    );
    expect(lead).toBe(
      fallbackCompoundDefinition({
        name: "Foo",
        category: "Peptide",
        goalTags: ["recovery"],
        isInjectable: true,
      }),
    );
    expect(lead).toContain("injection");
  });

  it("never returns an empty lead", () => {
    expect(compoundDefinitionLead({ name: "Bar" }).length).toBeGreaterThan(10);
  });
});
