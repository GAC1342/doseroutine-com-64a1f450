# One command to refresh screenshot baselines

Today baseline refreshing is partial: `test:visual:baselines` only re-records two illustration specs, and `e2e/mint-visual-regression.spec.ts` (which also compares screenshots) is left out. Anything new that takes screenshots has to be added by hand. This adds a single, discovery-based way to say "this rendering change is intentional — update the baselines."

## What you get

- `npm run visual:update` — re-records every screenshot baseline in the suite.
- `npm run visual:update -- --spec mint` — only specs matching that name.
- `npm run visual:update -- --project chromium` — only one browser.
- `npm run visual:update -- --docker` — runs in the CI-identical Docker image, so the pixels match what CI expects (recommended before committing).
- `npm run visual:update -- --dry-run` — lists which specs and browsers would be re-recorded, changes nothing.

After the run it prints a plain summary: which baseline PNGs were added, changed, or left alone, so you can eyeball the list before committing.

## How it works

New `scripts/update-visual-baselines.mjs`:

1. Scans `e2e/*.spec.ts` for `toHaveScreenshot(` / `expectVisualSnapshot(` and builds the spec list automatically — no hardcoded list to keep in sync.
2. Applies `--spec` / `--project` filters (defaults: all matched specs, `chromium,firefox,webkit`).
3. Records a checksum of every PNG under `e2e/*-snapshots/` before the run.
4. Delegates to the existing `scripts/run-e2e.mjs` with `--update-snapshots` (so unavailable browsers are still handled the way they are today), or to `scripts/docker-e2e.sh --update-snapshots` when `--docker` is passed.
5. Re-checksums and prints added / changed / unchanged counts plus the changed file paths; also writes `test-results/visual-baseline-update.json` for CI artifacts.
6. Exits non-zero if a requested spec produced no baselines at all (catches a spec that silently didn't run).

`package.json` scripts:

- add `visual:update` pointing at the new script,
- keep `test:visual:baselines` and `test:exercise-art-visual:update` as thin aliases so existing docs and workflows don't break.

Safety rail: the script refuses to run when `CI` is set unless `ALLOW_BASELINE_UPDATE=1` is also set, so a CI job can never quietly rewrite baselines and turn a real regression green.

Docs: short "Updating baselines" section in `e2e/README.md` covering the local vs Docker choice and the commit-the-PNGs step.
