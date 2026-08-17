# Docker Playwright runner

Runs the e2e suites against the same Chromium, Firefox and WebKit builds CI
uses, so pixel baselines and browser bugs reproduce exactly. Nothing about your
local machine matters — no `playwright install`, no Nix Firefox shim, no
"works on my laptop" snapshot drift.

## Quick start

```bash
npm run e2e:docker:build                                   # first run only
npm run e2e:docker                                         # whole suite
npm run e2e:docker -- e2e/exercise-art-keyboard.spec.ts --project=firefox
npm run e2e:docker -- e2e/exercise-art-visual.spec.ts --project=webkit --update-snapshots
npm run e2e:docker:shell                                   # poke around inside
```

Everything after `--` is passed straight to `playwright test`.

## What the image is

`docker/playwright.Dockerfile` starts from
`mcr.microsoft.com/playwright:v1.61.1-noble` — the official image for the
Playwright version pinned in `package.json`. All three engines and their system
libraries are preinstalled; Bun is added so `playwright.config.ts` can start the
dev server (`bun run dev`) inside the container.

`shm_size: 2gb` and `ipc: host` are set in `docker/docker-compose.yml`; without
them Chromium and WebKit crash partway through long runs.

## Snapshots

Baselines are keyed `<name>-<project>-linux.png`. The container is Linux, so
snapshots taken here are byte-comparable with CI. Regenerate CI-correct
baselines from any host with:

```bash
npm run e2e:docker -- e2e/exercise-art-visual.spec.ts --update-snapshots
```

Snapshots written on macOS/Windows directly will not match CI — always update
them through the container.

## node_modules

The repo is bind-mounted at `/work`, but `node_modules` is a container-owned
volume. Host installs carry macOS/Nix-native binaries and the pinned local
Firefox wrapper, neither of which runs inside this image. The entrypoint
installs dependencies into that volume on first use. To reset:

```bash
docker compose -f docker/docker-compose.yml down -v
```

## Testing an already-running server

By default the container starts its own dev server. To test a server running on
your machine, or a deployed URL:

```bash
PLAYWRIGHT_BASE_URL=http://host.docker.internal:8080 npm run e2e:docker
PLAYWRIGHT_BASE_URL=https://doseroutine.com npm run e2e:docker -- e2e/breadcrumbs.spec.ts
```

`TEST_USER_EMAIL`, `TEST_USER_PASSWORD`, `PW_FULL_ARTIFACTS` and `CI` are
forwarded from your shell when set.

## Reports and artifacts

`playwright-report/`, `test-results/` and updated snapshots land in the repo
through the bind mount, owned by your user (the runner passes your UID/GID).

## Upgrading Playwright

Bump `@playwright/test` in `package.json` **and** the `FROM` tag in
`docker/playwright.Dockerfile` in the same change. The entrypoint warns loudly
when the two drift, which otherwise shows up as
`Executable doesn't exist at /ms-playwright/...`.
