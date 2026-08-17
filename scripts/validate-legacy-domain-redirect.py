#!/usr/bin/env python3
"""Verify the legacy my-stack-wise.com domain forwards to doseroutine.com.

Google's domain-change guidance: every legacy URL must return a
path-preserving 301 (preferred) or 302 to the corresponding URL on the
new domain, so link equity and existing indexing consolidate.

For each legacy host we check:
  1. Root and www variants
  2. A random sample of sitemap paths on doseroutine.com
  3. Each request returns a 3xx to https://doseroutine.com<same-path>
  4. HSTS / status details are printed as diagnostics
  5. A WARN (not fail) is emitted for 302 vs the preferred 301

Exit code 1 only if a legacy URL does NOT redirect at all, or redirects
to a different path/host.
"""
from __future__ import annotations

import argparse
import concurrent.futures
import random
import sys
import urllib.parse
import urllib.request
import xml.etree.ElementTree as ET

CANONICAL_HOST = "doseroutine.com"
LEGACY_HOSTS = ("my-stack-wise.com", "www.my-stack-wise.com")
UA = "DoseRoutineCI-LegacyRedirect/1.0"
TIMEOUT = 20


class NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        return None


OPENER = urllib.request.build_opener(NoRedirect)


def fetch_sitemap_paths(base: str) -> list[str]:
    url = f"{base}/sitemap.xml"
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    with urllib.request.urlopen(req, timeout=TIMEOUT) as r:
        xml = r.read().decode("utf-8", errors="replace")
    ns = {"s": "http://www.sitemaps.org/schemas/sitemap/0.9"}
    root = ET.fromstring(xml)
    out = []
    for el in root.findall(".//s:url/s:loc", ns):
        if not el.text:
            continue
        p = urllib.parse.urlsplit(el.text.strip())
        out.append(p.path or "/")
    return out


def probe(url: str) -> tuple[int, str | None, str | None]:
    try:
        req = urllib.request.Request(url, headers={"User-Agent": UA})
        resp = OPENER.open(req, timeout=TIMEOUT)
        return resp.getcode(), resp.headers.get("Location"), None
    except urllib.error.HTTPError as e:
        return e.code, e.headers.get("Location") if e.headers else None, None
    except Exception as e:
        return 0, None, str(e)


def check(host: str, path: str) -> tuple[str, str] | tuple[str, str, str]:
    """Return (url, error) fail, (url, "WARN", msg) warn, or None ok."""
    url = f"https://{host}{path}"
    status, location, err = probe(url)
    if err:
        return (url, f"fetch error: {err}")
    if status not in (301, 302, 307, 308):
        return (url, f"expected 3xx redirect, got {status}")
    if not location:
        return (url, f"{status} without Location header")
    target = urllib.parse.urljoin(url, location)
    tp = urllib.parse.urlsplit(target)
    expected_host = CANONICAL_HOST
    if tp.hostname != expected_host:
        return (url, f"{status} → {target} (host is {tp.hostname}, expected {expected_host})")
    if (tp.path or "/") != path:
        return (url, f"{status} → {target} (path changed to {tp.path}, expected {path})")
    if status != 301:
        return (url, "WARN", f"redirect is {status}; 301 is preferred for permanent domain change")
    return None  # type: ignore[return-value]


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--base", default=f"https://{CANONICAL_HOST}")
    ap.add_argument("--sample", type=int, default=20,
                    help="Number of random sitemap paths to test per legacy host (plus '/').")
    ap.add_argument("--all", action="store_true", help="Test every sitemap path.")
    ap.add_argument("--concurrency", type=int, default=8)
    args = ap.parse_args()

    print(f"Fetching sitemap from {args.base}/sitemap.xml ...")
    paths = fetch_sitemap_paths(args.base)
    print(f"Sitemap paths: {len(paths)}")

    if not args.all and args.sample and args.sample < len(paths):
        random.seed(0)
        sample = ["/"] + random.sample([p for p in paths if p != "/"], args.sample)
    else:
        sample = list({"/", *paths})
    print(f"Testing {len(sample)} paths per legacy host: {', '.join(LEGACY_HOSTS)}")

    jobs = [(host, path) for host in LEGACY_HOSTS for path in sample]
    fails: list[tuple[str, str]] = []
    warns: list[tuple[str, str]] = []

    with concurrent.futures.ThreadPoolExecutor(max_workers=args.concurrency) as ex:
        for result in ex.map(lambda hp: check(*hp), jobs):
            if result is None:
                continue
            if len(result) == 3 and result[1] == "WARN":
                warns.append((result[0], result[2]))
            else:
                fails.append(result)  # type: ignore[arg-type]

    print(f"\nChecked: {len(jobs)}  Failed: {len(fails)}  Warnings: {len(warns)}")

    if warns:
        print("\nWARNINGS (non-fatal):")
        for u, msg in warns[:10]:
            print(f"  {u}\n    {msg}")
        if len(warns) > 10:
            print(f"  ... and {len(warns) - 10} more identical")

    if fails:
        print("\nFAILURES:")
        for u, err in fails:
            print(f"  {u}\n    {err}")
        return 1

    print("All legacy-domain redirects are path-preserving to doseroutine.com.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
