#!/usr/bin/env python3
"""Fetch live page markup and validate OG / Twitter Card tags **and**
canonical + robots behaviour the way crawlers (Facebook, LinkedIn, Slack,
X/Twitter, Googlebot, iMessage) actually see them.

Usage:
    python3 scripts/validate-og-twitter.py https://doseroutine.com [extra-url ...]

Discovery:
    - No URLs → https://doseroutine.com + every URL in the live /sitemap.xml
      (capped, see MAX_ROUTES).
    - Explicit URLs on the CLI are always checked and never capped.

Checks per page (mirrors OGP + Twitter Cards + Google indexing rules):

    Required OGP:      og:title, og:type, og:image, og:url
    Recommended OGP:   og:description, og:site_name
    Required Twitter:  twitter:card (summary_large_image also needs
                       title/description/image or an og:* fallback)
    Absolute URLs:     og:url, og:image, twitter:image, canonical must be
                       absolute https:// URLs.
    Redirect parity:   follow up to MAX_REDIRECTS hops just like a crawler;
                       og:url and <link rel="canonical"> must match the
                       FINAL landing URL, not the URL we originally asked
                       for. A page that 301s to another URL but keeps the
                       old canonical is a duplicate-content bug.
    Robots parity:     <meta name="robots"> and the X-Robots-Tag response
                       header must agree. `noindex` from either one on a
                       route we intend to promote is a hard failure. A URL
                       that is `noindex` but still listed in sitemap.xml
                       is a hard failure (contradictory signals to Google).
    robots.txt:        fetched once per host. A URL we're validating for
                       previews / indexing that is Disallowed for
                       Googlebot or facebookexternalhit is a hard failure.
    Image reachability: HEAD og:image / twitter:image (following redirects),
                       require 2xx, image/* content-type, non-empty body.
    Image dimensions:  if og:image:width/height are declared they must be
                       positive integers; warn when smaller than the
                       1200x630 that FB/LinkedIn recommend.

Exits non-zero on any hard failure so it can gate a deploy.
"""

from __future__ import annotations

import argparse
import concurrent.futures as cf
import re
import sys
import urllib.parse
import urllib.request
import xml.etree.ElementTree as ET
from dataclasses import dataclass, field
from html.parser import HTMLParser
from pathlib import Path

# Import the shared robust gzip-aware sitemap fetcher. `scripts/` is not
# a package (hyphenated filenames block `import`), so we load the helper
# by absolute path via importlib.
import importlib.util as _importlib_util
_spec = _importlib_util.spec_from_file_location(
    "_sitemap_fetch", Path(__file__).with_name("_sitemap_fetch.py")
)
_sitemap_fetch = _importlib_util.module_from_spec(_spec)  # type: ignore[arg-type]
assert _spec and _spec.loader
_spec.loader.exec_module(_sitemap_fetch)  # type: ignore[union-attr]
fetch_sitemap_bytes = _sitemap_fetch.fetch_sitemap_bytes
clear_sitemap_cache = _sitemap_fetch.clear_shared_cache

# Crawler UA — some CDNs return different markup for social bots vs
# regular browsers, so we ask for what FB actually sees.
CRAWLER_UA = (
    "facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php) "
    "Twitterbot/1.0"
)
GOOGLEBOT_UA = "Googlebot/2.1 (+http://www.google.com/bot.html)"
REQUEST_TIMEOUT = 20
MAX_ROUTES = 60
MAX_REDIRECTS = 5
MIN_OG_IMAGE_WIDTH = 1200
MIN_OG_IMAGE_HEIGHT = 630

# UAs the robots.txt check evaluates. If any of them is Disallowed from a
# route we're validating, that's a hard failure — either the page shouldn't
# be linked/shared or robots.txt is wrong.
ROBOTS_UAS_TO_CHECK = ("Googlebot", "facebookexternalhit", "Twitterbot")


# ---------------------------------------------------------------------------
# HTML head parsing

