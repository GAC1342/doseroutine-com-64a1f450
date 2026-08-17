import { assetUrl } from "@/lib/asset-url";
import { BrandLogo } from "@/components/brand-logo";
import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, ArrowRight, Check, ShieldCheck, Loader2 } from "lucide-react";
import { todayInBrowserZone } from "@/lib/day-key";
import {
  captureOnboardingErrors,
  logOnboardingEvent,
  watchOnboardingLanding,
} from "@/lib/onboarding-telemetry";
import { reportLovableError } from "@/lib/lovable-error-reporting";

export const Route = createFileRoute("/onboarding")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Get started — DoseRoutine" },
      {
        name: "description",
        content:
          "Set up your DoseRoutine profile in about a minute: your goals, the compounds you take, and when you want reminders.",
      },
      { property: "og:title", content: "Get started with DoseRoutine" },
      {
        property: "og:description",
        content:
          "Personalize your DoseRoutine profile so we can tailor safety checks and dose reminders.",
      },
      { property: "og:url", content: "https://doseroutine.com/onboarding" },
      { name: "robots", content: "noindex" },
    ],
    links: [{ rel: "canonical", href: "https://doseroutine.com/onboarding" }],
  }),
  beforeLoad: async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/auth" });
    const { data: profile } = await supabase
      .from("profiles")
      .select("is_adult, consented_at")
      .eq("id", data.user.id)
      .maybeSingle();
    if (profile?.is_adult && profile?.consented_at) {
      throw redirect({ to: "/today" });
    }
    return { userId: data.user.id };
  },
  component: OnboardingPage,
});

type UnitPref = "metric" | "imperial";
type Sex = "male" | "female" | "other" | "prefer_not";
type Tier = "optimizer" | "glp1" | "everyday";

const GOAL_OPTIONS = [
  "Longevity",
  "Muscle & strength",
  "Fat loss",
  "Energy",
  "Sleep",
  "Cognition & focus",
  "Recovery",
  "Immunity",
  "Hormonal balance",
  "General wellness",
];

const TIER_OPTIONS: { value: Tier; title: string; body: string }[] = [
  { value: "optimizer", title: "Optimizer", body: "Peptides, hormones, advanced stacks." },
  { value: "glp1", title: "GLP-1", body: "On or considering GLP-1 medications." },
  { value: "everyday", title: "Everyday", body: "Vitamins & core supplements." },
];

