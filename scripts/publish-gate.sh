#!/usr/bin/env bash
# Publish gate: verify the live environment serves the expected markers.
# Exit non-zero => do NOT publish / roll back.
#
# Usage:
#   scripts/publish-gate.sh                 # verify current live site
#   BASE=https://doseroutine.com scripts/publish-gate.sh
set -euo pipefail

BASE="${BASE:-https://doseroutine.com}"
REPORT="${REPORT:-/tmp/publish-gate-markers.json}"

echo "▶ publish gate → $BASE"

if ! curl -sfI "$BASE/" >/dev/null; then
  echo "❌ live site not reachable at $BASE — blocking publish"
  exit 1
fi

if ! node scripts/check-deployed-markers.mjs --base "$BASE" --json "$REPORT"; then
  echo "❌ deployed-markers verification FAILED — blocking publish"
  echo "   report: $REPORT"
  exit 1
fi

echo "✅ publish gate passed — safe to publish"
