import { assetUrl } from "@/lib/asset-url";
import { BrandLogo, brandLogoPreload } from "@/components/brand-logo";
import { Testimonials } from "@/components/testimonials";
import { AppScreenshots } from "@/components/app-screenshots";
import { TrustSafety } from "@/components/trust-safety";
import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { lazy, Suspense, useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { trackEvent } from "@/lib/analytics";
import { DEFAULT_LOCALE } from "@/lib/i18n";
import { homeAppSchema, homeFaqSchema } from "@/lib/home-jsonld";
import { answerPageScript } from "@/lib/aeo";

import {
  ShieldCheck,
  Clock,
  Layers,
  Check,
  Lock,
  Search,
  Activity,
  Bell,
  X,
  ArrowRight,
  ChevronRight,
  ChevronDown,
  Pill,
  Smartphone,
} from "lucide-react";
import { useT } from "@/lib/i18n-provider";
import { LanguageSwitcher } from "@/components/language-switcher";
import { withDoseRoutineDescriptionSuffix } from "@/lib/seo-description";
import { Card } from "@/components/ui/card";
import { TrustBadges } from "@/components/trust-badges";
import { HomeFitnessPreview } from "@/components/home-fitness-preview";
import { HomeSiteNav } from "@/components/home-site-nav";

// Modal only renders on user intent — keep it out of the first-load bundle.
const AppInstallModal = lazy(() =>
  import("@/components/app-install-modal").then((m) => ({ default: m.AppInstallModal })),
);
import { useSessionState } from "@/hooks/use-session";

const ShareDoseRoutine = lazy(() =>
  import("@/components/share-doseroutine").then((m) => ({ default: m.ShareDoseRoutine })),
);

const HomeInsightsShowcase = lazy(() =>
  import("@/components/insights/home-insights-showcase").then((m) => ({
    default: m.HomeInsightsShowcase,
  })),
);

function AppleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M17.05 20.28c-.83.97-1.75 1.82-3.13 1.85-1.35.03-1.78-.8-3.33-.8-1.56 0-2.05.8-3.34.83-1.4.03-2.47-1.4-3.32-2.38-1.8-2.08-3.18-5.9-1.33-8.47 1.1-1.55 3.05-2.53 5.18-2.55 1.35 0 2.63.91 3.45.91.82 0 2.35-1.13 3.96-.96.67.03 2.57.27 3.78 2.04-.1.06-2.25 1.32-2.23 3.93.02 3.12 2.72 4.17 2.74 4.18-.02.1-.43 1.45-1.58 2.86-1.02 1.23-2.08 2.46-3.38 2.46zm-3.15-17.2c.72-.87 1.2-2.08 1.07-3.28-1.04.04-2.3.7-3.04 1.56-.66.76-1.24 1.98-1.09 3.17 1.15.09 2.33-.58 3.06-1.45z" />
    </svg>
  );
}

function GooglePlayIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M4 2.5v19c0 .28.15.53.39.67l.04.02 16.5-9.5a.75.75 0 0 0 0-1.3L4.43 1.81A.75.75 0 0 0 4 2.5zm2 3.4 13.2 7.6L6 21.1V5.9z" />
    </svg>
  );
}

const HOME_TITLE = "DoseRoutine — Peptide, TRT & Supplement Tracker App";
// Bump when the landing page content is reviewed or materially changed.
const HOME_REVIEWED = "2026-08-12";
// Keep the lead under ~79 chars: withDoseRoutineDescriptionSuffix appends the
// brand sentence and truncates anything longer with an ellipsis (hurts CTR).
const HOME_DESCRIPTION = withDoseRoutineDescriptionSuffix(
  // No trailing period: the helper strips it, then joins with ". ".
  "Dose reminders, reconstitution math, and 475+ interaction checks in one app",
);

function hreflangLinks(pathname = "/") {
  const base = "https://doseroutine.com";
  // No ?lang= alternates: server HTML is English everywhere and the language
  // switcher is client-side only. Self-referential cluster keeps Google from
  // crawling duplicate parameterised copies.
  return [
    { rel: "alternate", hrefLang: DEFAULT_LOCALE, href: `${base}${pathname}` },
    { rel: "alternate", hrefLang: "x-default", href: `${base}${pathname}` },
  ];
}

