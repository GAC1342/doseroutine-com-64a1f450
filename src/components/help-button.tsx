import { useState } from "react";
import { HelpCircle, Sparkles } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { HELP, type HelpArticle } from "@/lib/help-articles";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

type Variant = "pill" | "fab";

type Props = {
  articleKey: keyof typeof HELP;
  label?: string;
  variant?: Variant;
};

export function HelpButton({ articleKey, label = "How do I use this?", variant = "pill" }: Props) {
  const [open, setOpen] = useState(false);
  const article: HelpArticle | undefined = HELP[articleKey];
  if (!article) return null;

  const triggerClass =
    variant === "fab"
      ? "tap-target fixed z-40 right-4 bottom-[calc(4.5rem+env(safe-area-inset-bottom))] md:bottom-6 inline-flex items-center gap-2 rounded-full bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground shadow-lg hover:opacity-95 active:scale-95 transition"
      : "tap-target inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground";

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <button type="button" className={triggerClass} aria-label={label}>
          <HelpCircle className={variant === "fab" ? "h-4 w-4" : "h-3.5 w-3.5"} />
          {variant === "fab" ? "How to use" : label}
        </button>
      </SheetTrigger>
      <SheetContent side="bottom" className="max-h-[85vh] overflow-y-auto rounded-t-3xl">
        <SheetHeader className="text-left">
          <SheetTitle className="font-display text-2xl">{article.title}</SheetTitle>
          <SheetDescription className="text-base text-foreground">
            {article.summary}
          </SheetDescription>
        </SheetHeader>
        <div className="mt-6 space-y-6">
          <div>
            <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Steps
            </h3>
            <ol className="space-y-2">
              {article.steps.map((step, i) => (
                <li key={i} className="flex gap-3 text-base leading-relaxed">
                  <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                    {i + 1}
                  </span>
                  <span>{step}</span>
                </li>
              ))}
            </ol>
          </div>
          {article.tips && article.tips.length > 0 && (
            <div>
              <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                Tips
              </h3>
              <ul className="space-y-1.5">
                {article.tips.map((tip, i) => (
                  <li key={i} className="text-sm leading-relaxed text-muted-foreground">
                    • {tip}
                  </li>
                ))}
              </ul>
            </div>
          )}
          <Link
            to="/chat"
            onClick={() => setOpen(false)}
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-primary/40 bg-primary/5 py-3 text-center text-sm font-semibold text-primary hover:bg-primary/10"
          >
            <Sparkles className="h-4 w-4" /> Ask the AI Coach about this
          </Link>
          <Link
            to="/help"
            onClick={() => setOpen(false)}
            className="block w-full rounded-xl bg-primary py-3 text-center text-sm font-semibold text-primary-foreground"
          >
            Browse all help topics →
          </Link>
        </div>
      </SheetContent>
    </Sheet>
  );
}
