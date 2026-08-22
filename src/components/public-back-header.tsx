import { Link } from "@tanstack/react-router";
import { ChevronLeft } from "lucide-react";
import { InlineSignupButton } from "@/components/inline-signup-button";

/**
 * Slim sticky back bar for PUBLIC (unauthenticated) sub-pages such as
 * calculators, interaction checkers, and /vs comparison pages. Gives users
 * landing from Google a consistent way back to the DoseRoutine home page,
 * plus one persistent coral sign-up button on the right.
 *
 * Authenticated pages already get a global back button via <Breadcrumbs />
 * inside <AppShell>; don't use this component there.
 */
export function PublicBackHeader({
  /**
   * Free-tool pages (checker, calculators) hide the sign-up button so nothing
   * competes with the tool. Those pages ask for an account only after the
   * visitor has a result, via <SaveResultCta />.
   */
  hideSignup = false,
  /**
   * Where "back" goes. Defaults to the marketing home page, but a page that
   * sits inside a hub (a single calculator under /calculators) should send the
   * user back to that hub instead — going "back" to "/" bounces signed-in
   * users to /today, which is never what they meant.
   */
  backTo = "/",
  backLabel = "Back to DoseRoutine",
}: {
  hideSignup?: boolean;
  backTo?: "/" | "/calculators" | "/library" | "/peptides";
  backLabel?: string;
} = {}) {
  return (
    <nav
      aria-label="Back"
      className="sticky top-0 z-30 border-b border-border bg-background/95 backdrop-blur"
      style={{ paddingTop: "env(safe-area-inset-top)" }}
    >
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-2">
        <Link
          to={backTo}
          className="tap-target inline-flex min-w-0 items-center gap-1 rounded-lg px-2 py-1.5 text-sm font-medium text-foreground hover:bg-card"
          aria-label={backLabel}
        >
          <ChevronLeft className="h-4 w-4 shrink-0" aria-hidden="true" />
          <span className="truncate">{backLabel}</span>
        </Link>
        {!hideSignup && <InlineSignupButton />}
      </div>
    </nav>
  );
}
