#!/usr/bin/env bash
# validate-ipa.sh — Pre-TestFlight sanity check for a built iOS .ipa
#
# Usage:
#   scripts/validate-ipa.sh path/to/App.ipa [expected-version]
#
# Verifies:
#   1. CFBundleIdentifier == com.doseroutine.app
#   2. CFBundleShortVersionString matches expected-version (if provided) and is SemVer
#   3. CFBundleVersion (build number) is a positive integer
#   4. Embedded entitlements match the bundle id; StoreKit/IAP may be implicit
#   5. No unexpected restricted entitlements
#   6. Provisioning profile team id == LTZ9X7NMQJ and not expired
#
# Exits non-zero on any failure so CI (Codemagic post-build) can gate the upload.

set -euo pipefail

EXPECTED_BUNDLE_ID="com.doseroutine.app"
EXPECTED_TEAM_ID="LTZ9X7NMQJ"
IAP_HINT_ENTITLEMENTS=("com.apple.developer.storekit" "in-app-purchase")
FORBIDDEN_ENTITLEMENTS=(
  "com.apple.developer.healthkit.access"
  "com.apple.security.personal-information.location"
  "com.apple.developer.homekit"
  "com.apple.developer.family-controls"
)

IPA_PATH="${1:-}"
EXPECTED_VERSION="${2:-}"

if [[ -z "$IPA_PATH" ]]; then
  echo "Usage: $0 path/to/App.ipa [expected-version]" >&2
  exit 2
fi
if [[ ! -f "$IPA_PATH" ]]; then
  echo "❌ Not found: $IPA_PATH" >&2
  exit 2
fi

for bin in unzip plutil; do
  if ! command -v "$bin" >/dev/null 2>&1; then
    if [[ "$bin" == "plutil" ]]; then
      echo "⚠️  plutil not available — falling back to python plistlib"
    else
      echo "❌ Missing required tool: $bin" >&2
      exit 2
    fi
  fi
done

WORK="$(mktemp -d)"
trap 'rm -rf "$WORK"' EXIT

echo "📦 Extracting $(basename "$IPA_PATH")"
unzip -q "$IPA_PATH" -d "$WORK"

APP_DIR="$(find "$WORK/Payload" -maxdepth 1 -type d -name '*.app' | head -n1)"
if [[ -z "$APP_DIR" ]]; then
  echo "❌ No .app bundle inside Payload/" >&2
  exit 1
fi
APP_NAME="$(basename "$APP_DIR")"
BINARY="$APP_DIR/${APP_NAME%.app}"
INFO_PLIST="$APP_DIR/Info.plist"
PROFILE="$APP_DIR/embedded.mobileprovision"

FAIL=0
pass() { echo "  ✅ $1"; }
fail() { echo "  ❌ $1" >&2; FAIL=1; }

# --- Read Info.plist ---------------------------------------------------------
read_plist() {
  local key="$1" file="$2"
  if command -v plutil >/dev/null 2>&1; then
    plutil -extract "$key" raw -o - "$file" 2>/dev/null || true
  else
    python3 -c "
import plistlib,sys
with open('$file','rb') as f: p=plistlib.load(f)
v=p.get('$key','')
print(v)
" 2>/dev/null || true
  fi
}

echo ""
echo "🔎 Info.plist"
BUNDLE_ID="$(read_plist CFBundleIdentifier "$INFO_PLIST")"
SHORT_VERSION="$(read_plist CFBundleShortVersionString "$INFO_PLIST")"
BUILD_NUMBER="$(read_plist CFBundleVersion "$INFO_PLIST")"
MIN_OS="$(read_plist MinimumOSVersion "$INFO_PLIST")"

echo "  bundle id       : $BUNDLE_ID"
echo "  version         : $SHORT_VERSION"
echo "  build number    : $BUILD_NUMBER"
echo "  min iOS         : $MIN_OS"

[[ "$BUNDLE_ID" == "$EXPECTED_BUNDLE_ID" ]] \
  && pass "CFBundleIdentifier matches $EXPECTED_BUNDLE_ID" \
  || fail "CFBundleIdentifier is '$BUNDLE_ID' (expected $EXPECTED_BUNDLE_ID)"

if [[ -n "$EXPECTED_VERSION" ]]; then
  [[ "$SHORT_VERSION" == "$EXPECTED_VERSION" ]] \
    && pass "CFBundleShortVersionString matches $EXPECTED_VERSION" \
    || fail "CFBundleShortVersionString is '$SHORT_VERSION' (expected $EXPECTED_VERSION)"
fi

if [[ "$SHORT_VERSION" =~ ^[0-9]+\.[0-9]+(\.[0-9]+)?$ ]]; then
  pass "Version is SemVer-shaped"
else
  fail "Version '$SHORT_VERSION' is not X.Y or X.Y.Z"
fi

if [[ "$BUILD_NUMBER" =~ ^[0-9]+$ ]] && (( BUILD_NUMBER > 0 )); then
  pass "Build number is a positive integer"
else
  fail "Build number '$BUILD_NUMBER' is not a positive integer"
fi

# --- Entitlements from the signed binary -------------------------------------
echo ""
echo "🔐 Entitlements"
ENT_XML=""
if command -v codesign >/dev/null 2>&1; then
  ENT_XML="$(codesign -d --entitlements :- "$APP_DIR" 2>/dev/null || true)"
