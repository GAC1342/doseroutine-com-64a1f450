#!/usr/bin/env python3
"""
Structured-data validation sweep across every indexable URL in /sitemap.xml.

Unlike scripts/validate-schema-sitemap.py (which asserts that specific routes
ship specific @types), this sweep is generic: it fetches every sitemap URL and
validates the *shape* of whatever JSON-LD it finds, the way Google's Rich
Results test does.

Checks per page:
  - every <script type="application/ld+json"> block parses as JSON
  - every node has @type, and the top-level node has @context
  - Article/BlogPosting: headline (<=110 chars), author, datePublished,
    absolute image URL when present, dateModified >= datePublished
  - BreadcrumbList: >=1 itemListElement, each with position/name and an
    absolute item URL, positions starting at 1 and contiguous
  - FAQPage: >=1 mainEntity, each Question with name + Answer.text
  - ItemList: >=1 itemListElement
  - Organization/WebSite/SoftwareApplication: name + url
  - MedicalSubstance / MedicalWebPage: name
  - any url/@id/image string field must be absolute (http/https)
  - no duplicate @id values inside one page

Usage: python3 scripts/jsonld-sweep.py [BASE_URL] [--limit N] [--json out.json]
Default BASE_URL is http://localhost:8080.
"""
from __future__ import annotations

import json
import re
import sys
import urllib.error
import urllib.request
from concurrent.futures import ThreadPoolExecutor
from typing import Any, Iterable

LD_RE = re.compile(
    r'<script[^>]+type=["\']application/ld\+json["\'][^>]*>(.*?)</script>',
    re.I | re.S,
)
LOC_RE = re.compile(r"<loc>\s*([^<\s]+)\s*</loc>", re.I)
ROBOTS_RE = re.compile(r'<meta[^>]+name=["\']robots["\'][^>]+content=["\']([^"\']+)', re.I)

TIMEOUT = 30
UA = "DoseRoutine-JSONLD-Sweep/1.0"


def fetch(url: str) -> str:
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    with urllib.request.urlopen(req, timeout=TIMEOUT) as r:
        return r.read().decode("utf-8", "replace")


def is_absolute(v: Any) -> bool:
    return isinstance(v, str) and v.startswith(("http://", "https://"))


def nonempty(v: Any) -> bool:
    return isinstance(v, str) and v.strip() != ""


def flatten(node: Any) -> list[dict]:
    if isinstance(node, list):
        out: list[dict] = []
        for n in node:
            out.extend(flatten(n))
        return out
    if isinstance(node, dict):
        out = [node]
        graph = node.get("@graph")
        if isinstance(graph, list):
            for n in graph:
                out.extend(flatten(n))
        return out
    return []


def resolve(node: Any, index: dict[str, dict]) -> Any:
    """Follow an {"@id": ...} reference to the full node defined on the page."""
    if isinstance(node, dict) and set(node.keys()) == {"@id"}:
        return index.get(node["@id"], node)
    return node


def types_of(node: dict) -> list[str]:
    t = node.get("@type")
    if isinstance(t, str):
        return [t]
    if isinstance(t, list):
        return [x for x in t if isinstance(x, str)]
    return []


def name_of(node: dict, index: dict[str, dict]) -> Any:
    a = node.get("author")
    if isinstance(a, list):
        a = a[0] if a else None
    a = resolve(a, index)
    if isinstance(a, dict):
        return a.get("name")
    return a


def check_article(n: dict, issues: list[str], kind: str, index: dict[str, dict]) -> None:
    headline = n.get("headline") or n.get("name")
    if not nonempty(headline):
        issues.append(f"{kind}: missing headline")
    elif len(headline) > 110:
        issues.append(f"{kind}: headline is {len(headline)} chars (Google truncates >110)")
    if not nonempty(name_of(n, index)):
        issues.append(f"{kind}: missing author.name")
    if not nonempty(n.get("datePublished")):
        issues.append(f"{kind}: missing datePublished")
    dp, dm = n.get("datePublished"), n.get("dateModified")
    if nonempty(dp) and nonempty(dm) and dm < dp:
        issues.append(f"{kind}: dateModified ({dm}) is before datePublished ({dp})")
    img = n.get("image")
    if isinstance(img, dict):
        img = img.get("url")
    if isinstance(img, list):
        img = img[0] if img else None
        if isinstance(img, dict):
            img = img.get("url")
    if img is not None and not is_absolute(img):
        issues.append(f"{kind}: image is not an absolute URL ({img!r})")
    pub = resolve(n.get("publisher"), index)
    if isinstance(pub, dict) and not nonempty(pub.get("name")):
        issues.append(f"{kind}: publisher missing name")


