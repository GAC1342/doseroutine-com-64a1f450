/**
 * The six premium product visuals: one per headline feature.
 *
 * Each visual ships as WebP at 1200/800/400 and an original-quality JPEG
 * fallback, all hosted on the CDN rather than committed as binaries. Intrinsic
 * width/height are recorded so the browser reserves the right box before the
 * bytes land (no layout shift, no CLS regression).
 *
 * The same metadata drives three surfaces — the homepage showcase, the
 * per-feature `og:image` / `twitter:image`, and the sitemap image entry — so a
 * caption can never drift between what a reader sees and what a crawler reads.
 */
import mealScan1200 from "@/assets/feature/meal-scan-1200.webp.asset.json";
import mealScan800 from "@/assets/feature/meal-scan-800.webp.asset.json";
import mealScan400 from "@/assets/feature/meal-scan-400.webp.asset.json";
import mealScanJpg from "@/assets/feature/meal-scan.jpg.asset.json";
import rotation1200 from "@/assets/feature/injection-rotation-1200.webp.asset.json";
import rotation800 from "@/assets/feature/injection-rotation-800.webp.asset.json";
import rotation400 from "@/assets/feature/injection-rotation-400.webp.asset.json";
import rotationJpg from "@/assets/feature/injection-rotation.jpg.asset.json";
import timeline1200 from "@/assets/feature/daily-timeline-1200.webp.asset.json";
import timeline800 from "@/assets/feature/daily-timeline-800.webp.asset.json";
import timeline400 from "@/assets/feature/daily-timeline-400.webp.asset.json";
import timelineJpg from "@/assets/feature/daily-timeline.jpg.asset.json";
import bloodwork1200 from "@/assets/feature/bloodwork-1200.webp.asset.json";
import bloodwork800 from "@/assets/feature/bloodwork-800.webp.asset.json";
import bloodwork400 from "@/assets/feature/bloodwork-400.webp.asset.json";
import bloodworkJpg from "@/assets/feature/bloodwork.jpg.asset.json";
import reminders1200 from "@/assets/feature/reminders-1200.webp.asset.json";
import reminders800 from "@/assets/feature/reminders-800.webp.asset.json";
import reminders400 from "@/assets/feature/reminders-400.webp.asset.json";
import remindersJpg from "@/assets/feature/reminders.jpg.asset.json";
import recon1200 from "@/assets/feature/reconstitution-1200.webp.asset.json";
import recon800 from "@/assets/feature/reconstitution-800.webp.asset.json";
import recon400 from "@/assets/feature/reconstitution-400.webp.asset.json";
import reconJpg from "@/assets/feature/reconstitution.jpg.asset.json";

export const SITE = "https://doseroutine.com";

export type FeatureVisual = {
  id: string;
  /** Heading shown beside the visual in the homepage showcase. */
  title: string;
  /** One-line caption — also used as the sitemap image caption. */
  caption: string;
  /** Descriptive alt text written for the feature, not the filename. */
  alt: string;
  /** Where in the app this feature lives. */
  href: string;
  /** Route paths that should use this visual as their social card. */
  socialPaths: string[];
  /**
   * 1.91:1 crop served to social crawlers. The in-page artwork is portrait or
   * 3:2, which Facebook/X letterbox or center-crop unpredictably, so pages
   * that share a feature visual point `og:image` here instead.
   */
  socialCard?: { url: string; width: number; height: number };
  width: number;
  height: number;
  webp: { w1200: string; w800: string; w400: string };
  jpg: string;
};

const LANDSCAPE = { width: 1168, height: 784 };
const PORTRAIT = { width: 784, height: 1168 };

