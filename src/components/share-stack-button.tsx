import { useEffect, useState } from "react";
import { Share2, Copy, Check, Loader2, Trash2, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import {
  generateShareToken,
  type SharedProtocolItem,
  type SharedProtocolSnapshot,
} from "@/lib/shared-protocol";

type UC = Database["public"]["Tables"]["user_compounds"]["Row"] & {
  compound: Database["public"]["Tables"]["compounds"]["Row"] | null;
};

type SharedRow = {
  token: string;
  title: string;
  created_at: string;
};

function buildSnapshot(title: string, rows: UC[]): SharedProtocolSnapshot {
  const items: SharedProtocolItem[] = rows
    .filter((r) => r.active)
    .map((r) => ({
      name: r.compound?.name ?? r.custom_name ?? "Unnamed",
      category: (r.compound?.category ?? r.custom_category ?? null) as string | null,
      brand: null,
      dose_amount: r.dose_amount ?? null,
      dose_unit: r.dose_unit ?? null,
      frequency: r.frequency ?? null,
      times: r.times_of_day ?? null,
      days_of_week: r.days_of_week ?? null,
      cycle_on_days: r.cycle_on_days ?? null,
      cycle_off_days: r.cycle_off_days ?? null,
      notes: r.notes ?? null,
      active: !!r.active,
    }));
  return {
    version: 1,
    title,
    createdAt: new Date().toISOString(),
    items,
  };
}

export function ShareStackButton({ rows }: { rows: UC[] }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="tap-target inline-flex h-11 items-center gap-2 rounded-xl border border-border bg-background px-4 text-sm font-semibold text-foreground shadow-sm hover:bg-muted active:scale-[0.98]"
      >
        <Share2 className="h-4 w-4" /> Share
      </button>
      {open && <ShareSheet rows={rows} onClose={() => setOpen(false)} />}
    </>
  );
}

function ShareSheet({ rows, onClose }: { rows: UC[]; onClose: () => void }) {
  const [title, setTitle] = useState("My stack");
  const [links, setLinks] = useState<SharedRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [copiedToken, setCopiedToken] = useState<string | null>(null);

  // Load existing links
  useEffect(() => {
    let alive = true;
    void (async () => {
      const { data } = await supabase
        .from("shared_protocols" as never)
        .select("token,title,created_at")
        .order("created_at", { ascending: false });
      if (!alive) return;
      setLinks((data as SharedRow[] | null) ?? []);
      setLoading(false);
    })();
    return () => {
      alive = false;
    };
  }, []);

  async function createLink() {
    setCreating(true);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setCreating(false);
      return;
    }
    const token = generateShareToken();
    const snapshot = buildSnapshot(title.trim() || "My stack", rows);
    const { error } = await (
      supabase.from("shared_protocols" as never) as unknown as {
        insert: (v: unknown) => Promise<{ error: unknown }>;
      }
    ).insert({
      token,
      owner_id: user.id,
      title: title.trim() || "My stack",
      snapshot,
    });
    if (!error) {
      const newRow: SharedRow = {
        token,
        title: title.trim() || "My stack",
        created_at: new Date().toISOString(),
      };
      setLinks((prev) => [newRow, ...prev]);
      await copyToClipboard(`${window.location.origin}/p/${token}`, token);
    }
    setCreating(false);
  }

  async function copyToClipboard(url: string, token: string) {
    try {
      await navigator.clipboard.writeText(url);
      setCopiedToken(token);
      setTimeout(() => setCopiedToken((c) => (c === token ? null : c)), 2000);
    } catch {
      /* ignore */
    }
  }

  async function revoke(token: string) {
    if (!confirm("Revoke this link? Anyone with it will no longer be able to view.")) return;
    const { error } = await (
      supabase.from("shared_protocols" as never) as unknown as {
        delete: () => { eq: (col: string, val: string) => Promise<{ error: unknown }> };
      }
    )
      .delete()
      .eq("token", token);
    if (!error) setLinks((prev) => prev.filter((l) => l.token !== token));
  }

  const activeCount = rows.filter((r) => r.active).length;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-6"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg overflow-hidden rounded-t-3xl bg-background shadow-xl sm:rounded-3xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <h2 className="font-display text-lg font-semibold">Share your stack</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="tap-target -m-2 rounded-full p-2 text-muted-foreground hover:bg-muted"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="max-h-[75vh] overflow-y-auto px-5 py-5">
          <p className="text-sm text-muted-foreground">
            Creates a read-only link with a snapshot of your {activeCount} active item
            {activeCount === 1 ? "" : "s"}. Anyone with the link can view. Doses, brands, and notes
            are visible. Personal identity is not shown.
          </p>

          <div className="mt-4 space-y-2">
            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Title (only you see edit; viewers see it too)
            </label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={80}
              className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-primary"
              placeholder="e.g. My TRT + peptide protocol"
            />
          </div>

          <button
            type="button"
            onClick={createLink}
            disabled={creating || activeCount === 0}
            className="mt-4 inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground shadow-sm hover:bg-[color:var(--primary-hover)] disabled:opacity-50"
          >
            {creating ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Share2 className="h-4 w-4" />
            )}
            {creating ? "Creating…" : "Create share link & copy"}
          </button>

          <div className="mt-6">
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Your shared links
            </h3>
            {loading ? (
              <p className="text-sm text-muted-foreground">Loading…</p>
            ) : links.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                None yet. Create one above — it will be copied to your clipboard.
              </p>
            ) : (
              <ul className="space-y-2">
                {links.map((l) => {
                  const url =
                    typeof window !== "undefined"
                      ? `${window.location.origin}/p/${l.token}`
                      : `/p/${l.token}`;
                  const copied = copiedToken === l.token;
                  return (
                    <li key={l.token} className="rounded-xl border border-border bg-card p-3">
                      <p className="truncate text-sm font-medium">{l.title}</p>
                      <p className="mt-0.5 truncate text-xs text-muted-foreground">{url}</p>
                      <div className="mt-2 flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => copyToClipboard(url, l.token)}
                          className="tap-target inline-flex h-9 items-center gap-1.5 rounded-lg border border-border bg-background px-3 text-xs font-semibold hover:bg-muted"
                        >
                          {copied ? (
                            <Check className="h-3.5 w-3.5 text-primary" />
                          ) : (
                            <Copy className="h-3.5 w-3.5" />
                          )}
                          {copied ? "Copied" : "Copy link"}
                        </button>
                        <button
                          type="button"
                          onClick={() => revoke(l.token)}
                          className="tap-target inline-flex h-9 items-center gap-1.5 rounded-lg border border-destructive/30 bg-background px-3 text-xs font-semibold text-destructive hover:bg-destructive/10"
                        >
                          <Trash2 className="h-3.5 w-3.5" /> Revoke
                        </button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          <p className="mt-5 text-xs text-muted-foreground">
            Links are read-only snapshots. Changing your stack later does not update already-shared
            links. Revoke a link any time.
          </p>
        </div>
      </div>
    </div>
  );
}