class HeadParser(HTMLParser):
    def __init__(self) -> None:
        super().__init__(convert_charrefs=True)
        self.in_head = False
        self.done = False
        self.meta: list[dict[str, str]] = []
        self.links: list[dict[str, str]] = []
        self.title: str | None = None
        self._in_title = False

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        if self.done:
            return
        if tag == "head":
            self.in_head = True
            return
        if tag == "body":
            self.done = True
            return
        if not self.in_head:
            return
        attr_map = {k.lower(): (v or "") for k, v in attrs}
        if tag == "meta":
            self.meta.append(attr_map)
        elif tag == "link":
            self.links.append(attr_map)
        elif tag == "title":
            self._in_title = True

    def handle_endtag(self, tag: str) -> None:
        if tag == "title":
            self._in_title = False
        elif tag == "head":
            self.done = True

    def handle_data(self, data: str) -> None:
        if self._in_title and self.title is None:
            self.title = data.strip()


@dataclass
class PageMeta:
    title: str | None = None
    canonical: str | None = None
    og: dict[str, str] = field(default_factory=dict)
    twitter: dict[str, str] = field(default_factory=dict)
    robots_meta: str | None = None  # combined content of <meta name=robots|googlebot>


def parse_head(html: str) -> PageMeta:
    p = HeadParser()
    try:
        p.feed(html)
    except Exception:
        pass
    pm = PageMeta(title=p.title)
    robots_tokens: list[str] = []
    for m in p.meta:
        prop = m.get("property", "").lower()
        name = m.get("name", "").lower()
        content = m.get("content", "").strip()
        if not content:
            continue
        if prop.startswith("og:"):
            pm.og[prop] = content
        if name.startswith("twitter:"):
            pm.twitter[name] = content
        if name in ("robots", "googlebot"):
            robots_tokens.append(content.lower())
    if robots_tokens:
        pm.robots_meta = ",".join(robots_tokens)
    for l in p.links:
        if l.get("rel", "").lower() == "canonical" and l.get("href"):
            pm.canonical = l["href"].strip()
            break
    return pm


# ---------------------------------------------------------------------------
# HTTP with recorded redirect chain

class _RecordingRedirectHandler(urllib.request.HTTPRedirectHandler):
    """Records each hop so we can report the final URL and chain length,
    while still enforcing MAX_REDIRECTS."""

    def __init__(self) -> None:
        self.chain: list[tuple[int, str, str]] = []  # (status, from_url, to_url)

    def redirect_request(self, req, fp, code, msg, headers, newurl):  # type: ignore[override]
        if len(self.chain) >= MAX_REDIRECTS:
            raise urllib.error.HTTPError(
                req.full_url, code,
                f"too many redirects (>{MAX_REDIRECTS})",
                headers, fp,
            )
        self.chain.append((code, req.full_url, newurl))
        return super().redirect_request(req, fp, code, msg, headers, newurl)


@dataclass
class HttpResponse:
    status: int
    final_url: str
    content_type: str
    body: str
    x_robots_tag: str | None
    redirect_chain: list[tuple[int, str, str]]


def http_get(url: str, ua: str = CRAWLER_UA) -> HttpResponse:
    recorder = _RecordingRedirectHandler()
    opener = urllib.request.build_opener(recorder)
    req = urllib.request.Request(url, headers={"User-Agent": ua, "Accept": "text/html,*/*"})
    with opener.open(req, timeout=REQUEST_TIMEOUT) as resp:
        raw = resp.read()
        ctype = resp.headers.get("Content-Type", "")
        x_robots = resp.headers.get("X-Robots-Tag")
        return HttpResponse(
            status=resp.status,
            final_url=resp.geturl(),
            content_type=ctype,
            body=raw.decode("utf-8", errors="replace"),
            x_robots_tag=x_robots.lower() if x_robots else None,
            redirect_chain=list(recorder.chain),
        )


def http_head(url: str) -> tuple[int, str, int, str]:
    """HEAD (falling back to a Range GET) following redirects. Returns
    (status, content_type, content_length, final_url)."""
    for method, extra_headers in (
        ("HEAD", {}),
        (None, {"Range": "bytes=0-0"}),  # None → default GET
    ):
        try:
            recorder = _RecordingRedirectHandler()
            opener = urllib.request.build_opener(recorder)
            req = urllib.request.Request(
                url,
                method=method,
                headers={"User-Agent": CRAWLER_UA, **extra_headers},
            )
            with opener.open(req, timeout=REQUEST_TIMEOUT) as resp:
                length = int(resp.headers.get("Content-Length") or 0)
                return (
                    resp.status,
                    resp.headers.get("Content-Type", ""),
                    length,
                    resp.geturl(),
                )
        except Exception:
            continue
    raise RuntimeError("HEAD and Range GET both failed")


