/**
 * Share-preview contract (OpenGraph + Twitter Cards).
 *
 * Every route composes its own `head()`, so historically each page decided how
 * much of the social contract to fill in: some shipped `og:*` without any
 * `twitter:*`, some had an image but no alt text, some had a title that had
 * drifted from the page `<title>`. Crawlers do not guess — a missing
 * `twitter:title` means X falls back to whatever it can scrape, and a missing
 * `og:locale` weakens the card on Facebook/LinkedIn — so previews rendered
 * inconsistently across the site.
 *
 * `deriveSocialMeta` closes that gap centrally: given every meta entry the
 * router merged for the current page, it returns the tags that are missing,
 * derived from what the page already declares. It never overrides a value a
 * route set deliberately — it only fills holes — and it is pure, so it runs
 * identically during SSR and hydration.
 */

export type MetaEntry = {
  title?: string;
  name?: string;
  property?: string;
  content?: string;
  [key: string]: unknown;
};

/** Twitter mirrors of the OpenGraph tags, in the order they are emitted. */
const MIRRORS: { twitter: string; og: string }[] = [
  { twitter: "twitter:title", og: "og:title" },
  { twitter: "twitter:description", og: "og:description" },
  { twitter: "twitter:image", og: "og:image" },
  { twitter: "twitter:image:alt", og: "og:image:alt" },
];

export const DEFAULT_LOCALE_TAG = "en_US";
export const SITE_NAME = "DoseRoutine";

/** Reads the last value for a `property=` or `name=` key, as crawlers do. */
export function metaValue(entries: MetaEntry[], key: string): string | undefined {
  let found: string | undefined;
  for (const entry of entries) {
    if ((entry.property === key || entry.name === key) && typeof entry.content === "string") {
      const value = entry.content.trim();
      if (value) found = value;
    }
  }
  return found;
}

/** The page `<title>`, which routes declare as a `{ title }` meta entry. */
export function pageTitle(entries: MetaEntry[]): string | undefined {
  let found: string | undefined;
  for (const entry of entries) {
    if (typeof entry.title === "string" && entry.title.trim()) found = entry.title.trim();
  }
  return found;
}

/**
 * The tags this page is missing, derived from the ones it already has.
 *
 * Rules, in order of preference for each hole:
 *   • og:title / og:description fall back to the page title and description
 *   • every twitter:* mirrors its og:* counterpart
 *   • twitter:card is summary_large_image whenever a card image exists
 *   • og:site_name and og:locale are site constants
 */
export function deriveSocialMeta(entries: MetaEntry[]): MetaEntry[] {
  const out: MetaEntry[] = [];
  const has = (key: string) => metaValue(entries, key) !== undefined;
  const seen = new Set<string>();

  const push = (entry: MetaEntry, key: string) => {
    if (has(key) || seen.has(key)) return;
    seen.add(key);
    out.push(entry);
  };
  const value = (key: string) => metaValue(entries, key) ?? metaValue(out, key);

  const title = pageTitle(entries);
  const description = metaValue(entries, "description");

  if (title) push({ property: "og:title", content: title }, "og:title");
  if (description) push({ property: "og:description", content: description }, "og:description");

  push({ property: "og:site_name", content: SITE_NAME }, "og:site_name");
  push({ property: "og:locale", content: DEFAULT_LOCALE_TAG }, "og:locale");
  push({ property: "og:type", content: "website" }, "og:type");

  for (const { twitter, og } of MIRRORS) {
    const source = value(og);
    if (source) push({ name: twitter, content: source }, twitter);
  }

  if (value("og:image") || value("twitter:image")) {
    push({ name: "twitter:card", content: "summary_large_image" }, "twitter:card");
  } else {
    push({ name: "twitter:card", content: "summary" }, "twitter:card");
  }

  return out;
}
