/**
 * Unified barcode scanning with three tiers of support:
 *
 *  1. Native (iOS / Android via Capacitor)      → @capacitor-mlkit/barcode-scanning
 *     Fastest, most accurate, uses the OS camera pipeline. Only path that
 *     works inside the installed DoseRoutine app.
 *
 *  2. Web with native BarcodeDetector           → window.BarcodeDetector
 *     Chrome / Edge / Android Chrome. Zero-KB, GPU-accelerated.
 *
 *  3. Web fallback                              → @zxing/browser
 *     Covers iOS Safari (no BarcodeDetector) and older desktop browsers.
 *     Loaded dynamically so it isn't shipped to users who don't need it.
 *
 * Callers get one API — `scanBarcode({ video, onResult })` returns a stop fn —
 * and never has to branch on platform.
 */
import { isNative } from "@/lib/platform";

export type ScanFormat =
  | "ean_13"
  | "ean_8"
  | "upc_a"
  | "upc_e"
  | "code_128"
  | "code_39"
  | "qr_code"
  // Rx unit packages and many supplement cartons carry a 2D DataMatrix
  // holding a GS1 element string (GTIN + lot + expiry) rather than a UPC.
  | "data_matrix";

export const DEFAULT_FORMATS: ScanFormat[] = [
  "ean_13",
  "ean_8",
  "upc_a",
  "upc_e",
  "code_128",
  "code_39",
  "qr_code",
  "data_matrix",
];

export type ScannerCapability = "native" | "browser-detector" | "zxing" | "none";

export function detectCapability(): ScannerCapability {
  if (isNative()) return "native";
  if (typeof window === "undefined") return "none";
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- lint-baseline: pre-existing; do not add new ones.
  if (typeof (window as any).BarcodeDetector === "function") return "browser-detector";
  // ZXing works anywhere with getUserMedia + canvas.
  if (typeof navigator.mediaDevices?.getUserMedia === "function") return "zxing";
  return "none";
}

export type ScanHandle = {
  stop: () => Promise<void> | void;
  capability: ScannerCapability;
};

/**
 * Where the live preview should render. Accepts the element itself, a React
 * ref, or a getter — because callers almost always flip a `scanning` state
 * flag and call us in the same tick, before React has committed the <video>
 * to the DOM. Passing a ref/getter lets us wait for it instead of failing
 * with "A <video> element is required".
 */
export type VideoTarget =
  | HTMLVideoElement
  | null
  | undefined
  | { current: HTMLVideoElement | null }
  | (() => HTMLVideoElement | null | undefined);

export type ScanOptions = {
  /** Required for browser modes; ignored on native (system UI). */
  video?: VideoTarget;
  onResult: (code: string) => void;
  onError?: (err: Error) => void;
  formats?: ScanFormat[];
};

function readVideo(target: VideoTarget): HTMLVideoElement | null {
  if (!target) return null;
  if (typeof target === "function") return target() ?? null;
  if (target instanceof HTMLVideoElement) return target;
  if (typeof target === "object" && "current" in target) return target.current;
  return null;
}

/**
 * Wait (up to ~3s) for the caller's <video> to be mounted. React commits it
 * on the next frame after the state flip that reveals the scanner UI, so a
 * short poll turns a guaranteed failure into a normal start.
 */
async function resolveVideo(target: VideoTarget): Promise<HTMLVideoElement> {
  const immediate = readVideo(target);
  if (immediate) return immediate;
  if (typeof window === "undefined") throw new Error("A <video> element is required");

  const deadline = Date.now() + 3000;
  while (Date.now() < deadline) {
    await new Promise<void>((resolve) => {
      if (typeof requestAnimationFrame === "function") requestAnimationFrame(() => resolve());
      else setTimeout(resolve, 16);
    });
    const el = readVideo(target);
    if (el) return el;
  }
  throw new Error("A <video> element is required");
}