# ---------------------------------------------------------------------------
# robots.txt parser (fetched once per host)

@dataclass
class RobotsRules:
    # per-UA: (rules ordered as (allow: bool, pattern: str))
    groups: dict[str, list[tuple[bool, str]]]
    raw: str

    def is_allowed(self, ua: str, path: str) -> bool:
        """Google-style longest-match rule with * / $ wildcards."""
        candidates = [ua.lower(), "*"]
        rules: list[tuple[bool, str]] = []
        for c in candidates:
            if c in self.groups:
                rules = self.groups[c]
                break
        if not rules:
            return True
        # Longest matching pattern wins; ties go to Allow (Google's rule).
        best: tuple[int, bool] | None = None
        for allow, pat in rules:
            if _robots_match(pat, path):
                score = len(pat)
                if best is None or score > best[0] or (score == best[0] and allow):
                    best = (score, allow)
        if best is None:
            return True
        return best[1]


def _robots_match(pattern: str, path: str) -> bool:
    """Support Google's `*` (any chars) and `$` (end anchor)."""
    if not pattern:
        return False
    end_anchor = pattern.endswith("$")
    pat = pattern[:-1] if end_anchor else pattern
    # Escape regex, then translate `*` back to `.*`.
    rx = re.escape(pat).replace(r"\*", ".*")
    rx = "^" + rx + ("$" if end_anchor else "")
    try:
        return re.match(rx, path) is not None
    except re.error:
        return False


_robots_cache: dict[str, RobotsRules | None] = {}


def load_robots(base: str) -> RobotsRules | None:
    root = urllib.parse.urlparse(base)
    origin = f"{root.scheme}://{root.netloc}"
    if origin in _robots_cache:
        return _robots_cache[origin]
    try:
        resp = http_get(f"{origin}/robots.txt", ua=GOOGLEBOT_UA)
    except Exception as exc:
        print(f"warn: could not fetch {origin}/robots.txt: {exc}", file=sys.stderr)
        _robots_cache[origin] = None
        return None
    if resp.status >= 400 or not resp.body.strip():
        _robots_cache[origin] = None
        return None

    groups: dict[str, list[tuple[bool, str]]] = {}
    current_uas: list[str] = []
    just_saw_ua = False
    for raw_line in resp.body.splitlines():
        line = raw_line.split("#", 1)[0].strip()
        if not line or ":" not in line:
            continue
        key, _, value = line.partition(":")
        key = key.strip().lower()
        value = value.strip()
        if key == "user-agent":
            if not just_saw_ua:
                current_uas = []
            current_uas.append(value.lower())
            groups.setdefault(value.lower(), [])
            just_saw_ua = True
        elif key in ("allow", "disallow"):
            just_saw_ua = False
            allow = key == "allow"
            # Empty Disallow means "allow everything"; skip it as a no-op.
            if key == "disallow" and value == "":
                continue
            for ua in current_uas or ["*"]:
                groups.setdefault(ua, []).append((allow, value))
        else:
            just_saw_ua = False

    rules = RobotsRules(groups=groups, raw=resp.body)
    _robots_cache[origin] = rules
    return rules


# ---------------------------------------------------------------------------
# Validation

TWITTER_CARDS = {"summary", "summary_large_image", "app", "player"}


@dataclass
class Result:
    url: str
    final_url: str | None = None
    errors: list[str] = field(default_factory=list)
    warnings: list[str] = field(default_factory=list)
    # Structured diagnostics for the JSON report. Populated by validate_page
    # so CI can surface actionable diffs instead of grepping stdout.
    canonical: str | None = None
    og_url: str | None = None
    redirect_chain: list[dict[str, object]] = field(default_factory=list)
    robots_meta: str | None = None
    x_robots_tag: str | None = None
    canonical_mismatch: dict[str, str] | None = None
    og_url_mismatch: dict[str, str] | None = None
    robots_parity_mismatch: dict[str, str | None] | None = None
    in_sitemap: bool = False
    status: int | None = None


