import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ContentRouteError } from "@/components/route-fallbacks";
import { useSuspenseQuery } from "@tanstack/react-query";
import { memo, useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import { Search, X } from "lucide-react";
import {
  buildSuggestions,
  isSearchShortcut,
  isTypingTarget,
  moveActiveIndex,
} from "@/lib/library-suggest";
import {
  makeSuggestShownGuard,
  SUGGEST_SHOWN_DEBOUNCE_MS,
  trackFilterChip,
  trackSearchCleared,
  trackSearchCommitted,
  trackSuggestSelected,
  trackSuggestShown,
} from "@/lib/search-analytics";

import { zodValidator, fallback } from "@tanstack/zod-adapter";
import { z } from "zod";
import { allCompoundsQuery, type LibraryCompound } from "@/lib/library-data";
import { GOALS } from "@/lib/goals";
import { LibraryShell } from "@/components/library-shell";
import { hreflangLinks, ogLocaleMeta } from "@/lib/hreflang";
import { withDoseRoutineDescriptionSuffix } from "@/lib/seo-description";
import { AttributionFooter } from "@/components/attribution-footer";
import { AeoFaq } from "@/components/aeo-faq";
import { PageProse } from "@/components/page-prose";
import { ProseContainer } from "@/components/prose-container";
import { aeoFaqScript, aeoPageFields } from "@/lib/aeo";
import { LIBRARY_FAQ, LAST_REVIEWED } from "@/lib/aeo-page-faqs";
import { mergeLdScripts } from "@/lib/head-budget";

// Keep every param optional so the bare /library URL (the one in the sitemap)
// renders a 200 instead of redirecting to /library?q=&cat=all&goal=&sort=relevance.
export const searchSchema = z.object({
  q: fallback(z.string(), "").optional(),
  cat: fallback(z.string(), "all").optional(),
  goal: fallback(z.string(), "").optional(),
  sort: fallback(z.string(), "relevance").optional(),
});

const SORT_OPTIONS = [
  { slug: "relevance", label: "Most relevant" },
  { slug: "az", label: "A–Z" },
  { slug: "new", label: "Newest" },
] as const;

const CATEGORIES = [
  { slug: "all", label: "All" },
  { slug: "peptide", label: "Peptides" },
  { slug: "hormone", label: "Hormones" },
  { slug: "vitamin", label: "Vitamins" },
  { slug: "supplement", label: "Supplements" },
  { slug: "medication", label: "Medications" },
];

const TITLE = "Compound Library — Peptides & Supplements | DoseRoutine";
const DESC = withDoseRoutineDescriptionSuffix(
  "Searchable library of peptides, hormones, vitamins and supplements",
);

export const Route = createFileRoute("/library/")({
  validateSearch: zodValidator(searchSchema),
  loader: ({ context }) => context.queryClient.ensureQueryData(allCompoundsQuery),
  head: ({ loaderData }) => {
    const compounds = (loaderData ?? []) as LibraryCompound[];
    return {
      meta: [
        { title: TITLE },
        { name: "description", content: DESC },
        {
          name: "robots",
          content: "index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1",
        },
        { name: "author", content: "DoseRoutine" },
        {
          name: "copyright",
          content: `© ${new Date().getFullYear()} DoseRoutine — doseroutine.com`,
        },
        { property: "og:site_name", content: "DoseRoutine" },
        { property: "og:title", content: TITLE },
        { property: "og:description", content: DESC },
        { property: "og:type", content: "website" },
        { property: "og:url", content: "https://doseroutine.com/library" },
        { property: "og:image", content: "https://doseroutine.com/og/library-default.jpg" },
        { property: "og:image:width", content: "1200" },
        { property: "og:image:height", content: "640" },
        { property: "og:image:alt", content: "DoseRoutine compound library" },
        { name: "twitter:card", content: "summary_large_image" },
        { name: "twitter:site", content: "@doseroutine" },
        { name: "twitter:title", content: TITLE },
        { name: "twitter:description", content: DESC },
        { name: "twitter:image", content: "https://doseroutine.com/og/library-default.jpg" },
        { name: "twitter:image:alt", content: "DoseRoutine compound library" },
        ...ogLocaleMeta("en"),
      ],
      links: [
        { rel: "canonical", href: "https://doseroutine.com/library" },
        ...hreflangLinks("/library"),
      ],
      scripts: mergeLdScripts([
        aeoFaqScript("https://doseroutine.com/library", LIBRARY_FAQ),

        {
          type: "application/ld+json",
          children: JSON.stringify({
            "@context": "https://schema.org",
            "@type": ["CollectionPage", "WebPage"],
            ...aeoPageFields({
              dateModified: LAST_REVIEWED,
              datePublished: "2026-01-20",
              shortAnswer:
                "The DoseRoutine library holds 475+ free reference pages covering supplements, vitamins and minerals, peptides, hormones including TRT and GLP-1 medications. Each page gives the mechanism, studied amount range, timing and food rules, half-life, contraindications, an evidence rating, cited sources and every interaction rule that touches that compound.",
              about: [
                "Dietary supplement",
                "Peptide",
                "Hormone",
                "Vitamin",
                "GLP-1 receptor agonist",
              ],
            }),
            "@id": "https://doseroutine.com/library",
            name: "DoseRoutine Compound Library",
            description: DESC,
            url: "https://doseroutine.com/library",
            inLanguage: "en",
            medicalAudience: [
              { "@type": "MedicalAudience", audienceType: "Patient" },
              { "@type": "MedicalAudience", audienceType: "Consumer" },
            ],
            isPartOf: { "@id": "https://doseroutine.com/#website" },
            publisher: {
              "@type": "Organization",
              "@id": "https://doseroutine.com/#organization",
              name: "DoseRoutine",
              url: "https://doseroutine.com",
              logo: {
                "@type": "ImageObject",
                url: "https://doseroutine.com/icon-512.png",
              },
            },
          }),
        },
        {
          type: "application/ld+json",
          children: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "BreadcrumbList",
            itemListElement: [
              { "@type": "ListItem", position: 1, name: "Home", item: "https://doseroutine.com/" },
              {
                "@type": "ListItem",
                position: 2,
                name: "Library",
                item: "https://doseroutine.com/library",
              },
            ],
          }),
        },
        {
          type: "application/ld+json",
          children: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "ItemList",
            name: "DoseRoutine Compound Library",
            description: DESC,
            url: "https://doseroutine.com/library",
            numberOfItems: compounds.length,
            itemListOrder: "https://schema.org/ItemListOrderAscending",
            itemListElement: [...compounds]
              .sort((a, b) => a.name.localeCompare(b.name))
              .map((c, i) => ({
                "@type": "ListItem",
                position: i + 1,
                url: `https://doseroutine.com/library/${c.slug}`,
                name: c.name,
              })),
          }),
        },
      ]),
    };
  },
  component: LibraryIndex,
  errorComponent: ContentRouteError,
});

