#!/usr/bin/env python3
"""
Validate JSON-LD structured data across every sitemap URL.

For each URL listed in /sitemap.xml (recursively following sitemap indexes
and .xml.gz children) we:

  1. Fetch the rendered HTML.
  2. Extract every <script type="application/ld+json"> block.
  3. Parse each block as strict JSON. A parse error is a hard failure —
     malformed JSON-LD is invisible to Google's Rich Results parser and
     silently disables rich snippets.
  4. Walk each parsed graph (including @graph arrays and nested nodes) and
     enforce required fields for any @type we recognise. Unknown @types
     are ignored (schema.org has hundreds; we only fail on types we know
     Google requires fields for).

Pages that ship NO JSON-LD are allowed — this checks quality of what's
present, it doesn't mandate structured data everywhere. Extend
`REQUIRED_FIELDS` below when you start emitting a new @type.

Usage:
  python scripts/validate-jsonld-schema.py [BASE_URL]

Defaults to https://doseroutine.com. Exits non-zero if any URL has a
JSON-LD parse error or a missing required field.
"""
from __future__ import annotations

import concurrent.futures
import hashlib
import html
import importlib.util as _importlib_util
import json
import os
import re
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
import xml.etree.ElementTree as ET
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, Iterable


# --- shared robust gzip-aware sitemap fetch --------------------------------
_spec = _importlib_util.spec_from_file_location(
    "_sitemap_fetch", Path(__file__).with_name("_sitemap_fetch.py")
)
_sitemap_fetch = _importlib_util.module_from_spec(_spec)  # type: ignore[arg-type]
assert _spec and _spec.loader
_spec.loader.exec_module(_sitemap_fetch)  # type: ignore[union-attr]
fetch_sitemap_bytes = _sitemap_fetch.fetch_sitemap_bytes

# ---------------------------------------------------------------------------
BASE = (sys.argv[1] if len(sys.argv) > 1 else "https://doseroutine.com").rstrip("/")
UA = "DoseRoutine-JSONLDValidator/1.0 (+https://doseroutine.com)"
REQUEST_TIMEOUT = 25
MAX_WORKERS = 12
SITEMAP_NS = {"sm": "http://www.sitemaps.org/schemas/sitemap/0.9"}

# schema.org @type -> list of required fields. A field entry may be a plain
# key ("headline"), or a tuple of alternatives ("url" OR "contentUrl") — any
# one satisfying the requirement passes. Extend as new @types are emitted.
REQUIRED_FIELDS: dict[str, list[Any]] = {
    "Article":            ["headline", "author"],
    "NewsArticle":        ["headline", "author"],
    "BlogPosting":        ["headline", "author"],
    "MedicalScholarlyArticle": ["headline", "author"],
    "BreadcrumbList":     ["itemListElement"],
    "ItemList":           ["itemListElement"],
    "FAQPage":            ["mainEntity"],
    "Question":           ["name", "acceptedAnswer"],
    "Product":            ["name"],
    "Organization":       ["name"],
    "WebSite":            ["name", "url"],
    # WebPage.name is not a Google Rich Results requirement — omitted on purpose.
    "MedicalSubstance":   ["name"],
    "Drug":               ["name"],
    "DietarySupplement":  ["name"],
    "VideoObject":        ["name", "thumbnailUrl", "uploadDate"],
    "ImageObject":        [("contentUrl", "url")],
    "Person":             ["name"],
    "HowTo":              ["name", "step"],
    "Recipe":             ["name"],
    "Review":             ["reviewRating"],
    "AggregateRating":    ["ratingValue"],
    "Offer":              ["price", "priceCurrency"],
}