function OnboardingPage() {
  const { userId } = Route.useRouteContext();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Step 1 — age
  const [dob, setDob] = useState("");
  const age = useMemo(() => {
    if (!dob) return null;
    const d = new Date(dob);
    if (Number.isNaN(d.getTime())) return null;
    const t = new Date();
    let a = t.getFullYear() - d.getFullYear();
    const m = t.getMonth() - d.getMonth();
    if (m < 0 || (m === 0 && t.getDate() < d.getDate())) a--;
    return a;
  }, [dob]);
  const isAdult = age !== null && age >= 18;

  // Step 2 — consent
  const [consent, setConsent] = useState(false);

  // Step 3 — stats
  const [sex, setSex] = useState<Sex | "">("");
  const [unitPref, setUnitPref] = useState<UnitPref>("imperial");
  const [heightCm, setHeightCm] = useState<string>("");
  const [heightFt, setHeightFt] = useState<string>("");
  const [heightIn, setHeightIn] = useState<string>("");
  const [weight, setWeight] = useState<string>(""); // kg or lb per unitPref
  const timezone = useMemo(() => Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC", []);

  // Step 4 — focus
  const [tier, setTier] = useState<Tier | "">("");

  // Step 5 — goals
  const [goals, setGoals] = useState<string[]>([]);

  const steps = ["Age", "Consent", "About you", "Focus", "Goals"];
  const [skippedStats, setSkippedStats] = useState(false);
  const canNext = (() => {
    if (step === 0) return isAdult;
    if (step === 1) return consent;
    if (step === 2)
      return (
        skippedStats ||
        (sex !== "" && weight !== "" && (unitPref === "metric" ? !!heightCm : !!heightFt))
      );
    if (step === 3) return tier !== "";
    if (step === 4) return goals.length > 0;
    return false;
  })();

  function skipStats() {
    setSkippedStats(true);
    setSex("prefer_not");
    setStep(3);
  }

  function toggleGoal(g: string) {
    setGoals((prev) => (prev.includes(g) ? prev.filter((x) => x !== g) : [...prev, g]));
  }

  async function handleFinish() {
    setError(null);
    setSaving(true);

    const startedAt = performance.now();
    const stopCapture = captureOnboardingErrors(userId);
    const since = () => Math.round(performance.now() - startedAt);
    logOnboardingEvent({ userId, event: "finish_click", step: "goals" });

    try {
      const heightCmFinal =
        unitPref === "metric"
          ? Number(heightCm)
          : Math.round((Number(heightFt || 0) * 12 + Number(heightIn || 0)) * 2.54);
      const weightKgFinal =
        unitPref === "metric" ? Number(weight) : Math.round(Number(weight) * 0.45359237 * 10) / 10;

      const { error: upErr } = await supabase
        .from("profiles")
        .update({
          dob,
          sex: sex || null,
          height_cm: heightCmFinal || null,
          weight_kg: weightKgFinal || null,
          unit_pref: unitPref,
          timezone,
          audience_tier: tier || null,
          goals,
          is_adult: true,
          consented_at: new Date().toISOString(),
        })
        .eq("id", userId);
      if (upErr) {
        logOnboardingEvent({
          userId,
          event: "profile_update_error",
          ok: false,
          errorMessage: upErr.message,
          elapsedMs: since(),
        });
        setSaving(false);
        setError(upErr.message);
        return;
      }
      logOnboardingEvent({ userId, event: "profile_update_ok", ok: true, elapsedMs: since() });

      // The authenticated layout caches this gate for 5 minutes. Without refreshing it
      // here, it still sees the pre-onboarding profile and bounces back to /onboarding,
      // which bounces to /today — a redirect loop that renders a blank screen.
      try {
        queryClient.setQueryData(["profile-gate", userId], {
          is_adult: true,
          consented_at: new Date().toISOString(),
        });
        await queryClient.invalidateQueries({ queryKey: ["profile-gate", userId] });
        logOnboardingEvent({ userId, event: "gate_refresh_ok", ok: true, elapsedMs: since() });
      } catch (gateErr) {
        logOnboardingEvent({
          userId,
          event: "gate_refresh_error",
          ok: false,
          errorMessage: gateErr instanceof Error ? gateErr.message : String(gateErr),
          elapsedMs: since(),
        });
      }

      // New signups (not grandfathered) hit the trial paywall before /today.
      const { data: profile } = await supabase
        .from("profiles")
        .select("grandfathered")
        .eq("id", userId)
        .maybeSingle();
      const target = profile?.grandfathered ? "/today" : "/trial";

      logOnboardingEvent({
        userId,
        event: "navigate_start",
        elapsedMs: since(),
        details: { target, grandfathered: !!profile?.grandfathered },
      });
      // Watchdog reports where the user actually ends up (and blank screens).
      watchOnboardingLanding(userId, target, startedAt);

      try {
        await navigate({ to: target, replace: true });
        logOnboardingEvent({
          userId,
          event: "navigate_ok",
          ok: true,
          elapsedMs: since(),
          landingPath: typeof window !== "undefined" ? window.location.pathname : null,
        });
      } catch (navErr) {
        logOnboardingEvent({
          userId,
          event: "navigate_error",
          ok: false,
          errorMessage: navErr instanceof Error ? navErr.message : String(navErr),
          elapsedMs: since(),
          landingPath: typeof window !== "undefined" ? window.location.pathname : null,
        });
        reportLovableError(navErr, { source: "onboarding_finish", target });
        setError("We saved your profile but couldn't open the next screen. Tap Finish again.");
      } finally {
        setSaving(false);
      }
    } catch (err) {
      logOnboardingEvent({
        userId,
        event: "window_error",
        ok: false,
        errorMessage: err instanceof Error ? err.message : String(err),
        elapsedMs: since(),
      });
      reportLovableError(err, { source: "onboarding_finish" });
      setError("Something went wrong finishing setup. Please try again.");
      setSaving(false);
    } finally {
      // Keep listeners alive briefly so post-navigation failures are captured.
      window.setTimeout(stopCapture, 8000);
    }
  }

  function next() {
    setError(null);
    if (step === 0 && dob && !isAdult) {
      setError("You must be 18 or older to use DoseRoutine.");
      return;
    }
    if (step < 4) setStep(step + 1);
    else handleFinish();
  }

  return (
    <main id="main-content" tabIndex={-1} className="min-h-dvh bg-background text-foreground">
      <div className="mx-auto flex max-w-lg flex-col px-5 py-8">
        <div className="mb-6 flex items-center gap-3">
          <BrandLogo
            size={32}
            alt="DoseRoutine supplement tracker logo"
            className="h-8 w-8 rounded-lg"
            priority
          />

          <span className="font-display text-lg font-semibold">DoseRoutine</span>
        </div>

        <Stepper current={step} labels={steps} />

        <div className="mt-8">
          {step === 0 && <AgeStep dob={dob} setDob={setDob} age={age} isAdult={isAdult} />}
          {step === 1 && <ConsentStep consent={consent} setConsent={setConsent} />}
          {step === 2 && (
            <StatsStep
              sex={sex}
              setSex={setSex}
              unitPref={unitPref}
              setUnitPref={setUnitPref}
              heightCm={heightCm}
              setHeightCm={setHeightCm}
              heightFt={heightFt}
              setHeightFt={setHeightFt}
              heightIn={heightIn}
              setHeightIn={setHeightIn}
              weight={weight}
              setWeight={setWeight}
              timezone={timezone}
              onSkip={skipStats}
            />
          )}
          {step === 3 && <FocusStep tier={tier} setTier={setTier} />}
          {step === 4 && <GoalsStep goals={goals} toggle={toggleGoal} />}
        </div>

        {error && (
          <p className="mt-4 rounded-lg bg-[color:var(--severity-avoid-bg))] px-3 py-2 text-sm text-[color:var(--severity-avoid)]">
            {error}
          </p>
        )}

        <div className="mt-8 flex items-center justify-between gap-3">
          <button
            onClick={() => setStep(Math.max(0, step - 1))}
            disabled={step === 0 || saving}
            className="tap-target inline-flex items-center gap-1 rounded-xl px-4 text-sm font-medium text-muted-foreground disabled:opacity-40"
          >
            <ArrowLeft className="h-4 w-4" /> Back
          </button>
          <button
            onClick={next}
            disabled={!canNext || saving}
            className="tap-target inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-primary px-6 text-base font-semibold text-primary-foreground shadow-sm transition-colors hover:bg-[color:var(--primary-hover)] disabled:cursor-not-allowed disabled:opacity-40"
          >
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" /> Saving…
              </>
            ) : step === 4 ? (
              <>
                Finish <Check className="h-4 w-4" />
              </>
            ) : (
              <>
                Continue <ArrowRight className="h-4 w-4" />
              </>
            )}
          </button>
        </div>
      </div>
    </main>
  );
}