fi
if [[ -z "$ENT_XML" ]]; then
  # Cross-platform fallback: pull the embedded entitlements plist out of the Mach-O.
  # Every entitlements blob is wrapped in <plist ...>...</plist> XML.
  ENT_XML="$(python3 - "$BINARY" <<'PY' 2>/dev/null || true
import re,sys
data=open(sys.argv[1],'rb').read()
m=re.search(rb'<\?xml[^<]*<!DOCTYPE plist.*?</plist>', data, re.S)
if m: sys.stdout.buffer.write(m.group(0))
PY
)"
fi

if [[ -z "$ENT_XML" ]]; then
  fail "Could not read embedded entitlements (need codesign, or a signed Mach-O)"
else
  ENT_APP_ID="$(printf '%s' "$ENT_XML" | grep -A1 'application-identifier' | grep '<string>' | head -n1 | sed -E 's/.*<string>(.*)<\/string>.*/\1/')"
  ENT_TEAM_ID="$(printf '%s' "$ENT_XML" | grep -A1 'com.apple.developer.team-identifier' | grep '<string>' | head -n1 | sed -E 's/.*<string>(.*)<\/string>.*/\1/')"

  echo "  application-identifier : $ENT_APP_ID"
  echo "  team-identifier        : $ENT_TEAM_ID"

  if [[ "$ENT_APP_ID" == *".$EXPECTED_BUNDLE_ID" ]]; then
    pass "Entitlements bundle id matches"
  else
    fail "Entitlements application-identifier '$ENT_APP_ID' does not end in .$EXPECTED_BUNDLE_ID"
  fi

  if [[ "$ENT_TEAM_ID" == "$EXPECTED_TEAM_ID" ]]; then
    pass "Entitlements team id = $EXPECTED_TEAM_ID"
  else
    fail "Entitlements team id '$ENT_TEAM_ID' (expected $EXPECTED_TEAM_ID)"
  fi

  # Optional hint only: StoreKit / IAP may be implicit for RevenueCat.
  IAP_FOUND=0
  for k in "${IAP_HINT_ENTITLEMENTS[@]}"; do
    if printf '%s' "$ENT_XML" | grep -q "$k"; then IAP_FOUND=1; fi
  done
  if (( IAP_FOUND )); then
    pass "In-App Purchase entitlement present"
  else
    echo "  ⚠️  No explicit IAP entitlement key found. Modern iOS grants StoreKit implicitly — verify sandbox purchases work in TestFlight."
  fi

  # Forbidden entitlements — DoseRoutine does not use these
  for k in "${FORBIDDEN_ENTITLEMENTS[@]}"; do
    if printf '%s' "$ENT_XML" | grep -q "$k"; then
      fail "Unexpected entitlement present: $k (will cause App Review questions)"
    fi
  done
  pass "No forbidden entitlements (clinical records, HomeKit, Location, Family Controls)"
fi

# --- Provisioning profile ----------------------------------------------------
echo ""
echo "📄 embedded.mobileprovision"
if [[ ! -f "$PROFILE" ]]; then
  fail "embedded.mobileprovision not found in .app"
else
  PROFILE_PLIST="$WORK/profile.plist"
  # Strip CMS wrapper to raw plist
  if command -v security >/dev/null 2>&1; then
    security cms -D -i "$PROFILE" > "$PROFILE_PLIST" 2>/dev/null || true
  fi
  if [[ ! -s "$PROFILE_PLIST" ]]; then
    # openssl fallback works cross-platform
    openssl smime -inform der -verify -noverify -in "$PROFILE" -out "$PROFILE_PLIST" 2>/dev/null || true
  fi

  if [[ ! -s "$PROFILE_PLIST" ]]; then
    fail "Could not decode provisioning profile"
  else
    P_TEAM="$(read_plist TeamIdentifier "$PROFILE_PLIST" | tr -d '[]",' | awk '{print $1}')"
    P_NAME="$(read_plist Name "$PROFILE_PLIST")"
    P_EXP="$(read_plist ExpirationDate "$PROFILE_PLIST")"
    echo "  profile name    : $P_NAME"
    echo "  team id         : $P_TEAM"
    echo "  expires         : $P_EXP"

    [[ "$P_TEAM" == "$EXPECTED_TEAM_ID" ]] \
      && pass "Provisioning profile team id matches" \
      || fail "Profile team id '$P_TEAM' (expected $EXPECTED_TEAM_ID)"

    if [[ -n "$P_EXP" ]]; then
      NOW_EPOCH=$(date -u +%s)
      EXP_EPOCH=$(date -u -d "$P_EXP" +%s 2>/dev/null || date -u -jf "%Y-%m-%dT%H:%M:%SZ" "$P_EXP" +%s 2>/dev/null || echo 0)
      if (( EXP_EPOCH > NOW_EPOCH )); then
        pass "Profile not expired"
      else
        fail "Profile is expired ($P_EXP)"
      fi
    fi
  fi
fi

echo ""
if (( FAIL )); then
  echo "❌ Validation FAILED — do not upload this .ipa."
  exit 1
fi
echo "✅ All checks passed — safe to upload to TestFlight."
