#!/usr/bin/env python3
"""
Validate SEO metadata on every public route.

Fetches sitemap.xml from a running server, extracts every <loc>, then
GETs each route and asserts:

  - a non-empty <title> under 65 chars that doesn't contain "Lovable"
  - <meta name="description">
  - <meta property="og:title">
  - <meta property="og:description">
  - <meta property="og:type">
  - <meta property="og:url"> — absolute https URL
  - <meta name="twitter:card">
  - <meta name="twitter:title">
  - <meta name="twitter:description">
  - <link rel="canonical"> — absolute https URL
  - canonical URL matches og:url
  - the page is NOT noindex (sitemap-listed pages must be indexable)
  - at least one <script type="application/ld+json"> with valid JSON

Extra routes not always listed in the sitemap (/compare, /auth, etc.) are
appended so they're always covered. Noindex is only enforced for
sitemap-derived paths — /auth, /onboarding, /reset-password remain free
to declare noindex.

Exit code is 0 when every route passes, 1 when any route has issues.
Usage: python3 scripts/validate-seo-routes.py [BASE_URL]
Default BASE_URL is http://localhost:8080.
"""

from __future__ import annotations

import concurrent.futures
import html as _html
import json
import re
import sys
import time
import urllib.error
import urllib.request

BASE = sys.argv[1].rstrip("/") if len(sys.argv) > 1 else "http://localhost:8080"

# Routes that MUST be validated even if the sitemap forgets them.
REQUIRED_EXTRAS = [
    "/",
    "/compare",
    "/help",
    "/ai-policy",
    "/legal",
    "/cookies",
    "/auth",
    "/library",
]

# These are signed-in account screens, not public search pages. Keeping this
# list aligned with robots.txt prevents the exact regression where a generic
# route scanner recommends adding private URLs to sitemap.xml.
PRIVATE_ROUTES = {
    "/chat",
    "/checkins",
    "/costs",
    "/export",
    "/injection-sites",
}


def fetch(path: str, timeout: float = 20.0) -> str:
    with urllib.request.urlopen(BASE + path, timeout=timeout) as r:
        return r.read().decode("utf-8", "ignore")


def wait_for_server(max_seconds: int = 120) -> None:
    deadline = time.time() + max_seconds
    while time.time() < deadline:
        try:
            urllib.request.urlopen(BASE + "/", timeout=5).read()
            return
        except Exception:
            time.sleep(2)
    raise SystemExit(f"Server at {BASE} did not respond within {max_seconds}s")


def load_paths() -> tuple[list[str], set[str]]:
    """Return (all paths to check, set of sitemap-derived paths)."""
    try:
        xml = fetch("/sitemap.xml", timeout=30)
    except Exception as e:
        print(f"warn: could not read sitemap.xml ({e}); using extras only")
        xml = ""
    urls = re.findall(r"<loc>([^<]+)</loc>", xml)
    sitemap_paths: list[str] = []
    for u in urls:
        # Strip origin, keep path.
        m = re.match(r"^https?://[^/]+(/.*)$", u)
        sitemap_paths.append(m.group(1) if m else u)
    paths: list[str] = list(sitemap_paths)
    for extra in REQUIRED_EXTRAS:
        if extra not in paths:
            paths.append(extra)
    # Preserve order, dedupe.
    seen: set[str] = set()
    out: list[str] = []
    for p in paths:
        if p in seen:
            continue
        seen.add(p)
        out.append(p)
    return out, set(sitemap_paths)


# Words a complete sentence never ends on. A trailing conjunction or
# preposition is the fingerprint of copy that was truncated mid-sentence.
DANGLING_TAIL = re.compile(
    r"\b(and|or|but|with|for|from|the|a|an|to|of|in|on|at|by|vs|plus|including"
    r"|such|like|than|that|which|when|while|your|our|it|is|are)$",
    re.I,
)
DESCRIPTION_MIN = 50
DESCRIPTION_MAX = 160


def description_issues(text: str, is_noindex: bool = False) -> list[str]:
    """Flag broken meta descriptions: fragments, splices, wrong length."""
    issues: list[str] = []
    value = text.strip()
    if not is_noindex and len(value) < DESCRIPTION_MIN:
        issues.append(f"description {len(value)} chars (min {DESCRIPTION_MIN})")
    if len(value) > DESCRIPTION_MAX:
        issues.append(f"description {len(value)} chars (max {DESCRIPTION_MAX})")
    if re.search(r"\s{2,}", value):
        issues.append("description has collapsed whitespace")
    if value and not re.search(r"[.!?\u2026]$", value):
        issues.append("description does not end in sentence punctuation")
    if re.search(r"[a-z]{2,} [A-Z][a-z]+ (it|this|them|these|your|our)\b", value):
        issues.append("description looks like two sentences spliced together")
    words = re.sub(r"[.!?\u2026]+$", "", value).split()
    if words and DANGLING_TAIL.search(words[-1]):
        issues.append(f'description ends on dangling word "{words[-1]}"')
    return issues


