import type { ReactNode } from "react";
import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { ArrowRight, Crown, Lock, Check, Loader2, Mail } from "lucide-react";
import { useAccess } from "@/hooks/use-access";
import { matchProRoute, type ProRoute } from "@/lib/pro-routes";
import { TRIAL_PRO_MONTHLY_CENTS } from "@/lib/access";
import { trackEvent } from "@/lib/analytics";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/page-header";
import { useT } from "@/lib/i18n-provider";

/**
 * Wraps the authenticated <Outlet />. When a user's trial has ended (and they
 * have no subscription, comp access, or grandfathering) Pro-only screens show
 * a clear locked state instead of silently rendering. Free screens are never
 * touched.
 */
export function ProRouteGate({ children }: { children: ReactNode }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const access = useAccess();
  const proRoute = matchProRoute(pathname);

  // Not a Pro screen, still resolving access, or they have access → render.
  if (!proRoute) return <>{children}</>;
  if (access.loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
      </div>
    );
  }
  if (access.fullAccess) return <>{children}</>;

  return (
    <ProLockedScreen
      route={proRoute}
      hasUsedTrial={access.hasUsedTrial}
      returnTo={pathname}
    />
  );

}

function ProLockedScreen({
  route,
  hasUsedTrial,
  returnTo,
}: {
  route: ProRoute;
  hasUsedTrial: boolean;
  returnTo: string;
}) {
  const navigate = useNavigate();
  const t = useT();
  const price = `$${(TRIAL_PRO_MONTHLY_CENTS / 100).toFixed(2)}/month`;
  const keepsWorking = [t("proLockKeep1"), t("proLockKeep2"), t("proLockKeep3")];
  const fill = (key: string) => t(key).replace("{screen}", route.title);

  function goPro() {
    trackEvent("pro_route_gate_cta", { route: route.path, has_used_trial: hasUsedTrial });
    if (hasUsedTrial) {
      // `next` brings them back to this exact screen once checkout completes.
      navigate({
        to: "/upgrade",
        search: { checkout: "1" as const, plan: "monthly" as const, next: returnTo },
      });
    } else {
      navigate({ to: "/trial" });
    }
  }

  return (
    <>
      <PageHeader title={route.title} fallbackTo="/today" />
      <div className="mx-auto max-w-md px-4 pb-24 pt-6 sm:px-6">
        <Card className="rounded-2xl border-border p-6 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-cta/15">
            <Lock className="h-6 w-6 text-cta" aria-hidden="true" />
          </div>
          <h1 className="mt-4 font-display text-xl font-semibold">
            {hasUsedTrial ? fill("proLockTitleLocked") : fill("proLockTitleFeature")}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {hasUsedTrial ? `${fill("proLockBodyEnded")} ${route.blurb}` : route.blurb}
          </p>

          <button
            type="button"
            onClick={goPro}
            className="tap-target mt-5 inline-flex w-full items-center justify-center gap-1.5 rounded-xl bg-cta px-4 py-3.5 text-base font-semibold text-cta-foreground hover:bg-cta-hover active:scale-[0.98]"
          >
            {hasUsedTrial ? (
              <>
                <Crown className="h-4 w-4" /> {t("proLockCtaReactivate").replace("{price}", price)}
              </>
            ) : (
              <>
                {t("proLockCtaTrial")} <ArrowRight className="h-4 w-4" />
              </>
            )}
          </button>

          <ul className="mt-5 space-y-2 text-left text-sm text-muted-foreground">
            {keepsWorking.map((line) => (
              <li key={line} className="flex items-start gap-2">
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-success" aria-hidden="true" />
                {line}
              </li>
            ))}
          </ul>

          <div className="mt-5 flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-sm">
            <Link to="/today" className="text-primary underline underline-offset-2">
              {t("proLockBack")}
            </Link>
            <Link to="/help" className="text-primary underline underline-offset-2">
              {t("proLockWhatsInPro")}
            </Link>
            <a
              href="mailto:support@doseroutine.com?subject=Pro%20checkout%20help"
              className="inline-flex items-center gap-1 text-primary underline underline-offset-2"
              onClick={() => trackEvent("pro_route_gate_support", { route: route.path })}
            >
              <Mail className="h-3.5 w-3.5" aria-hidden="true" />
              {t("proLockSupport")}
            </a>
          </div>
        </Card>
      </div>
    </>
  );
}
