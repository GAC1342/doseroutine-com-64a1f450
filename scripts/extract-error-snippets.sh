#!/usr/bin/env bash
# Extract the first failing stack trace / error snippet from each build log.
# For every file in build-logs/*.log, produce build-logs/errors/<name>.snippet.txt
# containing ~25 lines before and 60 lines after the first strong error match.
# Also emits build-logs/errors/SUMMARY.txt listing all snippets with the offending line.
#
# Non-fatal: always exits 0 so it never masks the real build failure.
set +e

LOG_DIR="${1:-${CM_BUILD_DIR:-$(pwd)}/build-logs}"
OUT_DIR="$LOG_DIR/errors"

if [ ! -d "$LOG_DIR" ]; then
  echo "extract-error-snippets: no log dir at $LOG_DIR — nothing to do."
  exit 0
fi

mkdir -p "$OUT_DIR"
SUMMARY="$OUT_DIR/SUMMARY.txt"
: > "$SUMMARY"

# Ordered patterns, most specific first. First hit per file wins.
# Case-insensitive, extended regex.
PATTERNS=(
  '(public.*opened|ios/App/App/public/index.html is missing|Capacitor sync did not create the required iOS files|No .*Podfile.* found)'
  '(ENTITY_ERROR\.ATTRIBUTE\.TYPE|not a valid value for the attribute .capabilityType)'
  '(Did not find any Signing Certificates for given private key|already have a current Distribution certificate|pending certificate request)'
  '(Could not resolve package dependencies|Conflicting identity for app|package identity)'
  '\*\* (BUILD|ARCHIVE|TEST) FAILED \*\*'
  '(Execution failed for task|What went wrong:|Task :[^ ]+ FAILED)'
  '(FAILURE|BUILD FAILED): '
  '(fatal error|ld: error|clang: error|xcodebuild: error|swift(c)?: error)'
  '(Error:|error:) '
  '\[!\] '
  '(Traceback \(most recent call last\)|Exception in thread)'
  '(npm ERR!|ERR_)'
  '(Undefined symbols for architecture|Command PhaseScriptExecution failed)'
  '(No matching profiles found|Provisioning profile .* doesn.t (include|match)|Code Signing Error)'
  '(^|[^[:alpha:]])Failed to'
)

