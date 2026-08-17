#!/usr/bin/env python3
"""
validate-library-faq.py — CI-only, library-focused FAQPage JSON-LD guard.

Complements scripts/validate-schema-sitemap.py with a stricter, dedicated
sweep of EVERY /library/* URL in the live sitemap. The generic validator
covers many schema types across the site; this script exists to fail the
build the moment a library page ships FAQPage structured data that
Google's Rich Results test would reject, and to emit a JUnit report so
per-URL failures show up in the GitHub Actions test summary.

Rules enforced per library page (mirrors Google's FAQPage requirements):
  * exactly one JSON-LD block with @type=FAQPage
  * @context is https://schema.org (case-insensitive, http/https)
  * mainEntity is an array with >=1 entry
  * every mainEntity entry:
      - @type == "Question"
      - name is a non-empty, non-whitespace string
      - acceptedAnswer is an object
      - acceptedAnswer.@type == "Answer"
      - acceptedAnswer.text is a non-empty, non-whitespace string

Usage:
    python3 scripts/validate-library-faq.py [BASE_URL] [--junit PATH]
                                            [--concurrency N]
                                            [--include REGEX] [--exclude REGEX]

Exits non-zero if any library page fails any rule.
"""
from __future__ import annotations

import argparse
import concurrent.futures as cf
import json
import os
import re
import sys
import urllib.parse
import urllib.request
import xml.etree.ElementTree as ET
from dataclasses import dataclass, field
from html.parser import HTMLParser
from pathlib import Path
from typing import Any

# Shared robust gzip-aware sitemap fetcher (see scripts/_sitemap_fetch.py).
# Loaded by path because `scripts/` uses hyphenated filenames.
import importlib.util as _importlib_util
_spec = _importlib_util.spec_from_file_location(
    "_sitemap_fetch", Path(__file__).with_name("_sitemap_fetch.py")
)
_sitemap_fetch = _importlib_util.module_from_spec(_spec)  # type: ignore[arg-type]
assert _spec and _spec.loader
_spec.loader.exec_module(_sitemap_fetch)  # type: ignore[union-attr]
fetch_sitemap_bytes = _sitemap_fetch.fetch_sitemap_bytes
clear_sitemap_cache = _sitemap_fetch.clear_shared_cache

# Shared FAQ normalization helpers (mirrors src/lib/faq-normalize.ts).
import sys as _sys
_faq_spec = _importlib_util.spec_from_file_location(
    "_faq_normalize", Path(__file__).with_name("_faq_normalize.py")
)
_faq_normalize = _importlib_util.module_from_spec(_faq_spec)  # type: ignore[arg-type]
assert _faq_spec and _faq_spec.loader
_sys.modules["_faq_normalize"] = _faq_normalize
_faq_spec.loader.exec_module(_faq_normalize)  # type: ignore[union-attr]
is_nonempty_str = _faq_normalize.is_nonempty_str
is_trimmed = _faq_normalize.is_trimmed
find_duplicate_groups = _faq_normalize.find_duplicate_groups
type_matches_normalized = _faq_normalize.type_matches_normalized
context_matches_schema_org = _faq_normalize.context_matches_schema_org

SITEMAP_NS = {"sm": "http://www.sitemaps.org/schemas/sitemap/0.9"}
DEFAULT_BASE = "https://doseroutine.com"
UA = "DoseRoutine-FAQ-Validator/1.0 (+https://doseroutine.com)"

# Library detail pages only. Excludes listing / index and compare pages
# (compare pages ARE checked for FAQPage in validate-schema-sitemap.py;
# this script keeps a tight, single-purpose scope so failures are easy
# to diagnose from the CI log).
LIBRARY_DETAIL_RE = re.compile(r"^/library/[^/]+/?$")
LIBRARY_EXCLUDE_RE = re.compile(r"^/library(/|/compare(/.*)?)?$")


# ---------------------------------------------------------------------------
# HTTP + parsing helpers

def http_get(url: str, timeout: int = 30) -> tuple[int, str]:
    req = urllib.request.Request(url, headers={"User-Agent": UA, "Accept": "text/html,*/*"})
    with urllib.request.urlopen(req, timeout=timeout) as resp:
        return resp.status, resp.read().decode("utf-8", errors="replace")


class _JsonLdExtractor(HTMLParser):
    def __init__(self) -> None:
        super().__init__(convert_charrefs=True)
        self.blocks: list[str] = []
        self._in = False
        self._buf: list[str] = []

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        if tag.lower() != "script":
            return
        attr = {k.lower(): (v or "") for k, v in attrs}
        if attr.get("type", "").lower() == "application/ld+json":
            self._in = True
            self._buf = []

    def handle_endtag(self, tag: str) -> None:
        if tag.lower() == "script" and self._in:
            self.blocks.append("".join(self._buf).strip())
            self._in = False
            self._buf = []

    def handle_data(self, data: str) -> None:
        if self._in:
            self._buf.append(data)


