#!/usr/bin/env bash
# post-deploy-smoke.sh — run after every deploy to verify the live site
# still serves the attribution + SEO surface: cite-as headers, robots.txt,
# llms.txt and sitemap.xml with <lastmod>. When CRON_SECRET
# is set, also verifies the IndexNow ping response.
#
# Usage:
#   ./scripts/post-deploy-smoke.sh                       # https://doseroutine.com
#   ./scripts/post-deploy-smoke.sh https://staging.url
#   ./scripts/post-deploy-smoke.sh --base https://staging.url \
#                                  --indexnow-path /api/public/indexnow-ping
#   RETRIES=10 SLEEP=15 ./scripts/post-deploy-smoke.sh   # wait longer for propagation
#
# Args / env (CLI flags win over env, env wins over defaults):
#   [positional]         base URL (same as --base)
#   --base URL           target base URL       (env: BASE_URL,        default: https://doseroutine.com)
#   --indexnow-path P    IndexNow endpoint     (env: INDEXNOW_PATH,   default: /api/public/indexnow-ping)
#   --retries N          smoke retry count     (env: RETRIES,         default: 6)
#   --sleep N            seconds between tries (env: SLEEP,           default: 10)
#   --indexnow-retries N (env: INDEXNOW_RETRIES, default: 3)
#   --indexnow-sleep N   (env: INDEXNOW_SLEEP,   default: 10)
#   -h | --help          show this help
#
# Retries with backoff so it can run immediately after `publish` while the
# CDN is still warming. Exits non-zero if any check fails.

set -u

usage() { sed -n '2,26p' "$0"; }

BASE="${BASE_URL:-https://doseroutine.com}"
INDEXNOW_PATH="${INDEXNOW_PATH:-/api/public/indexnow-ping}"
RETRIES="${RETRIES:-6}"
SLEEP_SECS="${SLEEP:-10}"
INDEXNOW_RETRIES="${INDEXNOW_RETRIES:-3}"
INDEXNOW_SLEEP="${INDEXNOW_SLEEP:-10}"

while (( "$#" )); do
  case "$1" in
    --base)              BASE="$2"; shift 2 ;;
    --indexnow-path)     INDEXNOW_PATH="$2"; shift 2 ;;
    --retries)           RETRIES="$2"; shift 2 ;;
    --sleep)             SLEEP_SECS="$2"; shift 2 ;;
    --indexnow-retries)  INDEXNOW_RETRIES="$2"; shift 2 ;;
    --indexnow-sleep)    INDEXNOW_SLEEP="$2"; shift 2 ;;
    -h|--help)           usage; exit 0 ;;
    --) shift; break ;;
    -*)
      echo "❌ unknown flag: $1" >&2; usage >&2; exit 2 ;;
    *)
      BASE="$1"; shift ;;
  esac
done

BASE="${BASE%/}"
[[ "$INDEXNOW_PATH" == /* ]] || INDEXNOW_PATH="/$INDEXNOW_PATH"

HERE="$(cd "$(dirname "$0")" && pwd)"
VERIFY="$HERE/verify-attribution.sh"
INDEXNOW="$HERE/verify-indexnow.sh"

for f in "$VERIFY" "$INDEXNOW"; do
  [[ -x "$f" ]] || chmod +x "$f" 2>/dev/null || true
done

echo "▶ post-deploy smoke test → $BASE"
echo "  retries=$RETRIES  sleep=${SLEEP_SECS}s"
echo "  indexnow path=$INDEXNOW_PATH (retries=$INDEXNOW_RETRIES sleep=${INDEXNOW_SLEEP}s)"

attempt=1
while (( attempt <= RETRIES )); do
  echo
  echo "── attempt $attempt/$RETRIES ──"
  if bash "$VERIFY" "$BASE"; then
    echo
    echo "✅ attribution checks passed on attempt $attempt"

    # Marker contract: the deployed compound pages must still serve the
    # required UI markers. Uses a decompressing fetch, so gzip/brotli responses
    # can never make a present marker read as missing.
    echo
    echo "▶ verifying deployed page markers…"
    if node "$HERE/check-deployed-markers.mjs" --base "$BASE"; then
      echo "✅ deployed page markers verified"
    else
      echo "❌ deployed page marker check failed"
      exit 1
    fi

    # Purge/refresh edge cache for HTML routes so crawlers cannot be served a
    # pre-deploy copy. Uses a purge API when configured, otherwise a
    # no-cache revalidation sweep.
    echo
    echo "▶ purging HTML edge cache…"
    if node "$HERE/purge-html-cache.mjs" --base "$BASE"; then
      echo "✅ HTML edge cache purged/revalidated"
    else
      echo "⚠️  HTML cache purge reported failures (non-fatal)"
    fi

    # Optional: verify IndexNow ping if CRON_SECRET is present.
    if [[ -n "${CRON_SECRET:-}" && -f "$INDEXNOW" ]]; then
      echo
      echo "▶ verifying IndexNow ping…"
      if RETRIES="$INDEXNOW_RETRIES" SLEEP="$INDEXNOW_SLEEP" \
         bash "$INDEXNOW" --base "$BASE" --path "$INDEXNOW_PATH"; then
        echo "✅ IndexNow ping verified"
      else
        echo "❌ IndexNow ping verification failed"
        exit 1
      fi
    else
      echo "ℹ️  skipping IndexNow verification (set CRON_SECRET to enable)"
    fi

    exit 0
  fi
  if (( attempt < RETRIES )); then
    echo "…waiting ${SLEEP_SECS}s for CDN/deploy propagation before retry"
    sleep "$SLEEP_SECS"
  fi
  attempt=$((attempt + 1))
done

echo
echo "❌ post-deploy smoke test failed after $RETRIES attempts against $BASE"
exit 1