shopt -s nullglob
found_any=0
for f in "$LOG_DIR"/*.log; do
  # A signing fetch may fail once, repair Apple's stale certificate records,
  # then succeed on retry. Do not report that recovered first attempt as the
  # cause of a later Xcode archive failure.
  if grep -q '^SIGNING_REPAIR_SUCCEEDED$' "$f" 2>/dev/null; then
    continue
  fi
  # fetch-signing-files.log includes the output of the raw first attempt because
  # the whole signing step is tee'd into it. If repair later succeeded, the
  # aggregate log is also recovered and must not be classified as a failure.
  if [ "$(basename "$f")" = "fetch-signing-files.log" ] && grep -q 'SIGNING_REPAIR_SUCCEEDED' "$f" 2>/dev/null; then
    continue
  fi
  base="$(basename "$f" .log)"
  out="$OUT_DIR/${base}.snippet.txt"
  match_line=""
  match_pat=""
  for pat in "${PATTERNS[@]}"; do
    line_num=$(grep -n -m1 -iE "$pat" "$f" | head -1 | cut -d: -f1)
    if [ -n "$line_num" ]; then
      match_line="$line_num"
      match_pat="$pat"
      break
    fi
  done

  if [ -z "$match_line" ]; then
    # No error pattern matched — skip generating a snippet.
    continue
  fi

  found_any=1
  total=$(wc -l < "$f" | tr -d ' ')
  start=$(( match_line - 25 ))
  [ "$start" -lt 1 ] && start=1
  end=$(( match_line + 60 ))
  [ "$end" -gt "$total" ] && end="$total"

  {
    echo "# Error snippet from: $(basename "$f")"
    echo "# Matched pattern:    $match_pat"
    echo "# First hit at line:  $match_line of $total"
    echo "# Showing lines:      $start–$end"
    echo "# ------------------------------------------------------------"
    sed -n "${start},${end}p" "$f"
  } > "$out"

  # First 1-2 lines around the hit for the summary.
  hit_text=$(sed -n "${match_line}p" "$f" | cut -c1-240)
  {
    echo "- $(basename "$f")  (line $match_line/$total)"
    echo "    $hit_text"
    echo "    snippet: build-logs/errors/${base}.snippet.txt"
    echo ""
  } >> "$SUMMARY"
done

if [ "$found_any" -eq 0 ]; then
  echo "extract-error-snippets: scanned $LOG_DIR — no error patterns found." | tee "$SUMMARY"
  exit 0
fi

echo "extract-error-snippets: wrote snippets to $OUT_DIR"

# ── Failure summary: map first hit in each log to a plain-English root cause. ──
classify() {
  # $1 = log basename, $2 = matched line text
  local name="$1" line="$2"
  case "$line" in
    *"ENTITY_ERROR.ATTRIBUTE.TYPE"*|*"not a valid value for the attribute 'capabilityType'"*)
      echo "Apple capability configuration failed — the signing script sent an unsupported App Store Connect capability enum. Fix the capability mapping in setup-ios-signing.py; this is not a certificate/private-key mismatch." ;;
    *"Did not find any Signing Certificates for given private key"*|*"already have a current Distribution certificate"*|*"pending certificate request"*)
      echo "iOS Distribution certificate/private-key mismatch — do not replace the App Store Connect .p8. Revoke the old Distribution certificate, or upload the matching .p12 plus an App Store provisioning profile to Codemagic Code signing identities, then rerun." ;;
    *"public"*"opened"*|*"ios/App/App/public/index.html is missing"*|*"Capacitor sync did not create the required iOS files"*|*"No "*"Podfile"*" found"*)
      echo "iOS native project generation failed — Capacitor did not create/copy ios/App/App/public or the Podfile. Regenerate the iOS project and rerun cap sync before pod install/build." ;;
    *"No matching profiles found"*|*"Provisioning profile"*|*"Code Signing Error"*|*"doesn't include signing certificate"*)
      echo "iOS code signing — provisioning profile / certificate missing or mismatched for com.doseroutine.app. Check App Store Connect API key role (App Manager+) and that the App ID exists with IAP capability." ;;
    *"Could not resolve package dependencies"*|*"Conflicting identity for app"*|*"package identity"*)
      echo "iOS Swift Package Manager dependency resolution — Capacitor local package names collided. The SPM identity fix must run immediately before xcodebuild resolves packages." ;;
    *"BUILD FAILED"*|*"ARCHIVE FAILED"*|*"FAILURE: Build failed"*)
      case "$name" in
        xcodebuild*) echo "Xcode build failed — inspect the CompileSwift / Ld lines just above the '** BUILD FAILED **' marker in xcodebuild.snippet.txt." ;;
        gradle*)     echo "Gradle build failed — see the 'What went wrong' / 'Execution failed for task' section in gradle-bundle-release.snippet.txt." ;;
        *)           echo "Native build failed in $name — see the snippet for the failing task." ;;
      esac ;;

    *"Execution failed for task"*|*"What went wrong:"*|*"Task :"*"FAILED"*)
      echo "Gradle task failure — usually a Kotlin/Java compile error, missing SDK, or signing config. See gradle-bundle-release.snippet.txt." ;;
    *"ld: error"*|*"Undefined symbols for architecture"*)
      echo "Linker error — a native pod or framework is missing or ABI-mismatched. Try clearing the Pods cache and rebuilding." ;;
    *"clang: error"*|*"fatal error:"*)
      echo "Native compile error — missing header or misconfigured pod. Check the file path in the snippet." ;;
    *"swift"*"error"*|*"swiftc: error"*)
      echo "Swift compile error — see the offending file:line in the snippet." ;;
    *"npm ERR!"*|*"ERR_"*)
      echo "npm install / build failure — likely a bad lockfile or missing dependency. Run 'npm ci' locally to reproduce." ;;
    *"Command PhaseScriptExecution failed"*)
      echo "Xcode run-script phase failed (often the Capacitor 'Embed Pods Frameworks' or a custom script). See snippet for the phase name." ;;
    *"[!] "*)
      echo "CocoaPods failure — usually a spec repo miss or Podfile.lock drift. Try deleting ios/App/Pods and re-running." ;;
    *"Unauthorized"*|*"401"*|*"403"*)
      echo "Auth failure calling App Store Connect / Google Play — check API key / service account credentials in the Codemagic env group." ;;
    *)
      echo "See ${name}.snippet.txt for details." ;;
  esac
}

FAIL_SUMMARY="$OUT_DIR/FAILURE_SUMMARY.txt"

# Category labels (mirrors categorize() below; keep in sync).
# Use a function instead of an associative array so this script works with
# macOS' older default Bash too.
cat_label() {
  case "$1" in
    ios-code-signing) echo "iOS code signing" ;;
    ios-capability-config) echo "iOS capability configuration" ;;
    ios-cert-key-mismatch) echo "iOS Distribution certificate/private key" ;;
    ios-capacitor-project) echo "iOS Capacitor project" ;;
    ios-spm) echo "iOS Swift Package Manager" ;;
    xcode-run-script) echo "Xcode run-script phase" ;;
    native-linker) echo "Native linker (ld)" ;;
    native-compile) echo "Native compile (clang)" ;;
    swift-compile) echo "Swift compile" ;;
    cocoapods) echo "CocoaPods" ;;
    gradle-task) echo "Gradle task" ;;
    native-build) echo "Native build (generic)" ;;
    npm-install) echo "npm install / build" ;;
    api-auth) echo "API auth (App Store / Play)" ;;
    script-exception) echo "Script exception" ;;
    uncategorized) echo "Uncategorized" ;;
    *) echo "$1" ;;
  esac
}

# categorize() is defined further down; forward-declare inline copy so we can
# use it here without reordering the file too aggressively.
_categorize() {
  local line="$1"
  case "$line" in
    *"ENTITY_ERROR.ATTRIBUTE.TYPE"*|*"not a valid value for the attribute 'capabilityType'"*) echo "ios-capability-config" ;;
    *"Did not find any Signing Certificates for given private key"*|*"already have a current Distribution certificate"*|*"pending certificate request"*) echo "ios-cert-key-mismatch" ;;
    *"public"*"opened"*|*"ios/App/App/public/index.html is missing"*|*"Capacitor sync did not create the required iOS files"*|*"No "*"Podfile"*" found"*) echo "ios-capacitor-project" ;;
    *"No matching profiles found"*|*"Provisioning profile"*|*"Code Signing Error"*|*"doesn't include signing certificate"*) echo "ios-code-signing" ;;
    *"Could not resolve package dependencies"*|*"Conflicting identity for app"*|*"package identity"*) echo "ios-spm" ;;
    *"Command PhaseScriptExecution failed"*) echo "xcode-run-script" ;;
    *"ld: error"*|*"Undefined symbols for architecture"*) echo "native-linker" ;;
    *"clang: error"*|*"fatal error:"*) echo "native-compile" ;;
    *"swift"*"error"*|*"swiftc: error"*) echo "swift-compile" ;;
    *"[!] "*) echo "cocoapods" ;;
    *"Execution failed for task"*|*"What went wrong:"*|*"Task :"*"FAILED"*|*"FAILURE: Build failed"*) echo "gradle-task" ;;
    *"BUILD FAILED"*|*"ARCHIVE FAILED"*) echo "native-build" ;;
    *"npm ERR!"*|*"ERR_"*) echo "npm-install" ;;
    *"Unauthorized"*|*"401"*|*"403"*) echo "api-auth" ;;
    *"Traceback"*|*"Exception in thread"*) echo "script-exception" ;;
    *) echo "uncategorized" ;;
  esac
}

# Collect one TSV row per failing log: category<TAB>name<TAB>hit<TAB>reason
ENTRIES_TSV="$OUT_DIR/.entries.tsv"
: > "$ENTRIES_TSV"
while IFS= read -r entry; do
  [[ "$entry" == -\ * ]] || continue
  name=$(printf '%s' "$entry" | sed -E 's/^- ([^ ]+\.log).*/\1/')
  base="${name%.log}"
  hit=$(sed -n '2p' "$OUT_DIR/${base}.snippet.txt" 2>/dev/null | sed 's/^# Matched pattern: *//')
  hit_line=$(grep -m1 -iE "$hit" "$LOG_DIR/$name" 2>/dev/null | head -1)
  reason=$(classify "$name" "$hit_line")
  cat=$(_categorize "$hit_line")
  printf '%s\t%s\t%s\t%s\n' "$cat" "$name" "${hit_line:0:200}" "$reason" >> "$ENTRIES_TSV"
