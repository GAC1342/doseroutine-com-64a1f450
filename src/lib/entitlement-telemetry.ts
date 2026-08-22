/**
 * Shared diagnostics for subscription entitlement resolution.
 *
 * Entitlement bugs are the worst class of bug we can ship: a paying user who
 * gets locked out churns immediately and rarely tells us. These helpers make
 * every failed or ambiguous entitlement check show up in Sentry with enough
 * context (which resolver, which source failed, what the check concluded) to
 * diagnose from a single event, without a reproduction.
 *
 * Every signal carries a **correlation id**. One id is minted per entitlement
 * attempt and threaded through the client resolver, the server resolver, the
 * breadcrumb trail and the structured server log, so a single lockout can be
 * traced end-to-end by searching one string.
 *
 * Isomorphic: in the browser it writes Sentry breadcrumbs/context; on the
 * server (Worker runtime, no Sentry SDK) it emits a single structured log line
 * that our log drain picks up.
 */
import { addSentryBreadcrumb, captureToSentry, setSentryContext } from "@/lib/sentry";

/** Which resolver produced the signal. */
export type EntitlementResolver = "client:useAccess" | "server:resolveFullAccess";

export type EntitlementSource = "profile" | "subscription" | "both";

/** Sentry tag + log field name for the trace id. Keep in sync with alert rules. */
export const ENTITLEMENT_CORRELATION_TAG = "entitlement_correlation_id";

/** Header used to carry a client-minted correlation id to server functions. */
export const ENTITLEMENT_CORRELATION_HEADER = "x-entitlement-correlation-id";

/**
 * Mint a correlation id. Format `ent_<26 hex chars>` — recognisable in logs,
 * short enough to paste into a Sentry search, and free of anything user
 * identifying. Falls back to Math.random on runtimes without WebCrypto.
 */
export function newEntitlementCorrelationId(): string {
  const bytes = new Uint8Array(13);
  const cryptoObj = (globalThis as { crypto?: Crypto }).crypto;
  if (cryptoObj?.getRandomValues) {
    cryptoObj.getRandomValues(bytes);
  } else {
    for (let i = 0; i < bytes.length; i += 1) bytes[i] = Math.floor(Math.random() * 256);
  }
  let out = "";
  for (const b of bytes) out += b.toString(16).padStart(2, "0");
  return `ent_${out}`;
}

/** Accepts an id from upstream, or mints one when absent/blank. */
export function ensureEntitlementCorrelationId(candidate?: string | null): string {
  const trimmed = typeof candidate === "string" ? candidate.trim() : "";
  // Never trust an arbitrary-length string into a log line / Sentry tag.
  if (trimmed && trimmed.length <= 64 && /^[A-Za-z0-9._-]+$/.test(trimmed)) return trimmed;
  return newEntitlementCorrelationId();
}

export type EntitlementFailureInfo = {
  resolver: EntitlementResolver;
  /** Which underlying read failed. */
  source: EntitlementSource;
  /** Anonymous-safe identifiers only. */
  userId?: string | null;
  /** What the resolver decided to do about the failure. */
  outcome: "unresolved-retry-offered" | "denied" | "granted" | "throw";
  /** Trace id shared with every other signal for the same attempt. */
  correlationId?: string | null;
  /** Extra non-PII detail (status codes, flags, timings). */
  detail?: Record<string, unknown>;
};

function serializeError(error: unknown): Record<string, unknown> {
  if (error instanceof Error) {
    return { name: error.name, message: error.message };
  }
  if (error && typeof error === "object") {
    const e = error as { message?: unknown; code?: unknown; status?: unknown; details?: unknown };
    return {
      message: typeof e.message === "string" ? e.message : String(error),
      code: e.code ?? null,
      status: e.status ?? null,
      details: typeof e.details === "string" ? e.details : null,
    };
  }
  return { message: error == null ? "unknown" : String(error) };
}

