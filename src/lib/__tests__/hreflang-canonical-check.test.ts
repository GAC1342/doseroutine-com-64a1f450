import { describe, expect, it } from "vitest";
import {
  checkPage,
  checkReciprocity,
  localeOfUrl,
  normaliseLocaleUrl,
  extractAlternates,
  extractCanonicals,
  isValidHreflang,
  normaliseUrl,
  parseLinkTags,
} from "../../../scripts/hreflang-canonical-check.mjs";

const ORIGIN = "https://doseroutine.com";
const URL_A = `${ORIGIN}/faq`;

const cluster = (path: string, locales = ["en", "es", "fr"]) =>
  [
    ...locales.map(
      (l) =>
        `<link rel="alternate" hreflang="${l}" href="${ORIGIN}${path}${l === "en" ? "" : `?lang=${l}`}">`,
    ),
    `<link rel="alternate" hreflang="x-default" href="${ORIGIN}${path}">`,
  ].join("");

const page = (path: string, opts: { canonical?: string | null; alts?: string } = {}) => {
  const canonical =
    opts.canonical === null
      ? ""
      : `<link rel="canonical" href="${opts.canonical ?? ORIGIN + path}">`;
  return `<html><head>${canonical}${opts.alts ?? cluster(path)}</head><body>ok</body></html>`;
};

const sitemap = new Set([normaliseUrl(URL_A)!, normaliseUrl(`${ORIGIN}/`)!]);

describe("parsers", () => {
  it("reads link attributes regardless of quoting and order", () => {
    const tags = parseLinkTags(
      `<link href='/a' rel=canonical><link rel="stylesheet" href="/s.css">`,
    );
    expect(tags).toHaveLength(2);
    expect(tags[0].rel).toBe("canonical");
    expect(tags[0].href).toBe("/a");
  });

  it("extracts canonicals and alternates", () => {
    const html = page("/faq");
    expect(extractCanonicals(html)).toEqual([URL_A]);
    const alts = extractAlternates(html);
    expect(alts).toHaveLength(4);
    expect(alts.at(-1)).toEqual({ hreflang: "x-default", href: URL_A });
  });
});

describe("normaliseUrl", () => {
  it("drops hash, trailing slash and lang param", () => {
    expect(normaliseUrl(`${ORIGIN}/faq/?lang=es#top`)).toBe(normaliseUrl(URL_A));
    expect(normaliseUrl("nope")).toBeNull();
  });
});

describe("isValidHreflang", () => {
  it("accepts BCP-47 and x-default, rejects junk", () => {
    expect(isValidHreflang("en")).toBe(true);
    expect(isValidHreflang("pt-BR")).toBe(true);
    expect(isValidHreflang("x-default")).toBe(true);
    expect(isValidHreflang("english")).toBe(false);
    expect(isValidHreflang("")).toBe(false);
  });
});

describe("checkPage", () => {
  const base = { url: URL_A, origin: ORIGIN, sitemapUrls: sitemap };

  it("passes a consistent page", () => {
    expect(checkPage({ ...base, html: page("/faq") })).toEqual([]);
  });

  it("passes a page with no hreflang cluster at all", () => {
    expect(checkPage({ ...base, html: page("/faq", { alts: "" }) })).toEqual([]);
  });

  it("flags a missing, duplicated, relative or foreign canonical", () => {
    expect(checkPage({ ...base, html: page("/faq", { canonical: null }) })[0]).toContain("missing");
    expect(
      checkPage({
        ...base,
        html: page("/faq") + `<link rel="canonical" href="${URL_A}">`,
      }).some((f) => f.includes("2 canonical tags")),
    ).toBe(true);
    expect(checkPage({ ...base, html: page("/faq", { canonical: "/faq" }) })[0]).toContain(
      "not an absolute URL",
    );
    expect(
      checkPage({ ...base, html: page("/faq", { canonical: "https://evil.example/faq" }) }).some(
        (f) => f.includes("off-origin"),
      ),
    ).toBe(true);
  });

  it("flags a canonical that does not self-reference", () => {
    expect(
      checkPage({ ...base, html: page("/faq", { canonical: `${ORIGIN}/` }) }).some((f) =>
        f.includes("does not self-reference"),
      ),
    ).toBe(true);
  });

  it("accepts trailing-slash and hash differences", () => {
    expect(checkPage({ ...base, html: page("/faq", { canonical: `${ORIGIN}/faq/#top` }) })).toEqual(
      [],
    );
  });

  it("flags a canonical that is absent from the sitemap", () => {
    expect(
      checkPage({
        url: `${ORIGIN}/ghost`,
        origin: ORIGIN,
        sitemapUrls: sitemap,
        html: page("/ghost"),
      }).some((f) => f.includes("not listed in the sitemap")),
    ).toBe(true);
  });

  it("flags a missing x-default", () => {
    const alts = `<link rel="alternate" hreflang="en" href="${URL_A}">`;
    expect(
      checkPage({ ...base, html: page("/faq", { alts }) }).some((f) =>
        f.includes("missing x-default"),
      ),
    ).toBe(true);
  });

  it("flags a missing default locale", () => {
    const alts = `<link rel="alternate" hreflang="es" href="${URL_A}?lang=es"><link rel="alternate" hreflang="x-default" href="${URL_A}">`;
    expect(
      checkPage({ ...base, html: page("/faq", { alts }) }).some((f) =>
        f.includes("missing the default locale"),
      ),
    ).toBe(true);
  });

  it("flags duplicate and invalid hreflang codes", () => {
    const alts = cluster("/faq") + `<link rel="alternate" hreflang="en" href="${URL_A}">`;
    expect(
      checkPage({ ...base, html: page("/faq", { alts }) }).some((f) => f.includes("duplicate")),
    ).toBe(true);
    const bad = cluster("/faq") + `<link rel="alternate" hreflang="english" href="${URL_A}">`;
    expect(
      checkPage({ ...base, html: page("/faq", { alts: bad }) }).some((f) =>
        f.includes("invalid hreflang"),
      ),
    ).toBe(true);
  });

  it("flags alternates that leave the canonical path or the origin", () => {
    const alts =
      cluster("/faq").replace(`href="${ORIGIN}/faq?lang=es"`, `href="${ORIGIN}/other?lang=es"`) +
      `<link rel="alternate" hreflang="de" href="https://evil.example/faq?lang=de">`;
    const out = checkPage({ ...base, html: page("/faq", { alts }) });
    expect(out.some((f) => f.includes("leaves the canonical path"))).toBe(true);
    expect(out.some((f) => f.includes("off-origin"))).toBe(true);
  });

  it("flags an x-default that disagrees with the canonical", () => {
    const alts = cluster("/faq").replace(
      `hreflang="x-default" href="${ORIGIN}/faq"`,
      `hreflang="x-default" href="${ORIGIN}/"`,
    );
    expect(
      checkPage({ ...base, html: page("/faq", { alts }) }).some(
        (f) => f.includes('"x-default"') && f.includes("does not match the canonical"),
      ),
    ).toBe(true);
  });
});

