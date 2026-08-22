/**
 * Live camera barcode scanner.
 *
 * Follows the Open Food Facts "world-class scan" guidance: the camera opens
 * immediately, a viewfinder shows where to aim, a torch button is always in
 * reach, a code is only accepted after two identical reads (so a half-decoded
 * digit never logs the wrong product), and every failure keeps the user moving
 * with a photo upload or typing the digits.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { Flashlight, Image as ImageIcon, Keyboard, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import {
  describeCameraProblem,
  openCameraSettings,
  scanBarcode,
  scanBarcodeFromImage,
  type CameraProblem,
  type ScanHandle,
} from "@/lib/barcode-scanner";
import { cleanBarcode, describeBarcodeInput } from "@/lib/gtin";
import { EMPTY_GS1, looksLikeGs1, parseGs1 } from "@/lib/gs1";

import { isNative } from "@/lib/platform";

/** How the digits reached us — tracked so we can see which input actually works. */
export type ScanOrigin = "camera" | "camera-native" | "photo" | "manual";

export type ScanPayload = {
  /** The digits to look up (the GTIN when the symbol was a GS1 DataMatrix). */
  code: string;
  lot: string | null;
  expiry: string | null;
  serial: string | null;
  origin: ScanOrigin;
  /** "gs1_datamatrix" for 2D pharmacy codes, otherwise "linear". */
  symbology: string;
};

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Called once with the confirmed digits. The sheet closes itself first. */
  onDetected: (barcode: string) => void;
  /**
   * Called alongside `onDetected` with the full GS1 payload, so medication
   * scans can carry their lot number and expiry date through to the review
   * sheet instead of being reduced to a GTIN.
   */
  onDetectedPayload?: (payload: ScanPayload) => void;
  title?: string;
};

const TYPO_HELP: Record<string, string> = {
  "too-short": "That is too short for a product barcode — it should be 8 to 14 digits.",
  "check-digit": "Those digits don't add up. Check the numbers under the bars and try again.",
  empty: "Enter the digits printed under the barcode.",
};

function buzz() {
  try {
    navigator.vibrate?.(60);
  } catch {
    /* vibration is a nicety */
  }
}

