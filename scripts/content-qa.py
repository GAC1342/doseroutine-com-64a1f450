#!/usr/bin/env python3
"""Content QA for /peptides/* and /articles/* routes.

For every guide/article URL in the sitemap, verifies the things Google and
AI answer engines need in order to quote a page:

  * heading structure — exactly one <h1>, non-empty, no heading-level skips
    (h2 -> h4), at least MIN_H2 unique <h2> section headings
  * FAQ coverage      — at least MIN_FAQ question-shaped items, either as
    FAQPage JSON-LD or as visible question headings ("How ...?", "What ...?")
  * content coverage  — minimum visible word count and minimum body text
    under the headings (not just nav/footer chrome)
  * answer readiness  — an intro paragraph of >= 40 words before the first
    <h2>, so extractive answers have something to lift

    python3 scripts/content-qa.py                       # localhost:8080
    python3 scripts/content-qa.py https://doseroutine.com
    python3 scripts/content-qa.py --json /tmp/content-qa.json

Exits 1 when any route fails a hard threshold.
"""
from __future__ import annotations

import json
import re
import sys
import urllib.request
from concurrent.futures import ThreadPoolExecutor
from html.parser import HTMLParser

SITE = "https://doseroutine.com"
_ARGS = sys.argv[1:]
BASE = next((a for a in _ARGS if a.startswith("http")), "http://localhost:8080")
JSON_OUT = _ARGS[_ARGS.index("--json") + 1] if "--json" in _ARGS else None

PREFIXES = ("/peptides", "/articles")
MIN_WORDS = 600          # visible words on the page
MIN_BODY_WORDS = 400     # words that sit after the first h1
MIN_H2 = 3
MIN_FAQ = 5
MIN_INTRO_WORDS = 40

# /articles/* bodies and their FAQ blocks come from the editorial CMS, so a
# missing FAQ there is a content task rather than a code regression. CI passes
# --cms-faq-warn so the build stays green while the gap is still reported.
CMS_FAQ_WARN = "--cms-faq-warn" in _ARGS
CMS_PREFIX = "/articles/"

QUESTION = re.compile(r"^(how|what|why|when|where|which|who|can|do|does|is|are|should|will)\b.*\?$", re.I)



def fetch(path: str) -> tuple[int, str]:
    req = urllib.request.Request(BASE + path, headers={"User-Agent": "Googlebot"})
    try:
        with urllib.request.urlopen(req, timeout=90) as r:
            return r.status, r.read().decode("utf-8", "replace")
    except Exception as e:  # noqa: BLE001
        return 0, f"ERROR {e}"


class Doc(HTMLParser):
    def __init__(self) -> None:
        super().__init__()
        self._skip = 0
        self._heading: str | None = None
        self.text: list[str] = []
        self.headings: list[tuple[int, str]] = []
        self._buf = ""
        self.first_h1_index: int | None = None

    def handle_starttag(self, tag, attrs):
        if tag in ("script", "style", "noscript", "svg"):
            self._skip += 1
        if re.fullmatch(r"h[1-6]", tag):
            self._heading = tag
            self._buf = ""

    def handle_endtag(self, tag):
        if tag in ("script", "style", "noscript", "svg") and self._skip:
            self._skip -= 1
        if self._heading == tag:
            self.headings.append((int(tag[1]), " ".join(self._buf.split())))
            self._heading = None

    def handle_data(self, d):
        if self._skip:
            return
        self.text.append(d)
        if self._heading:
            self._buf += d


def jsonld_faq(html: str) -> list[str]:
    out: list[str] = []

    def walk(node):
        if isinstance(node, list):
            for n in node:
                walk(n)
        elif isinstance(node, dict):
            for key in ("@graph", "mainEntity", "itemListElement", "hasPart"):
                if key in node:
                    walk(node[key])
            t = node.get("@type")
            types = t if isinstance(t, list) else [t]
            if "Question" in types and node.get("name"):
                out.append(str(node["name"]))

    for m in re.finditer(
        r'<script[^>]+type=["\']application/ld\+json["\'][^>]*>(.*?)</script>', html, re.S | re.I
    ):
        try:
            walk(json.loads(m.group(1).strip()))
        except Exception:  # noqa: BLE001
            continue
    return out


def visible_questions(headings, text: str) -> list[str]:
    qs = [h for _, h in headings if QUESTION.match(h.strip())]
    # question text rendered in accordions/summary elements, not headings
    qs += re.findall(r"([A-Z][^.?!<>]{12,120}\?)", text)
    seen, out = set(), []
    for q in qs:
        k = q.strip().lower()
        if k not in seen:
            seen.add(k)
            out.append(q.strip())
    return out


