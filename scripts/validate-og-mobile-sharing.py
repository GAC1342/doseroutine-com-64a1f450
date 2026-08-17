#!/usr/bin/env python3
"""Mobile sharing compatibility test for og:image assets.

Android / iOS apps (iMessage, WhatsApp, Telegram, Signal, Facebook, X/Twitter,
LinkedIn, Slack) all read Open Graph tags. This script crawls the sitemap and
verifies every og:image / twitter:image meets the practical constraints that
make mobile link previews render reliably:

  - absolute https:// URL
  - HTTP 200 and image/* content-type
  - format is JPEG, PNG, or WebP (AVIF / GIF / SVG often fail in native apps)
  - file size <= 5 MB (iMessage / WhatsApp hard ceiling; warn if > 2.5 MB)
  - declared width/height present and >= 1200x630 recommended
  - aspect ratio close to 1.91:1 so previews don't get awkwardly cropped

Usage:
    python3 scripts/validate-og-mobile-sharing.py http://localhost:8080 \
        [--report ci-reports/og-mobile-sharing.json]

Exits non-zero when any sitemap-listed page ships an image that will break or
look bad when shared from a phone.
"""
from __future__ import annotations

import argparse
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

UA = "DoseRoutine-OGMobileCheck/1.0"
OG_DIR = Path(__file__).resolve().parent.parent / "public" / "og"

# Mobile platform practical limits
MAX_SIZE_BYTES = 5 * 1024 * 1024  # iMessage/WhatsApp ceiling
WARN_SIZE_BYTES = 2.5 * 1024 * 1024  # conservative warning
MIN_WIDTH = 1200
MIN_HEIGHT = 630
TARGET_ASPECT = 1200 / 630  # ~1.905
MIN_ASPECT = 1.5
MAX_ASPECT = 2.1

# Formats that reliably render in iMessage, WhatsApp, Telegram, Signal, FB, X.
SAFE_IMAGE_TYPES = {"image/jpeg", "image/png", "image/webp"}

OG_IMAGE_RE = re.compile(
    r'<meta[^>]+property=["\']og:image["\'][^>]+content=["\']([^"\']+)["\']',
    re.IGNORECASE,
)
OG_WIDTH_RE = re.compile(
    r'<meta[^>]+property=["\']og:image:width["\'][^>]+content=["\']([^"\']+)["\']',
    re.IGNORECASE,
)
OG_HEIGHT_RE = re.compile(
    r'<meta[^>]+property=["\']og:image:height["\'][^>]+content=["\']([^"\']+)["\']',
    re.IGNORECASE,
)
TWITTER_IMAGE_RE = re.compile(
    r'<meta[^>]+name=["\']twitter:image["\'][^>]+content=["\']([^"\']+)["\']',
    re.IGNORECASE,
)


def _rewrite_url_to_base(url: str, base: str) -> str:
    """Rewrite a sitemap URL so it points at the base host under test.

    Sitemaps ship absolute production URLs (e.g. https://doseroutine.com/...).
    When the validator is run against localhost or a preview URL, we still
    want to crawl the local app, not production.
    """
    base_split = urllib.parse.urlsplit(base.rstrip("/"))
    parsed = urllib.parse.urlsplit(url.strip())
    if not parsed.netloc:
        # Already a relative URL; prepend base scheme/host.
        return f"{base_split.scheme}://{base_split.netloc}{parsed.path}{parsed.query and '?' + parsed.query}{parsed.fragment and '#' + parsed.fragment}"
    rewritten = urllib.parse.urlunsplit(
        (base_split.scheme, base_split.netloc, parsed.path, parsed.query, parsed.fragment)
    )
    return rewritten


def collect_sitemap_urls(base: str) -> list[str]:
    to_visit = [f"{base.rstrip('/')}/sitemap.xml"]
    seen: set[str] = set()
    urls: set[str] = set()
    while to_visit:
        sm = to_visit.pop()
        if sm in seen:
            continue
        seen.add(sm)
        try:
            body = fetch_sitemap_bytes(sm, user_agent=UA)
        except Exception as exc:
            print(f"warn: could not fetch {sm}: {exc}", file=sys.stderr)
            continue
        root = ET.fromstring(body)
        tag = root.tag.split("}", 1)[-1]
        if tag == "sitemapindex":
            for loc in root.iter("{http://www.sitemaps.org/schemas/sitemap/0.9}loc"):
                if loc.text:
                    to_visit.append(_rewrite_url_to_base(loc.text.strip(), base))
        else:
            for loc in root.iter("{http://www.sitemaps.org/schemas/sitemap/0.9}loc"):
                if loc.text:
                    urls.add(_rewrite_url_to_base(loc.text.strip(), base))
    return sorted(urls)


