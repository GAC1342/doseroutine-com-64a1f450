import { Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import { useSessionState } from "@/hooks/use-session";

/**
 * Compact coral (CTA-token) sign-up button for high-visibility spots:
 * the sticky public header and the top of long article pages.
 *
 * Deliberately small and single — the page-level pitch stays in
 * <SignupCta />. Signed-in visitors get "Open app" instead.
 */
export function InlineSignupButton({
  label = "Sign up free",
  size = "sm",
  className = "",
}: {
  label?: string;
  size?: "sm" | "md";
  className?: string;
}) {
  const signedIn = useSessionState() === "signed-in";
  const dims = size === "md" ? "h-10 px-5 text-sm" : "h-9 px-3.5 text-[13px]";

  return (
    <Link
      to={signedIn ? "/today" : "/auth"}
      data-testid="inline-signup-button"
      className={`tap-target inline-flex shrink-0 items-center justify-center gap-1.5 rounded-xl font-semibold shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${dims} ${
        signedIn
          ? "bg-primary text-primary-foreground hover:bg-[color:var(--primary-hover)]"
          : "bg-cta text-cta-foreground hover:bg-cta-hover"
      } ${className}`}
    >
      {signedIn ? "Open app" : label}
      <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
    </Link>
  );
}
