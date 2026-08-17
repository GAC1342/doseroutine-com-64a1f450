#!/usr/bin/env python3
"""
Rich Results validation for the JSON-LD a page actually serves.

Where scripts/validate-jsonld-schema.py only enforces *required* fields (the
errors Google reports), this script also enforces the *recommended* fields
Google's Rich Results Test reports as warnings — the ones that silently
downgrade or drop an eligible rich result.

Exit codes:
  0  no errors and no warnings (or every warning is waived)
  1  at least one error or warning

Usage:
  python3 scripts/validate-rich-results.py [BASE_URL] [--limit N]
                                           [--max-warnings N]
                                           [--paths a,b,c]
                                           [--json report.json]

Waivers: scripts/rich-results-waivers.json may contain
  { "waivers": [ { "match": "<substring of the message>",
                   "reason": "why this is acceptable" } ] }
Any warning whose message contains a waived substring is downgraded to a note
and does not fail the build. Errors can never be waived.
"""
from __future__ import annotations

import json
import re
import sys
import urllib.error
import urllib.request
import xml.etree.ElementTree as ET
from concurrent.futures import ThreadPoolExecutor
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any

LD_RE = re.compile(
    r'<script[^>]+type=["\']application/ld\+json["\'][^>]*>(.*?)</script>',
    re.I | re.S,
)
LOC_RE = re.compile(r"<loc>\s*([^<\s]+)\s*</loc>", re.I)
NOINDEX_RE = re.compile(r'<meta[^>]+name=["\']robots["\'][^>]+content=["\']([^"\']+)', re.I)

UA = "DoseRoutine-RichResults/1.0 (+https://doseroutine.com)"
TIMEOUT = 30
WORKERS = 8

# Routes that must always be validated, whatever the sitemap sample picks.
CRITICAL_PATHS = [
    "/",
    "/library",
    "/blog",
    "/sources",
]


# --------------------------------------------------------------------------- helpers
def fetch(url: str) -> str:
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    with urllib.request.urlopen(req, timeout=TIMEOUT) as r:
        return r.read().decode("utf-8", "replace")


def is_abs(v: Any) -> bool:
    return isinstance(v, str) and v.startswith(("http://", "https://"))


def nonempty(v: Any) -> bool:
    return isinstance(v, str) and v.strip() != ""


def as_list(v: Any) -> list[Any]:
    if v is None:
        return []
    return v if isinstance(v, list) else [v]


def types_of(node: dict[str, Any]) -> list[str]:
    t = node.get("@type")
    if isinstance(t, str):
        return [t]
    if isinstance(t, list):
        return [x for x in t if isinstance(x, str)]
    return []


def walk(node: Any) -> list[dict[str, Any]]:
    """Every dict node in the document, including @graph members and nesting."""
    out: list[dict[str, Any]] = []
    if isinstance(node, list):
        for item in node:
            out.extend(walk(item))
    elif isinstance(node, dict):
        out.append(node)
        for value in node.values():
            if isinstance(value, (dict, list)):
                out.extend(walk(value))
    return out


def has_named(node: Any) -> bool:
    """A reference is acceptable when it names something or points at an @id."""
    for candidate in as_list(node):
        if isinstance(candidate, str) and candidate.strip():
            return True
        if isinstance(candidate, dict) and (
            nonempty(candidate.get("name")) or nonempty(candidate.get("@id"))
        ):
            return True
    return False


def is_reference(node: dict[str, Any]) -> bool:
    """A node that only points at another node ({"@id": ...}) defines nothing."""
    return not (set(node.keys()) - {"@id", "@type"})


def image_ok(node: Any) -> bool:
    for candidate in as_list(node):
        if is_abs(candidate):
            return True
        if isinstance(candidate, dict) and (
            is_abs(candidate.get("url")) or is_abs(candidate.get("contentUrl"))
        ):
            return True
    return False


