/**
 * 1080×1920 story card for a shared routine.
 *
 * Drawn on a plain 2D canvas (no html2canvas, no server render) so it works
 * identically in the browser, in the iOS WKWebView and in the Android
 * WebView — the only requirement is `canvas.toBlob`, which all three have.
 *
 * Only workout fields are painted. Notes and anything from the stack are not
 * available to this module by construction (see `shared-routine.ts`).
 */

import {
  formatExerciseDetail,
  routineShareLabel,
  routineSummary,
  type SharedRoutine,
} from "@/lib/shared-routine";

export const CARD_WIDTH = 1080;
export const CARD_HEIGHT = 1920;

const TEAL = "#0E7C86";
const TEAL_DEEP = "#075860";
const INK = "#0B1F22";
const MUTED = "rgba(255,255,255,0.72)";

/** Renders the card and resolves with a PNG blob. */
export async function renderRoutineCard(routine: SharedRoutine): Promise<Blob> {
  const canvas = document.createElement("canvas");
  canvas.width = CARD_WIDTH;
  canvas.height = CARD_HEIGHT;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas is not available on this device");

  // Background: deep teal gradient with a soft top glow.
  const bg = ctx.createLinearGradient(0, 0, 0, CARD_HEIGHT);
  bg.addColorStop(0, TEAL);
  bg.addColorStop(0.55, TEAL_DEEP);
  bg.addColorStop(1, INK);
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, CARD_WIDTH, CARD_HEIGHT);

  const glow = ctx.createRadialGradient(540, 220, 40, 540, 220, 720);
  glow.addColorStop(0, "rgba(255,255,255,0.18)");
  glow.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, CARD_WIDTH, 900);

  // Brand row.
  const logo = await loadLogo();
  let brandX = 96;
  if (logo) {
    ctx.drawImage(logo, brandX, 118, 72, 72);
    brandX += 96;
  }
  ctx.fillStyle = "#FFFFFF";
  ctx.font = "600 46px system-ui, -apple-system, 'Segoe UI', sans-serif";
  ctx.textBaseline = "middle";
  ctx.fillText("DoseRoutine", brandX, 156);

  // Routine name (wraps to 3 lines max).
  ctx.font = "700 84px system-ui, -apple-system, 'Segoe UI', sans-serif";
  const nameLines = wrap(ctx, routine.routine_name, CARD_WIDTH - 192, 3);
  let y = 320;
  for (const line of nameLines) {
    ctx.fillText(line, 96, y);
    y += 96;
  }

  // Summary line.
  ctx.font = "400 40px system-ui, -apple-system, 'Segoe UI', sans-serif";
  ctx.fillStyle = MUTED;
  ctx.fillText(routineSummary(routine).replace(" · shared from DoseRoutine", ""), 96, y + 12);
  y += 96;

  // Exercise list.
  const maxRows = Math.floor((CARD_HEIGHT - 260 - y) / 108);
  const rows = routine.exercises.slice(0, Math.max(0, maxRows));
  for (const [index, ex] of rows.entries()) {
    const top = y + index * 108;
    ctx.fillStyle = "rgba(255,255,255,0.08)";
    roundRect(ctx, 96, top, CARD_WIDTH - 192, 88, 24);
    ctx.fill();

    ctx.fillStyle = "rgba(255,255,255,0.55)";
    ctx.font = "600 30px system-ui, -apple-system, 'Segoe UI', sans-serif";
    ctx.fillText(String(index + 1).padStart(2, "0"), 132, top + 44);

    ctx.fillStyle = "#FFFFFF";
    ctx.font = "600 38px system-ui, -apple-system, 'Segoe UI', sans-serif";
    ctx.fillText(truncate(ctx, ex.exercise, 470), 196, top + 44);

    const detail = formatExerciseDetail(ex);
    if (detail) {
      ctx.fillStyle = MUTED;
      ctx.font = "400 32px system-ui, -apple-system, 'Segoe UI', sans-serif";
      ctx.textAlign = "right";
      ctx.fillText(truncate(ctx, detail, 300), CARD_WIDTH - 132, top + 44);
      ctx.textAlign = "left";
    }
  }

  const hidden = routine.exercises.length - rows.length;
  if (hidden > 0) {
    ctx.fillStyle = MUTED;
    ctx.font = "400 34px system-ui, -apple-system, 'Segoe UI', sans-serif";
    ctx.fillText(`+ ${hidden} more`, 132, y + rows.length * 108 + 40);
  }

  // Footer link.
  ctx.fillStyle = "rgba(255,255,255,0.10)";
  roundRect(ctx, 96, CARD_HEIGHT - 220, CARD_WIDTH - 192, 108, 30);
  ctx.fill();
  ctx.fillStyle = "#FFFFFF";
  ctx.font = "600 40px system-ui, -apple-system, 'Segoe UI', sans-serif";
  ctx.textAlign = "center";
  ctx.fillText(routineShareLabel(routine.public_id), CARD_WIDTH / 2, CARD_HEIGHT - 166);
  ctx.textAlign = "left";

  return await toBlob(canvas);
}

