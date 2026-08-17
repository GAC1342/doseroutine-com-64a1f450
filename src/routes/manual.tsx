import { createFileRoute, Link, useRouterState } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Bookmark, BookmarkCheck, BookOpen, ChevronRight, Lightbulb, Search, X } from "lucide-react";
import { MANUAL, manualSearch } from "@/lib/manual";
import { useManualBookmarks } from "@/lib/manual-bookmarks";
import { useSessionState } from "@/hooks/use-session";
import { Card } from "@/components/ui/card";
import { ManualChapterFeedback } from "@/components/manual-chapter-feedback";

export const Route = createFileRoute("/manual")({
  head: () => ({
    meta: [
      { title: "DoseRoutine Instruction Manual — How to Use Every Feature" },
      {
        name: "description",
        content:
          "The complete DoseRoutine instruction manual: setup, daily doses, reminders, fitness, food logging, safety tools, reports and troubleshooting.",
      },
      { property: "og:title", content: "DoseRoutine Instruction Manual" },
      {
        property: "og:description",
        content:
          "Step-by-step, plain-English instructions for every part of DoseRoutine, from first setup to troubleshooting.",
      },
      { property: "og:type", content: "article" },
      { property: "og:url", content: "https://doseroutine.com/manual" },
      { name: "twitter:card", content: "summary" },
      { name: "twitter:title", content: "DoseRoutine Instruction Manual" },
      {
        name: "twitter:description",
        content:
          "Step-by-step, plain-English instructions for every part of DoseRoutine, from first setup to troubleshooting.",
      },
      { name: "robots", content: "index, follow, max-image-preview:large, max-snippet:-1" },
    ],
    links: [{ rel: "canonical", href: "https://doseroutine.com/manual" }],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@graph": [
            {
              "@type": "TechArticle",
              "@id": "https://doseroutine.com/manual#article",
              headline: "DoseRoutine Instruction Manual",
              name: "DoseRoutine Instruction Manual",
              description:
                "The complete DoseRoutine instruction manual: setup, daily doses, reminders, fitness, food logging, safety tools, reports and troubleshooting.",
              url: "https://doseroutine.com/manual",
              inLanguage: "en",
              isAccessibleForFree: true,
              proficiencyLevel: "Beginner",
              mainEntityOfPage: "https://doseroutine.com/manual",
              articleSection: MANUAL.map((c) => c.title),
              publisher: {
                "@type": "Organization",
                name: "DoseRoutine",
                url: "https://doseroutine.com",
              },
              hasPart: MANUAL.map((c) => ({
                "@type": "WebPageElement",
                name: `${c.number}. ${c.title}`,
                description: c.intro,
                url: `https://doseroutine.com/manual#${c.id}`,
              })),
            },
            {
              "@type": "ItemList",
              "@id": "https://doseroutine.com/manual#chapters",
              name: "DoseRoutine manual chapters",
              itemListOrder: "https://schema.org/ItemListOrderAscending",
              numberOfItems: MANUAL.length,
              itemListElement: MANUAL.map((c) => ({
                "@type": "ListItem",
                position: c.number,
                name: c.title,
                url: `https://doseroutine.com/manual#${c.id}`,
              })),
            },
            {
              "@type": "BreadcrumbList",
              itemListElement: [
                { "@type": "ListItem", position: 1, name: "Home", item: "https://doseroutine.com/" },
                {
                  "@type": "ListItem",
                  position: 2,
                  name: "Instruction manual",
                  item: "https://doseroutine.com/manual",
                },
              ],
            },
          ],
        }),
      },
    ],
  }),

  component: ManualPage,
});

