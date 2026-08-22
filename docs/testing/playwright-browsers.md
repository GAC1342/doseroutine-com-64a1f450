# Playwright browsers, Firefox and visual baselines

How to run the keyboard and visual suites locally and in CI, and how to
generate baselines without fighting the environment.

## 1. Check what this machine can run

```bash
npm run e2e:doctor
```

It launches each engine and opens a real context (a launch alone is not
enough — protocol mismatches only appear when a context is created) and prints
one of:

| Reason                | Meaning                                                                                                                                                  | Fix                                                                                      |
| --------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| `version-mismatch`    | The browser build predates this Playwright version. The classic symptom is `Found property "<root>.viewport.isMobile" ... not described in this scheme`. | `npx playwright install firefox`, or point `PLAYWRIGHT_FIREFOX_PATH` at a matching build |
| `missing-system-libs` | Binary is there, shared libraries are not (`libgtk-3.so.0`, `libatk-1.0.so.0`, exit code 127).                                                           | `npx playwright install --with-deps <engine>`                                            |
| `missing`             | Not installed at all.                                                                                                                                    | `npx playwright install --with-deps <engine>`                                            |

Executable overrides honoured everywhere: `PLAYWRIGHT_CHROMIUM_PATH`,
`PLAYWRIGHT_FIREFOX_PATH`, `PLAYWRIGHT_WEBKIT_PATH`. Chromium also falls back
to `/bin/chromium` automatically, which is what the dev sandbox ships.

## 2. Run the suites

```bash
npm run test:exercise-art-keyboard     # keyboard nav, all usable engines
npm run test:exercise-art-visual       # pixel + geometry, all usable engines
```

Both go through `scripts/run-e2e.mjs`, which probes first and **drops engines
this machine cannot drive**, with a warning naming the reason. That is why the
Nix dev sandbox (Firefox and WebKit are unusable there) can still run the
Chromium leg instead of failing at launch.

In CI (`CI=1`) or with `E2E_STRICT_BROWSERS=1` the runner **refuses** to skip:
a silently missing engine on a runner is a false green.

## 3. Firefox determinism

The `firefox` project in `playwright.config.ts` is configured for stable
pixels: `isMobile`/`hasTouch` are stripped (Firefox does not emulate them and
some builds reject them at the protocol level), smooth scrolling and cosmetic
animations are off, reduced motion is on, and telemetry/update/prefetch chatter
is disabled so nothing paints or fetches mid-screenshot.

## 4. Generating baselines

Baselines are OS- and build-specific, so generate them where they are compared:
GitHub's `ubuntu-latest`.

- **CI (canonical):** run the **Generate visual baselines** workflow
  (`.github/workflows/visual-baselines.yml`) from the Actions tab. Pick the
  projects, specs and viewports; it installs browsers with OS deps, verifies
  they launch, runs with `--update-snapshots`, uploads the PNGs as an artifact
  and opens a PR.
- **Locally (only if your OS matches the baseline suffix, `*-linux.png`):**

  ```bash
  npm run test:visual:baselines
  ```

### Missing baselines never block a run

`e2e/visual-baseline.ts` wraps `toHaveScreenshot`. When a baseline file does
not exist yet, the pixel comparison is annotated and skipped while every
geometry and DOM assertion in the test still runs, so a newly added engine or
viewport is not permanently red before its baselines exist. Set
`REQUIRE_VISUAL_BASELINES=1` to make a missing baseline fail — the illustration
matrix sets it for Chromium and WebKit today and will flip Firefox to `1` once
its baselines are merged.

## Docker runner

To skip local browser wrangling entirely, run the suites in the CI-identical container: see [docker-playwright.md](./docker-playwright.md) (`npm run e2e:docker`).

## CI visual artifacts

Every `exercise-art visual matrix` job (and the baseline generator) now uploads
`visual-artifacts-<job>-<attempt>` on **pass or fail**, produced by
`scripts/collect-visual-artifacts.mjs`:

- `index.html` — gallery: any expected/actual/diff triplets from that run first,
  then the committed baselines for the projects that ran
- `report/index.html` — the full Playwright HTML report (CI now emits it on
  every run, not only on failure)
- `baselines/`, `diffs/`, `summary.json` — the raw files

Download the artifact, open `index.html`, and you can review pixel changes
without checking out the PR. Reproduce locally with
`npm run visual:artifacts -- --out visual-artifacts --projects firefox`.

The bundle is compressed losslessly before upload: PNGs are re-deflated at max
effort with metadata chunks stripped, byte-identical images (an `expected` shot
is usually identical to its baseline) are stored once and linked from every
place they appear, and trace zips / videos / source maps are dropped from
`report/`. Pixels are never altered, so diffs stay reviewable. The gallery
header and `summary.json` print the before/after size; pass `--no-compress` for
raw byte-for-byte copies.
