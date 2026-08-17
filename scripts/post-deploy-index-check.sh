#!/usr/bin/env bash
# Post-deploy indexing check.
#
# Runs AFTER a deploy against the live site:
#   1. Re-downloads /sitemap.xml with a cache-busting query so the CDN
#      cannot hand back a stale copy, and reports how many URLs it lists.
#   2. Validates JSON-LD structured data across those URLs (strict JSON
#      parse + required fields per @type).
#   3. Validates indexability (HTTP 200, no noindex, one valid canonical).
#
# Usage:
#   scripts/post-deploy-index-check.sh [BASE_URL]
#
# Env:
#   BASE_URL      target site (default https://doseroutine.com)
#   INDEX_LIMIT   cap URLs for the indexability pass (default 250, 0 = all)
#   CONCURRENCY   parallel requests for the indexability pass (default 8)
#
# Exit 0 = safe, 1 = at least one indexing/structured-data problem.

set -uo pipefail

BASE="${1:-${BASE_URL:-https://doseroutine.com}}"
BASE="${BASE%/}"
INDEX_LIMIT="${INDEX_LIMIT:-250}"
CONCURRENCY="${CONCURRENCY:-8}"

OUT_DIR="${OUT_DIR:-$(mktemp -d)}"
mkdir -p "$OUT_DIR"
SITEMAP_FILE="$OUT_DIR/sitemap.xml"
STAMP="$(date -u +%Y%m%d%H%M%S)"

FAILURES=()
SUMMARY=()

log() { printf '\n=== %s ===\n' "$1"; }

note() { SUMMARY+=("$1"); }

# --- 1. Re-download sitemap.xml (cache-busted) ------------------------------
log "Re-downloading sitemap.xml from $BASE"
HTTP_CODE="$(curl -sS -L --compressed \
  -H 'Cache-Control: no-cache' \
  -H 'Pragma: no-cache' \
  -A 'DoseRoutine-PostDeploy/1.0' \
  -o "$SITEMAP_FILE" -w '%{http_code}' \
  "$BASE/sitemap.xml?cb=$STAMP" || echo 000)"

echo "HTTP $HTTP_CODE -> $SITEMAP_FILE"

if [ "$HTTP_CODE" != "200" ]; then
  FAILURES+=("sitemap.xml returned HTTP $HTTP_CODE")
  note "sitemap.xml: **HTTP $HTTP_CODE** (expected 200)"
else
  URL_COUNT="$(grep -o '<loc>' "$SITEMAP_FILE" | wc -l | tr -d ' ')"
  echo "sitemap entries: $URL_COUNT"
  if ! head -c 400 "$SITEMAP_FILE" | grep -qi '<urlset\|<sitemapindex'; then
    FAILURES+=("sitemap.xml is not valid XML (<urlset>/<sitemapindex> missing)")
    note "sitemap.xml: **malformed** — no <urlset>/<sitemapindex> root"
  elif [ "$URL_COUNT" -eq 0 ]; then
    FAILURES+=("sitemap.xml lists 0 URLs")
    note "sitemap.xml: **0 URLs**"
  else
    note "sitemap.xml: 200 OK, $URL_COUNT URLs"
  fi
fi

# --- 2. JSON-LD validation across sitemap URLs ------------------------------
log "Validating JSON-LD structured data"
if python3 scripts/validate-jsonld-schema.py "$BASE" 2>&1 | tee "$OUT_DIR/jsonld.log"; then
  note "JSON-LD: no parse errors or missing required fields"
else
  FAILURES+=("JSON-LD validation failed (see jsonld.log)")
  note "JSON-LD: **failed** — see \`jsonld.log\`"
fi

# --- 3. Indexability validation --------------------------------------------
log "Validating indexability (status, robots, canonical)"
IDX_ARGS=(--base "$BASE" --concurrency "$CONCURRENCY")
if [ "$INDEX_LIMIT" != "0" ]; then
  IDX_ARGS+=(--limit "$INDEX_LIMIT")
fi
if python3 scripts/validate-sitemap-indexability.py "${IDX_ARGS[@]}" 2>&1 | tee "$OUT_DIR/indexability.log"; then
  note "Indexability: all sampled URLs 200 + indexable + canonical OK"
else
  FAILURES+=("Indexability validation failed (see indexability.log)")
  note "Indexability: **failed** — see \`indexability.log\`"
fi

# --- Report -----------------------------------------------------------------
{
  echo ""
  echo "## Post-deploy indexing check"
  echo ""
  echo "Target: \`$BASE\` · $(date -u '+%Y-%m-%d %H:%M UTC')"
  echo ""
  for line in "${SUMMARY[@]}"; do echo "- $line"; done
  echo ""
  if [ "${#FAILURES[@]}" -eq 0 ]; then
    echo "**Result: PASS** — sitemap fresh, structured data valid, pages indexable."
  else
    echo "**Result: FAIL**"
    echo ""
    for line in "${FAILURES[@]}"; do echo "- $line"; done
  fi
} | tee -a "${GITHUB_STEP_SUMMARY:-/dev/stdout}" >/dev/null

echo ""
echo "Artifacts in: $OUT_DIR"
for line in "${SUMMARY[@]}"; do echo " - $line"; done

if [ "${#FAILURES[@]}" -gt 0 ]; then
  echo ""
  echo "FAILED:"
  for line in "${FAILURES[@]}"; do echo " - $line"; done
  exit 1
fi

echo "PASS"
exit 0
