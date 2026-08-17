# Repo-wide Prettier formatting pass

Goal: clear the ~14,950 `prettier/prettier` lint errors (495 files) with formatting-only changes. No logic, naming, or behavior changes.

## Scope

Files flagged today:
- `src/` — 431 files (lib, routes, components, hooks, integrations, root configs)
- `scripts/` — 36 build/verify scripts
- `e2e/` — 17 Playwright specs plus helpers
- `remotion-calc/` — 8 files
- Root configs: `vite.config.ts`, `playwright.config.ts`, `capacitor.config.ts`
- Docs/markdown, `codemagic.yaml`, workflow YAML, and a few JSON assets picked up by the formatter

Untouched: generated files already in `.prettierignore` (`routeTree.gen.ts`, lockfiles, build output), plus `ios/` and `android/` native asset JSON, which are excluded from the pass so native builds are unaffected.

## Approach

1. Run the formatter over the repo in batches (src, scripts + e2e + remotion, root configs, docs/config files) so each batch can be reviewed and reverted independently if anything looks off.
2. After each batch, confirm the batch is formatting-only: no diff hunk should change tokens, only whitespace, line breaks, quotes, and trailing commas.
3. Re-run `eslint .` and confirm `prettier/prettier` count is zero and the 276 unrelated lint messages are unchanged (not newly introduced or silently removed).
4. Run typecheck, the vitest suite, and a production build to confirm nothing regressed.

## Risk notes

- Prettier reflows JSX text nodes; the SEO/meta and JSON-LD tests plus the JSON-LD duplicate lint will catch any accidental text or attribute change.
- Markdown reflow can change wrapping in store-listing docs; content stays identical.
- Template literals and string contents are never reformatted, so runtime strings, queries, and prompts are safe.

## Done when

- `npx prettier --check .` passes.
- `eslint .` reports zero `prettier/prettier` errors.
- Typecheck, test suite, and build all pass.
