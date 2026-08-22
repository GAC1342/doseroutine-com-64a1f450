import { PageProse } from "@/components/page-prose";
import { canonicalLinks } from "@/lib/hreflang";
import { ProseContainer } from "@/components/prose-container";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { ArrowLeftRight, Search } from "lucide-react";
import { allCompoundsQuery, type LibraryCompound } from "@/lib/library-data";
import { LibraryShell } from "@/components/library-shell";
import { z } from "zod";
import { breadcrumbScript } from "@/lib/breadcrumb-schema";
import { withDoseRoutineDescriptionSuffix } from "@/lib/seo-description";
import { Card } from "@/components/ui/card";
import { AeoFaq } from "@/components/aeo-faq";
import { aeoFaqScript } from "@/lib/aeo";
import { COMPARE_FAQ } from "@/lib/aeo-faqs-hubs";

const searchSchema = z.object({
  a: z.string().optional(),
  b: z.string().optional(),
});

export const Route = createFileRoute("/compare")({
  validateSearch: (s) => searchSchema.parse(s),
  loaderDeps: ({ search }) => ({ a: search.a, b: search.b }),
  loader: async ({ context }) => {
    await context.queryClient.ensureQueryData(allCompoundsQuery);
    return null;
  },
  head: ({ match }) => {
    const s = match.search as { a?: string; b?: string };
    const hasBoth = !!(s.a && s.b);
    const titleBase = hasBoth ? `${prettify(s.a!)} vs ${prettify(s.b!)}` : "Compare Compounds";
    const title = `${titleBase} — Side-by-Side | DoseRoutine`;
    const desc = withDoseRoutineDescriptionSuffix(
      hasBoth
        ? `Compare ${prettify(s.a!)} vs ${prettify(s.b!)}: mechanism, half-life, timing, food rules, and interactions — plain English.`
        : "Compare any two peptides, hormones, vitamins or supplements side-by-side. Mechanism, half-life, timing and interactions in plain English.",
    );
    const url = hasBoth
      ? `https://doseroutine.com/compare?a=${s.a}&b=${s.b}`
      : "https://doseroutine.com/compare";
    return {
      meta: [
        { title },
        { name: "description", content: desc },
        {
          name: "robots",
          content: "index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1",
        },
        { property: "og:site_name", content: "DoseRoutine" },
        { property: "og:title", content: title },
        { property: "og:description", content: desc },
        { property: "og:type", content: "website" },
        { property: "og:url", content: url },
        { property: "og:image", content: "https://doseroutine.com/og/compare-default.jpg" },
        { property: "og:image:width", content: "1200" },
        { property: "og:image:height", content: "640" },
        { property: "og:image:alt", content: "DoseRoutine compound comparison" },
        { name: "twitter:card", content: "summary_large_image" },
        { name: "twitter:site", content: "@doseroutine" },
        { name: "twitter:title", content: title },
        { name: "twitter:description", content: desc },
        { name: "twitter:image", content: "https://doseroutine.com/og/compare-default.jpg" },
        { name: "twitter:image:alt", content: "DoseRoutine compound comparison" },
      ],
      links: [...canonicalLinks(url)],
      scripts: [
        aeoFaqScript(url, COMPARE_FAQ),
        breadcrumbScript(
          url,
          hasBoth
            ? [
                { name: "Compare", path: "/compare" },
                {
                  name: `${prettify(s.a!)} vs ${prettify(s.b!)}`,
                  path: `/compare?a=${s.a}&b=${s.b}`,
                },
              ]
            : [{ name: "Compare", path: "/compare" }],
        ),

        {
          type: "application/ld+json",
          children: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "WebApplication",
            speakable: {
              "@type": "SpeakableSpecification",
              cssSelector: [".dr-speakable-answer", ".dr-speakable-intro", "h1"],
            },
            name: "DoseRoutine Compound Comparison",
            applicationCategory: "LifestyleApplication",
            operatingSystem: "Any",
            url: "https://doseroutine.com/compare",
            description:
              "Side-by-side comparison tool for peptides, hormones, vitamins and supplements — mechanism, half-life, timing, food rules and interactions.",
            offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
            publisher: {
              "@type": "Organization",
              "@id": "https://doseroutine.com/#organization",
              name: "DoseRoutine",
              url: "https://doseroutine.com",
            },
          }),
        },
      ],
    };
  },
  component: ComparePage,
});

function prettify(slug: string) {
  return slug
    .split("-")
    .map((w) => w[0]?.toUpperCase() + w.slice(1))
    .join(" ");
}

function ComparePage() {
  const { a, b } = Route.useSearch();
  const navigate = useNavigate();
  const { data: compounds } = useSuspenseQuery(allCompoundsQuery);

  const bySlug = useMemo(() => {
    const m = new Map<string, LibraryCompound>();
    for (const c of compounds) m.set(c.slug, c);
    return m;
  }, [compounds]);

  const A = a ? bySlug.get(a) : undefined;
  const B = b ? bySlug.get(b) : undefined;

  function setSide(side: "a" | "b", slug: string) {
    navigate({
      to: "/compare",
      search: (prev: { a?: string; b?: string }) => ({ ...prev, [side]: slug || undefined }),
      replace: true,
    });
  }

  return (
    <LibraryShell>
      <div className="mx-auto max-w-5xl px-6 py-10">
        <div className="mb-6 flex items-center gap-3">
          <ArrowLeftRight className="h-6 w-6 text-primary" />
          <div>
            <h1 className="font-display text-3xl font-semibold tracking-tight">
              Compare Compounds
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Pick any two compounds to see mechanism, timing and interactions side by side.
            </p>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <CompoundPicker
            label="Compound A"
            selected={A}
            all={compounds}
            excludeSlug={B?.slug}
            onChange={(slug) => setSide("a", slug)}
          />
          <CompoundPicker
            label="Compound B"
            selected={B}
            all={compounds}
            excludeSlug={A?.slug}
            onChange={(slug) => setSide("b", slug)}
          />
        </div>

        {A && B ? (
          <ComparisonTable a={A} b={B} />
        ) : (
          <div className="mt-8 rounded-2xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
            Choose two compounds above to see the side-by-side breakdown.
          </div>
        )}

        <ProseContainer>
          <PageProse id="compare" />
        </ProseContainer>

        <AeoFaq pairs={COMPARE_FAQ} />

        <div className="mt-10 text-xs text-muted-foreground">
          Educational summary only. Not medical advice.{" "}
          <Link to="/medical-disclaimer" className="underline">
            Read the full disclaimer
          </Link>
          .
        </div>
      </div>
    </LibraryShell>
  );
}

