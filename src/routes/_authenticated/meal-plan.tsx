import { useEffect, useMemo, useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ChevronLeft,
  ChevronRight,
  Copy,
  Download,
  FileText,
  Loader2,
  Pencil,
  Plus,
  Share2,
  Trash2,
  Undo2,
  Upload,
  FileSpreadsheet,
} from "lucide-react";
import { isNative } from "@/lib/platform";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { supabase } from "@/integrations/supabase/client";
import { buildGroceryList, groceryListToText, type GroceryLine } from "@/lib/grocery-list";
import {
  downloadFile,
  groceryListToCsv,
  groceryListToPrintHtml,
  printGroceryList,
  groceryShareText,
  shareGroceryListText,
  quantityText,
} from "@/lib/grocery-export";
import {
  groceryImportTemplate,
  groceryTemplateFromList,
  parseGroceryCsv,
  planGroceryImport,
  type GroceryImportResult,
  type GroceryImportRow,
} from "@/lib/grocery-import";
import { MEAL_SLOTS, MEAL_SLOT_LABELS, type MealItem, type MealSlot } from "@/lib/meal-nutrition";
import { LoadingStatus } from "@/components/skeletons";
import { routeErrorComponent } from "@/components/route-error-panel";

export const Route = createFileRoute("/_authenticated/meal-plan")({
  errorComponent: routeErrorComponent("meal-plan"),
  head: () => ({
    meta: [
      { title: "Weekly Meal Planner — DoseRoutine" },
      {
        name: "description",
        content:
          "Plan the week's meals from what you already log, then turn the plan into a grocery list you can copy in one tap.",
      },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: MealPlanPage,
});

type PlanSlot = {
  id: string;
  planned_on: string;
  meal_slot: string;
  label: string;
  calories: number | null;
  protein_g: number | null;
  items: unknown;
};

type RecentMeal = {
  id: string;
  label: string | null;
  meal_slot: string | null;
  source: string | null;
  barcode: string | null;
  ai_items: unknown;
  logged_at: string;
  adj_calories: number | null;
  adj_protein_g: number | null;
  adj_carbs_g: number | null;
  adj_fat_g: number | null;
  est_calories: number | null;
  est_protein_g: number | null;
  est_carbs_g: number | null;
  est_fat_g: number | null;
};

const SLOTS = MEAL_SLOTS.filter((s) => s !== "other") as MealSlot[];

function dayKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** Monday-start week containing the given date. */
function weekStart(d: Date) {
  const copy = new Date(d);
  const shift = (copy.getDay() + 6) % 7;
  copy.setDate(copy.getDate() - shift);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

function addDays(key: string, n: number) {
  const d = new Date(`${key}T00:00:00`);
  d.setDate(d.getDate() + n);
  return dayKey(d);
}

function macro(row: RecentMeal, key: "calories" | "protein_g" | "carbs_g" | "fat_g") {
  return Number(row[`adj_${key}` as const] ?? row[`est_${key}` as const] ?? 0);
}

function itemsOf(value: unknown): MealItem[] {
  return Array.isArray(value) ? (value as MealItem[]) : [];
}

type GroceryOverride = {
  id: string;
  name: string;
  quantity: string | null;
  checked: boolean;
  is_custom: boolean;
  hidden: boolean;
};

/** A grocery row after user edits are folded into the generated list. */
type MergedGroceryLine = GroceryLine & {
  checked: boolean;
  isCustom: boolean;
  /** User-typed quantity that replaces the generated one. */
  override: string | null;
};

function MealPlanPage() {
  const [start, setStart] = useState(() => dayKey(weekStart(new Date())));
  const [picker, setPicker] = useState<{ day: string; slot: MealSlot } | null>(null);
  const [editing, setEditing] = useState<PlanSlot | null>(null);
  const [newItem, setNewItem] = useState("");

  const [query, setQuery] = useState("");
  const queryClient = useQueryClient();

  const days = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(start, i)), [start]);
  const end = days[6]!;

  const planQuery = useQuery({
    queryKey: ["meal-plan", start],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("meal_plan_slots")
        .select("id,planned_on,meal_slot,label,calories,protein_g,items")
        .gte("planned_on", start)
        .lte("planned_on", end)
        .order("planned_on", { ascending: true });
      if (error) throw error;
      return (data ?? []) as PlanSlot[];
    },
  });

  const recentQuery = useQuery({
    queryKey: ["meal-plan-recent"],
    queryFn: async () => {
      const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
      const { data, error } = await supabase
        .from("meals")
        .select(
          "id,label,meal_slot,source,barcode,ai_items,logged_at,adj_calories,adj_protein_g,adj_carbs_g,adj_fat_g,est_calories,est_protein_g,est_carbs_g,est_fat_g",
        )
        .gte("logged_at", since)
        .order("logged_at", { ascending: false })
        .limit(150);
      if (error) throw error;
      return (data ?? []) as RecentMeal[];
    },
    staleTime: 60_000,
  });

  /** Daily calorie/protein targets so each planned day can show the gap. */
  const targetsQuery = useQuery({
    queryKey: ["meal-plan-targets"],
    queryFn: async () => {
      const { data: auth } = await supabase.auth.getUser();
      const uid = auth.user?.id;
      if (!uid) return { calories: null, protein: null };
      const { data } = await supabase
        .from("profiles")
        .select("target_calories,target_protein_g")
        .eq("id", uid)
        .maybeSingle();
      return {
        calories: data?.target_calories ?? null,
        protein: data?.target_protein_g ?? null,
      };
    },
    staleTime: 5 * 60_000,
  });

  const overridesQuery = useQuery({
    queryKey: ["grocery-overrides", start],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("grocery_list_overrides")
        .select("id,name,quantity,checked,is_custom,hidden")
        .eq("week_start", start);
      if (error) throw error;
      return (data ?? []) as GroceryOverride[];
    },
  });

  const saveOverride = useMutation({
    mutationFn: async (input: {
      name: string;
      quantity?: string | null;
      checked?: boolean;
      hidden?: boolean;
      isCustom?: boolean;
    }) => {
      const { data: auth } = await supabase.auth.getUser();
      const uid = auth.user?.id;
      if (!uid) throw new Error("Not signed in");
      const existing = (overridesQuery.data ?? []).find((o) => o.name === input.name);
      const { error } = await supabase.from("grocery_list_overrides").upsert(
        {
          user_id: uid,
          week_start: start,
          name: input.name,
          quantity: input.quantity !== undefined ? input.quantity : (existing?.quantity ?? null),
          checked: input.checked ?? existing?.checked ?? false,
          hidden: input.hidden ?? existing?.hidden ?? false,
          is_custom: input.isCustom ?? existing?.is_custom ?? false,
        },
        { onConflict: "user_id,week_start,name" },
      );
      if (error) throw error;
    },
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["grocery-overrides", start] }),
    onError: (e) => toast.error(e instanceof Error ? e.message : "Could not save that change"),
  });

  const deleteOverride = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("grocery_list_overrides").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["grocery-overrides", start] }),
  });

  /** Edit a planned meal: name, macros, and which day/slot it sits in. */
  const updateSlot = useMutation({
    mutationFn: async (input: {
      id: string;
      label: string;
      calories: number;
      protein_g: number;
      planned_on: string;
      meal_slot: string;
    }) => {
      const { id, ...patch } = input;
      const { error } = await supabase.from("meal_plan_slots").update(patch).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      setEditing(null);
      toast.success("Plan updated");
      void queryClient.invalidateQueries({ queryKey: ["meal-plan", start] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Could not update that meal"),
  });

  /** One card per distinct meal name, newest example wins. */
  const choices = useMemo(() => {
    const byLabel = new Map<string, RecentMeal>();
    for (const row of recentQuery.data ?? []) {
      const key = (row.label ?? "Meal").trim().toLowerCase();
      if (!byLabel.has(key)) byLabel.set(key, row);
    }
    const list = [...byLabel.values()];
    const q = query.trim().toLowerCase();
    return q ? list.filter((r) => (r.label ?? "").toLowerCase().includes(q)) : list;
  }, [recentQuery.data, query]);

  const addSlot = useMutation({
    mutationFn: async (input: { day: string; slot: MealSlot; meal: RecentMeal }) => {
      const { data: auth } = await supabase.auth.getUser();
      const uid = auth.user?.id;
      if (!uid) throw new Error("Not signed in");
      const { error } = await supabase.from("meal_plan_slots").insert({
        user_id: uid,
        planned_on: input.day,
        meal_slot: input.slot,
        label: input.meal.label ?? "Meal",
        calories: macro(input.meal, "calories"),
        protein_g: macro(input.meal, "protein_g"),
        carbs_g: macro(input.meal, "carbs_g"),
        fat_g: macro(input.meal, "fat_g"),
        items: itemsOf(input.meal.ai_items) as unknown as never,
        source_meal_id: input.meal.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      setPicker(null);
      void queryClient.invalidateQueries({ queryKey: ["meal-plan", start] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Could not add that meal"),
  });

  const removeSlot = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("meal_plan_slots").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["meal-plan", start] }),
    onError: (e) => toast.error(e instanceof Error ? e.message : "Could not remove that meal"),
  });

  /** Copy a planned slot into the real food log for its planned day. */
  const logSlot = useMutation({
    mutationFn: async (slot: PlanSlot) => {
      const { data: auth } = await supabase.auth.getUser();
      const uid = auth.user?.id;
      if (!uid) throw new Error("Not signed in");
      const now = new Date();
      const loggedAt = new Date(
        `${slot.planned_on}T${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}:00`,
      );
      const { data, error } = await supabase
        .from("meals")
        .insert({
          user_id: uid,
          label: slot.label,
          meal_slot: slot.meal_slot,
          source: "manual",
          ai_items: itemsOf(slot.items) as unknown as never,
          est_calories: slot.calories ?? 0,
          est_protein_g: slot.protein_g ?? 0,
          adj_calories: slot.calories ?? 0,
          adj_protein_g: slot.protein_g ?? 0,
          was_adjusted: false,
          logged_at: loggedAt.toISOString(),
        })
        .select("id")
        .single();
      if (error) throw error;
      await supabase.from("meal_plan_slots").update({ logged_meal_id: data.id }).eq("id", slot.id);
    },
    onSuccess: () => {
      toast.success("Added to your food log");
      void queryClient.invalidateQueries({ queryKey: ["meals"] });
      void queryClient.invalidateQueries({ queryKey: ["meal-plan", start] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Could not log that meal"),
  });

  const plan = useMemo(() => planQuery.data ?? [], [planQuery.data]);
  const targets = targetsQuery.data ?? { calories: null, protein: null };

  /** Generated list plus the user's own edits, hidden rows dropped. */
  const grocery = useMemo<MergedGroceryLine[]>(() => {
    const overrides = overridesQuery.data ?? [];
    const byName = new Map(overrides.map((o) => [o.name, o]));
    const generated = buildGroceryList(plan.map((s) => itemsOf(s.items)))
      .filter((line) => !byName.get(line.name)?.hidden)
      .map((line) => {
        const o = byName.get(line.name);
        return {
          ...line,
          checked: o?.checked ?? false,
          isCustom: false,
          override: o?.quantity ?? null,
        };
      });
    const generatedNames = new Set(generated.map((l) => l.name));
    const custom = overrides
      .filter((o) => o.is_custom && !o.hidden && !generatedNames.has(o.name))
      .map((o) => ({
        name: o.name,
        portions: 1,
        grams: null,
        notes: [],
        checked: o.checked,
        isCustom: true,
        override: o.quantity,
      }));
    return [...generated, ...custom];
  }, [plan, overridesQuery.data]);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importPreview, setImportPreview] = useState<GroceryImportResult | null>(null);
  const [importMode, setImportMode] = useState<"merge" | "replace_custom" | "replace_all">("merge");
  /** Snapshot of the week's list taken right before the last import. */
  const [undoSnapshot, setUndoSnapshot] = useState<GroceryOverride[] | null>(null);

  /** Put the week's list back exactly as it was before the last import. */
  const undoImport = useMutation({
    mutationFn: async (snapshot: GroceryOverride[]) => {
      const { data: auth } = await supabase.auth.getUser();
      const uid = auth.user?.id;
      if (!uid) throw new Error("Not signed in");
      const { error: delError } = await supabase
        .from("grocery_list_overrides")
        .delete()
        .eq("user_id", uid)
        .eq("week_start", start);
      if (delError) throw delError;
      if (snapshot.length > 0) {
        const { error } = await supabase.from("grocery_list_overrides").insert(
          snapshot.map((row) => ({
            user_id: uid,
            week_start: start,
            name: row.name,
            quantity: row.quantity,
            checked: row.checked,
            hidden: row.hidden,
            is_custom: row.is_custom,
          })),
        );
        if (error) throw error;
      }
    },
    onSuccess: () => {
      setUndoSnapshot(null);
      void queryClient.invalidateQueries({ queryKey: ["grocery-overrides", start] });
      toast.success("Import undone — your list is back to how it was");
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Could not undo that import"),
  });

  /** Fold an imported CSV into this week's grocery list. */
  const importList = useMutation({
    mutationFn: async (input: {
      rows: GroceryImportRow[];
      mode: "merge" | "replace_custom" | "replace_all";
    }) => {
      const { data: auth } = await supabase.auth.getUser();
      const uid = auth.user?.id;
      if (!uid) throw new Error("Not signed in");

      const snapshot = (overridesQuery.data ?? []).map((row) => ({ ...row }));
      const existingCustom = (overridesQuery.data ?? [])
        .filter((o) => o.is_custom && !o.hidden)
        .map((o) => o.name);
      const generatedForHide = grocery.filter((l) => !l.isCustom).map((l) => l.name);
      const plan = planGroceryImport(
        input.rows,
        grocery.map((line) => line.name),
        input.mode === "merge"
          ? {}
          : {
              removeMissingCustom: existingCustom,
              ...(input.mode === "replace_all" ? { hideMissingGenerated: generatedForHide } : {}),
            },
      );

      const generatedNames = new Set(
        grocery.filter((line) => !line.isCustom).map((line) => line.name),
      );
      const upserts = [
        ...[...plan.updates, ...plan.additions].map((row) => ({
          user_id: uid,
          week_start: start,
          name: row.name,
          quantity: row.quantity,
          checked: row.checked,
          hidden: false,
          is_custom: !generatedNames.has(row.name),
        })),
        ...plan.hides.map((name) => ({
          user_id: uid,
          week_start: start,
          name,
          quantity: null,
          checked: false,
          hidden: true,
          is_custom: false,
        })),
      ];

      if (upserts.length > 0) {
        const { error } = await supabase
          .from("grocery_list_overrides")
          .upsert(upserts, { onConflict: "user_id,week_start,name" });
        if (error) throw error;
      }

      if (plan.removals.length > 0) {
        const { error } = await supabase
          .from("grocery_list_overrides")
          .delete()
          .eq("week_start", start)
          .in("name", plan.removals);
        if (error) throw error;
      }

      return { plan, snapshot };
    },
    onSuccess: ({ plan, snapshot }) => {
      setImportPreview(null);
      void queryClient.invalidateQueries({ queryKey: ["grocery-overrides", start] });
      const parts = [
        `${plan.updates.length} updated`,
        `${plan.additions.length} added`,
        ...(plan.removals.length ? [`${plan.removals.length} removed`] : []),
        ...(plan.hides.length ? [`${plan.hides.length} hidden`] : []),
      ];
      setUndoSnapshot(snapshot);
      toast.success(`Grocery list imported — ${parts.join(", ")}`, {
        duration: 12000,
        action: { label: "Undo", onClick: () => undoImport.mutate(snapshot) },
      });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Could not import that file"),
  });

  const onImportFile = async (file: File | null | undefined) => {
    if (!file) return;
    if (file.size > 1_000_000) {
      toast.error("That file is too large to import");
      return;
    }
    const result = parseGroceryCsv(await file.text());
    setImportMode("merge");
    setImportPreview(result);
  };

  const copyList = async () => {
    try {
      const text = grocery
        .filter((line) => !line.checked)
        .map((line) =>
          line.override ? `- ${line.name} — ${line.override}` : groceryListToText([line]),
        )
        .join("\n");
      await navigator.clipboard.writeText(text);

      toast.success("Grocery list copied");
    } catch {
      toast.error("Copying isn't available on this device");
    }
  };

  const weekLabel = `Week of ${new Date(`${start}T00:00:00`).toLocaleDateString(undefined, {
    month: "long",
    day: "numeric",
    year: "numeric",
  })}`;

  const exportCsv = () => {
    downloadFile(`grocery-list-${start}.csv`, groceryListToCsv(grocery), "text/csv");
    toast.success("CSV downloaded");
  };

  const exportPdf = async () => {
    if (isNative()) {
      const result = await shareGroceryListText(groceryShareText(grocery, weekLabel));
      if (result === "shared") toast.success("Grocery list shared");
      else if (result === "copied") toast.success("Grocery list copied to your clipboard");
      else toast.error("Couldn't share the list — try the CSV export instead");
      return;
    }
    const opened = printGroceryList(
      groceryListToPrintHtml(grocery, { title: "Grocery list", weekLabel }),
    );
    if (opened) toast.success("Choose “Save as PDF” in the print dialog");
    else toast.error("Allow pop-ups for this site to print or save a PDF");
  };

  const downloadTemplate = () => {
    downloadFile("grocery-list-template.csv", groceryImportTemplate(), "text/csv");
    toast.success("Template downloaded — edit and re-import when ready");
  };

  const downloadPrefilledTemplate = () => {
    const csv = groceryTemplateFromList(
      grocery.map((line) => ({
        name: line.name,
        quantity: quantityText(line),
        checked: line.checked,
      })),
    );
    downloadFile(`grocery-list-editable-${start}.csv`, csv, "text/csv");
    toast.success(
      grocery.length === 0
        ? "List is empty — downloaded the blank template"
        : "Editable CSV downloaded — edit and re-import when ready",
    );
  };

  return (
    <div className="space-y-4 p-4 pb-24">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold">Weekly meal planner</h1>
        <p className="text-sm text-muted-foreground">
          Drop meals you already log into the week, then copy the grocery list.
        </p>
      </header>

      <div className="flex items-center justify-between gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setStart(addDays(start, -7))}
          aria-label="Previous week"
        >
          <ChevronLeft className="size-4" />
        </Button>
        <span className="text-sm font-medium">
          {new Date(`${start}T00:00:00`).toLocaleDateString(undefined, {
            month: "short",
            day: "numeric",
          })}{" "}
          –{" "}
          {new Date(`${end}T00:00:00`).toLocaleDateString(undefined, {
            month: "short",
            day: "numeric",
          })}
        </span>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setStart(addDays(start, 7))}
          aria-label="Next week"
        >
          <ChevronRight className="size-4" />
        </Button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {days.map((day) => {
          const daySlots = plan.filter((s) => s.planned_on === day);
          const kcal = daySlots.reduce((sum, s) => sum + Number(s.calories ?? 0), 0);
          const protein = daySlots.reduce((sum, s) => sum + Number(s.protein_g ?? 0), 0);
          return (
            <Card key={day}>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center justify-between text-base">
                  <span>
                    {new Date(`${day}T00:00:00`).toLocaleDateString(undefined, {
                      weekday: "short",
                      month: "short",
                      day: "numeric",
                    })}
                  </span>
                  <span className="text-xs font-normal text-muted-foreground">
                    {daySlots.length > 0
                      ? `${Math.round(kcal)} kcal · ${Math.round(protein)}g protein`
                      : "Nothing planned"}
                  </span>
                </CardTitle>
                {daySlots.length > 0 && (targets.calories || targets.protein) ? (
                  <p className="text-xs text-muted-foreground">
                    {targets.calories
                      ? `${Math.round(kcal - targets.calories) >= 0 ? "+" : ""}${Math.round(kcal - targets.calories)} kcal vs target`
                      : null}
                    {targets.calories && targets.protein ? " · " : null}
                    {targets.protein
                      ? `${Math.round(protein - targets.protein) >= 0 ? "+" : ""}${Math.round(protein - targets.protein)}g protein vs target`
                      : null}
                  </p>
                ) : null}
              </CardHeader>

              <CardContent className="space-y-2">
                {SLOTS.map((slot) => {
                  const rows = daySlots.filter((s) => s.meal_slot === slot);
                  return (
                    <div key={slot} className="space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-muted-foreground">
                          {MEAL_SLOT_LABELS[slot]}
                        </span>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 px-2"
                          onClick={() => {
                            setQuery("");
                            setPicker({ day, slot });
                          }}
                          aria-label={`Add a ${MEAL_SLOT_LABELS[slot].toLowerCase()} for ${day}`}
                        >
                          <Plus className="size-3.5" />
                        </Button>
                      </div>
                      {rows.map((row) => (
                        <div
                          key={row.id}
                          className="flex items-center justify-between gap-2 rounded-md border px-2 py-1.5"
                        >
                          <div className="min-w-0">
                            <p className="truncate text-sm">{row.label}</p>
                            <p className="text-xs text-muted-foreground">
                              {Math.round(Number(row.calories ?? 0))} kcal ·{" "}
                              {Math.round(Number(row.protein_g ?? 0))}g protein
                            </p>
                          </div>
                          <div className="flex shrink-0 items-center gap-1">
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-7 px-2 text-xs"
                              disabled={logSlot.isPending}
                              onClick={() => logSlot.mutate(row)}
                            >
                              Log
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 px-2"
                              aria-label={`Edit ${row.label}`}
                              onClick={() => setEditing(row)}
                            >
                              <Pencil className="size-3.5" />
                            </Button>

                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 px-2"
                              aria-label={`Remove ${row.label} from the plan`}
                              onClick={() => removeSlot.mutate(row.id)}
                            >
                              <Trash2 className="size-3.5" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center justify-between text-base">
            <span>Grocery list</span>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  <Share2 className="mr-1.5 size-3.5" /> Export / import
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onSelect={() => void copyList()}>
                  <Copy className="mr-2 size-3.5" /> Copy as text
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={exportCsv}>
                  <Download className="mr-2 size-3.5" /> Download CSV
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={exportPdf}>
                  <FileText className="mr-2 size-3.5" /> Print / save PDF
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => fileInputRef.current?.click()}>
                  <Upload className="mr-2 size-3.5" /> Import from CSV
                </DropdownMenuItem>
                {undoSnapshot ? (
                  <DropdownMenuItem
                    disabled={undoImport.isPending}
                    onSelect={() => undoImport.mutate(undoSnapshot)}
                  >
                    <Undo2 className="mr-2 size-3.5" /> Undo last CSV import
                  </DropdownMenuItem>
                ) : null}
                <DropdownMenuItem onSelect={downloadPrefilledTemplate}>
                  <FileSpreadsheet className="mr-2 size-3.5" /> Download editable CSV (prefilled)
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={downloadTemplate}>
                  <FileSpreadsheet className="mr-2 size-3.5" /> Download blank CSV template
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {grocery.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Plan a few meals — or add your own items below — and the list builds itself.
            </p>
          ) : (
            <ul className="space-y-1 text-sm">
              {grocery.map((line) => (
                <li key={line.name} className="flex items-center gap-2">
                  <Checkbox
                    checked={line.checked}
                    aria-label={`Mark ${line.name} as bought`}
                    onCheckedChange={(value) =>
                      saveOverride.mutate({
                        name: line.name,
                        checked: value === true,
                        isCustom: line.isCustom,
                      })
                    }
                  />
                  <span
                    className={`min-w-0 flex-1 truncate ${line.checked ? "text-muted-foreground line-through" : ""}`}
                  >
                    {line.name}
                    {line.portions > 1 ? ` ×${line.portions}` : ""}
                  </span>
                  <Input
                    defaultValue={
                      line.override ??
                      (line.grams != null ? `${line.grams}g` : line.notes.join(", "))
                    }
                    placeholder="qty"
                    aria-label={`Quantity for ${line.name}`}
                    className="h-7 w-24 shrink-0 text-xs"
                    onBlur={(e) => {
                      const value = e.target.value.trim();
                      if (value === (line.override ?? "")) return;
                      saveOverride.mutate({
                        name: line.name,
                        quantity: value || null,
                        isCustom: line.isCustom,
                      });
                    }}
                  />
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 shrink-0 px-2"
                    aria-label={`Remove ${line.name} from the list`}
                    onClick={() => {
                      const existing = (overridesQuery.data ?? []).find(
                        (o) => o.name === line.name,
                      );
                      if (line.isCustom && existing) deleteOverride.mutate(existing.id);
                      else saveOverride.mutate({ name: line.name, hidden: true });
                    }}
                  >
                    <Trash2 className="size-3.5" />
                  </Button>
                </li>
              ))}
            </ul>
          )}

          <form
            className="flex items-center gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              const name = newItem.trim();
              if (!name) return;
              saveOverride.mutate({ name, isCustom: true, hidden: false });
              setNewItem("");
            }}
          >
            <Input
              value={newItem}
              onChange={(e) => setNewItem(e.target.value)}
              placeholder="Add your own item"
              aria-label="Add your own grocery item"
              className="h-8"
            />
            <Button type="submit" size="sm" variant="outline" className="h-8 shrink-0">
              <Plus className="size-3.5" />
            </Button>
          </form>

          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,text/csv,text/plain"
            className="sr-only"
            aria-label="Import a grocery list CSV"
            onChange={(e) => {
              void onImportFile(e.target.files?.[0]);
              e.target.value = "";
            }}
          />
        </CardContent>
      </Card>

      <Dialog open={importPreview != null} onOpenChange={(open) => !open && setImportPreview(null)}>
        <DialogContent className="max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Import grocery list</DialogTitle>
          </DialogHeader>
          {importPreview ? (
            <div className="space-y-3 text-sm">
              <p className="text-muted-foreground">
                {importPreview.rows.length} item
                {importPreview.rows.length === 1 ? "" : "s"} found. Quantities and tick-offs replace
                what's on this week's list; anything new is added as your own item.
              </p>
              {importPreview.rows.length > 0 ? (
                <ul className="max-h-56 space-y-1 overflow-y-auto rounded-xl bg-muted/50 p-3 text-xs">
                  {importPreview.rows.slice(0, 50).map((row) => (
                    <li key={row.name} className="flex items-center justify-between gap-3">
                      <span className="min-w-0 flex-1 truncate">
                        {row.checked ? "✓ " : ""}
                        {row.name}
                      </span>
                      <span className="shrink-0 text-muted-foreground">{row.quantity ?? "—"}</span>
                    </li>
                  ))}
                  {importPreview.rows.length > 50 ? (
                    <li className="text-muted-foreground">
                      …and {importPreview.rows.length - 50} more
                    </li>
                  ) : null}
                </ul>
              ) : (
                <p className="rounded-xl bg-destructive/10 p-3 text-xs text-destructive">
                  Nothing could be imported from this file. Fix the rows below, or start from
                  “Download CSV template”.
                </p>
              )}

              {importPreview.issues.length > 0 ? (
                <details
                  className="rounded-xl border p-3 text-xs"
                  open={importPreview.rows.length === 0}
                >
                  <summary className="cursor-pointer font-medium">
                    {importPreview.issues.length} row
                    {importPreview.issues.length === 1 ? "" : "s"} need attention
                  </summary>
                  <ul className="mt-2 max-h-44 space-y-1.5 overflow-y-auto">
                    {importPreview.issues.slice(0, 100).map((issue, index) => (
                      <li key={`${issue.line}-${index}`}>
                        <span className="font-medium">Line {issue.line}</span>
                        {issue.text ? (
                          <span className="text-muted-foreground"> — “{issue.text}”</span>
                        ) : null}
                        <p className="text-muted-foreground">{issue.reason}</p>
                      </li>
                    ))}
                  </ul>
                  <p className="mt-2 text-muted-foreground">
                    Expected columns: Name, Quantity, Bought (yes/no).
                  </p>
                </details>
              ) : null}

              <fieldset className="space-y-1.5 text-xs">
                <legend className="font-medium">How should this file be applied?</legend>
                {(
                  [
                    ["merge", "Merge into my list (keep everything else)"],
                    ["replace_custom", "Replace my own items (planned meal items stay)"],
                    ["replace_all", "Replace my entire list with this file"],
                  ] as const
                ).map(([mode, label]) => (
                  <label key={mode} className="flex cursor-pointer items-center gap-2">
                    <input
                      type="radio"
                      name="grocery-import-mode"
                      className="accent-primary"
                      checked={importMode === mode}
                      onChange={() => setImportMode(mode)}
                    />
                    <span className="text-muted-foreground">{label}</span>
                  </label>
                ))}
              </fieldset>
            </div>
          ) : null}
          <DialogFooter>
            <Button variant="outline" onClick={() => setImportPreview(null)}>
              Cancel
            </Button>
            <Button
              disabled={importList.isPending || (importPreview?.rows.length ?? 0) === 0}
              onClick={() =>
                importPreview && importList.mutate({ rows: importPreview.rows, mode: importMode })
              }
            >
              {importList.isPending ? (
                <>
                  <Loader2 className="mr-1.5 size-3.5 animate-spin" /> Importing…
                </>
              ) : (
                "Import list"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <EditSlotDialog
        slot={editing}
        days={days}
        onClose={() => setEditing(null)}
        onSave={(values) => updateSlot.mutate(values)}
        saving={updateSlot.isPending}
      />

      <Dialog open={picker != null} onOpenChange={(open) => !open && setPicker(null)}>
        <DialogContent className="max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {picker ? `Add ${MEAL_SLOT_LABELS[picker.slot].toLowerCase()}` : "Add meal"}
            </DialogTitle>
          </DialogHeader>
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search your logged meals"
            aria-label="Search your logged meals"
          />
          {recentQuery.isLoading ? (
            <div className="flex justify-center py-6" aria-busy="true">
              <LoadingStatus label="Loading your logged meals…" />
              <Loader2 aria-hidden="true" className="size-5 animate-spin text-muted-foreground" />
            </div>
          ) : choices.length === 0 ? (
            <p className="py-4 text-sm text-muted-foreground">
              No logged meals match. Log a meal on the food page first — planned meals come from
              your own history.
            </p>
          ) : (
            <ul className="space-y-1">
              {choices.slice(0, 40).map((meal) => (
                <li key={meal.id}>
                  <button
                    type="button"
                    className="flex w-full items-center justify-between gap-3 rounded-md border px-3 py-2 text-left hover:bg-accent"
                    disabled={addSlot.isPending}
                    onClick={() =>
                      picker && addSlot.mutate({ day: picker.day, slot: picker.slot, meal })
                    }
                  >
                    <span className="truncate text-sm">{meal.label ?? "Meal"}</span>
                    <span className="shrink-0 text-xs text-muted-foreground">
                      {Math.round(macro(meal, "calories"))} kcal ·{" "}
                      {Math.round(macro(meal, "protein_g"))}g
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

/** Edit a planned meal's name, macros, day, and slot. */
function EditSlotDialog({
  slot,
  days,
  onClose,
  onSave,
  saving,
}: {
  slot: PlanSlot | null;
  days: string[];
  onClose: () => void;
  onSave: (values: {
    id: string;
    label: string;
    calories: number;
    protein_g: number;
    planned_on: string;
    meal_slot: string;
  }) => void;
  saving: boolean;
}) {
  const [label, setLabel] = useState("");
  const [calories, setCalories] = useState("0");
  const [protein, setProtein] = useState("0");
  const [day, setDay] = useState("");
  const [mealSlot, setMealSlot] = useState<string>("breakfast");

  useEffect(() => {
    if (!slot) return;
    setLabel(slot.label);
    setCalories(String(Math.round(Number(slot.calories ?? 0))));
    setProtein(String(Math.round(Number(slot.protein_g ?? 0))));
    setDay(slot.planned_on);
    setMealSlot(slot.meal_slot);
  }, [slot]);

  return (
    <Dialog open={slot != null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit planned meal</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1">
            <Label htmlFor="plan-label">Name</Label>
            <Input id="plan-label" value={label} onChange={(e) => setLabel(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="plan-kcal">Calories</Label>
              <Input
                id="plan-kcal"
                inputMode="numeric"
                value={calories}
                onChange={(e) => setCalories(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="plan-protein">Protein (g)</Label>
              <Input
                id="plan-protein"
                inputMode="numeric"
                value={protein}
                onChange={(e) => setProtein(e.target.value)}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Day</Label>
              <Select value={day} onValueChange={setDay}>
                <SelectTrigger aria-label="Planned day">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {days.map((d) => (
                    <SelectItem key={d} value={d}>
                      {new Date(`${d}T00:00:00`).toLocaleDateString(undefined, {
                        weekday: "short",
                        month: "short",
                        day: "numeric",
                      })}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Meal</Label>
              <Select value={mealSlot} onValueChange={setMealSlot}>
                <SelectTrigger aria-label="Meal slot">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SLOTS.map((s) => (
                    <SelectItem key={s} value={s}>
                      {MEAL_SLOT_LABELS[s]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button
            disabled={saving || !slot || !label.trim()}
            onClick={() =>
              slot &&
              onSave({
                id: slot.id,
                label: label.trim(),
                calories: Number(calories) || 0,
                protein_g: Number(protein) || 0,
                planned_on: day,
                meal_slot: mealSlot,
              })
            }
          >
            {saving ? <Loader2 className="mr-1.5 size-4 animate-spin" /> : null}
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
