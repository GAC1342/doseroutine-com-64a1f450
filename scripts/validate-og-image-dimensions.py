#!/usr/bin/env python3
"""Regression test: every local `public/og/*` file referenced as og:image
by a sitemap page must be a valid, decodable image AND meet minimum
width/height requirements for social link previews.

Minimums enforced (Facebook/Open Graph recommended):
  - width  >= 1200 px
  - height >= 630  px

Remote og:image URLs (PubChem, CDN, etc.) are ignored — dimension checks
apply only to files that ship in this repo under public/og/.

Usage:
    python3 scripts/validate-og-image-dimensions.py http://localhost:8080 \
        [--report ci-reports/og-image-dimensions.json]

Writes a JSON report of every failure (missing file, unreadable image,
undersized) plus the sitemap pages referencing it, so CI can upload it
as an artifact for easy diagnosis.
"""
from __future__ import annotations

import json
import re
import sys
import urllib.parse
import urllib.request
import xml.etree.ElementTree as ET
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path

from PIL import Image

sys.path.insert(0, str(Path(__file__).parent))
from _sitemap_fetch import fetch_sitemap_bytes  # noqa: E402

UA = "DoseRoutine-OGImageDimCheck/1.0"
OG_DIR = Path(__file__).resolve().parent.parent / "public" / "og"
MIN_WIDTH = 1200
MIN_HEIGHT = 630
OG_RE = re.compile(
    r'<meta[^>]+property=["\']og:image["\'][^>]+content=["\']([^"\']+)["\']',
    re.IGNORECASE,
)


def collect_sitemap_urls(base: str) -> list[str]:
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
    parsed = urllib.parse.urlsplit(og_url)
    if parsed.netloc and parsed.netloc != base_host:
        return None
    path = parsed.path
    if not path.startswith("/og/"):
        return None
    return path


def check_image(fs_path: Path) -> dict:
    """Return {status, width?, height?, error?} for a candidate og file."""
    if not fs_path.is_file():
        return {"status": "missing"}
    try:
        with Image.open(fs_path) as img:
            img.verify()
        # verify() consumes the file; reopen to read size.
        with Image.open(fs_path) as img2:
            w, h = img2.size
    except Exception as exc:
        return {"status": "unreadable", "error": f"{type(exc).__name__}: {exc}"}
    if w < MIN_WIDTH or h < MIN_HEIGHT:
        return {"status": "undersized", "width": w, "height": h}
    return {"status": "ok", "width": w, "height": h}


def main() -> int:
    args = sys.argv[1:]
    report_path: Path | None = None
    if "--report" in args:
        i = args.index("--report")
        try:
            report_path = Path(args[i + 1])
        except IndexError:
            print(
                "usage: validate-og-image-dimensions.py <base-url> [--report path.json]",
                file=sys.stderr,
            )
            return 2
        del args[i : i + 2]
    if len(args) != 1:
        print(
            "usage: validate-og-image-dimensions.py <base-url> [--report path.json]",
            file=sys.stderr,
        )
        return 2
    base = args[0].rstrip("/")
    base_host = urllib.parse.urlsplit(base).netloc

    print(f"Crawling sitemap at {base}/sitemap.xml ...", flush=True)
    urls = collect_sitemap_urls(base)
    print(f"Found {len(urls)} sitemap URLs", flush=True)

    page_to_og: dict[str, str | None] = {}
    fetch_errors: list[tuple[str, str]] = []
    with ThreadPoolExecutor(max_workers=16) as pool:
        futures = {pool.submit(fetch_og_image, u): u for u in urls}
        for fut in as_completed(futures):
            u = futures[fut]
            try:
                page_to_og[u] = fut.result()
            except Exception as exc:
                fetch_errors.append((u, f"fetch failed: {exc}"))
                page_to_og[u] = None

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

    results: list[dict] = []
    failures: list[dict] = []
    for og_path, pages in sorted(local_refs.items()):
        rel = og_path.lstrip("/")
        fs_path = OG_DIR.parent / rel
        r = check_image(fs_path)
        entry = {
            "og_path": og_path,
            "expected_file": f"public{og_path}",
            "referenced_by_count": len(pages),
            "referenced_by": sorted(pages),
            **r,
        }
        results.append(entry)
        if r["status"] != "ok":
            failures.append(entry)

    print(
        f"Checked {len(local_refs)} unique local /og/* asset(s) referenced by "
        f"{sum(len(v) for v in local_refs.values())} sitemap page(s). "
        f"Minimum accepted dimensions: {MIN_WIDTH}x{MIN_HEIGHT}.",
        flush=True,
    )

    if fetch_errors:
        print(f"\n{len(fetch_errors)} page(s) could not be fetched:", file=sys.stderr)
        for u, msg in fetch_errors[:20]:
            print(f"  - {u}: {msg}", file=sys.stderr)

    if failures:
        print(f"\nFAIL: {len(failures)} local og:image asset(s) failed validation:", file=sys.stderr)
        for f in failures:
            if f["status"] == "missing":
                detail = "missing file"
            elif f["status"] == "unreadable":
                detail = f"unreadable image ({f.get('error')})"
            elif f["status"] == "undersized":
                detail = (
                    f"{f['width']}x{f['height']} < required {MIN_WIDTH}x{MIN_HEIGHT}"
                )
            else:
                detail = f["status"]
            print(f"\n  {f['expected_file']}: {detail}", file=sys.stderr)
            print(f"    referenced by {f['referenced_by_count']} page(s), e.g.:", file=sys.stderr)
            for p in f["referenced_by"][:5]:
                print(f"      - {p}", file=sys.stderr)

    if report_path is not None:
        report = {
            "base_url": base,
            "sitemap_url_count": len(urls),
            "min_width": MIN_WIDTH,
            "min_height": MIN_HEIGHT,
            "unique_local_og_assets": len(local_refs),
            "failure_count": len(failures),
            "fetch_error_count": len(fetch_errors),
            "results": results,
            "failures": failures,
            "fetch_errors": [{"url": u, "error": msg} for u, msg in fetch_errors],
        }
        report_path.parent.mkdir(parents=True, exist_ok=True)
        report_path.write_text(json.dumps(report, indent=2, sort_keys=True))
        print(f"\nWrote report to {report_path}", flush=True)

    if failures:
        return 1
    if fetch_errors:
        return 1

    print(
        f"OK: every local /og/* image is valid and >= {MIN_WIDTH}x{MIN_HEIGHT}."
    )
    return 0


if __name__ == "__main__":
    sys.exit(main())
