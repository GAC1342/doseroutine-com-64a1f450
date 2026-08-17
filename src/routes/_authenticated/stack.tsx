import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
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

import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { useSubscription } from "@/hooks/use-subscription";
import { useAccess } from "@/hooks/use-access";
import { PaywallSheet } from "@/components/paywall-sheet";
import {
  Plus,
  Pill,
  Beaker,
  Leaf,
  Syringe,
  Sparkles,
  Droplet,
  Pencil,
  Power,
  Trash2,
  X,
  Loader2,
  AlertTriangle,
  Info,
  ShieldCheck,
  Ban,
  Utensils,
  Clock,
  CalendarPlus,
  Search,
  ChevronDown,
  Check,
  ChevronRight,
  ScanLine,
} from "lucide-react";
import { buildIcs, downloadIcs } from "@/lib/ics";
import { evaluateInteractions } from "@/lib/interactions";
import { SourceChips } from "@/components/source-chips";
import {
  classifyHighRiskCardioMed,
  HIGH_RISK_CATEGORY_LABEL,
  type HighRiskCategory,
} from "@/lib/high-risk-meds";
import { TalkToPharmacistChecklist } from "@/components/talk-to-pharmacist-checklist";
import { useHighRiskAck } from "@/lib/high-risk-ack";
import { ShareWithClinicianButton, type SharePair } from "@/components/share-with-clinician";
import { useInteractionRules, useCompoundLibrary } from "@/hooks/use-interaction-rules";
import {
  InteractionDetailDrawer,
  type InteractionDetail,
} from "@/components/interaction-detail-drawer";
import { ackKey as makeAckKey, useInteractionAcks, useAckPrune } from "@/lib/interaction-acks";
import { VialInventoryCard } from "@/components/vial-inventory-card";
import { CapsuleQuickSet } from "@/components/capsule-quick-set";
import { DecimalInput } from "@/components/decimal-input";
import { parseDoseInput, formatDose } from "@/lib/dose-input";
import { ShareStackButton } from "@/components/share-stack-button";
import { ExportGate } from "@/components/export-gate";
import { Card } from "@/components/ui/card";
import { ScanHistoryPanel } from "@/components/scan-history-panel";

/**
 * Optional details handed over from the barcode scanner so the add form opens
 * pre-filled with what the manufacturer's label says.
 */
export type StackPrefill = {
  prefillName?: string;
  prefillDose?: string;
  prefillUnit?: string;
  prefillTimes?: string;
  prefillFood?: string;
  prefillProduct?: string;
  prefillDirections?: string;
  /** Scan-history row id, so the saved item keeps a link to the scan that filled it in. */
  prefillScanId?: string;
};

function str(v: unknown): string | undefined {
  const s = typeof v === "string" ? v.trim() : "";
  return s ? s.slice(0, 500) : undefined;
}

export const Route = createFileRoute("/_authenticated/stack")({
  head: () => ({ meta: [{ title: "Stack — DoseRoutine" }] }),
  validateSearch: (search: Record<string, unknown>): StackPrefill => ({
    prefillName: str(search.prefillName),
    prefillDose: str(search.prefillDose),
    prefillUnit: str(search.prefillUnit),
    prefillTimes: str(search.prefillTimes),
    prefillFood: str(search.prefillFood),
    prefillProduct: str(search.prefillProduct),
    prefillDirections: str(search.prefillDirections),
    prefillScanId: str(search.prefillScanId),
  }),
  component: StackPage,
});

type Category = Database["public"]["Enums"]["compound_cat"];
type DoseUnit = Database["public"]["Enums"]["dose_unit_enum"];
type Freq = Database["public"]["Enums"]["freq_enum"];
type Severity = Database["public"]["Enums"]["severity_enum"];
type Compound = Database["public"]["Tables"]["compounds"]["Row"];
type UserCompound = Database["public"]["Tables"]["user_compounds"]["Row"];
type Rule = Database["public"]["Tables"]["interaction_rules"]["Row"];

type UCWithCompound = UserCompound & { compound: Compound | null };

const CATEGORIES: {
  value: Category;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}[] = [
  { value: "medication", label: "Prescribed items", icon: Pill },
  { value: "vitamin", label: "Vitamins", icon: Sparkles },
  { value: "mineral", label: "Minerals", icon: Droplet },
  { value: "supplement", label: "Supplements", icon: Leaf },
  { value: "peptide", label: "Peptides", icon: Beaker },
  { value: "hormone", label: "Hormones", icon: Pill },
  { value: "glp1", label: "GLP-1", icon: Syringe },
];
const CATEGORY_LABEL: Record<Category, string> = Object.fromEntries(
  CATEGORIES.map((c) => [c.value, c.label]),
) as Record<Category, string>;
const CATEGORY_ICON: Record<
  Category,
  React.ComponentType<{ className?: string }>
> = Object.fromEntries(CATEGORIES.map((c) => [c.value, c.icon])) as Record<
  Category,
  React.ComponentType<{ className?: string }>
>;

const UNITS: DoseUnit[] = ["mg", "mcg", "iu", "g", "ml"];
const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function normalizeWeekDays(input: readonly number[] | null | undefined): number[] {
  const days = [...new Set((input ?? []).filter((day) => day >= 1 && day <= 7))].sort(
    (a, b) => a - b,
  );
  return days.length ? days : [1];
}

function formatWeekDays(input: readonly number[] | null | undefined): string {
  const days = normalizeWeekDays(input);
  if (days.length === 7) return "every day";
  return days
    .map((day) => DAYS[day - 1])
    .filter(Boolean)
    .join(", ");
}

/** "08:00,20:00" → ["08:00","20:00"]; anything malformed is ignored. */
function parsePrefillTimes(raw: string | undefined): string[] | null {
  if (!raw) return null;
  const times = raw
    .split(",")
    .map((t) => t.trim())
    .filter((t) => /^([01]\d|2[0-3]):[0-5]\d$/.test(t));
  return times.length ? times : null;
}

/** Keep the manufacturer's directions with the entry so the user can re-check them. */
function buildPrefillNotes(prefill: StackPrefill | null | undefined): string {
  if (!prefill) return "";
  const lines: string[] = [];
  if (prefill.prefillProduct) lines.push(`Scanned: ${prefill.prefillProduct}`);
  if (prefill.prefillDirections) lines.push(`Label says: ${prefill.prefillDirections}`);
  return lines.join("\n");
}

/** Best library match for a label ingredient name. */
function matchCompoundByName(library: Compound[], name: string | undefined): Compound | null {
  const q = (name ?? "").trim().toLowerCase();
  if (q.length < 3) return null;
  return (
    library.find((c) => c.name.toLowerCase() === q) ??
    library.find((c) => q.includes(c.name.toLowerCase()) && c.name.length >= 4) ??
    library.find((c) => c.name.toLowerCase().includes(q)) ??
    null
  );
}