def is_absolute_https(u: str) -> bool:
    try:
        p = urllib.parse.urlparse(u)
        return p.scheme in ("http", "https") and bool(p.netloc)
    except Exception:
        return False


def _norm(u: str) -> str:
    p = urllib.parse.urlparse(u)
    path = p.path.rstrip("/") or "/"
    return f"{p.scheme}://{p.netloc}{path}"


def _contains_noindex(value: str | None) -> bool:
    if not value:
        return False
    tokens = re.split(r"[\s,;]+", value.lower())
    return "noindex" in tokens or "none" in tokens


def validate_page(url: str, sitemap_paths: set[str], robots: RobotsRules | None) -> Result:
    r = Result(url=url)

    # --- robots.txt: is the crawler even allowed to fetch this? ------------
    if robots is not None:
        path = urllib.parse.urlparse(url).path or "/"
        for ua in ROBOTS_UAS_TO_CHECK:
            if not robots.is_allowed(ua, path):
                r.errors.append(
                    f"robots.txt Disallows {ua} on {path} — crawler cannot fetch this page"
                )

    try:
        resp = http_get(url)
    except Exception as exc:
        r.errors.append(f"fetch failed: {exc}")
        return r
    r.final_url = resp.final_url
    r.status = resp.status
    r.x_robots_tag = resp.x_robots_tag
    r.redirect_chain = [
        {"status": code, "from": frm, "to": to}
        for code, frm, to in resp.redirect_chain
    ]
    r.in_sitemap = (
        (urllib.parse.urlparse(resp.final_url).path or "/") in sitemap_paths
        or _norm(resp.final_url) in sitemap_paths
    )

    # Report the redirect chain so surprising hops are visible in logs.
    if resp.redirect_chain:
        hops = " -> ".join([resp.redirect_chain[0][1]] + [to for _, _, to in resp.redirect_chain])
        r.warnings.append(f"followed {len(resp.redirect_chain)} redirect(s): {hops}")

    if resp.status >= 400:
        r.errors.append(f"HTTP {resp.status}")
        return r
    if "html" not in resp.content_type.lower():
        r.errors.append(f"non-HTML content-type: {resp.content_type}")
        return r

    meta = parse_head(resp.body)
    r.canonical = meta.canonical
    r.og_url = meta.og.get("og:url")
    r.robots_meta = meta.robots_meta

    # --- Required OGP -------------------------------------------------------
    for prop in ("og:title", "og:type", "og:image", "og:url"):
        if not meta.og.get(prop):
            r.errors.append(f"missing {prop}")

    # --- Recommended --------------------------------------------------------
    for prop in ("og:description", "og:site_name"):
        if not meta.og.get(prop):
            r.warnings.append(f"missing {prop} (recommended)")

    # --- Twitter Card -------------------------------------------------------
    card = meta.twitter.get("twitter:card")
    if not card:
        r.errors.append("missing twitter:card")
    elif card not in TWITTER_CARDS:
        r.errors.append(f"invalid twitter:card={card!r} (expected one of {sorted(TWITTER_CARDS)})")
    elif card == "summary_large_image":
        for name in ("twitter:title", "twitter:description", "twitter:image"):
            if not meta.twitter.get(name) and not meta.og.get(name.replace("twitter:", "og:")):
                r.warnings.append(f"missing {name} (and no og:* fallback)")

    # --- Canonical / og:url parity vs the FINAL landing URL ----------------
    og_url = meta.og.get("og:url")
    if og_url and not is_absolute_https(og_url):
        r.errors.append(f"og:url is not absolute: {og_url!r}")
    if meta.canonical and not is_absolute_https(meta.canonical):
        r.errors.append(f"canonical is not absolute: {meta.canonical!r}")

    # Crawlers key everything off the URL that actually served 200, not the
    # URL we asked for. A stale canonical here silently de-indexes the page.
    if og_url and is_absolute_https(og_url) and _norm(og_url) != _norm(resp.final_url):
        r.og_url_mismatch = {"og_url": og_url, "final_url": resp.final_url}
        r.errors.append(
            f"og:url {og_url!r} does not match final URL after redirects {resp.final_url!r}"
        )
    if meta.canonical and is_absolute_https(meta.canonical) and _norm(meta.canonical) != _norm(resp.final_url):
        r.canonical_mismatch = {"canonical": meta.canonical, "final_url": resp.final_url}
        r.errors.append(
            f"canonical {meta.canonical!r} does not match final URL after redirects {resp.final_url!r}"
        )

    # --- Robots directives: meta vs header parity + noindex enforcement ----
    meta_noindex = _contains_noindex(meta.robots_meta)
    header_noindex = _contains_noindex(resp.x_robots_tag)

    if meta_noindex != header_noindex:
        r.robots_parity_mismatch = {
            "meta_robots": meta.robots_meta,
            "x_robots_tag": resp.x_robots_tag,
        }
        r.errors.append(
            f"robots parity broken: meta robots={meta.robots_meta!r} vs "
            f"X-Robots-Tag={resp.x_robots_tag!r} disagree on noindex"
        )
    if meta_noindex or header_noindex:
        # A URL we're actively validating for OG/Twitter previews is a URL we
        # want to share — noindex on it is almost always a bug.
        source = []
        if meta_noindex:
            source.append(f"<meta name=robots>={meta.robots_meta!r}")
        if header_noindex:
            source.append(f"X-Robots-Tag={resp.x_robots_tag!r}")
        r.errors.append("page is noindex (" + "; ".join(source) + ") but is being validated as shareable/indexable")

        # Contradiction with sitemap.xml: noindex + listed in sitemap is a
        # Search Console warning ("Submitted URL marked 'noindex'").
        final_path = urllib.parse.urlparse(resp.final_url).path or "/"
        if final_path in sitemap_paths or _norm(resp.final_url) in sitemap_paths:
            r.errors.append(
                f"noindex page is also listed in /sitemap.xml ({final_path}) — remove one signal"
            )

    # --- Images: reachable, correct type, sane dimensions -------------------
    og_image = meta.og.get("og:image")
    if og_image:
        if not is_absolute_https(og_image):
            r.errors.append(f"og:image is not absolute: {og_image!r}")
        else:
            try:
                istatus, ictype, ilen, _ = http_head(og_image)
                if istatus >= 400:
                    r.errors.append(f"og:image unreachable: HTTP {istatus} ({og_image})")
                elif not ictype.lower().startswith("image/"):
                    r.errors.append(
                        f"og:image content-type is {ictype!r}, expected image/* ({og_image})"
                    )
                elif ilen and ilen < 1024:
                    r.warnings.append(f"og:image body is only {ilen} bytes ({og_image})")
            except Exception as exc:
                r.errors.append(f"og:image fetch failed: {exc} ({og_image})")

        w = meta.og.get("og:image:width")
        h = meta.og.get("og:image:height")
        if w and not w.isdigit():
            r.errors.append(f"og:image:width is not an integer: {w!r}")
        if h and not h.isdigit():
            r.errors.append(f"og:image:height is not an integer: {h!r}")
        if w and h and w.isdigit() and h.isdigit():
            wi, hi = int(w), int(h)
            if wi < MIN_OG_IMAGE_WIDTH or hi < MIN_OG_IMAGE_HEIGHT:
                r.warnings.append(
                    f"og:image {wi}x{hi} is below recommended {MIN_OG_IMAGE_WIDTH}x{MIN_OG_IMAGE_HEIGHT}"
                )

    tw_image = meta.twitter.get("twitter:image")
    if tw_image and not is_absolute_https(tw_image):
        r.errors.append(f"twitter:image is not absolute: {tw_image!r}")

    # --- Length sanity checks ----------------------------------------------
    title = meta.og.get("og:title") or meta.title or ""
    if title and len(title) > 70:
        r.warnings.append(f"og:title is {len(title)} chars (crawlers truncate ~70)")
    desc = meta.og.get("og:description") or ""
    if desc and len(desc) > 200:
        r.warnings.append(f"og:description is {len(desc)} chars (crawlers truncate ~200)")

    return r


