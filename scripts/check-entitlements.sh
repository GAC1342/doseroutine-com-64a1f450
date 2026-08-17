#!/usr/bin/env bash
# check-entitlements.sh — Diff a built iOS .ipa's entitlements against
# ios-entitlements-plan.txt (the declared TestFlight submission plan).
#
# Usage:
#   scripts/check-entitlements.sh path/to/App.ipa [plan-file]
#
# Exit codes:
#   0  actual entitlements match the plan
#   1  drift detected (missing required, or unexpected/forbidden present)
#   2  usage/tooling error
#
# Runs cross-platform (macOS + Linux CI). Uses `codesign` when available,
# otherwise falls back to scraping the entitlements plist from the Mach-O.

set -euo pipefail

IPA_PATH="${1:-}"
PLAN_FILE="${2:-ios-entitlements-plan.txt}"

if [[ -z "$IPA_PATH" ]]; then
  echo "Usage: $0 path/to/App.ipa [plan-file]" >&2
  exit 2
fi
[[ -f "$IPA_PATH"  ]] || { echo "❌ Not found: $IPA_PATH"  >&2; exit 2; }
[[ -f "$PLAN_FILE" ]] || { echo "❌ Not found: $PLAN_FILE" >&2; exit 2; }

WORK="$(mktemp -d)"
trap 'rm -rf "$WORK"' EXIT

echo "📦 Extracting $(basename "$IPA_PATH")"
unzip -q "$IPA_PATH" -d "$WORK"
APP_DIR="$(find "$WORK/Payload" -maxdepth 1 -type d -name '*.app' | head -n1)"
[[ -n "$APP_DIR" ]] || { echo "❌ No .app inside Payload/" >&2; exit 1; }
BINARY="$APP_DIR/$(basename "$APP_DIR" .app)"

# --- Extract entitlements ----------------------------------------------------
ENT_XML=""
if command -v codesign >/dev/null 2>&1; then
  ENT_XML="$(codesign -d --entitlements :- "$APP_DIR" 2>/dev/null || true)"
fi
if [[ -z "$ENT_XML" ]]; then
  ENT_XML="$(python3 - "$BINARY" <<'PY' 2>/dev/null || true
import re,sys
d=open(sys.argv[1],'rb').read()
m=re.search(rb'<\?xml[^<]*<!DOCTYPE plist.*?</plist>', d, re.S)
if m: sys.stdout.buffer.write(m.group(0))
PY
)"
fi
[[ -n "$ENT_XML" ]] || { echo "❌ Could not read entitlements" >&2; exit 1; }

# List of actual entitlement keys (top-level <key>…</key> under <dict>)
ACTUAL_KEYS="$(python3 - <<PY
import plistlib, sys
xml = """$(printf '%s' "$ENT_XML" | sed 's/"/\\"/g')"""
# Re-read from stdin path instead — safer:
PY
)" || true

# The heredoc-in-heredoc is fragile; do it via a tmp file:
ENT_FILE="$WORK/entitlements.plist"
printf '%s' "$ENT_XML" > "$ENT_FILE"
ACTUAL_KEYS="$(python3 -c "
import plistlib
with open('$ENT_FILE','rb') as f:
    p = plistlib.load(f)
for k in sorted(p.keys()):
    print(k)
")"

# --- Parse plan --------------------------------------------------------------
parse_section() {
  local section="$1"
  awk -v s="[$section]" '
    /^\[/ { in_s = ($0 == s); next }
    in_s && NF && $1 !~ /^#/ { print $1 }
  ' "$PLAN_FILE"
}
REQUIRED="$(parse_section required)"
OPTIONAL="$(parse_section optional)"
FORBIDDEN="$(parse_section forbidden)"

contains() { grep -Fxq "$1" <<<"$2"; }

FAIL=0
echo ""
echo "🔐 Actual entitlements:"
sed 's/^/   • /' <<<"$ACTUAL_KEYS"
echo ""
echo "📋 Comparing against $PLAN_FILE"

# Missing required
while IFS= read -r k; do
  [[ -z "$k" ]] && continue
  if contains "$k" "$ACTUAL_KEYS"; then
    echo "  ✅ required  $k"
  else
    echo "  ❌ MISSING   $k (declared required in plan)" >&2
    FAIL=1
  fi
done <<<"$REQUIRED"

# Forbidden present
while IFS= read -r k; do
  [[ -z "$k" ]] && continue
  if contains "$k" "$ACTUAL_KEYS"; then
    echo "  ❌ FORBIDDEN $k is present in the build" >&2
    FAIL=1
  fi
done <<<"$FORBIDDEN"

# Undeclared keys (present but not in required/optional/forbidden)
DECLARED="$(printf '%s\n%s\n%s\n' "$REQUIRED" "$OPTIONAL" "$FORBIDDEN" | sort -u)"
while IFS= read -r k; do
  [[ -z "$k" ]] && continue
  if ! grep -Fxq "$k" <<<"$DECLARED"; then
    echo "  ❌ UNDECLARED $k present but not in the plan" >&2
    echo "     → add to [optional], [required], or [forbidden] in $PLAN_FILE" >&2
    FAIL=1
  fi
done <<<"$ACTUAL_KEYS"

echo ""
if (( FAIL )); then
  echo "❌ Entitlements drift — fix the plan or the Xcode capabilities before submitting."
  exit 1
fi
echo "✅ Entitlements match the submission plan."