function CompoundPicker({
  label,
  selected,
  all,
  excludeSlug,
  onChange,
}: {
  label: string;
  selected?: LibraryCompound;
  all: LibraryCompound[];
  excludeSlug?: string;
  onChange: (slug: string) => void;
}) {
  const [q, setQ] = useState("");
  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    return all
      .filter((c) => c.slug !== excludeSlug)
      .filter(
        (c) =>
          !s ||
          c.name.toLowerCase().includes(s) ||
          c.aliases?.some((a) => a.toLowerCase().includes(s)),
      )
      .slice(0, 8);
  }, [all, q, excludeSlug]);

  return (
    <Card className="rounded-2xl border-border p-4">
      <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </div>
      {selected ? (
        <div>
          <div className="text-lg font-semibold">{selected.name}</div>
          <div className="text-xs text-muted-foreground capitalize">{selected.category}</div>
          <button onClick={() => onChange("")} className="mt-3 text-xs text-primary underline">
            Change
          </button>
        </div>
      ) : (
        <div>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search compounds…"
              className="w-full rounded-lg border border-border bg-background py-2 pl-9 pr-3 text-sm"
            />
          </div>
          {q && (
            <div className="mt-2 space-y-1">
              {filtered.length === 0 ? (
                <div className="text-xs text-muted-foreground">No matches</div>
              ) : (
                filtered.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => {
                      onChange(c.slug);
                      setQ("");
                    }}
                    className="tap-target flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm hover:bg-background"
                  >
                    <span className="font-medium">{c.name}</span>
                    <span className="text-xs text-muted-foreground capitalize">{c.category}</span>
                  </button>
                ))
              )}
            </div>
          )}
        </div>
      )}
    </Card>
  );
}

function Row({ label, a, b }: { label: string; a: React.ReactNode; b: React.ReactNode }) {
  return (
    <div className="grid grid-cols-3 gap-3 border-b border-border/60 py-3 text-sm last:border-0">
      <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </div>
      <div>{a ?? <span className="text-muted-foreground">—</span>}</div>
      <div>{b ?? <span className="text-muted-foreground">—</span>}</div>
    </div>
  );
}

function ComparisonTable({ a, b }: { a: LibraryCompound; b: LibraryCompound }) {
  const fmt = (v: string | number | null | undefined) =>
    v === null || v === undefined || v === "" ? null : String(v);

  return (
    <Card className="mt-8 rounded-2xl border-border p-5">
      <div className="grid grid-cols-3 gap-3 border-b border-border pb-3">
        <div />
        <HeaderCell c={a} />
        <HeaderCell c={b} />
      </div>
      <Row
        label="Category"
        a={<span className="capitalize">{a.category}</span>}
        b={<span className="capitalize">{b.category}</span>}
      />
      <Row
        label="Half-life"
        a={fmt(a.half_life_hours ? `${a.half_life_hours} hrs` : null)}
        b={fmt(b.half_life_hours ? `${b.half_life_hours} hrs` : null)}
      />
      <Row label="Typical timing" a={fmt(a.typical_timing)} b={fmt(b.typical_timing)} />
      <Row label="Food rule" a={fmt(a.food_rule)} b={fmt(b.food_rule)} />
      <Row
        label="Injectable"
        a={a.is_injectable ? "Yes" : "No"}
        b={b.is_injectable ? "Yes" : "No"}
      />
      <Row
        label="Controlled substance"
        a={a.is_controlled ? "Yes" : "No"}
        b={b.is_controlled ? "Yes" : "No"}
      />
      <Row
        label="Common goals"
        a={a.goal_tags?.length ? a.goal_tags.join(", ") : null}
        b={b.goal_tags?.length ? b.goal_tags.join(", ") : null}
      />
      <Row
        label="Also known as"
        a={a.aliases?.length ? a.aliases.slice(0, 4).join(", ") : null}
        b={b.aliases?.length ? b.aliases.slice(0, 4).join(", ") : null}
      />

      <div className="mt-4 grid grid-cols-2 gap-3">
        <Link
          to="/library/$slug"
          params={{ slug: a.slug }}
          className="rounded-xl border border-border bg-background px-4 py-2 text-center text-sm font-semibold hover:opacity-90"
        >
          Full profile: {a.name} →
        </Link>
        <Link
          to="/library/$slug"
          params={{ slug: b.slug }}
          className="rounded-xl border border-border bg-background px-4 py-2 text-center text-sm font-semibold hover:opacity-90"
        >
          Full profile: {b.name} →
        </Link>
      </div>
    </Card>
  );
}

function HeaderCell({ c }: { c: LibraryCompound }) {
  return (
    <div>
      <div className="text-base font-semibold">{c.name}</div>
      <div className="text-xs text-muted-foreground capitalize">{c.category}</div>
    </div>
  );
}
