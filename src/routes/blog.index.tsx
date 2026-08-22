import { PageProse } from "@/components/page-prose";
import { ProseContainer } from "@/components/prose-container";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  makeSuggestShownGuard,
  SUGGEST_SHOWN_DEBOUNCE_MS,
  trackFilterChip,
  trackSearchCleared,
  trackSearchCommitted,
  trackSuggestSelected,
  trackSuggestShown,
} from "@/lib/search-analytics";
import { createFileRoute, Link } from "@tanstack/react-router";
import { fallback } from "@tanstack/zod-adapter";
import { z } from "zod";
import { ArrowLeft, ArrowRight, Newspaper, Search, X } from "lucide-react";
import { hreflangLinks, ogLocaleMeta } from "@/lib/hreflang";
import { blogPostImageUrl } from "@/lib/blog-seo";
import { getBlogListCanonicalUrl } from "@/lib/blog-list-canonical.functions";
import {
  applyBlogPageSize,
  applyBlogSort,
  blogListPageMeta,
  buildBlogPaginationLinks,
  buildBlogListCanonical,
  normalizeBlogPageSize,
  BLOG_PAGE_SIZE_OPTIONS,
  DEFAULT_BLOG_PAGE_SIZE,
} from "@/lib/blog-list-canonical";
import {
  BLOG_LIST_COALESCE_MS,
  blogListSearchEqual,
  coalesceBlogListUpdates,
  shouldCommitBlogListSearch,
  type BlogListUpdate,
} from "@/lib/blog-list-coalesce";

import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { PublicBackHeader } from "@/components/public-back-header";
import { AttributionFooter } from "@/components/attribution-footer";
import {
  BLOG_POSTS_NEWEST_FIRST,
  BLOG_SORTS,
  BLOG_SORT_LABEL,
  BLOG_TAGS,
  BLOG_TAG_KIND_LABEL,
  blogTagKey,
  blogSuggestions,
  filterBlogPosts,
  sortBlogPosts,
  type BlogSort,
  type BlogTagKind,
} from "@/lib/blog-posts";
import { mergeLdScripts } from "@/lib/head-budget";
import { AeoFaq } from "@/components/aeo-faq";
import { aeoFaqScript } from "@/lib/aeo";
import { BLOG_INDEX_FAQ } from "@/lib/aeo-faqs-index";

const PAGE_SIZE_OPTIONS = BLOG_PAGE_SIZE_OPTIONS;
type PageSize = (typeof PAGE_SIZE_OPTIONS)[number];
type BlogSearch = { sort: string; page: number; pageSize: number };

// The schema is the single source of truth for list defaults: a bare /blog
// parses to { sort: "newest", page: 1, pageSize: 3 } and every unsupported
// pageSize (string, float, negative, NaN, 12, ...) normalizes back to 3.
export const blogIndexSearchSchema = z.object({
  sort: fallback(z.string(), "newest").default("newest"),
  page: fallback(
    z.unknown().transform((v) => {
      const n = typeof v === "number" ? v : typeof v === "string" ? Number(v) : Number.NaN;
      return Number.isFinite(n) ? Math.max(1, Math.floor(n)) : 1;
    }),
    1,
  ).default(1),
  pageSize: fallback(
    z.unknown().transform((v) => normalizeBlogPageSize(v)),
    3,
  ).default(3),
});

/**
 * Route-level validation. Parsing applies the schema defaults, but keys the URL
 * did not contain are dropped again before the value reaches the router: if the
 * validated search contained extra keys, TanStack Router would answer /blog with
 * a 307 to /blog?sort=newest&page=1&pageSize=3 (an "unexpected redirect" for
 * every sitemap URL). Readers use `resolveBlogSearch` to get the defaults back.
 */
function validateBlogSearch(input: Record<string, unknown>): Partial<BlogSearch> {
  const parsed = blogIndexSearchSchema.parse(input ?? {});
  const out: Partial<BlogSearch> = {};
  if (input?.sort !== undefined) out.sort = parsed.sort;
  if (input?.page !== undefined) out.page = parsed.page;
  if (input?.pageSize !== undefined) out.pageSize = parsed.pageSize;
  return out;
}