/* --------------------------------------------------------- reciprocity */

const clusterFor = (path: string, locales: string[]) =>
  [
    ...locales.map(
      (l) =>
        `<link rel="alternate" hreflang="${l}" href="${ORIGIN}${path}${l === "en" ? "" : `?lang=${l}`}">`,
    ),
    `<link rel="alternate" hreflang="x-default" href="${ORIGIN}${path}">`,
  ].join("");

describe("normaliseLocaleUrl / localeOfUrl", () => {
  it("keeps the lang variant distinct", () => {
    expect(normaliseLocaleUrl(`${ORIGIN}/faq/?lang=es#top`)).toBe(`${ORIGIN}/faq?lang=es`);
    expect(normaliseLocaleUrl(`${ORIGIN}/faq`)).toBe(`${ORIGIN}/faq`);
    expect(normaliseLocaleUrl("nope")).toBeNull();
  });

  it("reads the locale from ?lang=, falling back to the default", () => {
    expect(localeOfUrl(`${ORIGIN}/faq?lang=fr`)).toBe("fr");
    expect(localeOfUrl(URL_A)).toBe("en");
  });
});

describe("checkReciprocity", () => {
  const locales = ["en", "es", "fr"];
  const selfHtml = page("/faq", { alts: clusterFor("/faq", locales) });
  const docsFor = (html: string) =>
    new Map([
      [`${ORIGIN}/faq?lang=es`, html],
      [`${ORIGIN}/faq?lang=fr`, html],
    ]);

  it("passes when every alternate links back with the expected code", () => {
    expect(
      checkReciprocity({ url: URL_A, html: selfHtml, alternateDocs: docsFor(selfHtml) }),
    ).toEqual([]);
  });

  it("passes when the page has no cluster", () => {
    expect(
      checkReciprocity({ url: URL_A, html: page("/faq", { alts: "" }), alternateDocs: new Map() }),
    ).toEqual([]);
  });

  it("flags an alternate that could not be fetched", () => {
    const docs = new Map([
      [`${ORIGIN}/faq?lang=es`, null],
      [`${ORIGIN}/faq?lang=fr`, selfHtml],
    ]);
    expect(
      checkReciprocity({ url: URL_A, html: selfHtml, alternateDocs: docs }).some((f) =>
        f.includes("could not be fetched"),
      ),
    ).toBe(true);
  });

  it("flags an alternate with no cluster of its own", () => {
    const bare = page("/faq", { alts: "" });
    expect(
      checkReciprocity({ url: URL_A, html: selfHtml, alternateDocs: docsFor(bare) }).some((f) =>
        f.includes("no hreflang cluster"),
      ),
    ).toBe(true);
  });

  it("flags an alternate that never links back to the page", () => {
    const away = page("/faq", { alts: clusterFor("/other", locales) });
    expect(
      checkReciprocity({ url: URL_A, html: selfHtml, alternateDocs: docsFor(away) }).some((f) =>
        f.includes("does not link back"),
      ),
    ).toBe(true);
  });

  it("flags a back-link that uses the wrong hreflang code", () => {
    const wrong = selfHtml.replace(
      `hreflang="en" href="${ORIGIN}/faq"`,
      `hreflang="de" href="${ORIGIN}/faq"`,
    );
    expect(
      checkReciprocity({ url: URL_A, html: selfHtml, alternateDocs: docsFor(wrong) }).some((f) =>
        f.includes('expected "en"'),
      ),
    ).toBe(true);
  });

  it("flags an alternate advertising a different cluster", () => {
    const short = page("/faq", { alts: clusterFor("/faq", ["en", "es"]) });
    const out = checkReciprocity({ url: URL_A, html: selfHtml, alternateDocs: docsFor(short) });
    expect(out.some((f) => f.includes("different cluster") && f.includes("missing fr"))).toBe(true);
  });

  it("accepts a plain object of alternate documents", () => {
    expect(
      checkReciprocity({
        url: URL_A,
        html: selfHtml,
        alternateDocs: { [`${ORIGIN}/faq?lang=es`]: selfHtml, [`${ORIGIN}/faq?lang=fr`]: selfHtml },
      }),
    ).toEqual([]);
  });
});
