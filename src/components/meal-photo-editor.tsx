import { useCallback, useEffect, useRef, useState } from "react";
import { Check, Crop, RotateCcw, RotateCw, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

type Rect = { x: number; y: number; w: number; h: number };

/**
 * Draw the source image rotated by `quarterTurns` and cropped to `crop`
 * (crop is expressed in fractions of the *rotated* image, 0..1).
 */
function renderEdited(img: HTMLImageElement, quarterTurns: number, crop: Rect | null): string {
  const turns = ((quarterTurns % 4) + 4) % 4;
  const swapped = turns % 2 === 1;
  const rotW = swapped ? img.naturalHeight : img.naturalWidth;
  const rotH = swapped ? img.naturalWidth : img.naturalHeight;

  const rotated = document.createElement("canvas");
  rotated.width = rotW;
  rotated.height = rotH;
  const rctx = rotated.getContext("2d");
  if (!rctx) return img.src;
  rctx.translate(rotW / 2, rotH / 2);
  rctx.rotate((turns * Math.PI) / 2);
  rctx.drawImage(img, -img.naturalWidth / 2, -img.naturalHeight / 2);

  if (!crop) return rotated.toDataURL("image/jpeg", 0.9);

  const sx = Math.round(crop.x * rotW);
  const sy = Math.round(crop.y * rotH);
  const sw = Math.max(16, Math.round(crop.w * rotW));
  const sh = Math.max(16, Math.round(crop.h * rotH));
  const out = document.createElement("canvas");
  out.width = sw;
  out.height = sh;
  const octx = out.getContext("2d");
  if (!octx) return rotated.toDataURL("image/jpeg", 0.9);
  octx.drawImage(rotated, sx, sy, sw, sh, 0, 0, sw, sh);
  return out.toDataURL("image/jpeg", 0.9);
}

/**
 * Lightweight crop + rotate step for a meal photo. Deliberately simple: quarter
 * turns and one drag-to-crop rectangle, so it works with a thumb on a phone.
 */
export function MealPhotoEditor({
  open,
  onOpenChange,
  src,
  onApply,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  src: string | null;
  onApply: (dataUrl: string) => void;
}) {
  const [turns, setTurns] = useState(0);
  const [crop, setCrop] = useState<Rect | null>(null);
  const [drag, setDrag] = useState<{ x: number; y: number } | null>(null);
  const [busy, setBusy] = useState(false);
  const frameRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) {
      setTurns(0);
      setCrop(null);
      setDrag(null);
    }
  }, [open, src]);

  const pointFor = useCallback((clientX: number, clientY: number) => {
    const el = frameRef.current;
    if (!el) return { x: 0, y: 0 };
    const rect = el.getBoundingClientRect();
    return {
      x: Math.min(1, Math.max(0, (clientX - rect.left) / rect.width)),
      y: Math.min(1, Math.max(0, (clientY - rect.top) / rect.height)),
    };
  }, []);

  function rectFrom(a: { x: number; y: number }, b: { x: number; y: number }): Rect {
    return {
      x: Math.min(a.x, b.x),
      y: Math.min(a.y, b.y),
      w: Math.abs(a.x - b.x),
      h: Math.abs(a.y - b.y),
    };
  }

  async function apply() {
    if (!src) return;
    setBusy(true);
    try {
      const img = new Image();
      img.crossOrigin = "anonymous";
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = () => reject(new Error("Could not read that photo."));
        img.src = src;
      });
      const usable = crop && crop.w > 0.05 && crop.h > 0.05 ? crop : null;
      onApply(renderEdited(img, turns, usable));
      onOpenChange(false);
    } finally {
      setBusy(false);
    }
  }

  const preview = crop ?? null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Crop &amp; rotate</DialogTitle>
        </DialogHeader>

        <p className="text-xs text-muted-foreground">
          Drag across the photo to pick the part you want to keep, and use the arrows to turn it
          upright. Straight-on, tight crops of the label scan best.
        </p>

        {src ? (
          <div
            ref={frameRef}
            className="relative mt-2 touch-none overflow-hidden rounded-xl border border-border bg-muted"
            onPointerDown={(e) => {
              e.currentTarget.setPointerCapture(e.pointerId);
              const p = pointFor(e.clientX, e.clientY);
              setDrag(p);
              setCrop({ x: p.x, y: p.y, w: 0, h: 0 });
            }}
            onPointerMove={(e) => {
              if (!drag) return;
              setCrop(rectFrom(drag, pointFor(e.clientX, e.clientY)));
            }}
            onPointerUp={() => setDrag(null)}
            onPointerCancel={() => setDrag(null)}
          >
            <img
              src={src}
              alt="Meal photo being cropped"
              title="Meal photo being cropped"
              width={1024}
              height={1024}
              draggable={false}
              className="block max-h-[50vh] w-full select-none object-contain"
              style={{ transform: `rotate(${turns * 90}deg)` }}
            />
            {preview && preview.w > 0.02 && preview.h > 0.02 ? (
              <div
                aria-hidden="true"
                className="pointer-events-none absolute border-2 border-primary bg-primary/10"
                style={{
                  left: `${preview.x * 100}%`,
                  top: `${preview.y * 100}%`,
                  width: `${preview.w * 100}%`,
                  height: `${preview.h * 100}%`,
                }}
              />
            ) : null}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">No photo to edit yet.</p>
        )}

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <Button type="button" variant="outline" size="sm" onClick={() => setTurns((t) => t - 1)}>
            <RotateCcw className="mr-2 h-4 w-4" />
            Left
          </Button>
          <Button type="button" variant="outline" size="sm" onClick={() => setTurns((t) => t + 1)}>
            <RotateCw className="mr-2 h-4 w-4" />
            Right
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={!crop}
            onClick={() => setCrop(null)}
          >
            <Crop className="mr-2 h-4 w-4" />
            Clear crop
          </Button>
        </div>

        <div className="mt-4 flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
            <X className="mr-2 h-4 w-4" />
            Cancel
          </Button>
          <Button type="button" disabled={!src || busy} onClick={() => void apply()}>
            <Check className="mr-2 h-4 w-4" />
            {busy ? "Applying…" : "Apply"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
