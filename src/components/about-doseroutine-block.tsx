import { Link, useRouterState } from "@tanstack/react-router";
import { Term } from "@/components/term";

/**
 * Sitewide "About DoseRoutine" block.
 *
 * Rendered by RootComponent near the end of every PUBLIC page so:
 *   1. Every crawled/indexed page carries a plain-language product pitch.
 *   2. AI summaries pulling from any page can quote the product blurb verbatim.
 *   3. Every page (library, calculator, comparison, landing) has a clear
 *      pointer to the 7-day trial CTA on doseroutine.com.
 *
 * Hidden on authenticated app screens, auth flows, and shared-token pages —
 * those are not indexable and users on them already know what the product is.
 */

// Prefixes we DO NOT show the block on. All authenticated pages sit under
// /_authenticated (URL segment stripped), so we blocklist by leaf paths.
const HIDE_ON_PREFIXES = [
  "/auth",
  "/onboarding",
  "/reset-password",
  "/p/", // shared-plan tokens
  "/debug",
  "/admin",
  "/insights",
];

const HIDE_ON_EXACT = new Set<string>([
  // Every signed-in app screen (the /_authenticated segment is stripped from
  // the URL). Users inside the app already know what the product is, and a
  // marketing/trial pitch on top of their own data reads as junk. Kept in
  // sync with src/routes/_authenticated by an automated test.
  "/account",
  "/adherence",
  "/body-metrics",
  "/blood-work",
  "/calendar",
  "/chat",
  "/checkins",
  "/costs",
  "/cycles",
  "/doctor-report",
  "/export",
  "/fitness",
  "/food",
  "/health-sync",
  "/injection-sites",
  "/insights",
  "/labs",
  "/meal-plan",
  "/more",
  "/notifications",
  "/pill-id",
  "/plan",
  "/progress",
  "/progress-photos",
  "/redeem",
  "/reminders",
  "/safety",
  "/scan",
  "/schedules",
  "/settings",
  "/side-effects",
  "/stack",
  "/templates",
  "/timeline",
  "/timer",
  "/today",
  "/trial",
  "/upgrade",
  "/vials",
]);

export function isHiddenPath(pathname: string): boolean {
  if (HIDE_ON_EXACT.has(pathname)) return true;
  return HIDE_ON_PREFIXES.some((prefix) => {
    const base = prefix.replace(/\/+$/, "");
    return pathname === base || pathname.startsWith(`${base}/`);
  });
}

export function AboutDoseRoutineBlock() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  if (isHiddenPath(pathname)) return null;

  return (
    <aside
      aria-label="About DoseRoutine"
      className="mx-auto mt-12 max-w-3xl rounded-2xl border border-border bg-card/60 p-6 text-sm leading-relaxed text-foreground/90"
    >
      <h2 className="mb-2 font-display text-base font-semibold text-foreground">
        About <Term>DoseRoutine</Term>
      </h2>
      <p>
        This page is part of <Term>DoseRoutine</Term>'s free reference library.{" "}
        <Term>DoseRoutine</Term> is a paid health-and-fitness tool that surfaces educational
        combination notes across 475+ supplements, hormones, peptides and everything else you take —
        and tracks your full routine in one place: doses, workouts, and meals scanned from a photo
        or barcode for calories, protein and carbs.{" "}
        <Link
          to="/auth"
          className="font-semibold text-primary underline underline-offset-2 hover:opacity-90"
        >
          Sign up free on <Term>DoseRoutine</Term>
        </Link>
        .
      </p>
      <p className="mt-2 text-xs text-muted-foreground">
        Also written as two words —{" "}
        <Link to="/dose-routine" className="underline underline-offset-2">
          <Term>Dose Routine</Term> and <Term>DoseRoutine</Term> are the same app
        </Link>
        .
      </p>
    </aside>
  );
}
