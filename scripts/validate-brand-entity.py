#!/usr/bin/env python3
"""Brand-entity guard for "Dose Routine" / "DoseRoutine".

Checks, against a running site:
  1. /dose-routine returns 200, is indexable (no noindex), and its canonical
     is self-referential.
  2. The page names both spellings.
  3. Every sameAs URL emitted in the homepage JSON-LD resolves (no 404s) —
     a dead sameAs actively weakens the entity signal.

Usage: python3 scripts/validate-brand-entity.py [base_url]
"""

from __future__ import annotations

import json
import re
import sys
import urllib.error
import urllib.request

DEFAULT_BASE = "https://doseroutine.com"
UA = {"User-Agent": "DoseRoutineCI/1.0"}


def fetch(url: str) -> str:
    req = urllib.request.Request(url, headers=UA)
    with urllib.request.urlopen(req, timeout=30) as r:
        return r.read().decode("utf-8", errors="replace")


def head_ok(url: str) -> tuple[bool, str]:
    for method in ("HEAD", "GET"):
        req = urllib.request.Request(url, headers=UA, method=method)
        try:
            with urllib.request.urlopen(req, timeout=30) as r:
                if r.status < 400:
                    return True, str(r.status)
        except urllib.error.HTTPError as e:
            if method == "GET" or e.code not in (403, 405):
                return False, f"HTTP {e.code}"
        except Exception as e:  # noqa: BLE001 - network shape varies
            return False, str(e)
    return False, "unreachable"


def json_ld_blocks(html: str) -> list[object]:
    out: list[object] = []
    for m in re.finditer(
        r'<script[^>]+type="application/ld\+json"[^>]*>(.*?)</script>',
        html,
        re.S | re.I,
    ):
        try:
            out.append(json.loads(m.group(1)))
        except json.JSONDecodeError:
            continue
    return out


def collect_same_as(nodes: list[object]) -> set[str]:
    found: set[str] = set()

    def walk(node: object) -> None:
        if isinstance(node, dict):
            same = node.get("sameAs")
            if isinstance(same, str):
                found.add(same)
            elif isinstance(same, list):
                found.update(u for u in same if isinstance(u, str))
            for v in node.values():
                walk(v)
        elif isinstance(node, list):
            for v in node:
                walk(v)

    walk(nodes)
    return found


def main() -> int:
    base = (sys.argv[1] if len(sys.argv) > 1 else DEFAULT_BASE).rstrip("/")
    failures: list[str] = []

    brand_url = f"{base}/dose-routine"
    try:
        html = fetch(brand_url)
    except Exception as e:  # noqa: BLE001
        print(f"FAIL: cannot fetch {brand_url}: {e}")
        return 1
    print(f"OK: fetched {brand_url}")

    robots = re.search(
        r'<meta[^>]+name="robots"[^>]+content="([^"]*)"', html, re.I
    )
    if robots and "noindex" in robots.group(1).lower():
        failures.append("/dose-routine is marked noindex")

    canonicals = re.findall(
        r'<link[^>]+rel="canonical"[^>]+href="([^"]+)"', html, re.I
    )
    if len(canonicals) != 1:
        failures.append(f"/dose-routine has {len(canonicals)} canonical tags (want 1)")
    elif canonicals[0].rstrip("/") != "https://doseroutine.com/dose-routine":
        failures.append(f"/dose-routine canonical is not self-referential: {canonicals[0]}")
    else:
        print(f"OK: canonical self-references {canonicals[0]}")

    text = re.sub(r"<[^>]+>", " ", html)
    for spelling in ("Dose Routine", "DoseRoutine"):
        if spelling not in text:
            failures.append(f"/dose-routine never mentions the spelling {spelling!r}")

    try:
        home = fetch(f"{base}/")
    except Exception as e:  # noqa: BLE001
        print(f"FAIL: cannot fetch homepage: {e}")
        return 1

    same_as = sorted(collect_same_as(json_ld_blocks(home)))
    if not same_as:
        print("WARN: no sameAs URLs found in homepage JSON-LD (entity has no off-site proof)")
    for url in same_as:
        ok, detail = head_ok(url)
        print(f"{'OK' if ok else 'FAIL'}: sameAs {url} ({detail})")
        if not ok:
            failures.append(f"dead sameAs URL: {url} ({detail})")

    if failures:
        print(f"\nFAIL: {len(failures)} brand-entity problem(s)")
        for f in failures:
            print(f"  - {f}")
        return 1

    print(f"\nOK: brand entity healthy ({len(same_as)} sameAs URLs)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