def extract_jsonld(html: str) -> list[str]:
    p = _JsonLdExtractor()
    p.feed(html)
    return p.blocks


def _flatten(node: Any) -> list[dict[str, Any]]:
    """Return all dict nodes reachable via @graph / arrays."""
    out: list[dict[str, Any]] = []
    if isinstance(node, list):
        for n in node:
            out.extend(_flatten(n))
    elif isinstance(node, dict):
        if "@graph" in node and isinstance(node["@graph"], list):
            for n in node["@graph"]:
                out.extend(_flatten(n))
        else:
            out.append(node)
    return out


def _is_nonempty_str(v: Any) -> bool:
    return is_nonempty_str(v)


# ---------------------------------------------------------------------------
# Validation

@dataclass
class Result:
    url: str
    errors: list[str] = field(default_factory=list)


def validate_faq(url: str) -> Result:
    r = Result(url=url)
    try:
        status, body = http_get(url)
    except Exception as exc:
        r.errors.append(f"fetch failed: {exc}")
        return r
    if status >= 400:
        r.errors.append(f"HTTP {status}")
        return r

    faq_nodes: list[dict[str, Any]] = []
    for raw in extract_jsonld(body):
        if not raw:
            continue
        try:
            data = json.loads(raw)
        except json.JSONDecodeError as exc:
            r.errors.append(f"JSON-LD parse error: {exc.msg} at line {exc.lineno} col {exc.colno}")
            continue
        for node in _flatten(data):
            if type_matches_normalized(node.get("@type"), "FAQPage"):
                faq_nodes.append(node)

    if not faq_nodes:
        r.errors.append("missing JSON-LD block with @type=FAQPage")
        return r
    if len(faq_nodes) > 1:
        r.errors.append(f"expected exactly one FAQPage block, found {len(faq_nodes)}")

    for i, faq in enumerate(faq_nodes):
        prefix = f"FAQPage[{i}]"
        ctx = faq.get("@context")
        if not context_matches_schema_org(ctx):
            r.errors.append(f"{prefix}: @context must reference schema.org (got {ctx!r})")

        entities = faq.get("mainEntity")
        if isinstance(entities, dict):
            entities = [entities]
        if not isinstance(entities, list) or len(entities) == 0:
            r.errors.append(f"{prefix}: mainEntity must be a non-empty array")
            continue

        for j, q in enumerate(entities):
            qp = f"{prefix}.mainEntity[{j}]"
            if not isinstance(q, dict):
                r.errors.append(f"{qp}: entry is not an object")
                continue
            qt = q.get("@type")
            if not type_matches_normalized(qt, "Question"):
                r.errors.append(f"{qp}: @type must be 'Question' (got {qt!r})")
            if not _is_nonempty_str(q.get("name")):
                r.errors.append(f"{qp}: name must be a non-empty string")
            ans = q.get("acceptedAnswer")
            if not isinstance(ans, dict):
                r.errors.append(f"{qp}: acceptedAnswer must be an object")
                continue
            at = ans.get("@type")
            if not type_matches_normalized(at, "Answer"):
                r.errors.append(f"{qp}.acceptedAnswer: @type must be 'Answer' (got {at!r})")
            if not is_nonempty_str(ans.get("text")):
                r.errors.append(f"{qp}.acceptedAnswer: text must be a non-empty string")

        # Duplicate detection via shared helper — matches JS/TS + report.
        question_entries = [(j, q) for j, q in enumerate(entities) if isinstance(q, dict)]
        for g in find_duplicate_groups(
            question_entries, lambda pair, _i: pair[1].get("name")
        ):
            if not g.key:
                continue
            orig_idxs = [question_entries[i][0] for i in g.indices]
            r.errors.append(
                f"{prefix}.mainEntity: duplicate question name at indices {orig_idxs} "
                f"(normalized={g.key!r})"
            )
        for g in find_duplicate_groups(
            question_entries,
            lambda pair, _i: (pair[1].get("acceptedAnswer") or {}).get("text")
                if isinstance(pair[1].get("acceptedAnswer"), dict) else None,
        ):
            if not g.key:
                continue
            orig_idxs = [question_entries[i][0] for i in g.indices]
            r.errors.append(
                f"{prefix}.mainEntity: duplicate acceptedAnswer.text at indices {orig_idxs} "
                f"(normalized={g.key[:80]!r})"
            )

    return r


# ---------------------------------------------------------------------------
# Sitemap discovery

# Process-lifetime cache of sitemap bytes by URL (see validate-og-twitter.py).
# Sitemap fetching + caching is centralised in `scripts/_sitemap_fetch.py`
# (shared `_SHARED_CACHE`). Every walker in the repo uses the same dict.


