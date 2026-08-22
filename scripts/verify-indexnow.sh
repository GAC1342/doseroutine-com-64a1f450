#!/usr/bin/env bash
# verify-indexnow.sh — hit the IndexNow ping endpoint after a deploy and
# confirm the site actually submitted URLs to IndexNow (HTTP 200/202 from
# api.indexnow.org for every batch).
#
# Usage:
#   CRON_SECRET=xxx ./scripts/verify-indexnow.sh
#   CRON_SECRET=xxx ./scripts/verify-indexnow.sh https://staging.example.com
#   CRON_SECRET=xxx ./scripts/verify-indexnow.sh \
#     --base https://staging.example.com \
#     --path /api/public/indexnow-ping
#
# Args / env (CLI flags win over env, env wins over defaults):
#   [positional]        base URL (same as --base)
#   --base URL          target base URL         (env: BASE_URL,          default: https://doseroutine.com)
#   --path PATH         endpoint path            (env: INDEXNOW_PATH,     default: /api/public/indexnow-ping)
#   --secret VALUE      cron secret              (env: CRON_SECRET,       required)
#   --secret-header NAME header name for secret  (env: INDEXNOW_SECRET_HEADER, default: x-cron-secret)
#   --retries N         retry count              (env: RETRIES,           default: 6)
#   --sleep N           seconds between retries  (env: SLEEP,             default: 10)
#   -h | --help         show this help
#
# Exits 0 when the endpoint returned 200 AND every reported batch has
# ok=true with a 2xx status from IndexNow. Exits non-zero otherwise.

set -u

usage() { sed -n '2,26p' "$0"; }

BASE="${BASE_URL:-https://doseroutine.com}"
INDEXNOW_PATH="${INDEXNOW_PATH:-/api/public/indexnow-ping}"
SECRET="${CRON_SECRET:-}"
SECRET_HEADER="${INDEXNOW_SECRET_HEADER:-x-cron-secret}"
RETRIES="${RETRIES:-6}"
SLEEP_SECS="${SLEEP:-10}"

while (( "$#" )); do
  case "$1" in
    --base)          BASE="$2"; shift 2 ;;
    --path)          INDEXNOW_PATH="$2"; shift 2 ;;
    --secret)        SECRET="$2"; shift 2 ;;
    --secret-header) SECRET_HEADER="$2"; shift 2 ;;
    --secret-param)  # legacy flag: the secret is sent as a header now
                     shift 2 ;;
    --retries)       RETRIES="$2"; shift 2 ;;
    --sleep)         SLEEP_SECS="$2"; shift 2 ;;
    -h|--help)       usage; exit 0 ;;
    --) shift; break ;;
    -*)
      echo "❌ unknown flag: $1" >&2; usage >&2; exit 2 ;;
    *)
      BASE="$1"; shift ;;
  esac
done

BASE="${BASE%/}"
# Ensure path starts with /
[[ "$INDEXNOW_PATH" == /* ]] || INDEXNOW_PATH="/$INDEXNOW_PATH"

if [[ -z "$SECRET" ]]; then
  echo "❌ CRON_SECRET env var (or --secret flag) is required" >&2
  echo "   export CRON_SECRET=... && $0 [base-url]" >&2
  exit 2
fi

URL="${BASE}${INDEXNOW_PATH}"

echo "▶ IndexNow post-deploy verification → $URL (secret sent via ${SECRET_HEADER} header)"
echo "  retries=$RETRIES  sleep=${SLEEP_SECS}s"

attempt=1
while (( attempt <= RETRIES )); do
  echo
  echo "── attempt $attempt/$RETRIES ──"

  tmp="$(mktemp)"
  code="$(curl -sSL --max-time 30 -H "${SECRET_HEADER}: ${SECRET}" \
    -o "$tmp" -w "%{http_code}" "$URL" || echo "000")"
  body="$(cat "$tmp")"
  rm -f "$tmp"

  echo "HTTP $code"
  echo "$body" | head -c 800
  echo

  # If SMOKE_LOG_DIR is set (e.g. from CI), persist the raw JSON response so
  # failing runs can be inspected as an uploaded artifact.
  if [[ -n "${SMOKE_LOG_DIR:-}" ]]; then
    mkdir -p "$SMOKE_LOG_DIR"
    printf 'HTTP %s\n%s\n' "$code" "$body" \
      > "$SMOKE_LOG_DIR/indexnow-attempt-${attempt}.json"
  fi

  if [[ "$code" == "200" ]]; then
    result="$(python3 - "$body" <<'PY'
import json, sys
try:
    data = json.loads(sys.argv[1])
except Exception as e:
    print(f"FAIL parse:{e}"); sys.exit()
submitted = data.get("submitted", 0)
batches = data.get("batches", [])
if not batches:
    print("FAIL no batches"); sys.exit()
bad = [b for b in batches if not b.get("ok") or not (200 <= int(b.get("status", 0)) < 300)]
if bad:
    print(f"FAIL bad batches: {bad}"); sys.exit()
print(f"OK submitted={submitted} batches={len(batches)}")
PY
)"
    if [[ "$result" == OK* ]]; then
      echo "✅ IndexNow ping succeeded — $result"
      exit 0
    else
      echo "❌ IndexNow response invalid — $result"
    fi
  else
    echo "❌ endpoint returned HTTP $code"
  fi

  if (( attempt < RETRIES )); then
    echo "…waiting ${SLEEP_SECS}s before retry"
    sleep "$SLEEP_SECS"
  fi
  attempt=$((attempt + 1))
done

echo
echo "❌ IndexNow verification failed after $RETRIES attempts against $BASE"
exit 1
