#!/usr/bin/env python3
"""
Validate robots.txt and sitemap.xml sanity against a running server.

Fails CI if:
  - robots.txt is missing, empty, or unreadable
  - robots.txt has a wildcard `Disallow: /` under `User-agent: *`
    (which would block the whole site from search)
  - robots.txt is missing a `Sitemap:` directive
  - the sitemap URL(s) in robots.txt don't return 200
  - sitemap.xml is missing, malformed, or has zero <loc> entries
  - any sitemap <loc> is not an https URL
  - any sitemap <loc> is disallowed by robots.txt for `User-agent: *`
    (a URL blocked from crawling shouldn't be advertised for indexing)

Usage: python3 scripts/validate-robots-sitemap.py [BASE_URL]
Default BASE_URL is http://localhost:8080.
"""
from __future__ import annotations

import re
import sys
import time
import urllib.error
import urllib.request

BASE = sys.argv[1].rstrip("/") if len(sys.argv) > 1 else "http://localhost:8080"


def fetch(path: str, timeout: float = 20.0) -> tuple[int, str]:
    req = urllib.request.Request(BASE + path, headers={"User-Agent": "ci-seo-validator"})
    with urllib.request.urlopen(req, timeout=timeout) as r:
        return r.status, r.read().decode("utf-8", "ignore")


def wait_for_server(max_seconds: int = 120) -> None:
    deadline = time.time() + max_seconds
    while time.time() < deadline:
        try:
            fetch("/", timeout=5)
            return
        except Exception:
            time.sleep(2)
    raise SystemExit(f"Server at {BASE} did not respond within {max_seconds}s")


def parse_robots(txt: str) -> tuple[list[str], list[str], list[str]]:
    """Return (star_disallows, star_allows, sitemap_urls)."""
    star_disallows: list[str] = []
    star_allows: list[str] = []
    sitemap_urls: list[str] = []
    current_agents: list[str] = []
    for raw in txt.splitlines():
        line = raw.split("#", 1)[0].strip()
        if not line:
            current_agents = []
            continue
        if ":" not in line:
            continue
        key, _, val = line.partition(":")
        key = key.strip().lower()
        val = val.strip()
        if key == "user-agent":
            current_agents.append(val)
        elif key == "sitemap":
            sitemap_urls.append(val)
        elif key == "disallow" and "*" in current_agents:
            star_disallows.append(val)
        elif key == "allow" and "*" in current_agents:
            star_allows.append(val)
    return star_disallows, star_allows, sitemap_urls


def robots_blocks_path(path: str, disallows: list[str], allows: list[str]) -> bool:
    """Simple longest-match precedence per Google's robots spec."""
    best = ("", None)  # (pattern, is_disallow)
    for d in disallows:
        if d and path.startswith(d) and len(d) > len(best[0]):
            best = (d, True)
    for a in allows:
        if a and path.startswith(a) and len(a) >= len(best[0]):
            best = (a, False)
    return best[1] is True


def main() -> int:
    print(f"Validating robots.txt + sitemap.xml against {BASE}")
    wait_for_server()

    issues: list[str] = []

    # robots.txt
    try:
        status, robots = fetch("/robots.txt")
    except Exception as e:
        print(f"FAIL: could not fetch /robots.txt ({e})")
        return 1
    if status != 200:
        issues.append(f"robots.txt HTTP {status}")
    if not robots.strip():
        issues.append("robots.txt empty")

    disallows, allows, sitemap_urls = parse_robots(robots)

    if "/" in disallows and "/" not in allows:
        issues.append("robots.txt has wildcard `Disallow: /` blocking the entire site")
    if not sitemap_urls:
        issues.append("robots.txt missing `Sitemap:` directive")

    # Every declared Sitemap: URL must be reachable.
    for url in sitemap_urls:
        m = re.match(r"^https?://[^/]+(/.*)$", url)
        path = m.group(1) if m else url
        try:
            s, _ = fetch(path)
            if s != 200:
                issues.append(f"sitemap URL {url} → HTTP {s}")
        except Exception as e:
            issues.append(f"sitemap URL {url} unreachable: {e}")

    # /sitemap.xml content
    try:
        status, xml = fetch("/sitemap.xml", timeout=30)
    except Exception as e:
        print(f"FAIL: could not fetch /sitemap.xml ({e})")
        return 1
    if status != 200:
        issues.append(f"/sitemap.xml HTTP {status}")

    locs = re.findall(r"<loc>([^<]+)</loc>", xml)
    if not locs:
        issues.append("/sitemap.xml has zero <loc> entries")

    for loc in locs:
        if not loc.startswith("https://"):
            issues.append(f"sitemap loc not https: {loc}")
            continue
        m = re.match(r"^https?://[^/]+(/.*)$", loc)
        path = m.group(1) if m else "/"
        if robots_blocks_path(path, disallows, allows):
            issues.append(f"sitemap advertises {path} but robots.txt disallows it")

    if issues:
        print(f"\n{len(issues)} issue(s):")
        for i in issues:
            print(f"  - {i}")
        return 1

    print(
        f"OK — robots.txt parses; {len(sitemap_urls)} sitemap directive(s); "
        f"{len(locs)} sitemap URLs, all https, none robots-blocked."
    )
    return 0


if __name__ == "__main__":
    sys.exit(main())
