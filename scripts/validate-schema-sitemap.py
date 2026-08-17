#!/usr/bin/env python3
"""
Validate structured-data schemas and sitemap indexing on every deploy.

For each critical route we assert:
  - the page ships specific JSON-LD @type entries (Article, BreadcrumbList,
    FAQPage, etc.), each parseable and shaped correctly
  - required BreadcrumbList/ItemList have >=1 itemListElement
  - Article has headline + author
  - FAQPage has >=1 mainEntity with Question/Answer
  - the route is listed in /sitemap.xml

Extend REQUIRED_ROUTES as new schema-bearing pages ship.

Usage: python3 scripts/validate-schema-sitemap.py [BASE_URL]
Default BASE_URL is http://localhost:8080.
"""
from __future__ import annotations

import json
import re
import sys
import time
import urllib.error
import urllib.request
from typing import Any

BASE = sys.argv[1].rstrip("/") if len(sys.argv) > 1 else "http://localhost:8080"

# path -> set of JSON-LD @type values required on the page
# Explicit overrides. Library compound pages and library comparison pages are
# auto-discovered from /sitemap.xml below and get default requirements.
REQUIRED_ROUTES: dict[str, set[str]] = {
    "/": {"SoftwareApplication", "FAQPage"},
    "/library/compare/bpc-157-vs-tb-500": {"Article", "BreadcrumbList", "FAQPage"},
    "/library/bpc-157": {"Article", "BreadcrumbList", "FAQPage", "MedicalSubstance"},
    "/library/tb-500": {"Article", "BreadcrumbList", "FAQPage", "MedicalSubstance"},
}

# Default schema requirements applied to auto-discovered routes by URL pattern.
# Each pattern is checked against the sitemap path; the first match wins.
AUTO_ROUTE_DEFAULTS: list[tuple[re.Pattern[str], set[str]]] = [
    (re.compile(r"^/library/compare/[^/]+$"), {"Article", "BreadcrumbList", "FAQPage"}),
    (
        re.compile(r"^/library/[^/]+$"),
        {"Article", "BreadcrumbList", "FAQPage", "MedicalSubstance"},
    ),
    # Blog posts: every post ships BlogPosting + BreadcrumbList. FAQPage is
    # optional per post, so it is shape-checked when present, not required.
    (re.compile(r"^/blog/(?!tag(?:/|$))[^/]+$"), {"BlogPosting", "BreadcrumbList"}),
]

# Sitemap paths matching these patterns are skipped during auto-discovery
# (index/landing pages that don't ship per-item schema).
AUTO_SKIP_PATTERNS: list[re.Pattern[str]] = [
    re.compile(r"^/library$"),
    re.compile(r"^/library/$"),
    re.compile(r"^/blog$"),
    re.compile(r"^/blog/$"),
    re.compile(r"^/blog/tag(?:/.*)?$"),
]



UA = "DoseRoutine-Deploy-Validator/1.0 (+https://doseroutine.com)"


def fetch(path: str, timeout: float = 30.0) -> str:
    req = urllib.request.Request(BASE + path, headers={"User-Agent": UA})
    with urllib.request.urlopen(req, timeout=timeout) as r:
        return r.read().decode("utf-8", "ignore")


def wait_for_server(max_seconds: int = 120) -> None:
    deadline = time.time() + max_seconds
    last: Exception | None = None
    while time.time() < deadline:
        try:
            req = urllib.request.Request(BASE + "/", headers={"User-Agent": UA})
            urllib.request.urlopen(req, timeout=5).read()
            return
        except Exception as e:
            last = e
            time.sleep(2)
            last = e
            time.sleep(2)
    raise SystemExit(f"Server at {BASE} did not respond within {max_seconds}s ({last})")


def extract_json_ld(html: str) -> list[Any]:
    blocks = re.findall(
        r'<script[^>]+type=["\']application/ld\+json["\'][^>]*>(.*?)</script>',
        html,
        re.S,
    )
    parsed: list[Any] = []
    for b in blocks:
        try:
            parsed.append(json.loads(b.strip()))
        except Exception as e:
            parsed.append({"__parse_error__": str(e), "__raw__": b[:120]})
    return parsed


def flatten(node: Any) -> list[dict[str, Any]]:
    """Return all dict nodes (handles @graph and arrays)."""
    out: list[dict[str, Any]] = []
    if isinstance(node, list):
        for x in node:
            out.extend(flatten(x))
    elif isinstance(node, dict):
        if "@graph" in node and isinstance(node["@graph"], list):
            out.append(node)
            out.extend(flatten(node["@graph"]))
        else:
            out.append(node)
    return out


def types_in(nodes: list[dict[str, Any]]) -> set[str]:
    seen: set[str] = set()
    for n in nodes:
        t = n.get("@type")
        if isinstance(t, str):
            seen.add(t)
        elif isinstance(t, list):
            seen.update(x for x in t if isinstance(x, str))
    return seen


def find_by_type(nodes: list[dict[str, Any]], t: str) -> list[dict[str, Any]]:
    hits: list[dict[str, Any]] = []
    for n in nodes:
        tv = n.get("@type")
        if tv == t or (isinstance(tv, list) and t in tv):
            hits.append(n)
    return hits


