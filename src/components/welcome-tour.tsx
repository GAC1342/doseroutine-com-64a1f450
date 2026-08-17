import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  X,
  ArrowRight,
  ArrowLeft,
  Sparkles,
  Home,
  Layers,
  ShieldCheck,
  Clock,
  MoreHorizontal,
  BookOpen,
} from "lucide-react";
import { hapticTap } from "@/lib/haptics";
import { trackEvent } from "@/lib/analytics";
import { Card } from "@/components/ui/card";

const TOUR_KEY = "doseroutine_welcome_tour_v1";

type Step = {
  title: string;
  body: string;
  icon: React.ComponentType<{ className?: string }>;
  cta?: { label: string; to: string };
};

const STEPS: Step[] = [
  {
    title: "Welcome to DoseRoutine 👋",
    body: "Your health, fitness and longevity routine tracker. Here's a quick 60-second tour so you know where everything is — you can replay it anytime from Help.",
    icon: Sparkles,
  },
  {
    title: "Today",
    body: "Your daily dose ribbon. Tap ✓ to mark taken, or swipe to skip. Streaks and adherence show here.",
    icon: Home,
    cta: { label: "Open Today", to: "/today" },
  },
  {
    title: "Stack",
    body: "Add compounds, set doses, and pick times. Use quick templates like 'Once daily' or 'AM + PM' to save taps.",
    icon: Layers,
    cta: { label: "Open Stack", to: "/stack" },
  },
  {
    title: "Safety",
    body: "Interaction checker, side-effect journal, and labs — everything that keeps your protocol safe.",
    icon: ShieldCheck,
    cta: { label: "Open Safety", to: "/safety" },
  },
  {
    title: "Timeline",
    body: "See every dose you've logged, mark missed ones, and export your data whenever you need it.",
    icon: Clock,
    cta: { label: "Open Timeline", to: "/timeline" },
  },
  {
    title: "More",
    body: "Templates, vial inventory, refill predictions, progress photos, cost tracker, cycles — all the extras live here.",
    icon: MoreHorizontal,
    cta: { label: "Open More", to: "/more" },
  },
  {
    title: "Help Center",
    body: "Stuck? The Help Center has clear, simple guides for every feature. Tap the (?) buttons anywhere in the app.",
    icon: BookOpen,
    cta: { label: "Open Help", to: "/help" },
  },
];

export function WelcomeTour({ forceOpen, onClose }: { forceOpen?: boolean; onClose?: () => void }) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (forceOpen) {
      setOpen(true);
      setStep(0);
      return;
    }
    try {
      if (!localStorage.getItem(TOUR_KEY)) {
        setOpen(true);
        trackEvent("welcome_tour_started", {});
      }
    } catch {}
  }, [forceOpen]);

  function finish() {
    try {
      localStorage.setItem(TOUR_KEY, new Date().toISOString());
    } catch {}
    trackEvent("welcome_tour_completed", { step });
    setOpen(false);
    onClose?.();
  }

  function skip() {
    try {
      localStorage.setItem(TOUR_KEY, new Date().toISOString());
    } catch {}
    trackEvent("welcome_tour_skipped", { step });
    setOpen(false);
    onClose?.();
  }

  if (!open) return null;
  const s = STEPS[step];
  const Icon = s.icon;
  const isLast = step === STEPS.length - 1;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="tour-title"
    >
      <Card className="w-full max-w-md rounded-2xl border-border shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-5 pt-4">
          <div className="text-xs text-muted-foreground">
            Step {step + 1} of {STEPS.length}
          </div>
          <button
            onClick={() => {
              hapticTap();
              skip();
            }}
            className="p-2 -mr-2 text-muted-foreground hover:text-foreground"
            aria-label="Close tour"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="px-5 pb-5 pt-3">
          <div className="w-12 h-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center mb-3">
            <Icon className="w-6 h-6" />
          </div>
          <h2 id="tour-title" className="text-xl font-semibold mb-2">
            {s.title}
          </h2>
          <p className="text-sm text-muted-foreground leading-relaxed">{s.body}</p>

          <div className="mt-4 flex gap-1.5">
            {STEPS.map((_, i) => (
              <div
                key={i}
                className={`h-1 flex-1 rounded-full ${i <= step ? "bg-primary" : "bg-muted"}`}
              />
            ))}
          </div>

          <div className="mt-5 flex items-center justify-between gap-2">
            <button
              onClick={() => {
                hapticTap();
                setStep((v) => Math.max(0, v - 1));
              }}
              disabled={step === 0}
              className="min-h-11 px-3 rounded-lg text-sm text-muted-foreground disabled:opacity-30 flex items-center gap-1"
            >
              <ArrowLeft className="w-4 h-4" /> Back
            </button>

            <div className="flex items-center gap-2">
              {s.cta && !isLast ? (
                <Link
                  to={s.cta.to}
                  onClick={() => {
                    hapticTap();
                    finish();
                  }}
                  className="min-h-11 px-3 rounded-lg text-sm border border-border hover:bg-muted"
                >
                  {s.cta.label}
                </Link>
              ) : null}
              <button
                onClick={() => {
                  hapticTap();
                  if (isLast) finish();
                  else setStep((v) => Math.min(STEPS.length - 1, v + 1));
                }}
                className="min-h-11 px-4 rounded-lg text-sm bg-primary text-primary-foreground font-medium flex items-center gap-1"
              >
                {isLast ? "Finish" : "Next"}
                {!isLast && <ArrowRight className="w-4 h-4" />}
              </button>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}

export function resetWelcomeTour() {
  try {
    localStorage.removeItem(TOUR_KEY);
  } catch {}
}
