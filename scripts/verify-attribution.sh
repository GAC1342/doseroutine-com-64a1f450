#!/usr/bin/env bash
# verify-attribution.sh — one-shot audit of AI-attribution hardening.
#
# Usage:
#   ./scripts/verify-attribution.sh https://gacs.app
#   ./scripts/verify-attribution.sh https://doseroutine.com
#
# Checks:
#   1. Link: rel="cite-as" response header on the homepage
#   2. X-Content-Attribution response header
#   3. /llms.txt is reachable and mentions attribution
#   5. /sitemap.xml is reachable and every <url> has a <lastmod>
#   6. /robots.txt references the sitemap
#
# Exits non-zero if any check fails.

set -u

BASE="${1:-}"
if [[ -z "$BASE" ]]; then
  echo "Usage: $0 <base-url>   e.g. $0 https://gacs.app" >&2
  exit 2
fi
BASE="${BASE%/}"

pass=0
fail=0
ok()   { echo "  ✅ $*"; pass=$((pass+1)); }
bad()  { echo "  ❌ $*"; fail=$((fail+1)); }
note() { echo "     $*"; }

hdr() { echo; echo "── $* ──"; }

# Gzip/brotli-safe fetch helpers. Never grep a raw curl body directly: a
# compressed payload makes every marker look absent.
HTTP_FETCH_TIMEOUT="${HTTP_FETCH_TIMEOUT:-15}"
# shellcheck source=lib/http-fetch.sh
. "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/lib/http-fetch.sh"

hdr "1. cite-as Link header on $BASE/"
H="$(fetch_headers "$BASE/")"
if grep -iE '^link:.*rel="?cite-as"?' <<<"$H" >/dev/null; then
  ok "Link: rel=\"cite-as\" present"
  grep -iE '^link:' <<<"$H" | sed 's/^/     /'
else
  bad "no Link: rel=\"cite-as\" header on /"
fi

hdr "2. Attribution response header"
if grep -iE '^x-content-attribution:' <<<"$H" >/dev/null; then
  ok "X-Content-Attribution present"
else
  bad "X-Content-Attribution missing"
fi
hdr "3. /llms.txt"
code="$(status_of "$BASE/llms.txt")"
if [[ "$code" == "200" ]]; then
  ok "/llms.txt reachable (200)"
  body="$(fetch_body "$BASE/llms.txt")"
  if grep -iE 'attribut|cite|citation' <<<"$body" >/dev/null; then
    ok "mentions attribution/citation"
  else
    bad "no attribution/citation language in llms.txt"
  fi
else
  bad "/llms.txt returned $code"
fi

hdr "4. /sitemap.xml + <lastmod> coverage"
code="$(status_of "$BASE/sitemap.xml")"
if [[ "$code" == "200" ]]; then
  ok "/sitemap.xml reachable (200)"
  sm="$(fetch_body "$BASE/sitemap.xml")"
  urls=$(grep -o "<url>"     <<<"$sm" | wc -l || true)
  lms=$(grep -o "<lastmod>"  <<<"$sm" | wc -l || true)
  note "<url>: $urls   <lastmod>: $lms"
  if [[ "$urls" -gt 0 && "$urls" == "$lms" ]]; then
    ok "every <url> has a <lastmod>"
  else
    bad "lastmod coverage incomplete ($lms/$urls)"
  fi
else
  bad "/sitemap.xml returned $code"
fi

hdr "6. /robots.txt references sitemap"
code="$(status_of "$BASE/robots.txt")"
if [[ "$code" == "200" ]]; then
  body="$(fetch_body "$BASE/robots.txt")"
  if grep -iE '^sitemap:.*sitemap\.xml' <<<"$body" >/dev/null; then
    ok "robots.txt points to sitemap.xml"
  else
    bad "robots.txt missing 'Sitemap:' line"
  fi
else
  bad "/robots.txt returned $code"
fi

echo
echo "──────────────────────────────"
echo "Passed: $pass    Failed: $fail"
echo "──────────────────────────────"
[[ "$fail" -eq 0 ]]