function LibraryIndex() {
  const { data: compounds } = useSuspenseQuery(allCompoundsQuery);
  const search = Route.useSearch();
  const q = search.q ?? "";
  const cat = search.cat ?? "all";
  const goal = search.goal ?? "";
  const sort = search.sort ?? "relevance";
  const sortMode: "relevance" | "az" | "new" = sort === "az" || sort === "new" ? sort : "relevance";

  const goalSlugs = useMemo<string[]>(() => {
    const known = new Set<string>(GOALS.map((g) => g.slug as string));
    return Array.from(
      new Set<string>(
        goal
          .split(",")
          .map((s: string) => s.trim())
          .filter((s: string) => known.has(s)),
      ),
    );
  }, [goal]);
  const goalSet = useMemo<Set<string>>(() => new Set<string>(goalSlugs), [goalSlugs]);

  const hasGoals = goalSlugs.length > 0;
  const navigate = useNavigate({ from: "/library" });
  // Result count for the current filter state, read inside analytics handlers
  // that are declared before `filtered` exists.
  const resultCountRef = useRef(0);
  const setQ = (v: string) => {
    trackSearchCommitted("library", v, resultCountRef.current);
    navigate({
      search: (prev: z.infer<typeof searchSchema>) => ({ ...prev, q: v }),
      replace: true,
    });
  };
  const setCat = (v: string) => {
    trackFilterChip("library", {
      group: "category",
      value: v,
      active: true,
      resultCount: resultCountRef.current,
    });
    navigate({
      search: (prev: z.infer<typeof searchSchema>) => ({ ...prev, cat: v }),
      replace: true,
    });
  };
  const clearGoals = () => {
    trackFilterChip("library", {
      group: "all_goals",
      value: "all",
      active: true,
      resultCount: resultCountRef.current,
    });
    navigate({
      search: (prev: z.infer<typeof searchSchema>) => ({ ...prev, goal: "" }),
      replace: true,
    });
  };
  const setSort = (v: string) => {
    trackFilterChip("library", {
      group: "sort",
      value: v,
      active: true,
      resultCount: resultCountRef.current,
    });
    navigate({
      search: (prev: z.infer<typeof searchSchema>) => ({ ...prev, sort: v }),
      replace: true,
    });
  };
  const toggleGoal = (slug: string) => {
    const next = new Set(goalSlugs);
    if (next.has(slug)) next.delete(slug);
    else next.add(slug);
    trackFilterChip("library", {
      group: "goal",
      value: slug,
      active: next.has(slug),
      resultCount: resultCountRef.current,
    });
    const value = Array.from(next).join(",");
    navigate({
      search: (prev: z.infer<typeof searchSchema>) => ({ ...prev, goal: value }),
      replace: true,
    });
  };
  // Keep typing entirely local. Updating the URL while the iOS keyboard is
  // open makes Safari restore the page scroll position after each router
  // navigation, which can move the focused field back under the keyboard.
  // Commit the URL only when the user finishes (blur or Enter).
  const [qInput, setQInput] = useState(q);
  const typingRef = useRef(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [suggestOpen, setSuggestOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  useEffect(() => {
    if (!typingRef.current) setQInput(q);
  }, [q]);

  // Auto-suggest: name/alias ranked matches for the live input value. Built
  // from the same in-memory list the grid uses, so there is no extra fetch.
  const suggestions = useMemo(() => buildSuggestions(compounds, qInput), [compounds, qInput]);
  const showSuggestions = suggestOpen && suggestions.length > 0;

  // Report the dropdown once typing settles, so a word doesn't emit one event
  // per keystroke.
  const suggestShownGuard = useRef(makeSuggestShownGuard());
  useEffect(() => {
    if (!showSuggestions) return;
    const t = window.setTimeout(() => {
      if (suggestShownGuard.current(qInput.trim().toLowerCase(), suggestions.length)) {
        trackSuggestShown("library", qInput, suggestions.length);
      }
    }, SUGGEST_SHOWN_DEBOUNCE_MS);
    return () => window.clearTimeout(t);
  }, [qInput, suggestions.length, showSuggestions]);

  // "/" or Cmd/Ctrl+K focuses the search field from anywhere on the page.
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (!isSearchShortcut(e)) return;
      if (e.key === "/" && isTypingTarget(e.target)) return;
      e.preventDefault();
      const el = searchInputRef.current;
      el?.focus();
      el?.select();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  /** Records which suggestion was opened; the strongest "useful search" signal. */
  const reportSuggestionSelected = (index: number) => {
    const picked = suggestions[index];
    if (!picked) return;
    trackSuggestSelected("library", {
      term: qInput,
      value: picked.compound.slug,
      index,
      matchedAlias: picked.matchedAlias,
      suggestionCount: suggestions.length,
    });
  };

  const openSuggestion = (slug: string, index: number) => {
    reportSuggestionSelected(index);
    typingRef.current = false;
    setSuggestOpen(false);
    setActiveIndex(-1);
    setQInput(q);
    navigate({ to: "/library/$slug", params: { slug } });
  };

  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      if (suggestions.length === 0) return;
      e.preventDefault();
      setSuggestOpen(true);
      setActiveIndex((i) => moveActiveIndex(i, e.key === "ArrowDown" ? 1 : -1, suggestions.length));
      return;
    }
    if (e.key === "Enter") {
      const picked = showSuggestions ? suggestions[activeIndex] : undefined;
      if (picked) {
        e.preventDefault();
        openSuggestion(picked.compound.slug, activeIndex);
        return;
      }

      // No highlighted suggestion: commit the typed query immediately instead
      // of waiting out the debounce, and drop the keyboard on mobile.
      typingRef.current = false;
      setSuggestOpen(false);
      setQ(qInput);
      e.currentTarget.blur();
      return;
    }
    if (e.key === "Escape") {
      e.preventDefault();
      if (showSuggestions) {
        setSuggestOpen(false);
        setActiveIndex(-1);
        return;
      }
      if (qInput) {
        typingRef.current = true;
        setQInput("");
        return;
      }
      e.currentTarget.blur();
    }
  };

  // Filtering 475+ compounds on every keystroke was the main source of blocking
  // time on this route. The input stays controlled by `qInput` (identical UX)
  // while the expensive list work runs against a deferred copy.
  const deferredQ = useDeferredValue(qInput);

  const filtered = useMemo(() => {
    const qq = deferredQ.trim().toLowerCase();
    return compounds.filter((c) => {
      if (cat !== "all" && c.category !== cat) return false;
      if (hasGoals) {
        const tags = c.goal_tags ?? [];
        // ANY-of match: keep compounds that hit at least one selected goal.
        if (!tags.some((t) => goalSet.has(t))) return false;
      }
      if (qq) {
        const hay = [c.name, ...(c.aliases ?? [])].join(" ").toLowerCase();
        if (!hay.includes(qq)) return false;
      }
      return true;
    });
  }, [compounds, deferredQ, cat, hasGoals, goalSet]);

  resultCountRef.current = filtered.length;

  const grouped = useMemo(() => {
    const map = new Map<string, LibraryCompound[]>();
    for (const c of filtered) {
      const letter = c.name[0]?.toUpperCase() ?? "#";
      if (!map.has(letter)) map.set(letter, []);
      map.get(letter)!.push(c);
    }
    return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [filtered]);

  // When goals are active, rank by combined relevance:
  //  1. more overlaps with selected goals = higher
  //  2. fewer OTHER goal tags = more focused
  //  3. alphabetical
  const ranked = useMemo(() => {
    if (!hasGoals) return null;
    const score = (c: LibraryCompound) => {
      const tags = c.goal_tags ?? [];
      let overlap = 0;
      for (const t of tags) if (goalSet.has(t)) overlap += 1;
      const other = tags.length - overlap;
      return { overlap, other };
    };
    const relevanceSort = (a: LibraryCompound, b: LibraryCompound) => {
      const sa = score(a);
      const sb = score(b);
      if (sa.overlap !== sb.overlap) return sb.overlap - sa.overlap;
      if (sa.other !== sb.other) return sa.other - sb.other;
      return a.name.localeCompare(b.name);
    };
    const azSort = (a: LibraryCompound, b: LibraryCompound) => a.name.localeCompare(b.name);
    const newSort = (a: LibraryCompound, b: LibraryCompound) => {
      const at = a.created_at ? Date.parse(a.created_at) : 0;
      const bt = b.created_at ? Date.parse(b.created_at) : 0;
      if (at !== bt) return bt - at;
      return a.name.localeCompare(b.name);
    };
    const sortFn = sortMode === "az" ? azSort : sortMode === "new" ? newSort : relevanceSort;
    const direct: LibraryCompound[] = [];
    const supportive: LibraryCompound[] = [];
    for (const c of filtered) {
      if (c.category === "vitamin") supportive.push(c);
      else direct.push(c);
    }
    direct.sort(sortFn);
    supportive.sort(sortFn);
    return { direct, supportive, score };
  }, [filtered, hasGoals, goalSet, sortMode]);

  const goalTitle = (slug: string) => GOALS.find((g) => g.slug === slug)?.title ?? slug;
  const selectedTitles = goalSlugs.map(goalTitle);
  const headingGoal =
    selectedTitles.length === 0
      ? ""
      : selectedTitles.length === 1
        ? selectedTitles[0]
        : selectedTitles.slice(0, -1).join(", ") +
          " + " +
          selectedTitles[selectedTitles.length - 1];

  return (
    <LibraryShell>
      <div className="mb-8">
        <h1 className="font-display text-4xl font-semibold tracking-tight sm:text-5xl">
          Compound Library
        </h1>
        <p className="mt-3 max-w-2xl text-base text-muted-foreground">
          Every peptide, hormone, vitamin and supplement in DoseRoutine. Mechanisms, timing,
          half-life and interactions — plain English, curated for safety.
        </p>
      </div>

      <nav aria-label="Health hubs and guides" className="mb-8 grid gap-3 sm:grid-cols-2">
        <Link
          to="/library/womens-health"
          className="rounded-xl border border-border bg-card p-4 transition hover:border-primary"
        >
          <div className="text-sm font-semibold">Women's Health Hub</div>
          <p className="mt-1 text-sm text-muted-foreground">
            Menopause &amp; hormone balance, longevity, sexual health, fertility &amp; cycle
            support.
          </p>
        </Link>
        <Link
          to="/library/mens-health"
          className="rounded-xl border border-border bg-card p-4 transition hover:border-primary"
        >
          <div className="text-sm font-semibold">Men's Health Hub</div>
          <p className="mt-1 text-sm text-muted-foreground">
            Testosterone support, prostate health, libido &amp; performance, men's longevity.
          </p>
        </Link>
        <Link
          to="/library/guides/glp1-dopamine-and-relationships"
          className="rounded-xl border border-border bg-card p-4 transition hover:border-primary"
        >
          <div className="text-sm font-semibold">GLP-1, Dopamine &amp; Relationships</div>
          <p className="mt-1 text-sm text-muted-foreground">
            What research says about reward, motivation, emotional flatness and relationship
            changes.
          </p>
        </Link>
        <Link
          to="/blog"
          className="rounded-xl border border-border bg-card p-4 transition hover:border-primary"
        >
          <div className="text-sm font-semibold">Research Blog</div>
          <p className="mt-1 text-sm text-muted-foreground">
            New trial data, mechanism explainers and protocol updates — searchable by compound,
            mechanism and trial phase.
          </p>
        </Link>
        <Link
          to="/articles"
          className="rounded-xl border border-border bg-card p-4 transition hover:border-primary"
        >
          <div className="text-sm font-semibold">Articles</div>
          <p className="mt-1 text-sm text-muted-foreground">
            Practical guides on medication reminders, adherence habits, longevity peptides and
            choosing a health tracking app.
          </p>
        </Link>
      </nav>

      <div className="library-keyboard-safe mb-6 space-y-3">
        <div className="library-search-sticky sticky z-30 -mx-4 bg-background px-4 py-2">
          <div className="relative">
            <label htmlFor="library-search-input" className="sr-only">
              Search compounds, aliases and brands
            </label>
            <Search
              aria-hidden="true"
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
            />
            <input
              id="library-search-input"
              ref={searchInputRef}
              value={qInput}
              onChange={(e) => {
                typingRef.current = true;
                setActiveIndex(-1);
                setSuggestOpen(true);
                setQInput(e.target.value);
              }}
              onFocus={(e) => {
                setSuggestOpen(true);
                const el = e.currentTarget;
                setTimeout(() => el.scrollIntoView({ block: "center" }), 300);
              }}
              onBlur={() => {
                typingRef.current = false;
                if (qInput !== q) setQ(qInput);
                // Delay so a pointer-down on a suggestion still lands.
                setTimeout(() => setSuggestOpen(false), 120);
              }}
              onKeyDown={handleSearchKeyDown}
              type="search"
              enterKeyHint="search"
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="none"
              spellCheck={false}
              aria-label="Search compounds"
              role="combobox"
              aria-expanded={showSuggestions}
              aria-controls="library-suggest-list"
              aria-autocomplete="list"
              aria-activedescendant={
                showSuggestions && activeIndex >= 0 ? `library-suggest-${activeIndex}` : undefined
              }
              placeholder="Search compounds, aliases, brands…"
              className="w-full rounded-xl border border-border bg-card py-3 pl-10 pr-20 text-base focus:border-primary focus:outline-none"
            />
            {qInput ? (
              <button
                type="button"
                aria-label="Clear search"
                onClick={() => {
                  trackSearchCleared("library", { term: qInput, from: "search_input" });
                  typingRef.current = true;
                  setQInput("");
                  setActiveIndex(-1);
                  setSuggestOpen(false);
                  searchInputRef.current?.focus();
                }}
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-muted-foreground transition hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            ) : (
              <kbd
                aria-hidden="true"
                className="pointer-events-none absolute right-3 top-1/2 hidden -translate-y-1/2 rounded border border-border bg-background px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground sm:block"
              >
                /
              </kbd>
            )}

            {showSuggestions && (
              <ul
                id="library-suggest-list"
                role="listbox"
                aria-label="Compound suggestions"
                className="absolute left-0 right-0 top-[calc(100%+0.375rem)] z-40 overflow-hidden rounded-xl border border-border bg-card shadow-lg"
              >
                {suggestions.map((s, i) => (
                  <li key={s.compound.slug} role="presentation">
                    <Link
                      id={`library-suggest-${i}`}
                      role="option"
                      aria-selected={i === activeIndex}
                      to="/library/$slug"
                      params={{ slug: s.compound.slug }}
                      onMouseEnter={() => setActiveIndex(i)}
                      onClick={() => {
                        reportSuggestionSelected(i);
                        typingRef.current = false;
                        setSuggestOpen(false);
                        setQInput(q);
                      }}
                      className={`flex items-center justify-between gap-3 px-3 py-2.5 text-sm transition ${
                        i === activeIndex ? "bg-primary/10 text-foreground" : "text-foreground"
                      }`}
                    >
                      <span className="min-w-0">
                        <span className="block truncate font-medium">{s.compound.name}</span>
                        {s.matchedAlias && (
                          <span className="block truncate text-xs text-muted-foreground">
                            also “{s.matchedAlias}”
                          </span>
                        )}
                      </span>
                      <span className="shrink-0 rounded-full bg-background px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                        {s.compound.category}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <p className="sr-only" role="status" aria-live="polite">
            {showSuggestions
              ? `${suggestions.length} suggestion${suggestions.length === 1 ? "" : "s"}. Use arrow keys to browse, Enter to open.`
              : ""}
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          {CATEGORIES.map((c) => (
            <button
              key={c.slug}
              onClick={() => setCat(c.slug)}
              aria-label={`Filter compounds by category: ${c.label}`}
              aria-pressed={cat === c.slug}
              className={`rounded-full px-3 py-1.5 text-xs font-medium transition ${
                cat === c.slug
                  ? "bg-primary text-primary-foreground"
                  : "bg-card text-muted-foreground hover:text-foreground"
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={clearGoals}
            aria-label="Show compounds for all goals"
            aria-pressed={!hasGoals}
            className={`rounded-full px-3 py-1.5 text-xs font-medium transition ${
              !hasGoals
                ? "bg-foreground text-background"
                : "bg-card text-muted-foreground hover:text-foreground"
            }`}
          >
            All goals
          </button>
          {GOALS.map((g) => {
            const active = goalSet.has(g.slug);
            return (
              <button
                key={g.slug}
                onClick={() => toggleGoal(g.slug)}
                aria-label={`Toggle goal filter: ${g.title}`}
                aria-pressed={active}
                className={`rounded-full px-3 py-1.5 text-xs font-medium transition ${
                  active
                    ? "bg-foreground text-background"
                    : "bg-card text-muted-foreground hover:text-foreground"
                }`}
              >
                {active ? "✓ " : ""}
                {g.title}
              </button>
            );
          })}
        </div>
        {hasGoals && (
          <div className="space-y-2 pt-1">
            <div className="flex items-center gap-2">
              <span className="shrink-0 text-xs font-medium text-muted-foreground">Sort:</span>
              <div
                role="group"
                aria-label="Sort within sections"
                className="inline-flex flex-1 rounded-full bg-card p-1 sm:flex-none"
              >
                {SORT_OPTIONS.map((s) => (
                  <button
                    key={s.slug}
                    onClick={() => setSort(s.slug)}
                    aria-label={`Sort by ${s.label}`}
                    aria-pressed={sortMode === s.slug}
                    className={`flex-1 min-h-10 rounded-full px-3 text-xs font-medium transition sm:flex-none ${
                      sortMode === s.slug
                        ? "bg-primary text-primary-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>
            <p className="text-xs text-muted-foreground">Pick multiple goals to stack relevance.</p>
          </div>
        )}
      </div>

      {grouped.length === 0 ? (
        <div className="py-16 text-center">
          <p className="text-muted-foreground">
            No compounds match{" "}
            <span className="text-foreground">
              {cat !== "all" ? CATEGORIES.find((c) => c.slug === cat)?.label : "All"}
            </span>
            {hasGoals ? (
              <>
                {" "}
                + <span className="text-foreground">{headingGoal}</span>
              </>
            ) : null}
            .
          </p>
          <button
            onClick={() => {
              trackSearchCleared("library", { term: qInput, from: "zero_results" });
              setCat("all");
              clearGoals();
              setQ("");
            }}
            className="mt-4 rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
          >
            Clear filters
          </button>
        </div>
      ) : ranked ? (
        <div className="space-y-8">
          {ranked.direct.length > 0 && (
            <section className="cv-auto" style={sectionIntrinsic(ranked.direct.length)}>
              <h2 className="mb-1 border-b border-border pb-1 font-display text-xl font-semibold text-muted-foreground">
                Primary — direct-acting for {headingGoal}
              </h2>
              <p className="mb-3 text-xs text-muted-foreground">
                {goalSlugs.length > 1
                  ? "Ranked by how many of your selected goals each compound covers."
                  : "Ranked by how focused each compound is on this goal."}
              </p>
              <ul className="grid gap-2 sm:grid-cols-2">
                {ranked.direct.map((c) => (
                  // eslint-disable-next-line @typescript-eslint/no-use-before-define -- lint-baseline: pre-existing; do not add new ones.
                  <CompoundCard
                    key={c.id}
                    c={c}
                    highlightGoals={goalSet}
                    matchCount={ranked.score(c).overlap}
                    showMatchBadge={goalSlugs.length > 1}
                  />
                ))}
              </ul>
            </section>
          )}
          {ranked.supportive.length > 0 && (
            <section className="cv-auto" style={sectionIntrinsic(ranked.supportive.length)}>
              <h2 className="mb-1 border-b border-border pb-1 font-display text-xl font-semibold text-muted-foreground">
                Supportive vitamins
              </h2>
              <p className="mb-3 text-xs text-muted-foreground">
                Vitamins help these goals by correcting deficiencies, not as ergogenic aids.
                {goalSlugs.length > 1
                  ? " Ranked by how many of your selected goals they overlap."
                  : " Ranked by how focused each vitamin is on this goal."}
              </p>
              <ul className="grid gap-2 sm:grid-cols-2">
                {ranked.supportive.map((c) => (
                  // eslint-disable-next-line @typescript-eslint/no-use-before-define -- lint-baseline: pre-existing; do not add new ones.
                  <CompoundCard
                    key={c.id}
                    c={c}
                    highlightGoals={goalSet}
                    matchCount={ranked.score(c).overlap}
                    showMatchBadge={goalSlugs.length > 1}
                  />
                ))}
              </ul>
            </section>
          )}
        </div>
      ) : (
        <div className="space-y-8">
          {grouped.map(([letter, items]) => (
            <section key={letter} className="cv-auto" style={sectionIntrinsic(items.length)}>
              <h2 className="mb-2 border-b border-border pb-1 font-display text-xl font-semibold text-muted-foreground">
                {letter}
              </h2>
              <ul className="grid gap-2 sm:grid-cols-2">
                {items.map((c) => (
                  // eslint-disable-next-line @typescript-eslint/no-use-before-define -- lint-baseline: pre-existing; do not add new ones.
                  <CompoundCard key={c.id} c={c} />
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
      <ProseContainer>
        <PageProse id="library-index" />
      </ProseContainer>

      <AeoFaq pairs={LIBRARY_FAQ} heading="Library FAQ" />

      <AttributionFooter sourceUrl="https://doseroutine.com/library" />
    </LibraryShell>
  );
}

// Reserves the right amount of space for off-screen sections so
// `content-visibility: auto` can skip their layout/paint without any
// scrollbar jump or visual change.
function sectionIntrinsic(count: number) {
  const rows = Math.max(1, Math.ceil(count / 2));
  return { containIntrinsicSize: `1px ${rows * 104 + 56}px` } as const;
}

const CompoundCard = memo(function CompoundCard({
  c,
  highlightGoals,
  matchCount,
  showMatchBadge,
}: {
  c: LibraryCompound;
  highlightGoals?: Set<string>;
  matchCount?: number;
  showMatchBadge?: boolean;
}) {
  return (
    <li>
      <Link
        to="/library/$slug"
        params={{ slug: c.slug }}
        className="block rounded-xl bg-card p-4 transition hover:bg-[color:var(--card-hover,rgba(255,255,255,0.04))]"
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="font-semibold">{c.name}</div>
            {c.aliases && c.aliases.length > 0 && (
              <div className="mt-0.5 text-xs text-muted-foreground">
                {c.aliases.slice(0, 3).join(", ")}
              </div>
            )}
          </div>
          <div className="flex shrink-0 flex-col items-end gap-1">
            <span className="rounded-full bg-background px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
              {c.category}
            </span>
            {showMatchBadge && typeof matchCount === "number" && matchCount > 0 && (
              <span className="rounded-full bg-primary px-2 py-0.5 text-[10px] font-semibold text-primary-foreground">
                {matchCount}/{highlightGoals?.size ?? 0} match
              </span>
            )}
          </div>
        </div>
        {c.goal_tags && c.goal_tags.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1">
            {c.goal_tags.map((t) => {
              const hit = highlightGoals?.has(t);
              return (
                <span
                  key={t}
                  className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
                    hit ? "bg-primary text-primary-foreground" : "bg-primary/10 text-primary"
                  }`}
                >
                  {t.replace("-", " ")}
                </span>
              );
            })}
          </div>
        )}
      </Link>
    </li>
  );
});
