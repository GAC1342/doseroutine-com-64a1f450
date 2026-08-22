import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { STACK_TEMPLATES, type StackTemplate } from "@/lib/stack-templates";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { ArrowLeft, Sparkles, AlertTriangle, Check } from "lucide-react";
import { toast } from "sonner";
import { routeErrorComponent } from "@/components/route-error-panel";

export const Route = createFileRoute("/_authenticated/templates")({
  errorComponent: routeErrorComponent("templates"),
  head: () => ({
    meta: [
      { title: "Stack Templates — DoseRoutine" },
      {
        name: "description",
        content:
          "Starter protocols for TRT, GLP-1 titration, BPC-157 healing, NAD+, longevity, sleep and more. One-tap import into your stack.",
      },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: TemplatesPage,
});

function TemplatesPage() {
  const [open, setOpen] = useState<StackTemplate | null>(null);
  const navigate = useNavigate();

  const importTemplate = async (tpl: StackTemplate) => {
    const { data: userRes } = await supabase.auth.getUser();
    const uid = userRes.user?.id;
    if (!uid) {
      toast.error("Please sign in");
      return;
    }
    // Resolve slugs → compound ids
    const slugs = tpl.items.map((i) => i.slug);
    const { data: compounds, error } = await supabase
      .from("compounds")
      .select("id, slug")
      .in("slug", slugs);
    if (error) {
      toast.error(error.message);
      return;
    }
    const map = new Map(compounds!.map((c) => [c.slug, c.id]));
    const rows = tpl.items
      .filter((i) => map.has(i.slug))
      .map((i) => {
        // Map template frequency to DB enum ('daily'|'weekly'|'custom')
        const dbFreq: "daily" | "weekly" | "custom" =
          i.frequency === "daily" ? "daily" : i.frequency === "as_needed" ? "custom" : "weekly"; // weekly + twice_weekly both map to weekly with days
        return {
          user_id: uid,
          compound_id: map.get(i.slug)!,
          custom_name: null,
          custom_category: null,
          dose_amount: i.dose,
          dose_unit: i.unit as "g" | "iu" | "mcg" | "mg" | "ml",
          frequency: dbFreq,
          days_of_week: dbFreq === "weekly" ? (i.days ?? [1]) : null,
          times_of_day: i.times,
          with_food: i.with_food ?? false,
          notes: i.notes ?? null,
          active: true,
        };
      });
    if (rows.length === 0) {
      toast.error("No compatible compounds found");
      return;
    }
    const { error: insErr } = await supabase.from("user_compounds").insert(rows);
    if (insErr) {
      toast.error(insErr.message);
      return;
    }
    try {
      const { generateScheduleForCurrentUser } = await import("@/lib/schedule");
      await generateScheduleForCurrentUser(7);
    } catch (e) {
      console.warn("schedule regen failed", e);
    }
    toast.success(`Added ${rows.length} compound${rows.length === 1 ? "" : "s"} to your stack`);
    setOpen(null);
    navigate({ to: "/stack" });
  };

  const grouped = STACK_TEMPLATES.reduce<Record<string, StackTemplate[]>>((acc, t) => {
    (acc[t.category] ??= []).push(t);
    return acc;
  }, {});

  return (
    <div className="mx-auto max-w-3xl px-4 pb-24 pt-6">
      <Link
        to="/more"
        className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Back
      </Link>

      <div className="mb-6 flex items-center gap-3">
        <div className="rounded-xl bg-primary/10 p-3">
          <Sparkles className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Stack Templates</h1>
          <p className="text-sm text-muted-foreground">
            Starter protocols — tap to preview, edit anything after import
          </p>
        </div>
      </div>

      {Object.entries(grouped).map(([cat, list]) => (
        <section key={cat} className="mb-6">
          <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {cat}
          </h2>
          <div className="grid gap-2 sm:grid-cols-2">
            {list.map((t) => (
              <button
                key={t.id}
                onClick={() => setOpen(t)}
                className="group flex flex-col rounded-xl border border-border bg-card p-4 text-left transition-all hover:border-primary/40 hover:shadow-sm"
              >
                <div className="mb-2 flex items-center gap-2">
                  <span className="text-2xl leading-none">{t.emoji}</span>
                  <span className="text-sm font-semibold">{t.name}</span>
                </div>
                <p className="text-xs text-muted-foreground">{t.tagline}</p>
                <div className="mt-3 text-xs text-primary">
                  {t.items.length} compound{t.items.length === 1 ? "" : "s"} →
                </div>
              </button>
            ))}
          </div>
        </section>
      ))}

      <p className="mt-4 rounded-lg border border-dashed border-border p-3 text-xs text-muted-foreground">
        Templates are conservative starting points, not medical advice. Review every compound with a
        qualified health professional and titrate to your labs.
      </p>

      {open && (
        <Sheet open onOpenChange={(o) => !o && setOpen(null)}>
          <SheetContent side="bottom" className="max-h-[85vh] overflow-y-auto">
            <SheetHeader>
              <SheetTitle className="flex items-center gap-2">
                <span className="text-2xl">{open.emoji}</span> {open.name}
              </SheetTitle>
            </SheetHeader>
            <p className="mt-3 text-sm text-muted-foreground">{open.description}</p>
            {open.disclaimer && (
              <div className="mt-3 flex gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-900 dark:text-amber-200">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                <span>{open.disclaimer}</span>
              </div>
            )}
            <div className="mt-4 space-y-2">
              {open.items.map((i, idx) => (
                <div key={idx} className="rounded-lg border border-border bg-card p-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-medium capitalize">
                      {i.slug.replace(/-/g, " ")}
                    </span>
                    <span className="text-sm tabular-nums text-primary">
                      {i.dose} {i.unit}
                    </span>
                  </div>
                  <div className="mt-1 text-xs text-muted-foreground">
                    {i.frequency.replace("_", " ")} · {i.times.join(", ")}
                    {i.with_food ? " · with food" : ""}
                  </div>
                  {i.notes && (
                    <div className="mt-1 text-xs italic text-muted-foreground">{i.notes}</div>
                  )}
                </div>
              ))}
            </div>
            <Button className="mt-5 w-full" onClick={() => importTemplate(open)}>
              <Check className="mr-1 h-4 w-4" /> Add to my stack
            </Button>
            <p className="mt-2 text-center text-xs text-muted-foreground">
              You can edit doses, times, and remove anything after import.
            </p>
          </SheetContent>
        </Sheet>
      )}
    </div>
  );
}