def check(path: str, sitemap_paths: set[str]) -> tuple[str, bool, list[str]]:
    try:
        html = fetch(path)
    except urllib.error.HTTPError as e:
        return (path, False, [f"fetch: HTTP {e.code}"])
    except Exception as e:
        return (path, False, [f"fetch: {e}"])

    issues: list[str] = []

    if not re.search(r'<html[^>]+lang=["\'][^"\']+["\']', html, re.I):
        issues.append("html has no lang attribute")
    if not re.search(
        r'<meta[^>]+name=["\']viewport["\'][^>]+content=["\'][^"\']*width=device-width',
        html,
        re.I,
    ):
        issues.append("missing responsive viewport metadata")

    def has(pat: str) -> bool:
        return re.search(pat, html, re.I | re.S) is not None

    def attr(pat: str) -> str | None:
        m = re.search(pat, html, re.I | re.S)
        return _html.unescape(m.group(1).strip()) if m else None

    is_noindex = bool(
        re.search(
            r'<meta[^>]+name=["\']robots["\'][^>]+content=["\'][^"\']*noindex',
            html, re.I,
        )
    )

    m = re.search(r"<title[^>]*>([^<]*)</title>", html, re.I)
    title = _html.unescape(m.group(1).strip()) if m else ""
    if not title:
        issues.append("no <title>")
    elif len(title) > 65:
        issues.append(f"title {len(title)} chars (max 65)")
    elif "Lovable" in title:
        issues.append("title contains 'Lovable'")

    descriptions = re.findall(
        r'<meta[^>]+name=["\']description["\'][^>]+content=["\']([^"\']*)',
        html, re.I,
    )
    if not descriptions or not descriptions[0].strip():
        issues.append("no meta description")
    else:
        if len(descriptions) > 1:
            issues.append(f"duplicate meta description tags ({len(descriptions)})")
        issues.extend(description_issues(_html.unescape(descriptions[0]), is_noindex))
    if not has(r'<meta[^>]+property=["\']og:title["\']'):
        issues.append("no og:title")
    if not has(r'<meta[^>]+property=["\']og:description["\']'):
        issues.append("no og:description")
    if not has(r'<meta[^>]+property=["\']og:type["\']'):
        issues.append("no og:type")
    if not has(r'<meta[^>]+name=["\']twitter:card["\']'):
        issues.append("no twitter:card")
    # twitter title/description only required on indexable pages
    if not is_noindex:
        if not has(r'<meta[^>]+name=["\']twitter:title["\']'):
            issues.append("no twitter:title")
        if not has(r'<meta[^>]+name=["\']twitter:description["\']'):
            issues.append("no twitter:description")


    og_urls = re.findall(
        r'<meta[^>]+property=["\']og:url["\'][^>]+content=["\']([^"\']+)',
        html, re.I,
    )
    if len(og_urls) > 1:
        issues.append(f"duplicate og:url tags ({len(og_urls)})")
    og_url = attr(r'<meta[^>]+property=["\']og:url["\'][^>]+content=["\']([^"\']+)')
    if not og_url:
        issues.append("no og:url")
    elif not og_url.startswith("https://"):
        issues.append(f"og:url not absolute https ({og_url})")

    canonical = attr(r'<link[^>]+rel=["\']canonical["\'][^>]+href=["\']([^"\']+)')
    # noindex pages don't need canonical (they aren't indexed)
    if not canonical and not is_noindex:
        issues.append("no canonical link")
    elif canonical and not canonical.startswith("https://"):
        issues.append(f"canonical not absolute https ({canonical})")
    elif canonical and og_url and canonical != og_url:
        issues.append(f"canonical != og:url ({canonical} vs {og_url})")

    # Multiple canonicals are an SEO error even if the first one is right.
    canonicals = re.findall(
        r'<link[^>]+rel=["\']canonical["\'][^>]+href=["\']([^"\']+)',
        html, re.I,
    )
    if len(canonicals) > 1:
        issues.append(f"multiple canonical links ({len(canonicals)})")


    # Sitemap-listed pages must be indexable. This is the exact regression
    # that hit /onboarding, /auth, /reset-password before.
    if path in sitemap_paths:
        if has(r'<meta[^>]+name=["\']robots["\'][^>]+content=["\'][^"\']*noindex'):
            issues.append("sitemap-listed page has noindex")

    lds = re.findall(
        r'<script[^>]+type=["\']application/ld\+json["\'][^>]*>(.*?)</script>',
        html,
        re.S,
    )
    if not lds:
        issues.append("no JSON-LD")
    for i, body in enumerate(lds):
        try:
            json.loads(body.strip())
        except Exception as e:
            issues.append(f"JSON-LD[{i}] invalid: {e}")

    # /compare and library detail pages MUST carry og:image + twitter:image.
    if path == "/compare" or path.startswith("/library/"):
        if not has(r'<meta[^>]+property=["\']og:image["\']'):
            issues.append("no og:image (required for this route)")
        if not has(r'<meta[^>]+name=["\']twitter:image["\']'):
            issues.append("no twitter:image (required for this route)")

    return (path, len(issues) == 0, issues)



def main() -> int:
    print(f"Validating SEO metadata against {BASE}")
    wait_for_server()
    paths, sitemap_paths = load_paths()
    exposed_private_routes = sorted(PRIVATE_ROUTES & sitemap_paths)
    if exposed_private_routes:
        print("Private routes must not appear in sitemap.xml: " + ", ".join(exposed_private_routes))
        return 1
    print(f"Checking {len(paths)} routes ({len(sitemap_paths)} from sitemap)…")

    results: list[tuple[str, bool, list[str]]] = []
    with concurrent.futures.ThreadPoolExecutor(max_workers=16) as ex:
        for r in ex.map(lambda p: check(p, sitemap_paths), paths):
            results.append(r)


    fails = [r for r in results if not r[1]]
    print(f"Checked {len(results)} routes; {len(fails)} with issues")

    if fails:
        by_issue: dict[str, list[str]] = {}
        for p, _, iss in fails:
            for i in iss:
                by_issue.setdefault(i, []).append(p)
        print("\nIssue summary:")
        for k, v in sorted(by_issue.items(), key=lambda x: -len(x[1])):
            example = ", ".join(v[:5])
            print(f"  [{len(v)}] {k}  e.g. {example}")
        print("\nFailing routes (first 30):")
        for p, _, iss in fails[:30]:
            print(f"  {p}")
            for i in iss:
                print(f"      - {i}")
        return 1

    print("All routes pass SEO validation.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
