import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, Download, FileJson, FileSpreadsheet, ShieldCheck } from "lucide-react";
import { DisclaimerFooter } from "@/components/disclaimer-footer";
import { Card } from "@/components/ui/card";

export const Route = createFileRoute("/_authenticated/export")({
  head: () => ({
    meta: [
      { title: "Export Your Data — DoseRoutine" },
      {
        name: "description",
        content:
          "Download everything DoseRoutine stores about you — stack, schedule, doses taken, labs, check-ins, side effects, injection sites — as CSV or a full JSON archive.",
      },
      { property: "og:title", content: "Export your DoseRoutine data" },
      {
        property: "og:description",
        content:
          "Full CSV / JSON export of your stack, doses, labs, and check-ins. Your data, portable.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ExportPage,
});

type Table =
  | "user_compounds"
  | "schedule_events"
  | "vial_inventory"
  | "lab_panels"
  | "lab_results"
  | "body_checkins"
  | "side_effects"
  | "injection_sites"
  | "workout_sessions"
  | "meals"
  | "reminders"
  | "acknowledgments";

const TABLES: { key: Table; label: string; desc: string }[] = [
  { key: "user_compounds", label: "Stack", desc: "Compounds, doses, frequency, cycles" },
  {
    key: "schedule_events",
    label: "Schedule / doses taken",
    desc: "Every scheduled and logged dose",
  },
  { key: "vial_inventory", label: "Vial inventory & costs", desc: "Doses left, cost per vial" },
  { key: "lab_panels", label: "Lab panels", desc: "Draw dates and lab names" },
  { key: "lab_results", label: "Lab results", desc: "Individual marker values" },
  { key: "body_checkins", label: "Check-ins", desc: "Weight, mood, energy, sleep" },
  { key: "side_effects", label: "Side effect journal", desc: "Symptoms, severity, resolutions" },
  { key: "injection_sites", label: "Injection log", desc: "Sites and rotation history" },
  { key: "workout_sessions", label: "Workouts", desc: "Sessions and volume" },
  { key: "meals", label: "Meals", desc: "Logged meals and macros" },
  { key: "reminders", label: "Reminder rules", desc: "Alert configuration" },
  { key: "acknowledgments", label: "Acknowledgments", desc: "Safety confirmations you accepted" },
];

function toCSV(rows: Record<string, unknown>[]): string {
  if (rows.length === 0) return "";
  const cols = Array.from(
    rows.reduce((set, r) => {
      Object.keys(r).forEach((k) => set.add(k));
      return set;
    }, new Set<string>()),
  );
  const esc = (v: unknown) => {
    if (v == null) return "";
    const s = typeof v === "object" ? JSON.stringify(v) : String(v);
    return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return [cols.join(","), ...rows.map((r) => cols.map((c) => esc(r[c])).join(","))].join("\n");
}

function download(name: string, mime: string, content: string) {
  const blob = new Blob([content], { type: `${mime};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 500);
}

async function fetchAll() {
  const out: Record<string, unknown[]> = {};
  for (const t of TABLES) {
    const { data, error } = await supabase.from(t.key).select("*");
    if (error) throw error;
    out[t.key] = data ?? [];
  }
  const { data: prof } = await supabase.from("profiles").select("*").maybeSingle();
  out.profile = prof ? [prof] : [];
  return out;
}

function ExportPage() {
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  async function exportJson() {
    setBusy("json");
    setMsg(null);
    try {
      const all = await fetchAll();
      const payload = {
        app: "DoseRoutine",
        exportedAt: new Date().toISOString(),
        version: 1,
        data: all,
      };
      const stamp = new Date().toISOString().slice(0, 10);
      download(
        `doseroutine-export-${stamp}.json`,
        "application/json",
        JSON.stringify(payload, null, 2),
      );
      setMsg("JSON archive downloaded.");
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Export failed");
    } finally {
      setBusy(null);
    }
  }

  async function exportCsv(t: Table) {
    setBusy(t);
    setMsg(null);
    try {
      const { data, error } = await supabase.from(t).select("*");
      if (error) throw error;
      const csv = toCSV(data ?? []);
      const stamp = new Date().toISOString().slice(0, 10);
      download(`doseroutine-${t}-${stamp}.csv`, "text/csv", csv || "no rows\n");
      setMsg(`${t}.csv downloaded (${data?.length ?? 0} rows).`);
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Export failed");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="mx-auto max-w-2xl px-6 py-8">
      <Link
        to="/more"
        className="tap-target inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> More
      </Link>
      <h1 className="mt-4 font-display text-3xl font-semibold tracking-tight">Export your data</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Download everything DoseRoutine stores about you. Nothing is sent to a server — the file is
        built in your browser from your own account.
      </p>

      <Card className="mt-6 rounded-2xl border-border p-4">
        <div className="flex items-center gap-2 text-sm font-semibold">
          <ShieldCheck className="h-4 w-4 text-primary" />
          Full archive (recommended)
        </div>
        <p className="mt-1 text-xs text-muted-foreground">
          One JSON file with every table below. Best for backups, moving apps, or GDPR /
          data-portability requests.
        </p>
        <button
          onClick={exportJson}
          disabled={busy !== null}
          className="tap-target mt-3 inline-flex items-center gap-2 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground disabled:opacity-60"
        >
          <FileJson className="h-4 w-4" />
          {busy === "json" ? "Building archive…" : "Download JSON archive"}
        </button>
      </Card>

      <h2 className="mt-8 font-display text-lg font-semibold">Per-table CSV</h2>
      <p className="mt-1 text-xs text-muted-foreground">
        Open in Excel, Numbers, or Google Sheets.
      </p>
      <div className="mt-3 space-y-2">
        {TABLES.map((t) => (
          <Card
            key={t.key}
            className="flex items-center justify-between gap-3 border-border px-4 py-3"
          >
            <div className="min-w-0">
              <div className="text-sm font-medium">{t.label}</div>
              <div className="truncate text-xs text-muted-foreground">{t.desc}</div>
            </div>
            <button
              onClick={() => exportCsv(t.key)}
              disabled={busy !== null}
              className="tap-target inline-flex shrink-0 items-center gap-2 rounded-lg border border-border bg-background px-3 text-xs font-semibold text-foreground disabled:opacity-60"
            >
              {busy === t.key ? (
                <Download className="h-3.5 w-3.5 animate-pulse" />
              ) : (
                <FileSpreadsheet className="h-3.5 w-3.5" />
              )}
              CSV
            </button>
          </Card>
        ))}
      </div>

      {msg && <p className="mt-4 text-sm text-muted-foreground">{msg}</p>}

      <DisclaimerFooter />
    </div>
  );
}