/** Applies the schema defaults to a (possibly partial) blog search. */
export function resolveBlogSearch(raw: Partial<BlogSearch> | undefined): BlogSearch {
  return blogIndexSearchSchema.parse(raw ?? {}) as BlogSearch;
}

export const CANONICAL = "https://doseroutine.com/blog";
const TITLE = "Research & Updates — Peptide and GLP-1 News | DoseRoutine";
const DESC =
  "Plain-English updates on peptide, GLP-1, hormone and longevity research, with sources cited and links to the DoseRoutine guides and calculators.";

export const Route = createFileRoute("/blog/")({
  validateSearch: validateBlogSearch,
  loaderDeps: ({ search }) => resolveBlogSearch(search),

  // The canonical/meta params are fully derivable from the search params, so
  // client navigations (sort, page size, pagination) resolve locally instead of
  // firing a server request per change. SSR still uses the request URL.
  loader: async ({ deps }) => {
    if (typeof window !== "undefined") {
      const url = new URL(CANONICAL);
      if (deps.page > 1) url.searchParams.set("page", String(deps.page));
      return { canonical: buildBlogListCanonical(url), ...deps };
    }
    return await getBlogListCanonicalUrl();
  },
  staleTime: 60_000,
  head: ({ loaderData }) => {
    const canonical = loaderData?.canonical ?? CANONICAL;
    const pageSize = normalizeBlogPageSize(loaderData?.pageSize);
    const sort = loaderData?.sort ?? "newest";
    const totalPages = Math.max(1, Math.ceil(BLOG_POSTS_NEWEST_FIRST.length / pageSize));
    const page = Math.max(1, loaderData?.page ?? 1);

    const { title, description } = blogListPageMeta(page, { title: TITLE, description: DESC });

    const nonDefaultSort = sort !== "newest";
    const outOfRange = page > totalPages;
    const robots =
      nonDefaultSort || outOfRange ? "noindex, follow" : "index, follow, max-image-preview:large";

    const canonicalPath = page > 1 ? `/blog?page=${page}` : "/blog";
    const start = (Math.min(page, totalPages) - 1) * pageSize;
    const visiblePosts = BLOG_POSTS_NEWEST_FIRST.slice(start, start + pageSize);

    const pageLinks = buildBlogPaginationLinks(page, totalPages, { pageSize, sort });

    return {
      meta: [
        { title },
        { name: "description", content: description },
        { name: "robots", content: robots },
        { name: "author", content: "DoseRoutine" },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
        { property: "og:type", content: "website" },
        { property: "og:url", content: canonical },
        { property: "og:site_name", content: "DoseRoutine" },
        { name: "twitter:card", content: "summary_large_image" },
        { name: "twitter:title", content: title },
        { name: "twitter:description", content: description },
        ...ogLocaleMeta("en"),
      ],
      links: [{ rel: "canonical", href: canonical }, ...pageLinks, ...hreflangLinks(canonicalPath)],
      scripts: mergeLdScripts([
        ...(page === 1 ? [aeoFaqScript(CANONICAL, BLOG_INDEX_FAQ)] : []),
        {
          type: "application/ld+json",
          children: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Blog",
            name: "DoseRoutine Research & Updates",
            description,
            url: canonical,
            inLanguage: "en",
            // Reference the sitewide Organization node by @id only. Restating
            // name/url/logo here produced conflicting values for one @id and
            // Rich Results flags that as an error.
            publisher: { "@id": "https://doseroutine.com/#organization" },
            blogPost: visiblePosts.map((p) => ({
              "@type": "BlogPosting",
              headline: p.heading,
              description: p.description,
              datePublished: p.published,
              dateModified: p.updated,
              url: `https://doseroutine.com/blog/${p.slug}`,
              // Recommended by Google for BlogPosting: the post's own share
              // card and the page the posting is the main entity of.
              image: [blogPostImageUrl(p.slug)],
              mainEntityOfPage: {
                "@type": "WebPage",
                "@id": `https://doseroutine.com/blog/${p.slug}`,
              },
              author: { "@id": "https://doseroutine.com/#organization" },
              publisher: { "@id": "https://doseroutine.com/#organization" },
            })),
          }),
        },
        {
          type: "application/ld+json",
          children: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "BreadcrumbList",
            itemListElement: [
              {
                "@type": "ListItem",
                position: 1,
                name: "DoseRoutine",
                item: "https://doseroutine.com/",
              },
              { "@type": "ListItem", position: 2, name: "Research & Updates", item: canonical },
            ],
          }),
        },
      ]),
    };
  },

  component: BlogIndex,
});

