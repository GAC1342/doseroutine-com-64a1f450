import { toast } from "sonner";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient, useQuery } from "@tanstack/react-query";
import { useState } from "react";
import {
  Activity,
  AlertTriangle,
  Clock,
  Bell,
  ChevronRight,
  Crown,
  DollarSign,
  FileDown,
  FileText,
  FlaskConical,
  Layers,
  LogOut,
  MapPin,
  RotateCcw,
  Sparkles,
  ExternalLink,
  BookOpen,
  Globe,
  Download,
  LineChart,
  RefreshCw,
  Camera,
  HelpCircle,
  ScanLine,
  MessageCircle,
  Calculator,
  ShieldCheck,
  Library,
  Newspaper,
  TrendingUp,
} from "lucide-react";
import { restorePurchases, withStoreTimeout } from "@/lib/revenuecat";
import { useSubscription } from "@/hooks/use-subscription";
import { createPortalSession } from "@/lib/payments.functions";
import { getStripeEnvironment } from "@/lib/stripe";
import { DisclaimerFooter } from "@/components/disclaimer-footer";
import { generateLibraryContent } from "@/lib/generate-library-content.functions";
import { LanguageSwitcher } from "@/components/language-switcher";
import { DeleteAccountButton } from "@/components/delete-account-button";
import { isNative } from "@/lib/platform";
import { Card } from "@/components/ui/card";
import { FunnelWidget } from "@/components/funnel-widget";
import { AppearanceSection } from "@/components/appearance-section";
import { VacationModeCard } from "@/components/vacation-mode-card";
import { StandingRulesCard } from "@/components/standing-rules-card";
import { openExternalUrl } from "@/lib/external-link";
import { routeErrorComponent } from "@/components/route-error-panel";
import { performSignOut } from "@/lib/sign-out";

export const Route = createFileRoute("/_authenticated/more")({
  errorComponent: routeErrorComponent("more"),
  head: () => ({ meta: [{ title: "More — DoseRoutine" }] }),
  component: MorePage,
});

/**
 * Grouped destinations. This page used to be a flat list of ~35 links with no
 * hierarchy, which made everything technically present but nothing findable.
 * Nothing was removed — it is the same set, sorted into jobs-to-be-done.
 */
const MORE_SECTIONS = [
  {
    title: "Tools",
    defaultOpen: true,
    items: [
      { to: "/fitness", label: "Fitness & training", icon: Activity },
      { to: "/timer", label: "Workout timer", icon: Clock },
      { to: "/chat", label: "AI Coach", icon: MessageCircle, note: "Ask anything" },
      { to: "/plan", label: "AI Plan", icon: Sparkles },
      { to: "/calculators", label: "Dose calculators", icon: Calculator },
      { to: "/interaction-checker", label: "Interaction checker", icon: ShieldCheck },
      { to: "/pill-id", label: "Pill identifier", icon: ScanLine },
      { to: "/doctor-report", label: "My report", icon: FileText },
      { to: "/export", label: "Export my data", icon: FileDown },
    ],
  },
  {
    title: "Protocol",
    defaultOpen: true,
    items: [
      { to: "/safety", label: "Safety & interactions", icon: ShieldCheck },
      { to: "/cycles", label: "Cycle tracker", icon: RotateCcw },
      { to: "/templates", label: "Stack templates", icon: Layers },
      { to: "/injection-sites", label: "Injection sites", icon: MapPin },
      { to: "/costs", label: "Cost tracker", icon: DollarSign },
      { to: "/reminders", label: "Reminders", icon: Bell },
      { to: "/health-sync", label: "Health sync", icon: Activity, note: "Coming in app" },
      { to: "/timeline", label: "Timeline", icon: Clock },
    ],
  },
  {
    title: "Progress",
    defaultOpen: false,
    items: [
      { to: "/progress", label: "Progress overview", icon: LineChart },
      { to: "/insights", label: "Charts", icon: LineChart },
      { to: "/progress-photos", label: "Progress photos", icon: Camera },
      { to: "/labs", label: "Blood work", icon: FlaskConical },
      { to: "/checkins", label: "Check-ins", icon: LineChart },
      { to: "/side-effects", label: "Side effect journal", icon: AlertTriangle },
    ],
  },
  {
    title: "Food",
    defaultOpen: false,
    items: [
      { to: "/food", label: "Food diary", icon: LineChart },
      { to: "/meal-plan", label: "Weekly meal planner", icon: LineChart },
      { to: "/scan", label: "Scan a barcode or bottle", icon: ScanLine },
    ],
  },
  {
    title: "Learn",
    defaultOpen: false,
    items: [
      { to: "/library", label: "Compound library", icon: Library },
      { to: "/library/mens-health", label: "Men's health hub", icon: BookOpen },
      { to: "/articles", label: "Articles", icon: Newspaper },
      { to: "/blog", label: "Research & updates", icon: BookOpen },
      { to: "/manual", label: "Instruction manual", icon: BookOpen },
      { to: "/help", label: "Help center", icon: HelpCircle },
    ],
  },
] as const;

