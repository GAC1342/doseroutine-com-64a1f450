import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useRef, useState } from "react";
import { PublicBackHeader } from "@/components/public-back-header";
import { PageProse } from "@/components/page-prose";
import { ProseContainer } from "@/components/prose-container";
import { AttributionDebugPanel } from "@/components/attribution-debug-panel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, cardClassName } from "@/components/ui/card";
import { TrustBadges } from "@/components/trust-badges";
import { hreflangLinks, ogLocaleMeta } from "@/lib/hreflang";
import { breadcrumbScript } from "@/lib/breadcrumb-schema";
import { aeoFaqScript } from "@/lib/aeo";
import { AeoFaq } from "@/components/aeo-faq";
import { CLOSED_TESTING_FAQ } from "@/lib/aeo-faqs-index";
import { joinClosedTesting } from "@/lib/closed-testing.functions";
import { trackEvent } from "@/lib/analytics";
import { attributionProperties, captureAttribution } from "@/lib/utm";
import {
  Mail,
  User,
  Smartphone,
  CheckCircle,
  AlertCircle,
  Clock,
  Gift,
  MessageSquare,
  Users,
  ListChecks,
  FileText,
} from "lucide-react";

const pageUrl = "https://doseroutine.com/closed-testing";
const pageTitle = "Join DoseRoutine Closed Testing — Free Early Access";
const pageDescription =
  "Help test DoseRoutine before public launch. Get early access, a free subscription, and direct input on the supplement, peptide & hormone tracker.";
const ogImage = "https://doseroutine.com/__l5e/assets-v1/closed-testing-og.jpg";

export const Route = createFileRoute("/closed-testing")({
  head: () => ({
    meta: [
      { title: pageTitle },
      { name: "description", content: pageDescription },
      { name: "robots", content: "index, follow, max-image-preview:large" },
      { property: "og:title", content: pageTitle },
      { property: "og:description", content: pageDescription },
      { property: "og:type", content: "website" },
      { property: "og:url", content: pageUrl },
      { property: "og:image", content: ogImage },
      { property: "og:image:secure_url", content: ogImage },
      { property: "og:image:type", content: "image/jpeg" },
      { property: "og:image:width", content: "1200" },
      { property: "og:image:height", content: "630" },
      {
        property: "og:image:alt",
        content:
          "Join DoseRoutine closed testing — early access for supplement, peptide and hormone tracking",
      },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: pageTitle },
      { name: "twitter:description", content: pageDescription },
      { name: "twitter:image", content: ogImage },
      {
        name: "twitter:image:alt",
        content:
          "DoseRoutine closed testing card — join the Android tester group for the tracking app",
      },
      ...ogLocaleMeta("en"),
    ],
    links: [{ rel: "canonical", href: pageUrl }, ...hreflangLinks("/closed-testing")],
    scripts: [
      breadcrumbScript("https://doseroutine.com/closed-testing", [
        { name: "Closed Testing", path: "/closed-testing" },
      ]),
      aeoFaqScript(pageUrl, CLOSED_TESTING_FAQ),
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "WebPage",
          "@id": `${pageUrl}#webpage`,
          url: pageUrl,
          name: pageTitle,
          description: pageDescription,
          isPartOf: { "@id": "https://doseroutine.com/#website" },
          publisher: { "@id": "https://doseroutine.com/#organization" },
          dateModified: "2026-07-29",
        }),
      },
    ],
  }),
  component: ClosedTestingPage,
});

