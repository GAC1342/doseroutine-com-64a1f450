import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Camera, Check, ImagePlus, Loader2, ShieldAlert, ShieldQuestion, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { identifyPillPhoto } from "@/lib/pill-identifier.functions";
import { computeRefillDate, type PillCandidate } from "@/lib/pill-identifier";
import { buildStackPayload, validateStackIdentity } from "@/lib/stack-item-actions";
import { describeCameraProblem, type CameraProblem } from "@/lib/barcode-scanner";
import { routeErrorComponent } from "@/components/route-error-panel";

export const Route = createFileRoute("/_authenticated/pill-id")({
  errorComponent: routeErrorComponent("pill-id"),
  head: () => ({
    meta: [
      { title: "Pill identifier — DoseRoutine" },
      {
        name: "description",
        content:
          "Photograph a pill to get AI-assisted candidate matches, then confirm and add it to your stack with a refill reminder.",
      },
    ],
  }),
  component: PillIdPage,
});

type Step = "capture" | "loading" | "confirm" | "details" | "saved";

/** Downscale a photo to a reasonable data URL before sending it to the server. */
async function fileToDataUrl(file: File | Blob, maxSize = 1280): Promise<string> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, maxSize / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Could not read that photo.");
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL("image/jpeg", 0.85);
}

function confidenceBadgeClass(confidence: number): string {
  if (confidence >= 70) return "bg-green-500/15 text-green-700 dark:text-green-300";
  if (confidence >= 40) return "bg-[color:var(--caution)]/15 text-[color:var(--caution)]";
  return "bg-destructive/10 text-destructive";
}

