"""Robust sitemap fetching with resilient gzip detection.

Shared by the three sitemap walkers (`validate-og-twitter.py`,
`validate-library-faq.py`, `report-library-faq-jsonld.py`) so gzip
handling stays in one place and can be unit-tested independently
(`_sitemap_fetch_test.py`).

Design goals
------------
- **Magic bytes are ground truth.** If the payload starts with `1f 8b`
  it is gzip, regardless of what headers claim. Real-world CDNs mis-label
  `.xml.gz` files as `text/xml` with no `Content-Encoding` at all.
- **Headers are hints, not proofs.** `Content-Encoding` can arrive as
  `gzip`, `x-gzip`, or a comma-separated list like `gzip, br`. Split on
  commas and check every token. `Content-Type` variants covered:
  `application/gzip`, `application/x-gzip`, `application/octet-stream`
  when combined with a `.gz` URL suffix.
- **URL suffix survives query strings.** `foo.xml.gz?v=2` must count as
  gzip. We look at the URL path only, stripping `?` and `#`.
- **Decompress until stable.** Some pipelines double-gzip. Loop while the
  buffer still starts with the gzip magic, with a small safety cap.
- **Fail soft.** If headers claim gzip but decompression raises AND the
  buffer already looks like XML (`<?xml` or `<`), return it as-is rather
  than crashing the whole crawl.
"""

from __future__ import annotations

import gzip
import urllib.parse
import urllib.request
from typing import Iterable, Optional


GZIP_MAGIC = b"\x1f\x8b"

# Content-Encoding tokens that indicate a gzip-wrapped body. The HTTP
# spec allows `x-gzip` as a legacy alias; some CDNs still emit it.
_GZIP_ENCODING_TOKENS = frozenset({"gzip", "x-gzip"})

# Content-Type values that flag a gzip body even when Content-Encoding is
# missing. `application/octet-stream` is intentionally NOT in this set:
# it only counts when combined with a `.gz` URL suffix (handled below).
_GZIP_CONTENT_TYPES = frozenset({"application/gzip", "application/x-gzip"})

# Safety cap on how many times we'll peel a gzip layer before giving up.
# Real sitemaps are never nested more than once; anything deeper is a bug
# or an attack and should not silently spin.
_MAX_GZIP_LAYERS = 3


def _url_path(url: str) -> str:
    """Return the URL path with query and fragment stripped, lowercased."""
    try:
        parsed = urllib.parse.urlsplit(url)
    except ValueError:
        return url.lower()
    return parsed.path.lower()


def _encoding_tokens(header_value: Optional[str]) -> list[str]:
    """Split a `Content-Encoding` header into normalized tokens.

    `Content-Encoding: gzip, br` -> ["gzip", "br"].
    Missing / blank headers return []. Whitespace is trimmed and the
    result is lowercased so token comparison is case-insensitive.
    """
    if not header_value:
        return []
    return [t.strip().lower() for t in header_value.split(",") if t.strip()]


def _content_type(header_value: Optional[str]) -> str:
    """Return the MIME type only (no parameters), lowercased."""
    if not header_value:
        return ""
    return header_value.split(";", 1)[0].strip().lower()


def looks_like_gzip(
    body: bytes,
    *,
    url: str = "",
    content_encoding: Optional[str] = None,
    content_type: Optional[str] = None,
) -> bool:
    """Return True if `body` should be treated as gzip.

    Decision order (first hit wins):
      1. Magic bytes `1f 8b` — ground truth, overrides everything.
      2. `Content-Encoding` includes a gzip token.
      3. `Content-Type` is a gzip MIME.
      4. URL path ends in `.gz` (survives query strings).
      5. URL path ends in `.gz` AND `Content-Type` is
         `application/octet-stream` (some object stores default to this).
    """
    if body[:2] == GZIP_MAGIC:
        return True
    if any(t in _GZIP_ENCODING_TOKENS for t in _encoding_tokens(content_encoding)):
        return True
    ctype = _content_type(content_type)
    if ctype in _GZIP_CONTENT_TYPES:
        return True
    path = _url_path(url)
    if path.endswith(".gz"):
        return True
    if ctype == "application/octet-stream" and path.endswith(".gz"):
        return True
    return False