function Stepper({ current, labels }: { current: number; labels: string[] }) {
  const pct = Math.round(((current + 1) / labels.length) * 100);
  return (
    <div>
      <div className="mb-2 flex items-baseline justify-between">
        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Step {current + 1} of {labels.length}
        </span>
        <span className="text-xs font-semibold text-primary" aria-live="polite">
          {pct}%
        </span>
      </div>
      <div
        className="flex items-center gap-1.5"
        role="progressbar"
        aria-valuenow={pct}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`Onboarding progress: ${pct}%`}
      >
        {labels.map((l, i) => (
          <div key={l} className="flex-1">
            <div
              className={`h-1.5 rounded-full transition-colors ${
                i <= current ? "bg-primary" : "bg-card"
              }`}
            />
            <div
              className={`mt-1.5 text-[10px] font-medium uppercase tracking-wider ${
                i === current ? "text-foreground" : "text-muted-foreground"
              }`}
            >
              {l}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function AgeStep({
  dob,
  setDob,
  age,
  isAdult,
}: {
  dob: string;
  setDob: (v: string) => void;
  age: number | null;
  isAdult: boolean;
}) {
  return (
    <div>
      <h1 className="font-display text-2xl font-semibold">How old are you?</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        DoseRoutine is a health, fitness and longevity routine tracker for adults 18 and over. We
        use this to keep the app age-appropriate.
      </p>
      <label className="mt-6 block text-sm font-medium">Date of birth</label>
      <input
        type="date"
        value={dob}
        onChange={(e) => setDob(e.target.value)}
        max={todayInBrowserZone()}
        className="tap-target mt-2 w-full rounded-xl border border-border bg-background px-4 text-base text-foreground focus:border-primary focus:outline-none"
      />
      {age !== null && (
        <p
          className={`mt-3 text-sm ${isAdult ? "text-muted-foreground" : "text-[color:var(--severity-avoid)]"}`}
        >
          {isAdult ? `You're ${age}. Welcome.` : `You must be 18 or older to use DoseRoutine.`}
        </p>
      )}
    </div>
  );
}

function ConsentStep({
  consent,
  setConsent,
}: {
  consent: boolean;
  setConsent: (v: boolean) => void;
}) {
  return (
    <div>
      <h1 className="font-display text-2xl font-semibold">Not medical advice</h1>
      <p className="mt-2 text-sm text-muted-foreground">Please read and agree before continuing.</p>
      <div className="mt-5 max-h-72 overflow-y-auto rounded-xl bg-card p-4 text-sm leading-relaxed text-foreground">
        <p>
          <strong>DoseRoutine is an educational tool.</strong> It is not a medical device and does
          not provide medical, diagnostic, or treatment advice.
        </p>
        <p className="mt-3">
          Nothing shown in this app — including safety warnings, timing suggestions, or reference
          intake ranges — is a prescription or a recommendation to take, stop, or change any
          substance. <strong>You enter every dose yourself.</strong> DoseRoutine never suggests a
          dose for prescription or controlled compounds.
        </p>
        <p className="mt-3">
          Always consult a qualified clinician who knows your full medical history before starting,
          stopping, or changing any supplement, peptide, hormone, or medication. If you may be
          pregnant or nursing, or you have a medical condition, do not use this app to make health
          decisions on your own.
        </p>
        <p className="mt-3">
          By continuing you confirm you understand these terms and agree to the Terms of Service and
          Privacy Policy.
        </p>
      </div>
      <label className="mt-5 flex cursor-pointer items-start gap-3 rounded-xl bg-card p-4">
        <input
          type="checkbox"
          checked={consent}
          onChange={(e) => setConsent(e.target.checked)}
          className="mt-0.5 h-5 w-5 rounded border-border accent-[color:var(--primary)]"
        />
        <span className="text-sm text-foreground">
          I understand DoseRoutine is educational and not medical advice, and I agree to the Terms.
        </span>
      </label>
    </div>
  );
}

function StatsStep(props: {
  sex: Sex | "";
  setSex: (v: Sex) => void;
  unitPref: UnitPref;
  setUnitPref: (v: UnitPref) => void;
  heightCm: string;
  setHeightCm: (v: string) => void;
  heightFt: string;
  setHeightFt: (v: string) => void;
  heightIn: string;
  setHeightIn: (v: string) => void;
  weight: string;
  setWeight: (v: string) => void;
  timezone: string;
  onSkip: () => void;
}) {
  const {
    sex,
    setSex,
    unitPref,
    setUnitPref,
    heightCm,
    setHeightCm,
    heightFt,
    setHeightFt,
    heightIn,
    setHeightIn,
    weight,
    setWeight,
    timezone,
    onSkip,
  } = props;
  return (
    <div>
      <h1 className="font-display text-2xl font-semibold">About you</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Helps tailor timing and reference ranges. Stored privately.
      </p>

      <label className="mt-6 block text-sm font-medium">Sex</label>
      <div className="mt-2 grid grid-cols-2 gap-2">
        {(["male", "female", "other", "prefer_not"] as Sex[]).map((s) => (
          <button
            key={s}
            onClick={() => setSex(s)}
            aria-label={`Select sex: ${s.replace(/_/g, " ")}`}
            aria-pressed={sex === s}
            className={`tap-target rounded-xl border px-3 text-sm font-medium capitalize transition-colors ${
              sex === s
                ? "border-primary bg-primary/10 text-foreground"
                : "border-border bg-background text-muted-foreground"
            }`}
          >
            {s.replace(/_/g, " ")}
          </button>
        ))}
      </div>

      <div className="mt-6 flex items-center justify-between">
        <label className="text-sm font-medium">Units</label>
        <div className="inline-flex rounded-lg bg-card p-1 text-xs font-medium">
          {(["imperial", "metric"] as UnitPref[]).map((u) => (
            <button
              key={u}
              onClick={() => setUnitPref(u)}
              aria-label={`Use ${u} units`}
              aria-pressed={unitPref === u}
              className={`rounded-md px-3 py-1.5 capitalize ${
                unitPref === u ? "bg-background text-foreground shadow-sm" : "text-muted-foreground"
              }`}
            >
              {u}
            </button>
          ))}
        </div>
      </div>

      <label className="mt-4 block text-sm font-medium">Height</label>
      {unitPref === "metric" ? (
        <div className="mt-2 flex items-center gap-2">
          <input
            type="number"
            inputMode="numeric"
            placeholder="cm"
            value={heightCm}
            onChange={(e) => setHeightCm(e.target.value)}
            className="tap-target w-full rounded-xl border border-border bg-background px-4 text-base focus:border-primary focus:outline-none"
          />
          <span className="text-sm text-muted-foreground">cm</span>
        </div>
      ) : (
        <div className="mt-2 flex items-center gap-2">
          <input
            type="number"
            inputMode="numeric"
            placeholder="ft"
            value={heightFt}
            onChange={(e) => setHeightFt(e.target.value)}
            className="tap-target w-24 rounded-xl border border-border bg-background px-4 text-base focus:border-primary focus:outline-none"
          />
          <span className="text-sm text-muted-foreground">ft</span>
          <input
            type="number"
            inputMode="numeric"
            placeholder="in"
            value={heightIn}
            onChange={(e) => setHeightIn(e.target.value)}
            className="tap-target w-24 rounded-xl border border-border bg-background px-4 text-base focus:border-primary focus:outline-none"
          />
          <span className="text-sm text-muted-foreground">in</span>
        </div>
      )}

      <label className="mt-4 block text-sm font-medium">Weight</label>
      <div className="mt-2 flex items-center gap-2">
        <input
          type="number"
          inputMode="decimal"
          placeholder={unitPref === "metric" ? "kg" : "lb"}
          value={weight}
          onChange={(e) => setWeight(e.target.value)}
          className="tap-target w-full rounded-xl border border-border bg-background px-4 text-base focus:border-primary focus:outline-none"
        />
        <span className="text-sm text-muted-foreground">{unitPref === "metric" ? "kg" : "lb"}</span>
      </div>

      <p className="mt-5 text-xs text-muted-foreground">Timezone detected: {timezone}</p>

      <button
        type="button"
        onClick={onSkip}
        className="mt-6 text-sm text-muted-foreground underline underline-offset-2 hover:text-foreground"
      >
        Skip for now — I'll add this later
      </button>
    </div>
  );
}

function FocusStep({ tier, setTier }: { tier: Tier | ""; setTier: (v: Tier) => void }) {
  return (
    <div>
      <h1 className="font-display text-2xl font-semibold">What's your focus?</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        We'll tailor the library and defaults. You can change this later.
      </p>
      <div className="mt-6 space-y-2">
        {TIER_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            onClick={() => setTier(opt.value)}
            className={`w-full rounded-xl border p-4 text-left transition-colors ${
              tier === opt.value
                ? "border-primary bg-primary/10"
                : "border-border bg-background hover:bg-card"
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="font-display text-base font-semibold">{opt.title}</span>
              {tier === opt.value && <Check className="h-4 w-4 text-primary" />}
            </div>
            <p className="mt-1 text-sm text-muted-foreground">{opt.body}</p>
          </button>
        ))}
      </div>
    </div>
  );
}

function GoalsStep({ goals, toggle }: { goals: string[]; toggle: (g: string) => void }) {
  return (
    <div>
      <h1 className="font-display text-2xl font-semibold">Your goals</h1>
      <p className="mt-2 text-sm text-muted-foreground">Pick one or more.</p>
      <div className="mt-6 flex flex-wrap gap-2">
        {GOAL_OPTIONS.map((g) => {
          const on = goals.includes(g);
          return (
            <button
              key={g}
              onClick={() => toggle(g)}
              className={`tap-target rounded-full border px-4 text-sm font-medium transition-colors ${
                on
                  ? "border-primary bg-primary/10 text-foreground"
                  : "border-border bg-background text-muted-foreground"
              }`}
            >
              {g}
            </button>
          );
        })}
      </div>
    </div>
  );
}
