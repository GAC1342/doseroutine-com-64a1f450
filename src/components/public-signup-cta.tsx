import { useRouterState } from "@tanstack/react-router";
import { isHiddenPath } from "@/components/about-doseroutine-block";
import { SignupCta } from "@/components/signup-cta";

// Pages that already carry their own dedicated sign-up/conversion hero — a
// second sitewide CTA there would just be duplication.
const SKIP_EXACT = new Set<string>(["/", "/closed-testing", "/install", "/onboarding"]);

/**
 * Renders the sign-up CTA on every public page. Hidden on authenticated app
 * screens, auth flows and shared-token pages (same rules as the About block).
 */
export function PublicSignupCta() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const normalized = pathname.length > 1 ? pathname.replace(/\/+$/, "") || "/" : pathname;
  if (SKIP_EXACT.has(normalized)) return null;
  if (isHiddenPath(normalized)) return null;
  return (
    <div className="px-4">
      <SignupCta />
    </div>
  );
}