export function routineCardFileName(routine: SharedRoutine): string {
  const slug =
    routine.routine_name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 40) || "routine";
  return `doseroutine-${slug}.png`;
}

/**
 * Saves or shares the card. Inside the Capacitor shell it writes to the cache
 * directory and hands the file to the native share sheet; on the web it falls
 * back to a download.
 */
export async function shareOrDownloadCard(routine: SharedRoutine, shareUrl: string): Promise<void> {
  const blob = await renderRoutineCard(routine);
  const fileName = routineCardFileName(routine);

  const { Capacitor } = await import("@capacitor/core");
  if (Capacitor.isNativePlatform()) {
    const [{ Filesystem, Directory }, { Share }] = await Promise.all([
      import("@capacitor/filesystem"),
      import("@capacitor/share"),
    ]);
    const base64 = await blobToBase64(blob);
    const written = await Filesystem.writeFile({
      path: fileName,
      data: base64,
      directory: Directory.Cache,
    });
    await Share.share({
      title: routine.routine_name,
      text: `${routine.routine_name} — ${routineSummary(routine)}`,
      url: written.uri,
      dialogTitle: "Share routine card",
    });
    return;
  }

  const objectUrl = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = objectUrl;
  anchor.download = fileName;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(objectUrl);
  void shareUrl;
}

/** Native share sheet for the plain link (no image). */
export async function shareRoutineLink(title: string, url: string): Promise<boolean> {
  try {
    const { Capacitor } = await import("@capacitor/core");
    if (Capacitor.isNativePlatform()) {
      const { Share } = await import("@capacitor/share");
      await Share.share({ title, text: title, url, dialogTitle: "Share routine" });
      return true;
    }
  } catch {
    /* fall through to the web share sheet */
  }
  if (typeof navigator !== "undefined" && "share" in navigator) {
    try {
      await navigator.share({ title, url });
      return true;
    } catch {
      return false;
    }
  }
  return false;
}

/* -------------------- canvas helpers -------------------- */

function toBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error("Could not render the image card"));
    }, "image/png");
  });
}

async function blobToBase64(blob: Blob): Promise<string> {
  const buffer = new Uint8Array(await blob.arrayBuffer());
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < buffer.length; i += chunk) {
    binary += String.fromCharCode(...buffer.subarray(i, i + chunk));
  }
  return btoa(binary);
}

async function loadLogo(): Promise<HTMLImageElement | null> {
  return await new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = "/logo-128.webp";
  });
}

function wrap(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  maxLines: number,
): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (ctx.measureText(next).width > maxWidth && current) {
      lines.push(current);
      current = word;
      if (lines.length === maxLines) break;
    } else {
      current = next;
    }
  }
  if (lines.length < maxLines && current) lines.push(current);
  if (lines.length === 0) lines.push(text.slice(0, 24));
  return lines;
}

function truncate(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string {
  if (ctx.measureText(text).width <= maxWidth) return text;
  let out = text;
  while (out.length > 1 && ctx.measureText(`${out}…`).width > maxWidth) out = out.slice(0, -1);
  return `${out}…`;
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
): void {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + width, y, x + width, y + height, radius);
  ctx.arcTo(x + width, y + height, x, y + height, radius);
  ctx.arcTo(x, y + height, x, y, radius);
  ctx.arcTo(x, y, x + width, y, radius);
  ctx.closePath();
}
