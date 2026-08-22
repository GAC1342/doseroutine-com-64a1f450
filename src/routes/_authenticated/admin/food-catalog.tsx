import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import {
  ArrowLeft,
  Check,
  Copy,
  Database as DatabaseIcon,
  Download,
  History,
  Plus,
  Ruler,
  Search,
  Trash2,
  Undo2,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { VISUAL_REFERENCES } from "@/lib/portion-units";
import { routeErrorComponent } from "@/components/route-error-panel";
import {
  adminDeleteAlias,
  adminDeleteFood,
  adminDeletePortion,
  adminFoodAuditLog,
  adminFoodDetail,
  adminImportUsdaFood,
  adminListDuplicateClusters,
  adminListFoods,
  adminMergeFoods,
  adminMergeUsdaIntoFood,
  adminRevertFoodChange,
  adminSaveAlias,
  adminSaveFood,
  adminSavePortion,
  adminSeedCommonFoods,
  adminUsdaSearch,
  type AdminDuplicateCandidate,
  type AdminFoodRow,
  type AdminIncomingFood,
} from "@/lib/food-admin.functions";

export const Route = createFileRoute("/_authenticated/admin/food-catalog")({
  errorComponent: routeErrorComponent("admin-food-catalog"),
  head: () => ({
    meta: [
      { title: "Food catalog admin — DoseRoutine" },
      {
        name: "description",
        content:
          "Manage the DoseRoutine food catalog: foods, household portions, aliases, USDA imports and change rollback.",
      },
      { property: "og:title", content: "Food catalog admin — DoseRoutine" },
      {
        property: "og:description",
        content: "Internal tool for curating the food and portion database.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: FoodCatalogAdmin,
});

type FoodDraft = {
  id: string | null;
  name: string;
  brand: string;
  source: string;
  kcal100: string;
  protein100: string;
  carbs100: string;
  fat100: string;
  defaultPortionG: string;
  qualityScore: string;
  verified: boolean;
};

const emptyDraft: FoodDraft = {
  id: null,
  name: "",
  brand: "",
  source: "curated",
  kcal100: "0",
  protein100: "0",
  carbs100: "0",
  fat100: "0",
  defaultPortionG: "100",
  qualityScore: "70",
  verified: true,
};

function draftFrom(row: AdminFoodRow): FoodDraft {
  return {
    id: row.id,
    name: row.name,
    brand: row.brand ?? "",
    source: row.source,
    kcal100: String(row.kcal100),
    protein100: String(row.protein100),
    carbs100: String(row.carbs100),
    fat100: String(row.fat100),
    defaultPortionG: String(row.defaultPortionG),
    qualityScore: String(row.qualityScore),
    verified: row.verified,
  };
}

function FoodCatalogAdmin() {
  const queryClient = useQueryClient();
  const listFoods = useServerFn(adminListFoods);
  const foodDetail = useServerFn(adminFoodDetail);
  const saveFood = useServerFn(adminSaveFood);
  const deleteFood = useServerFn(adminDeleteFood);
  const savePortion = useServerFn(adminSavePortion);
  const deletePortion = useServerFn(adminDeletePortion);
  const saveAlias = useServerFn(adminSaveAlias);
  const deleteAlias = useServerFn(adminDeleteAlias);
  const usdaSearch = useServerFn(adminUsdaSearch);
  const importUsda = useServerFn(adminImportUsdaFood);
  const mergeUsdaIntoFood = useServerFn(adminMergeUsdaIntoFood);
  const mergeFoodsFn = useServerFn(adminMergeFoods);
  const listDuplicates = useServerFn(adminListDuplicateClusters);
  const seedFoods = useServerFn(adminSeedCommonFoods);
  const auditLog = useServerFn(adminFoodAuditLog);
  const revertChange = useServerFn(adminRevertFoodChange);

  const [search, setSearch] = useState("");
  const [appliedSearch, setAppliedSearch] = useState("");
  const [sourceFilter, setSourceFilter] = useState("");
  const [verifiedFilter, setVerifiedFilter] = useState("");
  const [draft, setDraft] = useState<FoodDraft | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [portionLabel, setPortionLabel] = useState("");
  const [portionGrams, setPortionGrams] = useState("");
  const [portionHint, setPortionHint] = useState("");
  const [aliasText, setAliasText] = useState("");
  const [seedStatus, setSeedStatus] = useState<string | null>(null);
  const [usdaQuery, setUsdaQuery] = useState("");
  const [usdaTerm, setUsdaTerm] = useState("");
  const [pendingDelete, setPendingDelete] = useState<AdminFoodRow | null>(null);
  const [mergeTarget, setMergeTarget] = useState<{
    fdcId: string;
    incoming: AdminIncomingFood;
    candidates: AdminDuplicateCandidate[];
  } | null>(null);
  const [selectedDupes, setSelectedDupes] = useState<Set<string>>(new Set());
  const [confirmBulk, setConfirmBulk] = useState(false);
  const [bulkProgress, setBulkProgress] = useState<{ done: number; total: number } | null>(null);

  const { data: isAdmin, isLoading: adminLoading } = useQuery({
    queryKey: ["is-admin"],
    queryFn: async () => {
      const { data } = await supabase.rpc("is_admin");
      return Boolean(data);
    },
  });

  const foods = useQuery({
    queryKey: ["admin-foods", appliedSearch, sourceFilter, verifiedFilter],
    queryFn: () =>
      listFoods({
        data: { query: appliedSearch, source: sourceFilter, verified: verifiedFilter },
      }),
    enabled: !!isAdmin,
  });

  const detail = useQuery({
    queryKey: ["admin-food-detail", selectedId],
    queryFn: () => foodDetail({ data: { foodId: selectedId! } }),
    enabled: !!isAdmin && !!selectedId,
  });

  const usda = useQuery({
    queryKey: ["admin-usda", usdaTerm],
    queryFn: () => usdaSearch({ data: { query: usdaTerm } }),
    enabled: !!isAdmin && usdaTerm.length >= 2,
  });

  const audit = useQuery({
    queryKey: ["admin-food-audit"],
    queryFn: () => auditLog(),
    enabled: !!isAdmin,
  });

  const duplicates = useQuery({
    queryKey: ["admin-food-duplicates"],
    queryFn: () => listDuplicates(),
    enabled: !!isAdmin,
    staleTime: 60_000,
  });

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ["admin-foods"] });
    queryClient.invalidateQueries({ queryKey: ["admin-food-detail"] });
    queryClient.invalidateQueries({ queryKey: ["admin-food-audit"] });
    queryClient.invalidateQueries({ queryKey: ["admin-usda"] });
    queryClient.invalidateQueries({ queryKey: ["admin-food-duplicates"] });
  };

  const saveFoodMutation = useMutation({
    mutationFn: (values: FoodDraft) =>
      saveFood({
        data: {
          id: values.id,
          name: values.name,
          brand: values.brand || null,
          source: values.source,
          kcal100: Number(values.kcal100),
          protein100: Number(values.protein100),
          carbs100: Number(values.carbs100),
          fat100: Number(values.fat100),
          defaultPortionG: Number(values.defaultPortionG),
          qualityScore: Number(values.qualityScore),
          verified: values.verified,
        },
      }),
    onSuccess: (res) => {
      toast.success("Food saved");
      setDraft(null);
      if (res?.id) setSelectedId(res.id);
      refresh();
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const deleteFoodMutation = useMutation({
    mutationFn: (foodId: string) => deleteFood({ data: { foodId } }),
    onSuccess: () => {
      toast.success("Food deleted — you can undo it from the change history");
      setSelectedId(null);
      setPendingDelete(null);
      refresh();
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const portionMutation = useMutation({
    mutationFn: (vars: {
      id?: string | null;
      foodId: string;
      label: string;
      grams: number;
      isDefault?: boolean;
      referenceHint?: string | null;
      sortOrder?: number;
    }) => savePortion({ data: vars }),
    onSuccess: () => {
      toast.success("Portion saved");
      setPortionLabel("");
      setPortionGrams("");
      setPortionHint("");
      refresh();
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const deletePortionMutation = useMutation({
    mutationFn: (id: string) => deletePortion({ data: { id } }),
    onSuccess: () => {
      toast.success("Portion removed");
      refresh();
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const aliasMutation = useMutation({
    mutationFn: (vars: { foodId: string; alias: string }) => saveAlias({ data: vars }),
    onSuccess: () => {
      toast.success("Alias added");
      setAliasText("");
      refresh();
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const deleteAliasMutation = useMutation({
    mutationFn: (id: string) => deleteAlias({ data: { id } }),
    onSuccess: () => {
      toast.success("Alias removed");
      refresh();
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const importMutation = useMutation({
    mutationFn: (vars: { fdcId: string; force?: boolean }) =>
      importUsda({ data: { fdcId: vars.fdcId, force: Boolean(vars.force) } }),
    onSuccess: (res, vars) => {
      if (res.status === "duplicate") {
        setMergeTarget({ incoming: res.incoming, candidates: res.candidates, fdcId: vars.fdcId });
        return;
      }
      toast.success(res.updated ? `Updated ${res.name}` : `Imported ${res.name}`);
      setSelectedId(res.id);
      refresh();
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const mergeUsdaMutation = useMutation({
    mutationFn: (vars: { fdcId: string; keepId: string }) => mergeUsdaIntoFood({ data: vars }),
    onSuccess: (res) => {
      toast.success(`Merged into ${res.name}`);
      setMergeTarget(null);
      setSelectedId(res.id);
      refresh();
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const mergePairMutation = useMutation({
    mutationFn: (vars: { keepId: string; mergeId: string }) =>
      mergeFoodsFn({ data: { ...vars, applyNutrition: false } }),
    onSuccess: (res) => {
      toast.success(`Merged into ${res.keepName}`);
      setSelectedDupes(new Set());
      refresh();
    },
    onError: (err: Error) => toast.error(err.message),
  });

  /* --------------------------- bulk duplicate merge ------------------------ */
  const dupePairs = duplicates.data ?? [];
  const dupeKey = (p: { keep: { id: string }; duplicate: { id: string } }) =>
    `${p.keep.id}-${p.duplicate.id}`;
  const selectedPairs = dupePairs.filter((p) => selectedDupes.has(dupeKey(p)));
  const allSelected = dupePairs.length > 0 && selectedPairs.length === dupePairs.length;

  function toggleDupe(key: string) {
    setSelectedDupes((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  function toggleAllDupes() {
    setSelectedDupes(allSelected ? new Set() : new Set(dupePairs.map(dupeKey)));
  }

  /** Merges the checked pairs one at a time, skipping pairs that touch a food already merged. */
  async function runBulkMerge() {
    const batch = selectedPairs;
    setConfirmBulk(false);
    if (batch.length === 0) return;
    const touched = new Set<string>();
    const failedKeys = new Set<string>();
    let merged = 0;
    let skipped = 0;
    let failed = 0;
    setBulkProgress({ done: 0, total: batch.length });
    for (let i = 0; i < batch.length; i += 1) {
      const pair = batch[i];
      setBulkProgress({ done: i, total: batch.length });
      if (touched.has(pair.keep.id) || touched.has(pair.duplicate.id)) {
        skipped += 1;
        failedKeys.add(dupeKey(pair));
        continue;
      }
      try {
        await mergeFoodsFn({
          data: { keepId: pair.keep.id, mergeId: pair.duplicate.id, applyNutrition: false },
        });
        merged += 1;
        touched.add(pair.keep.id);
        touched.add(pair.duplicate.id);
      } catch {
        failed += 1;
        failedKeys.add(dupeKey(pair));
      }
    }
    setBulkProgress(null);
    setSelectedDupes(failedKeys);
    const parts = [`${merged} merged`];
    if (skipped) parts.push(`${skipped} skipped — will re-appear on the next scan`);
    if (failed) parts.push(`${failed} failed`);
    if (failed) toast.error(parts.join(", "));
    else toast.success(parts.join(", "));
    refresh();
  }

  const [seeding, setSeeding] = useState(false);
  /** Walks the seed list a batch at a time so one click can't time out. */
  async function runSeed() {
    setSeeding(true);
    let offset = 0;
    let imported = 0;
    let skipped = 0;
    let dupes = 0;
    let missed = 0;
    try {
      for (;;) {
        const res = await seedFoods({ data: { offset, batch: 20 } });
        imported += res.imported;
        skipped += res.skipped;
        dupes += res.duplicates;
        missed += res.missed;
        offset = res.nextOffset;
        setSeedStatus(`${offset} / ${res.total} checked · ${imported} imported`);
        if (res.done) break;
      }
      setSeedStatus(
        `Done — ${imported} imported, ${skipped} already there, ${dupes} skipped as duplicates, ${missed} not found.`,
      );
      toast.success(`Seeded ${imported} foods from USDA`);
      refresh();
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setSeeding(false);
    }
  }

  const revertMutation = useMutation({
    mutationFn: (auditId: string) => revertChange({ data: { auditId } }),
    onSuccess: () => {
      toast.success("Change rolled back");
      refresh();
    },
    onError: (err: Error) => toast.error(err.message),
  });

  if (adminLoading) {
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

  const selected = (foods.data ?? []).find((f) => f.id === selectedId) ?? null;

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-6">
      <Link to="/admin" className="mb-4 inline-flex items-center gap-1 text-sm text-primary">
        <ArrowLeft className="h-4 w-4" /> Admin tools
      </Link>

      <div className="mb-2 flex items-center gap-2">
        <DatabaseIcon className="h-5 w-5 text-primary" />
        <h1 className="text-2xl font-bold tracking-tight">Food catalog</h1>
      </div>
      <p className="mb-6 text-sm text-muted-foreground">
        Curate the foods, household portions and aliases the meal scanner resolves against. Every
        change is recorded and can be rolled back.
      </p>

      {/* ------------------------------ search ------------------------------ */}
      <Card className="rounded-2xl p-4">
        <form
          className="flex flex-wrap items-end gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            setAppliedSearch(search.trim());
          }}
        >
          <div className="min-w-[200px] flex-1">
            <Label htmlFor="food-search">Search the catalog</Label>
            <Input
              id="food-search"
              value={search}
              placeholder="chicken breast"
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="food-source">Source</Label>
            <select
              id="food-source"
              className="h-10 rounded-md border border-input bg-background px-3 text-sm"
              value={sourceFilter}
              onChange={(e) => setSourceFilter(e.target.value)}
            >
              <option value="">All</option>
              <option value="curated">Curated</option>
              <option value="usda">USDA</option>
              <option value="user">User-corrected</option>
              <option value="off">Open Food Facts</option>
            </select>
          </div>
          <div>
            <Label htmlFor="food-verified">Verified</Label>
            <select
              id="food-verified"
              className="h-10 rounded-md border border-input bg-background px-3 text-sm"
              value={verifiedFilter}
              onChange={(e) => setVerifiedFilter(e.target.value)}
            >
              <option value="">All</option>
              <option value="yes">Verified</option>
              <option value="no">Unverified</option>
            </select>
          </div>
          <Button type="submit">
            <Search className="mr-2 h-4 w-4" /> Search
          </Button>
          <Button type="button" variant="outline" onClick={() => setDraft({ ...emptyDraft })}>
            <Plus className="mr-2 h-4 w-4" /> New food
          </Button>
        </form>
      </Card>

      {/* ------------------------------- editor ----------------------------- */}
      {draft && (
        <Card className="mt-4 rounded-2xl p-4">
          <h2 className="text-sm font-semibold">{draft.id ? `Edit ${draft.name}` : "New food"}</h2>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <div>
              <Label htmlFor="d-name">Name</Label>
              <Input
                id="d-name"
                value={draft.name}
                onChange={(e) => setDraft({ ...draft, name: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="d-brand">Brand (optional)</Label>
              <Input
                id="d-brand"
                value={draft.brand}
                onChange={(e) => setDraft({ ...draft, brand: e.target.value })}
              />
            </div>
            {(
              [
                ["kcal100", "Calories per 100 g"],
                ["protein100", "Protein per 100 g"],
                ["carbs100", "Carbs per 100 g"],
                ["fat100", "Fat per 100 g"],
                ["defaultPortionG", "Default portion (g)"],
                ["qualityScore", "Quality score (0–100)"],
              ] as const
            ).map(([key, label]) => (
              <div key={key}>
                <Label htmlFor={`d-${key}`}>{label}</Label>
                <Input
                  id={`d-${key}`}
                  type="number"
                  inputMode="decimal"
                  value={draft[key]}
                  onChange={(e) => setDraft({ ...draft, [key]: e.target.value })}
                />
              </div>
            ))}
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={draft.verified}
                onChange={(e) => setDraft({ ...draft, verified: e.target.checked })}
              />
              Verified (trusted for scans)
            </label>
          </div>
          <div className="mt-4 flex gap-2">
            <Button
              onClick={() => saveFoodMutation.mutate(draft)}
              disabled={saveFoodMutation.isPending || !draft.name.trim()}
            >
              <Check className="mr-2 h-4 w-4" /> Save food
            </Button>
            <Button variant="outline" onClick={() => setDraft(null)}>
              Cancel
            </Button>
          </div>
        </Card>
      )}

      {/* ------------------------------- results ---------------------------- */}
      <Card className="mt-4 rounded-2xl p-4">
        <h2 className="text-sm font-semibold">
          Catalog {foods.data ? `(${foods.data.length})` : ""}
        </h2>
        {foods.isLoading ? (
          <p className="mt-2 text-sm text-muted-foreground">Loading…</p>
        ) : (foods.data ?? []).length === 0 ? (
          <p className="mt-2 text-sm text-muted-foreground">No foods match those filters.</p>
        ) : (
          <ul className="mt-2 divide-y divide-border">
            {(foods.data ?? []).map((row) => (
              <li key={row.id} className="py-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="text-sm font-medium">
                      {row.name}
                      {row.brand ? ` · ${row.brand}` : ""}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {row.source} · {row.kcal100} kcal / 100 g · {row.protein100}P {row.carbs100}C{" "}
                      {row.fat100}F · default {row.defaultPortionG} g · quality {row.qualityScore}
                      {row.verified ? " · verified" : ""}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setSelectedId(selectedId === row.id ? null : row.id)}
                    >
                      <Ruler className="mr-1 h-3 w-3" /> Portions
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => setDraft(draftFrom(row))}>
                      Edit
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      aria-label={`Delete ${row.name}`}
                      onClick={() => setPendingDelete(row)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>

                {selectedId === row.id && (
                  <div className="mt-3 rounded-xl border border-border p-3">
                    <h3 className="text-xs font-semibold uppercase text-muted-foreground">
                      Household portions
                    </h3>
                    {detail.isLoading ? (
                      <p className="mt-2 text-sm text-muted-foreground">Loading…</p>
                    ) : (
                      <ul className="mt-2 space-y-1">
                        {(detail.data?.portions ?? []).map((p) => (
                          <li
                            key={p.id}
                            className="flex items-center justify-between gap-2 text-sm"
                          >
                            <span>
                              {p.label} · {p.grams} g{p.isDefault ? " · default" : ""}
                              {p.referenceHint ? ` · ${p.referenceHint}` : ""}
                            </span>
                            <span className="flex gap-1">
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() =>
                                  portionMutation.mutate({
                                    id: p.id,
                                    foodId: row.id,
                                    label: p.label,
                                    grams: p.grams,
                                    isDefault: true,
                                    referenceHint: p.referenceHint,
                                    sortOrder: p.sortOrder,
                                  })
                                }
                              >
                                Make default
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                aria-label={`Delete portion ${p.label}`}
                                onClick={() => deletePortionMutation.mutate(p.id)}
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </span>
                          </li>
                        ))}
                        {(detail.data?.portions ?? []).length === 0 && (
                          <li className="text-sm text-muted-foreground">
                            No portions yet — the scanner falls back to generic visual cues.
                          </li>
                        )}
                      </ul>
                    )}

                    <div className="mt-3 flex flex-wrap items-end gap-2">
                      <div>
                        <Label htmlFor="p-label">Label</Label>
                        <Input
                          id="p-label"
                          className="w-40"
                          placeholder="1 cup"
                          value={portionLabel}
                          onChange={(e) => setPortionLabel(e.target.value)}
                        />
                      </div>
                      <div>
                        <Label htmlFor="p-grams">Grams</Label>
                        <Input
                          id="p-grams"
                          className="w-28"
                          type="number"
                          inputMode="decimal"
                          value={portionGrams}
                          onChange={(e) => setPortionGrams(e.target.value)}
                        />
                      </div>
                      <div>
                        <Label htmlFor="p-hint">Visual cue</Label>
                        <select
                          id="p-hint"
                          className="h-10 rounded-md border border-input bg-background px-3 text-sm"
                          value={portionHint}
                          onChange={(e) => setPortionHint(e.target.value)}
                        >
                          <option value="">None</option>
                          {VISUAL_REFERENCES.map((ref) => (
                            <option key={ref.label} value={`${ref.label} — ${ref.hint}`}>
                              {ref.label} (~{ref.grams} g) — {ref.hint}
                            </option>
                          ))}
                        </select>
                      </div>
                      <Button
                        size="sm"
                        disabled={!portionLabel.trim() || Number(portionGrams) <= 0}
                        onClick={() =>
                          portionMutation.mutate({
                            foodId: row.id,
                            label: portionLabel.trim(),
                            grams: Number(portionGrams),
                            referenceHint: portionHint || null,
                            sortOrder: (detail.data?.portions ?? []).length,
                          })
                        }
                      >
                        <Plus className="mr-1 h-3 w-3" /> Add portion
                      </Button>
                    </div>

                    <h3 className="mt-4 text-xs font-semibold uppercase text-muted-foreground">
                      Aliases
                    </h3>
                    <ul className="mt-2 flex flex-wrap gap-2">
                      {(detail.data?.aliases ?? []).map((a) => (
                        <li
                          key={a.id}
                          className="flex items-center gap-1 rounded-full border border-border px-3 py-1 text-xs"
                        >
                          {a.alias}
                          <button
                            type="button"
                            aria-label={`Delete alias ${a.alias}`}
                            onClick={() => deleteAliasMutation.mutate(a.id)}
                            className="text-muted-foreground"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </li>
                      ))}
                    </ul>
                    <div className="mt-2 flex items-end gap-2">
                      <Input
                        aria-label="New alias"
                        className="w-56"
                        placeholder="grilled chicken"
                        value={aliasText}
                        onChange={(e) => setAliasText(e.target.value)}
                      />
                      <Button
                        size="sm"
                        disabled={!aliasText.trim()}
                        onClick={() =>
                          aliasMutation.mutate({ foodId: row.id, alias: aliasText.trim() })
                        }
                      >
                        Add alias
                      </Button>
                    </div>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </Card>

      {/* -------------------------------- USDA ------------------------------ */}
      <Card className="mt-4 rounded-2xl p-4">
        <h2 className="flex items-center gap-2 text-sm font-semibold">
          <Download className="h-4 w-4 text-primary" /> Import from USDA FoodData Central
        </h2>

        <div className="mt-3 rounded-xl border border-border p-3">
          <p className="text-sm font-medium">Pre-seed everyday foods</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Imports the common foods list from USDA in batches, skipping anything already in the
            catalog. Keeps normal scans fast and working even if USDA is down.
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <Button size="sm" variant="outline" disabled={seeding} onClick={() => void runSeed()}>
              {seeding ? "Seeding…" : "Seed common foods"}
            </Button>
            {seedStatus ? (
              <span className="text-xs text-muted-foreground">{seedStatus}</span>
            ) : null}
          </div>
        </div>
        <form
          className="mt-3 flex flex-wrap items-end gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            setUsdaTerm(usdaQuery.trim());
          }}
        >
          <div className="min-w-[220px] flex-1">
            <Label htmlFor="usda-q">Search USDA</Label>
            <Input
              id="usda-q"
              value={usdaQuery}
              placeholder="brown rice, cooked"
              onChange={(e) => setUsdaQuery(e.target.value)}
            />
          </div>
          <Button type="submit">
            <Search className="mr-2 h-4 w-4" /> Search USDA
          </Button>
        </form>

        {usda.isFetching ? (
          <p className="mt-3 text-sm text-muted-foreground">Searching USDA…</p>
        ) : usdaTerm && (usda.data ?? []).length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">
            No lab-measured USDA entries for that search.
          </p>
        ) : (
          <ul className="mt-3 divide-y divide-border">
            {(usda.data ?? []).map((item) => (
              <li key={item.fdcId} className="flex items-center justify-between gap-2 py-2">
                <div>
                  <p className="text-sm font-medium">{item.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {item.dataType} · FDC {item.fdcId} · {item.kcal100} kcal / 100 g ·{" "}
                    {item.protein100}P {item.carbs100}C {item.fat100}F
                  </p>
                  {item.alreadyImported ? (
                    <p className="mt-0.5 text-xs text-muted-foreground">Already imported</p>
                  ) : item.duplicateOf ? (
                    <p className="mt-0.5 flex items-center gap-1 text-xs text-amber-600 dark:text-amber-500">
                      <Copy className="h-3 w-3" />
                      Possible duplicate of “{item.duplicateOf.name}”
                    </p>
                  ) : null}
                </div>
                <Button
                  size="sm"
                  variant={item.alreadyImported ? "outline" : "default"}
                  disabled={importMutation.isPending || mergeUsdaMutation.isPending}
                  onClick={() => importMutation.mutate({ fdcId: item.fdcId })}
                >
                  {item.alreadyImported ? "Re-import" : "Import"}
                </Button>
              </li>
            ))}
          </ul>
        )}
      </Card>

      {/* ---------------------------- duplicates ---------------------------- */}
      <Card className="mt-4 rounded-2xl p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="flex items-center gap-2 text-sm font-semibold">
              <Copy className="h-4 w-4 text-primary" /> Possible duplicates
            </h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Merging keeps the left food and folds the right one into it — portions, aliases and
              log counts move over, and the merge can be undone from the history below.
            </p>
          </div>
          <div className="flex items-center gap-2">
            {selectedPairs.length > 0 ? (
              <Button
                size="sm"
                onClick={() => setConfirmBulk(true)}
                disabled={!!bulkProgress || mergePairMutation.isPending}
              >
                {bulkProgress
                  ? `Merging ${bulkProgress.done + 1} of ${bulkProgress.total}…`
                  : `Merge selected (${selectedPairs.length})`}
              </Button>
            ) : null}
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setSelectedDupes(new Set());
                duplicates.refetch();
              }}
              disabled={duplicates.isFetching || !!bulkProgress}
            >
              {duplicates.isFetching ? "Scanning…" : "Scan catalog"}
            </Button>
          </div>
        </div>
        {duplicates.isFetching ? (
          <p className="mt-3 text-sm text-muted-foreground">Scanning the catalog…</p>
        ) : dupePairs.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">
            No duplicate foods found in the catalog.
          </p>
        ) : (
          <ul className="mt-3 divide-y divide-border">
            <li className="flex items-center gap-2 pb-2">
              <Checkbox
                id="dupes-select-all"
                checked={allSelected}
                onCheckedChange={toggleAllDupes}
                disabled={!!bulkProgress}
                aria-label="Select all duplicate pairs"
              />
              <Label htmlFor="dupes-select-all" className="text-xs text-muted-foreground">
                Select all ({selectedPairs.length} of {dupePairs.length} selected)
              </Label>
            </li>
            {dupePairs.map((pair) => (
              <li
                key={dupeKey(pair)}
                className="flex flex-wrap items-center justify-between gap-3 py-3"
              >
                <Checkbox
                  checked={selectedDupes.has(dupeKey(pair))}
                  onCheckedChange={() => toggleDupe(dupeKey(pair))}
                  disabled={!!bulkProgress}
                  aria-label={`Select ${pair.keep.name} and ${pair.duplicate.name}`}
                />
                <div className="min-w-[240px] flex-1">
                  <p className="text-sm">
                    <span className="font-medium">{pair.keep.name}</span>
                    <span className="text-muted-foreground"> ← {pair.duplicate.name}</span>
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {pair.verdict} · {pair.reason} · keep: {pair.keep.kcal100} kcal (
                    {pair.keep.source}, {pair.keep.timesLogged} logs) · duplicate:{" "}
                    {pair.duplicate.kcal100} kcal ({pair.duplicate.source},{" "}
                    {pair.duplicate.timesLogged} logs)
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={mergePairMutation.isPending || !!bulkProgress}
                  onClick={() =>
                    mergePairMutation.mutate({
                      keepId: pair.keep.id,
                      mergeId: pair.duplicate.id,
                    })
                  }
                >
                  Merge
                </Button>
              </li>
            ))}
          </ul>
        )}
      </Card>

      {/* ------------------------ bulk merge confirm ------------------------ */}
      <AlertDialog open={confirmBulk} onOpenChange={setConfirmBulk}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Merge {selectedPairs.length} duplicate {selectedPairs.length === 1 ? "pair" : "pairs"}
              ?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Each merge keeps the first food and folds the second into it. Merges run one at a time
              and each one can be undone from the history below.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <ul className="max-h-56 space-y-1 overflow-y-auto text-sm">
            {selectedPairs.map((pair) => (
              <li key={dupeKey(pair)}>
                <span className="font-medium">{pair.keep.name}</span>
                <span className="text-muted-foreground"> ← {pair.duplicate.name}</span>
              </li>
            ))}
          </ul>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => void runBulkMerge()}>
              Merge {selectedPairs.length}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* --------------------------- merge dialog --------------------------- */}
      <AlertDialog open={!!mergeTarget} onOpenChange={(open) => !open && setMergeTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>This food may already be in the catalog</AlertDialogTitle>
            <AlertDialogDescription>
              Merging updates the existing food with USDA&apos;s numbers and portions and keeps its
              id, so logged meals and stats stay intact. Import separately only if these are
              genuinely different foods.
            </AlertDialogDescription>
          </AlertDialogHeader>
          {mergeTarget ? (
            <div className="space-y-3">
              <div className="rounded-xl border border-border p-3">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">
                  Incoming (USDA {mergeTarget.fdcId})
                </p>
                <p className="text-sm font-medium">{mergeTarget.incoming.name}</p>
                <p className="text-xs text-muted-foreground">
                  {mergeTarget.incoming.brand ? `${mergeTarget.incoming.brand} · ` : ""}
                  {mergeTarget.incoming.kcal100} kcal / 100 g · {mergeTarget.incoming.protein100}P{" "}
                  {mergeTarget.incoming.carbs100}C {mergeTarget.incoming.fat100}F
                </p>
              </div>
              {mergeTarget.candidates.map((candidate) => (
                <div key={candidate.id} className="rounded-xl border border-border p-3">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">
                    Existing · {candidate.verdict} match · {candidate.reason}
                  </p>
                  <p className="text-sm font-medium">{candidate.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {candidate.brand ? `${candidate.brand} · ` : ""}
                    {candidate.source} · {candidate.kcal100} kcal / 100 g · {candidate.protein100}P{" "}
                    {candidate.carbs100}C {candidate.fat100}F · {candidate.timesLogged} logs
                  </p>
                  <Button
                    size="sm"
                    className="mt-2"
                    disabled={mergeUsdaMutation.isPending}
                    onClick={() =>
                      mergeUsdaMutation.mutate({
                        fdcId: mergeTarget.fdcId,
                        keepId: candidate.id,
                      })
                    }
                  >
                    Merge into this food
                  </Button>
                </div>
              ))}
            </div>
          ) : null}
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (!mergeTarget) return;
                const fdcId = mergeTarget.fdcId;
                setMergeTarget(null);
                importMutation.mutate({ fdcId, force: true });
              }}
            >
              Import as separate food
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ------------------------------- history ---------------------------- */}
      <Card className="mt-4 rounded-2xl p-4">
        <h2 className="flex items-center gap-2 text-sm font-semibold">
          <History className="h-4 w-4 text-primary" /> Change history
        </h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Undo restores exactly what the row looked like before the change — including deleted foods
          with their portions and aliases.
        </p>
        {audit.isLoading ? (
          <p className="mt-2 text-sm text-muted-foreground">Loading…</p>
        ) : (
          <ul className="mt-2 divide-y divide-border">
            {(audit.data ?? []).map((entry) => (
              <li key={entry.id} className="flex items-center justify-between gap-2 py-2">
                <div>
                  <p className="text-sm">
                    <span className="font-medium">{entry.action}</span>{" "}
                    {entry.label ? `· ${entry.label}` : ""}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(entry.createdAt).toLocaleString()}
                    {entry.actorEmail ? ` · ${entry.actorEmail}` : ""}
                    {entry.revertedAt ? " · rolled back" : ""}
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={!!entry.revertedAt || revertMutation.isPending}
                  onClick={() => revertMutation.mutate(entry.id)}
                >
                  <Undo2 className="mr-1 h-3 w-3" /> Undo
                </Button>
              </li>
            ))}
            {(audit.data ?? []).length === 0 && (
              <li className="py-2 text-sm text-muted-foreground">No changes recorded yet.</li>
            )}
          </ul>
        )}
      </Card>

      <AlertDialog open={!!pendingDelete} onOpenChange={(o) => !o && setPendingDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete “{pendingDelete?.name}”?</AlertDialogTitle>
            <AlertDialogDescription>
              This removes the food, its portions and its aliases from the catalog. You can undo it
              from the change history.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => pendingDelete && deleteFoodMutation.mutate(pendingDelete.id)}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
