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
