/**
 * ZoomPan — a reusable pinch / wheel zoom + drag pan surface.
 *
 * Handles the usual traps: wheel zoom is scaled by the normalised delta
 * (never a fixed factor per event, which compounds on trackpads), the point
 * under the cursor stays put, the native wheel listener is non-passive so the
 * page doesn't scroll behind it, and touch pinch is done with Pointer Events.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { Minus, Plus, RotateCcw } from "lucide-react";

import { cn } from "@/lib/utils";

const MIN_ZOOM = 1;
const MAX_ZOOM = 5;
const INTENSITY = 0.0015;

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

type View = { z: number; x: number; y: number };

const IDENTITY: View = { z: 1, x: 0, y: 0 };

export function ZoomPan({
  children,
  className,
  contentClassName,
  label = "Zoomable diagram",
}: {
  children: React.ReactNode;
  className?: string;
  contentClassName?: string;
  label?: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [view, setView] = useState<View>(IDENTITY);
  const viewRef = useRef(view);
  viewRef.current = view;

  /** Keeps content edges inside the frame at any zoom. */
  const clampView = useCallback((v: View): View => {
    const el = containerRef.current;
    if (!el) return v;
    const { width, height } = el.getBoundingClientRect();
    const maxX = 0;
    const minX = width - width * v.z;
    const maxY = 0;
    const minY = height - height * v.z;
    return {
      z: v.z,
      x: v.z <= 1 ? 0 : clamp(v.x, minX, maxX),
      y: v.z <= 1 ? 0 : clamp(v.y, minY, maxY),
    };
  }, []);

  const zoomAt = useCallback(
    (px: number, py: number, nextZoom: number) => {
      setView((prev) => {
        const z = clamp(nextZoom, MIN_ZOOM, MAX_ZOOM);
        const k = z / prev.z;
        return clampView({ z, x: px - (px - prev.x) * k, y: py - (py - prev.y) * k });
      });
    },
    [clampView],
  );

  const zoomAtRef = useRef(zoomAt);
  zoomAtRef.current = zoomAt;

  // Native, non-passive: React's onWheel is passive and can't preventDefault.
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const dy = e.deltaY * (e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? 100 : 1);
      const rect = el.getBoundingClientRect();
      const next = viewRef.current.z * Math.exp(-dy * INTENSITY);
      zoomAtRef.current(e.clientX - rect.left, e.clientY - rect.top, next);
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, []);

  // ---- pointer drag + two-finger pinch ----
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const pinch = useRef<{ dist: number; cx: number; cy: number } | null>(null);
  const lastTap = useRef(0);

  const localPoint = (e: React.PointerEvent) => {
    const rect = containerRef.current!.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const onPointerDown = (e: React.PointerEvent) => {
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    pointers.current.set(e.pointerId, localPoint(e));
    if (pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()];
      pinch.current = {
        dist: Math.hypot(a.x - b.x, a.y - b.y),
        cx: (a.x + b.x) / 2,
        cy: (a.y + b.y) / 2,
      };
    }
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!pointers.current.has(e.pointerId)) return;
    const prev = pointers.current.get(e.pointerId)!;
    const cur = localPoint(e);
    pointers.current.set(e.pointerId, cur);

    if (pointers.current.size >= 2) {
      const [a, b] = [...pointers.current.values()];
      const dist = Math.hypot(a.x - b.x, a.y - b.y);
      const start = pinch.current;
      if (start && start.dist > 0) {
        const cx = (a.x + b.x) / 2;
        const cy = (a.y + b.y) / 2;
        zoomAt(cx, cy, viewRef.current.z * (dist / start.dist));
        pinch.current = { dist, cx, cy };
      }
      return;
    }

    if (viewRef.current.z <= 1) return;
    const dx = cur.x - prev.x;
    const dy = cur.y - prev.y;
    setView((v) => clampView({ ...v, x: v.x + dx, y: v.y + dy }));
  };

  const endPointer = (e: React.PointerEvent) => {
    pointers.current.delete(e.pointerId);
    if (pointers.current.size < 2) pinch.current = null;
  };

  const onPointerUp = (e: React.PointerEvent) => {
    endPointer(e);
    const now = Date.now();
    if (now - lastTap.current < 300) {
      const p = localPoint(e);
      if (viewRef.current.z > 1.05) setView(IDENTITY);
      else zoomAt(p.x, p.y, 2.5);
      lastTap.current = 0;
      return;
    }
    lastTap.current = now;
  };

  const stepZoom = (factor: number) => {
    const el = containerRef.current;
    if (!el) return;
    const { width, height } = el.getBoundingClientRect();
    zoomAt(width / 2, height / 2, viewRef.current.z * factor);
  };

  const zoomed = view.z > 1.01;

  return (
    <div className={cn("relative", className)}>
      <div
        ref={containerRef}
        role="group"
        aria-label={`${label}. Pinch or scroll to zoom, drag to pan.`}
        className={cn(
          "relative h-full w-full touch-none overflow-hidden rounded-xl",
          zoomed ? "cursor-grab active:cursor-grabbing" : "cursor-zoom-in",
        )}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={endPointer}
        onPointerLeave={endPointer}
      >
        <div
          className={cn("h-full w-full origin-top-left will-change-transform", contentClassName)}
          style={{
            transform: `translate(${view.x}px, ${view.y}px) scale(${view.z})`,
            transition: pointers.current.size ? undefined : "transform 120ms ease-out",
          }}
        >
          {children}
        </div>
      </div>

      <div className="absolute bottom-1 right-1 flex items-center gap-1 rounded-full border border-border bg-background/90 p-0.5 shadow-sm backdrop-blur">
        <button
          type="button"
          onClick={() => stepZoom(1 / 1.4)}
          aria-label="Zoom out"
          className="flex h-7 w-7 items-center justify-center rounded-full text-muted-foreground hover:bg-muted"
        >
          <Minus className="h-3.5 w-3.5" />
        </button>
        <span className="min-w-8 text-center text-[10px] tabular-nums text-muted-foreground">
          {view.z.toFixed(1)}×
        </span>
        <button
          type="button"
          onClick={() => stepZoom(1.4)}
          aria-label="Zoom in"
          className="flex h-7 w-7 items-center justify-center rounded-full text-muted-foreground hover:bg-muted"
        >
          <Plus className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          onClick={() => setView(IDENTITY)}
          aria-label="Reset zoom"
          className="flex h-7 w-7 items-center justify-center rounded-full text-muted-foreground hover:bg-muted"
        >
          <RotateCcw className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}
