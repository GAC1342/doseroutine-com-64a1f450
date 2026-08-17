# One command to run the SEO JSON-LD and meta checks locally

Today the SEO validations are spread across several CI workflows (`seo-meta-lint`, `jsonld-contract`, `blog-seo-score`, `direct-answers`, `noindex-audit`) and a handful of npm scripts. There is no single command that reproduces them, so failures only show up after pushing.

This adds a local entry point that runs the same checks CI runs.

## What gets added

Three npm scripts in `package.json`:

- `npm run seo:check` — the main one. Runs every SEO JSON-LD and meta validation that works offline against source, no build or dev server needed. Fast enough to run before every push.
- `npm run seo:check:live` — the extra checks that need a running site (they hit a URL). Defaults to the local dev/preview server, and accepts a different base URL when you want to point at production.
- `npm run seo:check:all` — both of the above, one after the other.

## What `seo:check` covers

Grouped the same way CI groups them:

| Area | Reproduces CI workflow |
| --- | --- |
| Meta tags, canonical, OG/Twitter, snippet lengths | `seo-meta-lint` (`lint:seo`, `lint:snippets`) |
| JSON-LD schema contract + duplicate-block lint | `jsonld-contract` |
| Blog Article/FAQPage schema, social meta, SEO score | `blog-seo-score` |
| FAQ rich-results eligibility and anchor parity | `blog-seo-score` |
| Internal anchor-text lint | `blog-seo-score` |
| Direct-answer SSR blocks | `direct-answers` |
| Noindex / not-found indexing rules | `noindex-audit` |

Each group prints its own heading so a failure tells you which area broke, and the command exits non-zero on the first failing group (same behaviour as CI).

## What `seo:check:live` covers

- `scripts/validate-seo-routes.py` against the served site
- `scripts/jsonld-sweep.py` — parses rendered JSON-LD on live pages
- `scripts/validate-schema-sitemap.py` — schema coverage across sitemap URLs

These are separated out because they need a served build; running them against a stale server produces misleading results.

## Technical notes

- A small runner script (`scripts/seo-check.mjs`) sequences the groups, prints headings and a pass/fail summary table, and forwards the exit code. Keeping it in a script rather than a long `&&` chain is what makes per-area reporting and the `--only <area>` filter possible.
- `--only meta`, `--only jsonld`, `--only blog` etc. let you re-run just the area you're fixing.
- The existing granular scripts (`lint:seo`, `test:blog-jsonld`, …) stay exactly as they are — CI keeps calling them directly, so there is one source of truth for what each check is and no risk of the local command drifting from CI.
- No changes to any validation logic, route, or component. This is tooling only.