// ─── Native (Capacitor ML Kit) ─────────────────────────────────────────────
async function startNative({ onResult, onError, formats }: ScanOptions): Promise<ScanHandle> {
  try {
    const mod = await import("@capacitor-mlkit/barcode-scanning");
    const { BarcodeScanner, BarcodeFormat } = mod;

    const perm = await BarcodeScanner.requestPermissions();
    if (perm.camera !== "granted" && perm.camera !== "limited") {
      throw new Error("Camera permission denied");
    }

    const supported = await BarcodeScanner.isSupported();
    if (!supported.supported) throw new Error("Scanner not supported on this device");

    // Ensure ML Kit module is present on Android (no-op on iOS).
    // A failed *install* is actionable and must not be confused with the
    // "already installed / not applicable on iOS" case.
    let available = true;
    try {
      const avail = await BarcodeScanner.isGoogleBarcodeScannerModuleAvailable();
      available = avail.available;
    } catch {
      /* iOS, or the check isn't implemented — assume usable */
    }
    if (!available) {
      try {
        await BarcodeScanner.installGoogleBarcodeScannerModule();
      } catch {
        throw new Error(
          "The barcode scanner add-on couldn't be installed. Check your connection and try again, or enter the barcode manually.",
        );
      }
    }

    const fmtMap: Record<ScanFormat, keyof typeof BarcodeFormat> = {
      ean_13: "Ean13",
      ean_8: "Ean8",
      upc_a: "UpcA",
      upc_e: "UpcE",
      code_128: "Code128",
      code_39: "Code39",
      qr_code: "QrCode",
      data_matrix: "DataMatrix",
    };

    const nativeFormats = (formats ?? DEFAULT_FORMATS)
      .map((f) => BarcodeFormat[fmtMap[f]])
      .filter(Boolean);

    const { barcodes } = await BarcodeScanner.scan({ formats: nativeFormats });
    const first = barcodes?.[0]?.rawValue;
    if (first) onResult(String(first));
    return { capability: "native", stop: () => undefined };
  } catch (e) {
    // A missing/unimplemented plugin must read as "not supported here" (which
    // offers photo upload + manual entry) rather than a dead-end failure — on
    // a reviewer's device an unavailable plugin otherwise looks like a crash.
    const raw = e instanceof Error ? e.message : String(e ?? "");
    const unavailable =
      /not implemented|unimplemented|plugin .*not (installed|available)|Cannot find module|is not a function/i.test(
        raw,
      );
    const err = unavailable
      ? new Error("Scanning is not supported on this device")
      : e instanceof Error
        ? e
        : new Error("Native scan failed");
    onError?.(err);
    throw err;
  }
}

// ─── Browser BarcodeDetector ───────────────────────────────────────────────
async function startBrowserDetector(opts: ScanOptions): Promise<ScanHandle> {
  const { onResult, onError, formats } = opts;
  const video = await resolveVideo(opts.video);

  const stream = await navigator.mediaDevices.getUserMedia({
    // A 1080p rear feed with continuous autofocus is what makes small, curved
    // package barcodes readable — the default 640x480 feed often can't resolve
    // the bars at all.
    video: {
      facingMode: { ideal: "environment" },
      width: { ideal: 1920 },
      height: { ideal: 1080 },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- non-standard but widely supported focus hints
      ...({ focusMode: "continuous", advanced: [{ focusMode: "continuous" }] } as any),
    },
    audio: false,
  });
  video.srcObject = stream;
  video.setAttribute("playsinline", "true");
  await video.play();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- lint-baseline: pre-existing; do not add new ones.
  const Detector = (window as any).BarcodeDetector;
  const detector = new Detector({ formats: formats ?? DEFAULT_FORMATS });

  let stopped = false;
  let raf: number | null = null;

  const loop = async () => {
    if (stopped) return;
    try {
      const results = await detector.detect(video);
      const val = results?.[0]?.rawValue;
      if (val) {
        onResult(String(val));
        // eslint-disable-next-line @typescript-eslint/no-use-before-define -- lint-baseline: pre-existing; do not add new ones.
        await stop();
        return;
      }
    } catch (e) {
      // per-frame decode errors are expected; only surface fatal ones
      if (e instanceof Error && /invalid|not supported/i.test(e.message)) onError?.(e);
    }
    raf = requestAnimationFrame(loop);
  };

  const stop = async () => {
    stopped = true;
    if (raf != null) cancelAnimationFrame(raf);
    stream.getTracks().forEach((t) => t.stop());
    if (video.srcObject === stream) video.srcObject = null;
  };

  loop();
  return { capability: "browser-detector", stop };
}