# Extra structural rules for collection-shaped types beyond "field exists".
# `path` is the JSON Pointer to `node` inside the parsed document (RFC 6901).
# It's prepended to each error so a failure in the 3rd `mainEntity` of the
# 2nd `@graph` node reads as "at /@graph/1/mainEntity/2 ..." instead of a
# bare type name.
def _extra_rules(node_type: str, node: dict[str, Any], path: str = "") -> list[str]:
    errs: list[str] = []
    at = f" at {path or '/'}"
    if node_type in {"BreadcrumbList", "ItemList"}:
        items = node.get("itemListElement")
        if isinstance(items, list) and len(items) == 0:
            errs.append(f"{node_type}.itemListElement is empty{at}")
    if node_type == "FAQPage":
        main = node.get("mainEntity")
        entities = main if isinstance(main, list) else ([main] if isinstance(main, dict) else [])
        if not entities:
            errs.append(f"FAQPage.mainEntity is empty{at}")
        base = f"{path}/mainEntity" if isinstance(main, list) else path
        for i, q in enumerate(entities):
            qpath = f"{base}/{i}" if isinstance(main, list) else f"{path}/mainEntity"
            if not isinstance(q, dict):
                continue
            if not q.get("name"):
                errs.append(f"FAQPage.mainEntity[{i}].name missing at {qpath}")
            ans = q.get("acceptedAnswer")
            if isinstance(ans, dict):
                if not (ans.get("text") or ans.get("name")):
                    errs.append(f"FAQPage.mainEntity[{i}].acceptedAnswer.text missing at {qpath}/acceptedAnswer")
            elif not ans:
                errs.append(f"FAQPage.mainEntity[{i}].acceptedAnswer missing at {qpath}")
    return errs


# ---------------------------------------------------------------------------
# @graph reference resolution + cross-field consistency
#
# JSON-LD documents commonly use `{"@id": "..."}` as a *reference* to another
# node defined elsewhere in the same document (typically inside `@graph`).
# When that target is missing, Google's parser silently drops the relation and
# the rich result degrades. We flag two problem classes:
#
#   1. Dangling reference: `{"@id": X}` (a bare-reference dict) whose X is
#      not defined by any node's own `@id` in the same document. External
#      absolute URLs are accepted only when nothing else in the document
#      defines them either — bare-ref dicts using an external URL that no
#      other node claims are still valid pointers to remote resources.
#      We only fail when the reference *looks internal* (fragment-only,
#      relative, or shares the document's base but isn't defined).
#
#   2. Wrong-shape target: when a reference resolves to a node whose @type
#      doesn't satisfy the parent field's contract:
#        - FAQPage.mainEntity[i]  -> must resolve to Question w/ acceptedAnswer
#        - Question.acceptedAnswer -> must resolve to Answer|dict w/ text
#        - BreadcrumbList.itemListElement[i] / ItemList.itemListElement[i]
#          -> must resolve to ListItem (schema.org shape)


_BARE_REF_KEYS = {"@id"}


def _is_bare_ref(node: Any) -> bool:
    """A dict that is *only* a pointer, e.g. {"@id": "#faq-1"}."""
    return isinstance(node, dict) and set(node.keys()) == _BARE_REF_KEYS and isinstance(node.get("@id"), str)


def _looks_internal(ref_id: str, doc_ids: set[str]) -> bool:
    """Heuristic: a reference is 'internal' (must resolve) when it's a
    fragment (#foo), relative path, or already appears as an @id in the doc
    but got typo'd elsewhere. Fully-qualified external URLs that no node
    claims are treated as pointers to remote resources, not local bugs."""
    if ref_id.startswith("#") or ref_id.startswith("/"):
        return True
    if ref_id in doc_ids:
        return True  # (unreachable given caller, but explicit)
    # bare token, no scheme -> internal
    if "://" not in ref_id and not ref_id.startswith("urn:"):
        return True
    return False


def _resolve(ref: Any, id_map: dict[str, dict[str, Any]]) -> dict[str, Any] | None:
    """If `ref` is a bare @id reference, look it up. If it's already an
    inline dict, return it. Otherwise None."""
    if _is_bare_ref(ref):
        return id_map.get(ref["@id"])
    if isinstance(ref, dict):
        return ref
    return None


