import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { BarChart3, BookOpen, Database, Gift, Shield, TrendingUp, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { routeErrorComponent } from "@/components/route-error-panel";

export const Route = createFileRoute("/_authenticated/admin/")({
  errorComponent: routeErrorComponent("admin"),
  head: () => ({
    meta: [
      { title: "Admin tools — DoseRoutine" },
      {
        name: "description",
        content: "Internal DoseRoutine admin hub: testers, analytics and structured data tools.",
      },
      { property: "og:title", content: "Admin tools — DoseRoutine" },
      { property: "og:description", content: "Internal DoseRoutine admin hub." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: AdminHome,
});

const TOOLS = [
  {
    to: "/admin/food-catalog",
    label: "Food catalog",
    icon: Database,
    desc: "Foods, household portions, aliases, USDA imports and one-click rollback of mistakes.",
  },
  {
    to: "/admin/testers",
    label: "Closed testing signups",
    icon: Users,
    desc: "Tester list, invite emails, comp codes and app-launch waitlist count.",
  },
  {
    to: "/admin/analytics",
    label: "Traffic & conversion",
    icon: TrendingUp,
    desc: "Real visitors vs bot noise, sources, funnel and sign-up conversion.",
  },
  {
    to: "/admin/install-funnel",
    label: "Install → sign-up funnel",
    icon: TrendingUp,
    desc: "Install page visits, landing clicks and real tester accounts with conversion rates.",
  },
  {
    to: "/admin/schema-report",
    label: "Structured data report",
    icon: BookOpen,
    desc: "Validates every JSON-LD block across the live sitemap.",
  },
  {
    to: "/debug/index-check",
    label: "Index health check",
    icon: BarChart3,
    desc: "Confirms robots headers and canonical tags on the current build.",
  },
  {
    to: "/debug/noindex-audit",
    label: "Noindex audit",
    icon: BarChart3,
    desc: "Scans every private path for robots.txt / header / meta robots mismatches.",
  },

  {
    to: "/admin/cron-metrics",
    label: "Reminder job metrics",
    icon: BarChart3,
    desc: "Query counts, delivery volume and budget breaches for the reminder cron jobs.",
  },
  {
    to: "/admin/search-console",
    label: "Search Console monitor",
    icon: BarChart3,
    desc: "Daily sitemap fetch status, indexing counts, errors and search performance over time.",
  },
  {
    to: "/admin/seo-analytics",
    label: "SEO analytics",
    icon: TrendingUp,
    desc: "Site-wide keyword performance and sign-up conversions by landing page.",
  },
  {
    to: "/admin/blog-seo",
    label: "Blog SEO dashboard",
    icon: BookOpen,
    desc: "Impressions, clicks, CTR and average position per blog post, with top queries.",
  },

  {
    to: "/admin/content-calendar",
    label: "Content calendar coverage",
    icon: BookOpen,
    desc: "Cluster coverage, intent mix and publish status across the 60-day editorial calendar.",
  },

  {
    to: "/admin/keyword-map",
    label: "Keyword → page map",
    icon: BookOpen,
    desc: "Which page owns each medication reminder keyword, plus intent, gaps and CSV export.",
  },

  {
    to: "/admin/publish-impact",
    label: "Publish impact report",
    icon: TrendingUp,
    desc: "Before vs. after publishing: crawl, indexing and impression changes for a chosen date.",
  },
  {
    to: "/admin/scan-analytics",
    label: "Barcode scan analytics",
    icon: BarChart3,
    desc: "Scan volume by capture method, time-to-result, per-database hit rates and unknown products.",
  },
  {
    to: "/admin/health",
    label: "Production health",
    icon: Shield,
    desc: "Real-user client errors, Core Web Vitals, load timing and the slowest pages/resources.",
  },
  {
    to: "/redeem",
    label: "Redeem a comp code",
    icon: Gift,
    desc: "Tester reward redemption screen (what your testers see).",
  },
] as const;

function AdminHome() {
  const { data: isAdmin, isLoading } = useQuery({
    queryKey: ["is-admin"],
    queryFn: async () => {
      const { data } = await supabase.rpc("is_admin");
      return Boolean(data);
    },
  });

  if (isLoading) {
    return <div className="p-6 text-sm text-muted-foreground">Checking access…</div>;
  }

  if (!isAdmin) {
    return (
      <div className="p-6">
        <Card className="rounded-2xl p-6 text-sm text-muted-foreground">
          You don’t have admin access.
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-6">
      <div className="mb-6 flex items-center gap-2">
        <Shield className="h-5 w-5 text-primary" />
        <h1 className="text-2xl font-bold tracking-tight">Admin tools</h1>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {TOOLS.map((tool) => (
          <Link
            key={tool.to}
            to={tool.to}
            className="rounded-2xl border border-border bg-card p-4 transition hover:border-primary/40 hover:shadow-sm"
          >
            <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
              <tool.icon className="h-4 w-4 text-primary" />
              {tool.label}
            </div>
            <p className="mt-1 text-xs text-muted-foreground">{tool.desc}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