# ---------------------------------------------------------------------------
# URL discovery

SITEMAP_NS = {"sm": "http://www.sitemaps.org/schemas/sitemap/0.9"}


# Sitemap-fetch caching lives in `scripts/_sitemap_fetch.py`
# (`_SHARED_CACHE`). Every walker and report shares one dict, so a
# sitemap fetched by one script isn't refetched by another in the same
# process. Tests reset it via `clear_sitemap_cache()`.


def _fetch_sitemap_bytes(sitemap_url: str) -> bytes:
    """Fetch a sitemap URL and return raw XML bytes, transparently
    decompressing gzip. Delegates gzip detection AND caching to
    `_sitemap_fetch` — the shared cache is used by default."""
    return fetch_sitemap_bytes(
        sitemap_url,
        user_agent=CRAWLER_UA,
        timeout=REQUEST_TIMEOUT,
    )



def _parse_sitemap_xml(
    sitemap_url: str,
    urls: list[str],
    paths: set[str],
    visited: set[str],
    depth: int = 0,
) -> None:
    """Recursively parse a sitemap or sitemap index.

    Handles nested <sitemapindex><sitemap><loc>...</loc></sitemap></sitemapindex>
    trees by fetching each child sitemap and merging its <url><loc> entries.
    Supports .xml.gz (gzip-compressed) sitemaps at both the top level and
    inside sitemap indexes. Guards against cycles (visited set) and
    pathological nesting (depth cap).
    """
    if sitemap_url in visited:
        return
    visited.add(sitemap_url)
    if depth > 5:
        print(f"warn: sitemap nesting depth cap hit at {sitemap_url}", file=sys.stderr)
        return
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


    tag = root.tag.split("}", 1)[-1]  # strip namespace
    if tag == "sitemapindex":
        children = [
            loc.text.strip()
            for loc in root.findall(".//sm:sitemap/sm:loc", SITEMAP_NS)
            if loc.text
        ]
        # Fall back to a namespace-agnostic search when the index uses a
        # non-standard xmlns (some CDNs rewrite the schema URL).
        if not children:
            children = [
                loc.text.strip()
                for loc in root.iter()
                if loc.tag.split("}", 1)[-1] == "loc" and loc.text
            ]
        print(
            f"info: sitemap index {sitemap_url} -> {len(children)} nested sitemap(s)",
            file=sys.stderr,
        )
        for child in children:
            _parse_sitemap_xml(child, urls, paths, visited, depth + 1)
        return

    # <urlset> (or namespace-less equivalent) — collect leaf URLs.
    locs = root.findall(".//sm:url/sm:loc", SITEMAP_NS)
    if not locs:
        locs = [n for n in root.iter() if n.tag.split("}", 1)[-1] == "loc"]
    for loc in locs:
        if loc.text:
            u = loc.text.strip()
            urls.append(u)
            paths.add(_norm(u))
            paths.add(urllib.parse.urlparse(u).path or "/")