done < "$SUMMARY"

{
  echo "════════════════════════════════════════════════════════════"
  echo " BUILD FAILURE SUMMARY — grouped by likely cause"
  echo "════════════════════════════════════════════════════════════"

  total=$(wc -l < "$ENTRIES_TSV" | tr -d ' ')
  echo ""
  echo "Failing steps: $total"
  echo ""
  echo "Counts by category (most frequent first):"
  # tally categories
  cut -f1 "$ENTRIES_TSV" | sort | uniq -c | sort -rn | while read -r count cat; do
    label="$(cat_label "$cat")"
    printf '  %3d  %-30s  (%s)\n' "$count" "$label" "$cat"
  done

  # Detail sections in same frequency order
  cut -f1 "$ENTRIES_TSV" | sort | uniq -c | sort -rn | while read -r count cat; do
    label="$(cat_label "$cat")"
    echo ""
    echo "────────────────────────────────────────────────────────────"
    echo " $label  ×$count  [$cat]"
    echo "────────────────────────────────────────────────────────────"
    awk -F'\t' -v c="$cat" '$1==c' "$ENTRIES_TSV" | while IFS=$'\t' read -r _c name hit reason; do
      base="${name%.log}"
      echo ""
      echo "▸ $name"
      echo "    hit:    $hit"
      echo "    likely: $reason"
      echo "    file:   build-logs/errors/${base}.snippet.txt"
    done
  done

  echo ""
  echo "════════════════════════════════════════════════════════════"
  echo " Full snippets: build-logs/errors/  |  Full logs: build-logs/"
  echo "════════════════════════════════════════════════════════════"
} | tee "$FAIL_SUMMARY"

