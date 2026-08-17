#!/usr/bin/env python3
"""Ensure robots.txt references sitemap.xml and doesn't block any sitemap URL.

Fetches robots.txt and sitemap.xml from the live site (or uses local files
when --local is passed) and verifies:
  1. robots.txt contains a `Sitemap:` directive pointing at sitemap.xml
  2. No URL listed in sitemap.xml is disallowed for user-agent `*` or Googlebot
"""
from __future__ import annotations

import argparse
import re
import sys
import urllib.parse
import urllib.request
import urllib.robotparser
import xml.etree.ElementTree as ET
from pathlib import Path

DEFAULT_BASE = "https://doseroutine.com"
UAS = ["*", "Googlebot"]


def fetch(url: str) -> str:
    req = urllib.request.Request(url, headers={"User-Agent": "DoseRoutineCI/1.0"})
    with urllib.request.urlopen(req, timeout=30) as r:
        return r.read().decode("utf-8", errors="replace")


def load_sources(base: str, local: bool) -> tuple[str, str]:
    if local:
        robots = Path("public/robots.txt").read_text(encoding="utf-8")
        # Sitemap is a server route; use live host for URL list.
        sitemap = fetch(f"{base}/sitemap.xml")
    else:
        robots = fetch(f"{base}/robots.txt")
        sitemap = fetch(f"{base}/sitemap.xml")
    return robots, sitemap


def parse_urls(sitemap_xml: str) -> list[str]:
    ns = {"s": "http://www.sitemaps.org/schemas/sitemap/0.9"}
    root = ET.fromstring(sitemap_xml)
    return [el.text.strip() for el in root.findall(".//s:url/s:loc", ns) if el.text]


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--base", default=DEFAULT_BASE)
    ap.add_argument("--local", action="store_true",
                    help="Read robots.txt from public/ (sitemap still fetched from live).")
    args = ap.parse_args()

    robots_txt, sitemap_xml = load_sources(args.base, args.local)

    # 1) Sitemap directive present + points to sitemap.xml
    sitemap_lines = re.findall(r"(?im)^\s*Sitemap:\s*(\S+)\s*$", robots_txt)
    if not sitemap_lines:
        print("FAIL: robots.txt has no `Sitemap:` directive")
        return 1
    if not any(s.rstrip("/").endswith("/sitemap.xml") for s in sitemap_lines):
        print(f"FAIL: no `Sitemap:` directive points at sitemap.xml (found: {sitemap_lines})")
        return 1
    print(f"OK: robots.txt references sitemap: {sitemap_lines[0]}")

    # 2) No sitemap URL is disallowed
    urls = parse_urls(sitemap_xml)
    print(f"OK: sitemap parsed, {len(urls)} URLs")

    failures: list[tuple[str, str, str]] = []
    for ua in UAS:
        rp = urllib.robotparser.RobotFileParser()
        rp.parse(robots_txt.splitlines())
        for url in urls:
            path = urllib.parse.urlparse(url).path or "/"
            if not rp.can_fetch(ua, path):
                failures.append((ua, url, path))

    if failures:
        print(f"FAIL: {len(failures)} sitemap URL/UA combinations are blocked by robots.txt")
        for ua, url, path in failures[:20]:
            print(f"  [{ua}] {url}  (path={path})")
        if len(failures) > 20:
            print(f"  ... and {len(failures) - 20} more")
        return 1

    print(f"OK: all {len(urls)} sitemap URLs allowed for {UAS}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
