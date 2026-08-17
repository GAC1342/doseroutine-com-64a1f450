#!/usr/bin/env python3
"""Regression test: every og:image URL referenced by the sitemap that
points at a local /og/* asset must have a matching file under public/og/.

Runs against a live server (dev or preview) that serves the sitemap and
per-route HTML with head tags rendered. Any og:image whose URL path
starts with /og/ but has no corresponding file on disk fails the build.

Remote og:image URLs (e.g. https://pubchem...) are ignored — this test is
strictly a filesystem-parity check for locally-hosted OG assets.

Usage:
    python3 scripts/validate-og-image-files.py http://localhost:8080 [--report path.json]

When --report is passed, always writes a JSON report describing every
missing local og:image file, its referencing sitemap pages, and any
page-fetch errors — so CI can upload it as an artifact for diagnosis.
"""
from __future__ import annotations

import json


import os
import re
import sys
import urllib.parse
import urllib.request
import xml.etree.ElementTree as ET
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from _sitemap_fetch import fetch_sitemap_bytes  # noqa: E402

UA = "DoseRoutine-OGImageFileCheck/1.0"
OG_DIR = Path(__file__).resolve().parent.parent / "public" / "og"
OG_RE = re.compile(
    r'<meta[^>]+property=["\']og:image["\'][^>]+content=["\']([^"\']+)["\']',
    re.IGNORECASE,
)


def collect_sitemap_urls(base: str) -> list[str]:
    """Walk sitemap.xml (and any nested sitemap indexes) → flat URL list."""
    to_visit = [f"{base.rstrip('/')}/sitemap.xml"]
    seen: set[str] = set()
    urls: set[str] = set()
    while to_visit:
        sm = to_visit.pop()
        if sm in seen:
            continue
        seen.add(sm)
        body = fetch_sitemap_bytes(sm, user_agent=UA)
        root = ET.fromstring(body)
        tag = root.tag.split("}", 1)[-1]
        if tag == "sitemapindex":
            for loc in root.iter("{http://www.sitemaps.org/schemas/sitemap/0.9}loc"):
                if loc.text:
                    to_visit.append(loc.text.strip())
        else:
            for loc in root.iter("{http://www.sitemaps.org/schemas/sitemap/0.9}loc"):
                if loc.text:
                    urls.add(loc.text.strip())
    return sorted(urls)


def fetch_og_image(url: str) -> str | None:
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    with urllib.request.urlopen(req, timeout=30) as resp:
        html = resp.read().decode("utf-8", errors="replace")
    m = OG_RE.search(html)
    return m.group(1).strip() if m else None


def local_og_path(og_url: str, base_host: str) -> str | None:
    """Return the /og/* path component if og_url is a local OG asset."""
    parsed = urllib.parse.urlsplit(og_url)
    # Same-origin absolute URL, or scheme-relative, or root-relative.
    if parsed.netloc and parsed.netloc != base_host:
        return None
    path = parsed.path
    if not path.startswith("/og/"):
        return None
    return path


def main() -> int:
    args = sys.argv[1:]
    report_path: Path | None = None
    if "--report" in args:
        i = args.index("--report")
        try:
            report_path = Path(args[i + 1])
        except IndexError:
            print("usage: validate-og-image-files.py <base-url> [--report path.json]", file=sys.stderr)
            return 2
        del args[i : i + 2]
    if len(args) != 1:
        print("usage: validate-og-image-files.py <base-url> [--report path.json]", file=sys.stderr)
        return 2
    base = args[0].rstrip("/")
    base_host = urllib.parse.urlsplit(base).netloc

    print(f"Crawling sitemap at {base}/sitemap.xml ...", flush=True)
    urls = collect_sitemap_urls(base)
    print(f"Found {len(urls)} sitemap URLs", flush=True)

    # page URL -> og:image URL (or None if page had none)
    page_to_og: dict[str, str | None] = {}
    errors: list[tuple[str, str]] = []

    with ThreadPoolExecutor(max_workers=16) as pool:
        futures = {pool.submit(fetch_og_image, u): u for u in urls}
        for fut in as_completed(futures):
            u = futures[fut]
            try:
                page_to_og[u] = fut.result()
            except Exception as exc:
                errors.append((u, f"fetch failed: {exc}"))
                page_to_og[u] = None

    # Bucket local og:image path -> pages referencing it
    local_refs: dict[str, list[str]] = {}
    for page, og in page_to_og.items():
        if not og:
            continue
        p = local_og_path(og, base_host)
        if p is not None:
            local_refs.setdefault(p, []).append(page)

    if not OG_DIR.is_dir():
        print(f"FAIL: public/og/ directory not found at {OG_DIR}", file=sys.stderr)
        return 1

    missing: list[tuple[str, list[str]]] = []
    for og_path, pages in sorted(local_refs.items()):
        # og_path is like "/og/foo.jpg" — resolve under public/
        rel = og_path.lstrip("/")  # "og/foo.jpg"
        fs_path = OG_DIR.parent / rel
        if not fs_path.is_file():
            missing.append((og_path, sorted(pages)))

    print(
        f"Checked {len(local_refs)} unique local /og/* asset(s) referenced by "
        f"{sum(len(v) for v in local_refs.values())} sitemap page(s).",
        flush=True,
    )

    if errors:
        print(f"\n{len(errors)} page(s) could not be fetched:", file=sys.stderr)
        for u, msg in errors[:20]:
            print(f"  - {u}: {msg}", file=sys.stderr)

    if missing:
        print(
            f"\nFAIL: {len(missing)} og:image URL(s) reference /og/* files "
            f"that do not exist under public/og/:",
            file=sys.stderr,
        )
        for og_path, pages in missing:
            print(f"\n  MISSING: public{og_path}", file=sys.stderr)
            print(f"    referenced by {len(pages)} page(s), e.g.:", file=sys.stderr)
            for p in pages[:5]:
                print(f"      - {p}", file=sys.stderr)

    if report_path is not None:
        report = {
            "base_url": base,
            "sitemap_url_count": len(urls),
            "unique_local_og_assets": len(local_refs),
            "missing_count": len(missing),
            "fetch_error_count": len(errors),
            "missing": [
                {
                    "og_path": og_path,
                    "expected_file": f"public{og_path}",
                    "referenced_by_count": len(pages),
                    "referenced_by": pages,
                }
                for og_path, pages in missing
            ],
            "fetch_errors": [{"url": u, "error": msg} for u, msg in errors],
        }
        report_path.parent.mkdir(parents=True, exist_ok=True)
        report_path.write_text(json.dumps(report, indent=2, sort_keys=True))
        print(f"\nWrote report to {report_path}", flush=True)

    if missing:
        return 1
    if errors:
        # Fetch errors are not the thing this test asserts, but do not let
        # them silently mask missing-file bugs — exit non-zero.
        return 1

    print("OK: every local /og/* og:image has a matching file under public/og/.")
    return 0



if __name__ == "__main__":
    sys.exit(main())