export function BarcodeScanSheet({
  open,
  onOpenChange,
  onDetected,
  onDetectedPayload,
  title,
}: Props) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const handleRef = useRef<ScanHandle | null>(null);
  const lastRef = useRef<{ code: string; count: number }>({ code: "", count: 0 });
  const doneRef = useRef(false);
  const fileRef = useRef<HTMLInputElement | null>(null);

  const [problem, setProblem] = useState<CameraProblem | null>(null);
  const [starting, setStarting] = useState(false);
  const [torchOn, setTorchOn] = useState(false);
  const [torchAvailable, setTorchAvailable] = useState(false);
  const [manual, setManual] = useState("");
  const [manualError, setManualError] = useState<string | null>(null);
  const [reading, setReading] = useState(false);

  const stopCamera = useCallback(async () => {
    try {
      await handleRef.current?.stop();
    } catch {
      /* already stopped */
    }
    handleRef.current = null;
    setTorchOn(false);
    setTorchAvailable(false);
  }, []);

  const accept = useCallback(
    (raw: string, origin: ScanOrigin = isNative() ? "camera-native" : "camera") => {
      // A DataMatrix payload carries the GTIN plus lot/expiry; a linear
      // barcode is just digits. Parse first, then reduce to digits.
      const gs1 = looksLikeGs1(raw) ? parseGs1(raw) : EMPTY_GS1;
      const code = cleanBarcode(gs1.gtin ?? raw);
      if (code.length < 8 || doneRef.current) return;
      doneRef.current = true;
      buzz();
      void stopCamera();
      onOpenChange(false);
      onDetected(code);
      onDetectedPayload?.({
        code,
        lot: gs1.lot,
        expiry: gs1.expiry,
        serial: gs1.serial,
        origin,
        symbology: gs1.gtin ? "gs1_datamatrix" : "linear",
      });
    },
    [onDetected, onDetectedPayload, onOpenChange, stopCamera],
  );

  /** Two identical reads before we trust it — guards against partial decodes. */
  const onResult = useCallback(
    (raw: string) => {
      const gs1 = looksLikeGs1(raw) ? parseGs1(raw) : EMPTY_GS1;
      const code = cleanBarcode(gs1.gtin ?? raw);
      if (!code) return;
      const last = lastRef.current;
      lastRef.current = code === last.code ? { code, count: last.count + 1 } : { code, count: 1 };
      // Native ML Kit already returns a verified read and closes its own UI.
      if (isNative() || lastRef.current.count >= 2) accept(raw);
      // eslint-disable-next-line @typescript-eslint/no-use-before-define -- restart is a hoisted callback defined below
      else void restart();
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps -- restart defined below
    [accept],
  );

  const start = useCallback(async () => {
    if (handleRef.current) return;
    setStarting(true);
    setProblem(null);
    try {
      const handle = await scanBarcode({
        // Pass the ref, not its current value: the sheet's video element mounts a
        // frame after `open` flips, so reading it here would be null.
        video: videoRef,

        onResult,
        onError: (err) => setProblem(describeCameraProblem(err)),
      });
      handleRef.current = handle;
      const stream = videoRef.current?.srcObject as MediaStream | null;
      const track = stream?.getVideoTracks()[0];
      const caps = track?.getCapabilities?.() as { torch?: boolean } | undefined;
      setTorchAvailable(Boolean(caps?.torch));
    } catch (err) {
      setProblem(describeCameraProblem(err));
    } finally {
      setStarting(false);
    }
  }, [onResult]);

  const restart = useCallback(async () => {
    await stopCamera();
    if (!doneRef.current) await start();
  }, [start, stopCamera]);

  useEffect(() => {
    if (!open) {
      void stopCamera();
      return;
    }
    doneRef.current = false;
    lastRef.current = { code: "", count: 0 };
    setManual("");
    setManualError(null);
    void start();
    return () => {
      void stopCamera();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- start/stop are stable enough
  }, [open]);

  const toggleTorch = async () => {
    const stream = videoRef.current?.srcObject as MediaStream | null;
    const track = stream?.getVideoTracks()[0];
    if (!track) return;
    const next = !torchOn;
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- torch is a non-standard constraint
      await track.applyConstraints({ advanced: [{ torch: next }] } as any);
      setTorchOn(next);
    } catch {
      setTorchAvailable(false);
    }
  };

  const readFromPhoto = async (file: File) => {
    setReading(true);
    try {
      const code = await scanBarcodeFromImage(file).catch(() => null);
      if (code) accept(code, "photo");
      else
        setProblem({
          kind: "unknown",
          title: "No barcode in that photo",
          body: "Take the shot straight on with the barcode filling the frame, or type the digits below.",
        });
    } finally {
      setReading(false);
    }
  };

  const submitManual = () => {
    const issue = describeBarcodeInput(manual);
    if (issue) {
      setManualError(TYPO_HELP[issue] ?? "Check those digits and try again.");
      return;
    }
    setManualError(null);
    accept(manual, "manual");
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="max-h-[92vh] overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{title ?? "Scan a barcode"}</SheetTitle>
        </SheetHeader>

        <div className="mt-4 space-y-4">
          <div className="relative overflow-hidden rounded-xl bg-muted aspect-[4/3]">
            <video
              ref={videoRef}
              width={640}
              height={480}
              className="h-full w-full object-cover"
              muted
              playsInline
              aria-label="Barcode camera preview"
            />
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
              <div className="h-24 w-4/5 rounded-lg border-2 border-primary/80 shadow-[0_0_0_9999px_rgba(0,0,0,0.35)]" />
            </div>
            {(starting || reading) && (
              <div className="absolute inset-0 grid place-items-center bg-background/60">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            )}
            {torchAvailable && (
              <Button
                type="button"
                size="icon"
                variant={torchOn ? "default" : "secondary"}
                className="absolute bottom-3 right-3"
                aria-label={torchOn ? "Turn light off" : "Turn light on"}
                onClick={toggleTorch}
              >
                <Flashlight className="h-4 w-4" />
              </Button>
            )}
          </div>

          <p className="text-xs text-muted-foreground">
            Hold the barcode flat inside the frame, about a hand's width away. In low light, turn
            the torch on.
          </p>

          {problem && (
            <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-3 text-sm">
              <p className="font-medium">{problem.title}</p>
              <p className="mt-1 text-muted-foreground">{problem.body}</p>
              <div className="mt-2 flex flex-wrap gap-2">
                <Button type="button" size="sm" variant="outline" onClick={() => void restart()}>
                  Try again
                </Button>
                {problem.canOpenSettings && (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => void openCameraSettings()}
                  >
                    Open settings
                  </Button>
                )}
              </div>
            </div>
          )}

          <div className="grid gap-2 sm:grid-cols-2">
            <Button type="button" variant="outline" onClick={() => fileRef.current?.click()}>
              <ImageIcon className="mr-2 h-4 w-4" />
              Use a photo instead
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                void stopCamera();
                onOpenChange(false);
              }}
            >
              <X className="mr-2 h-4 w-4" />
              Cancel
            </Button>
          </div>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="sr-only"
            aria-label="Photo of a barcode"
            onChange={(e) => {
              const file = e.target.files?.[0];
              e.target.value = "";
              if (file) void readFromPhoto(file);
            }}
          />

          <div className="rounded-lg border p-3">
            <label htmlFor="manual-barcode" className="flex items-center gap-2 text-sm font-medium">
              <Keyboard className="h-4 w-4" />
              Type the digits
            </label>
            <div className="mt-2 flex gap-2">
              <Input
                id="manual-barcode"
                inputMode="numeric"
                autoComplete="off"
                placeholder="e.g. 038000183737"
                value={manual}
                onChange={(e) => {
                  setManual(e.target.value);
                  setManualError(null);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") submitManual();
                }}
              />
              <Button type="button" onClick={submitManual}>
                Look up
              </Button>
            </div>
            {manualError && <p className="mt-2 text-xs text-destructive">{manualError}</p>}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