function MoreSection({
  title,
  defaultOpen,
  children,
}: {
  title: string;
  defaultOpen: boolean;
  children: React.ReactNode;
}) {
  return (
    <details open={defaultOpen} className="mt-4 rounded-2xl bg-card p-2">
      <summary className="tap-target cursor-pointer list-none rounded-xl px-4 py-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground transition-colors hover:bg-background">
        {title}
      </summary>
      <div className="mt-1 space-y-1">{children}</div>
    </details>
  );
}

function MorePage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: subscription } = useSubscription();
  const [portalLoading, setPortalLoading] = useState(false);
  const [genBusy, setGenBusy] = useState(false);
  const [genMsg, setGenMsg] = useState<string | null>(null);
  const [restoreBusy, setRestoreBusy] = useState(false);

  async function handleRestore() {
    setRestoreBusy(true);
    try {
      // Timeout-guarded: an unreachable store must not leave the button spinning.
      const info = await withStoreTimeout(restorePurchases(), 15_000, "Restoring purchases");
      // Refetch subscription — the server sync inside restorePurchases()
      // has already mirrored RevenueCat entitlements into our DB.
      await queryClient.invalidateQueries({ queryKey: ["subscription"] });
      await queryClient.refetchQueries({ queryKey: ["subscription"] });
      if (info.activeEntitlements.length > 0) {
        toast.success("Purchases restored", {
          description: "Pro is now active on this device.",
        });
      } else {
        toast.info("No purchases to restore", {
          description:
            "No active subscription was found on this Apple ID / Google account. If you subscribed just now, wait a minute and try again.",
        });
      }
    } catch (e) {
      toast.error("Restore failed", {
        description: e instanceof Error ? e.message : "Please try again in a moment.",
      });
    } finally {
      setRestoreBusy(false);
    }
  }

  const { data: isAdmin } = useQuery({
    queryKey: ["is-admin"],
    queryFn: async () => {
      const { data } = await supabase.rpc("is_admin");
      return !!data;
    },
    staleTime: 60_000,
  });

  async function runGeneration() {
    setGenBusy(true);
    setGenMsg(null);
    try {
      const res = await generateLibraryContent({ data: { limit: 10 } });
      const ok = res.results.filter((r) => r.ok).length;
      const fail = res.results.length - ok;
      setGenMsg(
        `Generated ${ok} entries${fail ? `, ${fail} failed` : ""}. Click again for the next batch.`,
      );
    } catch (e) {
      setGenMsg(e instanceof Error ? e.message : "Generation failed");
    } finally {
      setGenBusy(false);
    }
  }

  async function handleSignOut() {
    await performSignOut(queryClient);
    navigate({ to: "/auth", replace: true });
  }

  async function openPortal() {
    setPortalLoading(true);
    try {
      const result = await createPortalSession({
        data: { environment: getStripeEnvironment() },
      });
      if ("error" in result) throw new Error(result.error);
      await openExternalUrl(result.url);
    } catch (e) {
      toast.error("Could not open billing", {
        description: e instanceof Error ? e.message : "Please try again in a moment.",
      });
    } finally {
      setPortalLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl px-6 py-10">
      <h1 className="font-display text-3xl font-semibold tracking-tight">More</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Every tool DoseRoutine gives you — coach, calculators, safety, exports and account.
      </p>

      <Card className="mt-6 flex items-center justify-between rounded-2xl border-border p-4 md:hidden">
        <div className="flex items-center gap-2 text-sm font-medium text-foreground">
          <Globe className="h-4 w-4 text-muted-foreground" />
          Language
        </div>
        <LanguageSwitcher variant="minimal" />
      </Card>

      <Link
        to="/manual"
        className="mt-6 flex items-center gap-3 rounded-2xl border border-primary/40 bg-primary/5 p-4 transition-colors hover:bg-primary/10"
      >
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10">
          <BookOpen className="h-5 w-5 text-primary" />
        </div>
        <div className="flex-1">
          <div className="text-sm font-semibold text-foreground">Instruction Manual</div>
          <div className="text-xs text-muted-foreground">
            Step-by-step guide to every part of the app — start here.
          </div>
        </div>
        <ChevronRight className="h-4 w-4 text-muted-foreground" />
      </Link>

      <div className="mt-6">
        <VacationModeCard />
        <StandingRulesCard />
      </div>

      <div className="mt-6">
        <AppearanceSection />
      </div>

      <div className="mt-6 space-y-2 rounded-2xl bg-card p-2 md:mt-8">
        {subscription?.isPaid ? (
          isNative() ? (
            <div className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium text-foreground">
              <Crown className="h-4 w-4 text-primary" />
              <span className="flex-1 text-left">
                {subscription?.tier
                  ? `${subscription.tier.charAt(0).toUpperCase() + subscription.tier.slice(1)} plan`
                  : "Subscription"}
              </span>
              <span className="text-xs text-muted-foreground">Manage in device Settings</span>
            </div>
          ) : (
            <button
              onClick={openPortal}
              disabled={portalLoading}
              className="tap-target flex w-full items-center gap-3 rounded-xl px-4 text-sm font-medium text-foreground transition-colors hover:bg-background"
            >
              <Crown className="h-4 w-4 text-primary" />
              <span className="flex-1 text-left">
                {subscription?.tier
                  ? `${subscription.tier.charAt(0).toUpperCase() + subscription.tier.slice(1)} plan`
                  : "Subscription"}
              </span>
              <span className="text-xs text-muted-foreground">
                {portalLoading ? "Loading…" : "Manage"}
              </span>
              <ExternalLink className="h-4 w-4 text-muted-foreground" />
            </button>
          )
        ) : (
          <Link
            to="/upgrade"
            search={{}}
            className="tap-target flex w-full items-center gap-3 rounded-xl px-4 text-sm font-medium text-foreground transition-colors hover:bg-background"
          >
            <Crown className="h-4 w-4 text-primary" />
            <span className="flex-1 text-left">Upgrade</span>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </Link>
        )}
      </div>

      {MORE_SECTIONS.map((section) => (
        <MoreSection key={section.title} title={section.title} defaultOpen={section.defaultOpen}>
          {section.items.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className="tap-target flex w-full items-center gap-3 rounded-xl px-4 text-sm font-medium text-foreground transition-colors hover:bg-background"
            >
              <item.icon className="h-4 w-4" />
              <span className="flex-1 text-left">{item.label}</span>
              {"note" in item && item.note ? (
                <span className="text-xs text-muted-foreground">{item.note}</span>
              ) : null}

              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </Link>
          ))}
        </MoreSection>
      ))}

      <MoreSection title="Account" defaultOpen={false}>
        <Link
          to="/account"
          className="tap-target flex w-full items-center gap-3 rounded-xl px-4 text-sm font-medium text-foreground transition-colors hover:bg-background"
        >
          <ShieldCheck className="h-4 w-4" />
          <span className="flex-1 text-left">Sign-in methods</span>
          <span className="text-xs text-muted-foreground">Google, Apple, email</span>
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
        </Link>
        <Link
          to="/notifications"
          className="tap-target flex w-full items-center gap-3 rounded-xl px-4 text-sm font-medium text-foreground transition-colors hover:bg-background"
        >
          <Bell className="h-4 w-4" />
          <span className="flex-1 text-left">Notifications</span>
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
        </Link>

        <Link
          to="/install"
          className="tap-target flex w-full items-center gap-3 rounded-xl px-4 text-sm font-medium text-foreground transition-colors hover:bg-background"
        >
          <Download className="h-4 w-4" />
          <span className="flex-1 text-left">Install on Home Screen</span>
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
        </Link>
        <Link
          to="/about"
          className="tap-target flex w-full items-center gap-3 rounded-xl px-4 text-sm font-medium text-foreground transition-colors hover:bg-background"
        >
          <BookOpen className="h-4 w-4" />
          <span className="flex-1 text-left">About DoseRoutine</span>
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
        </Link>
        <Link
          to="/legal"
          className="tap-target flex w-full items-center gap-3 rounded-xl px-4 text-sm font-medium text-foreground transition-colors hover:bg-background"
        >
          <ChevronRight className="h-4 w-4" />
          Terms, privacy &amp; disclaimer
        </Link>

        {isNative() && (
          <button
            onClick={handleRestore}
            disabled={restoreBusy}
            className="tap-target flex w-full items-center gap-3 rounded-xl px-4 text-sm font-medium text-foreground transition-colors hover:bg-background disabled:opacity-60"
          >
            <RefreshCw className={`h-4 w-4 ${restoreBusy ? "animate-spin" : ""}`} />
            <span className="flex-1 text-left">Restore purchases</span>
          </button>
        )}

        <button
          onClick={handleSignOut}
          className="tap-target flex w-full items-center gap-3 rounded-xl px-4 text-sm font-medium text-foreground transition-colors hover:bg-background"
        >
          <LogOut className="h-4 w-4" />
          Sign out
        </button>
      </MoreSection>

      <div className="mt-6 rounded-2xl bg-card p-2">
        <DeleteAccountButton />
      </div>

      {isAdmin && (
        <Card className="mt-6 rounded-2xl border-border p-4">
          <div className="mb-2 flex items-center gap-2 text-sm font-semibold">
            <BookOpen className="h-4 w-4 text-primary" />
            Library content (admin)
          </div>
          <p className="text-xs text-muted-foreground">
            Generate rich Wikipedia-style entries (mechanism, benefits, side effects, warnings,
            do-not-mix, FAQ, sources, PubChem structure) for compounds missing content. Runs in
            batches of 10.
          </p>
          <button
            onClick={runGeneration}
            disabled={genBusy}
            className="mt-3 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50"
          >
            {genBusy ? "Generating…" : "Generate next 10 entries"}
          </button>
          {genMsg && <p className="mt-2 text-xs text-muted-foreground">{genMsg}</p>}
          <Link
            to="/admin"
            className="mt-3 inline-flex items-center gap-2 rounded-xl border border-border bg-background px-4 py-2 text-sm font-semibold text-foreground transition hover:opacity-90"
          >
            <BookOpen className="h-4 w-4" /> All admin tools →
          </Link>
          <Link
            to="/admin/testers"
            className="mt-3 inline-flex items-center gap-2 rounded-xl border border-border bg-background px-4 py-2 text-sm font-semibold text-foreground transition hover:opacity-90"
          >
            <BookOpen className="h-4 w-4" /> Closed testing signups →
          </Link>
          <Link
            to="/admin/schema-report"
            className="mt-3 inline-flex items-center gap-2 rounded-xl border border-border bg-background px-4 py-2 text-sm font-semibold text-foreground transition hover:opacity-90"
          >
            <BookOpen className="h-4 w-4" /> Structured data report →
          </Link>
          <Link
            to="/admin/analytics"
            className="mt-3 inline-flex items-center gap-2 rounded-xl border border-border bg-background px-4 py-2 text-sm font-semibold text-foreground transition hover:opacity-90"
          >
            <TrendingUp className="h-4 w-4" /> Traffic & conversion →
          </Link>
        </Card>
      )}

      {isAdmin && <FunnelWidget />}

      <DisclaimerFooter />
    </div>
  );
}