function PillIdPage() {
  const navigate = useNavigate();
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);

  const [step, setStep] = useState<Step>("capture");
  const [streaming, setStreaming] = useState(false);
  const [cameraProblem, setCameraProblem] = useState<CameraProblem | null>(null);
  const [photoDataUrl, setPhotoDataUrl] = useState<string | null>(null);
  const [candidates, setCandidates] = useState<PillCandidate[]>([]);
  const [note, setNote] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<PillCandidate | null>(null);

  // Editable fields for the confirm/details step.
  const [name, setName] = useState("");
  const [strength, setStrength] = useState("");
  const [dosageForm, setDosageForm] = useState("");
  const [frequency, setFrequency] = useState<"daily">("daily");
  const [times, setTimes] = useState("08:00");
  const [quantity, setQuantity] = useState("30");
  const [dosesPerDay, setDosesPerDay] = useState("1");
  const [saving, setSaving] = useState(false);

  const identify = useServerFn(identifyPillPhoto);

  useEffect(() => {
    return () => {
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    };
  }, []);

  async function startCamera() {
    setCameraProblem(null);
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setStreaming(true);
    } catch (e) {
      setCameraProblem(describeCameraProblem(e));
      setStreaming(false);
    }
  }

  function stopCamera() {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setStreaming(false);
  }

  async function capturePhoto() {
    const video = videoRef.current;
    if (!video) return;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 960;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    stopCamera();
    await runIdentify(canvas.toDataURL("image/jpeg", 0.85));
  }

  async function handleUpload(file: File | undefined) {
    if (!file) return;
    setError(null);
    try {
      const dataUrl = await fileToDataUrl(file);
      await runIdentify(dataUrl);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not read that photo.");
    } finally {
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function runIdentify(dataUrl: string) {
    setPhotoDataUrl(dataUrl);
    setStep("loading");
    setError(null);
    try {
      const result = await identify({ data: { imageDataUrl: dataUrl } });
      setCandidates(result.candidates);
      setNote(result.note);
      setStep("confirm");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't identify that pill. Try another photo.");
      setStep("capture");
    }
  }

  function pickCandidate(candidate: PillCandidate) {
    setSelected(candidate);
    setName(candidate.name || "");
    setStrength(candidate.strength || "");
    setDosageForm(candidate.dosageForm || "");
    setStep("details");
  }

  function pickCustom() {
    setSelected(null);
    setName("");
    setStrength("");
    setDosageForm("");
    setStep("details");
  }

  function retake() {
    setPhotoDataUrl(null);
    setCandidates([]);
    setSelected(null);
    setError(null);
    setStep("capture");
  }

  const quantityNum = Number(quantity);
  const dosesPerDayNum = Number(dosesPerDay);
  const refillDate = computeRefillDate(quantityNum, dosesPerDayNum);

  async function saveToStack() {
    const trimmedName = name.trim();
    const identity = validateStackIdentity({ compound_id: null, custom_name: trimmedName });
    if (!identity.ok) {
      setError(identity.message);
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const { data: sess } = await supabase.auth.getUser();
      const uid = sess.user?.id;
      if (!uid) throw new Error("Not signed in");

      // Try to match a library compound by name so the item carries real
      // reference data; otherwise save as a custom item.
      const { data: match } = await supabase
        .from("compounds")
        .select("*")
        .ilike("name", trimmedName)
        .limit(1)
        .maybeSingle();

      const timesOfDay = times
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean);

      const payload = buildStackPayload({
        userId: uid,
        compoundId: match?.id ?? null,
        customName: trimmedName,
        customCategory: null,
        rest: {
          dose_amount: 1,
          dose_unit: (match?.default_unit ?? "mg") as "mg" | "mcg" | "iu" | "g" | "ml",
          frequency,
          times_of_day: timesOfDay.length ? timesOfDay : ["08:00"],
          with_food: match?.food_rule === "with_food",
          active: true,
          notes: [strength, dosageForm].filter(Boolean).join(" · ") || null,
        },
      });

      const { data: inserted, error: insErr } = await supabase
        .from("user_compounds")
        .insert(payload)
        .select("id")
        .single();
      if (insErr) throw insErr;

      try {
        const { generateScheduleForCurrentUser } = await import("@/lib/schedule");
        await generateScheduleForCurrentUser(7);
      } catch {
        // schedule regen best-effort
      }

      // Refill reminder: reuse the existing vial/bottle inventory mechanism
      // (also powers the low-stock "Reorder soon" panel elsewhere in the app).
      if (inserted?.id && quantityNum > 0 && dosesPerDayNum > 0) {
        try {
          await supabase.from("vial_inventory").upsert(
            {
              user_compound_id: inserted.id,
              doses_remaining: quantityNum,
              total_doses: quantityNum,
              low_threshold: Math.max(1, Math.round(dosesPerDayNum * 5)),
              last_refilled_at: new Date().toISOString(),
            },
            { onConflict: "user_compound_id" },
          );
        } catch {
          // Refill reminder is a nicety — never block the save on it.
        }
      }

      setStep("saved");
      setTimeout(() => navigate({ to: "/stack" }), 900);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="pb-24">
      <PageHeader hideBack title="Pill identifier" />

      <div className="px-4">
        <div className="mb-4 flex items-start gap-2 rounded-xl border border-amber-500/40 bg-amber-500/10 p-3 text-xs text-amber-900 dark:text-amber-200">
          <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          <p>
            This is an assistive identification only — it is not a medical confirmation. Always
            verify the pill with a pharmacist before taking, stopping, or changing any medication.
          </p>
        </div>
      </div>

      {step === "capture" && (
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
            {!streaming && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 px-4 text-center text-white">
                <Camera className="h-10 w-10 opacity-80" />
                <p className="max-w-[80%] text-sm opacity-90">
                  Tap Start to photograph the pill's imprint, shape, and color.
                </p>
                <Button onClick={startCamera} className="mt-2">
                  <Camera className="mr-2 h-4 w-4" />
                  Start camera
                </Button>
                <p className="flex max-w-[85%] items-start gap-1.5 text-[11px] leading-snug opacity-75">
                  <ShieldQuestion className="mt-0.5 h-3 w-3 shrink-0" aria-hidden="true" />
                  <span>
                    Your device will ask for camera permission. The photo stays on your phone until
                    you choose to identify it.
                  </span>
                </p>
              </div>
            )}
            {streaming && (
              <button
                onClick={stopCamera}
                className="absolute right-3 top-3 rounded-full bg-black/60 p-2 text-white"
                aria-label="Stop camera"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          {streaming && (
            <Button onClick={capturePhoto} className="mt-3 w-full">
              <Camera className="mr-2 h-4 w-4" />
              Capture photo
            </Button>
          )}

          <div className="mt-3 grid grid-cols-1 gap-2">
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="sr-only"
              onChange={(e) => void handleUpload(e.target.files?.[0])}
            />
            <Button variant="outline" onClick={() => fileRef.current?.click()}>
              <ImagePlus className="mr-2 h-4 w-4" aria-hidden="true" />
              Upload a photo instead
            </Button>
          </div>

          {cameraProblem && (
            <div
              role="alert"
              className="mt-3 rounded-xl border border-amber-500/40 bg-amber-500/10 p-3"
            >
              <p className="text-sm font-medium text-amber-900 dark:text-amber-200">
                {cameraProblem.title}
              </p>
              <p className="mt-1 text-xs leading-relaxed text-amber-900/80 dark:text-amber-200/80">
                We couldn't open the camera. Upload a photo from your gallery instead — no camera
                access needed.
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <Button size="sm" onClick={() => fileRef.current?.click()}>
                  <ImagePlus className="mr-2 h-4 w-4" aria-hidden="true" />
                  Upload a photo
                </Button>
                <Button size="sm" variant="outline" onClick={startCamera}>
                  Try camera again
                </Button>
              </div>
            </div>
          )}

          {error && (
            <p className="mt-3 rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error}
            </p>
          )}
        </section>
      )}

      {step === "loading" && (
        <section className="flex flex-col items-center gap-3 px-4 py-16 text-center">
          {photoDataUrl && (
            <img
              src={photoDataUrl}
              alt="Photographed pill"
              title="Photographed pill"
              width={160}
              height={160}
              className="h-40 w-40 rounded-xl object-cover"
            />
          )}
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Reading the imprint, shape, and color…</p>
        </section>
      )}

      {step === "confirm" && (
        <section className="px-4">
          {note && candidates.length === 0 && (
            <div className="rounded-xl border border-dashed border-border p-4 text-sm text-muted-foreground">
              <p>{note}</p>
              <p className="mt-2">
                We weren't confident enough to suggest a match. Try a clearer, well-lit photo with
                the imprint facing the camera, or add it yourself.
              </p>
            </div>
          )}

          <div className="space-y-2">
            {candidates.map((c, i) => (
              <button
                key={`${c.name}-${i}`}
                onClick={() => pickCandidate(c)}
                className="tap-target flex w-full flex-col gap-1 rounded-xl border border-border bg-card px-3 py-3 text-left transition-colors hover:bg-muted"
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="truncate text-sm font-medium">{c.name || "Unnamed match"}</p>
                  <span
                    className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${confidenceBadgeClass(c.confidence)}`}
                  >
                    {c.confidence}% confidence
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">
                  {[c.imprint && `Imprint ${c.imprint}`, c.shape, c.color, c.strength]
                    .filter(Boolean)
                    .join(" · ")}
                </p>
                {c.caution && <p className="text-[11px] text-muted-foreground">{c.caution}</p>}
              </button>
            ))}
          </div>

          <div className="mt-4 flex gap-2">
            <Button variant="outline" className="flex-1" onClick={retake}>
              Retake photo
            </Button>
            <Button variant="outline" className="flex-1" onClick={pickCustom}>
              None of these — enter manually
            </Button>
          </div>
        </section>
      )}

      {step === "details" && (
        <section className="px-4">
          <h3 className="text-sm font-semibold">
            {selected ? "Confirm details" : "Add this pill"}
          </h3>
          <p className="mt-1 text-xs text-muted-foreground">
            Edit anything before saving to your routine.
          </p>

          <div className="mt-3 space-y-3">
            <Field label="Name">
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Lisinopril"
              />
            </Field>
            <div className="grid grid-cols-2 gap-2">
              <Field label="Strength">
                <Input
                  value={strength}
                  onChange={(e) => setStrength(e.target.value)}
                  placeholder="e.g. 10 mg"
                />
              </Field>
              <Field label="Dosage form">
                <Input
                  value={dosageForm}
                  onChange={(e) => setDosageForm(e.target.value)}
                  placeholder="e.g. Tablet"
                />
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Field label="Frequency">
                <Input value="Daily" disabled />
              </Field>
              <Field label="Times (comma separated)">
                <Input
                  value={times}
                  onChange={(e) => setTimes(e.target.value)}
                  placeholder="08:00, 20:00"
                />
              </Field>
            </div>

            <div className="rounded-xl border border-border bg-background p-3">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Refill reminder
              </p>
              <div className="mt-2 grid grid-cols-2 gap-2">
                <Field label="Pills in bottle">
                  <Input
                    type="number"
                    inputMode="numeric"
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                  />
                </Field>
                <Field label="Doses per day">
                  <Input
                    type="number"
                    inputMode="numeric"
                    value={dosesPerDay}
                    onChange={(e) => setDosesPerDay(e.target.value)}
                  />
                </Field>
              </div>
              {refillDate ? (
                <p className="mt-2 text-xs text-foreground">
                  Projected refill date:{" "}
                  <span className="font-medium">
                    {refillDate.toLocaleDateString(undefined, {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </span>
                </p>
              ) : (
                <p className="mt-2 text-xs text-muted-foreground">
                  Enter a quantity and doses per day to see a projected refill date.
                </p>
              )}
              <p className="mt-1 text-[11px] text-muted-foreground">
                We'll flag this in your Reorder panel as it runs low.
              </p>
            </div>
          </div>

          {error && (
            <p className="mt-3 rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error}
            </p>
          )}

          <div className="mt-4 flex gap-2">
            <Button variant="outline" className="flex-1" onClick={() => setStep("confirm")}>
              Back
            </Button>
            <Button className="flex-1" disabled={saving || !name.trim()} onClick={saveToStack}>
              {saving ? "Saving…" : "Save to my routine"}
            </Button>
          </div>
        </section>
      )}

      {step === "saved" && (
        <section className="flex flex-col items-center gap-2 px-4 py-16 text-center">
          <Check className="h-8 w-8 text-green-600 dark:text-green-400" />
          <p className="text-sm text-muted-foreground">Saved — opening your stack…</p>
        </section>
      )}

      <p className="px-4 pt-6 text-xs text-muted-foreground">
        Prefer to scan a barcode instead?{" "}
        <Link to="/scan" className="underline">
          Go to Scan a bottle
        </Link>
        .
      </p>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </span>
      <div className="mt-1">{children}</div>
    </label>
  );
}