// ─── ZXing fallback (iOS Safari, older browsers) ───────────────────────────

/**
 * ZXing emits a rejection on every frame that has no readable code. Those are
 * normal scanning noise, not camera failures — and depending on the bundle the
 * class name can be minified, so match on the message text too.
 */
export function isTransientDecodeError(err: unknown): boolean {
  const name = (err as { name?: string } | null)?.name ?? "";
  const message = err instanceof Error ? err.message : String(err ?? "");
  return (
    /NotFound|Checksum|Format/i.test(name) ||
    /no multiformat readers|not ?found|checksum|format error/i.test(message) ||
    message.trim() === ""
  );
}

async function startZxing(opts: ScanOptions): Promise<ScanHandle> {
  const { onResult, onError } = opts;
  const video = await resolveVideo(opts.video);

  const { BrowserMultiFormatReader } = await import("@zxing/browser");
  const reader = new BrowserMultiFormatReader();

  let stopped = false;
  let controls: { stop: () => void } | null = null;

  try {
    controls = await reader.decodeFromVideoDevice(
      undefined, // let ZXing pick the rear camera when possible
      video,
      (result, err) => {
        if (stopped) return;
        if (result) {
          onResult(result.getText());
          // eslint-disable-next-line @typescript-eslint/no-use-before-define -- lint-baseline: pre-existing; do not add new ones.
          void stopFn();
        } else if (err && !isTransientDecodeError(err)) {
          onError?.(err instanceof Error ? err : new Error(String(err)));
        }
      },
    );
  } catch (e) {
    onError?.(e instanceof Error ? e : new Error("ZXing failed to start"));
    throw e;
  }

  const stopFn = async () => {
    stopped = true;
    try {
      controls?.stop();
    } catch {
      /* noop */
    }
    const stream = video.srcObject as MediaStream | null;
    stream?.getTracks().forEach((t) => t.stop());
    if (video.srcObject) video.srcObject = null;
  };

  return { capability: "zxing", stop: stopFn };
}

/**
 * Start a scan using the best available backend. Returns a handle whose
 * `stop()` releases the camera. On native, the OS overlay handles UX so the
 * returned handle is a no-op after the single scan result fires.
 */
