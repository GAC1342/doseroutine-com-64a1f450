import { cn } from "@/lib/utils";
import { cardClassName } from "@/components/ui/card";
import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { ContentRouteError, ContentRouteNotFound } from "@/components/route-fallbacks";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import {
  allCompoundsQuery,
  compoundBySlugQuery,
  compoundContentQuery,
  compoundReferencesQuery,
  interactionsForCompoundQuery,
} from "@/lib/library-data";
import { LibraryShell } from "@/components/library-shell";
import { SeverityBadge } from "@/components/severity-badge";
import { AttributionFooter } from "@/components/attribution-footer";
import { buildDirectAnswer } from "@/lib/direct-answer";
import { DirectAnswerExcerpt } from "@/components/direct-answer-excerpt";
import { canonicalSlug, canonicalName } from "@/lib/interaction-canonical";
import { goalTitle, isGoalSlug } from "@/lib/goals";
import { trackEvent } from "@/lib/analytics";
import { hreflangLinks, ogLocaleMeta } from "@/lib/hreflang";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { linkifyCompounds } from "@/lib/linkify-compounds";
import { CitationProvider } from "@/components/citation-modal";
import { buildFaqPairs, buildFaqPageJsonLd, type FaqPair } from "@/lib/faq-schema";
import { assertSingleFaqPage } from "@/lib/faq-emission-check";
import { withDoseRoutineDescriptionSuffix } from "@/lib/seo-description";
import type { RescueEntry } from "@/lib/page2-rescue";
import { compoundDefinitionLead } from "@/lib/compound-definition";

import { entitySameAs, entityIdentifiers } from "@/lib/compound-entity-ids";
import {
  baselineCompoundSources,
  citationJsonLd,
  documentCitations,
  resolveCompoundSources,
  studyCitationJsonLd,
  type AuthoritySource,
  type StudyReference,
} from "@/lib/authority-sources";
import { sectionCitations } from "@/lib/section-citations";
import { CitationMarkers } from "@/components/citation-markers";
import { AuthoritySourceList } from "@/components/authority-source-list";
import { StudyReferenceList } from "@/components/study-reference-list";
import { VerifyAtList } from "@/components/verify-at-list";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { verificationLinks } from "@/lib/authority-sources";
import { filterRelevantStudies } from "@/lib/study-relevance";
import { halfLifeLabel, halfLifeHint } from "@/lib/half-life-label";

/** Stored sources plus baseline primary references, de-duplicated. */
function pageSources(
  sourcesMd: string | null | undefined,
  name: string,
  slug: string,
): AuthoritySource[] {
  const resolved = resolveCompoundSources(sourcesMd, name, slug);
  const seen = new Set(resolved.map((s) => (s.url ?? s.label).toLowerCase()));
  const out = [...resolved];
  for (const s of baselineCompoundSources(name, slug)) {
    const key = (s.url ?? s.label).toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(s);
  }
  return out;
}

