/**
 * Registry of drill-down targets for the Insights dashboard.
 *
 * Each chart card on `/insights` maps to one slug here, which powers the
 * detail page at `/insights/$metric`.
 */

export const INSIGHT_METRIC_SLUGS = [
  "adherence",
  "doses",
  "weight",
  "training",
  "rotation",
  "supply",
  "spend",
  "body-fat",
] as const;

export type InsightMetricSlug = (typeof INSIGHT_METRIC_SLUGS)[number];

export interface InsightMetricMeta {
  slug: InsightMetricSlug;
  title: string;
  /** One-line explanation shown under the detail page title. */
  blurb: string;
  /** Where in the app the underlying data is created / managed. */
  appHref: string;
  appLabel: string;
}

export const INSIGHT_METRICS: Record<InsightMetricSlug, InsightMetricMeta> = {
  adherence: {
    slug: "adherence",
    title: "Adherence",
    blurb: "Share of scheduled doses you confirmed on time, bucketed across the window.",
    appHref: "/timeline",
    appLabel: "View timeline",
  },
  doses: {
    slug: "doses",
    title: "Doses logged",
    blurb: "Every dose you confirmed, counted per day or per week.",
    appHref: "/today",
    appLabel: "Open today",
  },
  weight: {
    slug: "weight",
    title: "Body weight",
    blurb: "Body weight from your check-ins, in your preferred unit.",
    appHref: "/checkins",
    appLabel: "Log a check-in",
  },
  training: {
    slug: "training",
    title: "Training volume",
    blurb: "Minutes trained and completed sessions from your workout log.",
    appHref: "/fitness",
    appLabel: "Open fitness",
  },
  rotation: {
    slug: "rotation",
    title: "Injection rotation",
    blurb: "How your injections are spread across sites, so no site gets overused.",
    appHref: "/injection-sites",
    appLabel: "Open site map",
  },
  supply: {
    slug: "supply",
    title: "Vial supply",
    blurb: "Doses remaining in each tracked vial and roughly how long they last.",
    appHref: "/costs",
    appLabel: "Manage vials",
  },
  spend: {
    slug: "spend",
    title: "Monthly spend",
    blurb: "Estimated monthly cost per compound, from vial price and dose frequency.",
    appHref: "/costs",
    appLabel: "Open costs",
  },
  "body-fat": {
    slug: "body-fat",
    title: "Body fat",
    blurb: "Body fat percentage recorded in your check-ins.",
    appHref: "/checkins",
    appLabel: "Log a check-in",
  },
};

export function isInsightMetricSlug(value: string): value is InsightMetricSlug {
  return (INSIGHT_METRIC_SLUGS as readonly string[]).includes(value);
}

export function insightMetric(value: string): InsightMetricMeta | null {
  return isInsightMetricSlug(value) ? INSIGHT_METRICS[value] : null;
}
