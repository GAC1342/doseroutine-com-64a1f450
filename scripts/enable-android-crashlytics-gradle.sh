#!/usr/bin/env bash
# Idempotently applies the Firebase Crashlytics Gradle plugin to the Android
# project so `./gradlew bundleRelease` auto-uploads the R8/ProGuard mapping.txt
# to Firebase Crashlytics for symbolicated stack traces.
#
# Runs after `npx cap sync android` and before `./gradlew bundleRelease`.
# No-ops (exit 0) if android/app/google-services.json is missing — matches the
# skip-until-configured behaviour documented in docs/crashlytics-setup.md.
set -e -o pipefail

log() { echo "[crashlytics-gradle] $*"; }

ROOT_GRADLE="android/build.gradle"
APP_GRADLE="android/app/build.gradle"
GSJSON="android/app/google-services.json"

if [ ! -f "$GSJSON" ]; then
  log "SKIP: $GSJSON not found. Add it per docs/crashlytics-setup.md to enable mapping upload."
  exit 0
fi
if [ ! -f "$ROOT_GRADLE" ] || [ ! -f "$APP_GRADLE" ]; then
  log "SKIP: Android project not generated yet ($ROOT_GRADLE / $APP_GRADLE missing)."
  exit 0
fi

# --- 1. Root build.gradle: add Crashlytics + google-services classpaths ------
add_classpath() {
  local coord="$1"
  local pattern="$2"
  if grep -qE "$pattern" "$ROOT_GRADLE"; then
    log "OK  classpath already present: $coord"
    return
  fi
  # Insert into the buildscript { dependencies { ... } } block.
  # Match the first `dependencies {` inside `buildscript {` and append.
  python3 - "$ROOT_GRADLE" "$coord" <<'PY'
import re, sys
path, coord = sys.argv[1], sys.argv[2]
src = open(path).read()
m = re.search(r'buildscript\s*\{', src)
if not m:
    # No buildscript block — prepend one.
    block = (
        "buildscript {\n"
        "    dependencies {\n"
        f"        classpath '{coord}'\n"
        "    }\n"
        "}\n\n"
    )
    open(path, 'w').write(block + src)
    sys.exit(0)
# Find the matching `dependencies {` after buildscript {
tail = src[m.end():]
dm = re.search(r'dependencies\s*\{', tail)
if not dm:
    # buildscript block exists but no dependencies — inject one just inside.
    insert_at = m.end()
    injected = f"\n    dependencies {{\n        classpath '{coord}'\n    }}\n"
    new = src[:insert_at] + injected + src[insert_at:]
    open(path, 'w').write(new)
    sys.exit(0)
insert_at = m.end() + dm.end()
new = src[:insert_at] + f"\n        classpath '{coord}'" + src[insert_at:]
open(path, 'w').write(new)
PY
  log "ADD classpath: $coord"
}

add_classpath "com.google.gms:google-services:4.4.2"       "com\\.google\\.gms:google-services"
add_classpath "com.google.firebase:firebase-crashlytics-gradle:3.0.2" "firebase-crashlytics-gradle"

# --- 2. App build.gradle: apply plugins + enable mapping upload -------------
ensure_apply() {
  local plugin="$1"
  if grep -qE "apply plugin: ['\"]${plugin}['\"]" "$APP_GRADLE"; then
    log "OK  plugin already applied: $plugin"
    return
  fi
  # Append after any existing apply plugin lines, or at the top otherwise.
  if grep -qE "^apply plugin:" "$APP_GRADLE"; then
    awk -v line="apply plugin: '${plugin}'" '
      /^apply plugin:/ { print; last=NR; next }
      { lines[NR]=$0 }
      END {
        for (i=1;i<=NR;i++) {
          print lines[i]
          if (i==last) print line
        }
      }
    ' "$APP_GRADLE" > "$APP_GRADLE.tmp" && mv "$APP_GRADLE.tmp" "$APP_GRADLE"
  else
    printf "apply plugin: '%s'\n" "$plugin" | cat - "$APP_GRADLE" > "$APP_GRADLE.tmp" \
      && mv "$APP_GRADLE.tmp" "$APP_GRADLE"
  fi
  log "ADD apply plugin: $plugin"
}
ensure_apply "com.google.gms.google-services"
ensure_apply "com.google.firebase.crashlytics"

# Force mapping file upload for the release buildType (default is true, but be
# explicit so Crashlytics uploads even when minifyEnabled is toggled by hand).
if ! grep -q "mappingFileUploadEnabled" "$APP_GRADLE"; then
  python3 - "$APP_GRADLE" <<'PY'
import re, sys
path = sys.argv[1]
src = open(path).read()
# Inject a firebaseCrashlytics { mappingFileUploadEnabled true } block into
# android { buildTypes { release { ... } } }. If we can't find it precisely,
# append a top-level android { buildTypes { release { firebaseCrashlytics {} } } }
# extension block, which Gradle merges with the existing one.
extension = """
android {
    buildTypes {
        release {
            firebaseCrashlytics {
                mappingFileUploadEnabled true
                nativeSymbolUploadEnabled false
            }
        }
    }
}
"""
open(path, 'a').write("\n" + extension)
PY
  log "ADD firebaseCrashlytics { mappingFileUploadEnabled true } for release"
fi

log "Android Crashlytics Gradle plugin ready — mapping.txt will auto-upload on bundleRelease."