const TAG_KINDS: BlogTagKind[] = ["compound", "mechanism", "phase"];

function BlogIndex() {
  const rawSearch = Route.useSearch();
  // URL keys may be absent; resolveBlogSearch applies the schema defaults.
  const search: BlogSearch = useMemo(() => resolveBlogSearch(rawSearch), [rawSearch]);

  const navigate = Route.useNavigate();
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);

  // Pending (optimistic) list controls. Rapid sort / page-size taps render
  // instantly from here and are folded into ONE navigation, so the loader
  // fires once and the reader never sees an intermediate page flash.
  const [pending, setPending] = useState<BlogSearch | null>(null);
  const pendingRef = useRef<BlogSearch | null>(null);
  const searchRef = useRef<BlogSearch>(search);
  const commitTimer = useRef<number | null>(null);

  useEffect(() => {
    searchRef.current = search;
    if (pendingRef.current && blogListSearchEqual(pendingRef.current, search)) {
      pendingRef.current = null;
      setPending(null);
    }
  }, [search]);

  useEffect(
    () => () => {
      if (commitTimer.current !== null) window.clearTimeout(commitTimer.current);
    },
    [],
  );

  function queueSearchUpdate(update: BlogListUpdate) {
    const next = coalesceBlogListUpdates(pendingRef.current ?? searchRef.current, [update]);
    pendingRef.current = next;
    setPending(next);

    if (commitTimer.current !== null) window.clearTimeout(commitTimer.current);
    commitTimer.current = window.setTimeout(() => {
      commitTimer.current = null;
      const target = pendingRef.current;
      if (!target) return;
      if (!shouldCommitBlogListSearch(searchRef.current, target)) {
        pendingRef.current = null;
        setPending(null);
        return;
      }
      navigate({ search: () => target, replace: true, resetScroll: false });
    }, BLOG_LIST_COALESCE_MS);
  }

  const suggestions = useMemo(() => blogSuggestions(query, selected), [query, selected]);
  const showSuggestions = open && suggestions.length > 0;

  const view = pending ?? search;

  const sort: BlogSort = (BLOG_SORTS as string[]).includes(view.sort)
    ? (view.sort as BlogSort)
    : "newest";

  const pageSize: PageSize = normalizeBlogPageSize(view.pageSize);
  const pageSizeRefs = useRef<Array<HTMLButtonElement | null>>([]);

  const posts = useMemo(() => {
    const filtered = filterBlogPosts(BLOG_POSTS_NEWEST_FIRST, query, selected);
    return sortBlogPosts(filtered, sort, query);
  }, [query, selected, sort]);

  const pageCount = Math.max(1, Math.ceil(posts.length / pageSize));
  const page = Math.min(Math.max(1, view.page), pageCount);
  const start = (page - 1) * pageSize;
  const visible = posts.slice(start, start + pageSize);

  const hasFilters = query.trim().length > 0 || selected.length > 0;

  // Pagination hrefs must match the URLs listed in sitemap.xml exactly
  // (/blog, /blog?page=2, ...). Default sort/pageSize are omitted so Google
  // never crawls a parameterised duplicate of a page it already has.
  const pageSearch = (n: number) => ({
    sort: sort === "newest" ? undefined : sort,
    page: n > 1 ? n : undefined,
    pageSize: pageSize === DEFAULT_BLOG_PAGE_SIZE ? undefined : pageSize,
  });

  // Blog search filters as you type, so a "committed" search is a settled
  // query rather than an Enter press. Both events share one debounce.
  const suggestShownGuard = useRef(makeSuggestShownGuard());
  const committedGuard = useRef(makeSuggestShownGuard());
  useEffect(() => {
    const term = query.trim();
    if (!term) return;
    const t = window.setTimeout(() => {
      if (committedGuard.current(term.toLowerCase(), posts.length)) {
        trackSearchCommitted("blog", term, posts.length);
      }
      if (showSuggestions && suggestShownGuard.current(term.toLowerCase(), suggestions.length)) {
        trackSuggestShown("blog", term, suggestions.length);
      }
    }, SUGGEST_SHOWN_DEBOUNCE_MS);
    return () => window.clearTimeout(t);
  }, [query, posts.length, suggestions.length, showSuggestions]);

  // Pagination is rendered as real <a href> links so crawlers can reach every
  // page; no imperative page setter is needed here.

  /** Any change to the result set sends the reader back to page 1. */
  function resetPage() {
    if (view.page !== 1) queueSearchUpdate((prev) => ({ ...prev, page: 1 }));
  }

  function setSort(next: BlogSort) {
    trackFilterChip("blog", {
      group: "sort",
      value: next,
      active: true,
      resultCount: posts.length,
      term: query,
    });
    queueSearchUpdate((prev) => applyBlogSort(prev, next));
  }

  function setPageSize(next: PageSize) {
    trackFilterChip("blog", {
      group: "page_size",
      value: String(next),
      active: true,
      resultCount: posts.length,
      term: query,
    });
    queueSearchUpdate((prev) => applyBlogPageSize(prev, next));
  }

  function toggleTag(key: string) {
    trackFilterChip("blog", {
      group: "tag",
      value: key,
      active: !selected.includes(key),
      resultCount: posts.length,
      term: query,
    });
    setSelected((prev) => (prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]));
    resetPage();
  }

  function clearAll() {
    trackSearchCleared("blog", {
      term: query,
      from: posts.length === 0 ? "zero_results" : "filters",
    });
    setQuery("");
    setSelected([]);
    resetPage();
  }

  /** Picking a suggestion turns the typed text into a tag filter. */
  function applySuggestion(key: string) {
    const index = suggestions.findIndex((s) => s.key === key);
    trackSuggestSelected("blog", {
      term: query,
      value: key,
      index: index < 0 ? 0 : index,
      suggestionCount: suggestions.length,
    });
    setSelected((prev) => (prev.includes(key) ? prev : [...prev, key]));
    setQuery("");
    setOpen(false);
    setActive(0);
    resetPage();
  }

  function onSearchKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!showSuggestions) {
      if (e.key === "ArrowDown") setOpen(true);
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((i) => (i + 1) % suggestions.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((i) => (i - 1 + suggestions.length) % suggestions.length);
    } else if (e.key === "Enter") {
      const pick = suggestions[active];
      if (pick) {
        e.preventDefault();
        applySuggestion(pick.key);
      }
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  }

  return (
    <main id="main-content" tabIndex={-1} className="min-h-dvh bg-background text-foreground">
      <PublicBackHeader />
      <div className="mx-auto max-w-3xl px-4 py-8 space-y-8">
        <header className="space-y-3">
          <div className="flex items-center gap-2 text-sm font-medium text-primary">
            <Newspaper className="h-4 w-4" /> Research &amp; Updates
          </div>
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
            What actually changed in peptide, GLP-1 and longevity research
          </h1>
          <p className="dr-speakable-intro text-lg text-muted-foreground">
            Short, sourced write-ups of the developments that change how people run a protocol — new
            approvals, phase 3 readouts and first-in-human trials — with every claim traceable to a
            citation and a clear line between what is proven and what is being sold.
          </p>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
            <Link
              to="/blog/tag"
              className="inline-flex items-center gap-1 text-sm font-medium text-primary"
            >
              Browse by compound, mechanism or trial phase
            </Link>
            <Link
              to="/articles"
              className="inline-flex items-center gap-1 text-sm font-medium text-primary"
            >
              Read our longer guides and articles
            </Link>
          </div>
        </header>

        <section className="space-y-4" aria-label="Search and filter updates">
          <div className="relative">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden="true"
            />
            <Input
              type="search"
              inputMode="search"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setActive(0);
                setOpen(true);
                resetPage();
              }}
              onFocus={() => setOpen(true)}
              onBlur={() => window.setTimeout(() => setOpen(false), 120)}
              onKeyDown={onSearchKeyDown}
              placeholder="Search by compound, mechanism or trial…"
              aria-label="Search updates"
              role="combobox"
              aria-expanded={showSuggestions}
              aria-controls="blog-search-suggestions"
              aria-autocomplete="list"
              aria-activedescendant={showSuggestions ? `blog-suggestion-${active}` : undefined}
              autoComplete="off"
              className="pl-9"
            />
            {showSuggestions ? (
              <ul
                id="blog-search-suggestions"
                role="listbox"
                aria-label="Search suggestions"
                className="absolute z-30 mt-1 w-full overflow-hidden rounded-md border border-border bg-popover shadow-lg"
              >
                {suggestions.map((s, i) => (
                  <li key={s.key} role="none">
                    <button
                      type="button"
                      id={`blog-suggestion-${i}`}
                      role="option"
                      aria-selected={i === active}
                      onMouseEnter={() => setActive(i)}
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => applySuggestion(s.key)}
                      className={`flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-sm ${
                        i === active ? "bg-muted text-foreground" : "text-foreground"
                      }`}
                    >
                      <span className="truncate font-medium">{s.tag.label}</span>
                      <span className="shrink-0 text-[11px] text-muted-foreground">
                        {BLOG_TAG_KIND_LABEL[s.tag.kind]} · {s.count}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>

          {TAG_KINDS.map((kind) => {
            const tags = BLOG_TAGS.filter((t) => t.kind === kind);
            if (tags.length === 0) return null;
            return (
              <div key={kind} className="space-y-1.5">
                <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                  {BLOG_TAG_KIND_LABEL[kind]}
                </div>
                <div className="flex flex-wrap gap-2">
                  {tags.map((tag) => {
                    const key = blogTagKey(tag);
                    const active = selected.includes(key);
                    return (
                      <button
                        key={key}
                        type="button"
                        onClick={() => toggleTag(key)}
                        aria-pressed={active}
                        className={
                          active
                            ? "rounded-full border border-primary bg-primary px-3 py-1 text-xs font-medium text-primary-foreground"
                            : "rounded-full border border-border bg-card px-3 py-1 text-xs font-medium text-muted-foreground hover:border-primary hover:text-foreground"
                        }
                      >
                        {tag.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}

          <div className="space-y-1.5">
            <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              Sort
            </div>
            <div className="flex flex-wrap gap-2">
              {BLOG_SORTS.map((option) => {
                const active = sort === option;
                const needsQuery = option === "relevance" && query.trim().length === 0;
                return (
                  <button
                    key={option}
                    type="button"
                    onClick={() => setSort(option)}
                    aria-pressed={active}
                    title={needsQuery ? "Type a search term to rank by relevance" : undefined}
                    className={
                      active
                        ? "rounded-full border border-primary bg-primary px-3 py-1 text-xs font-medium text-primary-foreground"
                        : "rounded-full border border-border bg-card px-3 py-1 text-xs font-medium text-muted-foreground hover:border-primary hover:text-foreground"
                    }
                  >
                    {BLOG_SORT_LABEL[option]}
                  </button>
                );
              })}
            </div>
            {sort === "relevance" && query.trim().length === 0 ? (
              <p className="text-[11px] text-muted-foreground">
                Search for a compound or trial to rank by relevance — showing newest first until
                then.
              </p>
            ) : null}
          </div>

          <div className="space-y-1.5">
            <div
              id="blog-page-size-label"
              className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground"
            >
              Per page
            </div>
            <div
              role="radiogroup"
              aria-labelledby="blog-page-size-label"
              className="flex flex-wrap gap-2"
              onKeyDown={(event) => {
                const keys = ["ArrowRight", "ArrowDown", "ArrowLeft", "ArrowUp", "Home", "End"];
                if (!keys.includes(event.key)) return;
                event.preventDefault();
                const current = PAGE_SIZE_OPTIONS.indexOf(pageSize);
                const last = PAGE_SIZE_OPTIONS.length - 1;
                let next = current;
                if (event.key === "ArrowRight" || event.key === "ArrowDown") {
                  next = current === last ? 0 : current + 1;
                } else if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
                  next = current === 0 ? last : current - 1;
                } else if (event.key === "Home") {
                  next = 0;
                } else {
                  next = last;
                }
                const option = PAGE_SIZE_OPTIONS[next]!;
                setPageSize(option);
                pageSizeRefs.current[next]?.focus();
              }}
            >
              {PAGE_SIZE_OPTIONS.map((option, index) => {
                const active = pageSize === option;
                return (
                  <button
                    key={option}
                    ref={(node) => {
                      pageSizeRefs.current[index] = node;
                    }}
                    type="button"
                    role="radio"
                    aria-checked={active}
                    tabIndex={active ? 0 : -1}
                    onClick={() => setPageSize(option)}
                    aria-label={`Show ${option} posts per page`}
                    className={
                      "min-h-11 min-w-11 rounded-full border px-3 py-1 text-xs font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background " +
                      (active
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border bg-card text-muted-foreground hover:border-primary hover:text-foreground")
                    }
                  >
                    {option}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex items-center justify-between gap-3 text-xs text-muted-foreground">
            <span role="status" aria-live="polite">
              {posts.length === 0
                ? `0 of ${BLOG_POSTS_NEWEST_FIRST.length} updates`
                : `Showing ${start + 1}–${start + visible.length} of ${posts.length} ${
                    posts.length === 1 ? "update" : "updates"
                  }`}
            </span>
            {hasFilters ? (
              <Button variant="ghost" size="sm" onClick={clearAll} className="h-7 px-2 text-xs">
                <X className="mr-1 h-3.5 w-3.5" /> Clear filters
              </Button>
            ) : null}
          </div>
        </section>

        <section className="space-y-4">
          {posts.length === 0 ? (
            <Card className="p-5 space-y-2 text-sm text-muted-foreground">
              <div className="font-semibold text-foreground">No updates match that yet</div>
              <p>
                Try a broader term like “GLP-1”, “myostatin” or “phase 1”, or clear the filters to
                see everything we've published.
              </p>
            </Card>
          ) : (
            visible.map((post) => (
              <Card key={post.slug} className="p-5 space-y-2">
                <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                  <span className="rounded-full bg-muted px-2 py-0.5 font-medium text-foreground">
                    {post.category}
                  </span>
                  <time dateTime={post.published}>{post.published}</time>
                </div>
                <h2 className="text-xl font-bold leading-snug">
                  <Link
                    to="/blog/$slug"
                    params={{ slug: post.slug }}
                    className="hover:text-primary"
                  >
                    {post.heading}
                  </Link>
                </h2>
                <p className="text-sm text-muted-foreground">{post.description}</p>
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {post.tags.map((tag) => {
                    const key = blogTagKey(tag);
                    return (
                      <button
                        key={key}
                        type="button"
                        onClick={() => toggleTag(key)}
                        aria-pressed={selected.includes(key)}
                        className={
                          selected.includes(key)
                            ? "rounded-full border border-primary bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary"
                            : "rounded-full border border-border px-2 py-0.5 text-[11px] text-muted-foreground hover:border-primary hover:text-foreground"
                        }
                      >
                        {tag.label}
                      </button>
                    );
                  })}
                </div>
                <Link
                  to="/blog/$slug"
                  params={{ slug: post.slug }}
                  aria-label={`Read: ${post.heading}`}
                  className="inline-flex items-center gap-1 text-sm font-medium text-primary"
                >
                  Read the update <ArrowRight className="h-4 w-4" />
                </Link>
              </Card>
            ))
          )}
        </section>

        {pageCount > 1 ? (
          <nav className="flex items-center justify-between gap-3" aria-label="Blog pagination">
            {page > 1 ? (
              <Link
                to="/blog"
                search={pageSearch(page - 1)}
                aria-label={`Newer posts, page ${page - 1}`}
                className="inline-flex h-9 items-center rounded-md border border-border bg-card px-3 text-xs font-medium text-foreground hover:border-primary"
              >
                <ArrowLeft className="mr-1 h-4 w-4" /> Newer
              </Link>
            ) : (
              <span aria-hidden="true" className="h-9 w-[86px]" />
            )}
            <div className="flex flex-wrap items-center justify-center gap-1.5">
              {Array.from({ length: pageCount }, (_, i) => i + 1).map((n) => (
                <Link
                  key={n}
                  to="/blog"
                  search={pageSearch(n)}
                  aria-current={n === page ? "page" : undefined}
                  aria-label={`Research updates page ${n}`}
                  className={
                    n === page
                      ? "inline-flex h-8 min-w-8 items-center justify-center rounded-md border border-primary bg-primary px-2 text-xs font-semibold text-primary-foreground"
                      : "inline-flex h-8 min-w-8 items-center justify-center rounded-md border border-border bg-card px-2 text-xs font-medium text-muted-foreground hover:border-primary hover:text-foreground"
                  }
                >
                  {n}
                </Link>
              ))}
            </div>
            {page < pageCount ? (
              <Link
                to="/blog"
                search={pageSearch(page + 1)}
                aria-label={`Older posts, page ${page + 1}`}
                className="inline-flex h-9 items-center rounded-md border border-border bg-card px-3 text-xs font-medium text-foreground hover:border-primary"
              >
                Older <ArrowRight className="ml-1 h-4 w-4" />
              </Link>
            ) : (
              <span aria-hidden="true" className="h-9 w-[86px]" />
            )}
          </nav>
        ) : null}

        {/* Full crawlable archive: every published post is reachable with a
            plain <a href> on page 1 of /blog, so paginated posts are never
            orphaned from Google's crawl of the hub. */}
        <section className="space-y-3" aria-labelledby="blog-archive-heading">
          <h2 id="blog-archive-heading" className="text-base font-semibold">
            All research updates ({BLOG_POSTS_NEWEST_FIRST.length})
          </h2>
          <ul className="grid gap-2 sm:grid-cols-2">
            {BLOG_POSTS_NEWEST_FIRST.map((post) => (
              <li key={`archive-${post.slug}`} className="text-sm leading-snug">
                <Link
                  to="/blog/$slug"
                  params={{ slug: post.slug }}
                  aria-label={`${post.heading} — DoseRoutine research update`}
                  className="text-muted-foreground underline underline-offset-2 hover:text-primary"
                >
                  {post.heading}
                </Link>
              </li>
            ))}
          </ul>
        </section>

        <Card className="p-5 space-y-2 border-l-4 border-l-primary">
          <div className="text-sm font-semibold">Track what you actually take</div>
          <p className="text-sm text-muted-foreground">
            DoseRoutine logs doses, times, vials and labs for supplements, peptides and
            prescriptions in one schedule, and flags interactions before you add anything.
          </p>
          <Link
            to="/auth"
            className="inline-flex items-center gap-1 text-sm font-medium text-primary"
          >
            Sign up free <ArrowRight className="h-4 w-4" />
          </Link>
        </Card>

        {page === 1 ? <AeoFaq pairs={BLOG_INDEX_FAQ} /> : null}
        <ProseContainer>
          <PageProse id="blog-index" />
        </ProseContainer>
        <AttributionFooter sourceUrl={CANONICAL} />
      </div>
    </main>
  );
}
