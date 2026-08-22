# Citation & disclaimer consistency check for article drafts

Add a pre-publish gate that checks every first-party `/articles` draft has trustworthy sourcing and the right medical-disclaimer treatment, mirroring the existing `/blog` citation audit.

## What I found

- The 14 drafts in `src/content/article-drafts/` currently carry almost no external sourcing: only `13-missed-dose-what-to-do.md` links out (NHS, FDA). The other 13 have zero external citations.
- The standard disclaimer is rendered automatically at the bottom of every article by the article view, so no draft is missing it on the page. But wording inside the drafts is inconsistent: some repeat their own ad-hoc "talk to your doctor" line, most say nothing.
- `/blog` already has a strong equivalent (`src/lib/blog-citation-audit.ts` + `scripts/check-blog-citations.mjs` + a GitHub workflow). `/articles` has no equivalent.

## The check

Rules, split into blocking errors and warnings.

Errors (block publish):
- A medical-claim article (dosing, side effects, drug behaviour, safety) with zero external citations.
- Link to a host outside the approved allow-list (reuse the blog audit's primary / regulatory / trade host tiers).
- Broken or permanently redirected source link (live mode only).
- Duplicate citation of the same URL used as if it were two sources.
- A draft that hardcodes its own medical-disclaimer paragraph, which would double up with the standard one the page already renders.

Warnings (report, don't block):
- Product-roundup articles with no citations (allowed — they're opinion/feature comparisons, not medical claims).
- Sourcing older than 5 years where a newer authority exists.
- Only trade-press sourcing on an article making a clinical claim.
- Safety-sensitive language ("safe", "cure", "treats") in an article with no primary/regulatory source backing it.

Each draft declares its own type via frontmatter (`content_type: medical | roundup | howto`) so the rules apply proportionately. I'll add that field to the 14 existing drafts.

## Deliverables

1. `src/lib/article-citation-audit.ts` — pure rule engine: parses drafts, classifies hosts by tier, applies the rules above, returns structured findings. Reuses the host tier sets already exported from `blog-citation-audit.ts`.
2. `src/lib/__tests__/article-citation-audit.test.ts` — unit tests per rule (clean draft, missing citations, bad host, duplicate URL, inline disclaimer, stale source).
3. `scripts/check-article-citations.mjs` — CLI: `--static` (offline, fast) and default (also fetches each source URL to catch dead links). Writes a JSON report and a human-readable summary; exits non-zero on any error-level finding.
4. `package.json` scripts: `audit:article-citations`, `audit:article-citations:static`, `test:article-citations`.
5. `.github/workflows/article-citations.yml` — path-filtered CI job on the drafts and rule files, uploading the JSON report as an artifact.
6. Wire the static audit into the pre-publish path so a failing draft blocks publish.

## Follow-on (needs your call)

The audit will fail on day one for the medical-claim drafts that have no sources. Two options once the checker exists:

- I add real primary/regulatory citations (FDA, NHS, CDC, PubMed) to the affected drafts so they pass, or
- We classify most of them as roundups/how-tos, which downgrades the missing-citation finding to a warning and only holds the genuinely clinical ones to the strict bar.

I'd suggest doing both: classify honestly, then add citations to whatever remains classified as medical.