export const Route = createFileRoute("/")({
  beforeLoad: async () => {
    if (typeof window === "undefined") return;
    const { data } = await supabase.auth.getSession();
    if (data.session) throw redirect({ to: "/today" });
  },
  head: () => ({
    meta: [
      { title: HOME_TITLE },
      { name: "description", content: HOME_DESCRIPTION },
      { name: "author", content: "DoseRoutine" },
      { name: "publisher", content: "DoseRoutine" },
      { name: "copyright", content: "© DoseRoutine — doseroutine.com" },

      { property: "og:title", content: HOME_TITLE },
      { property: "og:description", content: HOME_DESCRIPTION },
      { property: "og:site_name", content: "DoseRoutine" },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://doseroutine.com/" },
      {
        property: "og:image",
        content:
          "https://doseroutine.com/__l5e/assets-v1/d3ac315d-df91-4605-b11c-e100c4cddd77/og-home.jpg",
      },
      {
        property: "og:image:secure_url",
        content:
          "https://doseroutine.com/__l5e/assets-v1/d3ac315d-df91-4605-b11c-e100c4cddd77/og-home.jpg",
      },
      { property: "og:image:type", content: "image/jpeg" },
      { property: "og:image:width", content: "1200" },
      { property: "og:image:height", content: "630" },
      {
        property: "og:image:alt",
        content:
          "DoseRoutine — track supplements, peptides and TRT with AI dose plans and safety checks",
      },
      { property: "og:locale", content: "en_US" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:site", content: "@doseroutine" },
      { name: "twitter:title", content: HOME_TITLE },
      { name: "twitter:description", content: HOME_DESCRIPTION },
      {
        name: "twitter:image",
        content:
          "https://doseroutine.com/__l5e/assets-v1/d3ac315d-df91-4605-b11c-e100c4cddd77/og-home.jpg",
      },
      {
        name: "twitter:image:alt",
        content:
          "DoseRoutine — track supplements, peptides and TRT with AI dose plans and safety checks",
      },
    ],
    // Dated, speakable WebPage node. Without it the homepage carries no
    // freshness signal at all — every other content route already has one.
    scripts: [
      answerPageScript({
        url: "https://doseroutine.com/",
        name: HOME_TITLE,
        description: HOME_DESCRIPTION,
        dateModified: HOME_REVIEWED,
        datePublished: "2026-01-15",
        shortAnswer:
          "DoseRoutine is a free interaction checker and dose tracker for supplements, hormones and TRT, peptides, GLP-1s and prescriptions, covering 475+ compounds with cited sources.",
        about: [
          "Supplement tracking",
          "Peptide dosing",
          "TRT tracking",
          "Drug interaction checker",
          "Medication reminders",
        ],
      }),
    ],
    links: [
      { rel: "canonical", href: "https://doseroutine.com/" },
      // Nav logo above the fold. 64px WebP (~1 KB) instead of the 192px PWA
      // icon (~33 KB) — same rendered 32px box, far less critical-path bytes.
      brandLogoPreload(32),
      // No preconnect to the backend here: the landing page paints without
      // touching it, and Lighthouse counts an unused preconnect as waste.
      ...hreflangLinks("/"),
    ],
  }),

  component: LandingPage,
});

function getDeviceType(): "mobile" | "tablet" | "desktop" {
  if (typeof window === "undefined") return "desktop";
  const w = window.innerWidth;
  if (w < 640) return "mobile";
  if (w < 1024) return "tablet";
  return "desktop";
}

function readUtm() {
  if (typeof window === "undefined") return {};
  const p = new URLSearchParams(window.location.search);
  const out: Record<string, string> = {};
  for (const k of ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term"]) {
    const v = p.get(k);
    if (v) out[k] = v;
  }
  return out;
}

function pickVariant(): "control" | "v1" {
  if (typeof window === "undefined") return "control";
  const saved = window.sessionStorage.getItem("sw_landing_variant");
  if (saved === "control" || saved === "v1") return saved;
  const next = Math.random() < 0.5 ? "control" : "v1";
  window.sessionStorage.setItem("sw_landing_variant", next);
  return next;
}

function isAuthCallback(): boolean {
  if (typeof window === "undefined") return false;
  const h = window.location.hash || "";
  const s = window.location.search || "";
  return (
    h.includes("access_token=") ||
    h.includes("error=") ||
    /[?&]code=/.test(s) ||
    /[?&]error=/.test(s)
  );
}

function LandingPage() {
  // Only show the splash while an OAuth callback is being processed. For
  // everyone else, render the marketing page immediately so mobile LCP is
  // the hero, not a spinner. Logged-in users still get redirected in the
  // effect below (brief flash is acceptable and much cheaper than blocking
  // paint on every anonymous visitor).
  const [authReturning] = useState(isAuthCallback);

  const [showSticky, setShowSticky] = useState(false);
  const [showInstallSticky, setShowInstallSticky] = useState(false);
  const [installModalOpen, setInstallModalOpen] = useState(false);
  const [showExit, setShowExit] = useState(false);
  const [variant] = useState(pickVariant);
  const firedDepths = useRef<Set<number>>(new Set());
  const utmRef = useRef<Record<string, string>>({});
  const exitShown = useRef(false);
  // When a real (non-sticky) signup button is on screen, the sticky bar stands
  // down so the visitor never sees two identical "Sign up free" buttons.
  const primaryCtaRef = useRef<HTMLDivElement | null>(null);
  const [primaryCtaVisible, setPrimaryCtaVisible] = useState(false);
  // The install prompt is earned attention: second pageview, or 30s+ on page.
  const [installEligible, setInstallEligible] = useState(false);
  // The cookie notice owns the bottom of the screen while it is open; the
  // sticky CTA waits its turn so the two fixed layers never overlap.
  const [cookieNoticeOpen, setCookieNoticeOpen] = useState(false);

  useEffect(() => {
    const sync = (event: Event) => {
      const detail = (event as CustomEvent<{ open?: boolean }>).detail;
      setCookieNoticeOpen(Boolean(detail?.open));
    };
    window.addEventListener("doseroutine:cookie-notice", sync);
    setCookieNoticeOpen(document.documentElement.dataset.cookieNotice === "open");
    return () => window.removeEventListener("doseroutine:cookie-notice", sync);
  }, []);

  useEffect(() => {
    const el = primaryCtaRef.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver((entries) => setPrimaryCtaVisible(entries[0].isIntersecting), {
      threshold: 0.2,
    });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    let views = 1;
    try {
      views = Number(localStorage.getItem("doseroutine_pageviews") || "0") + 1;
      localStorage.setItem("doseroutine_pageviews", String(views));
    } catch {
      // storage blocked — fall back to the dwell timer only
    }
    if (views >= 2) {
      setInstallEligible(true);
      return;
    }
    const t = setTimeout(() => setInstallEligible(true), 30_000);
    return () => clearTimeout(t);
  }, []);

  const _t = useT();
  const sessionState = useSessionState();

  useEffect(() => {
    utmRef.current = readUtm();
    trackEvent("landing_page_view", {
      device_type: getDeviceType(),
      referrer: document.referrer || null,
      variant,
      ...utmRef.current,
    });

    // Redirect signed-in users (and OAuth returners) to the app.
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) {
        window.location.replace("/today");
      }
    });

    // If OAuth is still finishing parsing the URL hash, catch SIGNED_IN.
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_IN") window.location.replace("/today");
    });

    const onScroll = () => {
      const doc = document.documentElement;
      const scrolled = window.scrollY + window.innerHeight;
      const total = doc.scrollHeight;
      const pct = Math.min(100, Math.round((scrolled / total) * 100));

      // Only show the sticky CTA once the hero's own button is out of view,
      // and hide it again when scrolling back up so the two never stack.
      if (window.scrollY > 300) {
        if (!showSticky) setShowSticky(true);
      } else if (showSticky) {
        setShowSticky(false);
      }

      // Show the mobile install banner only after the visitor has earned it:
      // engaged scroll AND (second pageview or 30s+ on the page).
      const device = getDeviceType();
      if (device === "mobile" && installEligible && window.scrollY > 500 && !showInstallSticky) {
        const dismissed = sessionStorage.getItem("doseroutine_install_sticky_dismissed") === "1";
        if (!dismissed) setShowInstallSticky(true);
      }


      for (const milestone of [50, 90]) {
        if (pct >= milestone && !firedDepths.current.has(milestone)) {
          firedDepths.current.add(milestone);
          trackEvent(`landing_scroll_depth_${milestone}`, {
            device_type: device,
            variant,
          });
        }
      }
    };
    window.addEventListener("scroll", onScroll, { passive: true });

    const onMouseOut = (e: MouseEvent) => {
      if (getDeviceType() !== "desktop") return;
      if (e.clientY > 20) return;
      if (exitShown.current) return;
      exitShown.current = true;
      setShowExit(true);
      trackEvent("landing_exit_intent_shown", { variant });
    };
    document.addEventListener("mouseout", onMouseOut);

    return () => {
      window.removeEventListener("scroll", onScroll);
      document.removeEventListener("mouseout", onMouseOut);
      sub.subscription.unsubscribe();
    };
  }, [showSticky, variant, installEligible, showInstallSticky]);

  // If we came back from an OAuth redirect, skip the landing entirely and
  // show a lightweight splash while the session hydrates. This prevents the
  // marketing page from flashing before the redirect to /today.
  if (authReturning) {
    return (
      <main id="main-content" tabIndex={-1} className="grid min-h-dvh place-items-center bg-background px-6 text-foreground">
        <div className="flex flex-col items-center gap-3 text-center">
          <BrandLogo size={56} alt="DoseRoutine logo and app icon" className="h-14 w-14" priority />
          <p className="text-sm text-muted-foreground">
            {authReturning ? "Signing you in…" : "Loading…"}
          </p>
        </div>
      </main>
    );
  }

  const handleCta = (position: string) => {
    trackEvent("hero_cta_click", {
      cta_position: position,
      device_type: getDeviceType(),
      variant,
      // Copy variant so the admin funnel can compare signup rate before/after
      // the switch from trial-first wording to free-account wording.
      cta_variant: "signup_free_v2",
      ...utmRef.current,
    });
  };

  return (
    <main id="main-content" tabIndex={-1} className="min-h-dvh bg-background text-foreground">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(homeAppSchema()) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(homeFaqSchema(_t)) }}
      />

      <HomeSiteNav
        signedIn={sessionState === "signed-in"}
        onCta={handleCta}
        signInLabel={_t("signIn")}
      />

      {/* HERO */}
      <section className="mx-auto max-w-5xl px-6 pb-8 pt-10 sm:pt-16">
        <div className="grid gap-10 sm:grid-cols-2 sm:items-center">
          <div className="text-center sm:text-left">
            <div className="inline-flex items-center gap-2 rounded-full bg-card px-3 py-1 text-xs font-medium text-muted-foreground">
              <Lock className="h-3.5 w-3.5 text-primary" />
              {_t("privacyNote")}
            </div>
            <h1 className="mt-5 font-display text-4xl font-semibold tracking-tight text-foreground sm:text-5xl lg:text-6xl">
              {_t("heroTitle")}
            </h1>
            <p className="mx-auto mt-5 max-w-xl text-base leading-relaxed text-muted-foreground sm:mx-0 sm:text-lg">
              {_t("heroBody")}
            </p>

            <ul className="mx-auto mt-6 grid max-w-md gap-2 text-left text-sm text-foreground sm:mx-0">
              <li className="flex items-start gap-2">
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                {_t("featureInteraction")}
              </li>
              <li className="flex items-start gap-2">
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                {_t("featureReminders")}
              </li>
              <li className="flex items-start gap-2">
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                {_t("featureDose")}
              </li>
              <li className="flex items-start gap-2">
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                Log workouts and body measurements next to your protocol
              </li>
            </ul>

            <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:items-start">
              <Link
                to="/auth"
                onClick={() => handleCta("hero_primary")}
                className="tap-target inline-flex w-full items-center justify-center gap-2 rounded-xl bg-cta px-6 py-3 text-base font-semibold text-cta-foreground shadow-sm transition-colors hover:bg-cta-hover sm:w-auto"
              >
                {_t("ctaPrimary")}
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                to="/library"
                onClick={() => handleCta("hero_secondary")}
                className="tap-target inline-flex w-full items-center justify-center gap-2 rounded-xl border border-border bg-background px-6 py-3 text-base font-medium text-foreground hover:bg-card sm:w-auto"
              >
                {_t("ctaLibrary")}
              </Link>
            </div>

            <p className="mt-3 text-xs text-muted-foreground">
              No card needed. The 7-day Pro trial is optional after signup.
            </p>

            <TrustBadges variant="trial" className="mt-4 justify-center sm:justify-start" />

            {/* App launch strip — conversion-focused, no official badges yet */}
            <div className="mt-6 rounded-2xl border border-border bg-card p-4 shadow-sm sm:max-w-md">
              <div className="flex items-center gap-3">
                <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary text-primary-foreground">
                  <Smartphone className="h-5 w-5" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-foreground">Get the DoseRoutine app</p>
                  <p className="text-xs text-muted-foreground">
                    iPhone and Android apps are coming soon.
                  </p>
                </div>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    trackEvent("app_launch_strip_click", { source: "hero", platform: "ios" });
                    setInstallModalOpen(true);
                  }}
                  className="tap-target flex items-center justify-center gap-2 rounded-xl border border-border bg-background px-3 py-2.5 text-sm font-medium text-foreground hover:bg-muted"
                >
                  <AppleIcon className="h-4 w-4" />
                  <span className="hidden sm:inline">App Store</span>
                  <span className="sm:hidden">App Store</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    trackEvent("app_launch_strip_click", { source: "hero", platform: "android" });
                    setInstallModalOpen(true);
                  }}
                  className="tap-target flex items-center justify-center gap-2 rounded-xl border border-border bg-background px-3 py-2.5 text-sm font-medium text-foreground hover:bg-muted"
                >
                  <GooglePlayIcon className="h-4 w-4" />
                  <span className="hidden sm:inline">Google Play</span>
                  <span className="sm:hidden">Google Play</span>
                </button>
              </div>
              <button
                type="button"
                onClick={() => {
                  trackEvent("app_launch_strip_pwa_click", { source: "hero" });
                  setInstallModalOpen(true);
                }}
                className="tap-target mt-2 w-full text-center text-xs font-medium text-primary hover:text-[color:var(--primary-hover)]"
              >
                Or add to home screen now →
              </button>
            </div>

            {/* Closed testing recruitment */}
            <Link
              to="/closed-testing"
              onClick={() => trackEvent("closed_testing_cta_click", { source: "hero" })}
              className="tap-target mt-3 block rounded-2xl border border-accent/40 bg-accent/10 p-4 text-left shadow-sm transition-colors hover:bg-accent/15 sm:max-w-md"
            >
              <p className="text-sm font-semibold text-foreground">
                Join our app testing group — get 3 months of Pro on us
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Test the Android app for 14 days and we&apos;ll email you a reward code for 3 months
                of DoseRoutine Pro. No card required.
              </p>
              <span className="mt-2 inline-block text-xs font-medium text-primary">
                Become a tester →
              </span>
            </Link>

            <div className="mt-4 flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-xs text-muted-foreground sm:justify-start">
              <span className="inline-flex items-center gap-1.5">
                <ShieldCheck className="h-3.5 w-3.5 text-primary" />
                {_t("noAds")}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Lock className="h-3.5 w-3.5 text-primary" />
                {_t("privateData")}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Activity className="h-3.5 w-3.5 text-primary" />
                {_t("clinicianNote")}
              </span>
            </div>

            <p className="mt-3 text-xs text-muted-foreground">{_t("freeForever")}</p>
          </div>

          <ProductPreview />
        </div>
      </section>

      {/* Differentiator strip — what actually sets us apart */}
      <section className="mx-auto max-w-5xl px-6 pb-2">
        <div className="rounded-2xl border border-primary/30 bg-primary/5 p-5 sm:p-6">
          <p className="text-xs font-semibold uppercase tracking-wider text-primary">
            Built for the full protocol
          </p>
          <h2 className="mt-2 font-display text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
            Not just vitamins — supplements, peptides, hormones and your whole routine.
          </h2>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground sm:text-base">
            Most supplement apps stop at fish oil. DoseRoutine covers TRT/HRT, GLP-1s, NAD+,
            rapamycin and peptides — and cross-checks them against everything else in your routine,
            with safe-guard rules that never suggest an amount to take.
          </p>
          <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
            {[
              { label: "Supplements", sub: "200+" },
              { label: "Peptides", sub: "80+" },
              { label: "Hormones / HRT / TRT", sub: "40+" },
              { label: "Everything else", sub: "120+" },
            ].map((c) => (
              <div key={c.label} className="rounded-xl border border-border bg-background p-3">
                <div className="text-xs text-muted-foreground">{c.label}</div>
                <div className="mt-0.5 font-display text-lg font-semibold text-foreground">
                  {c.sub}
                </div>
              </div>
            ))}
          </div>
          <div className="mt-4 flex flex-wrap gap-3 text-xs">
            <Link
              to="/interaction-checker"
              onClick={() => handleCta("interaction_checker")}
              className="inline-flex items-center gap-1 rounded-md border border-primary/60 bg-primary/5 px-3 py-1.5 font-medium text-primary hover:bg-primary/10"
            >
              Free interaction checker <ChevronRight className="h-3 w-3" />
            </Link>
            <Link
              to="/reconstitution-calculator"
              onClick={() => handleCta("reconstitution_calculator")}
              className="inline-flex items-center gap-1 rounded-md border border-primary/60 bg-primary/5 px-3 py-1.5 font-medium text-primary hover:bg-primary/10"
            >
              Reconstitution calculator <ChevronRight className="h-3 w-3" />
            </Link>
            <Link
              to="/vs-supplement-planner"
              onClick={() => handleCta("differentiator_compare")}
              className="inline-flex items-center gap-1 rounded-md border border-border bg-background px-3 py-1.5 font-medium text-foreground hover:border-primary/60"
            >
              Compare to supplement-only apps <ChevronRight className="h-3 w-3" />
            </Link>
          </div>
        </div>
      </section>

      {/* Long-tail SEO: common protocols people track */}
      <section className="mx-auto max-w-5xl px-6 pb-2 pt-4">
        <div className="rounded-2xl border border-border bg-card p-5 sm:p-6">
          <h2 className="font-display text-lg font-semibold tracking-tight text-foreground sm:text-xl">
            Common protocols people track
          </h2>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            Quick links to calculators, guides, and comparison pages already on DoseRoutine.
          </p>
          <div className="mt-5 grid gap-6 sm:grid-cols-3">
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-primary">
                Peptides
              </h3>
              <ul className="mt-2 space-y-1.5">
                <li>
                  <Link
                    to="/library/$slug"
                    params={{ slug: "bpc-157" }}
                    onClick={() =>
                      trackEvent("homepage_protocol_link", { group: "peptides", label: "bpc-157" })
                    }
                    className="text-sm text-foreground underline decoration-border underline-offset-2 hover:text-primary hover:decoration-primary"
                  >
                    BPC-157 dosage and reconstitution
                  </Link>
                </li>
                <li>
                  <Link
                    to="/library/compare/semaglutide-vs-tirzepatide"
                    onClick={() =>
                      trackEvent("homepage_protocol_link", {
                        group: "peptides",
                        label: "semaglutide-vs-tirzepatide",
                      })
                    }
                    className="text-sm text-foreground underline decoration-border underline-offset-2 hover:text-primary hover:decoration-primary"
                  >
                    Semaglutide vs tirzepatide dosing
                  </Link>
                </li>
                <li>
                  <Link
                    to="/library/cjc-1295-ipamorelin"
                    onClick={() =>
                      trackEvent("homepage_protocol_link", {
                        group: "peptides",
                        label: "cjc-ipamorelin",
                      })
                    }
                    className="text-sm text-foreground underline decoration-border underline-offset-2 hover:text-primary hover:decoration-primary"
                  >
                    CJC-1295 / Ipamorelin stacking
                  </Link>
                </li>
                <li>
                  <Link
                    to="/reconstitution-calculator"
                    onClick={() =>
                      trackEvent("homepage_protocol_link", {
                        group: "peptides",
                        label: "reconstitution-calculator",
                      })
                    }
                    className="text-sm text-foreground underline decoration-border underline-offset-2 hover:text-primary hover:decoration-primary"
                  >
                    Peptide reconstitution calculator
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-primary">
                Hormones / TRT
              </h3>
              <ul className="mt-2 space-y-1.5">
                <li>
                  <Link
                    to="/trt-dosage-calculator"
                    onClick={() =>
                      trackEvent("homepage_protocol_link", {
                        group: "hormones",
                        label: "trt-dosage-calculator",
                      })
                    }
                    className="text-sm text-foreground underline decoration-border underline-offset-2 hover:text-primary hover:decoration-primary"
                  >
                    TRT dosage calculator
                  </Link>
                </li>
                <li>
                  <Link
                    to="/library/testosterone-support"
                    onClick={() =>
                      trackEvent("homepage_protocol_link", {
                        group: "hormones",
                        label: "testosterone-support",
                      })
                    }
                    className="text-sm text-foreground underline decoration-border underline-offset-2 hover:text-primary hover:decoration-primary"
                  >
                    Testosterone cycle and PCT tracker
                  </Link>
                </li>
                <li>
                  <Link
                    to="/library/guides/low-testosterone-symptoms"
                    onClick={() =>
                      trackEvent("homepage_protocol_link", {
                        group: "hormones",
                        label: "low-testosterone-symptoms",
                      })
                    }
                    className="text-sm text-foreground underline decoration-border underline-offset-2 hover:text-primary hover:decoration-primary"
                  >
                    Low testosterone symptoms guide
                  </Link>
                </li>
                <li>
                  <Link
                    to="/interaction-checker"
                    onClick={() =>
                      trackEvent("homepage_protocol_link", {
                        group: "hormones",
                        label: "interaction-checker",
                      })
                    }
                    className="text-sm text-foreground underline decoration-border underline-offset-2 hover:text-primary hover:decoration-primary"
                  >
                    HRT interaction checker
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-primary">
                Supplements & recovery
              </h3>
              <ul className="mt-2 space-y-1.5">
                <li>
                  <Link
                    to="/interaction-checker"
                    onClick={() =>
                      trackEvent("homepage_protocol_link", {
                        group: "supplements",
                        label: "magnesium-thyroid",
                      })
                    }
                    className="text-sm text-foreground underline decoration-border underline-offset-2 hover:text-primary hover:decoration-primary"
                  >
                    Magnesium and thyroid interaction check
                  </Link>
                </li>
                <li>
                  <Link
                    to="/library/$slug"
                    params={{ slug: "nad-sublingual" }}
                    onClick={() =>
                      trackEvent("homepage_protocol_link", { group: "supplements", label: "nad" })
                    }
                    className="text-sm text-foreground underline decoration-border underline-offset-2 hover:text-primary hover:decoration-primary"
                  >
                    NAD+ dosing schedule
                  </Link>
                </li>
                <li>
                  <Link
                    to="/library/$slug"
                    params={{ slug: "rapamycin" }}
                    onClick={() =>
                      trackEvent("homepage_protocol_link", {
                        group: "supplements",
                        label: "rapamycin",
                      })
                    }
                    className="text-sm text-foreground underline decoration-border underline-offset-2 hover:text-primary hover:decoration-primary"
                  >
                    Rapamycin tracking app
                  </Link>
                </li>
                <li>
                  <Link
                    to="/interaction-checker"
                    onClick={() =>
                      trackEvent("homepage_protocol_link", {
                        group: "supplements",
                        label: "vitamin-d3",
                      })
                    }
                    className="text-sm text-foreground underline decoration-border underline-offset-2 hover:text-primary hover:decoration-primary"
                  >
                    Vitamin D3 interaction checker
                  </Link>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Trust bar */}
      <section className="mx-auto max-w-5xl px-6 pb-10 pt-6">
        <Card className="grid gap-3 rounded-2xl border-border p-4 sm:grid-cols-3 sm:p-5">
          <div className="flex items-center gap-3 text-sm text-foreground">
            <div className="grid h-8 w-8 place-items-center rounded-lg bg-primary/10 text-primary">
              <Search className="h-4 w-4" />
            </div>
            {_t("trustBarCompounds")}
          </div>
          <div className="flex items-center gap-3 text-sm text-foreground">
            <div className="grid h-8 w-8 place-items-center rounded-lg bg-primary/10 text-primary">
              <ShieldCheck className="h-4 w-4" />
            </div>
            {_t("trustBarSources")}
          </div>
          <div className="flex items-center gap-3 text-sm text-foreground">
            <div className="grid h-8 w-8 place-items-center rounded-lg bg-primary/10 text-primary">
              <Check className="h-4 w-4" />
            </div>
            {_t("trustBarFree")}
          </div>
        </Card>
      </section>

      {/* Social proof / use-case strip */}
      <section className="mx-auto max-w-5xl px-6 pb-10">
        <div className="rounded-2xl border border-primary/20 bg-primary/5 px-5 py-4 sm:px-6">
          <p className="text-center text-sm font-medium text-primary">{_t("socialProofLine")}</p>
        </div>
      </section>

      {/* Insights dashboard showcase */}
      <Suspense fallback={<div className="min-h-[420px]" aria-hidden="true" />}>
        <HomeInsightsShowcase />
      </Suspense>

      {/* Real user proof */}
      <section className="mx-auto max-w-5xl px-6 pb-10">
        <Testimonials />
      </section>

      {/* Real screens from the app */}
      <section className="mx-auto max-w-5xl px-6 pb-12">
        <AppScreenshots />
      </section>

      {/* Value props */}
      <section className="mx-auto grid max-w-5xl gap-4 px-6 py-14 sm:grid-cols-3">
        <FeatureCard
          icon={<ShieldCheck className="h-5 w-5" />}
          title={_t("featureInteraction")}
          body={_t("featureInteractionBody")}
        />
        <FeatureCard
          icon={<Clock className="h-5 w-5" />}
          title={_t("featureReminders")}
          body={_t("featureRemindersBody")}
        />
        <FeatureCard
          icon={<Layers className="h-5 w-5" />}
          title={_t("featureDose")}
          body={_t("featureDoseBody")}
        />
      </section>

      {/* Pro features showcase */}
      <section className="mx-auto max-w-5xl px-6 py-10">
        <div className="text-center">
          <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
            Everything included with Pro
          </div>
          <h2 className="mt-3 font-display text-2xl font-semibold tracking-tight sm:text-3xl">
            Built for peptides, hormones and full routines — not just vitamins.
          </h2>
          <p className="mx-auto mt-2 max-w-2xl text-sm text-muted-foreground">
            One app replaces a shelf of spreadsheets, calculators and calendar reminders.
          </p>
        </div>
        <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {[
            ["Interaction checker", "Cross-checks 475+ compounds before you dose."],
            ["Reconstitution calculator", "BAC water, syringe units, saved per vial."],
            ["Vial inventory & refills", "Predicts when you'll run out — before you do."],
            ["Injection site rotation", "Auto-picks your next site with a visual map."],
            ["Cycle & PCT tracker", "Weeks on/off, taper and PCT reminders."],
            ["Blood work tracker", "Log labs, spot trends, export for your doctor."],
            ["Body metrics & photos", "Weight, waist, BF% and progress photos over time."],
            ["Workout & cardio log", "Strength sets, runs and rides on one calendar."],
            ["Workout templates", "Reuse sessions with saved sets, reps, weight and pacing."],
            ["Session context", "RPE, sleep, stress and tags on every session."],
            ["Workout reminders", "Planned-session and missed-session nudges in your timezone."],
            [
              "Notification center",
              "Every reminder in one feed — read, dismiss, jump straight in.",
            ],
            ["Safety severity filters", "Filter interactions by severity and read the source."],
            ["Shareable summaries", "One-tap PDF: stack, doses, adherence, labs."],
            ["Cost tracker", "Real monthly spend per compound and per goal."],
            ["Side-effect journal", "Tag symptoms to the compound that caused them."],
            ["Protocol sharing", "Share your stack with a private link."],
            ["Barcode scanner", "Scan a bottle to add it in seconds."],
            ["Phone alarms (.ics)", "Real alarms on iOS/Android, not just push."],
            ["AI plan & coach", "Personalized timing, stacking and safety notes."],
            ["Help Center", "Clear, plain-language guides for every feature."],
          ].map(([title, body]) => (
            <Card key={title} className="rounded-2xl border-border p-4">
              <div className="flex items-start gap-2">
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                <div>
                  <div className="text-sm font-semibold text-foreground">{title}</div>
                  <div className="mt-0.5 text-xs text-muted-foreground">{body}</div>
                </div>
              </div>
            </Card>
          ))}
        </div>
        <div className="mt-6 text-center">
          <Link
            to="/help"
            className="text-xs font-medium text-primary underline underline-offset-2"
          >
            See how each feature works →
          </Link>
        </div>
      </section>

      {/* Fitness & Body */}
      <section className="mx-auto max-w-5xl px-6 py-10">
        <div className="grid gap-8 sm:grid-cols-2 sm:items-center">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
              Fitness &amp; Body
            </div>
            <h2 className="mt-3 font-display text-2xl font-semibold tracking-tight sm:text-3xl">
              Your training and your body data, on the same timeline as your stack
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              A protocol only means something next to how you actually trained and what changed.
              DoseRoutine tracks both, so you can see the two together instead of in separate apps.
            </p>
            <ul className="mt-5 grid gap-3 text-sm">
              {[
                {
                  icon: <Activity className="h-4 w-4" />,
                  title: "A real workout calendar",
                  body: "Streaks, weekly volume and personal records, month by month.",
                },
                {
                  icon: <Layers className="h-4 w-4" />,
                  title: "30+ activity types",
                  body: "Strength, running, cycling, swimming, rowing, yoga, climbing, team sport.",
                },
                {
                  icon: <Clock className="h-4 w-4" />,
                  title: "Reusable templates",
                  body: "Save a session with sets, reps, weight, rest and pace — reload it in one tap.",
                },
                {
                  icon: <Pill className="h-4 w-4" />,
                  title: "Body metrics",
                  body: "Weight, waist, body fat and progress photos, one tap from Today.",
                },
              ].map((item) => (
                <li key={item.title} className="flex items-start gap-3">
                  <span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
                    {item.icon}
                  </span>
                  <span>
                    <span className="font-semibold text-foreground">{item.title}</span>
                    <span className="mt-0.5 block text-xs leading-relaxed text-muted-foreground">
                      {item.body}
                    </span>
                  </span>
                </li>
              ))}
            </ul>
            <div className="mt-6 flex flex-col items-start gap-3 sm:flex-row sm:items-center">
              <Link
                to="/auth"
                onClick={() => handleCta("fitness_section_primary")}
                className="tap-target inline-flex w-full items-center justify-center gap-2 rounded-xl bg-cta px-5 py-3 text-sm font-semibold text-cta-foreground shadow-sm transition-colors hover:bg-cta-hover sm:w-auto"
              >
                Start tracking free
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                to="/library"
                onClick={() => handleCta("fitness_section_secondary")}
                className="text-sm font-medium text-primary hover:underline"
              >
                Browse the free library →
              </Link>
            </div>
            <TrustBadges variant="trial" className="mt-4" />
          </div>
          <HomeFitnessPreview />
        </div>
      </section>

      {/* Newest: training, biometrics and safety depth */}
      <section className="mx-auto max-w-5xl px-6 py-10">
        <div className="rounded-3xl border border-border bg-card p-6 sm:p-8">
          <div className="inline-flex items-center gap-2 rounded-full bg-[color:var(--streak)]/10 px-3 py-1 text-xs font-semibold text-[color:var(--streak)]">
            New this week
          </div>
          <h2 className="mt-3 font-display text-2xl font-semibold tracking-tight sm:text-3xl">
            What shipped this week
          </h2>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            Small things that make daily tracking stick — and safety answers you can check.
          </p>
          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            {[
              {
                icon: <ShieldCheck className="h-5 w-5" />,
                title: "Session context: RPE, sleep, stress and tags",
                body: 'Rate sleep and stress, tag a session "deload" or "PR", and see the averages roll up on your calendar and weekly summary.',
              },
              {
                icon: <Bell className="h-5 w-5" />,
                title: "Workout reminders and a notification center",
                body: "Planned-session and missed-session nudges by push and email in your timezone, all collected in one in-app feed.",
              },
              {
                icon: <Search className="h-5 w-5" />,
                title: "Deeper safety checks",
                body: "Filter interactions by severity, expand any note for the full explanation, and follow the citation to the source study.",
              },
            ].map((item) => (
              <Card key={item.title} className="rounded-2xl border-border p-4">
                <div className="flex items-start gap-3">
                  <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
                    {item.icon}
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-foreground">{item.title}</div>
                    <div className="mt-1 text-xs leading-relaxed text-muted-foreground">
                      {item.body}
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="mx-auto max-w-5xl px-6 py-14">
        <h2 className="text-center font-display text-2xl font-semibold tracking-tight sm:text-3xl">
          {_t("howItWorksTitle")}
        </h2>
        <div className="mt-8 grid gap-6 sm:grid-cols-3">
          <StepCard
            step="1"
            icon={<Pill className="h-5 w-5" />}
            title={_t("howItWorksStep1Title")}
            body={_t("howItWorksStep1Body")}
          />
          <StepCard
            step="2"
            icon={<Activity className="h-5 w-5" />}
            title={_t("howItWorksStep2Title")}
            body={_t("howItWorksStep2Body")}
          />
          <StepCard
            step="3"
            icon={<Bell className="h-5 w-5" />}
            title={_t("howItWorksStep3Title")}
            body={_t("howItWorksStep3Body")}
          />
        </div>
      </section>

      {/* Transparency / trust block */}
      <section className="mx-auto max-w-3xl px-6 pb-14">
        <Card className="rounded-2xl border-border p-6 text-sm leading-relaxed text-muted-foreground">
          <h2 className="mb-3 font-display text-lg font-semibold text-foreground">
            {_t("trustTitle")}
          </h2>
          <p>{_t("trustBody")}</p>
          <p className="mt-3">{_t("medicalDisclaimer")}</p>
        </Card>
      </section>

      {/* Trust & safety: disclaimer + privacy/data questions */}
      <section className="mx-auto max-w-3xl px-6 pb-14">
        <TrustSafety variant="full" />
      </section>

      {/* Long-tail SEO: visible FAQ */}
      <section className="mx-auto max-w-3xl px-6 pb-14">
        <h2 className="text-center font-display text-2xl font-semibold tracking-tight sm:text-3xl">
          Questions people ask about DoseRoutine
        </h2>
        <p className="mx-auto mt-3 max-w-xl text-center text-sm text-muted-foreground">
          Plain-English answers about tracking peptides, TRT, and supplements in one place.
        </p>
        <div className="mt-8 space-y-4">
          {[
            { q: _t("faqQ1"), a: _t("faqA1") },
            { q: _t("faqQ2"), a: _t("faqA2") },
            { q: _t("faqQ3"), a: _t("faqA3") },
            { q: _t("faqQ4"), a: _t("faqA4") },
            { q: _t("faqQ5"), a: _t("faqA5") },
            { q: _t("faqQ6"), a: _t("faqA6") },
            { q: _t("faqQ7"), a: _t("faqA7") },
          ].map((faq, i) => (
            <details
              key={i}
              className="group rounded-2xl border border-border bg-card px-4 py-3 open:ring-1 open:ring-primary/20"
            >
              <summary className="flex cursor-pointer list-none items-center justify-between text-sm font-semibold text-foreground">
                {faq.q}
                <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180" />
              </summary>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{faq.a}</p>
            </details>
          ))}
        </div>
      </section>

      {/* Final CTA */}
      <section className="mx-auto max-w-3xl px-6 pb-24 text-center">
        <h2 className="font-display text-2xl font-semibold tracking-tight sm:text-3xl">
          {_t("finalCtaTitle")}
        </h2>
        <p className="mx-auto mt-3 max-w-xl text-sm text-muted-foreground">{_t("finalCtaBody")}</p>
        <div
          ref={primaryCtaRef}
          data-testid="primary-cta"
          className="mt-6 flex flex-col items-center justify-center gap-3 sm:flex-row"
        >
          <Link

            to="/auth"
            onClick={() => handleCta("final")}
            className="tap-target inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-8 text-base font-semibold text-primary-foreground shadow-sm transition-colors hover:bg-[color:var(--primary-hover)] sm:w-auto"
          >
            {_t("ctaStartFree")}
            <ArrowRight className="h-4 w-4" />
          </Link>
          <Link
            to="/library"
            onClick={() => handleCta("final_secondary")}
            className="tap-target inline-flex w-full items-center justify-center gap-2 rounded-xl border border-border bg-background px-8 text-base font-medium text-foreground hover:bg-card sm:w-auto"
          >
            {_t("finalCtaSecondary")}
          </Link>
        </div>
        <TrustBadges variant="trial" align="center" className="mt-4" />
        <p className="mt-3 text-xs text-muted-foreground">{_t("takesTwoMinutes")}</p>
      </section>

      <div className="flex justify-center pb-6">
        <Suspense fallback={null}>
          <ShareDoseRoutine path="/" campaign="landing_share" />
        </Suspense>
      </div>

      <footer className="border-t border-border py-6 text-center text-xs text-muted-foreground">
        <div className="mb-2 flex justify-center sm:hidden">
          <LanguageSwitcher variant="select" />
        </div>
        <div className="mx-auto mb-4 max-w-4xl px-4">
          <div className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-foreground/70">
            Tools & calculators
          </div>
          <div className="mb-3 flex flex-wrap justify-center gap-x-5 gap-y-1">
            <Link to="/calculators" className="inline-block py-1.5 underline hover:text-foreground">
              All calculators
            </Link>
            <Link to="/calculator" className="inline-block py-1.5 underline hover:text-foreground">
              Calculator hub
            </Link>
            <Link
              to="/trt-dosage-calculator"
              className="inline-block py-1.5 underline hover:text-foreground"
            >
              TRT dosage calculator
            </Link>
            <Link
              to="/peptide-dosage-calculator"
              className="inline-block py-1.5 underline hover:text-foreground"
            >
              Peptide dosage calculator
            </Link>
            <Link
              to="/peptide-reconstitution-calculator"
              className="inline-block py-1.5 underline hover:text-foreground"
            >
              Peptide reconstitution
            </Link>
            <Link
              to="/dosage-units-guide"
              className="inline-block py-1.5 underline hover:text-foreground"
            >
              Dosage units guide
            </Link>
            <Link
              to="/library/peptide-stacks-for-muscle-growth"
              className="inline-block py-1.5 underline hover:text-foreground"
            >
              Peptide stacks for muscle growth
            </Link>
            <Link
              to="/library/mens-health"
              className="inline-block py-1.5 underline hover:text-foreground"
            >
              Men's Health hub
            </Link>
            <Link
              to="/library/prostate-health"
              className="inline-block py-1.5 underline hover:text-foreground"
            >
              Prostate health
            </Link>
            <Link
              to="/library/testosterone-support"
              className="inline-block py-1.5 underline hover:text-foreground"
            >
              Testosterone support
            </Link>
            <Link to="/blog" className="inline-block py-1.5 underline hover:text-foreground">
              Research &amp; Updates
            </Link>
            <Link to="/faq" className="inline-block py-1.5 underline hover:text-foreground">
              FAQ
            </Link>
            <Link to="/help" className="inline-block py-1.5 underline hover:text-foreground">
              Help Center
            </Link>
          </div>
          <div className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-foreground/70">
            Compare DoseRoutine
          </div>
          <div className="mb-3 flex flex-wrap justify-center gap-x-5 gap-y-1">
            <Link to="/vs" className="inline-block py-1.5 underline hover:text-foreground">
              All comparisons
            </Link>
            <Link to="/compare" className="inline-block py-1.5 underline hover:text-foreground">
              Compare compounds
            </Link>
            <Link to="/vs/medisafe" className="inline-block py-1.5 underline hover:text-foreground">
              vs. Medisafe
            </Link>
            <Link
              to="/vs/mytherapy"
              className="inline-block py-1.5 underline hover:text-foreground"
            >
              vs. MyTherapy
            </Link>
            <Link
              to="/vs/round-health"
              className="inline-block py-1.5 underline hover:text-foreground"
            >
              vs. Round Health
            </Link>
            <Link
              to="/vs/pill-reminder"
              className="inline-block py-1.5 underline hover:text-foreground"
            >
              vs. Pill Reminder
            </Link>
            <Link
              to="/vs/cronometer"
              className="inline-block py-1.5 underline hover:text-foreground"
            >
              vs. Cronometer
            </Link>
            <Link
              to="/alternatives"
              className="inline-block py-1.5 underline hover:text-foreground"
            >
              Best tracking apps
            </Link>
            <Link
              to="/best-supplement-tracker-app"
              className="inline-block py-1.5 underline hover:text-foreground"
            >
              Best supplement tracker app
            </Link>
            <Link
              to="/best-trt-tracking-app"
              className="inline-block py-1.5 underline hover:text-foreground"
            >
              Best TRT tracking app
            </Link>
            <Link
              to="/best-peptide-tracking-app"
              className="inline-block py-1.5 underline hover:text-foreground"
            >
              Best peptide tracking app
            </Link>
            <Link to="/for" className="inline-block py-1.5 underline hover:text-foreground">
              Who it's for
            </Link>
          </div>
        </div>
        <div className="mb-2 flex flex-wrap justify-center gap-x-5 gap-y-1">
          <Link to="/about" className="inline-block py-1.5 underline hover:text-foreground">
            About
          </Link>
          <Link to="/dose-routine" className="inline-block py-1.5 underline hover:text-foreground">
            What is a dose routine?
          </Link>

          <Link to="/sources" className="inline-block py-1.5 underline hover:text-foreground">
            Sources &amp; methodology
          </Link>
          <Link
            to="/editorial-policy"
            className="inline-block py-1.5 underline hover:text-foreground"
          >
            Editorial policy
          </Link>

          <Link to="/install" className="inline-block py-1.5 underline hover:text-foreground">
            Install app
          </Link>
          <Link to="/status" className="inline-block py-1.5 underline hover:text-foreground">
            Status
          </Link>
          <Link to="/privacy" className="inline-block py-1.5 underline hover:text-foreground">
            Privacy
          </Link>
          <Link to="/legal" className="inline-block py-1.5 underline hover:text-foreground">
            Terms
          </Link>
          <Link
            to="/medical-disclaimer"
            className="inline-block py-1.5 underline hover:text-foreground"
          >
            Medical disclaimer
          </Link>
          <Link to="/refund-policy" className="inline-block py-1.5 underline hover:text-foreground">
            Refunds
          </Link>
          <Link to="/ai-policy" className="inline-block py-1.5 underline hover:text-foreground">
            AI policy
          </Link>
          <Link to="/cookies" className="inline-block py-1.5 underline hover:text-foreground">
            Cookies
          </Link>
          <Link to="/data-deletion" className="inline-block py-1.5 underline hover:text-foreground">
            Delete account
          </Link>
        </div>
        {_t("footerDisclaimer")}
      </footer>

      {/* Sticky mobile install banner — sits above the CTA bar */}
      {showInstallSticky ? (
        <div
          data-testid="install-sticky"
          className="fixed inset-x-0 bottom-[5.5rem] z-40 mx-3 rounded-2xl border border-border bg-card px-4 py-3 shadow-lg sm:hidden"
          style={{ bottom: "calc(5.5rem + env(safe-area-inset-bottom))" }}
        >
          <button
            type="button"
            onClick={() => {
              trackEvent("install_sticky_click", { source: "mobile_sticky" });
              setInstallModalOpen(true);
            }}
            className="tap-target flex w-full items-center gap-3 text-left"
          >
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary text-primary-foreground">
              <Smartphone className="h-5 w-5" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-foreground">Get DoseRoutine on your phone</p>
              <p className="text-xs text-muted-foreground">
                Add to home screen now · App Store & Google Play coming soon
              </p>
            </div>
            <ArrowRight className="h-4 w-4 text-muted-foreground" />
          </button>
          <button
            type="button"
            onClick={() => {
              sessionStorage.setItem("doseroutine_install_sticky_dismissed", "1");
              setShowInstallSticky(false);
              trackEvent("install_sticky_dismiss", { source: "mobile_sticky" });
            }}
            className="tap-target absolute right-2 top-2 rounded-full p-1 text-muted-foreground hover:bg-muted"
            aria-label="Dismiss install banner"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      ) : null}

      {/* Sticky mobile CTA bar — never stacked with the install banner */}
      {showSticky && !showInstallSticky && !primaryCtaVisible && !cookieNoticeOpen ? (
        <div
          data-testid="signup-sticky"
          className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/95 px-4 py-3 backdrop-blur sm:hidden"
          style={{ paddingBottom: "calc(0.75rem + env(safe-area-inset-bottom))" }}
        >
          <Link
            to="/auth"
            onClick={() => handleCta("sticky")}
            className="tap-target flex w-full items-center justify-center rounded-xl bg-cta px-6 text-base font-semibold text-cta-foreground shadow-sm hover:bg-cta-hover"
          >
            {_t("stickyCta")}
          </Link>
          <Link
            to="/library"
            onClick={() => handleCta("sticky_secondary")}
            className="mt-2 block text-center text-xs text-muted-foreground hover:text-foreground"
          >
            {_t("stickyCtaAlt")}
          </Link>
          <TrustBadges variant="trial" align="center" compact className="mt-1.5" />
        </div>
      ) : null}

      {showExit ? (
        <ExitIntentModal
          onClose={() => setShowExit(false)}
          onBrowse={() => handleCta("exit_browse")}
        />
      ) : null}

      {installModalOpen ? (
        <Suspense fallback={null}>
          <AppInstallModal
            onClose={() => setInstallModalOpen(false)}
            source={showInstallSticky ? "mobile_sticky" : "hero_strip"}
          />
        </Suspense>
      ) : null}

      <p className="mx-auto mt-10 max-w-prose px-4 pb-6 text-center text-[11px] text-muted-foreground">
        © {new Date().getFullYear()} <strong>DoseRoutine</strong> — original content published at{" "}
        <a href="https://doseroutine.com" className="underline" rel="canonical">
          doseroutine.com
        </a>
        .
      </p>
    </main>
  );
}

function ProductPreview() {
  const [selected, setSelected] = useState(1);
  const _t = useT();

  const rows = [
    { name: "Vitamin D3", dose: "5000 IU", status: "taken" as const, note: null },
    {
      name: "Magnesium glycinate",
      dose: "400 mg",
      status: "due" as const,
      note: "Magnesium may reduce absorption of thyroid items — separate by 4 hours.",
    },
    { name: "Omega-3 EPA/DHA", dose: "1 g", status: "due" as const, note: null },
  ];

  const activeNote = rows[selected].note;

  return (
    <div className="relative mx-auto w-full max-w-sm">
      <Card className="rounded-3xl border-border p-4 shadow-lg">
        <div className="flex items-center justify-between px-1 pb-3">
          <div>
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Today · 8:00 AM</p>
            <p className="font-display text-lg font-semibold">Morning stack</p>
          </div>
          <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-1 text-xs font-medium text-primary">
            <Activity className="h-3 w-3" /> {_t("previewBadge")}
          </span>
        </div>
        <div className="space-y-2">
          {rows.map((row, i) => (
            <button
              key={row.name}
              onClick={() => {
                setSelected(i);
                trackEvent("landing_preview_interact", { compound: row.name });
              }}
              className={`w-full text-left transition-colors ${
                selected === i ? "rounded-xl bg-primary/5 ring-1 ring-primary/20" : ""
              }`}
            >
              <PreviewRow {...row} />
            </button>
          ))}
        </div>
        <div className="mt-3 min-h-[4.5rem] rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-xs">
          <p className="font-medium text-warning">⚠ Interaction check</p>
          <p className="mt-1 text-muted-foreground">
            {activeNote ?? "Tap a compound above to see its interaction note."}
          </p>
        </div>
      </Card>
    </div>
  );
}

function PreviewRow({
  name,
  dose,
  status,
}: {
  name: string;
  dose: string;
  status: "taken" | "due";
}) {
  return (
    <div className="flex items-center justify-between rounded-xl bg-background/60 px-3 py-2.5">
      <div>
        <p className="text-sm font-medium">{name}</p>
        <p className="text-xs text-muted-foreground">{dose}</p>
      </div>
      {status === "taken" ? (
        <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-1 text-xs font-medium text-primary">
          <Check className="h-3 w-3" /> Taken
        </span>
      ) : (
        <span className="inline-flex items-center rounded-full border border-border px-2 py-1 text-xs font-medium text-foreground">
          Take now
        </span>
      )}
    </div>
  );
}

function FeatureCard({
  icon,
  title,
  body,
}: {
  icon: React.ReactNode;
  title: string;
  body: string;
}) {
  return (
    <div className="rounded-2xl bg-card p-6">
      <div className="grid h-9 w-9 place-items-center rounded-lg bg-primary/10 text-primary">
        {icon}
      </div>
      <h3 className="mt-4 font-display text-lg font-semibold">{title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{body}</p>
    </div>
  );
}

function StepCard({
  step,
  icon,
  title,
  body,
}: {
  step: string;
  icon: React.ReactNode;
  title: string;
  body: string;
}) {
  return (
    <Card className="relative rounded-2xl border-border p-6 text-center">
      <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-primary px-2.5 py-0.5 text-xs font-semibold text-primary-foreground">
        {step}
      </span>
      <div className="mx-auto grid h-10 w-10 place-items-center rounded-lg bg-primary/10 text-primary">
        {icon}
      </div>
      <h3 className="mt-4 font-display text-lg font-semibold">{title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{body}</p>
    </Card>
  );
}

function ExitIntentModal({ onClose, onBrowse }: { onClose: () => void; onBrowse: () => void }) {
  const _t = useT();
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-2xl border border-border bg-background p-6 shadow-xl">
        <div className="flex items-start justify-between">
          <h3 className="font-display text-xl font-semibold">{_t("exitIntentTitle")}</h3>
          <button
            onClick={onClose}
            className="tap-target rounded-lg p-1 text-muted-foreground hover:bg-card hover:text-foreground"
            aria-label={_t("exitIntentDismiss")}
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <p className="mt-2 text-sm text-muted-foreground">{_t("exitIntentBody")}</p>
        <div className="mt-6 flex flex-col gap-3">
          <Link
            to="/library"
            onClick={() => {
              onBrowse();
              onClose();
            }}
            className="tap-target inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-6 py-2.5 text-base font-semibold text-primary-foreground shadow-sm transition-colors hover:bg-[color:var(--primary-hover)]"
          >
            {_t("exitIntentCta")}
            <ArrowRight className="h-4 w-4" />
          </Link>
          <button
            onClick={onClose}
            className="tap-target w-full rounded-xl border border-border bg-background py-2.5 text-sm font-medium text-foreground hover:bg-card"
          >
            {_t("exitIntentDismiss")}
          </button>
        </div>
      </div>
    </div>
  );
}