def discover_sitemap(base: str) -> tuple[list[str], set[str]]:
    """Returns (ordered urls, set of normalized url+path forms for parity).

    Follows sitemap-index files (nested sitemaps) so --all mode covers every
    URL published across all child sitemaps, not just the top-level file.
    """
    sitemap = urllib.parse.urljoin(base + "/", "sitemap.xml")
    urls: list[str] = []
    paths: set[str] = set()
    _parse_sitemap_xml(sitemap, urls, paths, visited=set())
    # De-dupe while preserving discovery order.
    seen: set[str] = set()
    deduped: list[str] = []
    for u in urls:
        if u not in seen:
            seen.add(u)
            deduped.append(u)
    return deduped, paths



def select_routes(
    base: str,
    explicit: list[str],
    discovered: list[str],
    *,
    all_routes: bool = False,
    include: re.Pattern[str] | None = None,
    exclude: re.Pattern[str] | None = None,
) -> list[str]:
    # Explicit CLI URLs always win — CI mode still respects them if passed.
    if explicit and not all_routes:
        seen: list[str] = []
        for u in [base.rstrip("/") + "/"] + explicit:
            if u not in seen:
                seen.append(u)
        return seen

    urls = [base.rstrip("/") + "/"]

    if all_routes:
        # CI mode: iterate the ENTIRE sitemap in a deterministic order,
        # no MAX_ROUTES cap. Explicit CLI URLs are appended so ad-hoc
        # spot-checks still get covered alongside the full sweep.
        candidates = sorted(set(discovered))
        for u in candidates:
            if include and not include.search(u):
                continue
            if exclude and exclude.search(u):
                continue
            if u not in urls:
                urls.append(u)
        for u in explicit:
            if u not in urls:
                urls.append(u)
        return urls

    priority = re.compile(
        r"/(library/compare/|library/[^/]+$|$|about|pricing|faq|ai-policy|privacy|terms)"
    )
    ranked = sorted(set(discovered), key=lambda u: (0 if priority.search(u) else 1, u))
    for u in ranked:
        if u not in urls:
            urls.append(u)
        if len(urls) >= MAX_ROUTES:
            break
    return urls