export const FEATURE_VISUALS: FeatureVisual[] = [
  {
    id: "daily-timeline",
    title: "Your whole day on one timeline",
    caption:
      "The DoseRoutine daily timeline showing every scheduled dose, its time window and whether it has been logged.",
    alt: "DoseRoutine daily timeline screen on a phone, listing each scheduled dose with its time and logged status",
    href: "/today",
    socialPaths: [],
    ...PORTRAIT,
    webp: { w1200: timeline1200.url, w800: timeline800.url, w400: timeline400.url },
    jpg: timelineJpg.url,
  },
  {
    id: "reminders",
    title: "Reminders that also warn you",
    caption:
      "Dose reminders in DoseRoutine, including an interaction alert raised before the dose is taken rather than after.",
    alt: "DoseRoutine notifications screen showing dose reminders alongside an interaction warning for the current stack",
    href: "/help",
    socialPaths: [],
    ...PORTRAIT,
    webp: { w1200: reminders1200.url, w800: reminders800.url, w400: reminders400.url },
    jpg: remindersJpg.url,
  },
  {
    id: "reconstitution",
    title: "Reconstitution math, done once",
    caption:
      "The DoseRoutine reconstitution calculator converting vial milligrams and diluent volume into units on an insulin syringe.",
    alt: "DoseRoutine reconstitution calculator on a phone beside a peptide vial and insulin syringe, showing units to draw",
    href: "/reconstitution-calculator",
    socialPaths: ["/reconstitution-calculator", "/calculators"],
    socialCard: { url: "/og/reconstitution-card.jpg", width: 1200, height: 630 },

    ...LANDSCAPE,
    webp: { w1200: recon1200.url, w800: recon800.url, w400: recon400.url },
    jpg: reconJpg.url,
  },
  {
    id: "injection-rotation",
    title: "Injection sites, rotated properly",
    caption:
      "The DoseRoutine injection site map recording which sites were used recently so rotation happens by record, not memory.",
    alt: "DoseRoutine injection site rotation map on a phone, highlighting recently used sites on a body diagram",
    href: "/library/peptide-stacks-for-muscle-growth",
    socialPaths: [],
    ...LANDSCAPE,
    webp: { w1200: rotation1200.url, w800: rotation800.url, w400: rotation400.url },
    jpg: rotationJpg.url,
  },
  {
    id: "meal-scan",
    title: "Photograph the plate, get the macros",
    caption:
      "DoseRoutine's meal scanner estimating calories, protein and carbs from a photo, with every value editable.",
    alt: "DoseRoutine meal scanner on a phone estimating calories, protein and carbohydrates from a photo of a salmon meal",
    href: "/help",
    socialPaths: [],
    ...LANDSCAPE,
    webp: { w1200: mealScan1200.url, w800: mealScan800.url, w400: mealScan400.url },
    jpg: mealScanJpg.url,
  },
  {
    id: "bloodwork",
    title: "Labs read against what you took",
    caption:
      "The DoseRoutine bloodwork tracker charting lab trends on the same timeline as protocol changes and progress photos.",
    alt: "DoseRoutine bloodwork tracker on a phone showing lab value trend lines and progress photos over time",
    href: "/help",
    socialPaths: [],
    ...LANDSCAPE,
    webp: { w1200: bloodwork1200.url, w800: bloodwork800.url, w400: bloodwork400.url },
    jpg: bloodworkJpg.url,
  },
];

export const FEATURE_VISUAL_BY_ID: Record<string, FeatureVisual> = Object.fromEntries(
  FEATURE_VISUALS.map((v) => [v.id, v]),
);

/** Absolute URL for social cards and structured data (crawlers reject relative). */
export function absolute(url: string): string {
  return url.startsWith("http") ? url : `${SITE}${url}`;
}

/** The visual a given route path should use as its social card, if any. */
export function featureVisualForPath(path: string): FeatureVisual | null {
  return FEATURE_VISUALS.find((v) => v.socialPaths.includes(path)) ?? null;
}

/** schema.org ImageObject — what answer engines read when citing a visual. */
export function featureImageObject(visual: FeatureVisual) {
  return {
    "@type": "ImageObject",
    "@id": `${SITE}/#image-${visual.id}`,
    url: absolute(visual.webp.w1200),
    contentUrl: absolute(visual.webp.w1200),
    thumbnailUrl: absolute(visual.webp.w400),
    width: visual.width,
    height: visual.height,
    name: visual.title,
    caption: visual.caption,
    description: visual.alt,
    representativeOfPage: false,
    creditText: "DoseRoutine",
    creator: { "@id": `${SITE}/#organization` },
    copyrightNotice: "© DoseRoutine",
  };
}

/**
 * `og:image` / `twitter:image` entries for a page that owns a feature visual.
 * Absolute URLs only — crawlers discard relative ones.
 */
export function featureSocialMeta(visual: FeatureVisual) {
  const card = visual.socialCard;
  const url = absolute(card?.url ?? visual.jpg);
  const width = card?.width ?? visual.width;
  const height = card?.height ?? visual.height;
  return [
    { property: "og:image", content: url },
    { property: "og:image:width", content: String(width) },
    { property: "og:image:height", content: String(height) },
    { property: "og:image:alt", content: visual.alt },
    { name: "twitter:image", content: url },
    { name: "twitter:image:alt", content: visual.alt },
  ];
}