def _fetch_sitemap_bytes(url: str, timeout: int = 30) -> bytes:
    """Fetch sitemap bytes with transparent gzip decompression. Both
    the gzip detection heuristics and the process-lifetime cache live
    in `_sitemap_fetch`; no local dict is needed here."""
    return fetch_sitemap_bytes(url, user_agent=UA, timeout=timeout)



def _collect_library_urls(
    sitemap_url: str,
    out: list[str],
    visited: set[str],
    depth: int = 0,
) -> None:
    """Recursively walk sitemap indexes (including .xml.gz children) and
    collect library detail URLs."""
    if sitemap_url in visited or depth > 5:
        return
    visited.add(sitemap_url)
    try:
        body = _fetch_sitemap_bytes(sitemap_url)
    except Exception as exc:
        print(f"warn: could not fetch {sitemap_url}: {exc}", file=sys.stderr)
        return
    try:
        root = ET.fromstring(body)
    except ET.ParseError as exc:
        print(f"warn: {sitemap_url} is not valid XML: {exc}", file=sys.stderr)
        return
    tag = root.tag.split("}", 1)[-1]
    if tag == "sitemapindex":
        children = [
            (loc.text or "").strip()
            for loc in root.findall(".//sm:sitemap/sm:loc", SITEMAP_NS)
        ]
        if not children:
            children = [
                (loc.text or "").strip()
                for loc in root.iter()
                if loc.tag.split("}", 1)[-1] == "loc"
            ]
        for child in children:
            if child:
                _collect_library_urls(child, out, visited, depth + 1)
        return
    for loc in root.findall(".//sm:url/sm:loc", SITEMAP_NS):
        u = (loc.text or "").strip()
        if not u:
            continue
        path = urllib.parse.urlparse(u).path or "/"
        if LIBRARY_EXCLUDE_RE.match(path):
            continue
        if LIBRARY_DETAIL_RE.match(path):
            out.append(u)


def library_urls_from_sitemap(base: str) -> list[str]:
    sitemap = base.rstrip("/") + "/sitemap.xml"
    out: list[str] = []
    _collect_library_urls(sitemap, out, visited=set())
    return sorted(set(out))



# ---------------------------------------------------------------------------
# JUnit output

def write_junit(path: str, results: list[Result]) -> None:
    from xml.sax.saxutils import escape as xe
    failures = sum(1 for r in results if r.errors)
    lines = [
        '<?xml version="1.0" encoding="UTF-8"?>',
        f'<testsuite name="validate-library-faq" tests="{len(results)}" failures="{failures}">',
    ]
    for r in results:
        lines.append(f'  <testcase classname="library-faq" name="{xe(r.url)}">')
        if r.errors:
            msg = xe("; ".join(r.errors))
            body = xe("\n".join(r.errors))
            lines.append(f'    <failure message="{msg}">{body}</failure>')
        lines.append("  </testcase>")
    lines.append("</testsuite>")
    os.makedirs(os.path.dirname(path) or ".", exist_ok=True)
    with open(path, "w", encoding="utf-8") as f:
        f.write("\n".join(lines))


# ---------------------------------------------------------------------------
# CLI

def main(argv: list[str]) -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("base", nargs="?", default=DEFAULT_BASE, help="Base URL")
    ap.add_argument("--concurrency", type=int, default=8)
    ap.add_argument("--include", metavar="REGEX", default=None)
    ap.add_argument("--exclude", metavar="REGEX", default=None)
    ap.add_argument("--junit", metavar="PATH", default=None)
    args = ap.parse_args(argv)

    base = args.base.rstrip("/")
    include = re.compile(args.include) if args.include else None
    exclude = re.compile(args.exclude) if args.exclude else None

    try:
        urls = library_urls_from_sitemap(base)
    except Exception as exc:
        print(f"fatal: could not load sitemap from {base}: {exc}", file=sys.stderr)
        return 2

    if include:
        urls = [u for u in urls if include.search(u)]
    if exclude:
        urls = [u for u in urls if not exclude.search(u)]

    if not urls:
        print(f"fatal: no /library/* detail URLs discovered in {base}/sitemap.xml", file=sys.stderr)
        return 2

    print(f"validate-library-faq: {len(urls)} library page(s) from {base}/sitemap.xml")
    print(f"  concurrency: {args.concurrency}")

    results: list[Result] = []
    with cf.ThreadPoolExecutor(max_workers=max(1, args.concurrency)) as pool:
        for res in pool.map(validate_faq, urls):
            results.append(res)

    fail = 0
    for res in results:
        if res.errors:
            fail += 1
            print(f"\nFAIL {res.url}")
            for e in res.errors:
                print(f"  ERROR   {e}")
        else:
            print(f"OK   {res.url}")

    total = len(results)
    print(f"\nSummary: {total - fail} ok / {fail} fail (of {total})")

    if args.junit:
        write_junit(args.junit, results)
        print(f"  wrote JUnit report: {args.junit}")

    return 1 if fail else 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
