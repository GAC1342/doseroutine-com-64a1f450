#!/usr/bin/env python3
"""Internal link crawl: orphan pages + broken/incorrect anchors.

Crawls every sitemap URL (server-rendered HTML), collects every internal
<a href>, then reports:

  * broken links        — anchor target returns 4xx/5xx or fails to load
  * redirecting links   — anchor points at a URL that 301/302/308s (fix the
                          href so users and crawlers skip the hop)
  * orphan pages        — indexable sitemap URLs with zero inbound internal
                          links from any other page
  * bad hrefs           — http:// links to our own site, absolute
                          https://doseroutine.com links that should be
                          relative, "#" / empty hrefs, dead #fragments
  * weak anchor text    — empty, "click here"/"read more"/"here", or a bare
                          URL used as the link label

Everything is merged into one prioritized fix list (P0 > P1 > P2) and
optionally written as JSON for CI artifacts.

    python3 scripts/internal-link-crawl.py                      # localhost:8080
    python3 scripts/internal-link-crawl.py https://doseroutine.com
    python3 scripts/internal-link-crawl.py --json /tmp/links.json
    python3 scripts/internal-link-crawl.py --max 200            # sample crawl

Exit code is 1 when any P0 issue exists (broken link or orphan page).
"""
from __future__ import annotations

import json
import re
import sys
import urllib.error
import urllib.parse
import urllib.request
from concurrent.futures import ThreadPoolExecutor
from html.parser import HTMLParser

SITE = "https://doseroutine.com"
UA = {"User-Agent": "Googlebot"}

_ARGS = sys.argv[1:]
BASE = next((a for a in _ARGS if a.startswith("http")), "http://localhost:8080")
JSON_OUT = None
if "--json" in _ARGS:
    JSON_OUT = _ARGS[_ARGS.index("--json") + 1]
MAX_PAGES = 0
if "--max" in _ARGS:
    MAX_PAGES = int(_ARGS[_ARGS.index("--max") + 1])

WEAK_ANCHORS = {
    "", "here", "click here", "read more", "more", "link", "this", "learn more >",
    ">", "→", "...",
}
# Paths intentionally unreachable from public navigation (auth-gated app
# surfaces, machine endpoints). They are never reported as orphans.
ORPHAN_ALLOW = re.compile(
    r"^/(admin|app|onboarding|auth|account|checkout|debug|lovable)(/|$)"
)


class NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):  # noqa: D102
        return None


_opener = urllib.request.build_opener(NoRedirect)


def fetch(path: str, method: str = "GET") -> tuple[int, str, str]:
    """Return (status, body, location). Redirects are not followed."""
    url = BASE + path if path.startswith("/") else path
    req = urllib.request.Request(url, headers=UA, method=method)
    try:
        with _opener.open(req, timeout=60) as r:
            body = r.read().decode("utf-8", "replace") if method == "GET" else ""
            return r.status, body, ""
    except urllib.error.HTTPError as e:
        return e.code, "", e.headers.get("Location", "") or ""
    except Exception as e:  # noqa: BLE001
        return 0, f"ERROR {e}", ""


class Anchors(HTMLParser):
    """Collect (href, anchor_text, rel) plus every id/name on the page."""

    def __init__(self) -> None:
        super().__init__()
        self.links: list[dict] = []
        self.ids: set[str] = set()
        self._stack: list[dict] = []
        self.noindex = False

    def handle_starttag(self, tag, attrs):
        a = dict(attrs)
        if a.get("id"):
            self.ids.add(a["id"])
        if tag == "a" and a.get("name"):
            self.ids.add(a["name"])
        if tag == "meta" and (a.get("name") or "").lower() == "robots":
            if "noindex" in (a.get("content") or "").lower():
                self.noindex = True
        if tag == "a":
            entry = {"href": (a.get("href") or "").strip(), "text": "", "rel": a.get("rel", "")}
            self._stack.append(entry)
            self.links.append(entry)
        if tag == "img" and self._stack and a.get("alt"):
            self._stack[-1]["text"] += " " + a["alt"]
        if tag == "a" and a.get("aria-label") and self._stack:
            self._stack[-1]["text"] += " " + a["aria-label"]

    def handle_endtag(self, tag):
        if tag == "a" and self._stack:
            self._stack.pop()

    def handle_data(self, d):
        if self._stack:
            self._stack[-1]["text"] += d


