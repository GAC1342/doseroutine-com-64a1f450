import { useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Upload } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { trackEvent } from "@/lib/analytics";

const AVATAR_QK = ["avatar-url"] as const;
const PROFILE_QK = ["avatar-profile"] as const;

async function loadProfile() {
  const { data: userRes } = await supabase.auth.getUser();
  const user = userRes.user;
  if (!user) return null;
  const { data } = await supabase
    .from("profiles")
    .select("display_name, avatar_url")
    .eq("id", user.id)
    .maybeSingle();
  return { id: user.id, email: user.email ?? "", ...data };
}

async function loadSignedAvatarUrl(path: string | null | undefined): Promise<string | null> {
  if (!path) return null;
  const { data } = await supabase.storage.from("avatars").createSignedUrl(path, 60 * 60);
  return data?.signedUrl ?? null;
}

function initialsFrom(name: string | null | undefined, email: string): string {
  const src = (name || email || "?").trim();
  if (!src) return "?";
  const parts = src.split(/[\s@._-]+/).filter(Boolean);
  const first = parts[0]?.[0] ?? "?";
  const second = parts[1]?.[0] ?? "";
  return (first + second).toUpperCase();
}

async function resizeToWebp(file: File, size = 512): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(size / bitmap.width, size / bitmap.height, 1);
  const w = Math.round(bitmap.width * scale);
  const h = Math.round(bitmap.height * scale);
  const canvas = document.createElement("canvas");
  // Crop to square from center for header display.
  const side = Math.min(w, h);
  canvas.width = side;
  canvas.height = side;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas unsupported");
  ctx.drawImage(
    bitmap,
    ((w - side) / 2 / scale) * -1 + 0,
    0,
    bitmap.width,
    bitmap.height,
    0,
    0,
    w,
    h,
  );
  // Simpler: redraw with cover-fit.
  ctx.clearRect(0, 0, side, side);
  const srcSize = Math.min(bitmap.width, bitmap.height);
  const sx = (bitmap.width - srcSize) / 2;
  const sy = (bitmap.height - srcSize) / 2;
  ctx.drawImage(bitmap, sx, sy, srcSize, srcSize, 0, 0, side, side);
  return await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("Encode failed"))), "image/webp", 0.85);
  });
}

export function AvatarMenu() {
  const qc = useQueryClient();
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const { data: profile } = useQuery({
    queryKey: PROFILE_QK,
    queryFn: loadProfile,
    staleTime: 60_000,
  });
  const { data: signedUrl } = useQuery({
    queryKey: [...AVATAR_QK, profile?.avatar_url ?? null],
    queryFn: () => loadSignedAvatarUrl(profile?.avatar_url ?? null),
    enabled: !!profile,
    staleTime: 50 * 60_000,
  });

  useEffect(() => {
    if (!err) return;
    const t = setTimeout(() => setErr(null), 4000);
    return () => clearTimeout(t);
  }, [err]);

  async function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !profile) return;
    if (file.size > 8 * 1024 * 1024) {
      setErr("Image is too large (max 8 MB).");
      return;
    }
    setUploading(true);
    setErr(null);
    try {
      const blob = await resizeToWebp(file, 512);
      const path = `${profile.id}/avatar-${Date.now()}.webp`;
      const { error: upErr } = await supabase.storage
        .from("avatars")
        .upload(path, blob, { contentType: "image/webp", upsert: true, cacheControl: "3600" });
      if (upErr) throw upErr;
      // Best-effort cleanup of the old file.
      if (profile.avatar_url) {
        await supabase.storage
          .from("avatars")
          .remove([profile.avatar_url])
          .catch(() => undefined);
      }
      const { error: profErr } = await supabase
        .from("profiles")
        .update({ avatar_url: path })
        .eq("id", profile.id);
      if (profErr) throw profErr;
      trackEvent("avatar_uploaded");
      qc.invalidateQueries({ queryKey: PROFILE_QK });
      qc.invalidateQueries({ queryKey: AVATAR_QK });
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  if (!profile) return null;
  const initials = initialsFrom(profile.display_name ?? null, profile.email);

  return (
    <>
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        aria-label="Change profile photo"
        title="Change profile photo"
        className="tap-target relative inline-flex h-11 w-11 items-center justify-center overflow-hidden rounded-full bg-primary/15 text-sm font-semibold text-primary ring-1 ring-border transition hover:ring-primary/50"
      >
        {signedUrl ? (
          <img
            src={signedUrl}
            alt=""
            width={44}
            height={44}
            decoding="async"
            className="h-full w-full object-cover"
          />
        ) : (
          <span>{initials}</span>
        )}
        {uploading && (
          <span className="absolute inset-0 flex items-center justify-center bg-background/70">
            <Loader2 className="h-4 w-4 animate-spin" />
          </span>
        )}
        <span className="absolute -bottom-0.5 -right-0.5 rounded-full bg-background p-0.5 opacity-0 shadow-sm ring-1 ring-border transition group-hover:opacity-100">
          <Upload className="h-3 w-3" />
        </span>
      </button>
      <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={onPick} />
      {err && (
        <div className="fixed inset-x-0 top-16 z-50 mx-auto max-w-md px-4">
          <div className="rounded-xl bg-destructive px-4 py-2 text-sm text-destructive-foreground shadow-lg">
            {err}
          </div>
        </div>
      )}
    </>
  );
}
