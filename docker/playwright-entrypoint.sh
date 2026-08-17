#!/usr/bin/env bash
# Prepares the mounted workspace, then runs whatever command was passed.
#
#   - installs node_modules into the container-owned volume when missing
#     (host node_modules is deliberately NOT mounted: native binaries and the
#     Nix Firefox shim from the host would break inside this image)
#   - verifies the image's Playwright build matches package.json
#   - clears host-only browser overrides so the preinstalled engines are used
set -euo pipefail

cd /work

# Host overrides point at paths that don't exist in this image.
unset PLAYWRIGHT_FIREFOX_PATH PLAYWRIGHT_CHROMIUM_PATH PLAYWRIGHT_WEBKIT_PATH

want="$(node -p "require('/work/package.json').devDependencies['@playwright/test'].replace(/^[^0-9]*/,'')" 2>/dev/null || echo "")"
have="$(/ms-playwright-agent/node_modules/.bin/playwright --version 2>/dev/null | awk '{print $2}' || echo "")"
if [ -z "$have" ]; then
  have="$(cat /ms-playwright/.docker-info 2>/dev/null | tr -dc '0-9.' || echo "")"
fi
if [ -n "$want" ] && [ -n "$have" ] && [ "${have#"$want"}" = "$have" ]; then
  echo "[docker-e2e] warning: image Playwright $have != package.json $want — rebuild docker/playwright.Dockerfile with the matching tag" >&2
fi

if [ ! -x node_modules/.bin/playwright ]; then
  echo "[docker-e2e] installing dependencies inside the container volume…"
  if [ -f bun.lock ] || [ -f bun.lockb ]; then
    bun install --frozen-lockfile
  else
    npm ci
  fi
fi

exec "$@"