def normalize(href: str, page: str) -> tuple[str | None, str, list[str]]:
    """Return (internal_path or None, fragment, href-quality issues)."""
    issues: list[str] = []
    raw = href.strip()
    if not raw or raw == "#":
        return None, "", ["empty href"]
    low = raw.lower()
    if low.startswith(("mailto:", "tel:", "javascript:", "data:", "sms:")):
        return None, "", []
    if low.startswith("http://"):
        host = urllib.parse.urlparse(raw).netloc
        if "doseroutine" in host:
            issues.append("insecure http:// link to our own site")
        else:
            return None, "", []
    parsed = urllib.parse.urlparse(raw)
    if parsed.scheme in ("http", "https"):
        if "doseroutine" not in parsed.netloc:
            return None, "", []  # external link, out of scope
        path = parsed.path or "/"
    elif raw.startswith("#"):
        return page, raw[1:], []
    elif raw.startswith("/"):
        path = parsed.path
    else:
        path = urllib.parse.urljoin(page, parsed.path)
    if path != "/" and path.endswith("/"):
        issues.append("trailing slash (canonical URLs have none)")
        path = path.rstrip("/")
    if "//" in path:
        issues.append("double slash in path")
        path = re.sub(r"/{2,}", "/", path)
    if parsed.query:
        path += "?" + parsed.query
    return path, parsed.fragment, issues


