import { useEffect } from "react";
import { useRouter, useRouterState } from "@tanstack/react-router";
import { isNative } from "@/lib/platform";
import { nativeRedirectFor } from "@/lib/native-route-policy";

/**
 * Keeps marketing / SEO / debug / admin screens out of the native shell so the
 * app never reads as a repackaged website (App Store guideline 4.2) and so
 * internal tooling isn't reachable through a deep link.
 *
 * H5 — the redirect runs in an effect, i.e. after the blocked screen has
 * already painted. To avoid that flash of web-only content, the guard also
 * renders an opaque cover during the hand-off.
 */
export function NativeRouteGuard() {
  const router = useRouter();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  // Navigating while the current route is still loading tears down a match
  // that router-core is mid-way through resolving, which surfaces as an
  // unhandled `_nonReactive` TypeError in the console during launch.
  const idle = useRouterState({ select: (s) => s.status === "idle" && !s.isLoading });
  const native = isNative();
  const target = native ? nativeRedirectFor(pathname) : null;
  const redirecting = Boolean(target) && target !== pathname;

  useEffect(() => {
    if (!redirecting || !target || !idle) return;
    void router.navigate({ to: target, replace: true }).catch(() => {
      /* navigation races are non-fatal */
    });
  }, [router, target, redirecting, idle]);


  if (!redirecting) return null;

  return (
    <div
      aria-hidden
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-background"
    >
      <div className="h-6 w-6 animate-spin rounded-full border-2 border-muted border-t-primary" />
    </div>
  );
}