function ClosedTestingPage() {
  const submit = useServerFn(joinClosedTesting);
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [platform, setPlatform] = useState<"android_phone" | "android_tablet" | "">("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error" | "duplicate">(
    "idle",
  );
  const [errorMsg, setErrorMsg] = useState("");
  const attributionRef = useRef<ReturnType<typeof attributionProperties> | null>(null);

  // Capture UTM / referral attribution on landing and log the funnel entry.
  useEffect(() => {
    const props = attributionProperties(captureAttribution());
    attributionRef.current = props;
    trackEvent("closed_testing_page_view", props);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;

    setStatus("loading");
    setErrorMsg("");

    const attribution = attributionRef.current ?? attributionProperties();
    trackEvent("closed_testing_signup_start", {
      platform: platform || "unspecified",
      ...attribution,
    });

    try {
      const result = await submit({
        data: {
          email: email.trim(),
          name: name.trim() || null,
          platformPreference: platform || null,
          source: "closed-testing-page",
          attribution,
        },
      });

      if (result.ok) {
        setStatus("success");
        trackEvent("closed_testing_signup_success", {
          platform: platform || "unspecified",
          ...attribution,
        });
      } else if (result.error === "already_signed_up") {
        setStatus("duplicate");
      } else if (result.error === "rate_limited") {
        setStatus("error");
        setErrorMsg("Too many attempts. Please wait a minute and try again.");
      } else {
        setStatus("error");
        setErrorMsg("Something went wrong. Please try again in a moment.");
      }
    } catch {
      setStatus("error");
      setErrorMsg("Something went wrong. Please try again in a moment.");
    }
  };

  return (
    <>
      <PublicBackHeader />
      <main id="main-content" tabIndex={-1} className="mx-auto max-w-3xl px-6 py-10 md:py-14">
        <div className="text-center">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
            <Smartphone className="h-3.5 w-3.5" aria-hidden="true" />
            Google Play Closed Testing
          </span>
          <h1 className="mt-5 font-display text-3xl font-semibold tracking-tight text-foreground md:text-4xl">
            Test DoseRoutine, get 3 months of Pro free
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-base leading-relaxed text-muted-foreground">
            Join our closed testing group. You&apos;ll get the app before anyone else, free access
            while you test, and 3 months of DoseRoutine Pro on us once you&apos;ve tested for 14
            days. We&apos;ll email you as soon as the test is ready to begin — no need to check back
            daily.
          </p>
        </div>

        <div className="mt-10 grid gap-4 sm:grid-cols-3">
          <BenefitCard
            icon={<Gift className="h-5 w-5" aria-hidden="true" />}
            title="3 months Pro, free"
            body="Complete the 14-day test and we email you a reward code worth 3 months of Pro. No card, no store purchase."
          />
          <BenefitCard
            icon={<Clock className="h-5 w-5" aria-hidden="true" />}
            title="14 days, your pace"
            body="Install the app, add a few routines, and use it naturally. That's all it takes to qualify for the reward."
          />
          <BenefitCard
            icon={<MessageSquare className="h-5 w-5" aria-hidden="true" />}
            title="Direct input"
            body="Report bugs, suggest features, and tell us what actually matters for your stack."
          />
        </div>

        <Card className={`${cardClassName} mt-10 p-6 md:p-8`}>
          {status === "success" ? (
            <SuccessState
              email={email}
              onReset={() => {
                setEmail("");
                setName("");
                setPlatform("");
                setStatus("idle");
                setErrorMsg("");
              }}
            />
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-1.5">
                <label
                  htmlFor="ct-email"
                  className="flex items-center gap-1.5 text-sm font-medium text-foreground"
                >
                  <Mail className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                  Email address
                </label>
                <Input
                  id="ct-email"
                  type="email"
                  autoComplete="email"
                  placeholder="you@example.com"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="h-11"
                />
              </div>

              <div className="space-y-1.5">
                <label
                  htmlFor="ct-name"
                  className="flex items-center gap-1.5 text-sm font-medium text-foreground"
                >
                  <User className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                  First name <span className="text-muted-foreground">(optional)</span>
                </label>
                <Input
                  id="ct-name"
                  type="text"
                  autoComplete="given-name"
                  placeholder="Alex"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="h-11"
                />
              </div>

              <div className="space-y-2">
                <span className="flex items-center gap-1.5 text-sm font-medium text-foreground">
                  <Smartphone className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                  Which device will you test on?
                </span>
                <div className="flex flex-wrap gap-2">
                  <PlatformChip
                    label="Android phone"
                    selected={platform === "android_phone"}
                    onClick={() => setPlatform("android_phone")}
                  />
                  <PlatformChip
                    label="Android tablet"
                    selected={platform === "android_tablet"}
                    onClick={() => setPlatform("android_tablet")}
                  />
                </div>
              </div>

              {status === "error" && (
                <div className="flex items-start gap-2 rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                  <span>{errorMsg || "Something went wrong. Please try again."}</span>
                </div>
              )}

              {status === "duplicate" && (
                <div className="flex items-start gap-2 rounded-lg bg-caution/10 p-3 text-sm text-caution">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                  <span>
                    That email is already on the list. We&apos;ll be in touch soon with the next
                    steps.
                  </span>
                </div>
              )}

              <Button
                type="submit"
                disabled={status === "loading" || !email.trim()}
                className="h-12 w-full bg-cta text-base font-semibold text-cta-foreground hover:bg-cta-hover disabled:opacity-60"
              >
                {status === "loading" ? "Saving your spot..." : "Join the closed test"}
              </Button>

              <TrustBadges variant="privacy" align="center" />
            </form>
          )}
        </Card>

        {/* Rendered by <AeoFaq> so each answer carries the same anchor id the
            FAQPage JSON-LD points at. */}
        <AeoFaq pairs={CLOSED_TESTING_FAQ} />

        <section className="mt-12 grid gap-4 md:grid-cols-2">
          <div className="rounded-2xl border border-border bg-card p-6">
            <div className="flex items-center gap-2">
              <ListChecks className="h-5 w-5 text-primary" aria-hidden="true" />
              <h2 className="font-display text-lg font-semibold text-foreground">Who can join</h2>
            </div>
            <ul className="mt-4 space-y-2.5">
              {[
                "18 or older.",
                "An Android phone or tablet with a Google account you can install from the Play Store with.",
                "A Gmail or Google-linked email — Google Play test invites only work with a Google account.",
                "Willing to open the app on most days across the 14-day window.",
                "Happy to send a short note about anything confusing or broken.",
              ].map((item) => (
                <li
                  key={item}
                  className="flex items-start gap-2 text-sm leading-relaxed text-muted-foreground"
                >
                  <CheckCircle
                    className="mt-0.5 h-4 w-4 shrink-0 text-synergy"
                    aria-hidden="true"
                  />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-2xl border border-border bg-card p-6">
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" aria-hidden="true" />
              <h2 className="font-display text-lg font-semibold text-foreground">Offer terms</h2>
            </div>
            <ul className="mt-4 space-y-2.5 text-sm leading-relaxed text-muted-foreground">
              <li>
                <span className="font-medium text-foreground">The reward:</span> a code for 3 months
                of DoseRoutine Pro, emailed after you have used the app on at least 8 separate days
                within the 14-day test window.
              </li>
              <li>
                <span className="font-medium text-foreground">No payment involved:</span> testing is
                free, no card is required, and the code is redeemed in-app rather than through the
                store.
              </li>
              <li>
                <span className="font-medium text-foreground">One per person:</span> one reward per
                tester and per household. Duplicate or throwaway sign-ups are removed from the list.
              </li>
              <li>
                <span className="font-medium text-foreground">Your data:</span> we store your email,
                first name and chosen device only to run this test. We never sell it, and you can
                ask us to delete it at any time.
              </li>
              <li>
                <span className="font-medium text-foreground">Leaving early:</span> you can opt out
                of the test track whenever you like — just reply to any email from us.
              </li>
              <li>
                <span className="font-medium text-foreground">General:</span> DoseRoutine is a
                health and fitness tracking tool, not a substitute for professional advice. Places
                are limited and the offer can be withdrawn before the test opens.
              </li>
            </ul>
          </div>
        </section>

        <div className="mt-12 rounded-2xl border border-border bg-card p-6 text-center">
          <Users className="mx-auto h-8 w-8 text-primary" aria-hidden="true" />
          <p className="mt-3 text-sm font-medium text-foreground">
            Know someone who would make a great tester?
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            Share this page with them. The more engaged testers we have, the faster DoseRoutine gets
            to public launch.
          </p>
        </div>
        <ProseContainer>
          <PageProse id="closed-testing" />
        </ProseContainer>
        <AttributionDebugPanel />
      </main>
    </>
  );
}

function BenefitCard({
  icon,
  title,
  body,
}: {
  icon: React.ReactNode;
  title: string;
  body: string;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5 text-center">
      <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
        {icon}
      </div>
      <h3 className="mt-3 text-sm font-semibold text-foreground">{title}</h3>
      <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{body}</p>
    </div>
  );
}

function PlatformChip({
  label,
  selected,
  onClick,
}: {
  label: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full border px-4 py-2 text-sm font-medium transition-colors ${
        selected
          ? "border-primary bg-primary text-primary-foreground"
          : "border-border bg-card text-foreground hover:bg-muted"
      }`}
      aria-pressed={selected}
    >
      {label}
    </button>
  );
}

function SuccessState({ email, onReset }: { email: string; onReset: () => void }) {
  return (
    <div className="text-center">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-synergy/10 text-synergy">
        <CheckCircle className="h-7 w-7" aria-hidden="true" />
      </div>
      <h2 className="mt-5 font-display text-xl font-semibold text-foreground">
        You&apos;re on the list
      </h2>
      <p className="mt-2 text-sm text-muted-foreground">
        We saved <span className="font-medium text-foreground">{email}</span>. You&apos;ll receive
        an email when the closed test is set to begin, with your Play Store invite link.
        There&apos;s nothing else to do until then.
      </p>
      <Button type="button" variant="outline" onClick={onReset} className="mt-6">
        Sign up another email
      </Button>
    </div>
  );
}