def main() -> int:  # noqa: C901
    status, sm, _ = fetch("/sitemap.xml")
    locs = re.findall(r"<loc>([^<]+)</loc>", sm)
    pages = []
    seen = set()
    for u in locs:
        p = u.replace(SITE, "") or "/"
        if p.endswith(".xml"):
            continue
        if p not in seen:
            seen.add(p)
            pages.append(p)
    if MAX_PAGES:
        pages = pages[:MAX_PAGES]
    print(f"crawling {len(pages)} sitemap page(s) from {BASE}")

    inbound: dict[str, set[str]] = {p: set() for p in pages}
    page_ids: dict[str, set[str]] = {}
    findings: list[dict] = []
    edges: list[tuple[str, str, str, str]] = []  # page, path, fragment, text

    def add(priority: str, kind: str, page: str, detail: str, fix: str) -> None:
        findings.append(
            {"priority": priority, "kind": kind, "page": page, "detail": detail, "fix": fix}
        )

    def crawl(page: str) -> None:
        code, html, _ = fetch(page)
        if code == 0:
            code, html, _ = fetch(page)  # one retry: slow CMS-backed routes
        if code != 200:
            add("P0", "page not 200", page, f"status {code}",
                "Remove from sitemap or restore the route.")
            return
        parser = Anchors()
        parser.feed(html)
        page_ids[page] = parser.ids
        if parser.noindex:
            inbound.pop(page, None)
        for link in parser.links:
            rel = link["rel"] if isinstance(link["rel"], str) else " ".join(link["rel"])
            if "canonical" in rel.lower():
                continue  # visible self-canonical link, not navigation
            path, frag, issues = normalize(link["href"], page)
            text = " ".join(link["text"].split())
            for issue in issues:
                add("P1", "incorrect href", page,
                    f'<a href="{link["href"][:120]}"> — {issue}',
                    "Use a root-relative, slash-free path (e.g. /peptides/bpc-157).")
            if path is None:
                continue
            if link["href"].startswith(SITE):
                add("P2", "absolute internal link", page,
                    f'<a href="{link["href"][:120]}">',
                    "Link internally with a relative path so previews and staging work.")
            clean = path.split("?")[0]
            # Sitemap URLs may carry a query (e.g. /blog?page=2); credit the
            # exact URL when it is one, otherwise the path.
            target = path if path in inbound else clean
            if target in inbound and target != page:
                inbound[target].add(page)
            edges.append((page, clean, frag, text))
            label = text.strip().lower()
            if (label in WEAK_ANCHORS or re.fullmatch(r"https?://\S+", label or "")) and clean != page:
                add("P2", "weak anchor text", page,
                    f'link to {clean} labelled "{text[:40]}"',
                    "Use descriptive anchor text containing the target page's topic.")


    with ThreadPoolExecutor(max_workers=5) as ex:
        list(ex.map(crawl, pages))

    # ---- validate every distinct link target once -------------------------
    targets = sorted({e[1] for e in edges})
    target_status: dict[str, tuple[int, str]] = {}

    def probe(path: str) -> None:
        if path in inbound:  # already crawled with 200
            target_status[path] = (200, "")
            return
        code, _, loc = fetch(path, method="HEAD")
        if code in (0, 400, 405, 501):
            code, _, loc = fetch(path)
        target_status[path] = (code, loc)

    with ThreadPoolExecutor(max_workers=5) as ex:
        list(ex.map(probe, targets))

    sources: dict[str, set[str]] = {}
    for page, path, frag, _ in edges:
        sources.setdefault(path, set()).add(page)

    for path in targets:
        code, loc = target_status[path]
        srcs = sorted(sources.get(path, ()))[:5]
        where = ", ".join(srcs)
        if code == 0 or code >= 400:
            add("P0", "broken link", where or "?", f"{path} → status {code}",
                "Fix or remove the href; point it at a live route.")
        elif code in (301, 302, 307, 308):
            add("P1", "redirecting link", where or "?",
                f"{path} → {code} {loc}",
                f"Link straight to {loc or 'the final URL'} to remove the hop.")

    # ---- dead fragments ---------------------------------------------------
    for page, path, frag, _ in edges:
        # Links carrying a query string render conditional sections, so the
        # base URL's HTML can't prove the anchor is dead.
        if not frag or "?" in path or path not in page_ids:
            continue
        if frag not in page_ids[path]:
            add("P1", "dead anchor fragment", page, f"{path}#{frag} has no matching id",
                f'Add id="{frag}" to the target section or drop the fragment.')

    # ---- orphans ----------------------------------------------------------
    for page, srcs in sorted(inbound.items()):
        if page == "/" or ORPHAN_ALLOW.match(page):
            continue
        if not srcs:
            add("P0", "orphan page", page, "no inbound internal links",
                "Link it from its hub/pillar page, a related guide, and the sitemap nav.")
        elif len(srcs) == 1:
            add("P2", "thin inbound linking", page, f"only 1 inbound link ({next(iter(srcs))})",
                "Add 2-3 contextual links from related pages to strengthen crawl paths.")

    # ---- report -----------------------------------------------------------
    order = {"P0": 0, "P1": 1, "P2": 2}
    findings.sort(key=lambda f: (order[f["priority"]], f["kind"], f["page"]))
    counts = {p: sum(1 for f in findings if f["priority"] == p) for p in ("P0", "P1", "P2")}

    print(f"\ninternal links: {len(edges)} anchors → {len(targets)} distinct targets")
    print(f"findings: P0 {counts['P0']}  P1 {counts['P1']}  P2 {counts['P2']}\n")
    print("prioritized fix list")
    print("=" * 72)
    shown: dict[str, int] = {}
    for f in findings:
        key = f["priority"] + f["kind"]
        shown[key] = shown.get(key, 0) + 1
        if shown[key] > 15:
            continue
        print(f"[{f['priority']}] {f['kind']}: {f['page']}")
        print(f"       {f['detail']}")
        print(f"       fix: {f['fix']}")
    for key, n in shown.items():
        if n > 15:
            print(f"... {n - 15} more {key[2:]} findings ({key[:2]})")
    if not findings:
        print("clean — no orphans, broken links, or bad anchors.")

    if JSON_OUT:
        with open(JSON_OUT, "w", encoding="utf-8") as fh:
            json.dump({"base": BASE, "counts": counts, "findings": findings}, fh, indent=2)
        print(f"\nwrote {JSON_OUT}")

    return 1 if counts["P0"] else 0


if __name__ == "__main__":
    raise SystemExit(main())