def decompress_if_gzip(
    body: bytes,
    *,
    url: str = "",
    content_encoding: Optional[str] = None,
    content_type: Optional[str] = None,
) -> bytes:
    """Return `body` decompressed if it is (or claims to be) gzip.

    Handles double-gzipped payloads by peeling layers while the buffer
    still begins with the gzip magic bytes, capped at `_MAX_GZIP_LAYERS`.

    Fails soft: if headers claim gzip but decompression raises AND the
    body already looks like XML text, the raw body is returned so the
    caller can still parse it. Genuine gzip errors (magic bytes present
    but stream truncated) still propagate so the caller sees the failure.
    """
    magic_says_gzip = body[:2] == GZIP_MAGIC
    if not looks_like_gzip(
        body,
        url=url,
        content_encoding=content_encoding,
        content_type=content_type,
    ):
        return body

    current = body
    for _ in range(_MAX_GZIP_LAYERS):
        if current[:2] != GZIP_MAGIC:
            return current
        try:
            current = gzip.decompress(current)
        except (OSError, EOFError) as exc:
            # Only tolerate failure when headers were the ONLY signal —
            # not when the magic bytes themselves promised gzip.
            if magic_says_gzip:
                raise
            stripped = current.lstrip()
            if stripped.startswith(b"<?xml") or stripped.startswith(b"<"):
                return current
            raise RuntimeError(
                f"gzip decompression failed for {url!r}: {exc}"
            ) from exc
    return current


# Process-lifetime shared cache used by every walker unless the caller
# passes an explicit `cache=`. Centralising it here means:
#   * a walker that discovers a sitemap already fetched by another walker
#     in the same run reuses the bytes,
#   * tests have one canonical clear-point (`clear_shared_cache()`),
#   * we can no longer drift out of sync across the three scripts.
# Negative results are cached as `None` so repeated failures don't retry.
_SHARED_CACHE: dict[str, Optional[bytes]] = {}


class _UnsetType:
    """Sentinel so callers can distinguish 'no cache argument' from
    'cache=None' (which explicitly disables caching)."""

    def __repr__(self) -> str:  # pragma: no cover - debug only
        return "<UNSET>"


_UNSET = _UnsetType()


def get_shared_cache() -> dict[str, Optional[bytes]]:
    """Return the process-lifetime cache dict used by default. Exposed so
    tests can inspect entries and so callers can pre-seed fixtures."""
    return _SHARED_CACHE


def clear_shared_cache() -> None:
    """Drop every entry from the shared cache. Tests call this in setUp
    so each case observes fresh HTTP fetches."""
    _SHARED_CACHE.clear()


def fetch_sitemap_bytes(
    url: str,
    *,
    user_agent: str,
    timeout: int = 30,
    cache: Optional[dict[str, Optional[bytes]]] | _UnsetType = _UNSET,
) -> bytes:
    """Fetch a sitemap URL and return XML bytes, transparently
    decompressing gzip regardless of header inconsistencies.

    Cache semantics:
      * `cache` omitted (default) → use the module-level `_SHARED_CACHE`
        so results are reused across every walker in the process.
      * `cache=<dict>`            → use that dict (tests, isolated runs).
      * `cache=None`              → disable caching entirely.
    Failures are stored as `None` and re-raised on the next call for the
    same URL, so a single 404 doesn't turn into N retries during a walk.
    """
    effective_cache: Optional[dict[str, Optional[bytes]]]
    if isinstance(cache, _UnsetType):
        effective_cache = _SHARED_CACHE
    else:
        effective_cache = cache

    if effective_cache is not None and url in effective_cache:
        cached = effective_cache[url]
        if cached is None:
            raise RuntimeError(f"cached failure for {url}")
        return cached

    req = urllib.request.Request(
        url,
        headers={
            "User-Agent": user_agent,
            # Never advertise gzip in Accept-Encoding: urllib does NOT
            # transparently decompress, so we'd have to do it ourselves
            # for every response. Let the server pick.
            "Accept": "application/xml,text/xml,*/*",
        },
    )
    try:
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            raw = resp.read()
            ctype = resp.headers.get("Content-Type")
            cenc = resp.headers.get("Content-Encoding")
    except Exception:
        if effective_cache is not None:
            effective_cache[url] = None
        raise

    decoded = decompress_if_gzip(
        raw, url=url, content_encoding=cenc, content_type=ctype
    )
    if effective_cache is not None:
        effective_cache[url] = decoded
    return decoded


__all__ = [
    "GZIP_MAGIC",
    "looks_like_gzip",
    "decompress_if_gzip",
    "fetch_sitemap_bytes",
    "get_shared_cache",
    "clear_shared_cache",
]
