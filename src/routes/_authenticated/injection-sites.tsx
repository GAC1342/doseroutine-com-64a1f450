import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, MapPin, Trash2, Plus } from "lucide-react";
import { DisclaimerFooter } from "@/components/disclaimer-footer";
import { Card } from "@/components/ui/card";
import { routeErrorComponent } from "@/components/route-error-panel";

export const Route = createFileRoute("/_authenticated/injection-sites")({
  errorComponent: routeErrorComponent("injection-sites"),
  head: () => ({
    meta: [
      { title: "Injection Site Rotation — DoseRoutine" },
      {
        name: "description",
        content:
          "Track injection sites to rotate safely, avoid scar tissue, and see which spots you've used most recently.",
      },
      { property: "og:title", content: "Injection Site Rotation Tracker" },
      {
        property: "og:description",
        content: "Rotate injection sites safely with a visual log of recent injections.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: InjectionSitesPage,
});

type Site = {
  id: string;
  key: string;
  label: string;
  group: string;
  type: "sc" | "im";
};

const SITES: Site[] = [
  {
    id: "1",
    key: "abdomen_ul",
    label: "Abdomen · Upper Left",
    group: "Abdomen (SubQ)",
    type: "sc",
  },
  {
    id: "2",
    key: "abdomen_ur",
    label: "Abdomen · Upper Right",
    group: "Abdomen (SubQ)",
    type: "sc",
  },
  {
    id: "3",
    key: "abdomen_ll",
    label: "Abdomen · Lower Left",
    group: "Abdomen (SubQ)",
    type: "sc",
  },
  {
    id: "4",
    key: "abdomen_lr",
    label: "Abdomen · Lower Right",
    group: "Abdomen (SubQ)",
    type: "sc",
  },
  {
    id: "5",
    key: "thigh_l_front",
    label: "Thigh · Left Front",
    group: "Thigh (SubQ / IM)",
    type: "sc",
  },
  {
    id: "6",
    key: "thigh_r_front",
    label: "Thigh · Right Front",
    group: "Thigh (SubQ / IM)",
    type: "sc",
  },
  {
    id: "7",
    key: "thigh_l_outer",
    label: "Thigh · Left Outer (VL)",
    group: "Thigh (SubQ / IM)",
    type: "im",
  },
  {
    id: "8",
    key: "thigh_r_outer",
    label: "Thigh · Right Outer (VL)",
    group: "Thigh (SubQ / IM)",
    type: "im",
  },
  {
    id: "9",
    key: "glute_l",
    label: "Glute · Left (Ventrogluteal)",
    group: "Glute (IM)",
    type: "im",
  },
  {
    id: "10",
    key: "glute_r",
    label: "Glute · Right (Ventrogluteal)",
    group: "Glute (IM)",
    type: "im",
  },
  { id: "11", key: "delt_l", label: "Deltoid · Left", group: "Deltoid (IM)", type: "im" },
  { id: "12", key: "delt_r", label: "Deltoid · Right", group: "Deltoid (IM)", type: "im" },
  {
    id: "13",
    key: "love_handle_l",
    label: "Love Handle · Left",
    group: "Flank (SubQ)",
    type: "sc",
  },
  {
    id: "14",
    key: "love_handle_r",
    label: "Love Handle · Right",
    group: "Flank (SubQ)",
    type: "sc",
  },
];

function daysAgo(iso: string) {
  const ms = Date.now() - new Date(iso).getTime();
  const d = Math.floor(ms / 86400000);
  if (d === 0) return "today";
  if (d === 1) return "1 day ago";
  return `${d} days ago`;
}

function InjectionSitesPage() {
  const qc = useQueryClient();
  const [selectedCompound, setSelectedCompound] = useState<string>("");

  const { data: entries = [] } = useQuery({
    queryKey: ["injection-sites"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("injection_sites")
        .select("id, site, used_at, user_compound_id")
        .order("used_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: compounds = [] } = useQuery({
    queryKey: ["user-compounds-inject"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_compounds")
        .select("id, custom_name, compound_id, compounds(name)")
        .eq("active", true);
      if (error) throw error;
      return (data ?? []) as Array<{
        id: string;
        custom_name: string | null;
        compounds: { name: string } | null;
      }>;
    },
  });

  const lastBySite = useMemo(() => {
    const map: Record<string, string> = {};
    for (const e of entries) {
      if (e.used_at && !map[e.site]) map[e.site] = e.used_at;
    }
    return map;
  }, [entries]);

  const suggested = useMemo(() => {
    // Site with oldest last-use (or never used)
    let best: Site | null = null;
    let bestTime = Infinity;
    for (const s of SITES) {
      const last = lastBySite[s.key];
      const t = last ? new Date(last).getTime() : 0;
      if (t < bestTime) {
        bestTime = t;
        best = s;
      }
    }
    return best;
  }, [lastBySite]);

  const logMutation = useMutation({
    mutationFn: async (siteKey: string) => {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error("Not signed in");
      const { error } = await supabase.from("injection_sites").insert({
        user_id: user.user.id,
        site: siteKey,
        user_compound_id: selectedCompound || null,
        used_at: new Date().toISOString(),
      });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["injection-sites"] }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("injection_sites").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["injection-sites"] }),
  });

  const groups = useMemo(() => {
    const g: Record<string, Site[]> = {};
    for (const s of SITES) {
      if (!g[s.group]) g[s.group] = [];
      g[s.group].push(s);
    }
    return g;
  }, []);

  return (
    <div className="mx-auto max-w-2xl px-6 py-8">
      <Link
        to="/more"
        className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Back
      </Link>
      <h1 className="font-display text-3xl font-semibold tracking-tight">Injection Sites</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Rotate to avoid scar tissue, lipohypertrophy, and poor absorption. Log each shot to see
        which spots need a rest.
      </p>

      {suggested && (
        <div className="mt-6 rounded-2xl border border-primary/30 bg-primary/5 p-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-primary">
            <MapPin className="h-4 w-4" /> Suggested next site
          </div>
          <p className="mt-1 text-base font-medium text-foreground">{suggested.label}</p>
          <p className="text-xs text-muted-foreground">
            {lastBySite[suggested.key]
              ? `Last used ${daysAgo(lastBySite[suggested.key])}`
              : "Never used"}
          </p>
        </div>
      )}

      {compounds.length > 0 && (
        <div className="mt-6 rounded-2xl bg-card p-4">
          <label className="text-xs font-medium text-muted-foreground">
            Log against (optional)
          </label>
          <select
            value={selectedCompound}
            onChange={(e) => setSelectedCompound(e.target.value)}
            className="mt-2 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm"
          >
            <option value="">— No compound —</option>
            {compounds.map((c) => (
              <option key={c.id} value={c.id}>
                {c.custom_name || c.compounds?.name || "Compound"}
              </option>
            ))}
          </select>
        </div>
      )}

      <div className="mt-6 space-y-4">
        {Object.entries(groups).map(([group, sites]) => (
          <div key={group} className="rounded-2xl bg-card p-4">
            <h2 className="mb-3 text-sm font-semibold text-foreground">{group}</h2>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {sites.map((s) => {
                const last = lastBySite[s.key];
                const dayCount = last
                  ? Math.floor((Date.now() - new Date(last).getTime()) / 86400000)
                  : null;
                const fresh = dayCount !== null && dayCount < 7;
                return (
                  <button
                    key={s.key}
                    onClick={() => logMutation.mutate(s.key)}
                    disabled={logMutation.isPending}
                    className={`tap-target flex items-center justify-between rounded-xl border px-3 py-3 text-left text-sm transition ${
                      fresh
                        ? "border-amber-500/30 bg-amber-500/5"
                        : "border-border bg-background hover:border-primary/40"
                    }`}
                  >
                    <div>
                      <div className="font-medium text-foreground">{s.label}</div>
                      <div className="text-xs text-muted-foreground">
                        {last ? `Last: ${daysAgo(last)}` : "Never used"}
                        <span className="ml-2 uppercase">{s.type}</span>
                      </div>
                    </div>
                    <Plus className="h-4 w-4 text-primary" />
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-6 rounded-2xl bg-card p-4">
        <h2 className="mb-3 text-sm font-semibold text-foreground">Recent injections</h2>
        {entries.length === 0 ? (
          <p className="text-sm text-muted-foreground">No injections logged yet.</p>
        ) : (
          <ul className="space-y-2">
            {entries.slice(0, 20).map((e) => {
              const site = SITES.find((s) => s.key === e.site);
              return (
                <li
                  key={e.id}
                  className="flex items-center justify-between rounded-xl border border-border bg-background px-3 py-2 text-sm"
                >
                  <div>
                    <div className="font-medium text-foreground">{site?.label ?? e.site}</div>
                    <div className="text-xs text-muted-foreground">
                      {e.used_at ? new Date(e.used_at).toLocaleString() : "—"}
                    </div>
                  </div>
                  <button
                    onClick={() => deleteMutation.mutate(e.id)}
                    className="rounded-lg p-2 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                    aria-label="Delete"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <Card className="mt-6 rounded-2xl border-border p-4 text-xs text-muted-foreground">
        <strong className="text-foreground">Rotation guidance:</strong> aim for at least 1 inch
        (~2.5 cm) from any prior injection, and give each specific spot 7+ days before returning to
        it. If a site is swollen, red, warm, or lumpy, skip it and consult a qualified health
        professional.
      </Card>

      <DisclaimerFooter />
    </div>
  );
}