export const Route = createFileRoute("/library/$slug")({
  loader: async ({ params, context }) => {
    const compound = await context.queryClient.ensureQueryData(compoundBySlugQuery(params.slug));
    if (!compound) throw notFound();
    // Page-2 rescue copy is a large static SEO dataset. Loading it here (instead
    // of importing it at module scope) keeps ~100 KB of route-specific text out
    // of the shared client entry bundle that every page downloads.
    const [content, references, rescueMod] = await Promise.all([
      context.queryClient.ensureQueryData(compoundContentQuery(compound.id)),
      context.queryClient.ensureQueryData(compoundReferencesQuery(params.slug)),
      import("@/lib/page2-rescue"),
      context.queryClient.ensureQueryData(
        interactionsForCompoundQuery(compound.id, compound.category),
      ),
      context.queryClient.ensureQueryData(allCompoundsQuery),
    ]);
    // Studies resolved from a PubMed search can be off-topic; drop those
    // rather than presenting them as evidence for this compound.
    return {
      compound,
      content,
      rescue: (rescueMod.getRescueEntry(params.slug) ?? null) as RescueEntry | null,
      references: filterRelevantStudies(references, compound.name, compound.aliases),
    };
  },
  head: ({ loaderData, params }) => {
    if (!loaderData) {
      return {
        meta: [
          { title: "Compound not found — DoseRoutine" },
          { name: "robots", content: "noindex" },
        ],
      };
    }
    const c = loaderData.compound;
    const content = loaderData.content as
      | {
          meta_title?: string | null;
          meta_description?: string | null;
          structure_image_url?: string | null;
          updated_at?: string | null;
          created_at?: string | null;
          last_reviewed?: string | null;
          faq_md?: string | null;
          sources_md?: string | null;
        }
      | null
      | undefined;

    // Prefer per-compound AI-generated meta_title / meta_description so every
    // compound page ships a unique title + description. The DoseRoutine product
    // suffix is appended after trimming the lead, so the suffix cannot be cut
    // off by long AI-generated descriptions.
    const clamp = (s: string, n: number) =>
      s.length <= n ? s : s.slice(0, n - 1).replace(/[\s,;:.-]+$/, "") + "…";
    const normalizeTitle = (s: string) =>
      s
        .replace(/\s*&\s*/g, " and ")
        .replace(/\s+/g, " ")
        .trim();
    const aliasHint = c.aliases?.length ? ` (${c.aliases.slice(0, 2).join(", ")})` : "";
    const fallbackTitle = `${c.name}${aliasHint} — Benefits, Side Effects, Interactions | DoseRoutine`;
    // Page-2 rescue: pages already ranking 16–55 get a query-matched title and
    // description so the snippet mirrors what people actually typed.
    const rescue = loaderData.rescue;
    // Answer-first pattern per style guide: lead with the compound + product,
    // include "with DoseRoutine" so every meta description mentions both.
    const fallbackDesc = `${c.name}: evidence summary, safety, and interactions.`;
    const rawDesc = rescue?.metaDescription || content?.meta_description?.trim() || fallbackDesc;
    const title = clamp(
      normalizeTitle(rescue?.metaTitle || content?.meta_title?.trim() || fallbackTitle),
      58,
    );
    const desc = withDoseRoutineDescriptionSuffix(rawDesc, 160);

    const url = `https://doseroutine.com/library/${params.slug}`;
    const image = content?.structure_image_url || "https://doseroutine.com/icon-512.png";
    // Use a reliable DoseRoutine-hosted image for social sharing so mobile
    // apps (iMessage, WhatsApp, Telegram, Instagram) always get a 1200x630
    // card even when the structure image host is rate-limited or slow.
    const socialImage = "https://doseroutine.com/og/library-default.jpg";
    // The visible "Last reviewed" line and the schema dates are driven by the
    // same values so they can never disagree. Dates are only ever the real
    // stored timestamps — no synthetic default date is published, because a
    // fabricated publication date is a false freshness signal.
    const lastReviewed = content?.last_reviewed ?? null;
    // Real stored timestamps only, in order of specificity: the content row's
    // own creation, the compound record's creation, then the last edit.
    const datePublished =
      content?.created_at ??
      c?.created_at ??
      content?.updated_at ??
      (lastReviewed ? `${lastReviewed}T00:00:00Z` : null);
    // dateModified must track ACTUAL content changes (the row's updated_at).
    // last_reviewed is an editorial-review date and is surfaced separately as
    // `lastReviewed` on the MedicalWebPage node — never as dateModified.
    const dateModified = content?.updated_at ?? lastReviewed ?? datePublished;
    const dateFields = {
      ...(datePublished ? { datePublished } : {}),
      ...(dateModified ? { dateModified } : {}),
    };

    // BreadcrumbList includes an item URL for every crumb because the in-app
    // structured-data validator treats missing item URLs as errors.
    const breadcrumb = {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      "@id": `${url}#breadcrumb`,
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: "https://doseroutine.com/" },
        {
          "@type": "ListItem",
          position: 2,
          name: "Library",
          item: "https://doseroutine.com/library",
        },
        { "@type": "ListItem", position: 3, name: c.name, item: url },
      ],
    };

    const publisher = {
      "@type": "Organization",
      "@id": "https://doseroutine.com/#organization",
      name: "DoseRoutine",
      url: "https://doseroutine.com",
      logo: {
        "@type": "ImageObject",
        url: "https://doseroutine.com/icon-512.png",
      },
    };

    // Article carries all required Article properties (headline, image,
    // datePublished, dateModified, author, publisher, mainEntityOfPage) so
    // Google reports no missing-field warnings. MedicalWebPage and
    // MedicalSubstance are emitted as separate nodes to avoid property-shape
    // conflicts inside a single multi-typed node.
    const article = {
      "@context": "https://schema.org",
      "@type": "Article",
      "@id": `${url}#article`,
      headline: `${c.name} — Overview, Benefits & Side Effects`,
      description: desc,
      url,
      mainEntityOfPage: { "@type": "WebPage", "@id": url },
      image: [image],
      ...dateFields,
      inLanguage: "en",
      author: publisher,
      publisher,
      about: { "@id": `${url}#substance` },
      // Attribution watermark: explicit canonical citation + sameAs pointing
      // back at DoseRoutine so LLMs summarizing this page have a strong signal
      // to name and link the source. isBasedOn/citation reuse the canonical
      // URL so downstream reproductions inherit provenance.
      isBasedOn: url,
      // citation carries the self-citation string plus every resolved external
      // authority the page references, so answer engines can see the evidence
      // trail (PubChem / PubMed / DailyMed / publisher pages) machine-readably.
      citation: [
        `DoseRoutine. "${c.name} — Overview, Benefits & Side Effects." doseroutine.com. ${url}`,
        ...citationJsonLd(pageSources(content?.sources_md ?? null, c.name, params.slug), {
          pageUrl: url,
        }),
        // Real PubMed records for this compound, emitted as ScholarlyArticle
        // nodes so answer engines can follow the primary literature.
        ...studyCitationJsonLd((loaderData.references ?? []) as StudyReference[]),
      ],
      // Editorial provenance (E-E-A-T): who stands behind the page and the
      // standards it was written to.
      publishingPrinciples: "https://doseroutine.com/editorial-policy",
      reviewedBy: {
        "@type": "Organization",
        name: "DoseRoutine Editorial Team",
        url: "https://doseroutine.com/editorial-policy",
      },

      sameAs: [url],
      copyrightHolder: publisher,
      ...(datePublished ? { copyrightYear: new Date(datePublished).getFullYear() } : {}),
      license: "https://doseroutine.com/legal",
    };

    // WebPage + Article share the same @id (canonical URL) so Google treats
    // this as one page with two types — WebPage carries the correct
    // title / description / canonical, Article carries the editorial
    // metadata. These are educational reference pages, not medical content,
    // so no medical schema types are emitted.
    const webPage = {
      "@context": "https://schema.org",
      "@type": ["WebPage", "Article"],
      "@id": url,
      url,
      name: title,
      headline: `${c.name} — Overview, Benefits & Side Effects`,
      description: desc,
      inLanguage: "en",
      ...dateFields,
      // This node is typed Article as well as WebPage, so it is graded against
      // Article's recommended fields in Google's Rich Results Test: image and
      // mainEntityOfPage have to be on the node itself, not only on #article.
      image: [image],
      mainEntityOfPage: { "@type": "WebPage", "@id": url },
      primaryImageOfPage: { "@type": "ImageObject", url: image },
      breadcrumb: { "@id": `${url}#breadcrumb` },
      mainEntity: { "@id": `${url}#substance` },
      about: { "@id": `${url}#substance` },
      audience: { "@type": "Audience", audienceType: "General public" },
      isPartOf: { "@id": "https://doseroutine.com/#website" },
      author: publisher,
      publisher,
      // Voice assistants / AI answer engines: point them at the answer-first
      // "Quick answer" block and the page intro rather than the whole page.
      speakable: {
        "@type": "SpeakableSpecification",
        cssSelector: [".dr-speakable-answer", ".dr-speakable-intro"],
      },
      // Canonical URL is authoritative for this page.
      potentialAction: {
        "@type": "ReadAction",
        target: [url],
      },
    };

    // MedicalWebPage node: answer engines use it to read the evidence trail
    // (citation[]) and the review date (lastReviewed) for health content. It
    // is emitted as its own @id so it never collides with the WebPage/Article
    // nodes above, which stay exactly as they were.
    const medicalWebPage = {
      "@context": "https://schema.org",
      "@type": "MedicalWebPage",
      "@id": `${url}#medicalwebpage`,
      url,
      name: title,
      description: desc,
      inLanguage: "en",
      isPartOf: { "@id": url },
      about: { "@id": `${url}#substance` },
      audience: { "@type": "Audience", audienceType: "General public" },
      ...dateFields,
      // lastReviewed is required on health pages. When the record has no
      // explicit editorial review date, fall back to the real last-modified
      // date of the entry rather than omitting the field.
      lastReviewed: lastReviewed ?? String(dateModified).slice(0, 10),

      reviewedBy: {
        "@type": "Organization",
        name: "DoseRoutine Editorial Team",
        url: "https://doseroutine.com/editorial-policy",
      },
      publisher,
      // Only resolved, real source URLs — never a fabricated citation.
      citation: [
        ...citationJsonLd(pageSources(content?.sources_md ?? null, c.name, params.slug), {
          pageUrl: url,
        }),
        ...studyCitationJsonLd((loaderData.references ?? []) as StudyReference[]),
      ],
    };

    // Vitamins, minerals, herbs and botanicals qualify as DietarySupplement.
    // Everything else (peptides, hormones, GLP-1s, research compounds) is
    // described as a DefinedTerm — an encyclopedia-style reference entry —
    // rather than a medical substance.
    const catLc = (c.category ?? "").toLowerCase();
    const isDietarySupplement =
      catLc.includes("vitamin") ||
      catLc.includes("mineral") ||
      catLc.includes("herb") ||
      catLc.includes("botanical") ||
      catLc.includes("amino") ||
      catLc === "supplement";
    const substance: Record<string, unknown> = {
      "@context": "https://schema.org",
      // DietarySupplement only — no "Product". These are educational reference
      // entries with nothing for sale, and Product makes the Rich Results Test
      // grade them as commerce entities (missing offers / review / price).
      "@type": isDietarySupplement ? "DietarySupplement" : "DefinedTerm",
      "@id": `${url}#substance`,
      name: c.name,
      description: desc,
      url,
      image: [image],
      isPartOf: { "@id": "https://doseroutine.com/#website" },
    };
    if (c.aliases && c.aliases.length > 0) substance.alternateName = c.aliases;

    // External entity grounding: PubChem / Wikidata / Wikipedia links let answer
    // engines confirm this page describes the same substance they already know.
    const sameAs = entitySameAs(params.slug);
    if (sameAs.length > 0) substance.sameAs = sameAs;
    const identifiers = entityIdentifiers(params.slug);
    if (identifiers.length > 0) substance.identifier = identifiers;

    return {
      meta: [
        { title },
        { name: "description", content: desc },
        { name: "author", content: "DoseRoutine" },
        {
          name: "copyright",
          content: `© ${new Date().getFullYear()} DoseRoutine — doseroutine.com`,
        },
        { property: "og:site_name", content: "DoseRoutine" },
        { property: "og:title", content: title },
        { property: "og:description", content: desc },
        { property: "og:type", content: "article" },
        { property: "og:url", content: url },
        { property: "og:image", content: socialImage },
        { property: "og:image:width", content: "1200" },
        { property: "og:image:height", content: "640" },
        { property: "og:image:alt", content: `DoseRoutine library entry for ${c.name}` },
        { property: "article:publisher", content: "https://doseroutine.com" },
        ...(datePublished ? [{ property: "article:published_time", content: datePublished }] : []),
        ...(dateModified ? [{ property: "article:modified_time", content: dateModified }] : []),
        { name: "twitter:card", content: "summary_large_image" },
        { name: "twitter:site", content: "@doseroutine" },
        { name: "twitter:title", content: title },
        { name: "twitter:description", content: desc },
        { name: "twitter:image", content: socialImage },
        { name: "twitter:image:alt", content: `DoseRoutine library entry for ${c.name}` },
        // Attribution/citation meta (Highwire-style) — LLMs and Google
        // Scholar-style crawlers pick these up when generating citations.
        { name: "citation_title", content: `${c.name} — Overview, Benefits & Side Effects` },
        { name: "citation_author", content: "DoseRoutine" },
        { name: "citation_publisher", content: "DoseRoutine (doseroutine.com)" },
        ...((dateModified ?? datePublished)
          ? [
              {
                name: "citation_online_date",
                content: (dateModified ?? datePublished)!.slice(0, 10),
              },
            ]
          : []),
        ...(datePublished
          ? [{ name: "citation_publication_date", content: datePublished.slice(0, 10) }]
          : []),
        { name: "citation_fulltext_html_url", content: url },
        { name: "dcterms.title", content: `${c.name} — Overview, Benefits & Side Effects` },
        { name: "dcterms.creator", content: "DoseRoutine" },
        { name: "dcterms.publisher", content: "DoseRoutine" },
        { name: "dcterms.source", content: url },
        {
          name: "dcterms.rights",
          content: `© ${new Date().getFullYear()} DoseRoutine — doseroutine.com`,
        },
        ...ogLocaleMeta("en"),
      ],
      links: [{ rel: "canonical", href: url }, ...hreflangLinks(`/library/${params.slug}`)],
      scripts: (() => {
        const faqPage = buildFaqPageJsonLd(c, content ?? null, url, rescue?.extraFaq ?? []);
        const arr = [
          { type: "application/ld+json", children: JSON.stringify(article) },
          { type: "application/ld+json", children: JSON.stringify(webPage) },
          { type: "application/ld+json", children: JSON.stringify(medicalWebPage) },

          { type: "application/ld+json", children: JSON.stringify(substance) },
          { type: "application/ld+json", children: JSON.stringify(breadcrumb) },
          ...(faqPage ? [{ type: "application/ld+json", children: JSON.stringify(faqPage) }] : []),
        ];
        assertSingleFaqPage(arr, { route: "/library/$slug", slug: params.slug });
        return arr;
      })(),
    };
  },
  component: CompoundDetail,
  errorComponent: ContentRouteError,
  notFoundComponent: () => <ContentRouteNotFound label="Compound" />,
});

