import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useSubscription } from "@/hooks/use-subscription";
import { ArrowLeft, Camera, Trash2, Upload, ImageOff } from "lucide-react";
import { Card } from "@/components/ui/card";
import { useConfirm } from "@/components/confirm-dialog";
import { routeErrorComponent } from "@/components/route-error-panel";

export const Route = createFileRoute("/_authenticated/progress-photos")({
  errorComponent: routeErrorComponent("progress-photos"),
  head: () => ({
    meta: [
      { title: "Progress Photos — DoseRoutine" },
      {
        name: "description",
        content:
          "Private before/after progress photos with weight and notes. Only you can see them.",
      },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: ProgressPhotosPage,
});

type PhotoRow = {
  id: string;
  storage_path: string;
  taken_at: string;
  category: string;
  weight_kg: number | null;
  notes: string | null;
};

const CATEGORIES = ["front", "side", "back", "face", "other"] as const;

const MB = 1024 * 1024;
function quotaBytes(
  sub: { isPro?: boolean; active?: boolean; plan?: string | null } | undefined | null,
): number {
  // Free / trial: 20 MB. Pro monthly: 250 MB. Pro yearly: 500 MB.
  if (!sub?.isPro || !sub.active) return 20 * MB;
  if (sub.plan === "yearly") return 500 * MB;
  return 250 * MB;
}
function fmtMB(bytes: number): string {
  return `${(bytes / MB).toFixed(bytes < 10 * MB ? 1 : 0)} MB`;
}

function ProgressPhotosPage() {
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [category, setCategory] = useState<(typeof CATEGORIES)[number]>("front");
  const [weight, setWeight] = useState("");
  const [notes, setNotes] = useState("");
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { data: subscription } = useSubscription();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- lint-baseline: pre-existing; do not add new ones.
  const quota = quotaBytes(subscription as any);

  const { data: photos, isLoading } = useQuery({
    queryKey: ["progress-photos"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("progress_photos")
        .select("*")
        .order("taken_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as PhotoRow[];
    },
  });

  const { data: storageUsed = 0, refetch: refetchUsage } = useQuery({
    queryKey: ["progress-photos-usage"],
    queryFn: async () => {
      const { data: userRes } = await supabase.auth.getUser();
      const uid = userRes.user?.id;
      if (!uid) return 0;
      const { data } = await supabase.storage.from("progress-photos").list(uid, { limit: 1000 });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- lint-baseline: pre-existing; do not add new ones.
      return (data ?? []).reduce((s, f) => s + ((f.metadata as any)?.size ?? 0), 0);
    },
  });

  async function handleUpload(file: File) {
    setError(null);
    if (storageUsed + file.size > quota) {
      setError(
        `Storage full (${fmtMB(storageUsed)} of ${fmtMB(quota)} used). ${subscription?.isPro && subscription.plan === "yearly" ? "Delete older photos to free space." : "Upgrade for more space or delete older photos."}`,
      );
      return;
    }
    setUploading(true);
    try {
      const { data: userRes } = await supabase.auth.getUser();
      const uid = userRes.user?.id;
      if (!uid) throw new Error("Not signed in");
      const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
      const path = `${uid}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("progress-photos")
        .upload(path, file, { contentType: file.type, upsert: false });
      if (upErr) throw upErr;
      const { error: insErr } = await supabase.from("progress_photos").insert({
        user_id: uid,
        storage_path: path,
        category,
        weight_kg: weight ? Number(weight) : null,
        notes: notes || null,
      });
      if (insErr) throw insErr;
      setWeight("");
      setNotes("");
      qc.invalidateQueries({ queryKey: ["progress-photos"] });
      refetchUsage();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  const del = useMutation({
    mutationFn: async (photo: PhotoRow) => {
      await supabase.storage.from("progress-photos").remove([photo.storage_path]);
      const { error } = await supabase.from("progress_photos").delete().eq("id", photo.id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["progress-photos"] });
      refetchUsage();
    },
  });

  const pct = Math.min(100, Math.round((storageUsed / quota) * 100));
  const nearFull = pct >= 85;

  return (
    <div className="mx-auto max-w-4xl px-6 py-10">
      <Link
        to="/more"
        className="mb-4 inline-flex items-center gap-2 text-sm text-muted-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Back to More
      </Link>
      <h1 className="font-display text-3xl font-semibold tracking-tight">Progress Photos</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Private before/after tracking. Photos are stored securely and only visible to you.
      </p>

      <Card className="mt-4 rounded-2xl border-border p-4">
        <div className="flex items-center justify-between text-xs">
          <span className="font-semibold">Photo storage</span>
          <span className={nearFull ? "text-destructive" : "text-muted-foreground"}>
            {fmtMB(storageUsed)} of {fmtMB(quota)}
          </span>
        </div>
        <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-muted">
          <div
            className={nearFull ? "h-full bg-destructive" : "h-full bg-primary"}
            style={{ width: `${pct}%` }}
          />
        </div>
        <p className="mt-2 text-[11px] text-muted-foreground">
          {subscription?.isPro && subscription.active
            ? subscription.plan === "yearly"
              ? "Pro yearly · 500 MB included."
              : "Pro monthly · 250 MB included. Upgrade to yearly for 500 MB."
            : "Free · 20 MB included. Upgrade to Pro for 250–500 MB."}
        </p>
      </Card>

      <Card className="mt-6 rounded-2xl border-border p-4">
        <div className="mb-3 flex items-center gap-2 text-sm font-semibold">
          <Camera className="h-4 w-4 text-primary" /> New photo
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          <label className="text-xs">
            <span className="text-muted-foreground">Angle</span>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as (typeof CATEGORIES)[number])}
              className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
            >
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c[0].toUpperCase() + c.slice(1)}
                </option>
              ))}
            </select>
          </label>
          <label className="text-xs">
            <span className="text-muted-foreground">Weight (kg, optional)</span>
            <input
              type="number"
              inputMode="decimal"
              step="0.1"
              value={weight}
              onChange={(e) => setWeight(e.target.value)}
              className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
              placeholder="e.g. 82.5"
            />
          </label>
          <label className="text-xs sm:col-span-1">
            <span className="text-muted-foreground">Notes (optional)</span>
            <input
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
              placeholder="Week 4 TRT"
            />
          </label>
        </div>
        <div className="mt-4 flex items-center gap-3">
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleUpload(f);
            }}
          />
          <button
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            className="tap-target inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50"
          >
            <Upload className="h-4 w-4" />
            {uploading ? "Uploading…" : "Add photo"}
          </button>
          {error && <span className="text-xs text-destructive">{error}</span>}
        </div>
      </Card>

      <div className="mt-8">
        <h2 className="text-lg font-semibold">Timeline</h2>
        {isLoading ? (
          <p className="mt-3 text-sm text-muted-foreground">Loading…</p>
        ) : !photos || photos.length === 0 ? (
          <div className="mt-4 rounded-2xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
            <ImageOff className="mx-auto mb-2 h-6 w-6" />
            No photos yet. Take your first one above to start tracking progress.
          </div>
        ) : (
          <div className="mt-4 grid gap-4 sm:grid-cols-2 md:grid-cols-3">
            {photos.map((p) => (
              <PhotoCard key={p.id} photo={p} onDelete={() => del.mutate(p)} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function PhotoCard({ photo, onDelete }: { photo: PhotoRow; onDelete: () => void }) {
  const [confirmAction, confirmUi] = useConfirm();
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    let active = true;
    (async () => {
      const { data } = await supabase.storage
        .from("progress-photos")
        .createSignedUrl(photo.storage_path, 3600);
      if (active) setUrl(data?.signedUrl ?? null);
    })();
    return () => {
      active = false;
    };
  }, [photo.storage_path]);
  return (
    <Card className="overflow-hidden rounded-2xl border-border">
      <div className="aspect-square w-full bg-muted">
        {url ? (
          <img
            src={url}
            alt={`${photo.category} progress photo`}
            title={`${photo.category} progress photo`}
            width={600}
            height={600}
            className="h-full w-full object-cover"
            loading="lazy"
            decoding="async"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
            Loading…
          </div>
        )}
      </div>
      <div className="p-3">
        {confirmUi}
        <div className="flex items-center justify-between">
          <div className="text-xs font-semibold uppercase tracking-wide text-primary">
            {photo.category}
          </div>
          <button
            onClick={() => {
              void confirmAction({
                title: "Delete this photo?",
                description: "This cannot be undone.",
              }).then((ok) => {
                if (ok) onDelete();
              });
            }}
            className="rounded-md p-2 -m-2 text-muted-foreground hover:text-destructive focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-destructive"
            aria-label="Delete photo"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
        <div className="mt-1 text-xs text-muted-foreground">
          {new Date(photo.taken_at).toLocaleDateString()}
          {photo.weight_kg != null && <> · {photo.weight_kg} kg</>}
        </div>
        {photo.notes && <div className="mt-1 text-xs text-foreground">{photo.notes}</div>}
      </div>
    </Card>
  );
}