const isBrowser = typeof window !== "undefined";

/**
 * Bounded in-page ring of the correlation ids seen this session. Purely
 * diagnostic (no PII) and read by the e2e entitlement tests to prove the id in
 * the breadcrumb is the same one the resolver used.
 */
const TRACE_RING_LIMIT = 20;

function pushTrace(entry: { correlationId: string; resolver: string; outcome: string }): void {
  if (!isBrowser) return;
  const w = window as unknown as { __entitlementTrace?: unknown[] };
  if (!Array.isArray(w.__entitlementTrace)) w.__entitlementTrace = [];
  w.__entitlementTrace.push({ ...entry, at: Date.now() });
  if (w.__entitlementTrace.length > TRACE_RING_LIMIT) w.__entitlementTrace.shift();
}

/**
 * Record an entitlement check failure. Never throws — telemetry must not be
 * able to break the very path that decides whether someone keeps access.
 *
 * @returns the correlation id used (minted when the caller didn't supply one).
 */
export function reportEntitlementFailure(info: EntitlementFailureInfo, error?: unknown): string {
  let correlationId: string;
  try {
    correlationId = ensureEntitlementCorrelationId(info.correlationId);
  } catch {
    correlationId = "ent_unknown";
  }

  try {
    const payload = {
      ...info,
      userId: info.userId ?? null,
      correlationId,
      error: error === undefined ? null : serializeError(error),
      at: new Date().toISOString(),
    };

    const errorName = error instanceof Error ? error.name : "EntitlementCheckFailed";
    const tags: Record<string, string> = {
      [ENTITLEMENT_CORRELATION_TAG]: correlationId,
      entitlement_resolver: info.resolver,
      entitlement_source: info.source,
      entitlement_outcome: info.outcome,
      entitlement_error: errorName,
    };

    pushTrace({ correlationId, resolver: info.resolver, outcome: info.outcome });

    if (isBrowser) {
      setSentryContext("entitlement", payload);
      addSentryBreadcrumb({
        category: "entitlement",
        level: "error",
        message: `${info.resolver} failed (${info.source}) → ${info.outcome} [${correlationId}]`,
        data: payload,
      });
      // A failed entitlement read that leaves a paying user in limbo is worth
      // an event, not just a breadcrumb on some later crash. The fingerprint
      // groups every occurrence into one issue so a spike alert can fire on it.
      captureToSentry(
        error instanceof Error
          ? error
          : new Error(`Entitlement check failed: ${info.resolver}/${info.source}`),
        payload,
        { tags, fingerprint: ["entitlement-failure", info.resolver, errorName] },
      );
    } else {
      console.error(
        "[entitlement] check failed",
        JSON.stringify({ ...payload, tags, event: "entitlement_failure" }),
      );
    }
  } catch {
    /* telemetry must never throw */
  }

  return correlationId;
}

/**
 * Record a *successful* resolution as a breadcrumb only. These are the frames
 * that make a later lockout report readable ("granted, granted, unresolved").
 *
 * @returns the correlation id used.
 */
export function traceEntitlementResolution(info: {
  resolver: EntitlementResolver;
  outcome: "granted" | "denied" | "unresolved";
  correlationId?: string | null;
  detail?: Record<string, unknown>;
}): string {
  let correlationId: string;
  try {
    correlationId = ensureEntitlementCorrelationId(info.correlationId);
  } catch {
    correlationId = "ent_unknown";
  }

  try {
    pushTrace({ correlationId, resolver: info.resolver, outcome: info.outcome });
    if (isBrowser) {
      addSentryBreadcrumb({
        category: "entitlement",
        level: info.outcome === "granted" ? "info" : "warning",
        message: `${info.resolver} → ${info.outcome} [${correlationId}]`,
        data: { ...(info.detail ?? {}), correlationId, resolver: info.resolver },
      });
    }
  } catch {
    /* telemetry must never throw */
  }

  return correlationId;
}
