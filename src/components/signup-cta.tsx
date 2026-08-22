import { Link, useRouterState } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import { TrustBadges } from "@/components/trust-badges";
import { useSessionState } from "@/hooks/use-session";
import { trackEvent } from "@/lib/analytics";

/**
 * Compound pages take almost all of our search traffic, so the CTA names the
 * thing the reader just read about instead of a generic "sign up" pitch.
 */
function compoundNameFromPath(pathname: string): string | null {
  const m = /^\/library\/([a-z0-9-]+)\/?$/.exec(pathname);
  if (!m) return null;
  const slug = m[1];
  if (slug === "guides" || slug === "interactions") return null;
  return slug
    .split("-")
    .map((w) => (w.length <= 3 ? w.toUpperCase() : w.charAt(0).toUpperCase() + w.slice(1)))
    .join(" ");
}

/**
 * Sitewide sign-up CTA.
 *
 * Rendered by RootComponent on every PUBLIC page (see isPublicMarketingPath in
 * about-doseroutine-block.tsx) so every crawled/landed page has a real,
 * primary-colored button into sign-up — not just a text link.
 *
 * Signed-in visitors get nothing: the header nav already has an "Open app"
 * link, so a full-width card that only repeats it is dead space.
 */
export function SignupCta() {
  const session = useSessionState();
  const pathname = useRouterState({ select: (st) => st.location.pathname });
  const compound = compoundNameFromPath(pathname);

  const signedIn = session === "signed-in";
  const ctaContext = compound ? "compound_page" : "generic";

  // Nothing to pitch to someone who is already signed in.
  if (signedIn) return null;

  return (
    <section
      aria-label="Sign up free"
      data-testid="signup-cta"
      className="mx-auto mt-10 max-w-3xl rounded-2xl border border-border bg-card p-6 shadow-sm sm:p-8"
    >
      <h2 className="font-display text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
        {compound ? `Track ${compound} in your own routine` : "Track this in your own routine"}
      </h2>
      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
        {compound
          ? `Add ${compound} to your stack, get reminders at the right times, and see interaction notes with everything else you take. Free to start — no card needed.`
          : "Build your stack, get reminders at the right times, and see combination notes across 475+ supplements, hormones and peptides. Free to start — no card needed."}
      </p>

      <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center">
        <Link
          to="/auth"
          onClick={() => trackEvent("cta_signup_click", { context: ctaContext, path: pathname })}
          className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-cta px-6 text-sm font-semibold text-cta-foreground shadow-sm transition-colors hover:bg-cta-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          {compound ? `Track ${compound} free` : "Sign up free"}
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </Link>
        <Link
          to="/auth"
          className="inline-flex h-11 items-center justify-center rounded-xl border border-border bg-background px-6 text-sm font-semibold text-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
        >
          Sign in
        </Link>
      </div>

      <TrustBadges variant="trial" className="mt-4" />
    </section>
  );
}