def validate_graph(doc: Any) -> list[str]:
    errs: list[str] = []
    nodes: list[dict[str, Any]] = []
    paths: list[str] = []
    _walk(doc, nodes, "", paths)
    node_paths: dict[int, str] = {id(n): p for n, p in zip(nodes, paths)}

    # Build @id -> node map (only nodes that *define* an @id AND carry more
    # than just @id — otherwise they're references, not definitions).
    id_map: dict[str, dict[str, Any]] = {}
    for n in nodes:
        nid = n.get("@id")
        if isinstance(nid, str) and not _is_bare_ref(n):
            id_map.setdefault(nid, n)
    doc_ids = set(id_map.keys())

    # 1. Dangling references
    for n in nodes:
        npath = node_paths.get(id(n), "/")
        for k, v in list(n.items()):
            values = v if isinstance(v, list) else [v]
            for idx, item in enumerate(values):
                if _is_bare_ref(item):
                    rid = item["@id"]
                    if rid in doc_ids:
                        continue
                    if _looks_internal(rid, doc_ids):
                        ref_path = (
                            f"{npath}/{_escape_ptr(k)}/{idx}"
                            if isinstance(v, list)
                            else f"{npath}/{_escape_ptr(k)}"
                        )
                        errs.append(f"dangling @id reference {rid!r} at {ref_path}")

    # 2. Cross-field consistency via reference resolution
    for n in nodes:
        npath = node_paths.get(id(n), "/")
        types = set(_type_of(n))

        if "FAQPage" in types:
            main = n.get("mainEntity")
            entities = main if isinstance(main, list) else ([main] if main else [])
            main_is_list = isinstance(main, list)
            for i, ent in enumerate(entities):
                epath = (
                    f"{npath}/mainEntity/{i}" if main_is_list else f"{npath}/mainEntity"
                )
                target = _resolve(ent, id_map)
                if target is None:
                    # Dangling case already reported above; skip shape check.
                    continue
                ttypes = set(_type_of(target))
                if ttypes and "Question" not in ttypes:
                    errs.append(
                        f"FAQPage.mainEntity[{i}] resolves to @type={sorted(ttypes)}, expected Question at {epath}"
                    )
                ans = target.get("acceptedAnswer")
                ans_target = _resolve(ans, id_map) if ans is not None else None
                if ans is None:
                    if _is_bare_ref(ent):
                        errs.append(
                            f"FAQPage.mainEntity[{i}] -> Question missing acceptedAnswer at {epath}/acceptedAnswer"
                        )
                elif ans_target is None and _is_bare_ref(ans):
                    # dangling already reported
                    pass
                elif isinstance(ans_target, dict):
                    atypes = set(_type_of(ans_target))
                    if atypes and "Answer" not in atypes:
                        errs.append(
                            f"FAQPage.mainEntity[{i}].acceptedAnswer resolves to @type={sorted(atypes)}, expected Answer at {epath}/acceptedAnswer"
                        )
                    if not (ans_target.get("text") or ans_target.get("name")):
                        errs.append(
                            f"FAQPage.mainEntity[{i}].acceptedAnswer target missing text at {epath}/acceptedAnswer"
                        )

        if types & {"BreadcrumbList", "ItemList"}:
            items = n.get("itemListElement")
            container = next(iter(types & {"BreadcrumbList", "ItemList"}))
            if isinstance(items, list):
                for i, it in enumerate(items):
                    ipath = f"{npath}/itemListElement/{i}"
                    target = _resolve(it, id_map)
                    if target is None:
                        continue
                    ttypes = set(_type_of(target))
                    if ttypes and "ListItem" not in ttypes:
                        errs.append(
                            f"{container}.itemListElement[{i}] resolves to @type={sorted(ttypes)}, expected ListItem at {ipath}"
                        )

        # HowTo: `step` must resolve to HowToStep (or HowToSection whose
        # itemListElement resolves to HowToStep). Each HowToStep needs a
        # name or text — an empty step disables the rich result entirely.
        if "HowTo" in types:
            steps = n.get("step")
            steps_list = steps if isinstance(steps, list) else ([steps] if steps else [])
            step_is_list = isinstance(steps, list)
            for i, s in enumerate(steps_list):
                spath = f"{npath}/step/{i}" if step_is_list else f"{npath}/step"
                target = _resolve(s, id_map)
                if target is None:
                    continue
                ttypes = set(_type_of(target))
                if ttypes and not (ttypes & {"HowToStep", "HowToSection"}):
                    errs.append(
                        f"HowTo.step[{i}] resolves to @type={sorted(ttypes)}, expected HowToStep or HowToSection at {spath}"
                    )
                if "HowToStep" in ttypes and not (target.get("name") or target.get("text")):
                    errs.append(
                        f"HowTo.step[{i}] -> HowToStep missing name/text at {spath}"
                    )
                if "HowToSection" in ttypes:
                    sub = target.get("itemListElement")
                    sub_list = sub if isinstance(sub, list) else ([sub] if sub else [])
                    for j, ss in enumerate(sub_list):
                        st = _resolve(ss, id_map)
                        if st is None:
                            continue
                        sttypes = set(_type_of(st))
                        if sttypes and "HowToStep" not in sttypes:
                            errs.append(
                                f"HowTo.step[{i}].itemListElement[{j}] resolves to @type={sorted(sttypes)}, expected HowToStep at {spath}/itemListElement/{j}"
                            )

        # Article/Product/CreativeWork publisher & author references must
        # resolve to Organization / Person and carry the fields Google's
        # rich result parser reads (name, and a URL for Organization logos).
        if types & {"Article", "NewsArticle", "BlogPosting", "MedicalScholarlyArticle", "Product", "Review", "Recipe", "HowTo", "WebPage", "WebSite"}:
            for role, expected in (("publisher", {"Organization"}), ("author", {"Person", "Organization"})):
                val = n.get(role)
                if val is None:
                    continue
                vals = val if isinstance(val, list) else [val]
                val_is_list = isinstance(val, list)
                for i, ref in enumerate(vals):
                    rpath = f"{npath}/{role}/{i}" if val_is_list else f"{npath}/{role}"
                    target = _resolve(ref, id_map)
                    if target is None:
                        continue
                    ttypes = set(_type_of(target))
                    if ttypes and not (ttypes & expected):
                        errs.append(
                            f"{sorted(types)[0]}.{role} resolves to @type={sorted(ttypes)}, expected one of {sorted(expected)} at {rpath}"
                        )
                    if not target.get("name"):
                        errs.append(f"{role} target missing name at {rpath}")
                    # Organization.logo, when present as a reference, must
                    # resolve to an ImageObject with a URL.
                    logo = target.get("logo")
                    logo_target = _resolve(logo, id_map) if logo is not None else None
                    if isinstance(logo_target, dict):
                        ltypes = set(_type_of(logo_target))
                        if ltypes and "ImageObject" not in ltypes:
                            errs.append(
                                f"{role}.logo resolves to @type={sorted(ltypes)}, expected ImageObject at {rpath}/logo"
                            )
                        if not (logo_target.get("url") or logo_target.get("contentUrl")):
                            errs.append(f"{role}.logo target missing url/contentUrl at {rpath}/logo")

        # WebSite.potentialAction (sitelinks searchbox) must resolve to a
        # SearchAction with a `target` and a `query-input` string.
        if "WebSite" in types:
            pa = n.get("potentialAction")
            pa_list = pa if isinstance(pa, list) else ([pa] if pa else [])
            pa_is_list = isinstance(pa, list)
            for i, act in enumerate(pa_list):
                apath = f"{npath}/potentialAction/{i}" if pa_is_list else f"{npath}/potentialAction"
                target = _resolve(act, id_map)
                if target is None:
                    continue
                ttypes = set(_type_of(target))
                if ttypes and "SearchAction" not in ttypes:
                    # Non-SearchAction actions are allowed on WebSite; only
                    # flag when the intent looks like a searchbox but the
                    # shape is wrong (has query-input but no SearchAction).
                    if target.get("query-input") and "SearchAction" not in ttypes:
                        errs.append(
                            f"WebSite.potentialAction has query-input but @type={sorted(ttypes)}, expected SearchAction at {apath}"
                        )
                if "SearchAction" in ttypes:
                    if not target.get("target"):
                        errs.append(f"SearchAction missing target at {apath}/target")
                    if not target.get("query-input"):
                        errs.append(f"SearchAction missing query-input at {apath}/query-input")

        # sameAs: schema.org requires each entry to be a URL (or an @id
        # reference that resolves to a node with a url). Bare strings that
        # aren't URLs silently get dropped by Google's parser.
        sa = n.get("sameAs")
        if sa is not None:
            sa_list = sa if isinstance(sa, list) else [sa]
            sa_is_list = isinstance(sa, list)
            for i, entry in enumerate(sa_list):
                spath = f"{npath}/sameAs/{i}" if sa_is_list else f"{npath}/sameAs"
                if isinstance(entry, str):
                    if not (entry.startswith("http://") or entry.startswith("https://")):
                        errs.append(f"sameAs[{i}] not an absolute URL: {entry!r} at {spath}")
                elif isinstance(entry, dict):
                    target = _resolve(entry, id_map)
                    if target is None:
                        continue
                    if not (target.get("url") or target.get("@id", "").startswith(("http://", "https://"))):
                        errs.append(f"sameAs[{i}] target missing url at {spath}")
                else:
                    errs.append(f"sameAs[{i}] must be URL string or node, got {type(entry).__name__} at {spath}")

    return errs


