import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  Camera,
  ScanLine,
  Search,
  Plus,
  X,
  Check,
  HelpCircle,
  ImagePlus,
  Keyboard,
  Loader2,
  ShieldQuestion,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { HelpButton } from "@/components/help-button";
import { ScannedProductCard } from "@/components/scanned-product-card";
import { lookupProductByBarcode } from "@/lib/product-lookup.functions";
import {
  describeCameraProblem,
  detectCapability,
  scanBarcode,
  scanBarcodeFromImage,
  type CameraProblem,
  type ScanHandle,
  type ScannerCapability,
} from "@/lib/barcode-scanner";
import type { Database } from "@/integrations/supabase/types";

type Compound = Database["public"]["Tables"]["compounds"]["Row"];

export const Route = createFileRoute("/_authenticated/scan")({
  head: () => ({
    meta: [
      { title: "Scan a bottle — DoseRoutine" },
      {
        name: "description",
        content:
          "Scan a supplement, peptide, or medication bottle to look it up and add it to your stack in one tap.",
      },
    ],
  }),
  component: ScanPage,
});

function ScanPage() {
  const navigate = useNavigate();
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const handleRef = useRef<ScanHandle | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);

  const [scanning, setScanning] = useState(false);
  const [capability, setCapability] = useState<ScannerCapability>("none");
  const [error, setError] = useState<string | null>(null);
  const [code, setCode] = useState<string>("");
  const [pendingCode, setPendingCode] = useState<string>("");
  const [pendingEdit, setPendingEdit] = useState<string>("");
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  const [query, setQuery] = useState<string>("");
  const [selected, setSelected] = useState<Compound | null>(null);
  const [adding, setAdding] = useState(false);
  const [added, setAdded] = useState(false);
  // Friendly camera state: we explain what we're about to ask for, and never
  // leave the user stuck if they say no.
  const [cameraProblem, setCameraProblem] = useState<CameraProblem | null>(null);
  const [readingPhoto, setReadingPhoto] = useState(false);
  const [photoMiss, setPhotoMiss] = useState(false);
  const [manualOpen, setManualOpen] = useState(false);
  const [manualEntry, setManualEntry] = useState("");

  // Pick the best scanner backend for this device on mount.
  useEffect(() => {
    setCapability(detectCapability());
  }, []);

  const supported = capability !== "none";
  const isNativeScan = capability === "native";

  async function startScan() {
    setError(null);
    setCameraProblem(null);
    setPhotoMiss(false);
    setCode("");
    setPendingCode("");
    setPendingEdit("");
    setConfirmDiscard(false);
    try {
      setScanning(true);
      handleRef.current = await scanBarcode({
        video: videoRef.current,
        onResult: (val) => {
          // Do NOT auto-search. Surface the decoded text for user review first.
          setPendingCode(val);
          setPendingEdit(val);
          setScanning(false);
          void handleRef.current?.stop();
          handleRef.current = null;
        },
        onError: (e) => {
          setCameraProblem(describeCameraProblem(e));
          setScanning(false);
        },
      });
      // Native returns immediately after the OS UI closes.
      if (handleRef.current.capability === "native") setScanning(false);
    } catch (e) {
      setCameraProblem(describeCameraProblem(e));
      setScanning(false);
    }
  }

  /**
   * Gallery / photo path — works even when the camera is blocked, because
   * picking a file needs no permission at all.
   */
  async function handlePhoto(file: File | undefined) {
    if (!file) return;
    setReadingPhoto(true);
    setPhotoMiss(false);
    setError(null);
    try {
      const val = await scanBarcodeFromImage(file);
      if (val) {
        // Same review step as a live scan — the user confirms before we search.
        setPendingCode(val);
        setPendingEdit(val);
        setConfirmDiscard(false);
      } else {
        setPhotoMiss(true);
      }
    } catch {
      setPhotoMiss(true);
    } finally {
      setReadingPhoto(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  function submitManualCode() {
    const val = manualEntry.replace(/[^0-9A-Za-z-]/g, "").trim();
    if (val.length < 4) return;
    setPendingCode(val);
    setPendingEdit(val);
    setConfirmDiscard(false);
    setManualEntry("");
    setManualOpen(false);
  }

  function confirmPending() {
    const val = pendingEdit.trim();
    if (!val) return;
    setCode(val);
    // Leave the name search empty: the product lookup below fills it with the
    // real ingredient name, which matches our library far better than a UPC.
    setQuery("");
    setPendingCode("");
    setPendingEdit("");
    setConfirmDiscard(false);
  }

  function requestDiscardPending() {
    // Ask before wiping the decoded text — a stray tap shouldn't lose a scan
    // that took the user several tries to line up.
    setConfirmDiscard(true);
  }

  function cancelDiscard() {
    setConfirmDiscard(false);
  }

  function discardPending() {
    setPendingCode("");
    setPendingEdit("");
    setConfirmDiscard(false);
  }

  async function discardAndRescan() {
    discardPending();
    await startScan();
  }

  async function stopScan() {
    setScanning(false);
    const h = handleRef.current;
    handleRef.current = null;
    if (h) await h.stop();
  }

  useEffect(() => {
    return () => {
      handleRef.current?.stop();
      handleRef.current = null;
    };
  }, []);

  // Look the confirmed barcode up against public label databases so the user
  // sees the manufacturer's own directions instead of a blank form.
  const lookup = useServerFn(lookupProductByBarcode);
  const { data: product, isLoading: lookingUp } = useQuery({
    queryKey: ["barcode-lookup", code],
    enabled: code.trim().length >= 4,
    staleTime: 24 * 60 * 60 * 1000,
    retry: false,
    queryFn: () => lookup({ data: { barcode: code.trim() } }),
  });

  // Seed the compound search with the ingredient name we read off the label.
  useEffect(() => {
    if (product?.found && product.prefill.searchTerm) {
      setQuery((q) => (q.trim() ? q : product.prefill.searchTerm));
    }
  }, [product]);

  async function useProductDetails() {
    if (!product?.found) return;
    const { prefill, label, confidence, summary, barcode } = product;
    // Keep a dated receipt of this scan (source + confidence) before the
    // numbers get applied, so the stack item can show where they came from.
    const { recordScan } = await import("@/lib/scan-history");
    const scanId = await recordScan({
      barcode,
      productName: label.name,
      brand: label.brand,
      sourceName: label.sourceName,
      sourceUrl: label.sourceUrl,
      confidenceScore: confidence?.score ?? null,
      confidenceLevel: confidence?.level ?? null,
      summary,
      directions: label.directions,
    });
    void navigate({
      to: "/stack",
      search: {
        prefillName: prefill.searchTerm || label.name,
        prefillDose: prefill.dosePerTake != null ? String(prefill.dosePerTake) : undefined,
        prefillUnit: prefill.unit ?? undefined,
        prefillTimes: prefill.times?.join(",") || undefined,
        prefillFood: prefill.withFood ? "1" : undefined,
        prefillProduct: [label.brand, label.name].filter(Boolean).join(" — ").slice(0, 120),
        prefillDirections: label.directions?.slice(0, 400) || undefined,
        prefillScanId: scanId ?? undefined,
      },
    });
  }

  const searchTerm = query.trim();
  const { data: results = [], isLoading: searching } = useQuery({
    queryKey: ["scan-search", searchTerm],
    enabled: searchTerm.length >= 2,

    staleTime: 60_000,
    queryFn: async () => {
      const like = `%${searchTerm}%`;
      const { data } = await supabase
        .from("compounds")
        .select("*")
        .or(`name.ilike.${like},slug.ilike.${like}`)
        .order("name")
        .limit(20);
      return (data as Compound[] | null) ?? [];
    },
  });

  async function addToStack(c: Compound) {
    setAdding(true);
    setError(null);
    try {
      const { data: sess } = await supabase.auth.getUser();
      const uid = sess.user?.id;
      if (!uid) throw new Error("Not signed in");
      const dose = c.rda_low ?? c.rda_high ?? 1;
      const { error: insErr } = await supabase.from("user_compounds").insert({
        user_id: uid,
        compound_id: c.id,
        dose_amount: Number(dose),
        dose_unit: c.default_unit ?? "mg",
        frequency: "daily",
        times_of_day: ["08:00"],
        with_food: c.food_rule === "with_food",
        active: true,
      });
      if (insErr) throw insErr;
      try {
        const { generateScheduleForCurrentUser } = await import("@/lib/schedule");
        await generateScheduleForCurrentUser(7);
      } catch {
        // schedule regen best-effort
      }
      setAdded(true);
      setTimeout(() => navigate({ to: "/stack" }), 700);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not add");
    } finally {
      setAdding(false);
    }
  }

  return (
    <div className="pb-24">
      <PageHeader hideBack title="Scan a bottle" actions={<HelpButton articleKey="scan" />} />

      <p className="px-4 pb-3 text-sm text-muted-foreground">
        Point your camera at a barcode, then search the label name to add it.
      </p>

      <section className="px-4">
        <div className="relative overflow-hidden rounded-2xl border border-border bg-black aspect-[4/3]">
          <video
            ref={videoRef}
            width={640}
            height={480}
            className="h-full w-full object-cover"
            playsInline
            muted
          />
          {!scanning && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 px-4 text-center text-white">
              <Camera className="h-10 w-10 opacity-80" />
              <p className="max-w-[75%] text-sm opacity-90">
                {isNativeScan
                  ? "Tap Start to open the DoseRoutine scanner."
                  : supported
                    ? "Tap Start to open your camera and scan a barcode."
                    : "Camera isn't available on this device. You can still type the product name below."}
              </p>
              <Button onClick={startScan} disabled={!supported} className="mt-2">
                <ScanLine className="mr-2 h-4 w-4" />
                Start scan
              </Button>
              {supported && (
                <p className="flex max-w-[85%] items-start gap-1.5 text-[11px] leading-snug opacity-75">
                  <ShieldQuestion className="mt-0.5 h-3 w-3 shrink-0" aria-hidden="true" />
                  <span>
                    Your device will ask for camera permission. The picture stays on your phone — we
                    only read the barcode numbers.
                  </span>
                </p>
              )}
              {supported && !isNativeScan && (
                <p className="text-[10px] opacity-60">
                  {capability === "browser-detector"
                    ? "Fast native detector"
                    : "ZXing camera reader"}
                </p>
              )}
            </div>
          )}
          {scanning && (
            <>
              <div className="absolute inset-x-8 top-1/2 -translate-y-1/2 h-24 rounded-xl border-2 border-white/70 shadow-[0_0_0_9999px_rgba(0,0,0,0.35)]" />
              <button
                onClick={stopScan}
                className="absolute right-3 top-3 rounded-full bg-black/60 p-2 text-white"
                aria-label="Stop scan"
              >
                <X className="h-4 w-4" />
              </button>
            </>
          )}
        </div>

        {/* Always-available alternatives to the live camera. */}
        <div className="mt-3 grid grid-cols-2 gap-2">
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="sr-only"
            onChange={(e) => void handlePhoto(e.target.files?.[0])}
          />
          <Button
            variant="outline"
            onClick={() => fileRef.current?.click()}
            disabled={readingPhoto}
          >
            {readingPhoto ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
            ) : (
              <ImagePlus className="mr-2 h-4 w-4" aria-hidden="true" />
            )}
            {readingPhoto ? "Reading photo…" : "Upload photo"}
          </Button>
          <Button
            variant="outline"
            onClick={() => setManualOpen((v) => !v)}
            aria-expanded={manualOpen}
          >
            <Keyboard className="mr-2 h-4 w-4" aria-hidden="true" />
            Type the numbers
          </Button>
        </div>
        <p className="mt-1.5 text-[11px] text-muted-foreground">
          Pick a barcode photo from your gallery and we'll read it — no camera access needed.
        </p>

        {photoMiss && (
          <div className="mt-2 rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-xs text-amber-900 dark:text-amber-200">
            <p className="font-medium">We couldn't read a barcode in that photo</p>
            <p className="mt-1 opacity-90">
              Try again with the barcode filling most of the frame, well lit and in focus — or type
              the numbers printed under it.
            </p>
            <div className="mt-2 flex gap-2">
              <Button size="sm" variant="outline" onClick={() => fileRef.current?.click()}>
                Try another photo
              </Button>
              <Button size="sm" variant="outline" onClick={() => setManualOpen(true)}>
                Type it instead
              </Button>
            </div>
          </div>
        )}

        {manualOpen && (
          <div className="mt-2 rounded-xl border border-border bg-card p-3">
            <label
              htmlFor="manual-barcode"
              className="text-xs font-medium uppercase tracking-wide text-muted-foreground"
            >
              Barcode numbers
            </label>
            <div className="mt-2 flex gap-2">
              <Input
                id="manual-barcode"
                value={manualEntry}
                inputMode="numeric"
                autoComplete="off"
                placeholder="e.g. 0123456789012"
                onChange={(e) => setManualEntry(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") submitManualCode();
                }}
              />
              <Button onClick={submitManualCode} disabled={manualEntry.trim().length < 4}>
                Look up
              </Button>
            </div>
            <p className="mt-1.5 text-[11px] text-muted-foreground">
              The digits printed under the barcode on your bottle.
            </p>
          </div>
        )}

        {cameraProblem && (
          <div
            role="alert"
            className="mt-3 rounded-xl border border-amber-500/40 bg-amber-500/10 p-3"
          >
            <p className="text-sm font-medium text-amber-900 dark:text-amber-200">
              {cameraProblem.title}
            </p>
            <p className="mt-1 text-xs leading-relaxed text-amber-900/80 dark:text-amber-200/80">
              {cameraProblem.body}
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Button size="sm" onClick={() => fileRef.current?.click()}>
                <ImagePlus className="mr-2 h-4 w-4" aria-hidden="true" />
                Upload a photo
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setManualOpen(true);
                  setCameraProblem(null);
                }}
              >
                <Keyboard className="mr-2 h-4 w-4" aria-hidden="true" />
                Type the numbers
              </Button>
              {cameraProblem.kind !== "no-camera" && cameraProblem.kind !== "unsupported" && (
                <Button size="sm" variant="outline" onClick={startScan}>
                  Try camera again
                </Button>
              )}
            </div>
          </div>
        )}

        {pendingCode && (
          <div className="mt-3 rounded-xl border border-primary/40 bg-primary/5 p-3">
            <p className="text-xs font-medium uppercase tracking-wide text-primary">
              Confirm barcode
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              We decoded this from the label. Review or edit it before we search your compound
              library — nothing has been added to your stack yet.
            </p>
            <div className="mt-2 flex items-center gap-2 rounded-lg border border-border bg-background px-2">
              <ScanLine className="h-4 w-4 text-muted-foreground" />
              <Input
                value={pendingEdit}
                onChange={(e) => setPendingEdit(e.target.value)}
                className="border-0 bg-transparent px-0 font-mono text-sm focus-visible:ring-0"
                aria-label="Decoded barcode text"
              />
            </div>
            {confirmDiscard ? (
              <div
                role="alertdialog"
                aria-label="Discard scanned code?"
                className="mt-3 rounded-lg border border-amber-500/40 bg-amber-500/10 p-3"
              >
                <p className="text-sm font-medium text-amber-900 dark:text-amber-200">
                  Discard this code?
                </p>
                <p className="mt-1 text-xs text-amber-900/80 dark:text-amber-200/80">
                  Your decoded text <span className="font-mono">{pendingCode}</span> will be
                  cleared. You can rescan or just cancel.
                </p>
                <div className="mt-3 grid grid-cols-3 gap-2">
                  <Button variant="outline" onClick={cancelDiscard} aria-label="Keep scanned code">
                    Keep
                  </Button>
                  <Button
                    variant="outline"
                    onClick={discardPending}
                    aria-label="Discard scanned code without rescanning"
                  >
                    Discard
                  </Button>
                  <Button
                    onClick={discardAndRescan}
                    disabled={!supported}
                    aria-label="Discard scanned code and start a new scan"
                  >
                    <ScanLine className="mr-1 h-4 w-4" />
                    Rescan
                  </Button>
                </div>
              </div>
            ) : (
              <div className="mt-3 flex gap-2">
                <Button variant="outline" className="flex-1" onClick={requestDiscardPending}>
                  Scan again
                </Button>
                <Button className="flex-1" onClick={confirmPending} disabled={!pendingEdit.trim()}>
                  <Check className="mr-2 h-4 w-4" />
                  Use this code
                </Button>
              </div>
            )}
          </div>
        )}

        {code && (
          <div className="mt-3 flex items-center gap-2 rounded-xl border border-border bg-muted px-3 py-2 text-sm">
            <Check className="h-4 w-4 text-green-600" />
            <span className="flex-1 truncate">
              Confirmed: <span className="font-mono">{code}</span>
            </span>
            <button onClick={() => setCode("")} className="text-xs text-muted-foreground underline">
              Clear
            </button>
          </div>
        )}

        {code && lookingUp && (
          <p className="mt-3 text-sm text-muted-foreground">Looking up the product label…</p>
        )}

        {code && !lookingUp && product?.found && (
          <ScannedProductCard
            label={product.label}
            prefill={product.prefill}
            summary={product.summary}
            confidence={product.confidence}
            onUse={useProductDetails}
          />
        )}

        {code && !lookingUp && product && !product.found && (
          <p className="mt-3 rounded-xl border border-dashed border-border p-3 text-xs text-muted-foreground">
            We couldn't find that barcode in the public label databases. Search the ingredient name
            below instead.
          </p>
        )}

        {error && (
          <p className="mt-3 rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </p>
        )}
      </section>

      <section className="mt-6 px-4">
        <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Search compound by name
        </label>
        <div className="mt-2 flex items-center gap-2 rounded-xl border border-border bg-background px-3">
          <Search className="h-4 w-4 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="e.g. magnesium glycinate, semaglutide, creatine"
            className="border-0 bg-transparent px-0 focus-visible:ring-0"
          />
        </div>
        <p className="mt-1 text-xs text-muted-foreground">
          Product UPC codes vary by brand — type the ingredient name from the label to match your
          compound.
        </p>

        <div className="mt-3 space-y-2">
          {searching && <p className="text-sm text-muted-foreground">Searching…</p>}
          {!searching && searchTerm.length >= 2 && results.length === 0 && (
            <div className="rounded-xl border border-dashed border-border p-4 text-sm text-muted-foreground">
              No matches. Try a different name, or{" "}
              <button className="underline" onClick={() => navigate({ to: "/stack" })}>
                add it manually
              </button>
              .
            </div>
          )}
          {results.map((c) => (
            <button
              key={c.id}
              onClick={() => setSelected(c)}
              className="tap-target flex w-full items-center gap-3 rounded-xl border border-border bg-card px-3 text-left transition-colors hover:bg-muted"
            >
              <div className="flex-1 min-w-0">
                <p className="truncate text-sm font-medium">{c.name}</p>
                <p className="truncate text-xs text-muted-foreground capitalize">
                  {c.category?.replace(/_/g, " ")} · default {c.default_unit ?? "—"}
                </p>
              </div>
              <Plus className="h-4 w-4 text-muted-foreground" />
            </button>
          ))}
        </div>
      </section>

      {selected && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/50"
          onClick={() => setSelected(null)}
        >
          <div
            className="w-full max-w-md rounded-t-2xl bg-card p-5 pb-safe"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start gap-3">
              <div className="flex-1">
                <h3 className="text-lg font-semibold">{selected.name}</h3>
                <p className="text-xs text-muted-foreground capitalize">
                  {selected.category?.replace(/_/g, " ")}
                </p>
                {selected.education_md && (
                  <p className="mt-2 text-xs text-muted-foreground line-clamp-3">
                    {selected.education_md}
                  </p>
                )}
              </div>
              <button
                onClick={() => setSelected(null)}
                className="rounded-full p-1 text-muted-foreground hover:bg-muted"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {selected.is_controlled && (
              <p className="mt-3 flex items-start gap-2 rounded-lg border border-amber-500/40 bg-amber-500/10 p-2 text-xs text-amber-900 dark:text-amber-200">
                <HelpCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                Controlled item — we'll add it with a placeholder dose. Update it in Stack to your
                prescribed amount.
              </p>
            )}

            {added ? (
              <div className="mt-4 flex items-center justify-center gap-2 rounded-xl bg-green-500/10 py-3 text-sm text-green-700 dark:text-green-300">
                <Check className="h-4 w-4" />
                Added — opening your stack…
              </div>
            ) : (
              <div className="mt-4 flex gap-2">
                <Button variant="outline" className="flex-1" onClick={() => setSelected(null)}>
                  Cancel
                </Button>
                <Button className="flex-1" disabled={adding} onClick={() => addToStack(selected)}>
                  {adding ? "Adding…" : "Add to my stack"}
                </Button>
              </div>
            )}
            <p className="mt-2 text-[10px] text-muted-foreground">
              You can adjust dose, frequency, and time from the Stack page.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