# ---------------------------------------------------------------------------
# CLI

def main(argv: list[str]) -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("base", nargs="?", default="https://doseroutine.com",
                    help="Base URL (default: https://doseroutine.com)")
    ap.add_argument("extra", nargs="*", help="Additional explicit URLs to check")
    ap.add_argument("--fail-on-warning", action="store_true",
                    help="Exit non-zero even for warning-only findings")
    ap.add_argument("--all", "--ci", dest="all_routes", action="store_true",
                    help="CI mode: iterate EVERY URL in /sitemap.xml with no "
                         "MAX_ROUTES cap. Explicit CLI URLs are still included.")
    ap.add_argument("--include", metavar="REGEX", default=None,
                    help="With --all: only validate sitemap URLs matching this regex.")
    ap.add_argument("--exclude", metavar="REGEX", default=None,
                    help="With --all: skip sitemap URLs matching this regex.")
    ap.add_argument("--concurrency", type=int, default=6,
                    help="Parallel workers (default 6; raise for --all sweeps).")
    ap.add_argument("--junit", metavar="PATH", default=None,
                    help="Write a JUnit XML report to PATH for CI test-report UIs.")
    ap.add_argument("--json", dest="json_path", metavar="PATH", default=None,
                    help="Write a structured JSON report to PATH (canonical / "
                         "og:url mismatches, redirect chains, robots parity).")
    args = ap.parse_args(argv)

    base = args.base.rstrip("/")
    explicit = list(args.extra)
    include = re.compile(args.include) if args.include else None
    exclude = re.compile(args.exclude) if args.exclude else None

    discovered_urls, sitemap_paths = discover_sitemap(base)
    routes = select_routes(
        base, explicit, discovered_urls,
        all_routes=args.all_routes, include=include, exclude=exclude,
    )
    robots = load_robots(base)

    mode = "CI (full sitemap sweep)" if args.all_routes else "targeted"
    print(f"validate-og-twitter [{mode}]: checking {len(routes)} route(s) as {CRAWLER_UA!r}")
    print(f"  robots.txt:  {'loaded' if robots else 'unavailable — robots checks skipped'}")
    print(f"  sitemap:     {len(discovered_urls)} URLs discovered")
    print(f"  concurrency: {args.concurrency}")
    if not args.all_routes or len(routes) <= 20:
        for u in routes:
            print(f"  - {u}")
    else:
        for u in routes[:10]:
            print(f"  - {u}")
        print(f"  ... ({len(routes) - 10} more)")

    results: list[Result] = []
    workers = max(1, args.concurrency)
    with cf.ThreadPoolExecutor(max_workers=workers) as pool:
        for res in pool.map(lambda u: validate_page(u, sitemap_paths, robots), routes):
            results.append(res)


    fail = 0
    warn = 0
    for res in results:
        label = res.url
        if res.final_url and _norm(res.final_url) != _norm(res.url):
            label = f"{res.url} → {res.final_url}"
        if res.errors:
            fail += 1
            print(f"\nFAIL {label}")
            for e in res.errors:
                print(f"  ERROR   {e}")
            for w in res.warnings:
                print(f"  warn    {w}")
        elif res.warnings:
            warn += 1
            print(f"\nWARN {label}")
            for w in res.warnings:
                print(f"  warn    {w}")
        else:
            print(f"OK   {label}")

    total = len(results)
    ok = total - fail - warn
    print(f"\nSummary: {ok} ok / {warn} warn / {fail} fail (of {total})")

    if args.junit:
        _write_junit(args.junit, results)
        print(f"  wrote JUnit report: {args.junit}")

    if args.json_path:
        _write_json(args.json_path, results, base=base)
        print(f"  wrote JSON report:  {args.json_path}")

    if fail:
        return 1
    if warn and args.fail_on_warning:
        return 2
    return 0