rm -f "$ENTRIES_TSV"

# ── build-summary.txt: compact triage map (step → category → snippet) ──
categorize() {
  local line="$1"
  case "$line" in
    *"ENTITY_ERROR.ATTRIBUTE.TYPE"*|*"not a valid value for the attribute 'capabilityType'"*) echo "ios-capability-config" ;;
    *"Did not find any Signing Certificates for given private key"*|*"already have a current Distribution certificate"*|*"pending certificate request"*) echo "ios-cert-key-mismatch" ;;
    *"public"*"opened"*|*"ios/App/App/public/index.html is missing"*|*"Capacitor sync did not create the required iOS files"*|*"No "*"Podfile"*" found"*) echo "ios-capacitor-project" ;;
    *"No matching profiles found"*|*"Provisioning profile"*|*"Code Signing Error"*|*"doesn't include signing certificate"*) echo "ios-code-signing" ;;
    *"Could not resolve package dependencies"*|*"Conflicting identity for app"*|*"package identity"*) echo "ios-spm" ;;
    *"Command PhaseScriptExecution failed"*) echo "xcode-run-script" ;;
    *"ld: error"*|*"Undefined symbols for architecture"*) echo "native-linker" ;;
    *"clang: error"*|*"fatal error:"*) echo "native-compile" ;;
    *"swift"*"error"*|*"swiftc: error"*) echo "swift-compile" ;;
    *"[!] "*) echo "cocoapods" ;;
    *"Execution failed for task"*|*"What went wrong:"*|*"Task :"*"FAILED"*|*"FAILURE: Build failed"*) echo "gradle-task" ;;
    *"BUILD FAILED"*|*"ARCHIVE FAILED"*) echo "native-build" ;;
    *"npm ERR!"*|*"ERR_"*) echo "npm-install" ;;
    *"Unauthorized"*|*"401"*|*"403"*) echo "api-auth" ;;
    *"Traceback"*|*"Exception in thread"*) echo "script-exception" ;;
    *) echo "uncategorized" ;;
  esac
}

