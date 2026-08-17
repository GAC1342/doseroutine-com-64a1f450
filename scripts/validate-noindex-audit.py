#!/usr/bin/env python3
"""Fail-loud noindex audit for a live DoseRoutine deployment.

Probes every non-indexable path AND representative 404 responses (including
custom not-found handling), asserting robots.txt, the X-Robots-Tag response
header and the <meta name="robots"> tag all agree. Exits non-zero on any
divergence so CI fails instead of silently drifting.

Probe paths come from scripts/noindex-probe-paths.json, which is generated
from src/lib/non-indexable.ts (the single source of truth) and kept in sync by
src/lib/__tests__/not-found-indexing.test.ts.
"""

from __future__ import annotations

import argparse
import json
import re
import sys
import urllib.error
import urllib.request
from pathlib import Path

PROBES = Path(__file__).with_name("noindex-probe-paths.json")
META_RE = re.compile(
    r"<meta[^>]+name=[\"']robots[\"'][^>]*content=[\"']([^\"']+)[\"']", re.I
)
UA = "DoseRoutine-noindex-audit/1.0"


def fetch(url: str, timeout: float):
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    try:
        with urllib.request.urlopen(req, timeout=timeout) as res:
            return res.status, dict(res.headers), res.read().decode("utf-8", "replace")
    except urllib.error.HTTPError as err:
        return err.code, dict(err.headers), err.read().decode("utf-8", "replace")


def parse_disallow(txt: str) -> list[str]:
    out: list[str] = []
    wildcard = False
    for raw in txt.splitlines():
        line = raw.split("#", 1)[0].strip()
        if not line or ":" not in line:
            continue
        key, value = line.split(":", 1)
        key, value = key.strip().lower(), value.strip()
        if key == "user-agent":
            wildcard = value == "*"
        elif key == "disallow" and wildcard and value:
            out.append(value)
    return out


def normalize(path: str) -> str:
    return path[:-1] if len(path) > 1 and path.endswith("/") else path


def disallowed(path: str, rules: list[str]) -> bool:
    target = normalize(path)
    for rule in rules:
        r = normalize(rule)
        if r == "/" or target == r or target.startswith(rule) or target.startswith(r + "/"):
            return True
    return False


def audit(base: str, probe: dict, rules: list[str], timeout: float) -> list[str]:
    path = probe["path"]
    problems: list[str] = []
    try:
        status, headers, body = fetch(base + path, timeout)
    except Exception as exc:  # network / TLS / timeout
        return [f"request failed: {exc}"]

    header = (headers.get("X-Robots-Tag") or headers.get("x-robots-tag") or "").lower()
    content_type = (headers.get("Content-Type") or headers.get("content-type") or "").lower()
    meta_match = META_RE.search(body) if "text/html" in content_type else None
    meta = (meta_match.group(1) if meta_match else "").lower()

    if probe.get("expect404") and status != 404:
        problems.append(f"expected HTTP 404, got {status}")
    if probe.get("requiresRobotsRule", True) and not disallowed(path, rules):
        problems.append("robots.txt does not disallow this path")
    if "noindex" not in header:
        problems.append(f"missing X-Robots-Tag: noindex (got {header or 'none'})")
    if "text/html" in content_type and "noindex" not in meta:
        problems.append(f"missing <meta name=robots> noindex (got {meta or 'none'})")

    cache = (headers.get("Cache-Control") or headers.get("cache-control") or "").lower()
    if probe.get("expect404"):
        if "no-store" not in cache or "private" not in cache:
            problems.append(
                f"404 must send Cache-Control: private, no-store (got {cache or 'none'})"
            )
        elif "public" in cache or "s-maxage" in cache:
            problems.append(f"404 Cache-Control must not be cacheable (got {cache})")
    return problems


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--base", default="https://doseroutine.com")
    ap.add_argument("--timeout", type=float, default=20.0)
    args = ap.parse_args()
    base = args.base.rstrip("/")

    data = json.loads(PROBES.read_text())
    targets = [
        {**p, "group": "noindex", "requiresRobotsRule": True, "expect404": False}
        for p in data["nonIndexable"]
    ] + [{**p, "group": "404", "expect404": True} for p in data["notFound"]]

    status, _, robots_body = fetch(f"{base}/robots.txt", args.timeout)
    if status != 200:
        print(f"FAIL: {base}/robots.txt returned HTTP {status}")
        return 1
    rules = parse_disallow(robots_body)

    failures = 0
    for probe in targets:
        problems = audit(base, probe, rules, args.timeout)
        label = f"[{probe['group']}] {probe['path']}"
        if problems:
            failures += 1
            print(f"FAIL {label}")
            for p in problems:
                print(f"      - {p}")
        else:
            print(f"ok   {label}")

    print(f"\n{len(targets)} probes checked, {failures} mismatch(es).")
    if failures:
        print(
            "robots.txt, X-Robots-Tag and <meta name=robots> have diverged. "
            "Update src/lib/non-indexable.ts, public/robots.txt and src/server.ts together."
        )
    return 1 if failures else 0


if __name__ == "__main__":
    sys.exit(main())