# ---------------------------------------------------------------------------
# Sitemap discovery
def _discover(sitemap_url: str, out: list[str], visited: set[str], depth: int = 0) -> None:
    if sitemap_url in visited or depth > 5:
        return
    visited.add(sitemap_url)
    try:
        body = fetch_sitemap_bytes(sitemap_url, user_agent=UA)
    except Exception as exc:
        print(f"warn: could not fetch {sitemap_url}: {exc}", file=sys.stderr)
        return
    try:
        root = ET.fromstring(body)
    except ET.ParseError as exc:
        print(f"warn: {sitemap_url} not valid XML: {exc}", file=sys.stderr)
        return
    tag = root.tag.split("}", 1)[-1]
    if tag == "sitemapindex":
        children = [
            (loc.text or "").strip()
            for loc in root.iter()
            if loc.tag.split("}", 1)[-1] == "loc" and (loc.text or "").strip()
        ]
        for c in children:
            _discover(c, out, visited, depth + 1)
        return
    for loc in root.iter():
        if loc.tag.split("}", 1)[-1] == "loc" and (loc.text or "").strip():
            out.append(loc.text.strip())


def discover_sitemap(base: str) -> list[str]:
    urls: list[str] = []
    _discover(urllib.parse.urljoin(base + "/", "sitemap.xml"), urls, set())
    seen: set[str] = set()
    deduped: list[str] = []
    for u in urls:
        if u not in seen:
            seen.add(u)
            deduped.append(u)
    return deduped