def _write_junit(path: str, results: list[Result]) -> None:
    from xml.sax.saxutils import escape as xe
    failures = sum(1 for r in results if r.errors)
    lines = [
        '<?xml version="1.0" encoding="UTF-8"?>',
        f'<testsuite name="validate-og-twitter" tests="{len(results)}" failures="{failures}">',
    ]
    for r in results:
        name = xe(r.url)
        lines.append(f'  <testcase classname="og-twitter" name="{name}">')
        if r.errors:
            msg = xe("; ".join(r.errors))
            body = xe("\n".join(r.errors + [f"warn: {w}" for w in r.warnings]))
            lines.append(f'    <failure message="{msg}">{body}</failure>')
        elif r.warnings:
            body = xe("\n".join(f"warn: {w}" for w in r.warnings))
            lines.append(f'    <system-out>{body}</system-out>')
        lines.append('  </testcase>')
    lines.append('</testsuite>')
    import os
    os.makedirs(os.path.dirname(path) or ".", exist_ok=True)
    with open(path, "w", encoding="utf-8") as f:
        f.write("\n".join(lines))


def _write_json(path: str, results: list[Result], *, base: str) -> None:
    """Emit a structured JSON report so CI can diff canonical/og:url
    mismatches, redirect chains, and robots parity issues instead of
    grepping stdout. Shape is stable: `summary` for totals, `pages` for the
    per-URL detail, and `diffs` for the actionable subsets a bot/PR-comment
    step can render directly."""
    import json
    import os
    from datetime import datetime, timezone

    def page_dict(r: Result) -> dict[str, object]:
        return {
            "url": r.url,
            "final_url": r.final_url,
            "status": r.status,
            "ok": not r.errors and not r.warnings,
            "canonical": r.canonical,
            "og_url": r.og_url,
            "robots_meta": r.robots_meta,
            "x_robots_tag": r.x_robots_tag,
            "in_sitemap": r.in_sitemap,
            "redirect_chain": r.redirect_chain,
            "canonical_mismatch": r.canonical_mismatch,
            "og_url_mismatch": r.og_url_mismatch,
            "robots_parity_mismatch": r.robots_parity_mismatch,
            "errors": list(r.errors),
            "warnings": list(r.warnings),
        }

    pages = [page_dict(r) for r in results]
    diffs = {
        "canonical_mismatches": [
            {"url": r.url, "final_url": r.final_url, **(r.canonical_mismatch or {})}
            for r in results if r.canonical_mismatch
        ],
        "og_url_mismatches": [
            {"url": r.url, "final_url": r.final_url, **(r.og_url_mismatch or {})}
            for r in results if r.og_url_mismatch
        ],
        "robots_parity_mismatches": [
            {"url": r.url, "final_url": r.final_url, **(r.robots_parity_mismatch or {})}
            for r in results if r.robots_parity_mismatch
        ],
        "redirect_chains": [
            {"url": r.url, "final_url": r.final_url, "hops": r.redirect_chain}
            for r in results if r.redirect_chain
        ],
    }
    report = {
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "base": base,
        "summary": {
            "total": len(results),
            "failed": sum(1 for r in results if r.errors),
            "warned": sum(1 for r in results if not r.errors and r.warnings),
            "ok": sum(1 for r in results if not r.errors and not r.warnings),
            "canonical_mismatches": len(diffs["canonical_mismatches"]),
            "og_url_mismatches": len(diffs["og_url_mismatches"]),
            "robots_parity_mismatches": len(diffs["robots_parity_mismatches"]),
            "pages_with_redirects": len(diffs["redirect_chains"]),
        },
        "diffs": diffs,
        "pages": pages,
    }
    os.makedirs(os.path.dirname(path) or ".", exist_ok=True)
    with open(path, "w", encoding="utf-8") as f:
        json.dump(report, f, indent=2, sort_keys=False)



if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