// FAQ parsing + template fallback live in @/lib/faq-schema so head() and the
// visible accordion share one source of truth. Do not add a local parser here.

function renderInlineMd(text: string): React.ReactNode[] {
  // Supports [label](url) and bare http(s) URLs. Keeps newlines intact.
  const nodes: React.ReactNode[] = [];
  const pattern = /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)|(https?:\/\/[^\s)]+)/g;
  let last = 0;
  let match: RegExpExecArray | null;
  let key = 0;
  while ((match = pattern.exec(text)) !== null) {
    if (match.index > last) nodes.push(text.slice(last, match.index));
    const [full, label, url1, url2] = match;
    const href = url1 ?? url2;
    const text_ = label ?? href;
    nodes.push(
      <a
        key={`lnk-${key++}`}
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="text-primary underline underline-offset-2 hover:opacity-80"
      >
        {text_}
      </a>,
    );
    last = match.index + full.length;
  }
  if (last < text.length) nodes.push(text.slice(last));
  return nodes;
}

function Prose({ children }: { children: React.ReactNode }) {
  const content = typeof children === "string" ? renderInlineMd(children) : children;
  return (
    <div className="whitespace-pre-wrap text-[15px] leading-relaxed text-foreground/90">
      {content}
    </div>
  );
}

function CompoundDetail() {
  const { compound, rescue } = Route.useLoaderData();
  const { data: content } = useSuspenseQuery(compoundContentQuery(compound.id));
  const { data: rawRules } = useSuspenseQuery(
    interactionsForCompoundQuery(compound.id, compound.category),
  );
  const { data: allCompounds } = useSuspenseQuery(allCompoundsQuery);

  // Alias rows ("Levothyroxine Sodium") and repeated pairs each carry their own
  // rule id, so the raw list renders the same clinical fact several times.
  // Fold every rule onto its canonical partner slug and keep the first rule per
  // canonical pair. Display only — no database row is changed.
  const compoundById = new Map(allCompounds.map((c) => [c.id, c]));
  const seenPairs = new Set<string>();
  const rules = rawRules.filter((r: (typeof rawRules)[number]) => {
    const otherId =
      r.compound_a_id && r.compound_b_id
        ? r.compound_a_id === compound.id
          ? r.compound_b_id
          : r.compound_a_id
        : null;
    const otherSlug = otherId ? compoundById.get(otherId)?.slug : null;
    const key = otherSlug
      ? `pair:${canonicalSlug(otherSlug)}`
      : `cat:${r.category_a}x${r.category_b}`;
    if (seenPairs.has(key)) return false;
    seenPairs.add(key);
    return true;
  });


  // Only tags that map to a real /goals/<slug> hub may be linked — unknown tags
  // (e.g. "energy", "performance") would render 404 internal links.
  const goalTags = (compound.goal_tags ?? []).filter((g: string) => isGoalSlug(g));
  const related = allCompounds
    .filter((c) => c.id !== compound.id)
    .map((c) => {
      const sharedGoals = (c.goal_tags ?? []).filter((g: string) => goalTags.includes(g)).length;
      const sameCat = c.category === compound.category ? 1 : 0;
      return { c, score: sharedGoals * 2 + sameCat };
    })
    .filter((r) => r.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 6)
    .map((r) => r.c);

  // Group siblings by shared benefit tag for a cross-link cluster.
  // Curated, not alphabetical: within each benefit we surface the siblings with
  // the strongest evidence overlap (most shared goal tags, then same category),
  // so an unrelated compound never appears just because it sorts early.
  const benefitGroups = goalTags
    .map((tag: string) => ({
      tag,
      compounds: allCompounds
        .filter((c) => c.id !== compound.id && (c.goal_tags ?? []).includes(tag))
        .map((c) => {
          const shared = (c.goal_tags ?? []).filter((g: string) => goalTags.includes(g)).length;
          return { c, score: shared * 2 + (c.category === compound.category ? 1 : 0) };
        })
        .sort((a, b) => b.score - a.score || a.c.name.localeCompare(b.c.name))
        .slice(0, 6)
        .map((r) => r.c),
    }))
    .filter((g: { compounds: unknown[] }) => g.compounds.length > 0);

  // Alphabetical prev/next across the full library for a linear crawl path.
  const sorted = [...allCompounds].sort((a, b) => a.name.localeCompare(b.name));
  const idx = sorted.findIndex((c) => c.id === compound.id);
  const prev = idx > 0 ? sorted[idx - 1] : null;
  const next = idx >= 0 && idx < sorted.length - 1 ? sorted[idx + 1] : null;

  const overview =
    content?.overview_md ??
    content?.body_md ??
    compound.education_md ??
    `${compound.name} is catalogued in DoseRoutine as a ${compound.category}. A detailed evidence-based summary is being prepared from NIH, Mayo Clinic, FDA label and PubChem sources.`;

  // Numbered document-level sources shared by the inline markers and the
  // "Sources and references" list below (same order = same numbering).
  const pageDocs = documentCitations(
    pageSources(content?.sources_md ?? null, compound.name, compound.slug),
  );

  const definitionLead = compoundDefinitionLead(
    {
      name: compound.name,
      category: compound.category,
      goalTags: compound.goal_tags ?? [],
      aliases: compound.aliases ?? [],
      isInjectable: compound.is_injectable,
    },
    {
      rescueAnswer: rescue?.answer ?? null,
      overviewMd: content?.overview_md ?? null,
      bodyMd: content?.body_md ?? null,
      educationMd: compound.education_md ?? null,
    },
  );

  // 40-60 word reference answer rendered directly under the H1, before any CTA.
  const directAnswer = buildDirectAnswer(
    {
      name: compound.name,
      category: compound.category,
      goalTags: goalTags,
      halfLifeHours: compound.half_life_hours,
      typicalTiming: compound.typical_timing,
      isInjectable: compound.is_injectable,
      isControlled: compound.is_controlled,
    },
    definitionLead,
  );

  const faq: FaqPair[] = buildFaqPairs(compound, content ?? null, rescue?.extraFaq ?? []);

  // --- Evidence signals derived from what's actually populated ---
  const contentFields = [
    content?.mechanism_md,
    content?.benefits_md,
    content?.evidence_md,
    content?.side_effects_md,
    content?.warnings_md,
    content?.contraindications_md,
    content?.do_not_mix_md,
    content?.timing_md,
  ];
  const filledFields = contentFields.filter((f) => f && f.trim().length > 40).length;
  const hasInteractionData = rules.length > 0;
  const hasStructure = Boolean(content?.structure_image_url);

  // 0-100 confidence: content coverage (70) + interaction rules (20) + structure (10)
  const confidencePct = Math.min(
    100,
    Math.round((filledFields / 8) * 70) + (hasInteractionData ? 20 : 0) + (hasStructure ? 10 : 0),
  );
  const confidenceLabel =
    confidencePct >= 80
      ? "High"
      : confidencePct >= 55
        ? "Moderate"
        : confidencePct >= 30
          ? "Emerging"
          : "Preliminary";
  const confidenceTone =
    confidencePct >= 80
      ? "bg-primary/15 text-primary border-primary/30"
      : confidencePct >= 55
        ? "bg-primary/10 text-primary border-primary/20"
        : "bg-card text-muted-foreground border-border";

  // Extract PMIDs from combined markdown. Matches "PMID: 12345678" and PubMed URLs.
  const combinedMd = [overview, ...contentFields.filter(Boolean)].join("\n\n");
  const pmidSet = new Set<string>();
  const pmidRegex = /(?:PMID[:\s]+|pubmed\.ncbi\.nlm\.nih\.gov\/)(\d{5,9})/gi;
  let m: RegExpExecArray | null;
  while ((m = pmidRegex.exec(combinedMd)) !== null) pmidSet.add(m[1]);
  const pmids = Array.from(pmidSet).slice(0, 8);

  const sections: Array<{ id: string; title: string; body: string | null | undefined }> = [
    { id: "mechanism", title: `How does ${compound.name} work?`, body: content?.mechanism_md },
    { id: "benefits", title: `What is ${compound.name} used for?`, body: content?.benefits_md },
    { id: "evidence", title: `How strong is the evidence for ${compound.name}?`, body: content?.evidence_md },
    { id: "side-effects", title: `What are the side effects of ${compound.name}?`, body: content?.side_effects_md },
    { id: "warnings", title: `Who should avoid ${compound.name}?`, body: content?.warnings_md },
    { id: "contra", title: `When should ${compound.name} not be taken?`, body: content?.contraindications_md },
    { id: "do-not-mix", title: `What should you not mix with ${compound.name}?`, body: content?.do_not_mix_md },
    { id: "timing", title: `When should you take ${compound.name}?`, body: content?.timing_md },
  ];
  const visibleSections = sections.filter((s) => s.body && s.body.trim().length > 20);

  // Human-readable labels for the hash-linkable sections so a fallback notice
  // can mention what the visitor was looking for.
  const SECTION_LABELS: Record<string, string> = {
    mechanism: "How it works",
    benefits: "Studied benefits",
    evidence: "State of the evidence",
    "side-effects": "Side effects",
    warnings: "Warnings",
    contra: "Contraindications",
    "do-not-mix": "Do not mix with",
    timing: "Timing, food & half-life",
  };

  // Open (and scroll to) the accordion item referenced by the URL hash, e.g. #benefits.
  // If the section doesn't exist for this compound, fall back gracefully:
  // surface a dismissible notice, clear the hash, and log a missing-section event.
  const [openSections, setOpenSections] = useState<string[]>([]);
  const [evidenceOpen, setEvidenceOpen] = useState(false);
  const [missingSection, setMissingSection] = useState<string | null>(null);
  useEffect(() => {
    const applyHash = () => {
      const hash = window.location.hash.replace("#", "");
      if (!hash) return;
      // Only react to hashes that look like section deep-links we own.
      if (!(hash in SECTION_LABELS)) return;
      const match = visibleSections.find((s) => s.id === hash);
      if (match) {
        setMissingSection(null);
        setOpenSections((prev) => (prev.includes(hash) ? prev : [...prev, hash]));
        trackEvent("compound_section_auto_open", {
          compound_slug: compound.slug,
          section: hash,
          referrer: typeof document !== "undefined" ? document.referrer || null : null,
        });
        requestAnimationFrame(() => {
          document.getElementById(hash)?.scrollIntoView({ behavior: "smooth", block: "start" });
        });
      } else {
        // Graceful fallback: no crash, no dead scroll target — show a notice,
        // scroll to the top of the article, and strip the hash so a refresh
        // doesn't loop the same missing-section flow.
        setMissingSection(hash);
        trackEvent("compound_section_missing", {
          compound_slug: compound.slug,
          section: hash,
          available_sections: visibleSections.map((s) => s.id),
          referrer: typeof document !== "undefined" ? document.referrer || null : null,
        });
        try {
          window.history.replaceState(null, "", window.location.pathname + window.location.search);
        } catch {
          /* noop */
        }
        requestAnimationFrame(() => {
          window.scrollTo({ top: 0, behavior: "smooth" });
        });
      }
    };
    applyHash();
    window.addEventListener("hashchange", applyHash);
    return () => window.removeEventListener("hashchange", applyHash);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [compound.id]);

  return (
    <LibraryShell>
      <CitationProvider>
        <nav aria-label="Breadcrumb" className="mb-4 text-xs text-muted-foreground">
          <ol className="flex flex-wrap items-center gap-1.5">
            <li>
              <Link to="/" className="hover:text-foreground focus:outline-none focus:underline">
                Home
              </Link>
            </li>
            <li aria-hidden="true" className="text-muted-foreground">
              /
            </li>
            <li>
              <Link
                to="/library"
                // Exact matching only: without this the router treats /library
                // as active on every /library/* page and stamps a second
                // aria-current="page" alongside the real leaf crumb.
                activeOptions={{ exact: true }}
                className="hover:text-foreground focus:outline-none focus:underline"
              >
                Compound Library
              </Link>
            </li>
            <li aria-hidden="true" className="text-muted-foreground">
              /
            </li>
            <li>
              <span className="rounded-full bg-card px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide">
                {compound.category}
              </span>
            </li>
            <li aria-hidden="true" className="text-muted-foreground">
              /
            </li>
            <li aria-current="page" className="truncate font-medium text-foreground">
              {compound.name}
            </li>
          </ol>
        </nav>

        <header className="mb-6 grid gap-6 md:grid-cols-[minmax(0,1fr)_auto] md:items-start">
          <div className="min-w-0">
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-card px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                {compound.category}
              </span>
              {compound.is_injectable && (
                <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">
                  Injectable
                </span>
              )}
              {compound.is_controlled && (
                <span className="rounded-full bg-[color:var(--severity-caution-bg,rgba(201,138,0,0.15))] px-2 py-0.5 text-[10px] font-medium text-[color:var(--severity-caution,#a16207)]">
                  Controlled
                </span>
              )}
            </div>
            <h1 className="font-display text-4xl font-semibold tracking-tight">
              {compound.name}
              <span className="mt-1 block text-lg font-medium text-muted-foreground">
                Benefits, Dosage &amp; Interactions
              </span>
            </h1>
            {compound.aliases && compound.aliases.length > 0 && (
              <p className="mt-2 text-sm text-muted-foreground">
                Also known as: {compound.aliases.join(", ")}
              </p>
            )}
            {/* Definitional lead: the first substantive sentence on the page, so
              answer engines extract a definition rather than the disclaimer. */}
            <p className="dr-speakable-intro mt-3 text-[15px] leading-relaxed text-foreground">
              {directAnswer}
            </p>
            <LastReviewedLine value={content?.last_reviewed ?? null} />

            <div className="mt-3 flex flex-wrap items-center gap-2">
              <TooltipProvider delayDuration={150}>
                {/* Controlled so the explanation also opens on tap: a
                    hover-only tooltip is unreachable on touch devices. */}
                <Tooltip open={evidenceOpen} onOpenChange={setEvidenceOpen}>
                  <TooltipTrigger asChild>
                    <span
                      tabIndex={0}
                      role="button"
                      onClick={() => setEvidenceOpen((v) => !v)}
                      aria-label={`Evidence coverage ${confidencePct} percent. What this measures.`}
                      className={`inline-flex cursor-help items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold ${confidenceTone}`}
                    >
                      Evidence: {confidenceLabel} · {confidencePct}%
                    </span>
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs text-xs leading-relaxed">
                    <p>
                      This percentage measures how completely this entry is documented in
                      DoseRoutine — not how strong the science is for the compound. It is derived
                      from {filledFields}/8 written sections, {rules.length} interaction rule
                      {rules.length === 1 ? "" : "s"}, and whether a structure record is on file (
                      {hasStructure ? "on file" : "pending"}).
                    </p>
                    <Link to="/sources" className="mt-1 inline-block underline underline-offset-4">
                      How we source and score entries
                    </Link>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
              {pmids.length > 0 && (
                <div className="flex flex-wrap items-center gap-1">
                  <span className="text-[11px] text-muted-foreground">PubMed:</span>
                  {pmids.map((id) => (
                    <a
                      key={id}
                      href={`https://pubmed.ncbi.nlm.nih.gov/${id}/`}
                      target="_blank"
                      rel="noopener noreferrer nofollow"
                      onClick={() =>
                        trackEvent("compound_pmid_click", {
                          compound_slug: compound.slug,
                          pmid: id,
                        })
                      }
                      className="rounded-full border border-border bg-background px-2 py-0.5 font-mono text-[10px] text-foreground hover:border-primary/60 hover:text-primary"
                    >
                      {id}
                    </a>
                  ))}
                </div>
              )}
            </div>
            {/* Sign-up CTAs deliberately sit BELOW the reference content
              (overview, deep dive, interactions, FAQ) — see the conversion
              aside after the FAQ block. */}

          </div>
          {content?.structure_image_url && (
            <figure className="shrink-0 rounded-xl border border-border bg-white p-3">
              <img
                src={content.structure_image_url}
                alt={`Chemical structure of ${compound.name} (PubChem CID ${content.pubchem_cid ?? ""})`}
                width={220}
                height={220}
                loading="lazy"
                className="h-40 w-40 object-contain md:h-52 md:w-52"
                onError={(e) => {
                  (e.currentTarget.parentElement as HTMLElement).style.display = "none";
                }}
              />
              <figcaption className="mt-2 text-center text-[10px] uppercase tracking-wide text-muted-foreground">
                Structure via PubChem
              </figcaption>
            </figure>
          )}
        </header>

        {rescue && (
          <section
            aria-label={`Quick answer: ${rescue.targetQuery}`}
            className="dr-speakable-answer mb-6 rounded-xl border border-primary/25 bg-primary/5 p-5"
          >
            <h2 className="text-sm font-semibold uppercase tracking-wide text-primary">
              Quick answer
            </h2>
            <p className="mt-2 text-[15px] leading-relaxed text-foreground">{rescue.answer}</p>
            <dl className="mt-4 grid gap-x-6 gap-y-2 border-t border-primary/15 pt-4 sm:grid-cols-2">
              {rescue.quickFacts.map((f) => (
                <div key={f.label} className="flex flex-col">
                  <dt className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                    {f.label}
                  </dt>
                  <dd className="text-sm text-foreground">{f.value}</dd>
                </div>
              ))}
            </dl>
            <p className="mt-4 text-[11px] leading-relaxed text-muted-foreground">
              Compiled by DoseRoutine from public sources including NIH/MedlinePlus, the FDA label,
              Mayo Clinic and PubChem. Educational information, not medical advice.
            </p>
          </section>
        )}

        <aside className="mb-6 rounded-xl border border-border bg-card/60 p-4 text-xs leading-relaxed text-muted-foreground">
          <strong className="text-foreground">Educational reference — not medical advice.</strong>{" "}
          Summaries on DoseRoutine are compiled from publicly available sources such as the U.S.
          National Institutes of Health (NIH), the NIH Office of Dietary Supplements, MedlinePlus,
          the FDA drug label, Mayo Clinic patient monographs, Cochrane systematic reviews, PubChem
          and Examine.com. This page does not diagnose, treat, cure or prevent any disease and does
          not replace consultation with a licensed clinician. DoseRoutine assumes no liability for
          how this information is used.
        </aside>


        <div className="mb-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Fact
            label={halfLifeLabel(compound.category)}
            value={compound.half_life_hours ? `${compound.half_life_hours} h` : "—"}
            hint={compound.half_life_hours ? halfLifeHint(compound.category) : undefined}
          />
          <Fact label="Typical timing" value={compound.typical_timing ?? "—"} />
          <Fact label="Food rule" value={compound.food_rule?.replace("_", " ") ?? "—"} />
          <Fact label="Default unit" value={compound.default_unit ?? "—"} />
        </div>

        {goalTags.length > 0 && (
          <section className="mb-8">
            <h2 className="mb-2 font-display text-lg font-semibold">
              What is {compound.name} studied for?
            </h2>

            <div className="flex flex-wrap gap-2">
              {goalTags.map((g: string) => (
                <Link
                  key={g}
                  to="/goals/$goal"
                  params={{ goal: g }}
                  className="rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary hover:bg-primary/20"
                >
                  {goalTitle(g)}
                </Link>
              ))}
            </div>
          </section>
        )}

        {missingSection && (
          <div
            role="status"
            aria-live="polite"
            className="mb-6 flex flex-wrap items-start justify-between gap-3 rounded-xl border border-border bg-card/60 p-4 text-sm"
          >
            <div className="min-w-0">
              <p className="font-medium text-foreground">
                “{SECTION_LABELS[missingSection] ?? missingSection}” isn't published for{" "}
                {compound.name} yet.
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {visibleSections.length > 0
                  ? "Here's the overview and the sections we do have below."
                  : "A full monograph is being prepared from NIH, Mayo Clinic and FDA sources."}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setMissingSection(null)}
              className="rounded-full bg-background px-3 py-1 text-xs font-medium text-foreground hover:opacity-90"
            >
              Dismiss
            </button>
          </div>
        )}

        {compound.category === "vitamin" && (
          <section className="mb-6 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-5">
            <h2 className="mb-2 font-display text-base font-semibold text-amber-900 dark:text-amber-200">
              Deficiency-driven — not a performance booster
            </h2>
            <p className="text-sm text-foreground/90">
              Vitamins primarily help when you're actually low. Extra doses on top of normal levels
              rarely add strength, endurance, or fat loss, and some fat-soluble vitamins (A, D, E,
              K) can build up to harmful levels.
            </p>
            <ul className="mt-3 list-disc pl-5 text-sm text-foreground/90 space-y-1">
              <li>
                Confirm a deficiency with bloodwork <em>before</em> supplementing long-term (e.g.
                25(OH)D for vitamin D, B12/folate, ferritin, magnesium RBC).
              </li>
              <li>
                Talk to your doctor or a registered dietitian about the right dose for your labs,
                medications, and conditions — especially in pregnancy, kidney/liver disease, or
                while on blood thinners.
              </li>
              <li>Re-test every 3–6 months and stop or lower the dose once levels are in range.</li>
            </ul>
            <p className="mt-3 text-xs text-muted-foreground">
              Educational information only — not medical advice. See our{" "}
              <a href="/ai-policy" className="underline">
                AI &amp; medical policy
              </a>
              .
            </p>
          </section>
        )}

        <section className="mb-8 rounded-2xl bg-card p-6">
          <h2 className="mb-3 font-display text-xl font-semibold">
            What is {compound.name}?
            <CitationMarkers sources={sectionCitations("overview", pageDocs)} />
          </h2>
          <Prose>{overview}</Prose>
        </section>


        {visibleSections.length > 0 && (
          <section className="mb-8">
            <h2 className="mb-3 font-display text-xl font-semibold">
              What does the research say about {compound.name}?
            </h2>
            <p className="mb-3 text-xs text-muted-foreground md:hidden">Tap a section to expand.</p>
            <Accordion
              type="multiple"
              className="rounded-2xl bg-card"
              value={openSections}
              onValueChange={setOpenSections}
            >
              {visibleSections.map((s) => (
                <AccordionItem
                  key={s.id}
                  value={s.id}
                  id={s.id}
                  className="border-border/60 px-5 scroll-mt-24"
                >
                  <AccordionTrigger className="text-left font-display text-base font-semibold hover:no-underline">
                    {s.title}
                  </AccordionTrigger>
                  <AccordionContent>
                    <Prose>
                      {s.id === "warnings" || s.id === "contra" || s.id === "do-not-mix"
                        ? linkifyCompounds(s.body ?? "", allCompounds, compound.slug)
                        : s.body}
                    </Prose>
                    {pageDocs.length > 0 && (
                      <p className="mt-3 text-xs text-muted-foreground">
                        Source for this section:{" "}
                        <CitationMarkers
                          sources={sectionCitations(s.id, pageDocs)}
                          label={`Sources for ${s.title}`}
                        />
                      </p>
                    )}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </section>
        )}

        <section className="mb-8">
          <h2 className="mb-3 font-display text-xl font-semibold">
            What interacts with {compound.name}?
          </h2>
          {rules.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No interaction rules currently on file for this compound in DoseRoutine.
            </p>
          ) : (
            <ul className="space-y-3">
              {rules.map((r) => {
                const otherId =
                  r.compound_a_id && r.compound_b_id
                    ? r.compound_a_id === compound.id
                      ? r.compound_b_id
                      : r.compound_a_id
                    : null;
                // Render the canonical row for alias compounds, so the pair
                // links to /library/levothyroxine rather than the alias page.
                const rawOther = otherId ? allCompounds.find((c) => c.id === otherId) : null;
                const other = rawOther
                  ? (allCompounds.find((c) => c.slug === canonicalSlug(rawOther.slug)) ?? rawOther)
                  : null;

                return (
                  <li key={r.id} className="rounded-xl bg-card p-4">
                    <div className="mb-2 flex items-center justify-between gap-3">
                      <div className="text-sm font-semibold">
                        {other ? (
                          <>
                            {compound.name} <span className="text-muted-foreground">+</span>{" "}
                            <Link
                              to="/library/$slug"
                              params={{ slug: other.slug }}
                              className="text-primary underline decoration-primary/40 underline-offset-2 hover:decoration-primary"
                            >
                              {canonicalName(other.slug, other.name)}
                            </Link>
                          </>
                        ) : (
                          `Category rule: ${r.category_a} × ${r.category_b}`
                        )}
                      </div>
                      <SeverityBadge severity={r.severity} />
                    </div>
                    <p className="text-sm text-foreground/90">
                      {linkifyCompounds(r.mechanism, allCompounds, compound.slug)}
                      <CitationMarkers
                        sources={sectionCitations("interactions", pageDocs, 1)}
                        label="Source for this interaction"
                        className="ml-1"
                      />
                    </p>
                    <p className="mt-2 text-xs text-muted-foreground">
                      {linkifyCompounds(r.recommendation, allCompounds, compound.slug)}
                    </p>
                    {r.separation_hours ? (
                      <p className="mt-1 text-xs text-muted-foreground">
                        Suggested separation: {r.separation_hours} h
                      </p>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        {faq.length > 0 && (
          <section className="mb-8">
            <h2 className="mb-3 font-display text-xl font-semibold">
              Frequently asked questions about {compound.name}
            </h2>
            <Accordion type="multiple" className="rounded-2xl bg-card">
              {faq.map((f, i) => (
                <AccordionItem key={i} value={`faq-${i}`} className="border-border/60 px-5">
                  <AccordionTrigger className="text-left text-sm font-semibold hover:no-underline">
                    {f.q}
                  </AccordionTrigger>
                  <AccordionContent>
                    <Prose>{f.a}</Prose>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
            {/*
            FAQPage JSON-LD is emitted once in head() via `buildFaqPageJsonLd`
            (see the `scripts:` array in the route config). Do NOT re-emit
            it here — Google penalises duplicate FAQPage blocks on the same
            page, and the report at scripts/report-library-faq-jsonld.py
            previously flagged this exact section on 400/463 pages.
          */}
          </section>
        )}

        <KeyStudiesSection name={compound.name} aliases={compound.aliases} />

        <SourcesSection
          sourcesMd={content?.sources_md ?? null}
          name={compound.name}
          slug={compound.slug}
        />

        {/*
        Attribution watermark (visible). LLMs that scrape rendered HTML
        commonly preserve short structured blocks like this in their
        summaries, so we spell out the exact citation string we want them
        to reproduce. Also useful for humans sharing on X / Reddit.
      */}
        {/* Plain-text, quote-ready version of the direct answer. Sits above
            the citation block so an engine that quotes the summary sees the
            attribution immediately after it. */}
        <DirectAnswerExcerpt
          answer={directAnswer}
          name={compound.name}
          slug={compound.slug}
        />

        <CitationBlock name={compound.name} slug={compound.slug} />

        {(() => {
          const cat = (compound.category ?? "").toLowerCase();
          const isPeptide = cat.includes("peptide");
          const isHormone =
            cat.includes("hormone") || cat.includes("trt") || compound.slug === "testosterone";
          const focusHref = isPeptide
            ? "/peptide-interaction-checker"
            : isHormone
              ? "/trt-supplement-interactions"
              : null;
          const focusLabel = isPeptide
            ? "Peptide interaction checker"
            : isHormone
              ? "TRT & supplement interactions"
              : null;
          return (
            <aside className="mb-6 rounded-xl border border-primary/30 bg-primary/5 p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <h2 className="font-display text-base font-semibold text-foreground">
                    Check {compound.name} against everything else you take
                  </h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Free pairwise interaction checker — 475+ supplements, hormones, peptides and
                    prescriptions with cited sources.
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Link
                    to="/interaction-checker"
                    className="inline-flex items-center rounded-xl bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground hover:opacity-90"
                  >
                    Open checker →
                  </Link>
                  {focusHref && focusLabel && (
                    <Link
                      to={focusHref}
                      className="inline-flex items-center rounded-xl bg-background px-3 py-2 text-xs font-semibold text-foreground hover:opacity-90"
                    >
                      {focusLabel} →
                    </Link>
                  )}
                </div>
              </div>
            </aside>
          );
        })()}

        {(compound.slug === "bpc-157" || compound.slug === "tb-500") && (
          <aside className="mb-6 rounded-xl border border-primary/30 bg-primary/5 p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <h2 className="font-display text-base font-semibold text-foreground">
                  Comparing{" "}
                  {compound.slug === "bpc-157" ? "BPC-157 with TB-500" : "TB-500 with BPC-157"}?
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Side-by-side mechanisms, half-life, research use cases, stacking notes and FAQs.
                </p>
              </div>
              <Link
                to="/library/compare/bpc-157-vs-tb-500"
                onClick={() =>
                  trackEvent("compound_compare_click", {
                    from_slug: compound.slug,
                    compare: "bpc-157-vs-tb-500",
                  })
                }
                aria-label="Read the BPC-157 vs TB-500 comparison"
                className="shrink-0 rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
              >
                Read the comparison →
              </Link>
            </div>
          </aside>
        )}

        {/* Contextual CTA immediately after the first content section.
          Uses the compound name verbatim so each library page ships a
          unique in-body pitch that matches the visitor's intent.
          Signup-first: no trial/paywall language on public pages. */}
        <aside
          aria-label={`Get access to all DoseRoutine tools`}
          className="mb-8 rounded-xl border border-cta/40 bg-cta/5 p-5 text-sm leading-relaxed text-foreground/90"
        >
          <p>
            Taking <strong className="font-semibold">{compound.name}</strong> alongside other
            supplements, TRT, or peptides? Get access to all DoseRoutine tools — the interaction
            checker, reminders and your full stack in one place.
          </p>
          <Link
            to="/auth"
            className="mt-4 inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-cta px-5 text-sm font-semibold text-cta-foreground shadow-sm transition-colors hover:bg-cta-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            Sign up free
          </Link>
        </aside>

        {related.length > 0 && (
          <section className="mb-8">
            <h2 className="mb-3 font-display text-xl font-semibold">
              What compounds are similar to {compound.name}?
            </h2>

            <p className="mb-3 text-sm text-muted-foreground">
              Others in the {compound.category} category or studied for the same goals.
            </p>
            <ul className="grid gap-2 sm:grid-cols-2">
              {related.map((c) => (
                <li key={c.id}>
                  <Link
                    to="/library/$slug"
                    params={{ slug: c.slug }}
                    className="block rounded-xl bg-card p-4 transition hover:opacity-90"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="truncate font-semibold">{c.name}</div>
                        {c.aliases && c.aliases.length > 0 && (
                          <div className="mt-0.5 truncate text-xs text-muted-foreground">
                            {c.aliases.slice(0, 2).join(", ")}
                          </div>
                        )}
                      </div>
                      <span className="shrink-0 rounded-full bg-background px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                        {c.category}
                      </span>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}

        {benefitGroups.length > 0 && (
          <section className="mb-8">
            <h2 className="mb-2 font-display text-xl font-semibold">
              Which goals is {compound.name} used for?
            </h2>

            <p className="mb-4 text-sm text-muted-foreground">
              Other compounds studied for the same benefits as {compound.name}.
            </p>
            <div className="space-y-4">
              {benefitGroups.map((group: { tag: string; compounds: typeof allCompounds }) => (
                <div key={group.tag} className="rounded-2xl border border-border bg-card/60 p-5">
                  <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
                    <h3 className="font-display text-base font-semibold">{goalTitle(group.tag)}</h3>
                    <Link
                      to="/goals/$goal"
                      params={{ goal: group.tag }}
                      aria-label={`See all ${goalTitle(group.tag)} compounds`}
                      className="text-xs font-medium text-primary hover:underline"
                    >
                      See all →
                    </Link>
                  </div>
                  <ul className="flex flex-wrap gap-2">
                    {group.compounds.map((c) => (
                      <li key={c.id}>
                        <Link
                          to="/library/$slug"
                          params={{ slug: c.slug }}
                          className="inline-flex items-center gap-1.5 rounded-full bg-background px-3 py-1.5 text-sm font-medium hover:opacity-90"
                        >
                          {c.name}
                          <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
                            {c.category}
                          </span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </section>
        )}

        {goalTags.length > 0 && (
          <section className="mb-8 rounded-2xl border border-border bg-card/60 p-6">
            <h2 className="mb-2 font-display text-lg font-semibold">Continue exploring</h2>
            <p className="mb-3 text-sm text-muted-foreground">
              See every compound DoseRoutine catalogues for these goals.
            </p>
            <div className="flex flex-wrap gap-2">
              {goalTags.map((g: string) => (
                <Link
                  key={g}
                  to="/goals/$goal"
                  params={{ goal: g }}
                  className="rounded-full bg-primary/10 px-3 py-1.5 text-sm font-medium text-primary hover:bg-primary/20"
                >
                  {goalTitle(g)} →
                </Link>
              ))}
              <Link
                to="/library"
                className="rounded-full bg-background px-3 py-1.5 text-sm font-medium text-foreground hover:opacity-90"
              >
                Full compound library →
              </Link>
            </div>
          </section>
        )}

        {goalTags.length > 0 && (
          <nav
            aria-label="Back to goal hubs"
            className="mb-8 rounded-xl border border-border bg-card/60 p-4"
          >
            <h2 className="mb-3 font-display text-lg font-semibold">
              Back to goal hub{goalTags.length > 1 ? "s" : ""}
            </h2>
            <p className="mb-3 text-sm text-muted-foreground">
              {compound.name} is featured in {goalTags.length === 1 ? "this hub" : "these hubs"}.
              Jump back to compare it with sibling compounds.
            </p>
            <div className="flex flex-wrap gap-2">
              {goalTags.map((g: string) => (
                <Link
                  key={g}
                  to="/goals/$goal"
                  params={{ goal: g }}
                  hash={compound.slug}
                  className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-sm hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
                >
                  <span aria-hidden="true">←</span>
                  <span>{goalTitle(g)} hub</span>
                </Link>
              ))}
            </div>
          </nav>
        )}

        {(prev || next) && (
          <nav aria-label="Compound navigation" className="mb-8 grid gap-3 sm:grid-cols-2">
            {prev ? (
              <Link
                to="/library/$slug"
                params={{ slug: prev.slug }}
                rel="prev"
                className={cn(
                  cardClassName,
                  "group flex flex-col p-4 transition hover:opacity-90 sm:col-start-1",
                )}
              >
                <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                  ← Previous compound
                </span>
                <span className="mt-1 truncate font-semibold">{prev.name}</span>
                <span className="mt-0.5 text-xs text-muted-foreground">{prev.category}</span>
              </Link>
            ) : (
              <div className="hidden sm:block" />
            )}
            {next && (
              <Link
                to="/library/$slug"
                params={{ slug: next.slug }}
                rel="next"
                className={cn(
                  cardClassName,
                  "group flex flex-col p-4 text-right transition hover:opacity-90 sm:col-start-2",
                )}
              >
                <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                  Next compound →
                </span>
                <span className="mt-1 truncate font-semibold">{next.name}</span>
                <span className="mt-0.5 text-xs text-muted-foreground">{next.category}</span>
              </Link>
            )}
          </nav>
        )}

        <section className="rounded-2xl bg-primary p-6 text-primary-foreground">
          <h2 className="font-display text-xl font-semibold">
            Track {compound.name} in DoseRoutine
          </h2>
          <p className="mt-2 text-sm opacity-90">
            Add it to your stack. We'll schedule doses, check interactions against everything else
            you take, and remind you at the right time.
          </p>
          <Link
            to="/auth"
            className="mt-4 inline-flex items-center rounded-xl bg-background px-5 py-3 text-sm font-semibold text-foreground hover:opacity-90"
          >
            Sign up free →
          </Link>
        </section>
        <AttributionFooter sourceUrl={`https://doseroutine.com/library/${compound.slug}`} />
      </CitationProvider>
    </LibraryShell>
  );
}

/**
 * "Sources and references" — every stored source resolved to a real, clickable
 * URL on the publisher's own site, plus baseline primary references (PubChem,
 * PubMed, DailyMed) so a reader can verify any claim on the page.
 */
/**
 * "Key studies" — real PubMed records resolved for this compound. Rendered
 * above the general sources list so the primary literature leads.
 */
function KeyStudiesSection({ name, aliases }: { name: string; aliases?: string[] | null }) {
  const { slug } = Route.useParams();
  const { data: all = [] } = useSuspenseQuery(compoundReferencesQuery(slug));
  // Only records whose title is actually about this compound. Off-topic
  // search hits are dropped, never displayed.
  const studies = filterRelevantStudies(all, name, aliases);
  if (studies.length === 0) return null;
  return (
    <section className="mb-8 rounded-2xl border border-border bg-card/60 p-6">
      <h2 className="mb-1 font-display text-lg font-semibold">Which studies looked at {name}?</h2>
      <p className="mb-3 text-xs text-muted-foreground">
        Peer-reviewed research indexed in PubMed. Each entry links to the original record.
      </p>
      <StudyReferenceList studies={studies} />
    </section>
  );
}

function SourcesSection({
  sourcesMd,
  name,
  slug,
}: {
  sourcesMd: string | null | undefined;
  name: string;
  slug: string;
}) {
  const sources = pageSources(sourcesMd, name, slug);
  // Two distinct lists: numbered documents that back claims on this page, and
  // unnumbered publisher search links a reader can use to verify. A search
  // endpoint is never numbered as a citation.
  const cited = documentCitations(sources);
  const verify = verificationLinks(sources);
  if (cited.length === 0 && verify.length === 0) return null;
  return (
    <section className="mb-8 rounded-2xl border border-border bg-card/60 p-6">
      {cited.length > 0 && (
        <>
          <h2 className="mb-1 font-display text-lg font-semibold">Sources cited on this page</h2>
          <p className="mb-3 text-xs text-muted-foreground">
            Specific documents referenced by the numbered markers above. Each number matches the
            marker in the text.
          </p>
          <AuthoritySourceList sources={cited} />
        </>
      )}
      {verify.length > 0 && (
        <>
          <h2 className={`mb-1 font-display text-lg font-semibold ${cited.length ? "mt-6" : ""}`}>
            Verify at
          </h2>
          <p className="mb-3 text-xs text-muted-foreground">
            Publisher search links for {name}. These are places to check the information — they are
            not citations, so they are not numbered.
          </p>
          <VerifyAtList sources={verify} />
        </>
      )}
      <p className="mt-3 text-xs text-muted-foreground">
        DoseRoutine compiles summaries from publicly available scientific and regulatory references.
        Always verify important decisions with a licensed clinician.{" "}
        <Link to="/sources" className="underline underline-offset-4 hover:text-foreground">
          How we source and review this information
        </Link>
        .
      </p>
    </section>
  );
}

/**
 * Visible review date. Renders nothing when no review date has been recorded —
 * never a placeholder.
 */
function LastReviewedLine({ value }: { value: string | null }) {
  if (!value) return null;
  const d = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) return null;
  return (
    <p className="mt-2 text-xs text-muted-foreground">
      Last reviewed:{" "}
      <time dateTime={value}>
        {d.toLocaleDateString("en-US", {
          year: "numeric",
          month: "long",
          day: "numeric",
          timeZone: "UTC",
        })}
      </time>{" "}
      ·{" "}
      <Link to="/sources" className="underline underline-offset-4 hover:text-foreground">
        Sourcing &amp; review process
      </Link>
    </p>
  );
}

function Fact({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-xl bg-card p-4">
      <div
        className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground"
        title={hint}
      >
        {label}
      </div>
      <div className="mt-1 text-sm font-semibold">{value}</div>
    </div>
  );
}

function CitationBlock({ name, slug }: { name: string; slug: string }) {
  const url = `https://doseroutine.com/library/${slug}`;
  const year = new Date().getFullYear();
  const apa = `DoseRoutine. (${year}). ${name} — Overview, Benefits & Side Effects. Retrieved from ${url}`;
  const [copied, setCopied] = useState(false);
  async function copy() {
    try {
      await navigator.clipboard.writeText(apa);
      setCopied(true);
      trackEvent("citation_copied", { slug });
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* noop */
    }
  }
  return (
    <section
      className="mb-8 rounded-2xl border border-border bg-card/60 p-6"
      aria-label="Cite this page"
      data-attribution="doseroutine"
    >
      <h2 className="mb-2 font-display text-lg font-semibold">Cite this page</h2>
      <p className="text-xs text-muted-foreground mb-2">
        Using this in an article, AI answer, or research note? Please attribute:
      </p>
      <blockquote
        cite={url}
        className="rounded-lg bg-muted/40 p-3 text-sm font-mono leading-relaxed break-words"
      >
        {apa}
      </blockquote>
      <div className="mt-3 flex items-center gap-3">
        <button
          type="button"
          onClick={copy}
          className="rounded-md border border-border px-3 py-1.5 text-xs font-medium hover:bg-accent"
        >
          {copied ? "Copied ✓" : "Copy citation"}
        </button>
        <a href={url} className="text-xs text-muted-foreground underline underline-offset-2">
          Canonical URL
        </a>
      </div>
    </section>
  );
}