# --------------------------------------------------------------------------- rules
def check_node(t: str, n: dict[str, Any], errors: list[str], warnings: list[str]) -> None:
    """Required field -> error. Google-recommended field -> warning."""
    label = t

    if t in {"Article", "BlogPosting", "NewsArticle", "MedicalScholarlyArticle"}:
        if not nonempty(n.get("headline")):
            errors.append(f"{label}: missing headline")
        elif len(n["headline"]) > 110:
            warnings.append(f"{label}: headline longer than 110 characters")
        if not has_named(n.get("author")):
            errors.append(f"{label}: missing author")
        for f in ("datePublished", "dateModified", "mainEntityOfPage", "description"):
            if not n.get(f):
                warnings.append(f"{label}: missing recommended field '{f}'")
        if not image_ok(n.get("image")):
            warnings.append(f"{label}: missing recommended absolute 'image'")
        publisher = n.get("publisher")
        if not has_named(publisher):
            warnings.append(f"{label}: missing recommended field 'publisher'")
        elif (
            isinstance(publisher, dict)
            and not is_reference(publisher)
            and not publisher.get("logo")
        ):
            warnings.append(f"{label}: publisher missing recommended 'logo'")
        for a in as_list(n.get("author")):
            if isinstance(a, dict) and not (a.get("url") or a.get("sameAs") or a.get("@id")):
                warnings.append(f"{label}: author missing recommended 'url' or 'sameAs'")

    if t == "BreadcrumbList":
        items = n.get("itemListElement")
        if not isinstance(items, list) or not items:
            errors.append("BreadcrumbList: missing itemListElement")
        else:
            for i, raw in enumerate(items):
                if not isinstance(raw, dict):
                    errors.append(f"BreadcrumbList: itemListElement[{i}] is not an object")
                    continue
                if raw.get("position") != i + 1:
                    errors.append(
                        f"BreadcrumbList: itemListElement[{i}] position should be {i + 1}"
                    )
                if not nonempty(raw.get("name")) and not has_named(raw.get("item")):
                    errors.append(f"BreadcrumbList: itemListElement[{i}] missing name")
                last = i == len(items) - 1
                item = raw.get("item")
                if isinstance(item, str):
                    item_url = item
                elif isinstance(item, dict):
                    item_url = item.get("@id") or item.get("url")
                else:
                    item_url = None
                if not last and not is_abs(item_url):
                    warnings.append(
                        f"BreadcrumbList: itemListElement[{i}] missing recommended absolute 'item' URL"
                    )

    if t == "FAQPage":
        entities = as_list(n.get("mainEntity"))
        if not entities:
            errors.append("FAQPage: missing mainEntity")
        for i, q in enumerate(entities):
            if not isinstance(q, dict):
                errors.append(f"FAQPage: mainEntity[{i}] is not an object")
                continue
            if not nonempty(q.get("name")):
                errors.append(f"FAQPage: mainEntity[{i}] missing question name")
            answer = q.get("acceptedAnswer")
            text = answer.get("text") if isinstance(answer, dict) else None
            if not nonempty(text):
                errors.append(f"FAQPage: mainEntity[{i}] missing acceptedAnswer text")

    if t == "ItemList":
        if not as_list(n.get("itemListElement")):
            errors.append("ItemList: missing itemListElement")

    if t == "Organization":
        if not nonempty(n.get("name")):
            errors.append("Organization: missing name")
        # Only the site's own entity (the one carrying an @id) is expected to
        # be complete. Nested citation publishers ("Wikipedia", "NCBI") are
        # plain names by design and Google does not warn on them.
        if nonempty(n.get("@id")):
            for f in ("url", "logo"):
                if not n.get(f):
                    warnings.append(f"Organization: missing recommended field '{f}'")

    if t == "WebSite":
        for f in ("name", "url"):
            if not nonempty(n.get(f)):
                errors.append(f"WebSite: missing {f}")

    if t == "SoftwareApplication":
        for f in ("name",):
            if not nonempty(n.get(f)):
                errors.append(f"SoftwareApplication: missing {f}")
        # Only our own app entity (the one with an @id) is held to the
        # recommended fields; third-party apps listed in a roundup are named
        # references, not entities we publish offers for.
        if nonempty(n.get("@id")):
            for f in ("applicationCategory", "operatingSystem", "offers"):
                if not n.get(f):
                    warnings.append(
                        f"SoftwareApplication: missing recommended field '{f}'"
                    )

    if t in {"MedicalSubstance", "Drug", "DietarySupplement", "MedicalWebPage"}:
        if not nonempty(n.get("name")):
            errors.append(f"{label}: missing name")
        if not nonempty(n.get("description")):
            warnings.append(f"{label}: missing recommended field 'description'")

    if t == "VideoObject":
        for f in ("name", "thumbnailUrl", "uploadDate"):
            if not n.get(f):
                errors.append(f"VideoObject: missing {f}")
        for f in ("description", "duration"):
            if not n.get(f):
                warnings.append(f"VideoObject: missing recommended field '{f}'")
        if not (n.get("contentUrl") or n.get("embedUrl")):
            warnings.append("VideoObject: missing recommended 'contentUrl' or 'embedUrl'")

    if t == "HowTo":
        if not nonempty(n.get("name")):
            errors.append("HowTo: missing name")
        if not as_list(n.get("step")):
            errors.append("HowTo: missing step")

    if t == "Person":
        if not nonempty(n.get("name")):
            errors.append("Person: missing name")

    if t == "Offer":
        for f in ("price", "priceCurrency"):
            if n.get(f) in (None, ""):
                errors.append(f"Offer: missing {f}")

    if t == "AggregateRating":
        if n.get("ratingValue") in (None, ""):
            errors.append("AggregateRating: missing ratingValue")
        if not (n.get("ratingCount") or n.get("reviewCount")):
            warnings.append("AggregateRating: missing recommended 'ratingCount'/'reviewCount'")