def check_breadcrumbs(n: dict, issues: list[str]) -> None:
    items = n.get("itemListElement")
    if not isinstance(items, list) or not items:
        issues.append("BreadcrumbList: no itemListElement")
        return
    positions: list[int] = []
    for i, raw in enumerate(items):
        if not isinstance(raw, dict):
            issues.append(f"BreadcrumbList[{i}] is not an object")
            continue
        if raw.get("@type") != "ListItem":
            issues.append(f"BreadcrumbList[{i}] @type is not ListItem")
        pos = raw.get("position")
        if not isinstance(pos, int):
            issues.append(f"BreadcrumbList[{i}] missing integer position")
        else:
            positions.append(pos)
        item = raw.get("item")
        label = raw.get("name")
        if isinstance(item, dict):
            label = label or item.get("name")
            item = item.get("@id") or item.get("url")
        if not nonempty(label):
            issues.append(f"BreadcrumbList[{i}] missing name")
        # The last crumb may omit item (it's the current page).
        if item is None:
            if i != len(items) - 1:
                issues.append(f"BreadcrumbList[{i}] missing item URL")
        elif not is_absolute(item):
            issues.append(f"BreadcrumbList[{i}] item is not an absolute URL ({item!r})")
    if positions and positions != list(range(1, len(positions) + 1)):
        issues.append(f"BreadcrumbList positions are not 1..n ({positions})")


def check_faq(n: dict, issues: list[str]) -> None:
    items = n.get("mainEntity")
    if not isinstance(items, list) or not items:
        issues.append("FAQPage: no mainEntity")
        return
    for i, raw in enumerate(items):
        if not isinstance(raw, dict):
            issues.append(f"FAQPage mainEntity[{i}] is not an object")
            continue
        if raw.get("@type") != "Question":
            issues.append(f"FAQPage mainEntity[{i}] @type is not Question")
        if not nonempty(raw.get("name")):
            issues.append(f"FAQPage mainEntity[{i}] missing name")
        ans = raw.get("acceptedAnswer")
        if not isinstance(ans, dict):
            issues.append(f"FAQPage mainEntity[{i}] missing acceptedAnswer")
            continue
        if ans.get("@type") != "Answer":
            issues.append(f"FAQPage mainEntity[{i}] acceptedAnswer @type is not Answer")
        if not nonempty(ans.get("text")):
            issues.append(f"FAQPage mainEntity[{i}] acceptedAnswer missing text")


def check_node(n: dict, issues: list[str], index: dict[str, dict]) -> None:
    ts = types_of(n)
    if not ts:
        # A bare {"@context", "@graph"} wrapper is a container, not a node.
        if set(n.keys()) <= {"@context", "@graph", "@id"}:
            return
        issues.append(f"node without @type: {sorted(n.keys())[:6]}")
        return
    for t in ts:
        if t in ("Article", "BlogPosting", "NewsArticle", "TechArticle", "MedicalWebPage"):
            if t != "MedicalWebPage":
                check_article(n, issues, t, index)
            elif not nonempty(n.get("name")) and not nonempty(n.get("headline")):
                issues.append("MedicalWebPage: missing name")
        elif t == "BreadcrumbList":
            check_breadcrumbs(n, issues)
        elif t == "FAQPage":
            check_faq(n, issues)
        elif t == "ItemList":
            items = n.get("itemListElement")
            if not isinstance(items, list) or not items:
                issues.append("ItemList: no itemListElement")
        elif t in ("Organization", "WebSite", "SoftwareApplication", "WebApplication", "MobileApplication"):
            if not nonempty(n.get("name")):
                issues.append(f"{t}: missing name")
            if not nonempty(n.get("url")) and not nonempty(n.get("@id")):
                issues.append(f"{t}: missing url")
            if n.get("url") is not None and not is_absolute(n.get("url")):
                issues.append(f"{t}: url is not absolute ({n.get('url')!r})")
        elif t in ("MedicalSubstance", "Drug", "DietarySupplement"):
            if not nonempty(n.get("name")):
                issues.append(f"{t}: missing name")

    for key in ("url", "@id", "logo", "sameAs", "contentUrl"):
        v = n.get(key)
        vals: Iterable[Any] = v if isinstance(v, list) else [v]
        for item in vals:
            if isinstance(item, dict):
                item = item.get("url") or item.get("@id")
            if isinstance(item, str) and item and not is_absolute(item):
                # Relative @id fragments (#org) are legal JSON-LD identifiers.
                if key == "@id" and item.startswith("#"):
                    continue
                issues.append(f"{'/'.join(types_of(n)) or 'node'}: {key} is not absolute ({item!r})")