def audit(path: str) -> dict:
    status, html = fetch(path)
    res = {"path": path, "errors": [], "warnings": [], "stats": {}}
    if status != 200:
        res["errors"].append(f"status {status}")
        return res

    doc = Doc()
    doc.feed(html)
    text = " ".join(doc.text)
    words = len(text.split())
    h1s = [h for lvl, h in doc.headings if lvl == 1]
    h2s = [h for lvl, h in doc.headings if lvl == 2]

    # body text = everything after the first h1 heading string
    body_words = words
    if h1s:
        idx = text.find(h1s[0])
        if idx >= 0:
            body_words = len(text[idx:].split())

    faq = jsonld_faq(html)
    faq_source = "JSON-LD"
    if len(faq) < MIN_FAQ:
        visible = visible_questions(doc.headings, text)
        if len(visible) > len(faq):
            faq, faq_source = visible, "visible headings"

    res["stats"] = {
        "words": words,
        "bodyWords": body_words,
        "h1": len(h1s),
        "h2": len(h2s),
        "faq": len(faq),
        "faqSource": faq_source,
    }

    if len(h1s) != 1:
        res["errors"].append(f"expected exactly 1 <h1>, found {len(h1s)}")
    elif not h1s[0].strip():
        res["errors"].append("<h1> is empty")
    unique_h2 = {h.strip().lower() for h in h2s if h.strip()}
    if len(unique_h2) < MIN_H2:
        res["errors"].append(f"only {len(unique_h2)} unique <h2> sections (need {MIN_H2})")
    if len(unique_h2) != len(h2s):
        res["warnings"].append("duplicate <h2> text — make each section heading distinct")

    levels = [lvl for lvl, _ in doc.headings]
    for prev, cur in zip(levels, levels[1:]):
        if cur > prev + 1:
            res["warnings"].append(f"heading level skip h{prev} -> h{cur}")
            break

    if len(faq) < MIN_FAQ:
        msg = (
            f"only {len(faq)} FAQ question(s) (need {MIN_FAQ}) — add an FAQ block with "
            "FAQPage JSON-LD"
        )
        if CMS_FAQ_WARN and path.startswith(CMS_PREFIX):
            res["warnings"].append(msg + " (edit the article in the CMS)")
        else:
            res["errors"].append(msg)

    if words < MIN_WORDS:
        res["errors"].append(f"thin content: {words} visible words (need {MIN_WORDS})")
    if body_words < MIN_BODY_WORDS:
        res["errors"].append(f"thin body: {body_words} words after the <h1> (need {MIN_BODY_WORDS})")

    if h1s and h2s:
        start = text.find(h1s[0])
        end = text.find(h2s[0], start + 1)
        intro = text[start + len(h1s[0]): end] if end > start else ""
        if len(intro.split()) < MIN_INTRO_WORDS:
            res["warnings"].append(
                f"intro before the first <h2> is {len(intro.split())} words — "
                f"write a {MIN_INTRO_WORDS}+ word direct answer for AI extraction"
            )
    return res


def main() -> int:
    _, sm = fetch("/sitemap.xml")
    locs = re.findall(r"<loc>([^<]+)</loc>", sm)
    paths = sorted({
        (u.replace(SITE, "") or "/")
        for u in locs
        if (u.replace(SITE, "") or "/").startswith(PREFIXES)
        and not u.endswith(".xml")
    })
    print(f"content QA: {len(paths)} /peptides + /articles route(s) on {BASE}\n")

    with ThreadPoolExecutor(max_workers=6) as ex:
        results = list(ex.map(audit, paths))

    failed = [r for r in results if r["errors"]]
    warned = [r for r in results if r["warnings"] and not r["errors"]]

    for r in results:
        s = r["stats"]
        flag = "FAIL" if r["errors"] else ("warn" if r["warnings"] else "ok  ")
        summary = (
            f"h1={s.get('h1', '-')} h2={s.get('h2', '-')} faq={s.get('faq', '-')} "
            f"words={s.get('words', '-')}"
        ) if s else ""
        if r["errors"] or r["warnings"]:
            print(f"{flag} {r['path']}  {summary}")
            for e in r["errors"]:
                print(f"       error: {e}")
            for w in r["warnings"]:
                print(f"       warn:  {w}")

    print(
        f"\n{len(results) - len(failed)}/{len(results)} routes pass "
        f"({len(failed)} failing, {len(warned)} with warnings only)"
    )

    if JSON_OUT:
        with open(JSON_OUT, "w", encoding="utf-8") as fh:
            json.dump({"base": BASE, "results": results}, fh, indent=2)
        print(f"wrote {JSON_OUT}")

    return 1 if failed else 0


if __name__ == "__main__":
    raise SystemExit(main())
