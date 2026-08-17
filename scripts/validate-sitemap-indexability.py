#!/usr/bin/env python3
"""Crawl sitemap.xml and assert robots headers + canonical tags are correct.

For every URL listed in the sitemap (sitemap = the set of pages we WANT
indexed) this script asserts:

  1. HTTP 200 (redirects are followed; the final URL is reported).
  2. `X-Robots-Tag` does NOT contain `noindex` / `none`.
  3. `<meta name="robots">` does NOT contain `noindex` / `none`.
  4. A single `<link rel="canonical">` exists, is absolute, same-origin,
     and points at the sitemap URL's path (query/trailing-slash tolerant).

It additionally spot-checks a set of private paths that must NEVER be
indexable (`/today`, `/auth`, `/admin`, ...) and fails if any of them is
missing a `noindex` robots header — catching the inverse regression where
the server's denylist gets widened by accident.

Usage:
  python scripts/validate-sitemap-indexability.py [--base URL]
                                                  [--only-library]
                                                  [--limit N]
                                                  [--concurrency N]

Exit code 0 = all good, 1 = at least one violation.
"""
from __future__ import annotations

import argparse
import concurrent.futures
import re
import sys
import urllib.error
import urllib.parse
import urllib.request
import xml.etree.ElementTree as ET

DEFAULT_BASE = "https://doseroutine.com"
DEFAULT_CONCURRENCY = 8
TIMEOUT = 30
UA = "DoseRoutineCI-Indexability/1.0"

# Paths that must always carry a noindex robots header. Keep in sync with
# NON_INDEXABLE_PATHS / NON_INDEXABLE_PREFIXES in src/server.ts.
PRIVATE_PATHS = [
    "/auth",
    "/onboarding",
    "/reset-password",
    "/today",
    "/stack",
    "/settings",
    "/labs",
    "/admin",
]

NOINDEX_RE = re.compile(r"\b(noindex|none)\b", re.I)
CANONICAL_RE = re.compile(
    r"""<link\b[^>]*\brel\s*=\s*["']?canonical["']?[^>]*>""", re.I
)
HREF_RE = re.compile(r"""\bhref\s*=\s*["']([^"']+)["']""", re.I)
META_ROBOTS_RE = re.compile(
    r"""<meta\b[^>]*\bname\s*=\s*["']?robots["']?[^>]*>""", re.I
)
CONTENT_RE = re.compile(r"""\bcontent\s*=\s*["']([^"']*)["']""", re.I)


def fetch(url: str):
    """Return (final_url, status, headers, body_text)."""
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    try:
        with urllib.request.urlopen(req, timeout=TIMEOUT) as r:
            body = r.read().decode("utf-8", errors="replace")
            return r.geturl(), r.status, r.headers, body
    except urllib.error.HTTPError as e:
        body = e.read().decode("utf-8", errors="replace") if e.fp else ""
        return url, e.code, e.headers, body


def parse_sitemap(base: str) -> list[str]:
    url = base.rstrip("/") + "/sitemap.xml"
    _, status, _, text = fetch(url)
    if status != 200:
        print(f"FATAL: {url} returned {status}", file=sys.stderr)
        sys.exit(1)
    ns = {"s": "http://www.sitemaps.org/schemas/sitemap/0.9"}
    root = ET.fromstring(text)
    return [el.text.strip() for el in root.findall(".//s:url/s:loc", ns) if el.text]


def norm_path(url: str) -> str:
    p = urllib.parse.urlsplit(url).path or "/"
    if len(p) > 1 and p.endswith("/"):
        p = p[:-1]
    return p