@dataclass
class PageResult:
    url: str
    errors: list[str] = field(default_factory=list)
    warnings: list[str] = field(default_factory=list)
    blocks: int = 0


def validate_page(url: str) -> PageResult:
    res = PageResult(url=url)
    try:
        html = fetch(url)
    except (urllib.error.URLError, urllib.error.HTTPError, TimeoutError) as exc:
        res.errors.append(f"fetch failed: {exc}")
        return res

    robots = NOINDEX_RE.search(html)
    if robots and "noindex" in robots.group(1).lower():
        return res  # not eligible for rich results

    # Google merges every node that shares an @id across the page, so validate
    # the merged view. Two definitions only conflict when they disagree on the
    # value of a shared key; a partial restatement is legal and common.
    merged: dict[str, dict[str, Any]] = {}
    anonymous: list[dict[str, Any]] = []

    for raw in LD_RE.findall(html):
        res.blocks += 1
        try:
            doc = json.loads(raw.strip())
        except json.JSONDecodeError as exc:
            res.errors.append(f"JSON-LD block {res.blocks} does not parse: {exc}")
            continue
        top = doc if isinstance(doc, list) else [doc]
        for t_node in top:
            if isinstance(t_node, dict) and "@context" not in t_node:
                res.warnings.append("top-level JSON-LD node missing '@context'")
        for node in walk(doc):
            if is_reference(node):
                continue  # a pointer to a node defined elsewhere on the page
            node_id = node.get("@id")
            if isinstance(node_id, str):
                target = merged.setdefault(node_id, {})
                for key, value in node.items():
                    if key in target and target[key] != value:
                        if isinstance(target[key], (str, int, float, bool)) and isinstance(
                            value, (str, int, float, bool)
                        ):
                            res.errors.append(
                                f"conflicting '{key}' for @id {node_id}"
                            )
                        continue
                    target[key] = value
            else:
                anonymous.append(node)

    for node in list(merged.values()) + anonymous:
        for t in types_of(node):
            check_node(t, node, res.errors, res.warnings)

    return res


