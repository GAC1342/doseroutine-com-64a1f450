import { describe, expect, it } from "vitest";
import { parseFaqMarkdown } from "./faq-schema";

describe("parseFaqMarkdown", () => {
  it("parses heading style (### Question?)", () => {
    const md = `### What is it?\nA peptide.\n\n### Is it safe?\nGenerally yes.`;
    const out = parseFaqMarkdown(md);
    expect(out).toHaveLength(2);
    expect(out[0]).toEqual({ q: "What is it?", a: "A peptide." });
    expect(out[1].q).toBe("Is it safe?");
  });

  it("strips Q1:/Q. prefixes inside headings", () => {
    const md = `## Q1: What is it?\nAnswer one.\n\n## Question 2 — Why?\nAnswer two.`;
    const out = parseFaqMarkdown(md);
    expect(out[0].q).toBe("What is it?");
    expect(out[1].q).toBe("Why?");
  });

  it("parses bulleted bold questions", () => {
    const md = `- **What is it?**\n  A peptide.\n- **Is it safe?**\n  Yes.`;
    const out = parseFaqMarkdown(md);
    expect(out).toHaveLength(2);
    expect(out[0]).toEqual({ q: "What is it?", a: "A peptide." });
  });

  it("parses numbered list format (1. **Q?** answer)", () => {
    const md = `1. **What is it?**\n   A peptide.\n2. **Is it safe?**\n   Yes when used properly.`;
    const out = parseFaqMarkdown(md);
    expect(out).toHaveLength(2);
    expect(out[0]).toEqual({ q: "What is it?", a: "A peptide." });
    expect(out[1].q).toBe("Is it safe?");
  });

  it("parses numbered list without bold and without indent", () => {
    const md = `1) What is it?\nA peptide.\n2) Is it safe?\nGenerally yes.`;
    const out = parseFaqMarkdown(md);
    expect(out).toHaveLength(2);
    expect(out[1].a).toBe("Generally yes.");
  });

  it("parses paired Q:/A: lines without blank separation", () => {
    const md = `Q: What is it?\nA: A peptide.\nQ: Is it safe?\nA: Yes.`;
    const out = parseFaqMarkdown(md);
    expect(out).toHaveLength(2);
    expect(out[0]).toEqual({ q: "What is it?", a: "A peptide." });
  });

  it("parses Q1./A1. numbered pairs and keeps multi-line answers", () => {
    const md = `Q1. What is it?\nA1. A peptide.\nMore detail here.\nQ2. Is it safe?\nA2. Yes.`;
    const out = parseFaqMarkdown(md);
    expect(out).toHaveLength(2);
    expect(out[0].a).toContain("More detail here.");
  });

  it("parses **Question:** / **Answer:** bold prefix pairs", () => {
    const md = `**Question:** What is it?\n**Answer:** A peptide.\n**Question:** Safe?\n**Answer:** Yes.`;
    const out = parseFaqMarkdown(md);
    expect(out).toHaveLength(2);
    expect(out[0].q).toBe("What is it?");
  });

  it("parses paragraph blocks where first line ends in ?", () => {
    const md = `What is it?\nA peptide widely researched.\n\nIs it safe?\nGenerally yes.`;
    const out = parseFaqMarkdown(md);
    expect(out).toHaveLength(2);
    expect(out[1]).toEqual({ q: "Is it safe?", a: "Generally yes." });
  });

  it("normalizes CRLF line endings", () => {
    const md = `### What is it?\r\nA peptide.\r\n\r\n### Safe?\r\nYes.`;
    const out = parseFaqMarkdown(md);
    expect(out).toHaveLength(2);
  });

  it("returns empty array for empty/null input", () => {
    expect(parseFaqMarkdown("")).toEqual([]);
    expect(parseFaqMarkdown(null)).toEqual([]);
    expect(parseFaqMarkdown(undefined)).toEqual([]);
  });

  it("skips pairs with empty question or answer", () => {
    const md = `### \nAnswer with no question.\n\n### Real question?\nReal answer.`;
    const out = parseFaqMarkdown(md);
    expect(out).toHaveLength(1);
    expect(out[0].q).toBe("Real question?");
  });
});
