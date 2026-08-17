/**
 * Single source of truth for which in-app routes need full access (active
 * subscription, running trial, comp access, or grandfathered).
 *
 * Anything not listed here stays open to everyone, so a user whose trial
 * ended never loses their data, their Today screen, or the ability to
 * subscribe — they only lose the Pro surfaces.
 */
export type ProRoute = {
  /** Path prefix under the authenticated layout. */
  path: string;
  /** Screen name used in the lock copy. */
  title: string;
  /** One line explaining what they get back by subscribing. */
  blurb: string;
};

export const PRO_ROUTES: ProRoute[] = [
  {
    path: "/timeline",
    title: "Timeline",
    blurb: "Your 30-day adherence timeline and full dose history.",
  },
  {
    path: "/adherence",
    title: "Adherence",
    blurb: "Consistency heatmaps and streaks across your whole stack.",
  },
  {
    path: "/insights",
    title: "Insights",
    blurb: "Trends across doses, metrics, and side effects over time.",
  },
  {
    path: "/plan",
    title: "AI Plan",
    blurb: "Personalized daily schedules generated from your stack and goals.",
  },
  {
    path: "/chat",
    title: "AI Coach",
    blurb: "24/7 AI answers about your protocol, timing, and interactions.",
  },
  {
    path: "/doctor-report",
    title: "Doctor report",
    blurb: "A shareable summary of your stack and history for appointments.",
  },
  { path: "/export", title: "Export", blurb: "Export your stack, schedule, and full history." },
  { path: "/cycles", title: "Cycles", blurb: "Cycle planning with on/off phases and reminders." },
  {
    path: "/injection-sites",
    title: "Injection sites",
    blurb: "Site rotation tracking so you never overuse one area.",
  },
  { path: "/labs", title: "Lab work", blurb: "Track bloodwork results and see them trend." },
  {
    path: "/progress-photos",
    title: "Progress photos",
    blurb: "Private progress photo timeline with side-by-side compare.",
  },
  { path: "/costs", title: "Cost tracker", blurb: "Spend per compound, per month, and per cycle." },
  {
    path: "/side-effects",
    title: "Side-effect journal",
    blurb: "Log and correlate side effects with what you are taking.",
  },
  {
    path: "/templates",
    title: "Protocol templates",
    blurb: "Save, reuse, and share full protocol templates.",
  },
  {
    path: "/scan",
    title: "Scanner",
    blurb: "Barcode and label scanning to add items and meals instantly.",
  },
  {
    path: "/health-sync",
    title: "Health sync",
    blurb: "Sync metrics with Apple Health and Google Fit.",
  },
  {
    path: "/reminders",
    title: "Reminders",
    blurb: "Push and email dose reminders with quiet hours.",
  },
];

/** Returns the Pro route definition matching this pathname, if any. */
export function matchProRoute(pathname: string): ProRoute | null {
  const clean = pathname.replace(/\/+$/, "") || "/";
  return (
    PRO_ROUTES.find((r) => clean === r.path || clean.startsWith(`${r.path}/`)) ?? null
  );
}