def fetch_page_html(url: str) -> str:
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    with urllib.request.urlopen(req, timeout=30) as resp:
        return resp.read().decode("utf-8", errors="replace")


def extract_meta(html: str) -> dict[str, str | None]:
    def first(pattern: re.Pattern[str]) -> str | None:
        m = pattern.search(html)
        return _html_unescape(m.group(1).strip()) if m else None

    return {
        "og:image": first(OG_IMAGE_RE),
        "og:image:width": first(OG_WIDTH_RE),
        "og:image:height": first(OG_HEIGHT_RE),
        "twitter:image": first(TWITTER_IMAGE_RE),
    }


def _html_unescape(value: str) -> str:
    import html
    return html.unescape(value)


def local_og_path(og_url: str, base_host: str) -> str | None:
    parsed = urllib.parse.urlsplit(og_url)
    if parsed.netloc and parsed.netloc != base_host:
        return None
    path = parsed.path
    if not path.startswith("/og/"):
        return None
    return path


TRANSIENT_STATUS = {408, 425, 429, 500, 502, 503, 504}


def _http_request(url: str, method: str | None = None, extra_headers: dict | None = None) -> urllib.request.addinfourl:
    req = urllib.request.Request(
        url,
        method=method,
        headers={"User-Agent": UA, **(extra_headers or {})},
    )
    return urllib.request.urlopen(req, timeout=30)


def http_probe(url: str) -> dict:
    """HEAD with GET fallback. Returns status, content-type, content-length."""
    for method, extra_headers in (("HEAD", {}), (None, {"Range": "bytes=0-0"})):
        try:
            with _http_request(url, method=method, extra_headers=extra_headers) as resp:
                return {
                    "status": resp.status,
                    "content_type": resp.headers.get("Content-Type", "").lower(),
                    "content_length": int(resp.headers.get("Content-Length") or 0),
                    "final_url": resp.geturl(),
                }
        except urllib.error.HTTPError as e:
            # If HEAD is rejected outright, fall through to GET.
            if method == "HEAD" and e.code in (403, 405, 501):
                continue
            return {"status": e.code, "content_type": "", "content_length": 0, "final_url": url}
        except Exception:
            continue
    return {"status": None, "content_type": "", "content_length": 0, "final_url": url, "error": "probe failed"}


def http_probe_with_retry(url: str, attempts: int = 4) -> dict:
    """Serial retry with exponential backoff for transient failures.

    Rate-limited hosts (e.g. PubChem image CDN) often reject bursts of
    parallel HEAD requests with 429/503. A slower serial retry gives them
    time to accept the request.
    """
    import time

    delay = 1.5
    last: dict = {"status": 0, "content_type": "", "content_length": 0, "final_url": url, "error": None}
    for _ in range(attempts):
        try:
            with _http_request(url, method="GET") as resp:
                last = {
                    "status": resp.status,
                    "content_type": resp.headers.get("Content-Type", "").lower(),
                    "content_length": int(resp.headers.get("Content-Length") or 0),
                    "final_url": resp.geturl(),
                    "error": None,
                }
                if last["status"] == 200 and last["content_type"].startswith("image/"):
                    return last
        except urllib.error.HTTPError as e:
            last["status"] = e.code
            last["error"] = f"HTTP {e.code}"
            if e.code not in TRANSIENT_STATUS:
                return last
        except Exception as exc:
            last["error"] = str(exc)
        time.sleep(delay)
        delay *= 2
    return last



def check_local_file(fs_path: Path) -> dict:
    if not fs_path.is_file():
        return {"status": "missing"}
    try:
        with Image.open(fs_path) as img:
            img.verify()
        with Image.open(fs_path) as img2:
            w, h = img2.size
            fmt = img2.format or ""
    except Exception as exc:
        return {"status": "unreadable", "error": f"{type(exc).__name__}: {exc}"}
    return {"status": "ok", "width": w, "height": h, "format": fmt}


