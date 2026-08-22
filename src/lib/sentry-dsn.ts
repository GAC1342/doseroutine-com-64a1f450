/**
 * DSN resolution for crash reporting.
 *
 * A Sentry DSN is a public, write-only ingest key — it can only send events,
 * never read them — so baking it into the shipped bundle is expected practice
 * and is what Sentry's own Capacitor docs do.
 *
 * Why the baked fallback exists: a store binary is built once and can't be
 * fixed after review starts. If `VITE_SENTRY_DSN` is ever missing from the CI
 * environment, or the runtime config request fails on a cold/offline first
 * launch, we would ship a binary that reports nothing at exactly the moment we
 * need the data. The fallback guarantees native production builds always have
 * a working DSN.
 *
 * It intentionally does NOT apply to web dev/preview builds — those stay silent
 * unless a DSN is configured explicitly.
 */

/** Baked, publishable ingest key for the DoseRoutine Sentry project. */
export const FALLBACK_SENTRY_DSN =
  "https://0e13e544c445aca31084e49da84e3926@o4511943057145856.ingest.us.sentry.io/4511943069663232";

export function isValidSentryDsn(dsn: string | null | undefined): boolean {
  if (!dsn) return false;
  return /^https:\/\/[^@\s]+@[^/\s]*sentry\.io\/\d+$/.test(dsn.trim());
}

/**
 * Pick the DSN to initialise with.
 *
 * Order: build-time env → cached/runtime value → baked fallback (native or
 * production only). Returns `null` when nothing usable is available.
 */
export function resolveSentryDsn(opts: {
  buildTimeDsn?: string | null;
  runtimeDsn?: string | null;
  native: boolean;
  production: boolean;
}): string | null {
  const build = opts.buildTimeDsn?.trim();
  if (isValidSentryDsn(build)) return build!.trim();
  const runtime = opts.runtimeDsn?.trim();
  if (isValidSentryDsn(runtime)) return runtime!.trim();
  if (opts.native || opts.production) return FALLBACK_SENTRY_DSN;
  return null;
}
