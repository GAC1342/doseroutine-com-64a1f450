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
  | "qr_code";

export const DEFAULT_FORMATS: ScanFormat[] = [
  "ean_13",
  "ean_8",
  "upc_a",
  "upc_e",
  "code_128",
  "code_39",
  "qr_code",
];

export type ScannerCapability = "native" | "browser-detector" | "zxing" | "none";

export function detectCapability(): ScannerCapability {
  if (isNative()) return "native";
  if (typeof window === "undefined") return "none";
  if (typeof (window as any).BarcodeDetector === "function") return "browser-detector";
  // ZXing works anywhere with getUserMedia + canvas.
  if (typeof navigator.mediaDevices?.getUserMedia === "function") return "zxing";
  return "none";
}

export type ScanHandle = {
  stop: () => Promise<void> | void;
  capability: ScannerCapability;
};

export type ScanOptions = {
  /** Required for browser modes; ignored on native (system UI). */
  video?: HTMLVideoElement | null;
  onResult: (code: string) => void;
  onError?: (err: Error) => void;
  formats?: ScanFormat[];
};

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
    try {
      const avail = await BarcodeScanner.isGoogleBarcodeScannerModuleAvailable();
      if (!avail.available) await BarcodeScanner.installGoogleBarcodeScannerModule();
    } catch {
      /* iOS or already installed */
    }

    const fmtMap: Record<ScanFormat, keyof typeof BarcodeFormat> = {
      ean_13: "Ean13",
      ean_8: "Ean8",
      upc_a: "UpcA",
      upc_e: "UpcE",
      code_128: "Code128",
      code_39: "Code39",
      qr_code: "QrCode",
    };
    const nativeFormats = (formats ?? DEFAULT_FORMATS)
      .map((f) => BarcodeFormat[fmtMap[f]])
      .filter(Boolean);

    const { barcodes } = await BarcodeScanner.scan({ formats: nativeFormats });
    const first = barcodes?.[0]?.rawValue;
    if (first) onResult(String(first));
    return { capability: "native", stop: () => undefined };
  } catch (e) {
    onError?.(e instanceof Error ? e : new Error("Native scan failed"));
    throw e;
  }
}

// ─── Browser BarcodeDetector ───────────────────────────────────────────────
async function startBrowserDetector(opts: ScanOptions): Promise<ScanHandle> {
  const { video, onResult, onError, formats } = opts;
  if (!video) throw new Error("A <video> element is required");

  const stream = await navigator.mediaDevices.getUserMedia({
    video: { facingMode: { ideal: "environment" } },
    audio: false,
  });
  video.srcObject = stream;
  await video.play();

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
async function startZxing(opts: ScanOptions): Promise<ScanHandle> {
  const { video, onResult, onError } = opts;
  if (!video) throw new Error("A <video> element is required");

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
          void stopFn();
        } else if (err && err.name && !/NotFoundException/i.test(err.name)) {
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
  switch (cap) {
    case "native":
      return startNative(opts);
    case "browser-detector":
      return startBrowserDetector(opts);
    case "zxing":
      return startZxing(opts);
    default:
      throw new Error("No barcode scanner available on this device");
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
};

/**
 * Turn a raw getUserMedia / plugin error into something a non-technical person
 * can act on. Every branch keeps the user moving: photo upload and typing the
 * digits stay available no matter what the camera did.
 */
export function describeCameraProblem(err: unknown): CameraProblem {
  const name = (err as { name?: string } | null)?.name ?? "";
  const message = err instanceof Error ? err.message : String(err ?? "");
  const text = `${name} ${message}`;

  if (/NotAllowedError|Permission|denied|dismissed/i.test(text)) {
    return {
      kind: "denied",
      title: "Camera access is off",
      body: "Your browser blocked the camera for this site. You can turn it back on in your browser or phone settings — or just upload a photo of the barcode instead.",
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
