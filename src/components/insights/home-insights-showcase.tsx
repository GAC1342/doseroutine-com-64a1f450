import { useMemo } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import { InsightsGrid } from "@/components/insights/insights-grid";
import { buildDemoInsights } from "@/lib/insights/demo";

/**
 * Marketing showcase of the in-app Insights dashboard, rendered with clearly
 * labelled sample data so visitors can see the charts before signing up.
 */
export function HomeInsightsShowcase() {
  const demo = useMemo(() => buildDemoInsights(), []);

  return (
    <section className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6" id="insights">
      <div className="mx-auto max-w-2xl text-center">
        <p className="text-xs font-semibold uppercase tracking-wider text-primary">
          Insights dashboard
        </p>
        <h2 className="mt-2 font-display text-3xl font-semibold tracking-tight sm:text-4xl">
          See whether your routine is actually working
        </h2>
        <p className="mt-3 text-base text-muted-foreground">
          Adherence, body composition, training volume, injection rotation, vial supply and monthly
          spend — charted from what you log, in one place.
        </p>
      </div>

      <div className="mt-8">
        <InsightsGrid data={demo} showLinks={false} />
      </div>

      <p className="mt-4 text-center text-xs text-muted-foreground">
        Sample data shown for illustration. Your dashboard charts your own logs.
      </p>

      <div className="mt-6 flex justify-center">
        <Link
          to="/auth"
          className="tap-target inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground hover:opacity-95"
        >
          Start tracking free <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </Link>
      </div>
    </section>
  );
}

export default HomeInsightsShowcase;