# ---------------------------------------------------------------------------
# HTML fetch + JSON-LD extraction
_LDJSON_RE = re.compile(
    r"<script\b[^>]*type\s*=\s*['\"]application/ld\+json['\"][^>]*>(.*?)</script>",
    re.IGNORECASE | re.DOTALL,
)


# ---------------------------------------------------------------------------
# Persisted conditional-fetch cache
#
# CI runs re-fetch 500+ URLs on every push. Almost none of them change
# between runs, so we cache each URL's body + validators (ETag /
# Last-Modified) on disk and revalidate with If-None-Match /
# If-Modified-Since. On HTTP 304 we reuse the cached body without paying
# the transfer cost — parse/field validation still runs against it, so
# failures stay deterministic. Only HTTP 200 responses are cached; error
# responses are never persisted.
#
# The cache dir defaults to `.cache/jsonld-fetch/` under the repo root and
# can be overridden with $JSONLD_CACHE_DIR. In CI it's persisted across
# runs via actions/cache (see .github/workflows/jsonld-schema.yml).
CACHE_DIR = Path(os.environ.get("JSONLD_CACHE_DIR") or (Path(__file__).resolve().parent.parent / ".cache" / "jsonld-fetch"))
CACHE_DISABLED = os.environ.get("JSONLD_CACHE_DISABLE") == "1"
# Opt-in TTL: when > 0, serve cached bodies younger than TTL seconds
# without hitting the network. Off by default so pass/fail is
# reproducible run-to-run; enable in workflows where a bounded staleness
# window is acceptable (e.g. hourly schedule with TTL=3600).
try:
    CACHE_TTL_SECONDS = max(0, int(os.environ.get("JSONLD_CACHE_TTL_SECONDS", "0")))
