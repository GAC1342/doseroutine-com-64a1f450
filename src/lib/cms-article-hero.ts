/**
 * Unique hero artwork for snapshotted CMS /articles posts.
 *
 * The old CMS served one generic title image across the whole blog, which means
 * every post shared the same og:image and none of them could earn an image
 * rich result. Each slug below has its own premium 1200x630 illustration in
 * public/articles/cms/ with descriptive alt text, used for the on-page
 * <img>, og:image / twitter:image and the BlogPosting `image` property.
 *
 * Each JPEG also ships WebP renditions at 400/600/900/1200 CSS px
 * (`<slug>-<width>.webp`). The page serves WebP through a <picture> srcset so
 * phones download roughly a quarter of the bytes, while the JPEG stays the
 * canonical structured-data / og:image asset because share scrapers and rich
 * result thumbnails are most reliable with JPEG at the full 1200x630.
 */
export type CmsHero = { src: string; alt: string };

export const CMS_HERO_WIDTH = 1200;
export const CMS_HERO_HEIGHT = 630;

/** Rendition widths generated for every hero (see scripts/build-cms-heroes.py). */
export const CMS_HERO_WIDTHS = [400, 600, 900, 1200] as const;

const HEROES: Record<string, CmsHero> = {
  armodafinil: {
    src: "/articles/cms/armodafinil.jpg",
    alt: "White oval tablet standing in dawn light beside a brushed-metal 24-hour dial arc",
  },
  boldenone: {
    src: "/articles/cms/boldenone.jpg",
    alt: "Amber glass injection vial and syringe in front of a teal steroid-ring molecular model",
  },
  carbetocin: {
    src: "/articles/cms/carbetocin.jpg",
    alt: "Clear medical vial and fine syringe beside a curved teal peptide chain",
  },
  "carbetocin-dose": {
    src: "/articles/cms/carbetocin-dose.jpg",
    alt: "Three syringes filled to increasing levels beside a small vial, showing a dose ladder",
  },
  clonidine: {
    src: "/articles/cms/clonidine.jpg",
    alt: "Teal capsule beside a glass heart-rate waveform settling into a calm line",
  },
  "extended-release-melatonin": {
    src: "/articles/cms/extended-release-melatonin.jpg",
    alt: "Layered slow-release tablet floating over a night sky with a trailing sleep curve",
  },
  intuniv: {
    src: "/articles/cms/intuniv.jpg",
    alt: "Two-tone extended-release capsule filled with microbeads beside a metal dial",
  },
  "lisdexamfetamine-brand-name": {
    src: "/articles/cms/lisdexamfetamine-brand-name.jpg",
    alt: "Teal and coral capsule linked by a glass arc into a concentric focus target",
  },
  longevity: {
    src: "/articles/cms/longevity.jpg",
    alt: "Rising glass staircase beside a DNA helix leading toward a sunrise",
  },
  "longevity-peptides": {
    src: "/articles/cms/longevity-peptides.jpg",
    alt: "Glass vial holding a glowing peptide helix beside rising ranked blocks",
  },
  "meal-planning-app": {
    src: "/articles/cms/meal-planning-app.jpg",
    alt: "Flat lay of four prepped meal containers with chicken, grains and vegetables",
  },
  "pastillas-para-bajar-de-peso": {
    src: "/articles/cms/pastillas-para-bajar-de-peso.jpg",
    alt: "White bathroom scale with a coral measuring tape and two capsules",
  },
  "ramelteon-drug-class": {
    src: "/articles/cms/ramelteon-drug-class.jpg",
    alt: "White sleep tablet beneath a frosted teal crescent moon and a glowing receptor keyhole",
  },
  "ranitidine-drug": {
    src: "/articles/cms/ranitidine-drug.jpg",
    alt: "Tipped amber medicine bottle with spilled tablets beside a coral prohibition sign",
  },
  "science-of-longevity": {
    src: "/articles/cms/science-of-longevity.jpg",
    alt: "Laboratory microscope projecting a luminous DNA double helix",
  },
  "what-is-guanfacine-used-for": {
    src: "/articles/cms/what-is-guanfacine-used-for.jpg",
    alt: "Blood-pressure cuff gauge and a tablet in front of a translucent teal brain model",
  },
  "yuka-app": {
    src: "/articles/cms/yuka-app.jpg",
    alt: "Hand holding a phone showing a teal-to-coral product rating arc in a grocery aisle",
  },
  "zinc-bisglycinate-supplement": {
    src: "/articles/cms/zinc-bisglycinate-supplement.jpg",
    alt: "Open supplement bottle spilling capsules beside a teal zinc chelate molecule",
  },
};

/** Unique hero for an the CMS slug, or null when it has none yet. */
export function cmsHero(slug: string): CmsHero | null {
  return HEROES[slug] ?? null;
}

/** Every slug that has bespoke artwork — used by the structured-data report. */
export function cmsHeroSlugs(): string[] {
  return Object.keys(HEROES);
}

/** WebP path for one rendition width, e.g. `/articles/cms/intuniv-600.webp`. */
export function cmsHeroWebp(src: string, width: number): string {
  return `${src.replace(/\.jpg$/, "")}-${width}.webp`;
}

/** `srcset` of the WebP renditions, smallest first. */
export function cmsHeroSrcSet(src: string): string {
  return CMS_HERO_WIDTHS.map((w) => `${cmsHeroWebp(src, w)} ${w}w`).join(", ");
}

/**
 * The article column is capped at max-w-3xl (768px), so a 2x phone or a
 * retina desktop never needs more than the 1200px rendition.
 */
export const CMS_HERO_SIZES = "(max-width: 768px) 100vw, 768px";