export async function scanBarcode(opts: ScanOptions): Promise<ScanHandle> {
  const cap = detectCapability();
  // L2 — every backend failure is normalised here instead of leaking raw
  // plugin/getUserMedia rejections to the caller. Callers still get a rejected
  // promise, but always with an Error carrying a stable, user-safe message.
  try {
    switch (cap) {
      case "native":
        return await startNative(opts);
      case "browser-detector":
        return await startBrowserDetector(opts);
      case "zxing":
        return await startZxing(opts);
      default:
        throw new Error("No barcode scanner available on this device");
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    const normalized = new Error(message || "Couldn't start the camera scanner");
    normalized.name = err instanceof Error && err.name ? err.name : "BarcodeScanError";
    throw normalized;
  }
}

// ─── Decode from a photo (gallery upload) ──────────────────────────────────

/**
 * Read a barcode out of a still image the user picked from their gallery or
 * took with the camera app. Uses the browser's own detector when present and
 * falls back to ZXing, so it works on iOS Safari too. No camera permission is
 * required for this path — that's the whole point of offering it.
 */
export async function scanBarcodeFromImage(file: File | Blob): Promise<string | null> {
  if (typeof window === "undefined") return null;

  // 1. Native BarcodeDetector (Chrome, Android) — fastest.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- lint-baseline: pre-existing; do not add new ones.
  const Detector = (window as any).BarcodeDetector;
  if (typeof Detector === "function" && typeof createImageBitmap === "function") {
    try {
      const bitmap = await createImageBitmap(file);
      try {
        const detector = new Detector({ formats: DEFAULT_FORMATS });
        const results = await detector.detect(bitmap);
        const val = results?.[0]?.rawValue;
        if (val) return String(val);
      } finally {
        bitmap.close?.();
      }
    } catch {
      // fall through to ZXing
    }
  }

  // 2. ZXing on an object URL (iOS Safari, older browsers, and as a retry when
  //    the native detector found nothing in a noisy photo).
  const url = URL.createObjectURL(file);
  try {
    const { BrowserMultiFormatReader } = await import("@zxing/browser");
    const reader = new BrowserMultiFormatReader();
    const result = await reader.decodeFromImageUrl(url);
    const text = result?.getText();
    return text ? String(text) : null;
  } catch {
    return null;
  } finally {
    URL.revokeObjectURL(url);
  }
}

// ─── Friendly permission / failure messages ────────────────────────────────

export type CameraIssue =
  | "denied"
  | "no-camera"
  | "in-use"
  | "insecure"
  | "unsupported"
  | "unknown";

export type CameraProblem = {
  kind: CameraIssue;
  /** One short line the user can act on. */
  title: string;
  body: string;
  /** True when the OS settings screen can fix it (native permission denial). */
  canOpenSettings?: boolean;
};

/**
 * Turn a raw getUserMedia / plugin error into something a non-technical person
 * can act on. Every branch keeps the user moving: photo upload and typing the
 * digits stay available no matter what the camera did.
 */
/**
 * L1 — on native, a denied camera permission can only be fixed in the OS
 * settings app. Opens that screen directly. Returns false when unavailable
 * (web, or the plugin isn't present) so callers can fall back to instructions.
 */
export async function openCameraSettings(): Promise<boolean> {
  try {
    const { BarcodeScanner } = await import("@capacitor-mlkit/barcode-scanning");
    await BarcodeScanner.openSettings();
    return true;
  } catch {
    return false;
  }
}

export function describeCameraProblem(err: unknown): CameraProblem {
  const name = (err as { name?: string } | null)?.name ?? "";
  const message = err instanceof Error ? err.message : String(err ?? "");
  const text = `${name} ${message}`;

  if (/NotAllowedError|Permission|denied|dismissed/i.test(text)) {
    return {
      kind: "denied",
      title: "Camera access is off",
      body: "Camera access is turned off. Open settings to allow it — or just upload a photo of the barcode instead.",
      canOpenSettings: true,
    };
  }
  if (/NotFoundError|DevicesNotFound|no camera/i.test(text)) {
    return {
      kind: "no-camera",
      title: "No camera found",
      body: "We couldn't find a camera on this device. Upload a photo of the barcode or type the numbers underneath it.",
    };
  }
  if (/NotReadableError|TrackStartError|in use|busy/i.test(text)) {
    return {
      kind: "in-use",
      title: "Camera is busy",
      body: "Another app or tab is using the camera. Close it and try again, or upload a photo instead.",
    };
  }
  if (/secure|https|SecurityError/i.test(text)) {
    return {
      kind: "insecure",
      title: "Camera needs a secure connection",
      body: "Live scanning only works on a secure (https) page. Upload a photo of the barcode or type the numbers instead.",
    };
  }
  if (/not supported|No barcode scanner/i.test(text)) {
    return {
      kind: "unsupported",
      title: "Scanning isn't supported here",
      body: "This device can't run the live scanner. Upload a photo of the barcode or type the numbers underneath it.",
    };
  }
  return {
    kind: "unknown",
    title: "Couldn't start the camera",
    body:
      message ||
      "Something went wrong opening the camera. Upload a photo of the barcode or type the numbers instead.",
  };
}