except ValueError:
    CACHE_TTL_SECONDS = 0
CACHE_SCHEMA_VERSION = 1



@dataclass
class CacheStats:
    hits304: int = 0
    hits_ttl: int = 0    # served fresh from cache under TTL (no network)
    misses: int = 0
    stored: int = 0


CACHE_STATS = CacheStats()


def _cache_path(url: str) -> Path:
    h = hashlib.sha256(url.encode("utf-8")).hexdigest()
    return CACHE_DIR / h[:2] / f"{h}.json"


def _cache_read(url: str) -> dict[str, Any] | None:
    if CACHE_DISABLED:
        return None
    p = _cache_path(url)
    if not p.is_file():
        return None
    try:
        entry = json.loads(p.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        return None
    if entry.get("v") != CACHE_SCHEMA_VERSION or entry.get("url") != url:
        return None
    return entry


def _cache_write(url: str, body: str, etag: str | None, last_modified: str | None) -> None:
    if CACHE_DISABLED:
        return
    p = _cache_path(url)
    try:
        p.parent.mkdir(parents=True, exist_ok=True)
        payload = {
            "v": CACHE_SCHEMA_VERSION,
            "url": url,
            "etag": etag,
            "last_modified": last_modified,
            "body": body,
            "stored_at": int(time.time()),
        }
        tmp = p.with_suffix(".json.tmp")
        tmp.write_text(json.dumps(payload), encoding="utf-8")
        tmp.replace(p)
        CACHE_STATS.stored += 1
    except OSError:
        pass


def http_get(url: str) -> tuple[int, str]:
    """Fetch `url`, using ETag/Last-Modified to short-circuit on 304.

    Returns (status, body). status is the effective HTTP status (200 for
    both a fresh fetch and a cache-revalidated 304); body is always the
    current authoritative content.
    """
    cached = _cache_read(url)
    if cached and CACHE_TTL_SECONDS > 0:
        stored_at = int(cached.get("stored_at") or 0)
        if stored_at and (int(time.time()) - stored_at) < CACHE_TTL_SECONDS:
            CACHE_STATS.hits_ttl += 1
            return 200, cached["body"]

    headers: dict[str, str] = {"User-Agent": UA, "Accept": "text/html,*/*"}
    if cached:
        if cached.get("etag"):
            headers["If-None-Match"] = cached["etag"]
        if cached.get("last_modified"):
            headers["If-Modified-Since"] = cached["last_modified"]

    req = urllib.request.Request(url, headers=headers)
    try:
        with urllib.request.urlopen(req, timeout=REQUEST_TIMEOUT) as resp:
            status = resp.status
            body = resp.read().decode("utf-8", errors="replace")
            etag = resp.headers.get("ETag")
            last_modified = resp.headers.get("Last-Modified")
            if status == 200:
                _cache_write(url, body, etag, last_modified)
                CACHE_STATS.misses += 1
            return status, body
    except urllib.error.HTTPError as exc:
        if exc.code == 304 and cached:
            CACHE_STATS.hits304 += 1
            return 200, cached["body"]
        raise


def extract_ldjson_blocks(body: str) -> list[str]:
    return [m.group(1).strip() for m in _LDJSON_RE.finditer(body)]



# ---------------------------------------------------------------------------
# JSON-LD validation
@dataclass
class UrlResult:
    url: str
    status: int = 0
    blocks: int = 0
    parse_errors: list[str] = field(default_factory=list)
    field_errors: list[str] = field(default_factory=list)
    graph_errors: list[str] = field(default_factory=list)
    fetch_error: str | None = None

    @property
    def ok(self) -> bool:
        return not self.fetch_error and not self.parse_errors and not self.field_errors and not self.graph_errors


def _type_of(node: dict[str, Any]) -> list[str]:
    t = node.get("@type")
    if isinstance(t, str):
        return [t]
    if isinstance(t, list):
        return [x for x in t if isinstance(x, str)]
    return []


def _escape_ptr(token: str) -> str:
    """Escape a single JSON Pointer reference token per RFC 6901."""
    return token.replace("~", "~0").replace("/", "~1")


def _walk(node: Any, out: list[dict[str, Any]], path: str = "", paths: list[str] | None = None) -> None:
    """Yield every dict-shaped node with its JSON Pointer path.

    Backward compat: `out` still collects the node dicts. When `paths` is
    provided, we push the RFC 6901 pointer for each dict in parallel so
    callers that need location context can zip them.
    """
    if isinstance(node, dict):
        out.append(node)
        if paths is not None:
            paths.append(path or "/")
        for k, v in node.items():
            _walk(v, out, f"{path}/{_escape_ptr(str(k))}", paths)
    elif isinstance(node, list):
        for i, v in enumerate(node):
            _walk(v, out, f"{path}/{i}", paths)


def _field_present(node: dict[str, Any], field_spec: Any) -> bool:
    if isinstance(field_spec, tuple):
        return any(node.get(k) not in (None, "", [], {}) for k in field_spec)
    return node.get(field_spec) not in (None, "", [], {})


def validate_node(node: dict[str, Any], path: str = "") -> list[str]:
    errs: list[str] = []
    at = path or "/"
    for t in _type_of(node):
        reqs = REQUIRED_FIELDS.get(t)
        if not reqs:
            continue
        for field_spec in reqs:
            if not _field_present(node, field_spec):
                label = "|".join(field_spec) if isinstance(field_spec, tuple) else field_spec
                errs.append(f"{t}.{label} missing at {at}")
        errs.extend(_extra_rules(t, node, path))
    return errs


def validate_url(url: str) -> UrlResult:
    r = UrlResult(url=url)
    try:
        status, body = http_get(url)
        r.status = status
        if status >= 400:
            r.fetch_error = f"HTTP {status}"
            return r
    except Exception as exc:
        r.fetch_error = str(exc)
        return r
    for i, raw in enumerate(extract_ldjson_blocks(body)):
        r.blocks += 1
        # Some CMSes HTML-encode ampersands inside <script>. json can't parse
        # those, but real Google can't either — treat as a parse error.
        try:
            doc = json.loads(raw)
        except json.JSONDecodeError as exc:
            # Try decoding HTML entities as a soft retry; if it still fails,
            # the block is genuinely broken.
            try:
                doc = json.loads(html.unescape(raw))
            except json.JSONDecodeError:
                snippet = raw[:120].replace("\n", " ")
                r.parse_errors.append(f"block #{i+1}: {exc.msg} at line {exc.lineno} col {exc.colno} — {snippet!r}")
                continue
        nodes: list[dict[str, Any]] = []
        paths: list[str] = []
        _walk(doc, nodes, "", paths)
        for node, npath in zip(nodes, paths):
            for e in validate_node(node, npath):
                r.field_errors.append(f"block #{i+1}: {e}")
        # Graph-level checks operate on the whole doc so cross-node refs resolve.
        for e in validate_graph(doc):
            r.graph_errors.append(f"block #{i+1}: {e}")
    return r


# ---------------------------------------------------------------------------
def main() -> int:
    print(f"Discovering sitemap from {BASE}/sitemap.xml", file=sys.stderr)
    urls = discover_sitemap(BASE)
    if not urls:
        print(f"error: no URLs discovered under {BASE}/sitemap.xml", file=sys.stderr)
        return 2
    print(f"Validating JSON-LD on {len(urls)} URLs (workers={MAX_WORKERS})", file=sys.stderr)

    results: list[UrlResult] = []
    with concurrent.futures.ThreadPoolExecutor(max_workers=MAX_WORKERS) as pool:
        for res in pool.map(validate_url, urls):
            results.append(res)

    total = len(results)
    with_jsonld = sum(1 for r in results if r.blocks > 0)
    fetch_fail = [r for r in results if r.fetch_error]
    parse_fail = [r for r in results if r.parse_errors]
    field_fail = [r for r in results if r.field_errors]
    graph_fail = [r for r in results if r.graph_errors]

    print("")
    print(f"URLs scanned:            {total}")
    print(f"URLs with JSON-LD:       {with_jsonld}")
    print(f"URLs without JSON-LD:    {total - with_jsonld - len(fetch_fail)} (allowed)")
    print(f"Fetch failures:          {len(fetch_fail)}")
    print(f"JSON parse failures:     {len(parse_fail)}")
    print(f"Required-field failures: {len(field_fail)}")
    print(f"Graph/ref failures:      {len(graph_fail)}")
    print(
        f"Cache:                   {CACHE_STATS.hits_ttl} fresh (TTL), "
        f"{CACHE_STATS.hits304} revalidated (304), "
        f"{CACHE_STATS.misses} fetched (200), {CACHE_STATS.stored} stored"
        + (" [DISABLED]" if CACHE_DISABLED else "")
        + (f" [TTL={CACHE_TTL_SECONDS}s]" if CACHE_TTL_SECONDS else "")
    )

    if fetch_fail:
        print("\n--- Fetch failures ---")
        for r in fetch_fail[:20]:
            print(f"  {r.url}  ->  {r.fetch_error}")
        if len(fetch_fail) > 20:
            print(f"  ... and {len(fetch_fail) - 20} more")

    if parse_fail:
        print("\n--- JSON-LD parse failures ---")
        for r in parse_fail:
            print(f"  {r.url}")
            for e in r.parse_errors:
                print(f"    - {e}")

    if field_fail:
        print("\n--- Required-field failures ---")
        for r in field_fail:
            print(f"  {r.url}")
            for e in sorted(set(r.field_errors)):
                print(f"    - {e}")

    if graph_fail:
        print("\n--- @graph reference / cross-field failures ---")
        for r in graph_fail:
            print(f"  {r.url}")
            for e in sorted(set(r.graph_errors)):
                print(f"    - {e}")

    # Fetch errors are surfaced but do not fail the build — transient CDN
    # blips shouldn't turn a schema-quality check red. Parse, field, and
    # graph errors are hard failures: they mean structured data on
    # production is broken or internally inconsistent.
    if parse_fail or field_fail or graph_fail:
        return 1
    print("\nAll JSON-LD blocks parsed, required fields present, and @graph refs resolve.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
