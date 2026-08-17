import { Link } from "@tanstack/react-router";
import type React from "react";

type LinkableCompound = {
  slug: string;
  name: string;
  aliases?: string[] | null;
};

function escapeRegex(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Turns a plain-text body into React nodes with compound names/aliases
 * wrapped in TanStack Router <Link> elements pointing at their library page.
 *
 * - Case-insensitive, word-boundaried matches.
 * - Longest terms match first so "Vitamin D3 + K2" wins over "Vitamin D3".
 * - Only the first occurrence per compound is linked, to keep prose readable.
 * - `currentSlug` is skipped (a page never links to itself).
 * - Minimum term length of 3 characters to avoid noise (e.g. "B6").
 */
export function linkifyCompounds(
  text: string | null | undefined,
  compounds: LinkableCompound[],
  currentSlug?: string,
): React.ReactNode {
  if (!text) return text ?? "";
  if (!compounds || compounds.length === 0) return text;

  type Term = { term: string; slug: string; isName: boolean };
  const byKey = new Map<string, Term>();
  for (const c of compounds) {
    if (currentSlug && c.slug === currentSlug) continue;
    const candidates = [c.name, ...((c.aliases ?? []) as string[])]
      .filter((t): t is string => typeof t === "string" && t.trim().length >= 3)
      .map((t, index) => ({ term: t.trim(), isName: index === 0 }));
    for (const candidate of candidates) {
      const key = candidate.term.toLowerCase();
      const existing = byKey.get(key);
      // A word that is one compound's own name must link to that compound, even
      // when another compound lists it as an alias (e.g. ubiquinol vs CoQ10):
      // two anchors with the same text pointing at different pages is a
      // conflicting internal-link signal.
      if (existing && !(candidate.isName && !existing.isName)) continue;
      byKey.set(key, { term: candidate.term, slug: c.slug, isName: candidate.isName });
    }
  }
  const terms: Term[] = [...byKey.values()];
  if (terms.length === 0) return text;

  // Longest first so multi-word aliases beat their substrings.
  terms.sort((a, b) => b.term.length - a.term.length);

  const pattern = new RegExp(`\\b(${terms.map((t) => escapeRegex(t.term)).join("|")})\\b`, "gi");
  const bySlug: Record<string, string> = {};
  for (const t of terms) bySlug[t.term.toLowerCase()] = t.slug;

  const nodes: React.ReactNode[] = [];
  const linkedSlugs = new Set<string>();
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(text)) !== null) {
    const idx = match.index;
    const matched = match[0];
    const slug = bySlug[matched.toLowerCase()];
    if (!slug || linkedSlugs.has(slug)) continue;
    if (idx > lastIndex) nodes.push(text.slice(lastIndex, idx));
    nodes.push(
      <Link
        key={`${slug}-${idx}`}
        to="/library/$slug"
        params={{ slug }}
        className="text-primary underline decoration-primary/40 underline-offset-2 hover:decoration-primary"
      >
        {matched}
      </Link>,
    );
    linkedSlugs.add(slug);
    lastIndex = idx + matched.length;
  }
  if (lastIndex < text.length) nodes.push(text.slice(lastIndex));
  return nodes.length === 0 ? text : <>{nodes}</>;
}
