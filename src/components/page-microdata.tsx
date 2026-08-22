import { useRouterState } from "@tanstack/react-router";
import { SITE_ORIGIN } from "@/lib/seo-monitor-urls";

/**
 * Inline microdata mirror of the sitewide JSON-LD.
 *
 * Audit crawlers that grade "micromarkup" only look at itemscope/itemtype
 * inside the document body, and they mark a scope as failing when it declares
 * a type without any itemprop of its own. So this block:
 *  - lives in the body content (never on <body> itself, which several
 *    crawlers skip entirely),
 *  - gives the WebPage scope real name/url/description values, and
 *  - nests isPartOf/publisher as full entities rather than bare URL props.
 *
 * Values come from the same head() meta the route already renders, so the
 * microdata and the JSON-LD can never drift apart.
 */
export function PageMicrodata() {
  const { matches, pathname } = useRouterState({
    select: (s) => ({ matches: s.matches, pathname: s.location.pathname }),
  });

  let title = "DoseRoutine";
  let description = "";
  for (const match of matches) {
    for (const tag of (match.meta ?? []) as Array<Record<string, string | undefined>>) {
      if (!tag) continue;
      if (typeof tag["title"] === "string" && tag["title"]) title = tag["title"];
      if (tag["name"] === "description" && tag["content"]) description = tag["content"];
    }
  }

  const url = `${SITE_ORIGIN}${pathname === "/" ? "/" : pathname.replace(/\/$/, "")}`;

  return (
    <div hidden aria-hidden="true" {...{ itemscope: "", itemtype: "https://schema.org/WebPage" }}>
      {/* React 19 hoists <meta> into <head>, which would rip these itemprops
       * out of their scope — so every value is carried by a <span>. */}
      <span {...{ itemprop: "name" }}>{title}</span>
      <span {...{ itemprop: "headline" }}>{title}</span>
      {description ? <span {...{ itemprop: "description" }}>{description}</span> : null}
      <link {...{ itemprop: "url" }} href={url} />
      <div {...{ itemprop: "isPartOf", itemscope: "", itemtype: "https://schema.org/WebSite" }}>
        <span {...{ itemprop: "name" }}>DoseRoutine</span>
        <link {...{ itemprop: "url" }} href={SITE_ORIGIN} />
      </div>
      <div
        {...{ itemprop: "publisher", itemscope: "", itemtype: "https://schema.org/Organization" }}
      >
        <span {...{ itemprop: "name" }}>DoseRoutine</span>
        <span {...{ itemprop: "alternateName" }}>Dose Routine</span>
        <link {...{ itemprop: "url" }} href={SITE_ORIGIN} />
        <link {...{ itemprop: "logo" }} href={`${SITE_ORIGIN}/icon-512.png`} />
      </div>
    </div>
  );
}