def audit(url: str) -> dict:
    try:
        html = fetch(url)
    except (urllib.error.URLError, urllib.error.HTTPError, TimeoutError) as e:
        return {"url": url, "issues": [f"fetch failed: {e}"], "types": [], "blocks": 0}

    robots = ROBOTS_RE.search(html)
    if robots and "noindex" in robots.group(1).lower():
        return {"url": url, "issues": [], "types": [], "blocks": 0, "skipped": "noindex"}

    issues: list[str] = []
    nodes: list[dict] = []
    blocks = LD_RE.findall(html)
    for i, raw in enumerate(blocks):
        try:
            parsed = json.loads(raw.strip())
        except json.JSONDecodeError as e:
            issues.append(f"JSON-LD block {i} does not parse: {e}")
            continue
        top = parsed if isinstance(parsed, list) else [parsed]
        for t in top:
            if isinstance(t, dict) and "@context" not in t and "@graph" not in t:
                issues.append(f"JSON-LD block {i} top-level node missing @context")
        nodes.extend(flatten(parsed))

    if not blocks:
        issues.append("no JSON-LD on an indexable page")

    index: dict[str, dict] = {}
    def defines(n: dict) -> bool:
        """True when the node declares an entity rather than referencing one.

        A block carrying only @id (optionally with @context/@type) is a
        pointer to an entity declared elsewhere on the page, which is the
        correct way to mention a shared entity — never a duplicate.
        """
        keys = {k for k in n.keys() if k not in ("@context", "@type")}
        return keys - {"@id"} != set()

    for n in nodes:
        nid = n.get("@id")
        if isinstance(nid, str) and defines(n):
            index.setdefault(nid, n)

    seen_ids: dict[str, int] = {}
    for n in nodes:
        check_node(n, issues, index)
        nid = n.get("@id")
        # Bare {"@id": ...} references are legal and expected; only count
        # nodes that actually define content under that identifier.
        if isinstance(nid, str) and defines(n):
            seen_ids[nid] = seen_ids.get(nid, 0) + 1
    for nid, count in seen_ids.items():
        if count > 1:
            issues.append(f"duplicate @id {nid} ({count} nodes)")

    types = sorted({t for n in nodes for t in types_of(n)})
    return {"url": url, "issues": issues, "types": types, "blocks": len(blocks)}


def main() -> int:
    args = [a for a in sys.argv[1:]]
    base = "http://localhost:8080"
    limit = 0
    out_path = None
    i = 0
    while i < len(args):
        a = args[i]
        if a == "--limit":
            i += 1
            limit = int(args[i])
        elif a == "--json":
            i += 1
            out_path = args[i]
        elif not a.startswith("--"):
            base = a.rstrip("/")
        i += 1

    sitemap = fetch(f"{base}/sitemap.xml")
    urls = [u for u in LOC_RE.findall(sitemap) if not u.rstrip("/").endswith("sitemap.xml")]
    # Nested sitemap index support.
    nested = [u for u in urls if u.endswith(".xml")]
    urls = [u for u in urls if not u.endswith(".xml")]
    for n in nested:
        try:
            urls.extend(LOC_RE.findall(fetch(n)))
        except Exception as e:  # noqa: BLE001
            print(f"warn: nested sitemap {n} failed: {e}")

    # Normalise onto the base host so the sweep hits the server under test.
    norm: list[str] = []
    for u in urls:
        path = re.sub(r"^https?://[^/]+", "", u) or "/"
        full = base + path
        if full not in norm:
            norm.append(full)
    if limit:
        norm = norm[:limit]

    print(f"Sweeping {len(norm)} indexable URLs on {base} …")
    with ThreadPoolExecutor(max_workers=8) as pool:
        results = list(pool.map(audit, norm))

    failed = [r for r in results if r["issues"]]
    counts: dict[str, int] = {}
    for r in failed:
        for issue in r["issues"]:
            key = re.sub(r"\(.*?\)", "(…)", issue)
            key = re.sub(r"\[\d+\]", "[i]", key)
            counts[key] = counts.get(key, 0) + 1

    if out_path:
        with open(out_path, "w", encoding="utf-8") as f:
            json.dump(results, f, indent=2)

    print(f"\n{len(results) - len(failed)}/{len(results)} pages clean.")
    if failed:
        print("\nIssue summary (count × issue):")
        for key, count in sorted(counts.items(), key=lambda kv: -kv[1]):
            print(f"  {count:4d} × {key}")
        print("\nFirst 25 failing pages:")
        for r in failed[:25]:
            print(f"  {r['url']}")
            for issue in r["issues"][:5]:
                print(f"      - {issue}")
        return 1

    print("All indexable pages ship valid structured data.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