function ManualPage() {
  const [q, setQ] = useState("");
  const [savedOnly, setSavedOnly] = useState(false);
  const signedIn = useSessionState() === "signed-in";
  const { ids: bookmarks, sync, isBookmarked, toggle, clear } = useManualBookmarks();
  const searched = useMemo(() => manualSearch(q), [q]);
  const chapters = useMemo(
    () =>
      savedOnly
        ? searched
            .map((c) => ({ ...c, sections: c.sections.filter((s) => bookmarks.includes(s.id)) }))
            .filter((c) => c.sections.length > 0)
        : searched,
    [searched, savedOnly, bookmarks],
  );
  const searching = q.trim().length > 0;
  const hash = useRouterState({ select: (s) => s.location.hash });
  const [highlight, setHighlight] = useState<string | null>(null);

  // Deep links from feature pages arrive as /manual#section-id. Client-side
  // navigation doesn't scroll to hashes on its own, so do it here and flash a
  // highlight so the reader sees which steps they were sent to.
  useEffect(() => {
    const id = hash?.replace(/^#/, "");
    if (!id) return;
    setSavedOnly(false);
    setHighlight(id);
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
    const t = setTimeout(() => setHighlight(null), 2500);
    return () => clearTimeout(t);
  }, [hash]);

  return (
    <div className="mx-auto max-w-2xl px-6 py-10">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
          <BookOpen className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h1 className="font-display text-3xl font-semibold tracking-tight">Instruction Manual</h1>
          <p className="text-sm text-muted-foreground">
            Everything DoseRoutine does, explained step by step.
          </p>
        </div>
      </div>

      <div className="relative mt-6">
        <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search the manual: 'reminder', 'meal', 'delete'…"
          aria-label="Search the instruction manual"
          className="tap-target w-full rounded-2xl border border-border bg-card py-3 pl-11 pr-10 text-base focus:border-primary focus:outline-none"
        />
        {searching && (
          <button
            type="button"
            onClick={() => setQ("")}
            aria-label="Clear search"
            className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1 text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {signedIn ? (
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setSavedOnly((v) => !v)}
            aria-pressed={savedOnly}
            className={`tap-target inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition-colors ${
              savedOnly
                ? "border-primary bg-primary/10 text-primary"
                : "border-border bg-card text-muted-foreground hover:text-foreground"
            }`}
          >
            <Bookmark className="h-4 w-4" />
            Saved{bookmarks.length > 0 ? ` (${bookmarks.length})` : ""}
          </button>
          <span className="text-xs text-muted-foreground" aria-live="polite">
            {sync === "syncing"
              ? "Syncing saved sections…"
              : sync === "synced"
                ? "Saved sections sync across your devices"
                : sync === "offline"
                  ? "Saved on this device — will sync when you're back online"
                  : null}
          </span>
          {savedOnly && bookmarks.length > 0 && (
            <button
              type="button"
              onClick={clear}
              className="text-sm text-muted-foreground underline hover:text-foreground"
            >
              Clear all
            </button>
          )}
        </div>
      ) : (
        <p className="mt-4 text-sm text-muted-foreground">
          <Link to="/auth" className="font-medium text-primary hover:underline">
            Sign in
          </Link>{" "}
          to save sections and send feedback on a chapter.
        </p>
      )}

      {savedOnly && bookmarks.length === 0 && (
        <p className="mt-6 rounded-2xl border border-border bg-card p-6 text-center text-sm text-muted-foreground">
          No saved sections yet. Tap the bookmark icon on any section to keep it here.
        </p>
      )}

      {!searching && !savedOnly && (
        <Card className="mt-6 rounded-2xl p-4">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Contents
          </h2>
          <ol className="mt-3 space-y-1">
            {MANUAL.map((c) => (
              <li key={c.id}>
                <a
                  href={`#${c.id}`}
                  className="flex items-center gap-3 rounded-lg px-2 py-2 text-sm text-foreground transition-colors hover:bg-background"
                >
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                    {c.number}
                  </span>
                  <span className="flex-1">{c.title}</span>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </a>
              </li>
            ))}
          </ol>
        </Card>
      )}

      {searching && (
        <p className="mt-4 text-sm text-muted-foreground">
          {chapters.reduce((n, c) => n + c.sections.length, 0)} matching section
          {chapters.reduce((n, c) => n + c.sections.length, 0) === 1 ? "" : "s"}
        </p>
      )}

      {chapters.length === 0 && searching && (
        <p className="mt-6 rounded-2xl border border-border bg-card p-6 text-center text-sm text-muted-foreground">
          Nothing in the manual matched “{q}”. Try a simpler word.
        </p>
      )}

      <div className="mt-8 space-y-10">
        {chapters.map((chapter) => (
          <section key={chapter.id} id={chapter.id} className="scroll-mt-20">
            <h2 className="font-display text-2xl font-semibold tracking-tight">
              <span className="text-primary">{chapter.number}.</span> {chapter.title}
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">{chapter.intro}</p>

            <div className="mt-4 space-y-3">
              {chapter.sections.map((section) => (
                <Card
                  key={section.id}
                  id={section.id}
                  className={`scroll-mt-20 rounded-2xl p-5 transition-shadow ${
                    highlight === section.id ? "ring-2 ring-primary" : ""
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <h3 className="text-base font-semibold text-foreground">{section.title}</h3>
                    {signedIn && (
                      <button
                        type="button"
                        onClick={() => toggle(section.id)}
                        aria-pressed={isBookmarked(section.id)}
                        aria-label={
                          isBookmarked(section.id)
                            ? `Remove “${section.title}” from saved sections`
                            : `Save “${section.title}” for later`
                        }
                        className={`-mr-1 -mt-1 shrink-0 rounded-full p-2 transition-colors ${
                          isBookmarked(section.id)
                            ? "text-primary"
                            : "text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        {isBookmarked(section.id) ? (
                          <BookmarkCheck className="h-5 w-5" />
                        ) : (
                          <Bookmark className="h-5 w-5" />
                        )}
                      </button>
                    )}
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">{section.what}</p>

                  <ol className="mt-4 space-y-2">
                    {section.steps.map((step, i) => (
                      <li key={i} className="flex gap-3 text-sm leading-relaxed text-foreground">
                        <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[11px] font-semibold text-primary">
                          {i + 1}
                        </span>
                        <span>{step}</span>
                      </li>
                    ))}
                  </ol>

                  {section.tips && section.tips.length > 0 && (
                    <ul className="mt-4 space-y-1.5 rounded-xl bg-background p-3">
                      {section.tips.map((tip, i) => (
                        <li
                          key={i}
                          className="flex gap-2 text-xs leading-relaxed text-muted-foreground"
                        >
                          <Lightbulb className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
                          <span>{tip}</span>
                        </li>
                      ))}
                    </ul>
                  )}

                  {section.route && (
                    <Link
                      to={section.route}
                      className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover:underline"
                    >
                      {section.routeLabel ?? "Open"} <ChevronRight className="h-4 w-4" />
                    </Link>
                  )}
                </Card>
              ))}
            </div>

            {signedIn && (
              <ManualChapterFeedback chapterId={chapter.id} chapterTitle={chapter.title} />
            )}
          </section>
        ))}
      </div>

      <Card className="mt-10 rounded-2xl p-5 text-sm text-muted-foreground">
        <p>
          Looking for a short guide on one screen instead? The{" "}
          <Link to="/help" className="font-medium text-primary hover:underline">
            Help Center
          </Link>{" "}
          has a page per feature. Still stuck — email{" "}
          <a href="mailto:support@doseroutine.com" className="underline">
            support@doseroutine.com
          </a>
          .
        </p>
        <p className="mt-3">
          DoseRoutine is a tracking and reference tool. It does not diagnose, prescribe, or replace
          your doctor or pharmacist.
        </p>
      </Card>
    </div>
  );
}
