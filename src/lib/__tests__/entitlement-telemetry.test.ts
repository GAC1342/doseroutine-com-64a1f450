/**
 * Entitlement telemetry must be unbreakable: it runs on the exact code path
 * that decides whether a paying customer keeps access. These tests pin two
 * guarantees:
 *   1. it never throws, no matter how hostile the input or the Sentry SDK, and
 *   2. every signal carries the expected breadcrumb/context/tag fields,
 *      including a stable correlation id.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

const addSentryBreadcrumb = vi.fn();
const captureToSentry = vi.fn();
const setSentryContext = vi.fn();

vi.mock("@/lib/sentry", () => ({
  addSentryBreadcrumb: (...args: unknown[]) => addSentryBreadcrumb(...args),
  captureToSentry: (...args: unknown[]) => captureToSentry(...args),
  setSentryContext: (...args: unknown[]) => setSentryContext(...args),
}));

import {
  ENTITLEMENT_CORRELATION_TAG,
  ensureEntitlementCorrelationId,
  newEntitlementCorrelationId,
  reportEntitlementFailure,
  traceEntitlementResolution,
} from "@/lib/entitlement-telemetry";

type Crumb = { category: string; level: string; message: string; data: Record<string, unknown> };

function lastCrumb(): Crumb {
  return addSentryBreadcrumb.mock.calls.at(-1)?.[0] as Crumb;
}

beforeEach(() => {
  addSentryBreadcrumb.mockReset();
  captureToSentry.mockReset();
  setSentryContext.mockReset();
  (window as unknown as { __entitlementTrace?: unknown[] }).__entitlementTrace = [];
});

describe("correlation ids", () => {
  it("mints unique, log-safe ids", () => {
    const ids = new Set(Array.from({ length: 200 }, () => newEntitlementCorrelationId()));
    expect(ids.size).toBe(200);
    for (const id of ids) {
      expect(id).toMatch(/^ent_[0-9a-f]{26}$/);
    }
  });

  it("reuses a valid upstream id and rejects unsafe ones", () => {
    expect(ensureEntitlementCorrelationId("ent_abc-123.XY")).toBe("ent_abc-123.XY");
    expect(ensureEntitlementCorrelationId("  ent_trimmed  ")).toBe("ent_trimmed");

    for (const bad of [
      "",
      "   ",
      null,
      undefined,
      "has spaces",
      "inject\nnewline",
      "x".repeat(65),
      "<script>",
    ]) {
      expect(ensureEntitlementCorrelationId(bad as string | null)).toMatch(/^ent_[0-9a-f]{26}$/);
    }
  });

  it("never throws on non-string input", () => {
    for (const weird of [123, {}, [], true, Symbol("s")]) {
      expect(() => ensureEntitlementCorrelationId(weird as unknown as string)).not.toThrow();
    }
  });
});

describe("reportEntitlementFailure", () => {
  it("attaches context, breadcrumb, event and alertable tags", () => {
    const error = new Error("network down");
    const id = reportEntitlementFailure(
      {
        resolver: "client:useAccess",
        source: "subscription",
        userId: "user-1",
        outcome: "unresolved-retry-offered",
        correlationId: "ent_fixed",
        detail: { online: false },
      },
      error,
    );

    expect(id).toBe("ent_fixed");

    const [contextKey, context] = setSentryContext.mock.calls[0] as [
      string,
      Record<string, unknown>,
    ];
    expect(contextKey).toBe("entitlement");
    expect(context).toMatchObject({
      resolver: "client:useAccess",
      source: "subscription",
      userId: "user-1",
      outcome: "unresolved-retry-offered",
      correlationId: "ent_fixed",
      detail: { online: false },
      error: { name: "Error", message: "network down" },
    });
    expect(typeof context.at).toBe("string");

    const crumb = lastCrumb();
    expect(crumb.category).toBe("entitlement");
    expect(crumb.level).toBe("error");
    expect(crumb.message).toContain("ent_fixed");
    expect(crumb.data).toMatchObject({ correlationId: "ent_fixed" });

    const [captured, extra, options] = captureToSentry.mock.calls[0] as [
      Error,
      Record<string, unknown>,
      { tags: Record<string, string>; fingerprint: string[] },
    ];
    expect(captured).toBe(error);
    expect(extra).toMatchObject({ correlationId: "ent_fixed" });
    expect(options.tags).toEqual({
      [ENTITLEMENT_CORRELATION_TAG]: "ent_fixed",
      entitlement_resolver: "client:useAccess",
      entitlement_source: "subscription",
      entitlement_outcome: "unresolved-retry-offered",
      entitlement_error: "Error",
    });
    expect(options.fingerprint).toEqual(["entitlement-failure", "client:useAccess", "Error"]);
  });

  it("tags the error class so spike alerts can key on EntitlementUnavailableError", () => {
    class EntitlementUnavailableError extends Error {
      constructor() {
        super("nope");
        this.name = "EntitlementUnavailableError";
      }
    }
    reportEntitlementFailure(
      { resolver: "server:resolveFullAccess", source: "both", outcome: "throw" },
      new EntitlementUnavailableError(),
    );
    const options = captureToSentry.mock.calls[0]?.[2] as { tags: Record<string, string> };
    expect(options.tags.entitlement_error).toBe("EntitlementUnavailableError");
  });

  it("mints an id when none is supplied and returns it", () => {
    const id = reportEntitlementFailure({
      resolver: "client:useAccess",
      source: "profile",
      outcome: "denied",
    });
    expect(id).toMatch(/^ent_[0-9a-f]{26}$/);
    expect(lastCrumb().message).toContain(id);
  });

  it("serialises non-Error failures without throwing", () => {
    for (const thrown of [
      undefined,
      null,
      "string failure",
      42,
      { message: "supabase said no", code: "PGRST301", status: 503 },
      { nested: { deep: true } },
    ]) {
      expect(() =>
        reportEntitlementFailure(
          { resolver: "client:useAccess", source: "both", outcome: "throw" },
          thrown,
        ),
      ).not.toThrow();
    }
    const extra = captureToSentry.mock.calls.at(-1)?.[1] as Record<string, unknown>;
    expect(extra).toHaveProperty("error");
  });

  it("never throws when the Sentry SDK itself blows up", () => {
    setSentryContext.mockImplementation(() => {
      throw new Error("sentry exploded");
    });
    addSentryBreadcrumb.mockImplementation(() => {
      throw new Error("sentry exploded");
    });
    captureToSentry.mockImplementation(() => {
      throw new Error("sentry exploded");
    });

    expect(() =>
      reportEntitlementFailure(
        { resolver: "client:useAccess", source: "both", outcome: "throw" },
        new Error("boom"),
      ),
    ).not.toThrow();
  });

  it("never throws on a malformed info object", () => {
    expect(() =>
      reportEntitlementFailure({} as unknown as Parameters<typeof reportEntitlementFailure>[0]),
    ).not.toThrow();
    expect(() =>
      reportEntitlementFailure(null as unknown as Parameters<typeof reportEntitlementFailure>[0]),
    ).not.toThrow();
  });

  it("records a bounded diagnostic trace on window", () => {
    for (let i = 0; i < 30; i += 1) {
      reportEntitlementFailure({
        resolver: "client:useAccess",
        source: "both",
        outcome: "denied",
        correlationId: `ent_${i}`,
      });
    }
    const trace = (window as unknown as { __entitlementTrace: { correlationId: string }[] })
      .__entitlementTrace;
    expect(trace.length).toBe(20);
    expect(trace.at(-1)?.correlationId).toBe("ent_29");
  });
});

describe("traceEntitlementResolution", () => {
  it("writes an info breadcrumb for granted and warning otherwise", () => {
    const granted = traceEntitlementResolution({
      resolver: "client:useAccess",
      outcome: "granted",
      correlationId: "ent_ok",
      detail: { subscriptionActive: true },
    });
    expect(granted).toBe("ent_ok");
    expect(lastCrumb()).toMatchObject({
      category: "entitlement",
      level: "info",
      data: { correlationId: "ent_ok", resolver: "client:useAccess", subscriptionActive: true },
    });
    expect(lastCrumb().message).toContain("ent_ok");

    traceEntitlementResolution({ resolver: "client:useAccess", outcome: "denied" });
    expect(lastCrumb().level).toBe("warning");

    traceEntitlementResolution({ resolver: "server:resolveFullAccess", outcome: "unresolved" });
    expect(lastCrumb().level).toBe("warning");
  });

  it("does not capture an event for successful resolutions", () => {
    traceEntitlementResolution({ resolver: "client:useAccess", outcome: "granted" });
    expect(captureToSentry).not.toHaveBeenCalled();
  });

  it("never throws when Sentry breadcrumbs fail or input is malformed", () => {
    addSentryBreadcrumb.mockImplementation(() => {
      throw new Error("sentry exploded");
    });
    expect(() =>
      traceEntitlementResolution({ resolver: "client:useAccess", outcome: "granted" }),
    ).not.toThrow();
    expect(() =>
      traceEntitlementResolution(
        undefined as unknown as Parameters<typeof traceEntitlementResolution>[0],
      ),
    ).not.toThrow();
  });
});
