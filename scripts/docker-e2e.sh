#!/usr/bin/env bash
# Runs Playwright inside the CI-identical Docker image.
#
#   scripts/docker-e2e.sh                                  # full suite, all projects
#   scripts/docker-e2e.sh e2e/exercise-art-visual.spec.ts --project=firefox
#   scripts/docker-e2e.sh --update-snapshots e2e/exercise-art-visual.spec.ts
#   scripts/docker-e2e.sh --shell                          # interactive shell
#   scripts/docker-e2e.sh --build                          # rebuild the image only
#
# Env:
#   PLAYWRIGHT_BASE_URL   test an existing server (use host.docker.internal for
#                         a dev server running on your machine)
#   TEST_USER_EMAIL / TEST_USER_PASSWORD  forwarded for auth'd specs
set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
compose_file="$repo_root/docker/docker-compose.yml"

if ! command -v docker >/dev/null 2>&1; then
  echo "docker not found. Install Docker Desktop or the docker engine first." >&2
  exit 127
fi

compose() {
  if docker compose version >/dev/null 2>&1; then
    docker compose -f "$compose_file" "$@"
  elif command -v docker-compose >/dev/null 2>&1; then
    docker-compose -f "$compose_file" "$@"
  else
    echo "docker compose plugin not found (need Docker Compose v2 or docker-compose)." >&2
    exit 127
  fi
}

# Keep files written into the bind mount owned by the caller.
DOCKER_UID="$(id -u)"
DOCKER_GID="$(id -g)"
export DOCKER_UID DOCKER_GID

build_only=0
shell=0
args=()
for arg in "$@"; do
  case "$arg" in
    --build) build_only=1 ;;
    --shell) shell=1 ;;
    *) args+=("$arg") ;;
  esac
done

compose build

if [ "$build_only" = "1" ]; then
  echo "[docker-e2e] image built."
  exit 0
fi

if [ "$shell" = "1" ]; then
  exec compose run --rm e2e bash
fi

if [ "${#args[@]}" -eq 0 ]; then
  args=(--reporter=list)
fi

compose run --rm e2e npx playwright test "${args[@]}"
