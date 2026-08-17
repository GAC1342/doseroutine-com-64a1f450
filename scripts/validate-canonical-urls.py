#!/usr/bin/env python3
"""Ensure every sitemap URL is either:

  a) HTTP 200 with `<link rel="canonical">` that points to itself, OR
  b) HTTP 301/302/307/308 redirecting to a URL that IS present in sitemap.xml
     and whose final page is 200 with a self-canonical.

Rationale: Google treats sitemap URLs as canonical candidates. If a
sitemap URL returns 200 with a canonical pointing somewhere else, Google
drops the sitemap URL and indexes the canonical target instead — often
causing the "Alternate page with proper canonical tag" exclusion.

Usage:
  python scripts/validate-canonical-urls.py [--base URL] [--concurrency N] [--sample N]

CI runs the full 523-URL crawl weekly + on relevant pushes. Local runs
can pass --sample to spot-check quickly.
"""
from __future__ import annotations

import argparse
import concurrent.futures
import random
import re
import sys
import urllib.parse
import urllib.request
import xml.etree.ElementTree as ET

DEFAULT_BASE = "https://doseroutine.com"
DEFAULT_CONCURRENCY = 8
TIMEOUT = 30
UA = "DoseRoutineCI-CanonicalCheck/1.0"

CANONICAL_RE = re.compile(
    r"""<link[^>]+rel\s*=\s*["']canonical["'][^>]*href\s*=\s*["']([^"']+)["']""",
    re.IGNORECASE,
)
CANONICAL_RE_ALT = re.compile(
    r"""<link[^>]+href\s*=\s*["']([^"']+)["'][^>]*rel\s*=\s*["']canonical["']""",
    re.IGNORECASE,
)


def fetch_sitemap(base: str) -> list[str]:
    url = f"{base}/sitemap.xml"
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    with urllib.request.urlopen(req, timeout=TIMEOUT) as r:
        xml = r.read().decode("utf-8", errors="replace")
    ns = {"s": "http://www.sitemaps.org/schemas/sitemap/0.9"}
    root = ET.fromstring(xml)
    return [el.text.strip() for el in root.findall(".//s:url/s:loc", ns) if el.text]


def normalize(u: str) -> str:
    """Normalize for comparison: strip fragment, drop trailing slash on
    non-root paths, lowercase host."""
    p = urllib.parse.urlsplit(u)
    path = p.path or "/"
    if len(path) > 1 and path.endswith("/"):
        path = path.rstrip("/")
    return urllib.parse.urlunsplit(
        (p.scheme.lower(), p.netloc.lower(), path, p.query, "")
    )


class NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        return None  # disable auto-follow so we can inspect 3xx


NO_REDIRECT_OPENER = urllib.request.build_opener(NoRedirect)


def head_or_get(url: str) -> tuple[int, str | None, str | None]:
    """Return (status, location_header, body_or_None). We do a single GET
    so we can read canonical from the body on 200 without a second call."""
    req = urllib.request.Request(url, headers={"User-Agent": UA, "Accept": "text/html,*/*"})
    try:
        resp = NO_REDIRECT_OPENER.open(req, timeout=TIMEOUT)
        status = resp.getcode()
        body = resp.read(200_000).decode("utf-8", errors="replace")
        return status, resp.headers.get("Location"), body
    except urllib.error.HTTPError as e:
        return e.code, e.headers.get("Location") if e.headers else None, None
    except Exception as e:
        return 0, None, f"__ERR__:{e}"


def extract_canonical(html: str) -> str | None:
    m = CANONICAL_RE.search(html) or CANONICAL_RE_ALT.search(html)
    return m.group(1).strip() if m else None


def check_url(url: str, sitemap_norm: set[str]) -> tuple[str, str] | None:
    """Return (url, error) on failure, None on pass."""
    status, location, body = head_or_get(url)

    if status in (301, 302, 307, 308):
        if not location:
            return (url, f"{status} redirect with no Location header")
        target = urllib.parse.urljoin(url, location)
        if normalize(target) not in sitemap_norm:
            return (url, f"{status} → {target} (target NOT in sitemap)")
        # Follow one hop and verify the target self-canonicalizes.
        t_status, _, t_body = head_or_get(target)
        if t_status != 200:
            return (url, f"redirect target {target} returned {t_status}")
        canon = extract_canonical(t_body or "")
        if canon and normalize(urllib.parse.urljoin(target, canon)) != normalize(target):
            return (url, f"redirect target {target} canonical points to {canon}")
        return None

    if status != 200:
        if body and body.startswith("__ERR__:"):
            return (url, f"fetch error: {body[len('__ERR__:'):]}")
        return (url, f"unexpected status {status}")

    canon = extract_canonical(body or "")
    if not canon:
        return (url, "200 OK but no <link rel=canonical> found")
    canon_abs = urllib.parse.urljoin(url, canon)
    if normalize(canon_abs) != normalize(url):
        return (url, f"canonical mismatch: page canonical={canon_abs}")
    return None


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--base", default=DEFAULT_BASE)
    ap.add_argument("--concurrency", type=int, default=DEFAULT_CONCURRENCY)
    ap.add_argument("--sample", type=int, default=0,
                    help="If >0, check a random N-URL sample instead of all.")
    args = ap.parse_args()

    print(f"Fetching sitemap from {args.base}/sitemap.xml ...")
    urls = fetch_sitemap(args.base)
    print(f"Sitemap URLs: {len(urls)}")
    sitemap_norm = {normalize(u) for u in urls}

    if args.sample and args.sample < len(urls):
        random.seed(0)
        urls = random.sample(urls, args.sample)
        print(f"Sampling {len(urls)} URLs")

    failures: list[tuple[str, str]] = []
    with concurrent.futures.ThreadPoolExecutor(max_workers=args.concurrency) as ex:
        for result in ex.map(lambda u: check_url(u, sitemap_norm), urls):
            if result:
                failures.append(result)

    print(f"Checked: {len(urls)}  Failed: {len(failures)}")
    if failures:
        print("\nFAILURES:")
        for u, err in sorted(failures):
            print(f"  {u}\n    {err}")
        return 1
    print("All sitemap URLs are canonical-valid.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