def check_indexable(url: str, base: str, canonical_origin: str | None = None,
                    skip_robots_header: bool = False) -> list[str]:
    """Return a list of violation strings for one sitemap URL."""
    errors: list[str] = []
    final_url, status, headers, body = fetch(url)

    if status != 200:
        return [f"{url} -> HTTP {status}"]

    xrt = ", ".join(headers.get_all("X-Robots-Tag") or [])
    if not skip_robots_header and xrt and NOINDEX_RE.search(xrt):
        errors.append(f"{url} -> X-Robots-Tag: {xrt!r} (must not be noindex)")

    for tag in [] if skip_robots_header else META_ROBOTS_RE.findall(body):
        content = CONTENT_RE.search(tag)
        if content and NOINDEX_RE.search(content.group(1)):
            errors.append(
                f"{url} -> <meta name=robots content={content.group(1)!r}> (must not be noindex)"
            )

    canon_tags = CANONICAL_RE.findall(body)
    if not canon_tags:
        errors.append(f"{url} -> missing <link rel=canonical>")
    elif len(canon_tags) > 1:
        errors.append(f"{url} -> {len(canon_tags)} canonical tags (expected exactly 1)")
    else:
        href_match = HREF_RE.search(canon_tags[0])
        href = href_match.group(1).strip() if href_match else ""
        if not href:
            errors.append(f"{url} -> canonical tag has no href")
        else:
            parsed = urllib.parse.urlsplit(href)
            if not parsed.scheme or not parsed.netloc:
                errors.append(f"{url} -> canonical {href!r} is not absolute")
            elif f"{parsed.scheme}://{parsed.netloc}" != (canonical_origin or base).rstrip("/"):
                errors.append(f"{url} -> canonical {href!r} points off-origin")
            elif norm_path(href) != norm_path(url):
                errors.append(
                    f"{url} -> canonical path {norm_path(href)!r} != sitemap path {norm_path(url)!r}"
                )

    if norm_path(final_url) != norm_path(url):
        print(f"  note: {url} redirected to {final_url}")

    return errors


def check_private(path: str, base: str) -> list[str]:
    url = base.rstrip("/") + path
    _, status, headers, body = fetch(url)
    if status >= 500:
        return [f"{url} -> HTTP {status}"]
    xrt = ", ".join(headers.get_all("X-Robots-Tag") or [])
    if NOINDEX_RE.search(xrt):
        return []
    for tag in META_ROBOTS_RE.findall(body):
        content = CONTENT_RE.search(tag)
        if content and NOINDEX_RE.search(content.group(1)):
            return []
    return [f"{url} -> private path is INDEXABLE (expected noindex)"]


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--base", default=DEFAULT_BASE)
    ap.add_argument("--only-library", action="store_true",
                    help="only check /library URLs from the sitemap")
    ap.add_argument("--limit", type=int, default=0,
                    help="cap the number of sitemap URLs checked (0 = all)")
    ap.add_argument("--concurrency", type=int, default=DEFAULT_CONCURRENCY)
    ap.add_argument("--skip-robots-header", action="store_true",
                    help="skip noindex assertions (dev/preview hosts are noindexed by design; "
                         "canonical-tag checks still run)")
    ap.add_argument("--rewrite-origin", action="store_true",
                    help="rewrite sitemap URLs onto --base (for local/preview runs); "
                         "canonical hosts are then compared against the sitemap origin")
    args = ap.parse_args()

    base = args.base.rstrip("/")
    urls = parse_sitemap(base)
    canonical_origin = base
    if urls and args.rewrite_origin:
        sm = urllib.parse.urlsplit(urls[0])
        canonical_origin = f"{sm.scheme}://{sm.netloc}"
        urls = [urllib.parse.urlunsplit(("", "", *urllib.parse.urlsplit(u)[2:])) and
                base + (urllib.parse.urlsplit(u).path or "/") for u in urls]
    if args.only_library:
        urls = [u for u in urls if norm_path(u).startswith("/library")]
    if args.limit:
        urls = urls[: args.limit]

    print(f"Checking {len(urls)} sitemap URLs against {base}")

    errors: list[str] = []
    with concurrent.futures.ThreadPoolExecutor(max_workers=args.concurrency) as pool:
        for result in pool.map(lambda u: check_indexable(u, base, canonical_origin, args.skip_robots_header), urls):
            errors.extend(result)

    if args.skip_robots_header:
        print("Skipping private-path noindex checks (--skip-robots-header)")
        PRIVATE = []
    else:
        PRIVATE = PRIVATE_PATHS
        print(f"Checking {len(PRIVATE)} private paths stay noindex")
    with concurrent.futures.ThreadPoolExecutor(max_workers=args.concurrency) as pool:
        for result in pool.map(lambda p: check_private(p, base), PRIVATE):
            errors.extend(result)

    if errors:
        print(f"\nFAIL: {len(errors)} violation(s)\n")
        for e in errors:
            print(f"  - {e}")
        return 1

    print(f"\nPASS: {len(urls)} sitemap URLs indexable with valid canonicals; "
          f"{len(PRIVATE)} private paths correctly noindexed")
    return 0


if __name__ == "__main__":
    sys.exit(main())
