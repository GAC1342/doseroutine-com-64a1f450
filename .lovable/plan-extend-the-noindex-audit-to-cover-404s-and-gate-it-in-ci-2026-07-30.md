# Extend the noindex audit to cover 404s, and gate it in CI

## What exists today

- `src/lib/non-indexable.ts` is the single source of truth (paths + prefixes) and lists `/not-found`.
- `/debug/noindex-audit` fetches every probe path and compares robots.txt, `X-Robots-Tag`, and `<meta name="robots">`.
- `src/server.ts` sets `X-Robots-Tag: noindex, nofollow` on any HTML response with status 404.
- `__root.tsx` renders a `NotFoundComponent` with the robots meta tag.
- Gap: the audit only probes *named* paths. A real unmatched URL (e.g. `/this-does-not-exist`) and the catch-all not-found rendering are never checked, and nothing fails automatically if the three signals drift apart again.

## What to build

### 1. 404 probes in the shared source of truth

Add an exported `notFoundProbePaths()` to `src/lib/non-indexable.ts` returning representative unmatched URLs:

- `/not-found` (the explicit route)
- a random-ish unmatched top-level path, e.g. `/__audit-404-probe`
- an unmatched nested path under an indexable prefix, e.g. `/library/__audit-404-probe`
- an unmatched nested path under a private prefix, e.g. `/today/__audit-404-probe`

Mark these rows as expected-404 so the audit asserts status 404 *and* all three noindex signals.

### 2. Audit page shows a 404 section

`/debug/noindex-audit` runs the 404 probes alongside the existing ones, in a labelled "404 / not-found" group, flagging any probe that returns a non-404 status or is missing robots.txt / header / meta coverage.

### 3. CI gate that actually fails

Two layers:

- **Unit/integration (runs in the existing test suite, so it fails on every normal test run):** a new test that renders/serves the app's 404 path through the same `applyResponseHeaders` logic used by `src/server.ts` plus the root `NotFoundComponent` markup, asserting header, meta, and a matching `Disallow` rule for `/not-found`. Also asserts every entry in `NON_INDEXABLE_PATHS`/`PREFIXES` has a robots.txt rule (drift guard both directions).
- **Live-site check:** a `scripts/validate-noindex-audit.py` that hits a base URL, fetches robots.txt, probes all non-indexable paths *and* the 404 probes, and exits non-zero on any mismatch — wired into a `.github/workflows/noindex-audit.yml`.

### 4. Workflow trigger

Given the standing rule to keep Actions minutes down, the new workflow is `workflow_dispatch` only (like `robots-vs-sitemap` and `sitemap-indexability`). The always-on enforcement comes from the vitest layer in step 3, which runs locally and in any test run.

## Technical notes

- No route behaviour changes: 404 status codes, redirects, and rendering stay exactly as they are.
- `nonIndexableProbePaths()` keeps its current signature; 404 probes are a separate export so existing callers and tests are unaffected.
- The Python validator reuses the same probe list by reading it from a small generated JSON, or by duplicating the constant with a test that asserts the two stay in sync.

## Verification

- Run the full vitest suite (currently 889 passing) — new tests must pass with no regressions.
- Run the new validator script against the local dev server and confirm zero mismatches.
- Load `/debug/noindex-audit` and confirm the new 404 group reports green.
