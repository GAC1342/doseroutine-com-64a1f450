#!/usr/bin/env python3
"""
Assert every URL in sitemap.xml carries the canonical DoseRoutine
description suffix in both <meta name="description"> and
<meta property="og:description">.

The suffix source of truth lives in src/lib/seo-description.ts. This
script reads that file to avoid drift.

Usage: python3 scripts/validate-description-suffix.py [BASE_URL]
Default BASE_URL is http://localhost:8080.
Exit 0 if every URL passes; exit 1 (with a per-URL failure report)
otherwise.
"""

from __future__ import annotations

import concurrent.futures
import html as _html
import re
import sys
import urllib.error
import urllib.request
from pathlib import Path

DEFAULT_BASE = "http://localhost:8080"
TIMEOUT = 20
CONCURRENCY = 12
UA = "DoseRoutine-SEO-Suffix-Validator/1.0"

# Paths where enforcing the marketing suffix is contextually wrong
# (short internal utility pages, policy-only pages). Keep this list
# tight — every entry should be a conscious exemption.
EXEMPT_PATHS: set[str] = set()


def read_suffix() -> str:
    src = Path(__file__).resolve().parent.parent / "src" / "lib" / "seo-description.ts"
    text = src.read_text(encoding="utf-8")
    m = re.search(
        r'DOSEROUTINE_DESCRIPTION_SUFFIX\s*=\s*"([^"]+)"', text
    )
    if not m:
        raise SystemExit(
            f"could not parse DOSEROUTINE_DESCRIPTION_SUFFIX from {src}"
        )
    return m.group(1)


def fetch_sitemap(base_url: str) -> list[str]:
    url = base_url.rstrip("/") + "/sitemap.xml"
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    with urllib.request.urlopen(req, timeout=TIMEOUT) as res:
        xml = res.read().decode("utf-8", errors="replace")
    return re.findall(r"<loc>([^<]+)</loc>", xml)


def path_of(url: str, base_url: str) -> str:
    if url.startswith(base_url):
        rel = url[len(base_url):] or "/"
    else:
        m = re.match(r"^https?://[^/]+(/.*)$", url)
        rel = m.group(1) if m else url
    return rel


META_DESC_RE = re.compile(
    r'<meta\b[^>]*\bname=["\']description["\'][^>]*\bcontent=["\']([^"\']*)["\']',
    re.IGNORECASE,
)
META_DESC_RE_ALT = re.compile(
    r'<meta\b[^>]*\bcontent=["\']([^"\']*)["\'][^>]*\bname=["\']description["\']',
    re.IGNORECASE,
)
OG_DESC_RE = re.compile(
    r'<meta\b[^>]*\bproperty=["\']og:description["\'][^>]*\bcontent=["\']([^"\']*)["\']',
    re.IGNORECASE,
)
OG_DESC_RE_ALT = re.compile(
    r'<meta\b[^>]*\bcontent=["\']([^"\']*)["\'][^>]*\bproperty=["\']og:description["\']',
    re.IGNORECASE,
)
OG_TITLE_RE = re.compile(
    r'<meta\b[^>]*\bproperty=["\']og:title["\'][^>]*\bcontent=["\']([^"\']*)["\']',
    re.IGNORECASE,
)
OG_TITLE_RE_ALT = re.compile(
    r'<meta\b[^>]*\bcontent=["\']([^"\']*)["\'][^>]*\bproperty=["\']og:title["\']',
    re.IGNORECASE,
)
OG_IMAGE_RE = re.compile(
    r'<meta\b[^>]*\bproperty=["\']og:image["\'][^>]*\bcontent=["\']([^"\']*)["\']',
    re.IGNORECASE,
)
OG_IMAGE_RE_ALT = re.compile(
    r'<meta\b[^>]*\bcontent=["\']([^"\']*)["\'][^>]*\bproperty=["\']og:image["\']',
    re.IGNORECASE,
)
ROBOTS_META_RE = re.compile(
    r'<meta\b[^>]*\bname=["\']robots["\'][^>]*\bcontent=["\']([^"\']*)["\']',
    re.IGNORECASE,
)


def first_match(html: str, primary: re.Pattern, alt: re.Pattern) -> str | None:
    m = primary.search(html) or alt.search(html)
    return _html.unescape(m.group(1)).strip() if m else None


