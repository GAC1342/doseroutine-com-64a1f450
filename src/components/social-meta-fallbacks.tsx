/**
 * Emits the OpenGraph/Twitter tags the current page is missing.
 *
 * Routes declare whatever share metadata they care about in `head()`. This
 * component reads the merged meta for the active matches and renders the rest
 * of the contract (see `deriveSocialMeta`) directly after `<HeadContent />`,
 * so every page — marketing route, compound entry, peptide guide, blog post or
 * syndicated article — unfurls with a complete, consistent card.
 *
 * It only adds tags that are absent, so a route that sets its own value always
 * wins. The derivation is pure and reads no browser state, so SSR output and
 * the hydrated head match exactly.
 */
import { useRouterState } from "@tanstack/react-router";

import { deriveSocialMeta, type MetaEntry } from "@/lib/social-meta";

export function SocialMetaFallbacks() {
  const entries = useRouterState({
    select: (state) =>
      state.matches.flatMap((match) => (match.meta ?? []) as MetaEntry[]).filter(Boolean),
  });

  const derived = deriveSocialMeta(entries);
  if (derived.length === 0) return null;

  return (
    <>
      {derived.map((tag) =>
        tag.property ? (
          <meta key={tag.property} property={tag.property} content={tag.content} />
        ) : (
          <meta key={tag.name} name={tag.name} content={tag.content} />
        ),
      )}
    </>
  );
}
