/**
 * Language of each snapshotted CMS article.
 *
 * Most posts are English, but a few were published in Spanish, French and
 * Hindi. Declaring the real language keeps `inLanguage`, `og:locale` and the
 * rendered `lang` attribute honest — search and answer engines demote or
 * mis-attribute a page whose markup claims a language its body does not use.
 */
export type ArticleLocale = { lang: string; ogLocale: string };

const LOCALES: Record<string, ArticleLocale> = {
  "pastillas-para-bajar-de-peso": { lang: "es", ogLocale: "es_ES" },
  "lisdexamfetamine-brand-name": { lang: "es", ogLocale: "es_ES" },
  "what-is-guanfacine-used-for": { lang: "es", ogLocale: "es_ES" },
  armodafinil: { lang: "fr", ogLocale: "fr_FR" },
  "zinc-bisglycinate-supplement": { lang: "hi", ogLocale: "hi_IN" },
};

export const DEFAULT_ARTICLE_LOCALE: ArticleLocale = { lang: "en", ogLocale: "en_US" };

export function articleLocale(slug: string): ArticleLocale {
  return LOCALES[slug] ?? DEFAULT_ARTICLE_LOCALE;
}