function StackPage() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const search = Route.useSearch();
  const [showAdd, setShowAdd] = useState(false);
  const [editing, setEditing] = useState<UCWithCompound | null>(null);
  const [paywall, setPaywall] = useState(false);
  const { data: subscription } = useSubscription();
  const access = useAccess();
  const isPaid = subscription?.isPaid;
  // Grandfathered users keep the historical 5-compound free tier; new free
  // users (no active sub) get gated much sooner and must start the trial.
  const FREE_LIMIT = access.grandfathered ? 5 : 3;
  const PAID_LIMIT = 25;
  const hasFullAccess = access.fullAccess;
  const limit = hasFullAccess ? PAID_LIMIT : FREE_LIMIT;

  const { data: rows = [], isLoading: loading } = useQuery({
    queryKey: ["user_compounds"],
    queryFn: async () => {
      const { data } = await supabase
        .from("user_compounds")
        .select("*, compound:compounds(*)")
        .order("created_at", { ascending: false });
      return (data as UCWithCompound[] | null) ?? [];
    },
    staleTime: 60_000,
  });
  const atFreeLimit = !hasFullAccess && rows.length >= FREE_LIMIT;
  const atPaidLimit = hasFullAccess && rows.length >= PAID_LIMIT;
  // Removing a compound cascades to its schedule/reminders, so refresh the
  // sibling views that cache those rows too — otherwise a deleted item lingers
  // on Today/Timeline until their own staleTime expires.
  const load = () => {
    for (const key of [
      ["user_compounds"],
      ["user-compounds"],
      ["today-page"],
      ["timeline"],
      ["schedule_events"],
      ["reminders"],
    ]) {
      void qc.invalidateQueries({ queryKey: key });
    }
  };


  const grouped = useMemo(() => {
    const map = new Map<Category, UCWithCompound[]>();
    for (const r of rows) {
      const cat = (r.compound?.category ?? r.custom_category ?? "supplement") as Category;
      if (!map.has(cat)) map.set(cat, []);
      map.get(cat)!.push(r);
    }
    return map;
  }, [rows]);

  // Compute interaction evals ONCE here and pass to both banner + cross-check
  // so we don't run evaluateInteractions (O(n²) rule scan) twice per render.
  const { data: sharedRules = null } = useInteractionRules();
  const sharedEvals = useMemo(
    () => (sharedRules ? evaluateInteractions(rows, sharedRules) : null),
    [rows, sharedRules],
  );

  // Arriving from the scanner with label details: open the add form straight
  // away so the user lands on a pre-filled form, not an empty list.
  const scanPrefill = search.prefillName ? search : null;
  useEffect(() => {
    if (scanPrefill) setShowAdd(true);
  }, [scanPrefill]);

  function clearPrefill() {
    if (scanPrefill) void navigate({ to: "/stack", search: {}, replace: true });
  }

  function onAddClick() {
    if (atFreeLimit) {
      setPaywall(true);
      return;
    }
    if (atPaidLimit) {
      return;
    }
    setShowAdd(true);
  }

  return (
    <div className="mx-auto max-w-3xl px-4 pb-24 pt-6 sm:px-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-semibold">Your stack</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            What you're taking, grouped by category.
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {hasFullAccess
              ? access.grandfathered && !isPaid
                ? "Free (legacy)"
                : "Pro"
              : "Free trial"}
            :{" "}
            <span
              className={
                !hasFullAccess && rows.length >= limit - 3
                  ? "rounded-md bg-cta-tint px-1.5 py-0.5 font-semibold text-cta"
                  : undefined
              }
            >
              {rows.length}/{limit} compounds
            </span>
            {atPaidLimit && " · contact support if you need a larger stack"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {rows.length > 0 && (
            <ExportGate label="Share" source="stack_share">
              <ShareStackButton rows={rows} />
            </ExportGate>
          )}
          <Link
            to="/scan"
            className="tap-target inline-flex h-11 items-center gap-2 rounded-xl border border-border bg-card px-4 text-sm font-semibold hover:bg-muted active:scale-[0.98]"
            aria-label="Add by scanning a bottle barcode"
          >
            <ScanLine className="h-5 w-5" />
            <span className="hidden sm:inline">Scan</span>
          </Link>
          <button
            onClick={onAddClick}
            className="tap-target inline-flex h-11 items-center gap-2 rounded-xl bg-primary px-5 text-base font-semibold text-primary-foreground shadow-sm hover:bg-[color:var(--primary-hover)] active:scale-[0.98]"
          >
            <Plus className="h-5 w-5" /> Add
          </button>
        </div>
      </div>

      <HighRiskCardioBanner rows={rows} />

      {rows.filter((r) => r.active && r.compound).length >= 2 && (
        <StackInteractionsBanner rows={rows} evals={sharedEvals} rules={sharedRules} />
      )}

      {loading ? (
        <div className="mt-6 space-y-3" aria-busy="true" aria-label="Loading your stack">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-24 w-full rounded-2xl" />
          ))}
        </div>
      ) : rows.length === 0 ? (
        <EmptyState onAdd={onAddClick} />
      ) : (
        <div className="mt-6 space-y-8">
          {CATEGORIES.filter((c) => grouped.has(c.value)).map((c) => (
            <section key={c.value}>
              <h2 className="mb-3 flex items-center gap-2 font-display text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                <c.icon className="h-4 w-4" /> {c.label}
              </h2>
              <div className="space-y-2">
                {grouped.get(c.value)!.map((uc) => (
                  <UCCard key={uc.id} uc={uc} onChanged={load} onEdit={() => setEditing(uc)} />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}

      <PrescriptionCrossCheck rows={rows} evals={sharedEvals} rules={sharedRules} />

      {paywall && <PaywallSheet feature="compound_limit" onClose={() => setPaywall(false)} />}

      {(showAdd || editing) && (
        <AddEditSheet
          existing={editing}
          existingRows={rows}
          prefill={editing ? null : scanPrefill}
          onClose={() => {
            setShowAdd(false);
            setEditing(null);
            clearPrefill();
          }}
          onSaved={() => {
            setShowAdd(false);
            setEditing(null);
            clearPrefill();
            load();
          }}
        />
      )}
    </div>
  );
}

function HighRiskCardioBanner({ rows }: { rows: UCWithCompound[] }) {
  const flagged = useMemo(() => {
    const map = new Map<HighRiskCategory, string[]>();
    for (const r of rows) {
      if (!r.active || !r.compound) continue;
      const cat = classifyHighRiskCardioMed(r.compound);
      if (!cat) continue;
      const list = map.get(cat) ?? [];
      if (!list.includes(r.compound.name)) list.push(r.compound.name);
      map.set(cat, list);
    }
    return Array.from(map.entries());
  }, [rows]);

  const { needsAck, acknowledged, acknowledge, revoke } = useHighRiskAck(rows);

  if (flagged.length === 0) return null;

  return (
    <div
      role="alert"
      className="mt-4 rounded-2xl border-2 border-destructive/40 bg-destructive/10 p-4 text-destructive-foreground"
    >
      <div className="flex items-start gap-3">
        <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-destructive" aria-hidden />
        <div className="flex-1 space-y-2">
          <div className="text-sm font-semibold text-destructive">
            High-risk cardiovascular compound in your stack
          </div>
          <p className="text-sm text-foreground/90">
            Heart, blood-pressure, or blood-thinning compounds can interact dangerously with
            supplements, other items in your stack, or lifestyle factors. Review every addition with
            your prescriber before starting or stopping anything.
          </p>
          <ul className="space-y-1 text-sm text-foreground/90">
            {flagged.map(([cat, names]) => (
              <li key={cat}>
                <span className="font-medium">{HIGH_RISK_CATEGORY_LABEL[cat]}:</span>{" "}
                {names.join(", ")}
              </li>
            ))}
          </ul>
          <div className="pt-1">
            <SourceChips
              refs={[
                "NIH DailyMed|https://dailymed.nlm.nih.gov/",
                "FDA Drug Interactions|https://www.fda.gov/drugs/drug-interactions-labeling/drug-development-and-drug-interactions-table-substrates-inhibitors-and-inducers",
                "Drugs.com Interaction Checker|https://www.drugs.com/drug_interactions.html",
              ]}
            />
          </div>
          {needsAck && (
            <div
              id="high-risk-ack-box"
              className={`mt-3 rounded-xl border p-3 ${
                acknowledged
                  ? "border-border bg-background/60"
                  : "border-destructive/60 bg-background"
              }`}
            >
              <label className="flex items-start gap-3 text-sm">
                <input
                  type="checkbox"
                  checked={acknowledged}
                  onChange={(e) => (e.target.checked ? acknowledge() : revoke())}
                  className="mt-0.5 h-5 w-5 shrink-0 accent-[color:var(--destructive,#ef4444)]"
                  aria-describedby="high-risk-ack-desc"
                />
                <span id="high-risk-ack-desc" className="text-foreground/90">
                  I understand these are high-risk compounds and I will review any changes to my
                  stack or plan with my prescriber or pharmacist before acting on DoseRoutine
                  output.
                  {!acknowledged && (
                    <span className="mt-1 block text-xs font-medium text-destructive">
                      Required before you can save changes or generate a plan.
                    </span>
                  )}
                </span>
              </label>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function StackInteractionsBanner({
  rows,
  evals: sharedEvals,
  rules: sharedRules,
}: {
  rows: UCWithCompound[];
  evals?: ReturnType<typeof evaluateInteractions> | null;
  rules?: Rule[] | null;
}) {
  const { data: fetchedRules } = useInteractionRules();
  const rules = sharedRules ?? fetchedRules ?? null;
  const evals = useMemo(
    () => sharedEvals ?? (rules ? evaluateInteractions(rows, rules) : []),
    [sharedEvals, rows, rules],
  );
  if (!rules) return null;

  const counts = { avoid: 0, caution: 0, note: 0, synergy: 0 };
  for (const e of evals) counts[e.severity]++;
  const risky = counts.avoid + counts.caution;

  // Tone: avoid > caution > note/synergy only > none
  let tone: "avoid" | "caution" | "info" | "ok";
  if (counts.avoid > 0) tone = "avoid";
  else if (counts.caution > 0) tone = "caution";
  else if (counts.note + counts.synergy > 0) tone = "info";
  else tone = "ok";

  const styles: Record<
    typeof tone,
    { bg: string; border: string; icon: string; Icon: typeof AlertTriangle }
  > = {
    avoid: {
      bg: "bg-destructive/10",
      border: "border-destructive/30",
      icon: "text-destructive",
      Icon: Ban,
    },
    caution: {
      bg: "bg-amber-500/10",
      border: "border-amber-500/30",
      icon: "text-amber-600",
      Icon: AlertTriangle,
    },
    info: { bg: "bg-primary/5", border: "border-primary/20", icon: "text-primary", Icon: Info },
    ok: {
      bg: "bg-emerald-500/5",
      border: "border-emerald-500/20",
      icon: "text-emerald-600",
      Icon: ShieldCheck,
    },
  };
  const s = styles[tone];

  const heading =
    tone === "avoid"
      ? `${counts.avoid} avoid ${counts.avoid === 1 ? "interaction" : "interactions"} detected`
      : tone === "caution"
        ? `${counts.caution} caution ${counts.caution === 1 ? "interaction" : "interactions"} to review`
        : tone === "info"
          ? `${counts.note + counts.synergy} note${counts.note + counts.synergy === 1 ? "" : "s"} across your stack`
          : "No known risky interactions in your stack";

  const parts: string[] = [];
  if (counts.avoid) parts.push(`${counts.avoid} avoid`);
  if (counts.caution) parts.push(`${counts.caution} caution`);
  if (counts.note) parts.push(`${counts.note} note`);
  if (counts.synergy) parts.push(`${counts.synergy} synergy`);
  const summary = parts.length
    ? parts.join(" · ")
    : "We compare every pair against our interactions library.";

  return (
    <Link
      to="/safety"
      aria-label={`Safety summary: ${heading}. Open safety details.`}
      className={`mt-4 flex items-start gap-3 rounded-2xl border ${s.border} ${s.bg} p-4 transition hover:brightness-[0.98] active:scale-[0.99]`}
    >
      <div className={`mt-0.5 shrink-0 ${s.icon}`}>
        <s.Icon className="h-5 w-5" aria-hidden />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="font-display text-sm font-semibold">{heading}</p>
          {risky > 0 && (
            <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${s.icon} ${s.bg}`}>
              {risky} to review
            </span>
          )}
        </div>
        <p className="mt-0.5 truncate text-xs text-muted-foreground">{summary}</p>
      </div>
      <ChevronRight className="mt-1 h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
    </Link>
  );
}

function PrescriptionCrossCheck({
  rows,
  evals: sharedEvals,
  rules: sharedRules,
}: {
  rows: UCWithCompound[];
  evals?: ReturnType<typeof evaluateInteractions> | null;
  rules?: Rule[] | null;
}) {
  const { data: fetchedRules = null } = useInteractionRules();
  const rules = sharedRules ?? fetchedRules;

  const meds = rows.filter((r) => r.active && r.compound && r.compound.category === "medication");
  const flagged = useMemo(() => {
    const evals = sharedEvals ?? (rules ? evaluateInteractions(rows, rules) : []);
    // Only rules where at least one side is a prescription med in this stack.
    return evals.filter((e) => e.a.category === "medication" || e.b.category === "medication");
  }, [sharedEvals, rows, rules]);

  if (meds.length === 0) return null;
  const others = rows.filter((r) => r.active && r.compound && r.compound.category !== "medication");
  const names = [...meds, ...others].map((r) => r.compound?.name ?? "").filter(Boolean);
  const drugsUrl = "https://www.drugs.com/drug_interactions.html";
  const medlineUrl = `https://medlineplus.gov/druginfo/search.html?query=${encodeURIComponent(
    meds.map((m) => m.compound?.name ?? "").join(" "),
  )}`;

  const sevStyle: Record<Severity, { chip: string; label: string }> = {
    avoid: { chip: "bg-destructive/15 text-destructive", label: "Avoid" },
    caution: { chip: "bg-amber-500/15 text-amber-700", label: "Caution" },
    note: { chip: "bg-primary/10 text-primary", label: "Note" },
    synergy: { chip: "bg-emerald-500/15 text-emerald-700", label: "Synergy" },
  };

  return (
    <div className="mt-3 rounded-2xl border border-primary/25 bg-primary/5 p-4">
      <div className="flex items-start gap-3">
        <Pill className="mt-0.5 h-5 w-5 shrink-0 text-primary" aria-hidden />
        <div className="min-w-0 flex-1">
          <p className="font-display text-sm font-semibold">
            Higher-risk item in your stack — cross-check with an official interaction checker
          </p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            DoseRoutine flags known conflicts, but for higher-risk items (heart, blood-pressure,
            mental-health, blood thinners, etc.) always verify with a qualified health professional
            or an official tool. This is education, not medical advice.
          </p>
          {names.length > 0 && (
            <p className="mt-2 truncate text-xs text-foreground">
              <span className="text-muted-foreground">Your combo: </span>
              {names.join(" · ")}
            </p>
          )}

          {flagged.length > 0 && <FlaggedList flagged={flagged} sevStyle={sevStyle} />}

          {flagged.length > 0 && (
            <TalkToPharmacistChecklist
              pairs={flagged.map((e) => ({ a: e.a.name, b: e.b.name, severity: e.severity }))}
              storageKey={`doseroutine:pharm-checklist:${meds
                .map((m) => m.compound?.slug ?? "")
                .sort()
                .join("|")}`}
            />
          )}

          <div className="mt-3 flex flex-wrap gap-2">
            <ExportGate label="Share with clinician" source="clinician_share">
              <ShareWithClinicianButton
                stackNames={names}
                pairs={flagged.map<SharePair>((e) => ({
                  a: e.a.name,
                  b: e.b.name,
                  severity: e.severity,
                  recommendation: e.recommendation,
                  mechanism: e.mechanism,
                  sources: e.source_refs,
                }))}
              />
            </ExportGate>
            <a
              href={drugsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="tap-target inline-flex h-10 items-center gap-1.5 rounded-lg border border-primary/40 bg-background px-3 text-xs font-semibold text-primary hover:bg-primary/10"
            >
              Drugs.com Interaction Checker <ChevronRight className="h-3.5 w-3.5" />
            </a>
            <a
              href={medlineUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="tap-target inline-flex h-10 items-center gap-1.5 rounded-lg border border-border bg-background px-3 text-xs font-semibold text-foreground hover:bg-card"
            >
              MedlinePlus (NIH) <ChevronRight className="h-3.5 w-3.5" />
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

type FlaggedEval = ReturnType<typeof evaluateInteractions>[number];

function FlaggedList({
  flagged,
  sevStyle,
}: {
  flagged: FlaggedEval[];
  sevStyle: Record<Severity, { chip: string; label: string }>;
}) {
  const [majorOnly, setMajorOnly] = useState(false);
  const [detail, setDetail] = useState<InteractionDetail | null>(null);
  const { isAcked } = useInteractionAcks();

  const withKey = flagged.map((e) => ({
    e,
    key: makeAckKey(e.a.slug, e.b.slug, e.severity),
    isMajor: e.severity === "avoid" || e.severity === "caution",
  }));
  const majorItems = withKey.filter((x) => x.isMajor);
  const majorCount = majorItems.length;
  const majorAcked = majorItems.filter((x) => isAcked(x.key)).length;
  const visible = majorOnly ? majorItems : withKey;

  // Prune stale acks whenever the flagged set changes.
  useAckPrune(withKey.map((x) => x.key));

  return (
    <div className="mt-3 space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          Flagged in your stack ({visible.length}
          {majorOnly ? ` of ${flagged.length}` : ""})
        </p>
        <div
          className="inline-flex rounded-lg border border-border bg-background p-0.5"
          role="tablist"
          aria-label="Severity filter"
        >
          <button
            type="button"
            role="tab"
            aria-selected={!majorOnly}
            onClick={() => setMajorOnly(false)}
            className={`tap-target h-8 rounded-md px-2.5 text-[11px] font-semibold ${!majorOnly ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
          >
            All ({flagged.length})
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={majorOnly}
            onClick={() => setMajorOnly(true)}
            className={`tap-target h-8 rounded-md px-2.5 text-[11px] font-semibold ${majorOnly ? "bg-destructive text-white" : "text-muted-foreground hover:text-foreground"}`}
          >
            Major only ({majorCount})
          </button>
        </div>
      </div>

      {majorCount > 0 && (
        <div
          className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-[11px] ${
            majorAcked === majorCount
              ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-800"
              : "border-amber-500/40 bg-amber-500/10 text-amber-800"
          }`}
        >
          <ShieldCheck className="h-3.5 w-3.5 shrink-0" aria-hidden />
          <span className="font-semibold">
            {majorAcked} of {majorCount} major interaction{majorCount === 1 ? "" : "s"} reviewed
          </span>
          {majorAcked < majorCount && (
            <span className="text-muted-foreground">— tap each to acknowledge</span>
          )}
        </div>
      )}

      {visible.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border/70 bg-background/40 p-3 text-center text-xs text-muted-foreground">
          No major (avoid/caution) interactions in your stack.
        </div>
      ) : (
        visible.map(({ e, key, isMajor }, i) => {
          const s = sevStyle[e.severity];
          const acked = isMajor && isAcked(key);
          return (
            <button
              key={i}
              type="button"
              onClick={() =>
                setDetail({
                  a: { name: e.a.name, category: e.a.category },
                  b: { name: e.b.name, category: e.b.category },
                  severity: e.severity,
                  mechanism: e.mechanism,
                  recommendation: e.recommendation,
                  same_axis: e.same_axis,
                  matchedBy: e.matchedBy,
                  source_refs: e.source_refs,
                  ackKey: key,
                })
              }
              className={`group w-full rounded-xl border p-3 text-left transition focus:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                acked
                  ? "border-emerald-500/40 bg-emerald-500/5 hover:border-emerald-500/60"
                  : "border-border/70 bg-background/60 hover:border-primary/40 hover:bg-background"
              }`}
              aria-label={`View interaction details for ${e.a.name} and ${e.b.name}${acked ? " (reviewed)" : ""}`}
            >
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${s.chip}`}
                >
                  {s.label}
                </span>
                <p className="text-sm font-semibold text-foreground">
                  {e.a.name} <span className="text-muted-foreground">×</span> {e.b.name}
                </p>
                {acked && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-emerald-700">
                    <ShieldCheck className="h-3 w-3" aria-hidden /> Reviewed
                  </span>
                )}
                <ChevronRight
                  className="ml-auto h-4 w-4 text-muted-foreground transition group-hover:text-primary"
                  aria-hidden
                />
              </div>
              <p className="mt-1 text-xs text-foreground">{e.recommendation}</p>
              <p className="mt-0.5 text-[11px] text-muted-foreground">
                Why: {e.mechanism}
                {e.matchedBy === "category" && " · matched at category level"}
              </p>
              {e.source_refs.length > 0 && <SourceChips refs={e.source_refs} className="mt-2" />}
              <p className="mt-2 text-[10px] font-semibold uppercase tracking-wider text-primary/80">
                {isMajor && !acked
                  ? "Tap to review & acknowledge →"
                  : "Tap for full rule details →"}
              </p>
            </button>
          );
        })
      )}

      <InteractionDetailDrawer detail={detail} onClose={() => setDetail(null)} />
    </div>
  );
}

function EmptyState({ onAdd }: { onAdd: () => void }) {
  return (
    <div className="mt-12 rounded-2xl bg-card p-8 text-center">
      <div className="mx-auto grid h-12 w-12 place-items-center rounded-xl bg-primary/10 text-primary">
        <Pill className="h-6 w-6" />
      </div>
      <h3 className="mt-4 font-display text-lg font-semibold">Your stack is empty</h3>
      <p className="mt-1 text-sm text-muted-foreground">
        Add your first compound to start scheduling and safety-checking it.
      </p>
      <button
        onClick={onAdd}
        className="tap-target mt-5 inline-flex h-11 items-center gap-2 rounded-xl bg-primary px-5 text-base font-semibold text-primary-foreground hover:bg-[color:var(--primary-hover)] active:scale-[0.98]"
      >
        <Plus className="h-5 w-5" /> Add compound
      </button>
    </div>
  );
}

function UCCard({
  uc,
  onEdit,
  onChanged,
}: {
  uc: UCWithCompound;
  onEdit: () => void;
  onChanged: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const name = uc.compound?.name ?? uc.custom_name ?? "Custom item";
  const cat = (uc.compound?.category ?? uc.custom_category ?? "supplement") as Category;
  const Icon = CATEGORY_ICON[cat] ?? Pill;
  const controlled = !!uc.compound?.is_controlled;

  async function toggleActive() {
    setBusy(true);
    const { error } = await supabase
      .from("user_compounds")
      .update({ active: !uc.active })
      .eq("id", uc.id);
    setBusy(false);
    if (error) {
      toast.error(`Couldn't update ${name}`, { description: error.message });
      return;
    }
    onChanged();
  }
  async function remove() {
    setBusy(true);
    // Return the deleted row so a silently-blocked delete (RLS, stale row,
    // offline) can't look like success — the old code ignored both the error
    // and a zero-row result, so the card just reappeared on the next refetch.
    const { data, error } = await supabase
      .from("user_compounds")
      .delete()
      .eq("id", uc.id)
      .select("id");
    setBusy(false);
    setConfirmOpen(false);
    if (error) {
      toast.error(`Couldn't remove ${name}`, {
        description: error.message || "Please try again.",
      });
      return;
    }
    if (!data || data.length === 0) {
      toast.error(`Couldn't remove ${name}`, {
        description: "It may already be deleted or belong to another account. Pull to refresh.",
      });
      onChanged();
      return;
    }
    toast.success(`${name} removed from your stack`);
    onChanged();
  }

  function addToCalendar() {
    // uc.days_of_week uses 1..7 (Mon..Sun); ICS wants 0..6 (Sun..Sat).
    const daysSunFirst = (uc.days_of_week ?? []).map((d) => (d === 7 ? 0 : d));
    const ics = buildIcs({
      name,
      doseAmount: uc.dose_amount,
      doseUnit: uc.dose_unit,
      frequency: uc.frequency,
      timesOfDay: uc.times_of_day as string[] | null,
      daysOfWeek: daysSunFirst,
      withFood: uc.with_food,
      notes: uc.notes,
      alarmMinutesBefore: 0,
    });
    downloadIcs(`doseroutine-${name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`, ics);
    // .ics files aren't real alarms — they must be imported into the phone's
    // calendar app first. Point the user at that step so they don't think the
    // download alone will beep. For live push alerts on this device, direct
    // them to More → Reminders (web push) or install the app for native alarms.
    setTimeout(() => {
      alert(
        `Downloaded doseroutine-${name}.ics\n\n` +
          `To hear alerts:\n` +
          `1. Open the downloaded file — your phone will offer to add it to Apple Calendar or Google Calendar.\n` +
          `2. Confirm "Add All" and make sure Calendar notifications are ON in your phone settings.\n\n` +
          `For instant push alerts without a calendar, go to More → Reminders and turn on "Push on this device."`,
      );
    }, 300);
  }

  return (
    <div
      className={`rounded-xl border bg-background p-4 ${
        uc.active ? "border-border" : "border-dashed border-border/60 opacity-60"
      }`}
    >
      <div className="flex items-start gap-3">
        <div className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
          <Icon className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <div className="font-display text-base font-semibold text-foreground">{name}</div>
            {controlled && (
              <span className="rounded-full bg-[color:var(--severity-caution-bg,rgba(245,158,11,0.12))] px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-[color:var(--severity-caution,#d97706)]">
                Controlled
              </span>
            )}
            {!uc.active && (
              <span className="rounded-full bg-card px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                Paused
              </span>
            )}
          </div>
          <div className="mt-1 text-sm text-muted-foreground">
            {uc.dose_amount ? `${uc.dose_amount} ${uc.dose_unit ?? ""} · ` : ""}
            {uc.frequency ?? "daily"}
            {uc.frequency === "weekly" ? ` (${formatWeekDays(uc.days_of_week)})` : ""}
            {uc.times_of_day?.length ? ` · ${uc.times_of_day.join(", ")}` : ""}
            {uc.with_food ? " · with food" : ""}
          </div>
          {uc.notes && <p className="mt-1 text-xs text-muted-foreground">{uc.notes}</p>}
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={addToCalendar}
            className="grid h-11 w-11 place-items-center rounded-lg text-muted-foreground hover:bg-card hover:text-primary active:bg-card"
            aria-label="Add to calendar (.ics)"
            title="Add to Calendar"
          >
            <CalendarPlus className="h-5 w-5" />
          </button>
          <button
            onClick={onEdit}
            disabled={busy}
            className="grid h-11 w-11 place-items-center rounded-lg text-muted-foreground hover:bg-card active:bg-card"
            aria-label="Edit"
          >
            <Pencil className="h-5 w-5" />
          </button>
          <button
            onClick={toggleActive}
            disabled={busy}
            className="grid h-11 w-11 place-items-center rounded-lg text-muted-foreground hover:bg-card active:bg-card"
            aria-label={uc.active ? "Pause" : "Resume"}
          >
            <Power className="h-5 w-5" />
          </button>
          <button
            onClick={() => setConfirmOpen(true)}
            disabled={busy}
            className="grid h-11 w-11 place-items-center rounded-lg text-muted-foreground hover:bg-card hover:text-[color:var(--severity-avoid)] active:bg-card"
            aria-label="Delete"
          >
            {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : <Trash2 className="h-5 w-5" />}
          </button>
          <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Remove {name} from your stack?</AlertDialogTitle>
                <AlertDialogDescription>
                  This deletes its schedule, reminders and upcoming doses. Logged history stays.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel disabled={busy}>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  disabled={busy}
                  onClick={(e) => {
                    e.preventDefault();
                    void remove();
                  }}
                >
                  Remove
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>

      </div>

      <ScanHistoryPanel userCompoundId={uc.id} />
    </div>
  );
}

/* -------- Add / Edit Sheet -------- */

function AddEditSheet({
  existing,
  existingRows,
  prefill = null,
  onClose,
  onSaved,
}: {
  existing: UCWithCompound | null;
  existingRows: UCWithCompound[];
  prefill?: StackPrefill | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [compoundId, setCompoundId] = useState<string>(existing?.compound_id ?? "");
  const { data: library = [], isLoading: libLoading } = useCompoundLibrary();

  const [dose, setDose] = useState<string>(
    existing?.dose_amount != null ? String(existing.dose_amount) : (prefill?.prefillDose ?? ""),
  );
  const [unit, setUnit] = useState<DoseUnit>(
    existing?.dose_unit ??
      ((UNITS as string[]).includes(prefill?.prefillUnit ?? "")
        ? (prefill!.prefillUnit as DoseUnit)
        : "mg"),
  );
  const [freq, setFreq] = useState<Freq>(existing?.frequency ?? "daily");
  const [days, setDays] = useState<number[]>(
    existing?.frequency === "weekly" ? normalizeWeekDays(existing.days_of_week) : [1],
  );
  const [times, setTimes] = useState<string[]>(
    existing?.times_of_day ?? parsePrefillTimes(prefill?.prefillTimes) ?? ["08:00"],
  );
  const [withFood, setWithFood] = useState<boolean>(
    existing ? !!existing.with_food : prefill?.prefillFood === "1",
  );
  const [notes, setNotes] = useState(existing?.notes ?? buildPrefillNotes(prefill));

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Interaction rules for warning preview (shared cache).
  const { data: rules = [] } = useInteractionRules();

  const selected = useMemo(
    () => library.find((c) => c.id === compoundId) ?? existing?.compound ?? null,
    [library, compoundId, existing],
  );
  const controlled = !!selected?.is_controlled;

  // When compound changes, pre-select its default unit (never dose for controlled).
  // A unit read off a scanned label wins for that first selection — the label
  // is more specific than our library default.
  const prefillUnitPending = useRef(!!prefill?.prefillUnit);
  useEffect(() => {
    if (prefillUnitPending.current) {
      prefillUnitPending.current = false;
      return;
    }
    if (selected?.default_unit) setUnit(selected.default_unit);
  }, [selected?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Match the scanned ingredient name against our library once it loads.
  const prefillMatched = useRef(false);
  useEffect(() => {
    if (prefillMatched.current || existing || !prefill?.prefillName || library.length === 0) return;
    prefillMatched.current = true;
    const match = matchCompoundByName(library, prefill.prefillName);
    if (match) setCompoundId(match.id);
  }, [library, prefill, existing]);

  // Live interaction preview
  const warnings = useMemo(() => {
    if (!selected) return [];
    const others = existingRows.filter((r) => r.id !== existing?.id && r.active);
    const hits: { severity: Severity; text: string; mechanism: string; other: string }[] = [];
    for (const r of others) {
      const otherComp = r.compound;
      if (!otherComp) continue;
      const rule = rules.find(
        (rl) =>
          (rl.compound_a_id === selected.id && rl.compound_b_id === otherComp.id) ||
          (rl.compound_b_id === selected.id && rl.compound_a_id === otherComp.id) ||
          (rl.category_a === selected.category && rl.category_b === otherComp.category) ||
          (rl.category_b === selected.category && rl.category_a === otherComp.category),
      );
      if (rule) {
        hits.push({
          severity: rule.severity,
          text: rule.recommendation,
          mechanism: rule.mechanism,
          other: otherComp.name,
        });
      }
    }
    // Highest severity first
    const order: Record<Severity, number> = { avoid: 0, caution: 1, note: 2, synergy: 3 };
    return hits.sort((a, b) => order[a.severity] - order[b.severity]);
  }, [selected, existingRows, rules, existing]);

  const canSave =
    !!selected &&
    dose.trim() !== "" &&
    Number(dose) > 0 &&
    times.length > 0 &&
    (freq !== "weekly" || days.length > 0);

  function toggleDay(d: number) {
    setDays((prev) => (prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d].sort()));
  }
  function setScheduleFrequency(next: Freq) {
    setFreq(next);
    if (next === "weekly") {
      setDays((prev) => (prev.length === 0 || prev.length === 7 ? [1] : normalizeWeekDays(prev)));
    }
  }
  function updateTime(i: number, v: string) {
    setTimes((prev) => prev.map((t, idx) => (idx === i ? v : t)));
  }
  function addTime() {
    // Prevent silent duplicates: the DB has a unique index on
    // (user_compound_id, scheduled_at) so a second 08:00 would be dropped
    // by ignoreDuplicates and the user would think they configured two.
    setTimes((prev) => {
      const seen = new Set(prev);
      // Find the next hour that isn't already in the list.
      for (let h = 8; h < 8 + 24; h++) {
        const candidate = `${String(h % 24).padStart(2, "0")}:00`;
        if (!seen.has(candidate)) return [...prev, candidate];
      }
      return prev;
    });
  }
  function removeTime(i: number) {
    setTimes((prev) => prev.filter((_, idx) => idx !== i));
  }

  async function save() {
    if (!selected) return;
    setError(null);

    // Gate save on high-risk cardiovascular acknowledgment. Build the
    // prospective row set (existing rows with this compound applied) and
    // check the ack signature against localStorage. Ack is set from the
    // banner on the Stack page.
    const { highRiskSignature, isHighRiskAcknowledged } = await import("@/lib/high-risk-ack");
    const prospective: UCWithCompound[] = existing
      ? existingRows.map((r) =>
          r.id === existing.id ? { ...r, compound: selected, active: true } : r,
        )
      : [
          ...existingRows,
          {
            ...(existing as unknown as UCWithCompound),
            active: true,
            compound: selected,
          } as UCWithCompound,
        ];
    const sig = highRiskSignature(prospective);
    if (sig && !isHighRiskAcknowledged(sig)) {
      setError(
        "Please acknowledge the high-risk compound warning on your Stack page before saving. Close this sheet, tick the red banner's checkbox, and try again.",
      );
      return;
    }

    // Parse the dose exactly as typed — never coerce a bad field to NaN/0.
    const parsedDose = parseDoseInput(dose);
    if (!parsedDose.ok) {
      setError(parsedDose.error);
      return;
    }

    setSaving(true);
    const { data: userRes } = await supabase.auth.getUser();
    const userId = userRes.user!.id;
    const weeklyDays = normalizeWeekDays(days);
    // Dedupe times so two 08:00 rows don't silently collapse via the DB
    // unique index. Users get one confirmed time per row they see.
    const dedupedTimes = Array.from(new Set(times.map((t) => t.trim()))).filter(Boolean);
    if (dedupedTimes.length === 0) {
      setSaving(false);
      setError("Add at least one time of day.");
      return;
    }
    const payload = {
      user_id: userId,
      compound_id: selected.id,
      custom_name: null,
      custom_category: null,
      dose_amount: parsedDose.value,
      dose_unit: unit,
      frequency: freq,
      days_of_week: freq === "weekly" ? weeklyDays : null,
      times_of_day: dedupedTimes,
      with_food: withFood,
      notes: notes || null,
      active: true,
    };
    const res = existing
      ? await supabase
          .from("user_compounds")
          .update(payload)
          .eq("id", existing.id)
          .select("id")
          .maybeSingle()
      : await supabase.from("user_compounds").insert(payload).select("id").maybeSingle();
    if (res.error) {
      setSaving(false);
      setError(res.error.message);
      return;
    }
    // Attach the scan that pre-filled this form so the item keeps a dated
    // record of the data source and confidence score.
    const savedId = (res.data as { id: string } | null)?.id ?? existing?.id ?? null;
    if (prefill?.prefillScanId && savedId) {
      const { linkScanToCompound } = await import("@/lib/scan-history");
      await linkScanToCompound(prefill.prefillScanId, savedId);
    }
    try {
      const { generateScheduleForCurrentUser } = await import("@/lib/schedule");
      // On edit, purge stale pending future events for this compound so old
      // times stop firing reminders. New inserts have nothing to purge.
      const purge = existing ? [existing.id] : [];
      await generateScheduleForCurrentUser(7, purge);
    } catch (e) {
      console.warn("schedule regen failed", e);
    }
    setSaving(false);
    onSaved();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 sm:items-center">
      <div className="max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-t-2xl bg-background sm:rounded-2xl">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-border bg-background px-5 py-4">
          <h2 className="font-display text-lg font-semibold">
            {existing ? "Edit compound" : "Add compound"}
          </h2>
          <button
            onClick={onClose}
            className="grid h-11 w-11 place-items-center rounded-lg text-muted-foreground hover:bg-card active:bg-card"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-6 px-5 py-5">
          {prefill?.prefillProduct && (
            <div className="rounded-xl border border-primary/40 bg-primary/5 p-3">
              <p className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-primary">
                <ScanLine className="h-3.5 w-3.5" />
                From your scan
              </p>
              <p className="mt-1 text-sm font-medium">{prefill.prefillProduct}</p>
              {prefill.prefillDirections && (
                <p className="mt-1 text-xs text-muted-foreground">{prefill.prefillDirections}</p>
              )}
              <p className="mt-1 text-[10px] text-muted-foreground">
                We filled in what the label says. Check it against your bottle and change anything
                that doesn't match.
              </p>
            </div>
          )}

          {/* Compound (searchable, grouped combobox) */}
          <div>
            <label className="text-sm font-medium" htmlFor="compound-combobox">
              Compound
            </label>
            <CompoundCombobox
              id="compound-combobox"
              compounds={library}
              value={compoundId}
              onChange={setCompoundId}
              disabled={!!existing}
              loading={libLoading}
            />
            {selected?.education_md && (
              <p className="mt-2 text-xs text-muted-foreground">{selected.education_md}</p>
            )}
          </div>

          {/* Dose */}
          {selected && (
            <div>
              <label className="text-sm font-medium">Dose</label>
              {controlled ? (
                <div className="mt-2 flex items-start gap-2 rounded-lg bg-[color:var(--severity-caution-bg,rgba(245,158,11,0.10))] p-3 text-xs text-[color:var(--severity-caution,#d97706)]">
                  <Ban className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>
                    <strong>You enter the dose.</strong> DoseRoutine never suggests a dose for
                    controlled compounds. Use what your clinician prescribed.
                  </span>
                </div>
              ) : selected.rda_low != null ||
                selected.rda_high != null ||
                selected.upper_limit != null ? (
                <div className="mt-2 flex items-start gap-2 rounded-lg bg-[color:var(--severity-note-bg))] p-3 text-xs text-[color:var(--severity-note)]">
                  <Info className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>
                    Published reference intake:{" "}
                    {selected.rda_low != null && selected.rda_high != null
                      ? `${selected.rda_low}–${selected.rda_high} ${selected.default_unit ?? ""}/day`
                      : selected.rda_low != null
                        ? `${selected.rda_low} ${selected.default_unit ?? ""}/day`
                        : selected.rda_high != null
                          ? `up to ${selected.rda_high} ${selected.default_unit ?? ""}/day`
                          : ""}
                    {selected.upper_limit != null &&
                      ` · Upper limit ${selected.upper_limit} ${selected.default_unit ?? ""}/day`}
                    . Not a recommendation — talk to your clinician.
                  </span>
                </div>
              ) : null}
              <div className="mt-2 flex items-center gap-2">
                <DecimalInput
                  placeholder={controlled ? "Enter your dose" : "Amount"}
                  value={dose}
                  onValueChange={setDose}
                  aria-label="Dose amount"
                  className="tap-target w-full rounded-xl border border-border bg-background px-4 py-3 text-base focus:border-primary focus:outline-none"
                />
                <select
                  value={unit}
                  onChange={(e) => setUnit(e.target.value as DoseUnit)}
                  className="tap-target w-24 rounded-xl border border-border bg-background px-3 py-3 text-base focus:border-primary focus:outline-none"
                >
                  {UNITS.map((u) => (
                    <option key={u} value={u}>
                      {u}
                    </option>
                  ))}
                </select>
              </div>
              {dose.trim() !== "" && !parseDoseInput(dose).ok && (
                <p className="mt-1.5 text-xs text-destructive">
                  {(parseDoseInput(dose) as { ok: false; error: string }).error}
                </p>
              )}
              {!controlled && (
                <CapsuleQuickSet
                  compoundId={selected.id}
                  unit={unit}
                  noun={
                    /(oil|omega|softgel|soft gel)/i.test(selected.name) ? "soft gel" : "capsule"
                  }
                  onApply={(total) => setDose(formatDose(total))}
                  onUnitChange={(u) => setUnit(u as DoseUnit)}
                />
              )}
            </div>
          )}

          {/* Schedule */}
          {selected && (
            <div>
              <label className="flex items-center gap-2 text-sm font-medium">
                <Clock className="h-4 w-4" /> Schedule
              </label>

              {/* Quick templates — one tap sets frequency, days, and times. */}
              <div className="mt-2 -mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1">
                {(
                  [
                    {
                      key: "once",
                      label: "Once daily",
                      freq: "daily" as Freq,
                      days: null,
                      times: ["08:00"],
                    },
                    {
                      key: "twice",
                      label: "Twice daily",
                      freq: "daily" as Freq,
                      days: null,
                      times: ["08:00", "20:00"],
                    },
                    {
                      key: "thrice",
                      label: "3× daily",
                      freq: "daily" as Freq,
                      days: null,
                      times: ["08:00", "14:00", "20:00"],
                    },
                    {
                      key: "morning-night",
                      label: "AM + PM",
                      freq: "daily" as Freq,
                      days: null,
                      times: ["07:00", "21:00"],
                    },
                    {
                      key: "weekly-mon",
                      label: "Weekly (Mon)",
                      freq: "weekly" as Freq,
                      days: [1],
                      times: ["08:00"],
                    },
                    {
                      key: "weekdays",
                      label: "Weekdays",
                      freq: "weekly" as Freq,
                      days: [1, 2, 3, 4, 5],
                      times: ["08:00"],
                    },
                  ] as const
                ).map((tpl) => {
                  const active =
                    freq === tpl.freq &&
                    JSON.stringify(times) === JSON.stringify(tpl.times) &&
                    (tpl.freq !== "weekly" ||
                      JSON.stringify([...days].sort()) ===
                        JSON.stringify([...(tpl.days ?? [])].sort()));
                  return (
                    <button
                      key={tpl.key}
                      type="button"
                      onClick={() => {
                        setScheduleFrequency(tpl.freq);
                        setTimes([...tpl.times]);
                        if (tpl.days) setDays([...tpl.days]);
                      }}
                      className={`tap-target shrink-0 rounded-full border px-3 py-2 text-xs font-medium transition-colors ${
                        active
                          ? "border-primary bg-primary/10 text-foreground"
                          : "border-border bg-background text-muted-foreground hover:bg-card"
                      }`}
                    >
                      {tpl.label}
                    </button>
                  );
                })}
              </div>

              <div className="mt-2 inline-flex rounded-xl bg-card p-1 text-sm font-medium">
                {(["daily", "weekly"] as Freq[]).map((f) => (
                  <button
                    key={f}
                    onClick={() => setScheduleFrequency(f)}
                    className={`tap-target rounded-lg px-4 py-2 capitalize transition-colors ${
                      freq === f
                        ? "bg-background text-foreground shadow-sm"
                        : "text-muted-foreground hover:bg-background/60"
                    }`}
                  >
                    {f}
                  </button>
                ))}
              </div>

              {freq === "weekly" && (
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {DAYS.map((d, i) => {
                    const n = i + 1;
                    const on = days.includes(n);
                    return (
                      <button
                        key={d}
                        onClick={() => toggleDay(n)}
                        className={`tap-target h-11 min-w-[3.25rem] rounded-xl border px-3 text-sm font-medium transition-colors ${
                          on
                            ? "border-primary bg-primary/10 text-foreground"
                            : "border-border bg-background text-muted-foreground hover:bg-card"
                        }`}
                      >
                        {d}
                      </button>
                    );
                  })}
                </div>
              )}

              <div className="mt-3 space-y-2">
                {times.map((t, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <input
                      type="time"
                      value={t}
                      onChange={(e) => updateTime(i, e.target.value)}
                      className="tap-target flex-1 rounded-xl border border-border bg-background px-4 py-3 text-base focus:border-primary focus:outline-none"
                    />
                    {times.length > 1 && (
                      <button
                        onClick={() => removeTime(i)}
                        className="grid h-11 w-11 place-items-center rounded-lg text-muted-foreground hover:bg-card"
                        aria-label="Remove time"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                ))}
                <button
                  onClick={addTime}
                  className="tap-target inline-flex items-center gap-1 rounded-lg px-2 py-2 text-sm font-medium text-primary hover:bg-primary/10"
                >
                  + Add another time
                </button>
              </div>

              <label className="mt-4 flex cursor-pointer items-center justify-between rounded-xl bg-card px-4 py-3">
                <span className="flex items-center gap-2 text-sm">
                  <Utensils className="h-4 w-4" /> Take with food
                </span>
                <input
                  type="checkbox"
                  checked={withFood}
                  onChange={(e) => setWithFood(e.target.checked)}
                  className="h-5 w-5 accent-[color:var(--primary)]"
                />
              </label>
              {selected.food_rule && selected.food_rule !== "either" && (
                <p className="mt-2 text-xs text-muted-foreground">
                  Guidance: usually taken {selected.food_rule.replace("_", " ")}.
                </p>
              )}
            </div>
          )}

          {/* Notes */}
          {selected && (
            <div>
              <label className="text-sm font-medium">Notes</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                placeholder="Optional"
                className="mt-2 w-full rounded-xl border border-border bg-background px-4 py-2 text-sm focus:border-primary focus:outline-none"
              />
            </div>
          )}

          {/* Vial / bottle inventory (existing rows only) */}
          {existing && <VialInventoryCard userCompoundId={existing.id} />}

          {/* Live interaction warnings */}
          {selected && warnings.length > 0 && (
            <div>
              <h3 className="mb-2 font-display text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                Interactions with your stack
              </h3>
              <div className="space-y-2">
                {warnings.map((w, i) => (
                  <WarningRow key={i} {...w} />
                ))}
              </div>
            </div>
          )}

          {error && (
            <p className="rounded-lg bg-[color:var(--severity-avoid-bg))] px-3 py-2 text-sm text-[color:var(--severity-avoid)]">
              {error}
            </p>
          )}
        </div>

        <div className="sticky bottom-0 z-10 border-t border-border bg-background px-5 py-4 pb-[calc(1rem+env(safe-area-inset-bottom))]">
          {!canSave && !saving && (
            <p className="mb-2 text-center text-xs text-muted-foreground">
              {!compoundId ? "Pick a compound to continue" : "Enter a dose to continue"}
            </p>
          )}
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="tap-target flex-1 rounded-xl border border-border bg-background py-3.5 text-base font-medium text-foreground hover:bg-card active:bg-card"
            >
              Cancel
            </button>
            <button
              onClick={save}
              disabled={!canSave || saving}
              className="tap-target flex-[2] rounded-xl bg-primary py-3.5 text-base font-semibold text-primary-foreground shadow-sm hover:bg-[color:var(--primary-hover)] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40"
            >
              {saving ? (
                <span className="inline-flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" /> Saving…
                </span>
              ) : existing ? (
                "Save changes"
              ) : (
                "Add to stack"
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function WarningRow({
  severity,
  text,
  mechanism,
  other,
}: {
  severity: Severity;
  text: string;
  mechanism: string;
  other: string;
}) {
  const map: Record<
    Severity,
    { bg: string; fg: string; label: string; Icon: React.ComponentType<{ className?: string }> }
  > = {
    avoid: {
      bg: "bg-[color:var(--severity-avoid-bg))]",
      fg: "text-[color:var(--severity-avoid)]",
      label: "Avoid",
      Icon: Ban,
    },
    caution: {
      bg: "bg-[color:var(--severity-caution-bg,rgba(245,158,11,0.10))]",
      fg: "text-[color:var(--severity-caution,#d97706)]",
      label: "Caution",
      Icon: AlertTriangle,
    },
    note: {
      bg: "bg-[color:var(--severity-note-bg))]",
      fg: "text-[color:var(--severity-note)]",
      label: "Note",
      Icon: Info,
    },
    synergy: {
      bg: "bg-[color:var(--severity-synergy-bg))]",
      fg: "text-[color:var(--severity-synergy)]",
      label: "Synergy",
      Icon: ShieldCheck,
    },
  };
  const s = map[severity];
  return (
    <div className={`rounded-xl ${s.bg} p-3`}>
      <div
        className={`flex items-center gap-2 text-xs font-semibold uppercase tracking-wider ${s.fg}`}
      >
        <s.Icon className="h-4 w-4" /> {s.label} · with {other}
      </div>
      <p className="mt-1.5 text-sm text-foreground">{text}</p>
      <p className="mt-1 text-xs text-muted-foreground">Why: {mechanism}</p>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Searchable, grouped compound picker                                 */
/* ------------------------------------------------------------------ */

function CompoundCombobox({
  id,
  compounds,
  value,
  onChange,
  disabled,
  loading,
}: {
  id?: string;
  compounds: Compound[];
  value: string;
  onChange: (id: string) => void;
  disabled?: boolean;
  loading?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const listRef = useRef<HTMLDivElement | null>(null);

  const selected = compounds.find((c) => c.id === value) ?? null;

  // Filter across name + category label. Simple case-insensitive contains
  // match; substring is what users expect when hunting a supplement.
  const q = query.trim().toLowerCase();
  const filtered = useMemo(() => {
    if (!q) return compounds;
    return compounds.filter((c) => {
      const cat = CATEGORY_LABEL[c.category as Category]?.toLowerCase() ?? "";
      return c.name.toLowerCase().includes(q) || cat.includes(q);
    });
  }, [compounds, q]);

  // Grouped view: preserve CATEGORIES order (matches the icon set the rest
  // of Stack uses) and skip empty groups.
  const groups = useMemo(() => {
    const map = new Map<Category, Compound[]>();
    for (const c of filtered) {
      const arr = map.get(c.category as Category) ?? [];
      arr.push(c);
      map.set(c.category as Category, arr);
    }
    return CATEGORIES.map((cat) => ({
      key: cat.value,
      label: cat.label,
      Icon: cat.icon,
      items: map.get(cat.value) ?? [],
    })).filter((g) => g.items.length > 0);
  }, [filtered]);

  // Flat index → element id, so ArrowUp/Down and Enter work across groups.
  const flat = useMemo(() => groups.flatMap((g) => g.items), [groups]);

  useEffect(() => {
    if (activeIndex >= flat.length) setActiveIndex(0);
  }, [flat.length, activeIndex]);

  // Close on outside click.
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    window.addEventListener("mousedown", onDown);
    return () => window.removeEventListener("mousedown", onDown);
  }, [open]);

  // Keep the active option in view during keyboard navigation.
  useEffect(() => {
    if (!open) return;
    const el = listRef.current?.querySelector<HTMLElement>(`[data-cb-index="${activeIndex}"]`);
    el?.scrollIntoView({ block: "nearest" });
  }, [activeIndex, open]);

  const commit = (c: Compound) => {
    onChange(c.id);
    setOpen(false);
    setQuery("");
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      if (!open) setOpen(true);
      setActiveIndex((i) => Math.min(i + 1, Math.max(0, flat.length - 1)));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => Math.max(0, i - 1));
    } else if (e.key === "Enter") {
      if (open && flat[activeIndex]) {
        e.preventDefault();
        commit(flat[activeIndex]);
      }
    } else if (e.key === "Escape") {
      if (open) {
        e.preventDefault();
        setOpen(false);
      }
    }
  };

  const listboxId = `${id ?? "compound-combobox"}-listbox`;
  const activeId =
    open && flat[activeIndex] ? `${listboxId}-opt-${flat[activeIndex].id}` : undefined;

  // When disabled (editing an existing entry) render a static readout so we
  // never let the user change the compound after the fact.
  if (disabled) {
    return (
      <Card className="mt-2 flex items-center gap-2 border-border px-3 py-3 text-base text-foreground opacity-80">
        {selected ? (
          <>
            {(() => {
              const Icon = CATEGORY_ICON[selected.category as Category];
              return Icon ? <Icon className="h-4 w-4 text-muted-foreground" /> : null;
            })()}
            <span>{selected.name}</span>
            {selected.is_controlled && (
              <span className="ml-auto rounded bg-[color:var(--severity-caution-bg,rgba(245,158,11,0.10))] px-1.5 py-0.5 text-xs text-[color:var(--severity-caution,#d97706)]">
                controlled
              </span>
            )}
          </>
        ) : (
          <span className="text-muted-foreground">—</span>
        )}
      </Card>
    );
  }

  return (
    <div ref={rootRef} className="relative mt-2">
      <div
        className={`tap-target flex items-center gap-2 rounded-xl border bg-background px-3 py-3 text-base transition-colors ${
          open ? "border-primary" : "border-border"
        }`}
      >
        <Search className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
        <input
          id={id}
          ref={inputRef}
          type="text"
          role="combobox"
          aria-expanded={open}
          aria-controls={listboxId}
          aria-autocomplete="list"
          aria-activedescendant={activeId}
          placeholder={
            loading
              ? "Loading compounds…"
              : selected
                ? selected.name
                : "Search compounds (e.g. creatine, magnesium)…"
          }
          value={open ? query : (selected?.name ?? "")}
          disabled={loading}
          onFocus={() => setOpen(true)}
          onChange={(e) => {
            setQuery(e.target.value);
            setActiveIndex(0);
            if (!open) setOpen(true);
          }}
          onKeyDown={onKeyDown}
          className="w-full min-w-0 bg-transparent text-base outline-none placeholder:text-muted-foreground disabled:opacity-60"
        />
        {selected && !open && (
          <button
            type="button"
            onClick={() => {
              onChange("");
              setQuery("");
              inputRef.current?.focus();
            }}
            className="rounded p-1 text-muted-foreground hover:bg-card"
            aria-label="Clear compound"
          >
            <X className="h-4 w-4" />
          </button>
        )}
        <button
          type="button"
          onClick={() => {
            setOpen((o) => !o);
            requestAnimationFrame(() => inputRef.current?.focus());
          }}
          className="rounded p-1 text-muted-foreground hover:bg-card"
          aria-label={open ? "Close compound list" : "Open compound list"}
          tabIndex={-1}
        >
          <ChevronDown className={`h-4 w-4 transition-transform ${open ? "rotate-180" : ""}`} />
        </button>
      </div>

      {open && (
        <div
          ref={listRef}
          id={listboxId}
          role="listbox"
          className="absolute left-0 right-0 top-[calc(100%+4px)] z-30 max-h-72 overflow-y-auto rounded-xl border border-border bg-background shadow-lg"
        >
          {loading ? (
            <div className="flex items-center gap-2 px-4 py-3 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading compounds…
            </div>
          ) : groups.length === 0 ? (
            <div className="px-4 py-3 text-sm text-muted-foreground">
              No compounds match “{query}”.
            </div>
          ) : (
            groups.map((g) => {
              const startIndex = flat.indexOf(g.items[0]);
              return (
                <div key={g.key} role="group" aria-label={g.label}>
                  <div className="sticky top-0 flex items-center gap-2 border-b border-border bg-card px-3 py-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    <g.Icon className="h-3.5 w-3.5" />
                    {g.label}
                    <span className="ml-auto text-[10px] font-normal opacity-70">
                      {g.items.length}
                    </span>
                  </div>
                  {g.items.map((c, i) => {
                    const idx = startIndex + i;
                    const active = idx === activeIndex;
                    const isSelected = c.id === value;
                    return (
                      <button
                        key={c.id}
                        id={`${listboxId}-opt-${c.id}`}
                        role="option"
                        aria-selected={isSelected}
                        data-cb-index={idx}
                        type="button"
                        onMouseEnter={() => setActiveIndex(idx)}
                        onClick={() => commit(c)}
                        className={`flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm transition-colors ${
                          active ? "bg-card" : "bg-background"
                        } hover:bg-card`}
                      >
                        <span className="flex-1 truncate">{c.name}</span>
                        {c.is_controlled && (
                          <span className="rounded bg-[color:var(--severity-caution-bg,rgba(245,158,11,0.10))] px-1.5 py-0.5 text-[10px] text-[color:var(--severity-caution,#d97706)]">
                            controlled
                          </span>
                        )}
                        {isSelected && (
                          <Check className="h-4 w-4 text-primary" aria-hidden="true" />
                        )}
                      </button>
                    );
                  })}
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
