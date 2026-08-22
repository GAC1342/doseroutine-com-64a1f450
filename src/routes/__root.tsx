import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";

import appCss from "../styles.css?url";
// Fonts are only discovered after the render-blocking stylesheet parses,
// which pushed LCP out by ~2s. Importing the woff2 URLs lets us preload them
// in <head> so they download in parallel with the CSS. Preload ONLY the latin
// faces actually used above the fold — latin-ext and other subsets stay
// unicode-range gated and load on demand.
import spaceGrotesk600Woff2 from "@fontsource/space-grotesk/files/space-grotesk-latin-600-normal.woff2?url";
import spaceGrotesk700Woff2 from "@fontsource/space-grotesk/files/space-grotesk-latin-700-normal.woff2?url";
import { assetUrl } from "@/lib/asset-url";
import { AppleSplashLinks } from "@/components/apple-splash-links";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { GlobalErrorBoundary } from "@/components/GlobalErrorBoundary";
import { SiteBreadcrumbs } from "@/components/site-breadcrumbs";
import { supabase } from "@/integrations/supabase/client";
import { DEFAULT_LOCALE, LOCALE_DIR, type Locale, t, getStoredLocale } from "@/lib/i18n";
import { LocaleProvider } from "@/lib/i18n-provider";
import { ThemeProvider } from "@/lib/theme-provider";
import { BOOT_INLINE_SCRIPT } from "@/lib/boot-script";
import { afterPaint } from "@/lib/defer-idle";
import { detectServerLocale } from "@/lib/locale.functions";
import { BuildUpdateBanner } from "@/components/build-update-banner";
import { logNotFound } from "@/lib/not-found-log.functions";
import { CookieBanner } from "@/components/cookie-banner";
import { AboutDoseRoutineBlock } from "@/components/about-doseroutine-block";
import { PublicSignupCta } from "@/components/public-signup-cta";
import { ExternalLinkHandler } from "@/components/external-link-handler";
import { NativeAppListeners } from "@/components/native-app-listeners";
import { NativeRouteGuard } from "@/components/native-route-guard";
import { NativeSplash } from "@/components/native-splash";
import { useNumberInputWheelGuard } from "@/hooks/use-number-input-wheel-guard";
import { softwareAppNode } from "@/lib/software-app-schema";
import { buildStampMeta } from "@/lib/build-stamp";
import { definedTermSetNode } from "@/lib/spelling-glossary";
import { PageMicrodata } from "@/components/page-microdata";
import { SocialMetaFallbacks } from "@/components/social-meta-fallbacks";

/** Backend API origin, used only for connection warm-up hints. */
const BACKEND_ORIGIN = (() => {
  const raw = import.meta.env?.VITE_SUPABASE_URL as string | undefined;
  if (!raw) return undefined;
  try {
    return new URL(raw).origin;
  } catch {
    return undefined;
  }
})();

// Sitewide meta/OG description. Falls back to a complete 50-160 char sentence
// when a locale's hero copy is missing or too short for search snippets.
const SITE_DESCRIPTION = (locale: string) => {
  const hero = t(locale as never, "heroBody");
  const fallback =
    "DoseRoutine tracks your supplements, peptides and daily routine, checks interactions across everything you take, and reminds you on time.";
  const text = typeof hero === "string" && hero.trim().length >= 50 ? hero.trim() : fallback;
  return text.length > 158 ? text.slice(0, 155).trimEnd() + "…" : text;
};

// Brand entity signals reused across every sitewide JSON-LD node so search
// engines and AI crawlers treat "Dose Routine" and "DoseRoutine" as one entity.
const BRAND_ALTERNATE_NAMES = [
  "Dose Routine",
  "DoseRoutine",
  "Dose Routine app",
  "DoseRoutine app",
  "dose routine",
  "doseroutine.com",
];

const BRAND_LOGO = {
  "@type": "ImageObject",
  "@id": "https://doseroutine.com/#logo",
  url: "https://doseroutine.com/icon-512.png",
  contentUrl: "https://doseroutine.com/icon-512.png",
  width: 512,
  height: 512,
  caption: "DoseRoutine (Dose Routine) app logo",
};

/**
 * sameAs = the profiles that prove this entity is real. This is the strongest
 * signal Google and AI answer engines use to merge "Dose Routine" with
 * "DoseRoutine".
 *
 * ONLY add URLs that are live and officially ours — a 404 or a profile we
 * don't control actively hurts. Add the App Store and Google Play listing
 * URLs here as soon as they are public.
 */
