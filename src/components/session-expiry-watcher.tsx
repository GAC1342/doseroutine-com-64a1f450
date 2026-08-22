import { useEffect, useRef } from "react";
import { useNavigate, useRouterState } from "@tanstack/react-router";
import { loginRedirectSearch, watchSessionExpiry } from "@/lib/session-expiry";
import { rememberRedirect } from "@/lib/post-auth-redirect";
import { captureClientError } from "@/lib/client-error-monitor";

/**
 * Mounted inside the authenticated shell. As soon as the auth token is no
 * longer valid, sends the user to /auth with a redirect back to the screen
 * they were on, instead of leaving them on a screen whose every request 401s.
 */
export function SessionExpiryWatcher() {
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const pathRef = useRef(pathname);
  pathRef.current = pathname;

  useEffect(() => {
    return watchSessionExpiry(() => {
      const from = pathRef.current;
      try {
        rememberRedirect(from);
      } catch {
        /* storage disabled */
      }
      captureClientError(new Error("Session expired — redirecting to login"), { from }, "manual");
      void navigate({ to: "/auth", search: loginRedirectSearch(from), replace: true });
    });
  }, [navigate]);

  return null;
}
