/**
 * Hero artwork for first-party /articles posts.
 *
 * CMS posts ship their own titleFile image; the markdown-backed articles had
 * none, which cost them image rich results and made the list view look empty.
 * Each slug below has a unique 1200x630 illustration in public/articles/ with
 * descriptive alt text (used for the <img>, og:image and Article.image).
 */

import { resizedImageUrl } from "./remote-image";
import { cmsHero, cmsHeroSrcSet, cmsHeroWebp, CMS_HERO_SIZES } from "./cms-article-hero";

export const ARTICLE_HERO_WIDTH = 1200;
export const ARTICLE_HERO_HEIGHT = 630;

export type ArticleHero = { src: string; alt: string };

const HEROES: Record<string, ArticleHero> = {
  "best-apps-managing-prescriptions": {
    src: "/articles/hero-best-apps-managing-prescriptions.webp",
    alt: "Phone showing a medication checklist beside a pill bottle and loose capsules",
  },
  "medication-reminder-app": {
    src: "/articles/hero-medication-reminder-app.webp",
    alt: "Phone displaying a reminder clock with capsules arranged beside it",
  },
  "pill-reminder-app": {
    src: "/articles/hero-pill-reminder-app.webp",
    alt: "Weekly pill organizer with ticked compartments next to a phone checklist",
  },
  "best-apps-for-health": {
    src: "/articles/hero-best-apps-for-health.webp",
    alt: "Health app dashboard on a phone surrounded by heart rate, hydration and sleep icons",
  },
  "set-up-medication-reminder-health-app": {
    src: "/articles/hero-set-up-medication-reminder-health-app.webp",
    alt: "Finger tapping a reminder toggle on a phone settings screen",
  },
  // Week 1 of the 60-day editorial calendar.
  "best-medication-reminder-apps": {
    src: "/articles/hero-best-medication-reminder-apps.webp",
    alt: "Phone showing a medication reminder card above rows of pill icons",
  },
  "best-free-medication-reminder-apps": {
    src: "/articles/hero-best-free-medication-reminder-apps.webp",
    alt: "Phone showing a free medication schedule list beside a crossed-out price icon",
  },
  "best-pill-reminder-apps-for-seniors": {
    src: "/articles/hero-best-pill-reminder-apps-for-seniors.webp",
    alt: "Hands holding a phone with a large-print dose checklist beside a weekly pill organizer",
  },
  "best-medication-reminder-apps-iphone": {
    src: "/articles/hero-best-medication-reminder-apps-iphone.webp",
    alt: "iPhone lock screen showing a time-sensitive medication alert card",
  },
  "best-medication-reminder-apps-android": {
    src: "/articles/hero-best-medication-reminder-apps-android.webp",
    alt: "Android phone showing a medication notification above a battery settings toggle",
  },
  "best-apps-for-tracking-supplements": {
    src: "/articles/hero-best-apps-for-tracking-supplements.webp",
    alt: "Supplement bottle and capsules beside a phone showing a stack schedule",
  },
  "best-apps-for-peptide-tracking": {
    src: "/articles/hero-best-apps-for-peptide-tracking.webp",
    alt: "Vial and syringe beside a screen showing an injection site rotation map",
  },
  "missed-dose-what-to-do": {
    src: "/articles/hero-missed-dose-what-to-do.webp",
    alt: "Phone showing a late dose reminder beside a clock and a single capsule",
  },
  "multiple-daily-dose-reminders": {
    src: "/articles/hero-multiple-daily-dose-reminders.webp",
    alt: "Phone showing three timed dose cards down a day timeline beside a clock",
  },
};

/** Hero image for a first-party article slug, or null when it has none. */
export function articleHero(slug: string): ArticleHero | null {
  return HEROES[slug] ?? null;
}

/**
 * Responsive candidates for a hero. Every hero ships 192w/600w/1200w WebP
 * variants so phones download ~11KB instead of the full 28KB desktop file.
 */
export function articleHeroSrcSet(hero: ArticleHero): string {
  const base = hero.src.replace(/\.webp$/, "");
  return [`${base}-192.webp 192w`, `${base}-600.webp 600w`, `${hero.src} 1200w`].join(", ");
}

/** Small square candidate used by list thumbnails. */
export function articleHeroThumb(hero: ArticleHero): string {
  return hero.src.replace(/\.webp$/, "-192.webp");
}

/**
 * One hero shape for both artwork sets: the in-house WebP illustrations and
 * the JPEG+WebP set drawn for the snapshotted CMS posts.
 */
export type ResolvedHero = {
  src: string;
  alt: string;
  srcSet: string;
  sizes: string;
  thumb: string;
  /** Rendition to preload as the LCP image. */
  preloadHref: string;
};

const LOCAL_SIZES = "(max-width: 768px) 100vw, 768px";

export function resolveArticleHero(
  slug: string,
  heroSet: "local" | "cms" | "outrank" = "local",
  featuredImageUrl?: string | null,
): ResolvedHero | null {
  if (heroSet === "cms") {
    const hero = cmsHero(slug);
    if (!hero) return null;
    return {
      src: hero.src,
      alt: hero.alt,
      srcSet: cmsHeroSrcSet(hero.src),
      sizes: CMS_HERO_SIZES,
      thumb: cmsHeroWebp(hero.src, 400),
      preloadHref: cmsHeroWebp(hero.src, 900),
    };
  }

  if (heroSet === "outrank" && featuredImageUrl) {
    // The CMS serves these from its own CDN, which CSP blocks; proxy them.
    const full = resizedImageUrl(featuredImageUrl, 1200);
    return {
      src: full,
      alt: `${slug.replace(/-/g, " ")} featured image`,
      srcSet: `${resizedImageUrl(featuredImageUrl, 600)} 600w, ${full} 1200w`,
      sizes: LOCAL_SIZES,
      thumb: resizedImageUrl(featuredImageUrl, 400),
      preloadHref: full,
    };
  }

  const hero = articleHero(slug);
  if (!hero) return null;
  return {
    src: hero.src,
    alt: hero.alt,
    srcSet: articleHeroSrcSet(hero),
    sizes: LOCAL_SIZES,
    thumb: articleHeroThumb(hero),
    preloadHref: hero.src,
  };
}
