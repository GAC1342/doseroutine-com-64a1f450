#!/usr/bin/env python3
"""Per-slug JSON-LD failure report for /library/* pages.

Fetches every /library/:slug URL from the sitemap, extracts every
<script type="application/ld+json"> block, validates the FAQPage
schema, and emits:

  - <out>.json  — machine-readable: per-slug status, errors, and the
                  raw extracted JSON-LD blocks (parsed when possible,
                  raw text when not).
  - <out>.md    — human-readable triage summary sorted by failure count.

Only failing slugs are included in the report by default (pass
--include-ok to also include passing slugs).

Usage:
  python scripts/report-library-faq-jsonld.py \\
      --base https://doseroutine.com \\
      --out /mnt/documents/library-faq-jsonld-report \\
      --concurrency 16
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
normalize_faq_text = _faq_normalize.normalize_faq_text
find_duplicate_groups = _faq_normalize.find_duplicate_groups
type_matches_normalized = _faq_normalize.type_matches_normalized
context_matches_schema_org = _faq_normalize.context_matches_schema_org

SITEMAP_NS = {"sm": "http://www.sitemaps.org/schemas/sitemap/0.9"}
DEFAULT_BASE = "https://doseroutine.com"
UA = "DoseRoutine-FAQ-Report/1.0 (+https://doseroutine.com)"
LIBRARY_DETAIL_RE = re.compile(r"^/library/[^/]+/?$")
LIBRARY_EXCLUDE_RE = re.compile(r"^/library(/|/compare(/.*)?)?$")


# ---------------------------------------------------------------------------
# HTTP

def http_get(url: str, timeout: int = 30) -> tuple[int, str]:
    req = urllib.request.Request(url, headers={"User-Agent": UA, "Accept": "text/html,*/*"})
    with urllib.request.urlopen(req, timeout=timeout) as resp:
        return resp.status, resp.read().decode("utf-8", errors="replace")


# Sitemap caching is centralised in `scripts/_sitemap_fetch.py`
# (shared `_SHARED_CACHE`). All three walkers hit the same dict.


def _fetch_sitemap_bytes(url: str, timeout: int = 30) -> bytes:
    """Delegate to `_sitemap_fetch` for gzip handling AND caching. No
    local cache dict — the shared one is used by default."""
    return fetch_sitemap_bytes(url, user_agent=UA, timeout=timeout)



# ---------------------------------------------------------------------------
# JSON-LD extractor

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
class BlockDump:
    index: int
    raw: str
    parsed: Any = None
    parse_error: str | None = None


@dataclass
class Result:
    url: str
    slug: str
    status: int | None = None
    errors: list[str] = field(default_factory=list)
    blocks: list[BlockDump] = field(default_factory=list)
    faq_block_indexes: list[int] = field(default_factory=list)


def validate(url: str) -> Result:
    slug = urllib.parse.urlparse(url).path.rstrip("/").split("/")[-1]
    r = Result(url=url, slug=slug)
    try:
        status, body = http_get(url)
        r.status = status
    except Exception as exc:
        r.errors.append(f"fetch failed: {exc}")
        return r
    if status >= 400:
        r.errors.append(f"HTTP {status}")
        return r

    raw_blocks = extract_jsonld(body)
    faq_nodes: list[tuple[int, dict[str, Any]]] = []
    for i, raw in enumerate(raw_blocks):
        dump = BlockDump(index=i, raw=raw)
        if not raw:
            dump.parse_error = "empty <script> block"
            r.blocks.append(dump)
            continue
        try:
            data = json.loads(raw)
            dump.parsed = data
        except json.JSONDecodeError as exc:
            dump.parse_error = f"{exc.msg} at line {exc.lineno} col {exc.colno}"
            r.errors.append(f"JSON-LD[{i}] parse error: {dump.parse_error}")
            r.blocks.append(dump)
            continue
        r.blocks.append(dump)
        for node in _flatten(data):
            if type_matches_normalized(node.get("@type"), "FAQPage"):
                faq_nodes.append((i, node))

    if not faq_nodes:
        r.errors.append("missing JSON-LD block with @type=FAQPage")
        return r
    r.faq_block_indexes = [i for i, _ in faq_nodes]
    if len(faq_nodes) > 1:
        r.errors.append(f"expected exactly one FAQPage block, found {len(faq_nodes)}")

    for k, (bi, faq) in enumerate(faq_nodes):
        prefix = f"FAQPage[block={bi}]"

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
            name = q.get("name")
            if not is_nonempty_str(name):
                r.errors.append(f"{qp}: name must be a non-empty string")
            elif not is_trimmed(name):
                r.errors.append(f"{qp}: name has leading/trailing whitespace")
            ans = q.get("acceptedAnswer")
            if not isinstance(ans, dict):
                r.errors.append(f"{qp}: acceptedAnswer must be an object")
                continue
            at = ans.get("@type")
            if not type_matches_normalized(at, "Answer"):
                r.errors.append(f"{qp}.acceptedAnswer: @type must be 'Answer' (got {at!r})")
            text = ans.get("text")
            if not is_nonempty_str(text):
                r.errors.append(f"{qp}.acceptedAnswer: text must be a non-empty string")
            elif not is_trimmed(text):
                r.errors.append(f"{qp}.acceptedAnswer: text has leading/trailing whitespace")

        # Duplicate detection via shared helper — matches JS/TS validators.
        question_entries = [(j, q) for j, q in enumerate(entities) if isinstance(q, dict)]
        name_dupes = find_duplicate_groups(
            question_entries, lambda pair, _i: pair[1].get("name")
        )
        for g in name_dupes:
            orig_idxs = [question_entries[i][0] for i in g.indices]
            r.errors.append(
                f"{prefix}.mainEntity: duplicate question name at indices {orig_idxs} "
                f"(normalized={g.key!r})"
            )
        answer_dupes = find_duplicate_groups(
            question_entries,
            lambda pair, _i: (pair[1].get("acceptedAnswer") or {}).get("text")
                if isinstance(pair[1].get("acceptedAnswer"), dict) else None,
        )
        for g in answer_dupes:
            # Skip groups where every key is empty (already reported as empty-text).
            if not g.key:
                continue
            orig_idxs = [question_entries[i][0] for i in g.indices]
            r.errors.append(
                f"{prefix}.mainEntity: duplicate acceptedAnswer.text at indices {orig_idxs} "
                f"(normalized={g.key[:80]!r})"
            )

    return r


# ---------------------------------------------------------------------------
# Sitemap discovery (walks indexes + .xml.gz children)

def _collect_library_urls(
    sitemap_url: str, out: list[str], visited: set[str], depth: int = 0
) -> None:
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
    out: list[str] = []
    _collect_library_urls(base.rstrip("/") + "/sitemap.xml", out, visited=set())
    return sorted(set(out))


# ---------------------------------------------------------------------------
# Report writers

def _result_to_dict(r: Result) -> dict[str, Any]:
    return {
        "slug": r.slug,
        "url": r.url,
        "status": r.status,
        "ok": not r.errors,
        "error_count": len(r.errors),
        "errors": r.errors,
        "faq_block_indexes": r.faq_block_indexes,
        "extracted_jsonld_blocks": [
            {
                "index": b.index,
                "parse_error": b.parse_error,
                "parsed": b.parsed,
                # Include raw only when parsing failed — otherwise `parsed`
                # is authoritative and raw doubles the file size.
                "raw": b.raw if b.parse_error else None,
            }
            for b in r.blocks
        ],
    }


def write_json_report(path: str, results: list[Result], meta: dict[str, Any]) -> None:
    payload = {
        "meta": meta,
        "results": [_result_to_dict(r) for r in results],
    }
    os.makedirs(os.path.dirname(path) or ".", exist_ok=True)
    with open(path, "w", encoding="utf-8") as f:
        json.dump(payload, f, indent=2, ensure_ascii=False, default=str)


def write_markdown_report(path: str, results: list[Result], meta: dict[str, Any]) -> None:
    failing = [r for r in results if r.errors]
    passing = [r for r in results if not r.errors]
    failing.sort(key=lambda r: (-len(r.errors), r.slug))

    lines: list[str] = []
    lines.append("# Library FAQ JSON-LD Failure Report")
    lines.append("")
    lines.append(f"- Base URL: `{meta['base']}`")
    lines.append(f"- Generated: {meta['generated_at']}")
    lines.append(f"- Total pages checked: **{len(results)}**")
    lines.append(f"- Failing: **{len(failing)}**")
    lines.append(f"- Passing: **{len(passing)}**")
    lines.append("")

    if not failing:
        lines.append("All library pages passed FAQPage JSON-LD validation.")
    else:
        lines.append("## Failures (sorted by error count)")
        lines.append("")
        lines.append("| Slug | Errors | URL |")
        lines.append("|------|-------:|-----|")
        for r in failing:
            lines.append(f"| `{r.slug}` | {len(r.errors)} | {r.url} |")
        lines.append("")

        lines.append("## Per-slug detail")
        lines.append("")
        for r in failing:
            lines.append(f"### `{r.slug}` — {len(r.errors)} error(s)")
            lines.append("")
            lines.append(f"- URL: {r.url}")
            lines.append(f"- HTTP status: {r.status}")
            lines.append(f"- JSON-LD blocks found: {len(r.blocks)}")
            if r.faq_block_indexes:
                lines.append(f"- FAQPage block index(es): {r.faq_block_indexes}")
            lines.append("")
            lines.append("**Errors**")
            lines.append("")
            for e in r.errors:
                lines.append(f"- {e}")
            lines.append("")
            for b in r.blocks:
                title = f"Block [{b.index}]"
                if b.parse_error:
                    title += f" — parse error: {b.parse_error}"
                lines.append(f"<details><summary>{title}</summary>")
                lines.append("")
                lines.append("```json")
                if b.parsed is not None:
                    lines.append(json.dumps(b.parsed, indent=2, ensure_ascii=False))
                else:
                    lines.append(b.raw or "(empty)")
                lines.append("```")
                lines.append("")
                lines.append("</details>")
                lines.append("")

    os.makedirs(os.path.dirname(path) or ".", exist_ok=True)
    with open(path, "w", encoding="utf-8") as f:
        f.write("\n".join(lines))


# ---------------------------------------------------------------------------
# CLI

def main(argv: list[str]) -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--base", default=DEFAULT_BASE)
    ap.add_argument("--out", default="/mnt/documents/library-faq-jsonld-report",
                    help="Output base path (without extension). Writes <out>.json and <out>.md")
    ap.add_argument("--concurrency", type=int, default=12)
    ap.add_argument("--include", metavar="REGEX", default=None)
    ap.add_argument("--exclude", metavar="REGEX", default=None)
    ap.add_argument("--limit", type=int, default=0, help="Cap URLs (0 = all)")
    ap.add_argument("--include-ok", action="store_true",
                    help="Include passing slugs in the JSON report (Markdown always lists only failures)")
    args = ap.parse_args(argv)

    base = args.base.rstrip("/")
    include = re.compile(args.include) if args.include else None
    exclude = re.compile(args.exclude) if args.exclude else None

    try:
        urls = library_urls_from_sitemap(base)
    except Exception as exc:
        print(f"fatal: could not load sitemap: {exc}", file=sys.stderr)
        return 2

    if include:
        urls = [u for u in urls if include.search(u)]
    if exclude:
        urls = [u for u in urls if not exclude.search(u)]
    if args.limit > 0:
        urls = urls[: args.limit]
    if not urls:
        print("fatal: no library URLs to check", file=sys.stderr)
        return 2

    print(f"checking {len(urls)} library page(s) from {base}/sitemap.xml "
          f"(concurrency={args.concurrency})")

    results: list[Result] = []
    with cf.ThreadPoolExecutor(max_workers=max(1, args.concurrency)) as pool:
        for i, res in enumerate(pool.map(validate, urls), 1):
            results.append(res)
            marker = "FAIL" if res.errors else "OK  "
            print(f"[{i:>4}/{len(urls)}] {marker} {res.slug}")

    failing = [r for r in results if r.errors]

    from datetime import datetime, timezone
    meta = {
        "base": base,
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "total": len(results),
        "failing": len(failing),
        "passing": len(results) - len(failing),
    }

    json_report_results = results if args.include_ok else failing
    json_path = args.out + ".json"
    md_path = args.out + ".md"
    write_json_report(json_path, json_report_results, meta)
    write_markdown_report(md_path, results, meta)

    print(f"\nSummary: {meta['passing']} ok / {meta['failing']} fail (of {meta['total']})")
    print(f"  wrote {json_path}")
    print(f"  wrote {md_path}")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
