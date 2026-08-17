#!/usr/bin/env python3
"""Ensure every sitemap URL is reachable from the homepage within N clicks.

DoseRoutine renders navigation client-side, so we crawl with headless
Chromium (Playwright) rather than raw HTTP. BFS follows only same-origin
<a href> links present in the rendered DOM after network-idle.

Usage:
  python scripts/validate-sitemap-reachability.py [--base URL] [--max-depth N] [--concurrency N]

Playwright must be installed with Chromium available (already true in the
Lovable sandbox and set up by the CI workflow).
"""
from __future__ import annotations

import argparse
import asyncio
import os
import sys
import urllib.parse
import urllib.request
import xml.etree.ElementTree as ET

from playwright.async_api import async_playwright

DEFAULT_BASE = "https://doseroutine.com"
DEFAULT_MAX_DEPTH = 4
DEFAULT_CONCURRENCY = 6
NAV_TIMEOUT_MS = 20_000
ALLOWLIST_PATH = os.path.join(os.path.dirname(__file__), "sitemap-reachability-allowlist.txt")


def load_allowlist(base_origin: str) -> set[str]:
    if not os.path.exists(ALLOWLIST_PATH):
        return set()
    out: set[str] = set()
    with open(ALLOWLIST_PATH, encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if not line or line.startswith("#"):
                continue
            c = canon(line, base_origin)
            if c:
                out.add(c)
    return out


def fetch_text(url: str) -> str:
    req = urllib.request.Request(url, headers={"User-Agent": "DoseRoutineCI/1.0"})
    with urllib.request.urlopen(req, timeout=30) as r:
        return r.read().decode("utf-8", errors="replace")


def parse_sitemap(xml_text: str) -> list[str]:
    ns = {"s": "http://www.sitemaps.org/schemas/sitemap/0.9"}
    root = ET.fromstring(xml_text)
    return [el.text.strip() for el in root.findall(".//s:url/s:loc", ns) if el.text]


def canon(url: str, base_origin: str) -> str | None:
    if not url:
        return None
    url = url.strip()
    if url.startswith(("mailto:", "tel:", "javascript:", "#")):
        return None
    absu = urllib.parse.urljoin(base_origin + "/", url)
    p = urllib.parse.urlparse(absu)
    if f"{p.scheme}://{p.netloc}" != base_origin:
        return None
    path = p.path or "/"
    if len(path) > 1 and path.endswith("/"):
        path = path.rstrip("/")
    return f"{base_origin}{path}"


async def collect_links(context, url: str, base_origin: str) -> set[str]:
    page = await context.new_page()
    try:
        try:
            await page.goto(url, wait_until="networkidle", timeout=NAV_TIMEOUT_MS)
        except Exception:
            # Fall back to DOM ready; SPA may keep long-poll sockets open.
            try:
                await page.goto(url, wait_until="domcontentloaded", timeout=NAV_TIMEOUT_MS)
            except Exception as e:
                print(f"  WARN goto {url}: {e}")
                return set()
        try:
            hrefs = await page.eval_on_selector_all(
                "a[href]", "els => els.map(e => e.getAttribute('href'))"
            )
        except Exception:
            hrefs = []
        out: set[str] = set()
        for h in hrefs:
            c = canon(h, base_origin)
            if c:
                out.add(c)
        return out
    finally:
        await page.close()


async def crawl(base_origin: str, max_depth: int, concurrency: int) -> tuple[set[str], dict[str, int]]:
    seen: dict[str, int] = {}
    start = canon(base_origin + "/", base_origin) or base_origin
    seen[start] = 0
    frontier = [start]

    async with async_playwright() as pw:
        browser = await pw.chromium.launch(headless=True)
        context = await browser.new_context(
            viewport={"width": 1280, "height": 1800},
            user_agent="DoseRoutineCI-Reachability/1.0 (+Playwright)",
        )
        sem = asyncio.Semaphore(concurrency)

        async def visit(u: str) -> set[str]:
            async with sem:
                return await collect_links(context, u, base_origin)

        for depth in range(max_depth):
            if not frontier:
                break
            print(f"Depth {depth}: crawling {len(frontier)} pages")
            results = await asyncio.gather(*(visit(u) for u in frontier))
            nxt: list[str] = []
            for links in results:
                for link in links:
                    if link not in seen:
                        seen[link] = depth + 1
                        nxt.append(link)
            frontier = nxt

        await context.close()
        await browser.close()
    return set(seen.keys()), seen


async def main_async() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--base", default=DEFAULT_BASE)
    ap.add_argument("--max-depth", type=int, default=DEFAULT_MAX_DEPTH)
    ap.add_argument("--concurrency", type=int, default=DEFAULT_CONCURRENCY)
    args = ap.parse_args()

    base_origin = args.base.rstrip("/")
    print(f"Base: {base_origin}  max-depth: {args.max_depth}  concurrency: {args.concurrency}")

    sitemap_body = fetch_text(f"{base_origin}/sitemap.xml")
    targets = {canon(u, base_origin) for u in parse_sitemap(sitemap_body)}
    targets.discard(None)
    print(f"Sitemap URLs: {len(targets)}")

    allow = load_allowlist(base_origin)
    stale_allow = sorted(allow - targets)
    if stale_allow:
        print(f"FAIL: allowlist contains {len(stale_allow)} URLs not present in sitemap:")
        for u in stale_allow:
            print(f"  {u}")
        return 1

    reached, seen = await crawl(base_origin, args.max_depth, args.concurrency)
    hit = targets & reached
    missing_all = sorted(targets - reached)
    missing = [u for u in missing_all if u not in allow]
    allowed_missing = [u for u in missing_all if u in allow]
    print(f"Pages visited: {len(seen)}  Sitemap reached: {len(hit)}/{len(targets)}")

    if allowed_missing:
        print(f"WARN: {len(allowed_missing)} known-orphan URLs (allowlisted, please add internal links):")
        for u in allowed_missing:
            print(f"  {u}")

    # Reached allowlist entries → prompt cleanup.
    reachable_allow = sorted(allow & reached)
    if reachable_allow:
        print(f"NOTE: {len(reachable_allow)} allowlisted URLs are now reachable — remove from allowlist:")
        for u in reachable_allow:
            print(f"  {u}")

    if missing:
        print(f"FAIL: {len(missing)} sitemap URLs not reachable within {args.max_depth} clicks:")
        for u in missing[:50]:
            print(f"  {u}")
        if len(missing) > 50:
            print(f"  ... and {len(missing) - 50} more")
        return 1

    dist: dict[int, int] = {}
    for u in hit:
        d = seen[u]
        dist[d] = dist.get(d, 0) + 1
    print("Depth distribution:", ", ".join(f"d{d}={dist[d]}" for d in sorted(dist)))
    print(f"OK: {len(hit)}/{len(targets)} sitemap URLs reachable within {args.max_depth} clicks "
          f"({len(allowed_missing)} allowlisted)")
    return 0


def main() -> int:
    return asyncio.run(main_async())


if __name__ == "__main__":
    sys.exit(main())
