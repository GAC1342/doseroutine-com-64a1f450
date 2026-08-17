#!/usr/bin/env python3
"""
SEO audit changelog generator.

Crawls every URL in the live sitemap, captures a normalized snapshot
(title, meta description, canonical, robots, og:*, twitter:*, jsonld @types,
h1 count, status), then diffs against the previous committed snapshot at
seo-snapshots/latest.json to produce a per-URL changelog.

Outputs:
  - seo-snapshots/latest.json           (new baseline, committed)
  - seo-snapshots/history/<ts>.json     (archive)
  - /mnt/documents/seo-changelog-<ts>.md (human-readable diff)

Usage:
  python scripts/seo-changelog.py --base https://doseroutine.com
"""
from __future__ import annotations
import argparse, json, os, re, sys, time, hashlib, datetime, concurrent.futures
from pathlib import Path
from urllib.parse import urljoin
import xml.etree.ElementTree as ET
import requests
from bs4 import BeautifulSoup

ROOT = Path(__file__).resolve().parent.parent
SNAP_DIR = ROOT / "seo-snapshots"
HIST_DIR = SNAP_DIR / "history"
LATEST = SNAP_DIR / "latest.json"
OUT_DIR = Path("/mnt/documents")

FIELDS = ["status", "title", "description", "canonical", "robots_meta",
          "x_robots", "og:title", "og:description", "og:url", "og:image",
          "og:type", "twitter:card", "twitter:title", "twitter:description",
          "twitter:image", "jsonld_types", "h1_count", "h1_first"]

def fetch_sitemap(base: str) -> list[str]:
    r = requests.get(f"{base.rstrip('/')}/sitemap.xml", timeout=30)
    r.raise_for_status()
    ns = {"s": "http://www.sitemaps.org/schemas/sitemap/0.9"}
    root = ET.fromstring(r.text)
    return sorted({loc.text.strip() for loc in root.findall(".//s:loc", ns)})

def snap_url(url: str) -> dict:
    try:
        r = requests.get(url, timeout=30, headers={"User-Agent": "DoseRoutineSEOChangelog/1.0"})
    except Exception as e:
        return {"status": f"ERR:{type(e).__name__}"}
    s = BeautifulSoup(r.text, "html.parser")
    def m(name=None, prop=None):
        tag = s.find("meta", attrs={"name": name} if name else {"property": prop})
        return tag.get("content", "").strip() if tag and tag.get("content") else ""
    canon = s.find("link", rel="canonical")
    jsonld = []
    for tag in s.find_all("script", type="application/ld+json"):
        try:
            data = json.loads(tag.string or "{}")
            items = data if isinstance(data, list) else [data]
            for it in items:
                t = it.get("@type")
                if t: jsonld.append(t if isinstance(t, str) else ",".join(t))
        except Exception:
            pass
    h1s = s.find_all("h1")
    return {
        "status": r.status_code,
        "title": (s.title.string.strip() if s.title and s.title.string else ""),
        "description": m(name="description"),
        "canonical": canon.get("href", "").strip() if canon else "",
        "robots_meta": m(name="robots"),
        "x_robots": r.headers.get("x-robots-tag", ""),
        "og:title": m(prop="og:title"),
        "og:description": m(prop="og:description"),
        "og:url": m(prop="og:url"),
        "og:image": m(prop="og:image"),
        "og:type": m(prop="og:type"),
        "twitter:card": m(name="twitter:card"),
        "twitter:title": m(name="twitter:title"),
        "twitter:description": m(name="twitter:description"),
        "twitter:image": m(name="twitter:image"),
        "jsonld_types": sorted(set(jsonld)),
        "h1_count": len(h1s),
        "h1_first": (h1s[0].get_text(strip=True)[:200] if h1s else ""),
    }

def crawl(urls: list[str], workers: int = 12) -> dict:
    out = {}
    with concurrent.futures.ThreadPoolExecutor(max_workers=workers) as ex:
        futs = {ex.submit(snap_url, u): u for u in urls}
        for i, f in enumerate(concurrent.futures.as_completed(futs), 1):
            u = futs[f]
            out[u] = f.result()
            if i % 25 == 0:
                print(f"  {i}/{len(urls)}", file=sys.stderr)
    return out