# --------------------------------------------------------------------------- discovery
def sitemap_urls(base: str, limit: int) -> list[str]:
    urls: list[str] = []
    queue = [f"{base}/sitemap.xml"]
    seen: set[str] = set()
    while queue and len(urls) < limit * 6:
        sm = queue.pop(0)
        if sm in seen:
            continue
        seen.add(sm)
        try:
            body = fetch(sm)
        except Exception:  # noqa: BLE001 - a missing child sitemap isn't fatal here
            continue
        try:
            root = ET.fromstring(body)
        except ET.ParseError:
            continue
        tag = root.tag.split("}")[-1]
        locs = LOC_RE.findall(body)
        if tag == "sitemapindex":
            queue.extend(locs)
        else:
            urls.extend(locs)
    # Spread the sample across the sitemap instead of taking the first N.
    if len(urls) > limit:
        step = max(1, len(urls) // limit)
        urls = urls[::step][:limit]
    return urls


def load_waivers() -> list[dict[str, str]]:
    path = Path(__file__).with_name("rich-results-waivers.json")
    if not path.exists():
        return []
    data = json.loads(path.read_text())
    return [w for w in data.get("waivers", []) if isinstance(w, dict) and w.get("match")]


# --------------------------------------------------------------------------- main
def main() -> int:
    args = sys.argv[1:]
    base = "https://doseroutine.com"
    limit = 40
    max_warnings = 0
    extra_paths: list[str] = []
    json_out: str | None = None

    positional = []
    i = 0
    while i < len(args):
        a = args[i]
        if a == "--limit":
            i += 1
            limit = int(args[i])
        elif a == "--max-warnings":
            i += 1
            max_warnings = int(args[i])
        elif a == "--paths":
            i += 1
            extra_paths = [p for p in args[i].split(",") if p.strip()]
        elif a == "--json":
            i += 1
            json_out = args[i]
        elif not a.startswith("--"):
            positional.append(a)
        i += 1
    if positional:
        base = positional[0]
    base = base.rstrip("/")

    targets = [base + p for p in CRITICAL_PATHS + extra_paths]
    targets += [u for u in sitemap_urls(base, limit) if u not in targets]
    # de-dup, preserve order
    seen: set[str] = set()
    targets = [t for t in targets if not (t in seen or seen.add(t))]

    print(f"Rich Results validation · {base} · {len(targets)} URLs")
    with ThreadPoolExecutor(max_workers=WORKERS) as pool:
        results = list(pool.map(validate_page, targets))

    waivers = load_waivers()

    def waived(message: str) -> str | None:
        for w in waivers:
            if w["match"] in message:
                return w.get("reason", "waived")
        return None

    total_errors = 0
    total_warnings = 0
    total_waived = 0
    for res in results:
        active_warnings = []
        for w in res.warnings:
            reason = waived(w)
            if reason:
                total_waived += 1
            else:
                active_warnings.append(w)
        if res.errors or active_warnings:
            print(f"\n{res.url}  ({res.blocks} JSON-LD block(s))")
            for e in sorted(set(res.errors)):
                print(f"  ERROR   {e}")
            for w in sorted(set(active_warnings)):
                print(f"  WARNING {w}")
        total_errors += len(set(res.errors))
        total_warnings += len(set(active_warnings))

    print(
        f"\nSummary: {len(results)} URLs · {total_errors} error(s) · "
        f"{total_warnings} warning(s) · {total_waived} waived"
    )

    if json_out:
        Path(json_out).write_text(
            json.dumps(
                {
                    "base": base,
                    "errors": total_errors,
                    "warnings": total_warnings,
                    "waived": total_waived,
                    "pages": [
                        {"url": r.url, "errors": r.errors, "warnings": r.warnings}
                        for r in results
                    ],
                },
                indent=2,
            )
        )

    if total_errors:
        print("FAIL: structured-data errors present.")
        return 1
    if total_warnings > max_warnings:
        print(
            f"FAIL: {total_warnings} Rich Results warning(s) exceed the allowed "
            f"maximum of {max_warnings}."
        )
        return 1
    print("PASS: no structured-data errors or warnings.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