def check_url(url: str, base_url: str, suffix: str) -> dict:
    rel = path_of(url, base_url)
    result = {
        "url": url,
        "path": rel,
        "status": 0,
        "meta_ok": False,
        "og_ok": False,
        "og_title_ok": False,
        "og_image_ok": False,
        "meta_desc": None,
        "og_desc": None,
        "og_title": None,
        "og_image": None,
        "indexable": True,
        "error": None,
    }
    if rel in EXEMPT_PATHS:
        result.update({
            "status": 0, "meta_ok": True, "og_ok": True,
            "og_title_ok": True, "og_image_ok": True, "exempt": True,
        })
        return result

    fetch_url = base_url.rstrip("/") + rel
    x_robots = ""
    try:
        req = urllib.request.Request(fetch_url, headers={"User-Agent": UA})
        with urllib.request.urlopen(req, timeout=TIMEOUT) as res:
            result["status"] = res.status
            x_robots = res.headers.get("X-Robots-Tag", "") or ""
            html = res.read().decode("utf-8", errors="replace")
    except urllib.error.HTTPError as e:
        result["error"] = f"HTTP {e.code}"
        return result
    except Exception as e:  # noqa: BLE001
        result["error"] = str(e)
        return result

    robots_meta = ""
    rm = ROBOTS_META_RE.search(html)
    if rm:
        robots_meta = rm.group(1)
    indexable = "noindex" not in (robots_meta + " " + x_robots).lower()
    result["indexable"] = indexable
    if not indexable:
        # Non-indexable URLs shouldn't be in the sitemap; if they are,
        # OG requirements don't apply. Reported as a warning below.
        result.update({"meta_ok": True, "og_ok": True,
                       "og_title_ok": True, "og_image_ok": True})
        return result

    meta = first_match(html, META_DESC_RE, META_DESC_RE_ALT)
    og = first_match(html, OG_DESC_RE, OG_DESC_RE_ALT)
    og_title = first_match(html, OG_TITLE_RE, OG_TITLE_RE_ALT)
    og_image = first_match(html, OG_IMAGE_RE, OG_IMAGE_RE_ALT)
    result["meta_desc"] = meta
    result["og_desc"] = og
    result["og_title"] = og_title
    result["og_image"] = og_image
    result["meta_ok"] = bool(meta and suffix in meta)
    result["og_ok"] = bool(og and suffix in og)
    result["og_title_ok"] = bool(og_title)
    # og:image must be present, non-empty, and an absolute URL
    result["og_image_ok"] = bool(
        og_image and re.match(r"^https?://", og_image)
    )
    return result


def main() -> int:
    base = sys.argv[1] if len(sys.argv) > 1 else DEFAULT_BASE
    base = base.rstrip("/")
    suffix = read_suffix()
    print(f"Validating against {base}")
    print(f"Required suffix: {suffix!r}")

    urls = fetch_sitemap(base)
    print(f"Sitemap URLs: {len(urls)}")

    results: list[dict] = []
    with concurrent.futures.ThreadPoolExecutor(max_workers=CONCURRENCY) as pool:
        futures = [pool.submit(check_url, u, base, suffix) for u in urls]
        for i, f in enumerate(concurrent.futures.as_completed(futures), 1):
            results.append(f.result())
            if i % 50 == 0:
                print(f"  checked {i}/{len(urls)}")

    failures = [
        r for r in results
        if r.get("error")
        or not r["meta_ok"] or not r["og_ok"]
        or not r["og_title_ok"] or not r["og_image_ok"]
    ]
    noindex_in_sitemap = [r for r in results if not r.get("indexable", True)]
    print("")
    print(f"Passed: {len(results) - len(failures)} / {len(results)}")
    if noindex_in_sitemap:
        print(f"⚠️  {len(noindex_in_sitemap)} sitemap URL(s) return noindex "
              "and were skipped from OG assertions:")
        for r in noindex_in_sitemap[:20]:
            print(f"    - {r['url']}")
    if not failures:
        print("✅ Every indexed sitemap URL carries the required description "
              "suffix and non-empty og:title / og:image.")
        return 0

    print(f"❌ {len(failures)} URL(s) failed SEO regression checks:\n")
    for r in failures[:100]:
        why = []
        if r.get("error"):
            why.append(f"fetch error: {r['error']}")
        else:
            if not r["meta_ok"]:
                why.append(f"meta description missing suffix: {r['meta_desc']!r}")
            if not r["og_ok"]:
                why.append(f"og:description missing suffix: {r['og_desc']!r}")
            if not r["og_title_ok"]:
                why.append(f"og:title missing or empty: {r['og_title']!r}")
            if not r["og_image_ok"]:
                why.append(
                    f"og:image missing / empty / non-absolute: {r['og_image']!r}"
                )
        print(f"  {r['url']}")
        for line in why:
            print(f"    - {line}")
    if len(failures) > 100:
        print(f"  ... and {len(failures) - 100} more")
    return 1


if __name__ == "__main__":
    sys.exit(main())
