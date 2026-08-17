import { useEffect, useState } from "react";
import { Camera, Check, HelpCircle, PencilLine, X } from "lucide-react";
import { Button } from "@/components/ui/button";

const STORAGE_KEY = "meal-howto-dismissed";

const STEPS = [
  {
    icon: Camera,
    title: "1. Tap “Add my meal”",
    body: "Your camera opens. Take the photo straight down, with the whole plate or the nutrition label in frame.",
  },
  {
    icon: PencilLine,
    title: "2. Check and edit",
    body: "We show what we think it is plus calories, protein, carbs and fat. Tap any number to change it, or use 0.5x / 2x for a smaller or bigger portion.",
  },
  {
    icon: Check,
    title: "3. Save it",
    body: "Nothing is logged until you press Save meal. It then shows up in your day total and timeline.",
  },
] as const;

/**
 * First-run instructions for the meal scanner. Dismissed state is remembered
 * per device; the header keeps a "How it works" link to bring it back.
 */
export function MealHowToCard({ className = "" }: { className?: string }) {
  const [open, setOpen] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    // Read after hydration so SSR markup and first client render match.
    try {
      setOpen(window.localStorage.getItem(STORAGE_KEY) !== "1");
    } catch {
      setOpen(true);
    }
    setReady(true);
  }, []);

  function dismiss() {
    setOpen(false);
    try {
      window.localStorage.setItem(STORAGE_KEY, "1");
    } catch {
      // Preference is a nicety; ignore storage failures.
    }
  }

  if (!ready) return null;

  if (!open) {
    return (
      <div className={className}>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="text-muted-foreground"
          onClick={() => setOpen(true)}
        >
          <HelpCircle className="mr-2 h-4 w-4" />
          How meal scanning works
        </Button>
      </div>
    );
  }

  return (
    <section
      className={`rounded-2xl border border-border bg-card p-4 ${className}`}
      aria-label="How meal scanning works"
    >
      <div className="flex items-start justify-between gap-3">
        <h2 className="text-sm font-semibold">How meal scanning works</h2>
        <button
          type="button"
          aria-label="Hide these instructions"
          onClick={dismiss}
          className="tap-target -mr-1 -mt-1 inline-flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
      <ol className="mt-3 space-y-3">
        {STEPS.map((step) => (
          <li key={step.title} className="flex gap-3">
            <span className="mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
              <step.icon className="h-4 w-4" />
            </span>
            <div className="min-w-0">
              <p className="text-sm font-medium">{step.title}</p>
              <p className="text-xs text-muted-foreground">{step.body}</p>
            </div>
          </li>
        ))}
      </ol>
      <p className="mt-3 text-xs text-muted-foreground">
        Tip: a barcode in the shot is used first — that pulls the manufacturer&apos;s published
        numbers instead of an estimate.
      </p>
      <Button type="button" size="sm" variant="outline" className="mt-3" onClick={dismiss}>
        Got it
      </Button>
    </section>
  );
}