def validate_image(og_url: str, base: str) -> dict:
    """Return a result dict with errors/warnings for one image URL."""
    result: dict = {"og_url": og_url, "errors": [], "warnings": []}

    parsed = urllib.parse.urlsplit(og_url)
    if not (parsed.scheme == "https" and parsed.netloc):
        result["errors"].append("og:image URL must be absolute https:// for mobile apps")
        return result

    base_split = urllib.parse.urlsplit(base.rstrip("/"))
    base_host = base_split.netloc

    # Sitemaps ship absolute production URLs. When the validator runs against
    # localhost/preview, rewrite DoseRoutine-hosted asset URLs so we test the
    # local build instead of production. External hosts (PubChem) stay as-is.
    local_asset_prefixes = ("/og/", "/__l5e/", "/icon-", "/splash/", "/apple-touch")
    if parsed.netloc != base_host and parsed.path.startswith(local_asset_prefixes):
        og_url = urllib.parse.urlunsplit(
            (base_split.scheme, base_split.netloc, parsed.path, parsed.query, parsed.fragment)
        )
        parsed = urllib.parse.urlsplit(og_url)
        result["rewritten_url"] = og_url

    # Probe the live URL. Burst HEAD requests often trigger rate-limits on
    # external CDNs (PubChem, etc.), so retry transient 429/5xx serially.
    probe = http_probe(og_url)
    if probe.get("status") in TRANSIENT_STATUS:
        probe = http_probe_with_retry(og_url)

    result["http_status"] = probe.get("status")
    result["content_type"] = probe.get("content_type")
    result["content_length"] = probe.get("content_length")
    result["final_url"] = probe.get("final_url")

    if probe.get("status") is None:
        result["errors"].append("could not fetch image (HEAD and GET both failed)")
        return result
    if probe["status"] >= 400:
        result["errors"].append(f"image returned HTTP {probe['status']}")
        return result


    ctype = probe["content_type"]
    if not ctype.startswith("image/"):
        result["errors"].append(f"content-type is {ctype!r}, expected image/*")
    elif ctype not in SAFE_IMAGE_TYPES:
        result["warnings"].append(
            f"content-type {ctype!r} may not render in all mobile apps "
            f"(safe list: {', '.join(sorted(SAFE_IMAGE_TYPES))})"
        )

    length = probe.get("content_length") or 0
    if length > MAX_SIZE_BYTES:
        result["errors"].append(
            f"image is {length / (1024 * 1024):.2f} MB; mobile apps often refuse >5 MB"
        )
    elif length > WARN_SIZE_BYTES:
        result["warnings"].append(
            f"image is {length / (1024 * 1024):.2f} MB; consider compressing to <2.5 MB"
        )

    # For local /og/* files, verify the actual file on disk.
    local_path = local_og_path(og_url, base_host)
    if local_path:
        rel = local_path.lstrip("/")
        fs_path = OG_DIR.parent / rel
        file_check = check_local_file(fs_path)
        result["local_file"] = str(fs_path)
        result["file_check"] = file_check
        if file_check["status"] == "missing":
            result["errors"].append(f"referenced local file does not exist: {fs_path}")
        elif file_check["status"] == "unreadable":
            result["errors"].append(f"local file is not a valid image: {file_check.get('error')}")
        else:
            w, h = file_check["width"], file_check["height"]
            if w < MIN_WIDTH or h < MIN_HEIGHT:
                result["errors"].append(
                    f"local image is {w}x{h}, below recommended {MIN_WIDTH}x{MIN_HEIGHT}"
                )
            aspect = w / h if h else 0
            if aspect < MIN_ASPECT or aspect > MAX_ASPECT:
                result["warnings"].append(
                    f"aspect ratio is {aspect:.2f}:1 (recommended ~1.91:1 for mobile previews)"
                )

    return result


