import { SUPPORTED_LOCALES, DEFAULT_LOCALE } from "./i18n";

const SITE = "https://doseroutine.com";

/**
 * Build hreflang <link rel="alternate"> entries for a given canonical path.
 * Adds one entry per supported locale (as ?lang=xx) plus x-default.
 * Returns links array ready to spread into a route's head({ links }).
 */
export function hreflangLinks(pathname: string) {
  const path = pathname.startsWith("/") ? pathname : `/${pathname}`;
  // Server-rendered HTML is English for every URL; the ?lang= switcher is a
  // client-side UI translation only. Advertising ?lang= URLs as translated
  // alternates made Google crawl 12 duplicate copies of every page (which all
  // canonicalise back here) and produced 404/5xx coverage noise. Keep a valid,
  // self-referential cluster instead.
  const links: Array<{ rel: "alternate"; hrefLang: string; href: string }> = [
    { rel: "alternate", hrefLang: DEFAULT_LOCALE as string, href: `${SITE}${path}` },
    { rel: "alternate", hrefLang: "x-default", href: `${SITE}${path}` },
  ];
  return links;
}

/**
 * og:locale + og:locale:alternate meta entries for the Facebook/OG spec.
 * Use in a route's head({ meta }).
 */
export function ogLocaleMeta(currentLocale: string = DEFAULT_LOCALE) {
  const ogMap: Record<string, string> = {
    en: "en_US",
    es: "es_ES",
    fr: "fr_FR",
    de: "de_DE",
    it: "it_IT",
    pt: "pt_PT",
    nl: "nl_NL",
    ja: "ja_JP",
    ko: "ko_KR",
    zh: "zh_CN",
    ar: "ar_AR",
    hi: "hi_IN",
  };
  const meta: Array<{ property: string; content: string }> = [
    { property: "og:locale", content: ogMap[currentLocale] ?? "en_US" },
  ];
  for (const loc of SUPPORTED_LOCALES) {
    if (loc === currentLocale) continue;
    meta.push({ property: "og:locale:alternate", content: ogMap[loc] });
  }
  return meta;
}
