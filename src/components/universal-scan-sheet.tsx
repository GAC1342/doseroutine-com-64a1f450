/**
 * Universal scanner: scan anything with a barcode — a cereal box, a vitamin
 * bottle, a prescription pack — and get the right review screen.
 *
 * Flow: scan (or type) a code -> parallel lookup across food, supplement and
 * drug databases -> category-aware review. When nothing knows the code we ask
 * for a photo of the facts panel and read it ourselves, so the scanner never
 * dead-ends on "product not found".
 */
import { useCallback, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Camera, Loader2, RefreshCw, ScanBarcode } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { BarcodeScanSheet, type ScanPayload } from "@/components/barcode-scan-sheet";
import { UniversalScanReview } from "@/components/universal-scan-review";
import { lookupUniversalCode, readLabelPhoto } from "@/lib/universal-barcode.functions";
import type { UniversalProduct } from "@/lib/universal-product";
// A label panel needs more resolution than a plate photo to stay legible.
import { fileToDownscaledDataUrl } from "@/lib/image-downscale";
import { userFacingErrorMessage } from "@/lib/error-classify";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Meal slot used when a scanned food is logged. */
  mealType?: string;
  title?: string;
};

type Stage =
  | { kind: "scanning" }
  | { kind: "looking-up"; code: string }
  | { kind: "unknown"; code: string; message: string }
  | { kind: "reading-label" }
  | { kind: "review"; product: UniversalProduct }
  | { kind: "error"; message: string; code: string | null };

export function UniversalScanSheet({ open, onOpenChange, mealType = "snack", title }: Props) {
  const lookup = useServerFn(lookupUniversalCode);
  const readLabel = useServerFn(readLabelPhoto);
  const fileRef = useRef<HTMLInputElement | null>(null);

  const [stage, setStage] = useState<Stage>({ kind: "scanning" });
  const [payload, setPayload] = useState<ScanPayload | null>(null);

  const close = useCallback(() => {
    setStage({ kind: "scanning" });
    setPayload(null);
    onOpenChange(false);
  }, [onOpenChange]);

  const runLookup = useCallback(
    async (scan: ScanPayload) => {
      setPayload(scan);
      setStage({ kind: "looking-up", code: scan.code });
      try {
        const res = await lookup({
          data: {
            code: scan.code,
            lot: scan.lot,
            expiry: scan.expiry,
            serial: scan.serial,
            scanSource: scan.origin,
            symbology: scan.symbology,
          },
        });
        if (!res.ok) {
          setStage({ kind: "error", message: res.error, code: scan.code });
          return;
        }
        if (res.result.status === "found") {
          setStage({ kind: "review", product: res.result.product });
        } else {
          setStage({ kind: "unknown", code: res.result.code, message: res.result.message });
        }
      } catch (err) {
        setStage({
          kind: "error",
          message: userFacingErrorMessage(err, "Lookup failed."),
          code: scan.code,
        });
      }
    },
    [lookup],
  );

  const onLabelPhoto = useCallback(
    async (file: File) => {
      setStage({ kind: "reading-label" });
      try {
        const dataUrl = await fileToDownscaledDataUrl(file, 1600, 0.85);
        const res = await readLabel({
          data: { imageDataUrl: dataUrl, code: payload?.code ?? null },
        });
        if (!res.ok) {
          setStage({ kind: "error", message: res.error, code: payload?.code ?? null });
          return;
        }
        setStage({
          kind: "review",
          product: {
            ...res.product,
            gs1: payload
              ? { lot: payload.lot, expiry: payload.expiry, serial: payload.serial }
              : null,
          },
        });
      } catch (err) {
        setStage({
          kind: "error",
          message: userFacingErrorMessage(err, "We couldn't read that label."),
          code: payload?.code ?? null,
        });
      }
    },
    [payload, readLabel],
  );

  const busy = stage.kind === "looking-up" || stage.kind === "reading-label";

  return (
    <>
      {/* The camera sheet owns the scanning stage; everything after it renders here. */}
      <BarcodeScanSheet
        open={open && stage.kind === "scanning"}
        onOpenChange={(next) => {
          if (!next && stage.kind === "scanning") close();
        }}
        title={title ?? "Scan any product"}
        onDetected={() => undefined}
        onDetectedPayload={(scan) => void runLookup(scan)}
      />

      <Sheet
        open={open && stage.kind !== "scanning"}
        onOpenChange={(next) => {
          if (!next) close();
        }}
      >
        <SheetContent side="bottom" className="max-h-[92vh] overflow-y-auto">
          <SheetHeader>
            <SheetTitle>
              {stage.kind === "review" ? "Check this is right" : (title ?? "Scan any product")}
            </SheetTitle>
          </SheetHeader>

          <div className="mt-4 space-y-4">
            {busy && (
              <div className="flex items-center gap-3 rounded-lg border p-4">
                <Loader2 className="h-5 w-5 animate-spin text-primary" />
                <p className="text-sm text-muted-foreground">
                  {stage.kind === "reading-label"
                    ? "Reading the label…"
                    : "Checking food, supplement and medicine databases…"}
                </p>
              </div>
            )}

            {stage.kind === "unknown" && (
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">{stage.message}</p>
                <Button type="button" className="w-full" onClick={() => fileRef.current?.click()}>
                  <Camera className="mr-2 h-4 w-4" />
                  Photograph the label
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  onClick={() => setStage({ kind: "scanning" })}
                >
                  <ScanBarcode className="mr-2 h-4 w-4" />
                  Scan a different code
                </Button>
              </div>
            )}

            {stage.kind === "error" && (
              <div className="space-y-3">
                <p className="rounded-lg border border-destructive/40 bg-destructive/5 p-3 text-sm">
                  {stage.message}
                </p>
                <Button
                  type="button"
                  className="w-full"
                  onClick={() =>
                    payload ? void runLookup(payload) : setStage({ kind: "scanning" })
                  }
                >
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Try again
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  onClick={() => fileRef.current?.click()}
                >
                  <Camera className="mr-2 h-4 w-4" />
                  Photograph the label instead
                </Button>
              </div>
            )}

            {stage.kind === "review" && (
              <UniversalScanReview
                product={stage.product}
                mealType={mealType}
                onSaved={close}
                onCancel={close}
              />
            )}
          </div>

          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="sr-only"
            aria-label="Photo of the product label"
            onChange={(e) => {
              const file = e.target.files?.[0];
              e.target.value = "";
              if (file) void onLabelPhoto(file);
            }}
          />
        </SheetContent>
      </Sheet>
    </>
  );
}
