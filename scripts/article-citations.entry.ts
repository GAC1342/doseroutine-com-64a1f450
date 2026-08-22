/** Bundle entry so scripts/check-article-citations.mjs can import the TS sources. */
export {
  auditArticleCitations,
  extractCitations,
  splitIssues,
  toArticleDraft,
} from "@/lib/article-citation-audit";
