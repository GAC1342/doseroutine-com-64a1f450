/**
 * CSP violation collector.
 *
 * Browsers POST here (via `report-uri` / `report-to`, see
 * src/lib/security-headers.ts) whenever the Content-Security-Policy blocks
 * something in real user traffic. That is the only way to notice a policy
 * regression like the platform-injected `/~flock.js` being blocked — synthetic
 * checks run one browser on one page and miss it.
 *
 * Public by design: the endpoint must be reachable without auth because the
 * browser sends the report itself. It is therefore strictly write-only,
 * unauthenticated, rate-limited by payload size, and returns no data.
 */
import { createFileRoute } from "@tanstack/react-router";

import { isFirstPartyScriptBlock, isNoiseReport, parseCspReports } from "@/lib/csp-report";

/** Reports are tiny; anything larger is abuse, not a browser. */
const MAX_BODY_BYTES = 16 * 1024;

const ACCEPTED_CONTENT_TYPES = [
  "application/csp-report",
  "application/reports+json",
  "application/json",
  "text/plain",
];

export const Route = createFileRoute("/api/public/csp-report")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const contentType = (request.headers.get("content-type") ?? "").toLowerCase();
        if (contentType && !ACCEPTED_CONTENT_TYPES.some((t) => contentType.includes(t))) {
          return new Response(null, { status: 415 });
        }

        const declaredLength = Number(request.headers.get("content-length") ?? "0");
        if (Number.isFinite(declaredLength) && declaredLength > MAX_BODY_BYTES) {
          return new Response(null, { status: 413 });
        }

        let raw: string;
        try {
          raw = await request.text();
        } catch {
          return new Response(null, { status: 204 });
        }
        if (raw.length > MAX_BODY_BYTES) return new Response(null, { status: 413 });

        let payload: unknown;
        try {
          payload = JSON.parse(raw);
        } catch {
          return new Response(null, { status: 204 });
        }

        const origin = new URL(request.url).origin;
        for (const report of parseCspReports(payload)) {
          if (isNoiseReport(report)) continue;
          // One structured line per violation so the log drain can count them.
          // `severity: critical` marks a first-party script being blocked —
          // that means real users are running a broken page right now.
          console.warn(
            JSON.stringify({
              event: "csp_violation",
              severity: isFirstPartyScriptBlock(report, origin) ? "critical" : "info",
              userAgent: (request.headers.get("user-agent") ?? "").slice(0, 200),
              ...report,
            }),
          );
        }

        // 204: browsers ignore the body, and an empty response keeps this the
        // cheapest possible endpoint under a report storm.
        return new Response(null, { status: 204 });
      },
    },
  },
});
