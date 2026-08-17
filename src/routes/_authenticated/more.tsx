import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient, useQuery } from "@tanstack/react-query";
import { useState } from "react";
import {
  Activity,
  AlertTriangle,
  Dumbbell,
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
  TrendingUp,
} from "lucide-react";
import { restorePurchases } from "@/lib/revenuecat";
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

export const Route = createFileRoute("/_authenticated/more")({
  head: () => ({ meta: [{ title: "More — DoseRoutine" }] }),
  component: MorePage,
});

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
      const info = await restorePurchases();
      // Refetch subscription — the server sync inside restorePurchases()
      // has already mirrored RevenueCat entitlements into our DB.
      await queryClient.invalidateQueries({ queryKey: ["subscription"] });
      await queryClient.refetchQueries({ queryKey: ["subscription"] });
      if (info.activeEntitlements.length > 0) {
        alert("Purchases restored. Pro is now active on this device.");
      } else {
        alert(
          "No active subscriptions found on this Apple ID / Google account. If you recently subscribed, wait a minute and try again.",
        );
      }
    } catch (e) {
      alert(e instanceof Error ? e.message : "Restore failed");
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
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  async function openPortal() {
    setPortalLoading(true);
    try {
      const result = await createPortalSession({
        data: { environment: getStripeEnvironment() },
      });
      if ("error" in result) throw new Error(result.error);
      window.open(result.url, "_blank");
    } catch (e) {
      alert(e instanceof Error ? e.message : "Could not open billing portal");
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

        <Link
          to="/plan"
          className="tap-target flex w-full items-center gap-3 rounded-xl px-4 text-sm font-medium text-foreground transition-colors hover:bg-background"
        >
          <Sparkles className="h-4 w-4" />
          <span className="flex-1 text-left">AI Plan</span>
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
        </Link>
        <Link
          to="/chat"
          className="tap-target flex w-full items-center gap-3 rounded-xl px-4 text-sm font-medium text-foreground transition-colors hover:bg-background"
        >
          <MessageCircle className="h-4 w-4" />
          <span className="flex-1 text-left">AI Coach</span>
          <span className="text-xs text-muted-foreground">Ask anything</span>
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
        </Link>
        <Link
          to="/interaction-checker"
          className="tap-target flex w-full items-center gap-3 rounded-xl px-4 text-sm font-medium text-foreground transition-colors hover:bg-background"
        >
          <ShieldCheck className="h-4 w-4" />
          <span className="flex-1 text-left">Interaction Checker</span>
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
        </Link>
        <Link
          to="/calculators"
          className="tap-target flex w-full items-center gap-3 rounded-xl px-4 text-sm font-medium text-foreground transition-colors hover:bg-background"
        >
          <Calculator className="h-4 w-4" />
          <span className="flex-1 text-left">Dose Calculators</span>
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
        </Link>
        <Link
          to="/library"
          className="tap-target flex w-full items-center gap-3 rounded-xl px-4 text-sm font-medium text-foreground transition-colors hover:bg-background"
        >
          <Library className="h-4 w-4" />
          <span className="flex-1 text-left">Compound Library</span>
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
        </Link>
        <Link
          to="/library/mens-health"
          className="tap-target flex w-full items-center gap-3 rounded-xl px-4 text-sm font-medium text-foreground transition-colors hover:bg-background"
        >
          <BookOpen className="h-4 w-4" />
          <span className="flex-1 text-left">Men's Health Hub</span>
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
        </Link>
        <Link
          to="/insights"
          className="tap-target flex w-full items-center gap-3 rounded-xl px-4 text-sm font-medium text-foreground transition-colors hover:bg-background"
        >
          <LineChart className="h-4 w-4" />
          <span className="flex-1 text-left">Insights</span>
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
        </Link>
        <Link
          to="/checkins"
          className="tap-target flex w-full items-center gap-3 rounded-xl px-4 text-sm font-medium text-foreground transition-colors hover:bg-background"
        >
          <LineChart className="h-4 w-4" />
          <span className="flex-1 text-left">Check-ins</span>
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
        </Link>
        <Link
          to="/reminders"
          className="tap-target flex w-full items-center gap-3 rounded-xl px-4 text-sm font-medium text-foreground transition-colors hover:bg-background"
        >
          <Bell className="h-4 w-4" />
          <span className="flex-1 text-left">Reminders</span>
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
        </Link>
        <Link
          to="/health-sync"
          className="tap-target flex w-full items-center gap-3 rounded-xl px-4 text-sm font-medium text-foreground transition-colors hover:bg-background"
        >
          <Activity className="h-4 w-4" />
          <span className="flex-1 text-left">Health Sync</span>
          <span className="text-xs text-muted-foreground">Coming in app</span>
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
        </Link>
        <Link
          to="/labs"
          className="tap-target flex w-full items-center gap-3 rounded-xl px-4 text-sm font-medium text-foreground transition-colors hover:bg-background"
        >
          <FlaskConical className="h-4 w-4" />
          <span className="flex-1 text-left">Blood Work</span>
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
        </Link>
        <Link
          to="/templates"
          className="tap-target flex w-full items-center gap-3 rounded-xl px-4 text-sm font-medium text-foreground transition-colors hover:bg-background"
        >
          <Layers className="h-4 w-4" />
          <span className="flex-1 text-left">Stack Templates</span>
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
        </Link>
        <Link
          to="/injection-sites"
          className="tap-target flex w-full items-center gap-3 rounded-xl px-4 text-sm font-medium text-foreground transition-colors hover:bg-background"
        >
          <MapPin className="h-4 w-4" />
          <span className="flex-1 text-left">Injection Sites</span>
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
        </Link>
        <Link
          to="/doctor-report"
          className="tap-target flex w-full items-center gap-3 rounded-xl px-4 text-sm font-medium text-foreground transition-colors hover:bg-background"
        >
          <FileText className="h-4 w-4" />
          <span className="flex-1 text-left">My Report</span>
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
        </Link>
        <Link
          to="/cycles"
          className="tap-target flex w-full items-center gap-3 rounded-xl px-4 text-sm font-medium text-foreground transition-colors hover:bg-background"
        >
          <RotateCcw className="h-4 w-4" />
          <span className="flex-1 text-left">Cycle Tracker</span>
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
        </Link>
        <Link
          to="/costs"
          className="tap-target flex w-full items-center gap-3 rounded-xl px-4 text-sm font-medium text-foreground transition-colors hover:bg-background"
        >
          <DollarSign className="h-4 w-4" />
          <span className="flex-1 text-left">Cost Tracker</span>
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
        </Link>
        <Link
          to="/side-effects"
          className="tap-target flex w-full items-center gap-3 rounded-xl px-4 text-sm font-medium text-foreground transition-colors hover:bg-background"
        >
          <AlertTriangle className="h-4 w-4" />
          <span className="flex-1 text-left">Side Effect Journal</span>
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
        </Link>
        <Link
          to="/export"
          className="tap-target flex w-full items-center gap-3 rounded-xl px-4 text-sm font-medium text-foreground transition-colors hover:bg-background"
        >
          <FileDown className="h-4 w-4" />
          <span className="flex-1 text-left">Export my data</span>
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
        </Link>
        <Link
          to="/scan"
          className="tap-target flex w-full items-center gap-3 rounded-xl px-4 text-sm font-medium text-foreground transition-colors hover:bg-background"
        >
          <ScanLine className="h-4 w-4" />
          <span className="flex-1 text-left">Scan a bottle</span>
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
        </Link>
        <Link
          to="/progress-photos"
          className="tap-target flex w-full items-center gap-3 rounded-xl px-4 text-sm font-medium text-foreground transition-colors hover:bg-background"
        >
          <Camera className="h-4 w-4" />
          <span className="flex-1 text-left">Progress Photos</span>
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
        </Link>
        <Link
          to="/fitness"
          className="tap-target flex w-full items-center gap-3 rounded-xl px-4 text-sm font-medium text-foreground transition-colors hover:bg-background"
        >
          <Dumbbell className="h-4 w-4" />
          <span className="flex-1 text-left">Fitness &amp; Body</span>
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
        </Link>
        <Link
          to="/manual"
          className="tap-target flex w-full items-center gap-3 rounded-xl px-4 text-sm font-medium text-foreground transition-colors hover:bg-background"
        >
          <BookOpen className="h-4 w-4" />
          <span className="flex-1 text-left">Instruction Manual</span>
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
        </Link>
        <Link
          to="/help"
          className="tap-target flex w-full items-center gap-3 rounded-xl px-4 text-sm font-medium text-foreground transition-colors hover:bg-background"
        >
          <HelpCircle className="h-4 w-4" />
          <span className="flex-1 text-left">Help Center</span>
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
          to="/install"
          className="tap-target flex w-full items-center gap-3 rounded-xl px-4 text-sm font-medium text-foreground transition-colors hover:bg-background"
        >
          <Download className="h-4 w-4" />
          <span className="flex-1 text-left">Install on Home Screen</span>
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
        </Link>
        <Link
          to="/legal"
          className="tap-target flex w-full items-center gap-3 rounded-xl px-4 text-sm font-medium text-foreground transition-colors hover:bg-background"
        >
          <ChevronRight className="h-4 w-4" />
          Terms, privacy & disclaimer
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
      </div>

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