def validate_shape(nodes: list[dict[str, Any]], required: set[str]) -> list[str]:
    issues: list[str] = []
    for n in nodes:
        if "__parse_error__" in n:
            issues.append(f"JSON-LD parse error: {n['__parse_error__']}")

    for t in required:
        matches = find_by_type(nodes, t)
        if not matches:
            issues.append(f"missing JSON-LD @type={t}")
            continue

        for m in matches:
            if t == "BreadcrumbList":
                items = m.get("itemListElement") or []
                if not isinstance(items, list) or len(items) < 1:
                    issues.append("BreadcrumbList has no itemListElement")
            elif t == "FAQPage":
                items = m.get("mainEntity") or []
                if not isinstance(items, list) or len(items) < 1:
                    issues.append("FAQPage has no mainEntity")
                else:
                    for q in items:
                        if not isinstance(q, dict):
                            issues.append("FAQPage mainEntity entry not object")
                            continue
                        if q.get("@type") != "Question":
                            issues.append("FAQPage mainEntity missing @type=Question")
                        ans = q.get("acceptedAnswer") or {}
                        if not (isinstance(ans, dict) and ans.get("text")):
                            issues.append("FAQPage Question missing acceptedAnswer.text")
            elif t in ("Article", "BlogPosting", "NewsArticle"):
                if not m.get("headline"):
                    issues.append(f"{t} missing headline")
                if not m.get("author"):
                    issues.append(f"{t} missing author")
                # Blog posts additionally carry publisher + dates (Google
                # requires them for Article rich results on news/blog content).
                if t in ("BlogPosting", "NewsArticle"):
                    if not m.get("publisher"):
                        issues.append(f"{t} missing publisher")
                    if not m.get("datePublished"):
                        issues.append(f"{t} missing datePublished")

            elif t == "SoftwareApplication":
                for field in ("name", "url", "applicationCategory"):
                    if not m.get(field):
                        issues.append(f"SoftwareApplication missing {field}")
                offers = m.get("offers") or []
                if not isinstance(offers, list) or not offers:
                    issues.append("SoftwareApplication missing offers")
                else:
                    for o in offers:
                        if not isinstance(o, dict) or o.get("price") is None:
                            issues.append("SoftwareApplication offer missing price")

    # FAQPage is optional on some routes (e.g. blog posts without FAQs) but
    # must be well formed whenever it ships.
    if "FAQPage" not in required:
        for m in find_by_type(nodes, "FAQPage"):
            items = m.get("mainEntity") or []
            if not isinstance(items, list) or len(items) < 1:
                issues.append("FAQPage has no mainEntity")
    return issues




def load_sitemap_paths() -> set[str]:
    try:
        xml = fetch("/sitemap.xml", timeout=30)
    except Exception as e:
        raise SystemExit(f"could not fetch /sitemap.xml: {e}")
    urls = re.findall(r"<loc>([^<]+)</loc>", xml)
    paths: set[str] = set()
    for u in urls:
        m = re.match(r"^https?://[^/]+(/.*?)/?$", u)
        paths.add(m.group(1) if m else u)
    paths.add("/")
    return paths


def discover_routes(sitemap_paths: set[str]) -> dict[str, set[str]]:
    """Merge explicit REQUIRED_ROUTES with auto-discovered library/compare pages."""
    routes: dict[str, set[str]] = dict(REQUIRED_ROUTES)
    for path in sitemap_paths:
        if path in routes:
            continue
        if any(p.match(path) for p in AUTO_SKIP_PATTERNS):
            continue
        for pattern, required in AUTO_ROUTE_DEFAULTS:
            if pattern.match(path):
                routes[path] = set(required)
                break
    return routes


def main() -> int:
    print(f"Validating schema + sitemap against {BASE}")
    wait_for_server()

    sitemap_paths = load_sitemap_paths()
    print(f"Sitemap contains {len(sitemap_paths)} URLs")

    routes = discover_routes(sitemap_paths)
    auto_count = len(routes) - len(REQUIRED_ROUTES)
    print(
        f"Validating {len(routes)} routes "
        f"({len(REQUIRED_ROUTES)} explicit + {auto_count} auto-discovered)"
    )

    total_issues = 0
    failed_routes = 0
    for path, required in sorted(routes.items()):
        route_issues: list[str] = []

        norm = path.rstrip("/") or "/"
        if norm not in sitemap_paths and path not in sitemap_paths:
            route_issues.append("not listed in /sitemap.xml")

        try:
            html = fetch(path)
        except urllib.error.HTTPError as e:
            route_issues.append(f"fetch HTTP {e.code}")
            html = ""
        except Exception as e:
            route_issues.append(f"fetch error: {e}")
            html = ""

        if html:
            nodes = flatten(extract_json_ld(html))
            if not nodes:
                route_issues.append("no JSON-LD blocks")
            else:
                route_issues.extend(validate_shape(nodes, required))

        if route_issues:
            total_issues += len(route_issues)
            failed_routes += 1
            print(f"FAIL {path}")
            for i in route_issues:
                print(f"    - {i}")
        else:
            print(f"OK   {path}")

    if total_issues:
        print(
            f"\n{total_issues} issue(s) across {failed_routes}/{len(routes)} routes"
        )
        return 1
    print(f"\nAll {len(routes)} routes have valid schema + sitemap entries.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
