# DoseRoutine E2E tests

Playwright end-to-end tests that walk nested authenticated routes and verify
each breadcrumb level renders as the correct link or plain text.

## Run

```bash
# 1) Start the dev server (Vite serves at http://localhost:8080)
bun run dev

# 2) In a second shell, provide credentials for an existing test account
export TEST_USER_EMAIL="you@example.com"
export TEST_USER_PASSWORD="••••••••"

# 3) Run the suite
bun run test:e2e
```

Point at a different origin (preview / prod) with `PLAYWRIGHT_BASE_URL`:

```bash
PLAYWRIGHT_BASE_URL=https://doseroutine.com bun run test:e2e
```

## What is covered

- `/today`, `/stack`, `/safety`, `/timeline`, `/more`, `/plan`, `/reminders`,
  `/upgrade` — top-level authenticated routes: `Home › <Section>` with Home as
  a link and the section as `aria-current="page"` plain text.
- `/admin/schema-report` — nested route where the intermediate `admin` segment
  is NOT navigable, so it must render as plain text (not a link) while the
  leaf `Schema report` stays plain text.
- `/library/<slug>` — dynamic segment: `Library` is a link, the dynamic leaf
  becomes plain text with a readable resolved label.
- Home crumb click navigates back to `/today`.
- Global invariant: every leaf crumb is plain text; `Home` is always a link.

Tests are auto-skipped when `TEST_USER_EMAIL` / `TEST_USER_PASSWORD` are unset.

## Core-routes smoke (`core-routes-smoke.spec.ts`)

Fast pre-review guard for the five routes users hit every session:
`/today`, `/timeline`, `/stack`, `/progress-photos`, `/more` (settings).

Each route must load with a <400 document status, land on the expected
pathname (no bounce to `/auth`), render a page-identifying heading, and
produce zero console errors or 5xx network responses during a 1.5s idle.
Read-only — no dose actions, uploads, or profile writes — so it's safe to
run against any seeded test account. Run it before every App Store
resubmission:

```bash
bun run test:e2e e2e/core-routes-smoke.spec.ts
```

## Auth session smoke (`auth-session-smoke.spec.ts`)

Covers sign-in → cross-route session persistence → hard reload → sign-out →
auth gate re-block → back-button hygiene. Catches silent regressions the
route-render smoke can't see (broken bearer attacher, disabled session
persistence, missing sign-out button, `navigate()` without `replace: true`).

```bash
bun run test:e2e e2e/auth-session-smoke.spec.ts
```

Auto-skipped when `TEST_USER_EMAIL` / `TEST_USER_PASSWORD` are unset.

## Updating screenshot baselines

When you _intentionally_ change how something renders, re-record the baselines
with one command instead of hand-listing specs:

```bash
npm run visual:update                      # every screenshot spec, all browsers
npm run visual:update -- --spec mint       # one spec (substring match)
npm run visual:update -- --project chromium
npm run visual:update -- --docker          # CI-identical image (recommended)
npm run visual:update -- --dry-run         # show the plan, change nothing
```

The script (`scripts/update-visual-baselines.mjs`) finds every spec that calls
`toHaveScreenshot` / `expectVisualSnapshot`, so new visual specs are picked up
automatically. It prints which baseline PNGs were added, changed, or removed
and writes `test-results/visual-baseline-update.json` for CI artifacts.

Notes:

- Prefer `--docker`: local font/GPU differences produce baselines that CI will
  reject. Without Docker, expect the CI leg to disagree.
- Commit the changed PNGs under `e2e/<spec>.spec.ts-snapshots/` together with
  the rendering change, and eyeball the reported list first.
- Baseline updates are refused under `CI` unless `ALLOW_BASELINE_UPDATE=1`, so a
  CI run can never rewrite a real regression to green.
- The script exits non-zero if a requested spec produced no baselines at all —
  that means it never actually ran (missing browser, filter typo).

## Responsive screenshot matrix (`responsive-visual.spec.ts`)

Guards how the public pages _look_ as the viewport narrows — the drift the
overflow guard can't see (a grid that stops wrapping at 390px, a nav that
collapses wrong on iPad, a hero that reflows at laptop width).

Matrix (`e2e/responsive-viewports.ts`):

| viewport      | size      | why                                               |
| ------------- | --------- | ------------------------------------------------- |
| `phone-small` | 320x568   | smallest screen still in the field                |
| `iphone-se`   | 375x667   | iPhone SE (2nd/3rd gen)                           |
| `iphone-14`   | 390x844   | iPhone 14/13/12 — reference handset (was `phone`) |
| `pixel-7`     | 412x915   | Pixel 7 — common Android width                    |
| `phone-large` | 430x932   | large phone / bottom-sheet room                   |
| `tablet`      | 768x1024  | iPad portrait, the `md` breakpoint                |
| `ipad-pro`    | 1024x1366 | iPad Pro 12.9" portrait                           |
| `laptop`      | 1280x900  | desktop reference                                 |

Routes: `/`, `/library`, `/calculator`, `/blog`, `/booty-workout` — public only,
because authenticated pages need seeded data to be pixel-stable.

Chromium runs the full grid; WebKit runs `iphone-se`, `iphone-14`, `tablet` and
`ipad-pro` (where Safari actually diverges); Firefox is excluded to keep the
baseline count sane. Each test screenshots the `main` content region clipped to
the viewport — never `fullPage`.

`RESPONSIVE_VIEWPORTS` accepts the old aliases `phone`, `iphone`, `ipad` and
`pixel`, which resolve to `iphone-14`, `iphone-14`, `tablet` and `pixel-7`.

```bash
npm run test:responsive-visual
RESPONSIVE_VIEWPORTS=iphone-14,tablet npm run test:responsive-visual   # shard
npm run visual:update -- --spec responsive --docker                    # re-record
```

Adding a route or viewport: append to `ROUTES` in the spec or to
`ALL_RESPONSIVE_VIEWPORTS`, then re-record baselines. Missing baselines are
annotations, not failures, unless `REQUIRE_VISUAL_BASELINES=1` (set on the main
branch gate).