def diff_snap(prev: dict, curr: dict) -> dict:
    prev_urls = set(prev.keys())
    curr_urls = set(curr.keys())
    added = sorted(curr_urls - prev_urls)
    removed = sorted(prev_urls - curr_urls)
    changed = {}
    for u in sorted(prev_urls & curr_urls):
        deltas = {}
        for f in FIELDS:
            a, b = prev[u].get(f), curr[u].get(f)
            if a != b:
                deltas[f] = {"before": a, "after": b}
        if deltas:
            changed[u] = deltas
    return {"added": added, "removed": removed, "changed": changed}

def render_md(base: str, ts: str, prev_ts: str | None, urls: list[str], diff: dict) -> str:
    lines = [f"# SEO Audit Changelog", "",
             f"- **Site:** {base}",
             f"- **Generated:** {ts}",
             f"- **Previous snapshot:** {prev_ts or '_(none — first run)_'}",
             f"- **URLs crawled:** {len(urls)}",
             f"- **Added:** {len(diff['added'])}  •  **Removed:** {len(diff['removed'])}  •  **Changed:** {len(diff['changed'])}",
             ""]
    if diff["added"]:
        lines += ["## Added URLs", ""] + [f"- `{u}`" for u in diff["added"]] + [""]
    if diff["removed"]:
        lines += ["## Removed URLs", ""] + [f"- `{u}`" for u in diff["removed"]] + [""]
    if diff["changed"]:
        lines += ["## Changed URLs", ""]
        # summary counts by field
        field_counts: dict[str,int] = {}
        for deltas in diff["changed"].values():
            for f in deltas: field_counts[f] = field_counts.get(f, 0) + 1
        lines += ["### Fields changed (summary)", ""]
        lines += [f"- **{f}**: {c}" for f, c in sorted(field_counts.items(), key=lambda x: -x[1])]
        lines += ["", "### Per-URL diffs", ""]
        for u, deltas in diff["changed"].items():
            lines.append(f"#### `{u}`")
            for f, ba in deltas.items():
                before = json.dumps(ba["before"], ensure_ascii=False)
                after = json.dumps(ba["after"], ensure_ascii=False)
                if len(before) > 300: before = before[:297] + "…"
                if len(after) > 300: after = after[:297] + "…"
                lines += [f"- **{f}**",
                          f"  - before: `{before}`",
                          f"  - after:  `{after}`"]
            lines.append("")
    if not (diff["added"] or diff["removed"] or diff["changed"]):
        lines += ["_No changes detected since last snapshot._", ""]
    return "\n".join(lines)

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--base", default="https://doseroutine.com")
    ap.add_argument("--limit", type=int, default=0, help="cap URLs (debug)")
    ap.add_argument("--workers", type=int, default=12)
    args = ap.parse_args()

    SNAP_DIR.mkdir(exist_ok=True)
    HIST_DIR.mkdir(exist_ok=True)
    OUT_DIR.mkdir(parents=True, exist_ok=True)

    print(f"Fetching sitemap from {args.base} …", file=sys.stderr)
    urls = fetch_sitemap(args.base)
    if args.limit: urls = urls[:args.limit]
    print(f"Crawling {len(urls)} URLs …", file=sys.stderr)
    snap = crawl(urls, args.workers)

    prev = {"generated_at": None, "urls": {}}
    if LATEST.exists():
        prev = json.loads(LATEST.read_text())
    diff = diff_snap(prev.get("urls", {}), snap)

    ts = datetime.datetime.utcnow().strftime("%Y-%m-%dT%H-%M-%SZ")
    payload = {"generated_at": ts, "base": args.base, "url_count": len(urls), "urls": snap}
    LATEST.write_text(json.dumps(payload, indent=2, sort_keys=True))
    (HIST_DIR / f"{ts}.json").write_text(json.dumps(payload, indent=2, sort_keys=True))

    md = render_md(args.base, ts, prev.get("generated_at"), urls, diff)
    out_md = OUT_DIR / f"seo-changelog-{ts}.md"
    out_md.write_text(md)
    # Also mirror a stable "latest" copy for easy download
    (OUT_DIR / "seo-changelog-latest.md").write_text(md)

    print(json.dumps({
        "generated_at": ts,
        "urls": len(urls),
        "added": len(diff["added"]),
        "removed": len(diff["removed"]),
        "changed": len(diff["changed"]),
        "changelog": str(out_md),
        "snapshot": str(LATEST),
    }, indent=2))

if __name__ == "__main__":
    main()