BUILD_SUMMARY="$LOG_DIR/build-summary.txt"
{
  echo "Build Failure Triage Map"
  echo "Generated: $(date -u '+%Y-%m-%dT%H:%M:%SZ')"
  echo "Log dir:   $LOG_DIR"
  echo ""
  printf '%-40s  %-20s  %-10s  %s\n' "STEP (log file)" "CATEGORY" "LINE" "SNIPPET"
  printf '%-40s  %-20s  %-10s  %s\n' "----------------------------------------" "--------------------" "----------" "-------------------------------------"
  while IFS= read -r entry; do
    [[ "$entry" == -\ * ]] || continue
    name=$(printf '%s' "$entry" | sed -E 's/^- ([^ ]+\.log).*/\1/')
    base="${name%.log}"
    linetot=$(printf '%s' "$entry" | sed -E 's/.*\(line ([0-9]+\/[0-9]+)\).*/\1/')
    pat=$(sed -n '2p' "$OUT_DIR/${base}.snippet.txt" 2>/dev/null | sed 's/^# Matched pattern: *//')
    hit_line=$(grep -m1 -iE "$pat" "$LOG_DIR/$name" 2>/dev/null | head -1)
    cat=$(categorize "$hit_line")
    printf '%-40s  %-20s  %-10s  %s\n' \
      "${base:0:40}" "$cat" "$linetot" "errors/${base}.snippet.txt"
  done < "$SUMMARY"
  echo ""
  echo "Category legend:"
  echo "  ios-capability-config Apple capability enum/configuration rejected by App Store Connect"
  echo "  ios-cert-key-mismatch Distribution certificate does not match the imported private key"
  echo "  ios-capacitor-project  Missing ios/App/App/public or Podfile after Capacitor sync"
  echo "  ios-spm                Swift Package Manager dependency resolution / package identity collision"
  echo "  ios-code-signing  Provisioning profile / cert mismatch for com.doseroutine.app"
  echo "  xcode-run-script  A Build Phase run-script failed (often Capacitor embed frameworks)"
  echo "  native-linker     ld: undefined symbols — pod/framework missing or ABI mismatch"
  echo "  native-compile    clang fatal error — missing header or misconfigured pod"
  echo "  swift-compile     Swift source error — see file:line in snippet"
  echo "  cocoapods         Podfile / spec repo / lockfile drift"
  echo "  gradle-task       Gradle task failed — Kotlin/Java, SDK, or signing config"
  echo "  native-build      Generic BUILD/ARCHIVE FAILED — inspect snippet"
  echo "  npm-install       npm install or postinstall failed"
  echo "  api-auth          App Store Connect / Google Play auth (401/403)"
  echo "  script-exception  Shell/Python/Node script threw an uncaught exception"
  echo "  uncategorized     Pattern hit but not classified — read snippet manually"
  echo ""
  echo "Full snippets:  build-logs/errors/       Full logs: build-logs/"
} > "$BUILD_SUMMARY"

echo "extract-error-snippets: wrote triage map to $BUILD_SUMMARY"

exit 0

