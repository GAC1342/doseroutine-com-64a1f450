import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { useT } from "@/lib/i18n-provider";
import { trackEvent } from "@/lib/analytics";
import { cn } from "@/lib/utils";
import {
  ShieldCheck,
  Clock,
  Layers,
  Check,
  Search,
  Activity,
  Bell,
  Pill,
  ChevronRight,
} from "lucide-react";
import { Card } from "@/components/ui/card";

export function AppCapabilityShowcase({
  section = "landing",
  compact = false,
}: {
  section?: string;
  compact?: boolean;
}) {
  const _t = useT();

  function handleCta(position: string) {
    trackEvent("capability_cta_click", { section, position });
  }

  const sectionClass = (padding: string) =>
    compact ? "py-6" : `mx-auto max-w-5xl px-6 ${padding}`;

  return (
    <div className="text-foreground">
      {/* Built for the full protocol */}
      <section className={sectionClass("pb-2")}>
        <div className="rounded-2xl border border-primary/30 bg-primary/5 p-5 sm:p-6">
          <p className="text-xs font-semibold uppercase tracking-wider text-primary">
            Built for the full protocol
          </p>
          <h2
            className={cn(
              "mt-2 font-display font-semibold tracking-tight",
              compact ? "text-xl sm:text-2xl" : "text-2xl sm:text-3xl",
            )}
          >
            Not just vitamins — supplements, peptides, hormones &amp; your whole routine.
          </h2>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground sm:text-base">
            Most supplement apps stop at fish oil. DoseRoutine covers TRT/HRT, GLP-1s, NAD+,
            rapamycin, peptides and everything else you take — with educational combination notes
            and extra-caution flags on sensitive items.
          </p>
          <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
            {[
              { label: "Supplements", sub: "200+" },
              { label: "Peptides", sub: "90+" },
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

      {/* Trust bar */}
      <section className={sectionClass("pb-10 pt-6")}>
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

      {/* Value props */}
      <section
        className={cn(
          "grid gap-4",
          compact ? "py-6" : "mx-auto max-w-5xl px-6 py-14 sm:grid-cols-3",
        )}
      >
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
      <section className={sectionClass("py-10")}>
        <div className="text-center">
          <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
            Everything included with Pro
          </div>
          <h2
            className={cn(
              "mt-3 font-display font-semibold tracking-tight",
              compact ? "text-xl sm:text-2xl" : "text-2xl sm:text-3xl",
            )}
          >
            Built for peptides, hormones and mixed routines — not just vitamins.
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
            onClick={() => handleCta("help_link")}
            className="text-xs font-medium text-primary underline underline-offset-2"
          >
            See how each feature works →
          </Link>
        </div>
      </section>

      {/* How it works */}
      <section className={sectionClass("py-14")}>
        <h2
          className={cn(
            "text-center font-display font-semibold tracking-tight",
            compact ? "text-xl sm:text-2xl" : "text-2xl sm:text-3xl",
          )}
        >
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
      <section className={cn(compact ? "py-6" : "mx-auto max-w-3xl px-6 pb-14")}>
        <Card className="rounded-2xl border-border p-6 text-sm leading-relaxed text-muted-foreground">
          <h2 className="mb-3 font-display text-lg font-semibold text-foreground">
            {_t("trustTitle")}
          </h2>
          <p>{_t("trustBody")}</p>
          <p className="mt-3">{_t("medicalDisclaimer")}</p>
        </Card>
      </section>
    </div>
  );
}

function FeatureCard({ icon, title, body }: { icon: ReactNode; title: string; body: string }) {
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
  icon: ReactNode;
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
