#!/usr/bin/env python3
"""Redirect-graph validator.

Every legacy/alias URL on the site must:
  1. answer with a permanent redirect (301 or 308),
  2. point at the intended target,
  3. reach a 200 page within a small number of hops,
  4. never loop back to a URL already seen in the chain.

Cases are discovered automatically from src/routes/*.tsx (any route whose
`beforeLoad` throws `redirect({...})`) and combined with the host/trailing
slash/legacy-query canonicalisation rules implemented in src/server.ts.

Usage: python3 scripts/validate-redirect-graph.py [baseUrl]
"""
from __future__ import annotations

import http.client
import json
import re
import sys
from pathlib import Path
from urllib.parse import urljoin, urlparse

BASE = (sys.argv[1] if len(sys.argv) > 1 else "http://localhost:8080").rstrip("/")
ROUTES_DIR = Path("src/routes")
MAX_HOPS = 5
PERMANENT = {301, 308}


def route_path_from_file(source: str) -> str | None:
    m = re.search(r'createFileRoute\(\s*["\']([^"\']+)["\']', source)
    return m.group(1) if m else None


def target_from_redirect(source: str) -> tuple[str, int] | None:
    """Resolve `redirect({ to, params, statusCode })` to a concrete path."""
    m = re.search(r"redirect\(\s*\{(.*?)\}\s*\)", source, re.S)
    if not m:
        return None
    body = m.group(1)
    to = re.search(r'to:\s*["\']([^"\']+)["\']', body)
    if not to:
        return None
    path = to.group(1)
    status = int((re.search(r"statusCode:\s*(\d+)", body) or [None, "302"])[1])
    for key, value in re.findall(r'(\w+):\s*["\']([^"\']+)["\']', body):
        path = path.replace(f"${key}", value)
    return path, status


def discover_cases() -> list[dict]:
    cases: list[dict] = []
    for file in sorted(ROUTES_DIR.rglob("*.tsx")):
        source = file.read_text(encoding="utf-8")
        if "redirect(" not in source or "beforeLoad" not in source:
            continue
        # Only pure alias routes: a gated/authenticated route redirects
        # conditionally and also renders a component, so it is not part of the
        # public redirect graph.
        if "component" in source or "context" in source:
            continue
        frm = route_path_from_file(source)
        target = target_from_redirect(source)
        if not frm or not target:
            continue
        if frm.startswith("/_") or frm.startswith("/[") or "$" in frm:
            continue
        to, declared = target

        cases.append(
            {
                "from": frm,
                "to": to,
                "declared": declared,
                "reason": f"route alias ({file.as_posix()})",
            }
        )
    # src/server.ts canonicalisation.
    cases += [
        {"from": "/library/", "to": "/library", "declared": 301, "reason": "trailing slash"},
        {"from": "/blog/", "to": "/blog", "declared": 301, "reason": "trailing slash"},
        {"from": "/peptides/", "to": "/peptides", "declared": 301, "reason": "trailing slash"},
        {"from": "/?lang=fr", "to": "/", "declared": 301, "reason": "legacy ?lang= parameter"},
        {
            "from": "/library?lang=es",
            "to": "/library",
            "declared": 301,
            "reason": "legacy ?lang= parameter",
        },
    ]
    return cases


def request(url: str) -> tuple[int, str | None]:
    parts = urlparse(url)
    conn_cls = http.client.HTTPSConnection if parts.scheme == "https" else http.client.HTTPConnection
    conn = conn_cls(parts.netloc, timeout=60)
    target = parts.path or "/"
    if parts.query:
        target += "?" + parts.query
    try:
        conn.request("GET", target, headers={"User-Agent": "Googlebot", "Host": parts.netloc})
        resp = conn.getresponse()
        resp.read(1)
        location = resp.getheader("location")
        return resp.status, urljoin(url, location) if location else None
    finally:
        conn.close()


def follow(url: str) -> dict:
    chain: list[dict] = []
    seen = {url}
    current = url
    for _ in range(MAX_HOPS):
        status, location = request(current)
        chain.append({"url": current, "status": status, "location": location})
        if status not in range(300, 400) or not location:
            return {"chain": chain, "final": current, "final_status": status, "loop": False}
        if location in seen:
            return {"chain": chain, "final": location, "final_status": None, "loop": True}
        seen.add(location)
        current = location
    return {"chain": chain, "final": current, "final_status": None, "loop": False, "too_long": True}


def same_path(a: str, b: str) -> bool:
    pa, pb = urlparse(a), urlparse(b)
    norm = lambda p: (p.path.rstrip("/") or "/") + (f"?{p.query}" if p.query else "")  # noqa: E731
    return norm(pa) == norm(pb)


def main() -> int:
    cases = discover_cases()
    failures: list[str] = []
    print(f"redirect cases discovered: {len(cases)} (base {BASE})")

    for case in cases:
        src = BASE + case["from"]
        expected = BASE + case["to"]
        try:
            walk = follow(src)
        except Exception as exc:  # noqa: BLE001
            failures.append(f"{case['from']}: request failed — {exc}")
            continue

        first = walk["chain"][0]
        label = f"{case['from']} -> {case['to']} [{case['reason']}]"

        if walk["loop"]:
            failures.append(f"{label}: redirect LOOP at {walk['final']}")
            continue
        if walk.get("too_long"):
            failures.append(f"{label}: more than {MAX_HOPS} hops")
            continue
        if first["status"] not in PERMANENT:
            failures.append(
                f"{label}: first response is HTTP {first['status']}, expected a permanent 301/308"
            )
            continue
        redirect_hops = [c for c in walk["chain"] if 300 <= c["status"] < 400]
        if len(redirect_hops) > 1:
            hops = " -> ".join(c["url"] for c in walk["chain"])
            failures.append(f"{label}: redirect chain ({len(redirect_hops)} hops): {hops}")

        if not same_path(walk["final"], expected):
            failures.append(f"{label}: lands on {walk['final']} instead of {expected}")
            continue
        if walk["final_status"] != 200:
            failures.append(f"{label}: destination returned HTTP {walk['final_status']}")
            continue
        print(f"  ok  {label} ({first['status']})")

    if failures:
        print(f"\n{len(failures)} redirect problem(s):")
        for f in failures:
            print(f"  FAIL {f}")
        return 1
    print("\nall redirects are single-hop permanent redirects to a 200 target, no loops")
    return 0


if __name__ == "__main__":
    if "--json-cases" in sys.argv:
        print(json.dumps(discover_cases(), indent=2))
        sys.exit(0)
    sys.exit(main())
