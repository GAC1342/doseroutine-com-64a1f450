#!/usr/bin/env bash
# Upload iOS dSYM bundles to Firebase Crashlytics after an Xcode archive.
#
# Requires (set in Codemagic → Environment variables → group `doseroutine_env`):
#   - FIREBASE_IOS_APP_ID            e.g. 1:123456789:ios:abcdef012345
#   - FIREBASE_SERVICE_ACCOUNT_JSON  full JSON of a service account with the
#                                    "Firebase Crashlytics Symbol Uploader" role
#
# Skips cleanly (exit 0) if the env vars are missing, so the build isn't blocked
# while Crashlytics is still being wired up per docs/crashlytics-setup.md.
set -u -o pipefail

log() { echo "[crashlytics-dsym] $*"; }

if [ -z "${FIREBASE_IOS_APP_ID:-}" ] || [ -z "${FIREBASE_SERVICE_ACCOUNT_JSON:-}" ]; then
  log "SKIP: FIREBASE_IOS_APP_ID / FIREBASE_SERVICE_ACCOUNT_JSON not set."
  log "      Add them under Codemagic → Environment variables → group 'doseroutine_env'"
  log "      to enable automatic dSYM upload to Crashlytics."
  exit 0
fi

BUILD_DIR="${CM_BUILD_DIR:-$PWD}"
CREDS_FILE="$(mktemp -t fb-crashlytics-creds.XXXXXX.json)"
trap 'rm -f "$CREDS_FILE"' EXIT

# Write the service account JSON to a temp file for firebase-tools.
printf '%s' "$FIREBASE_SERVICE_ACCOUNT_JSON" > "$CREDS_FILE"
export GOOGLE_APPLICATION_CREDENTIALS="$CREDS_FILE"

# Collect every dSYM produced by the archive step.
DSYM_ROOTS=(
  "$BUILD_DIR/build/ios/xcarchive"
  "$HOME/Library/Developer/Xcode/DerivedData"
)

MAPFILE_DSYMS=()
while IFS= read -r line; do
  [ -n "$line" ] && MAPFILE_DSYMS+=("$line")
done < <(
  for root in "${DSYM_ROOTS[@]}"; do
    [ -d "$root" ] && find "$root" -type d -name "*.dSYM" 2>/dev/null
  done | sort -u
)

if [ "${#MAPFILE_DSYMS[@]}" -eq 0 ]; then
  log "WARN: no .dSYM bundles found under: ${DSYM_ROOTS[*]}"
  log "      Xcode may have stripped debug symbols. Check DEBUG_INFORMATION_FORMAT=dwarf-with-dsym."
  exit 0
fi

log "Uploading ${#MAPFILE_DSYMS[@]} dSYM bundle(s) to Firebase app $FIREBASE_IOS_APP_ID"
for dsym in "${MAPFILE_DSYMS[@]}"; do
  log "  → $dsym"
done

# firebase-tools ships as an npm package; pin to a stable major so behavior
# doesn't shift between builds. `npx -y` handles install on the Codemagic image.
FIREBASE_TOOLS_VERSION="${FIREBASE_TOOLS_VERSION:-13}"

set +e
npx -y "firebase-tools@$FIREBASE_TOOLS_VERSION" \
  crashlytics:symbols:upload \
  --app="$FIREBASE_IOS_APP_ID" \
  "${MAPFILE_DSYMS[@]}"
STATUS=$?
set -e

if [ "$STATUS" -ne 0 ]; then
  log "ERROR: dSYM upload failed with exit $STATUS."
  log "       Verify the service account has the 'Firebase Crashlytics Symbol Uploader' role."
  # Do not fail the whole build over symbol upload — the .ipa is still valid.
  exit 0
fi

log "dSYM upload complete."