def validate_page(
    page_url: str,
    base: str,
    image_cache: dict[str, dict],
) -> dict:
    base_host = urllib.parse.urlsplit(base.rstrip("/")).netloc
    result: dict = {"page_url": page_url, "errors": [], "warnings": []}
    try:
        html = fetch_page_html(page_url)
    except Exception as exc:
        result["errors"].append(f"page fetch failed: {exc}")
        return result

    meta = extract_meta(html)
    og_image = meta["og:image"]
    tw_image = meta["twitter:image"]
    og_width = meta["og:image:width"]
    og_height = meta["og:image:height"]

    if not og_image:
        result["errors"].append("missing og:image — mobile link previews will be empty")
        return result

    # Validate / cache the og:image.
    if og_image not in image_cache:
        image_cache[og_image] = validate_image(og_image, base)
    og_check = image_cache[og_image]
    result["og_image"] = og_check
    result["errors"].extend(og_check["errors"])
    result["warnings"].extend(og_check["warnings"])

    # twitter:image should exist and match og:image for consistent previews.
    if not tw_image:
        result["warnings"].append(
            "missing twitter:image — X/Twitter app on iOS/Android may fall back poorly"
        )
    elif tw_image != og_image:
        result["warnings"].append(
            "twitter:image differs from og:image — mobile previews may differ between apps"
        )
        if tw_image not in image_cache:
            image_cache[tw_image] = validate_image(tw_image, base)
        tw_check = image_cache[tw_image]
        result["twitter_image"] = tw_check
        result["errors"].extend(tw_check["errors"])
        result["warnings"].extend(tw_check["warnings"])

    # Declared dimensions help iMessage/WhatsApp choose the right crop.
    if not og_width or not og_height:
        result["warnings"].append(
            "missing og:image:width/height — mobile apps may crop the preview unpredictably"
        )
    else:
        try:
            wi, hi = int(og_width), int(og_height)
            if wi < MIN_WIDTH or hi < MIN_HEIGHT:
                result["warnings"].append(
                    f"declared og:image size {wi}x{hi} is below recommended {MIN_WIDTH}x{MIN_HEIGHT}"
                )
        except ValueError:
            result["warnings"].append(
                f"og:image:width/height are not integers ({og_width!r}, {og_height!r})"
            )

    return result


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Validate og:image mobile sharing compatibility."
    )
    parser.add_argument("base_url", help="Base URL of the running app")
    parser.add_argument(
        "--report",
        type=Path,
        default=None,
        help="Path to write JSON report",
    )
    args = parser.parse_args()

    base = args.base_url.rstrip("/")
    base_host = urllib.parse.urlsplit(base).netloc

    print(f"Crawling sitemap at {base}/sitemap.xml ...", flush=True)
    urls = collect_sitemap_urls(base)
    print(f"Found {len(urls)} sitemap URLs", flush=True)

    image_cache: dict[str, dict] = {}
    page_results: list[dict] = []
    fetch_errors: list[tuple[str, str]] = []

    with ThreadPoolExecutor(max_workers=16) as pool:
        futures = {
            pool.submit(validate_page, u, base, image_cache): u
            for u in urls
        }
        for fut in as_completed(futures):
            u = futures[fut]
            try:
                page_results.append(fut.result())
            except Exception as exc:
                fetch_errors.append((u, f"validation crashed: {exc}"))

    # Sort for stable output.
    page_results.sort(key=lambda r: r["page_url"])

    total_errors = sum(len(r["errors"]) for r in page_results) + len(fetch_errors)
    total_warnings = sum(len(r["warnings"]) for r in page_results)

    print(
        f"\nChecked {len(page_results)} page(s); "
        f"{total_errors} error(s), {total_warnings} warning(s).",
        flush=True,
    )

    if fetch_errors:
        print(f"\n{len(fetch_errors)} page(s) could not be validated:", file=sys.stderr)
        for u, msg in fetch_errors[:20]:
            print(f"  - {u}: {msg}", file=sys.stderr)

    failing_pages = [r for r in page_results if r["errors"]]
    if failing_pages:
        print(f"\nFAIL: {len(failing_pages)} page(s) have mobile-sharing errors:", file=sys.stderr)
        for r in failing_pages:
            print(f"\n  {r['page_url']}", file=sys.stderr)
            for err in r["errors"]:
                print(f"    ✗ {err}", file=sys.stderr)
            for warn in r["warnings"]:
                print(f"    ⚠ {warn}", file=sys.stderr)

    if args.report:
        args.report.parent.mkdir(parents=True, exist_ok=True)
        report = {
            "base_url": base,
            "sitemap_url_count": len(urls),
            "unique_og_images": len(image_cache),
            "error_count": total_errors,
            "warning_count": total_warnings,
            "fetch_error_count": len(fetch_errors),
            "pages": page_results,
            "fetch_errors": [{"url": u, "error": msg} for u, msg in fetch_errors],
        }
        args.report.write_text(json.dumps(report, indent=2, sort_keys=True))
        print(f"\nWrote report to {args.report}", flush=True)

    return 1 if (total_errors or fetch_errors) else 0


if __name__ == "__main__":
    sys.exit(main())