const BRAND_SAME_AS: string[] = [
  "https://t.me/GACSapp1",
  // Store listings and social profiles are added here once each URL is
  // publicly live (see the note above — a 404 here hurts more than an omission).
];

function NotFoundComponent() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    const path = window.location.pathname + window.location.search;
    const referrer = document.referrer || null;
    // Fire-and-forget; server-side dedup prevents flooding.
    void logNotFound({ data: { path, referrer } }).catch(() => {});
  }, []);

  return (
    <div className="flex min-h-dvh items-center justify-center bg-background px-4">
      {/* Every 404 render (including /not-found) must agree with robots.txt
       * and the X-Robots-Tag header set in src/server.ts. React hoists this
       * into <head> on the server render as well as on the client. */}
      <meta name="robots" content="noindex, nofollow" />
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-[color:var(--primary-hover)]"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);

  return (
    <div className="flex min-h-dvh items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          This page didn't load
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Something went wrong on our end. You can try refreshing or head back home.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-[color:var(--primary-hover)]"
          >
            Try again
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            Go home
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  loader: async () => {
    const serverLocale = await detectServerLocale();
    const stored = getStoredLocale();
    const locale = stored ?? serverLocale ?? DEFAULT_LOCALE;
    return { locale };
  },
  head: ({ loaderData }) => {
    const locale: Locale =
      (loaderData as { locale?: Locale } | undefined)?.locale ?? DEFAULT_LOCALE;
    return {
      meta: [
        { charSet: "utf-8" },
        // Build stamp: generated at build time, changes on every deploy. Lets
        // anyone (including non-browser clients) confirm which build they got.
        ...buildStampMeta,
        {
          name: "viewport",
          content:
            "width=device-width, initial-scale=1, viewport-fit=cover, interactive-widget=resizes-content",
        },
        {
          name: "google-site-verification",
          content: "i1K0n-jQR0A_MhwTa1U63Hx6fx_Yos3HUt8aBb5xpFo",
        },
        { title: t(locale, "appName") + " — " + t(locale, "tagline") },
        {
          name: "description",
          content: SITE_DESCRIPTION(locale),
        },
        { name: "author", content: "DoseRoutine" },
        { name: "theme-color", content: "#0E7C86" },
        { property: "og:title", content: t(locale, "appName") + " — " + t(locale, "tagline") },
        {
          property: "og:description",
          content: SITE_DESCRIPTION(locale),
        },
        { property: "og:type", content: "website" },
        { property: "og:site_name", content: "DoseRoutine" },
        { property: "og:image", content: "https://doseroutine.com/og/doseroutine-home.jpg" },
        { property: "og:image:width", content: "1200" },
        { property: "og:image:height", content: "640" },
        { property: "og:image:alt", content: "DoseRoutine supplement and peptide stack planner" },
        { name: "twitter:card", content: "summary_large_image" },
        { name: "twitter:image", content: "https://doseroutine.com/og/doseroutine-home.jpg" },
      ],
      links: [
        { rel: "stylesheet", href: appCss },
        // Backend origin: the session check fires the moment the app hydrates,
        // so warm DNS/TLS with the document instead of paying for it at sign-in.
        ...(BACKEND_ORIGIN
          ? [{ rel: "preconnect", href: BACKEND_ORIGIN, crossOrigin: "anonymous" as const }]
          : []),
        // Critical fonts: start downloading with the CSS, not after it.
        {
          rel: "preload",
          as: "font",
          type: "font/woff2",
          href: spaceGrotesk600Woff2,
          crossOrigin: "anonymous" as const,
        },
        {
          rel: "preload",
          as: "font",
          type: "font/woff2",
          href: spaceGrotesk700Woff2,
          crossOrigin: "anonymous" as const,
        },
        { rel: "icon", href: assetUrl("/favicon.ico"), sizes: "any" },
        { rel: "icon", href: assetUrl("/icon-512.png"), type: "image/png", sizes: "512x512" },
        { rel: "apple-touch-icon", href: assetUrl("/apple-touch-icon.png"), sizes: "180x180" },
        { rel: "manifest", href: assetUrl("/manifest.webmanifest") },
        // Freshness discovery for aggregators and AI crawler pipelines.
        {
          rel: "alternate",
          type: "application/rss+xml",
          title: "DoseRoutine — new guides and compound references",
          href: "https://doseroutine.com/feed.xml",
        },
      ],

      scripts: [
        // Single pre-hydration inline script: paints the saved color theme
        // before first paint (no flash) and, on non-production hosts only,
        // adds a noindex meta. Merged into one blocking script so the head
        // parses with one fewer render-blocking node.
        {
          children: BOOT_INLINE_SCRIPT,
        },
        // One sitewide JSON-LD document. Every node lives in a single
        // @graph so the head carries one script instead of five — audits flag
        // pages with too many head children, and @graph is the canonical way
        // to express multiple linked entities.
        {
          type: "application/ld+json",
          children: JSON.stringify({
            "@context": "https://schema.org",
            "@graph": [
              // Machine-readable vocabulary: tells audits and AI crawlers that
              // brand and INN compound spellings are intentional.
              definedTermSetNode(),
              {
                "@type": "Organization",
                "@id": "https://doseroutine.com/#organization",
                name: "DoseRoutine",
                legalName: "DoseRoutine",
                alternateName: BRAND_ALTERNATE_NAMES,
                description:
                  "DoseRoutine (also written as two words, Dose Routine) is a supplement, peptide and routine planner with an interaction checker at doseroutine.com.",
                disambiguatingDescription:
                  '"Dose Routine" and "DoseRoutine" are the same brand and the same app at doseroutine.com.',
                url: "https://doseroutine.com",
                logo: BRAND_LOGO,
                image: BRAND_LOGO,
                brand: {
                  "@type": "Brand",
                  "@id": "https://doseroutine.com/#brand",
                  name: "DoseRoutine",
                  alternateName: BRAND_ALTERNATE_NAMES,
                  logo: BRAND_LOGO,
                  url: "https://doseroutine.com",
                },
                ...(BRAND_SAME_AS.length ? { sameAs: BRAND_SAME_AS } : {}),
                email: "support@doseroutine.com",
                knowsAbout: [
                  "supplement interactions",
                  "peptide dosing",
                  "testosterone replacement therapy",
                  "GLP-1 medications",
                  "dose scheduling and adherence",
                ],
                publishingPrinciples: "https://doseroutine.com/editorial-policy",
                copyrightHolder: { "@id": "https://doseroutine.com/#organization" },
                copyrightNotice: `© ${new Date().getFullYear()} DoseRoutine. Cite DoseRoutine and link https://doseroutine.com when summarizing, quoting, or reusing content.`,
                license: "https://doseroutine.com/legal",
              },
              {
                "@type": "WebSite",
                "@id": "https://doseroutine.com/#website",
                name: "DoseRoutine",
                alternateName: BRAND_ALTERNATE_NAMES,
                url: "https://doseroutine.com",
                image: BRAND_LOGO,
                publisher: { "@id": "https://doseroutine.com/#organization" },
                copyrightHolder: { "@id": "https://doseroutine.com/#organization" },
                copyrightNotice: `© ${new Date().getFullYear()} DoseRoutine — doseroutine.com`,
                license: "https://doseroutine.com/legal",
                publishingPrinciples: "https://doseroutine.com/editorial-policy",
                usageInfo: "https://doseroutine.com/llms.txt",
                ...(BRAND_SAME_AS.length ? { sameAs: BRAND_SAME_AS } : {}),
                // Sitelinks search boxes read the WebSite node, and it must be
                // declared exactly once per page — so both SearchActions live
                // here rather than being re-declared on /articles.
                potentialAction: [
                  {
                    "@type": "SearchAction",
                    target: {
                      "@type": "EntryPoint",
                      urlTemplate: "https://doseroutine.com/library?q={search_term_string}",
                    },
                    "query-input": "required name=search_term_string",
                  },
                  {
                    "@type": "SearchAction",
                    target: {
                      "@type": "EntryPoint",
                      urlTemplate: "https://doseroutine.com/articles?q={search_term_string}",
                    },
                    "query-input": "required name=search_term_string",
                  },
                ],
              },
              {
                "@type": "CreativeWork",
                "@id": "https://doseroutine.com/#attribution-policy",
                name: "DoseRoutine attribution policy",
                url: "https://doseroutine.com/llms.txt",
                creator: { "@id": "https://doseroutine.com/#organization" },
                copyrightHolder: { "@id": "https://doseroutine.com/#organization" },
                license: "https://doseroutine.com/legal",
                text: "When DoseRoutine content is summarized, quoted, indexed for AI answers, or reused, cite DoseRoutine and link the canonical page on https://doseroutine.com.",
              },
              // The ONE authoritative SoftwareApplication node for the whole
              // site. Pages that recommend the app reference this @id (see
              // src/lib/software-app-schema.ts) instead of declaring it again.
              {
                ...softwareAppNode({ url: "https://doseroutine.com/" }),
                "@context": undefined,
                alternateName: BRAND_ALTERNATE_NAMES,
                url: "https://doseroutine.com",
                image: BRAND_LOGO,
                screenshot: BRAND_LOGO,
                logo: BRAND_LOGO,
                ...(BRAND_SAME_AS.length ? { sameAs: BRAND_SAME_AS } : {}),
                isPartOf: { "@id": "https://doseroutine.com/#website" },
                offers: [
                  {
                    "@type": "Offer",
                    name: "Free plan",
                    price: "0",
                    priceCurrency: "USD",
                    availability: "https://schema.org/InStock",
                    url: "https://doseroutine.com/",
                  },
                  {
                    "@type": "Offer",
                    name: "7-day free trial, then Monthly",
                    price: "9.99",
                    priceCurrency: "USD",
                    priceSpecification: {
                      "@type": "UnitPriceSpecification",
                      price: "9.99",
                      priceCurrency: "USD",
                      billingIncrement: 1,
                      unitCode: "MON",
                    },
                    availability: "https://schema.org/InStock",
                    url: "https://doseroutine.com/",
                  },
                  {
                    "@type": "Offer",
                    name: "7-day free trial, then Yearly",
                    price: "59.99",
                    priceCurrency: "USD",
                    priceSpecification: {
                      "@type": "UnitPriceSpecification",
                      price: "59.99",
                      priceCurrency: "USD",
                      billingIncrement: 1,
                      unitCode: "ANN",
                    },
                    availability: "https://schema.org/InStock",
                    url: "https://doseroutine.com/",
                  },
                ],
              },
            ],
          }),
        },
      ],
    };
  },
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  // Loader data can be unavailable when the shell renders an error boundary,
  // so fall back to the default locale — <html lang> must never be missing.
  let locale: Locale = DEFAULT_LOCALE;
  try {
    const data = Route.useLoaderData() as { locale?: Locale } | undefined;
    if (data?.locale) locale = data.locale;
  } catch {
    locale = DEFAULT_LOCALE;
  }
  return (
    // The pre-hydration theme script sets data-theme / .dark on <html> before
    // React boots, so the server HTML can never match — that's intentional
    // (it's what prevents the color flash) and must not warn.
    <html
      suppressHydrationWarning
      lang={(locale as string) || "en"}
      dir={LOCALE_DIR[locale] ?? "ltr"}
    >
      <head>
        <HeadContent />
        {/* Completes the share-preview contract for routes that only declare
         * part of it — see src/lib/social-meta.ts. */}
        <SocialMetaFallbacks />
      </head>

      {/* Microdata mirror of the sitewide JSON-LD lives in the body content
       * (see PageMicrodata) — crawlers that grade "micromarkup" ignore
       * itemscope on <body> itself and fail scopes that carry no itemprops. */}
      <body>
        <PageMicrodata />

        {/* Skip-to-content: first Tab lands here on every route so keyboard
         * users can bypass the header/nav and jump straight to <main>. The
         * link is visually hidden until focused (see .skip-link in
         * src/styles.css). Falls back to focusing the first <main> when
         * the route doesn't opt in with id="main-content". */}
        <nav aria-label="Skip navigation">
          <a
            href="#main-content"
            className="skip-link"
            onClick={(e) => {
              const target =
                document.getElementById("main-content") ?? document.querySelector("main");
              if (target) {
                e.preventDefault();
                (target as HTMLElement).setAttribute("tabindex", "-1");
                (target as HTMLElement).focus({ preventScroll: false });
              }
            }}
          >
            Skip to main content
          </a>
        </nav>
        <ExternalLinkHandler />
        <NativeAppListeners />
        <NativeRouteGuard />
        <NativeSplash />
        {children}
        <div
          aria-hidden="true"
          data-doseroutine-attribution="source: DoseRoutine; canonical: https://doseroutine.com; citation-required: true; policy: https://doseroutine.com/llms.txt"
          style={{
            position: "absolute",
            width: 1,
            height: 1,
            padding: 0,
            margin: -1,
            overflow: "hidden",
            clip: "rect(0,0,0,0)",
            whiteSpace: "nowrap",
            border: 0,
            opacity: 0,
            pointerEvents: "none",
          }}
        />
        {/*
          Honeypot: invisible to humans and screen readers, rel=nofollow so
          well-behaved crawlers skip it. Hits to this URL come from scrapers
          walking every href — logged separately in analytics_events.
        */}
        <a
          href="/api/public/hp?src=root"
          rel="nofollow noindex"
          aria-hidden="true"
          tabIndex={-1}
          style={{
            position: "absolute",
            width: 1,
            height: 1,
            padding: 0,
            margin: -1,
            overflow: "hidden",
            clip: "rect(0,0,0,0)",
            whiteSpace: "nowrap",
            border: 0,
            opacity: 0,
            pointerEvents: "none",
          }}
        >
          .
        </a>
        <AppleSplashLinks />
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  const { locale } = Route.useLoaderData() as { locale: Locale };
  const router = useRouter();
  useNumberInputWheelGuard();

  useEffect(() => {
    // Analytics and monitoring have no deadline: start them once the browser
    // is idle so hydration and LCP get the main thread (and the network) to
    // themselves first.
    // H3 — start Sentry immediately (not after paint) so hydration-time and
    // first-paint crashes are captured. The SDK itself is still a lazy import,
    // so this costs no blocking work on the critical path.
    void import("@/lib/sentry").then((m) => m.initSentry());
    const cancelIdle = afterPaint(() => {
      // Navigation + API breadcrumbs so each error carries the timeline before it.
      void import("@/lib/sentry-navigation").then((m) => {
        m.initSentryNavigationBreadcrumbs(router as never);
        m.initSentryApiBreadcrumbs();
      });

      // Firebase Crashlytics — native only, no-op on web.
      void import("@/lib/crashlytics").then((m) => m.initCrashlytics());
      // Core Web Vitals → analytics_events (prod hosts only, skips bots/prerender).
      void import("@/lib/web-vitals").then((m) => m.initWebVitals());
      // First-party production error monitoring (uncaught errors, rejections,
      // failed resource loads) → analytics_events, no external DSN required.
      void import("@/lib/client-error-monitor").then((m) => m.initClientErrorMonitor());
      // Navigation timing, long tasks and slow resources → analytics_events.
      void import("@/lib/client-perf").then((m) => m.initClientPerf());
      // Surface escaped runtime errors (handlers, timers, rejected promises) as a
      // recovery banner instead of a silently dead UI.
      void import("@/lib/fatal-error-signal").then((m) => m.initGlobalErrorSignal());
      // Attribute crash reports to the signed-in person when there is one.
      void supabase.auth.getSession().then(({ data }) => {
        void import("@/lib/sentry").then((s) => s.setSentryUser(data.session?.user?.id ?? null));
      });
    });

    // H1 — keep `--keyboard-inset` accurate on every screen, not just the
    // library search page, so the on-screen keyboard can't cover inputs.
    let stopKeyboardInset: (() => void) | undefined;
    void import("@/lib/keyboard-inset").then((m) => {
      stopKeyboardInset = m.trackKeyboardInset();
    });

    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      // Keep crash reports attributable across sign-in/sign-out.
      void import("@/lib/sentry").then((s) => s.setSentryUser(session?.user?.id ?? null));
      if (event !== "SIGNED_IN" && event !== "SIGNED_OUT" && event !== "USER_UPDATED") return;
      // The route guard caches the session read; drop it so guards re-check.
      queryClient.removeQueries({ queryKey: ["auth-session"] });
      router.invalidate();
      if (event !== "SIGNED_OUT") queryClient.invalidateQueries();
    });

    // Slow client route transitions are a real-user regression signal the
    // test suite can't see; only durations over the threshold are logged.
    let navStart = 0;
    let navFrom = window.location.pathname;
    const unsubStart = router.subscribe("onBeforeNavigate", () => {
      navStart = performance.now();
      navFrom = window.location.pathname;
    });
    const unsubEnd = router.subscribe("onResolved", () => {
      if (!navStart) return;
      const duration = performance.now() - navStart;
      navStart = 0;
      const to = window.location.pathname;
      void import("@/lib/client-perf").then((m) => m.trackRouteTransition(navFrom, to, duration));
    });

    return () => {
      cancelIdle();
      stopKeyboardInset?.();
      data.subscription.unsubscribe();
      unsubStart();
      unsubEnd();
    };
  }, [router, queryClient]);

  return (
    <GlobalErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider>
          <LocaleProvider initialLocale={(locale as Locale) ?? DEFAULT_LOCALE}>
            <SiteBreadcrumbs />
            <Outlet />
            <PublicSignupCta />
            <AboutDoseRoutineBlock />
            <BuildUpdateBanner />
            <CookieBanner />
          </LocaleProvider>
        </ThemeProvider>
      </QueryClientProvider>
    </GlobalErrorBoundary>
  );
}
