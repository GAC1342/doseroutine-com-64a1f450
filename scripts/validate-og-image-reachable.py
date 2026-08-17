#!/usr/bin/env python3
"""
Verify every og:image URL on indexed sitemap pages returns HTTP 200
and an image/* content-type. Falls back to GET when a host rejects HEAD,
and retries transient 429/5xx failures serially with backoff to avoid
misreporting rate-limits as failures.

Usage: python scripts/validate-og-image-reachable.py [BASE_URL]
"""
from __future__ import annotations
import concurrent.futures, html as _html, re, sys, time, urllib.error, urllib.request
from collections import defaultdict

BASE = sys.argv[1].rstrip("/") if len(sys.argv) > 1 else "https://doseroutine.com"
UA = "DoseRoutine-OG-Image-Verifier/1.0"
TIMEOUT = 20
CONCURRENCY = 8
TRANSIENT = {408, 425, 429, 500, 502, 503, 504}


OG_IMAGE_RE = re.compile(
    r'<meta\b[^>]*\bproperty=["\']og:image["\'][^>]*\bcontent=["\']([^"\']+)["\']',
    re.IGNORECASE)
OG_IMAGE_RE_ALT = re.compile(
    r'<meta\b[^>]*\bcontent=["\']([^"\']+)["\'][^>]*\bproperty=["\']og:image["\']',
    re.IGNORECASE)
ROBOTS_RE = re.compile(
    r'<meta\b[^>]*\bname=["\']robots["\'][^>]*\bcontent=["\']([^"\']*)["\']',
    re.IGNORECASE)

def http_get(url: str, method="GET"):
    req = urllib.request.Request(url, headers={"User-Agent": UA}, method=method)
    return urllib.request.urlopen(req, timeout=TIMEOUT)

def sitemap_urls() -> list[str]:
    with http_get(f"{BASE}/sitemap.xml") as r:
        xml = r.read().decode("utf-8", errors="replace")
    return re.findall(r"<loc>([^<]+)</loc>", xml)

def extract_og(url: str) -> tuple[str | None, bool]:
    """Return (og:image_url, indexable)."""
    try:
        with http_get(url) as r:
            x_robots = r.headers.get("X-Robots-Tag", "") or ""
            html = r.read().decode("utf-8", errors="replace")
    except Exception as e:
        return (None, True)  # treated separately as page-fetch error
    rm = ROBOTS_RE.search(html)
    indexable = "noindex" not in ((rm.group(1) if rm else "") + " " + x_robots).lower()
    m = OG_IMAGE_RE.search(html) or OG_IMAGE_RE_ALT.search(html)
    return (_html.unescape(m.group(1)).strip() if m else None, indexable)

def verify_image(url: str) -> dict:
    out = {"url": url, "status": 0, "content_type": "", "error": None}
    try:
        try:
            resp = http_get(url, method="HEAD")
        except urllib.error.HTTPError as e:
            if e.code in (403, 405, 501):  # servers that reject HEAD
                resp = http_get(url, method="GET")
            else:
                raise
        out["status"] = resp.status
        out["content_type"] = (resp.headers.get("Content-Type") or "").split(";")[0].strip().lower()
    except urllib.error.HTTPError as e:
        out["error"] = f"HTTP {e.code}"
        out["status"] = e.code
    except Exception as e:  # noqa: BLE001
        out["error"] = str(e)
    return out


def retry_serial(url: str, attempts: int = 4) -> dict:
    """Retry a URL sequentially with exponential backoff. Prefer GET so we
    can also observe the true content-type from hosts that throttle HEAD."""
    delay = 1.5
    last: dict = {"url": url, "status": 0, "content_type": "", "error": None}
    for i in range(attempts):
        try:
            resp = http_get(url, method="GET")
            last["status"] = resp.status
            last["content_type"] = (resp.headers.get("Content-Type") or "").split(";")[0].strip().lower()
            last["error"] = None
            if resp.status == 200 and last["content_type"].startswith("image/"):
                return last
        except urllib.error.HTTPError as e:
            last["status"] = e.code
            last["error"] = f"HTTP {e.code}"
            if e.code not in TRANSIENT:
                return last
        except Exception as e:  # noqa: BLE001
            last["error"] = str(e)
        time.sleep(delay)
        delay *= 2
    return last


def main() -> int:
    urls = sitemap_urls()
    print(f"Sitemap URLs: {len(urls)}  (base: {BASE})")

    og_by_page: dict[str, str | None] = {}
    with concurrent.futures.ThreadPoolExecutor(max_workers=CONCURRENCY) as pool:
        futs = {pool.submit(extract_og, u): u for u in urls}
        skipped_noindex, missing_og = [], []
        for i, f in enumerate(concurrent.futures.as_completed(futs), 1):
            u = futs[f]
            og_url, indexable = f.result()
            if not indexable:
                skipped_noindex.append(u); continue
            if not og_url:
                missing_og.append(u); continue
            og_by_page[u] = og_url
            if i % 50 == 0: print(f"  extracted {i}/{len(urls)}")

    # dedupe image URLs, remember which pages use each
    pages_by_image: dict[str, list[str]] = defaultdict(list)
    for page, img in og_by_page.items():
        pages_by_image[img].append(page)
    unique_images = sorted(pages_by_image)
    print(f"Indexed pages: {len(og_by_page)}  unique og:image URLs: {len(unique_images)}")
    if skipped_noindex:
        print(f"⚠️  Skipped {len(skipped_noindex)} noindex page(s).")
    if missing_og:
        print(f"❌ {len(missing_og)} indexed page(s) missing og:image; failing.")
        for p in missing_og[:20]: print(f"    - {p}")

    results: list[dict] = []
    with concurrent.futures.ThreadPoolExecutor(max_workers=CONCURRENCY) as pool:
        futs = {pool.submit(verify_image, img): img for img in unique_images}
        for i, f in enumerate(concurrent.futures.as_completed(futs), 1):
            results.append(f.result())
            if i % 25 == 0: print(f"  verified {i}/{len(unique_images)}")

    def is_bad(r: dict) -> bool:
        return not (r["status"] == 200 and r["content_type"].startswith("image/"))

    bad = [r for r in results if is_bad(r)]

    # Retry transient failures serially with backoff — rate-limited hosts
    # (e.g. PubChem) often reject bursts of parallel HEADs with 429/5xx.
    retryable = [r for r in bad if r["status"] in TRANSIENT or r["status"] == 0]
    if retryable:
        print(f"↻ retrying {len(retryable)} transient failure(s) serially...")
        by_url = {r["url"]: r for r in results}
        for r in retryable:
            fresh = retry_serial(r["url"])
            by_url[r["url"]] = fresh
        results = list(by_url.values())
        bad = [r for r in results if is_bad(r)]

    print("")
    print(f"og:image URLs OK: {len(results) - len(bad)} / {len(results)}")
    if not bad and not missing_og:
        print("✅ Every og:image URL returns 200 with an image/* content-type.")
        return 0

    print(f"❌ {len(bad)} og:image URL(s) failed:\n")
    for r in bad[:80]:
        reason = r["error"] or (
            f"status={r['status']} content-type={r['content_type'] or 'missing'}"
        )
        print(f"  {r['url']}  →  {reason}")
        for p in pages_by_image[r["url"]][:5]:
            print(f"      used by: {p}")
    if len(bad) > 80: print(f"  ... and {len(bad) - 80} more")
    return 1 if (bad or missing_og) else 0

if __name__ == "__main__":
    sys.exit(main())
