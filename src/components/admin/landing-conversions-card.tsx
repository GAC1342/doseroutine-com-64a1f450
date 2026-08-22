import { useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { LayoutList } from "lucide-react";
import { Card } from "@/components/ui/card";
import { DEVICE_LABELS, type DeviceKind } from "@/lib/bot-sessions";
import { getLandingConversions, type LandingWindow } from "@/lib/landing-conversions.functions";

const DEVICE_FILTERS: { key: "all" | DeviceKind; label: string }[] = [
  { key: "all", label: "All devices" },
  { key: "mobile", label: "Mobile" },
  { key: "tablet", label: "Tablet" },
  { key: "desktop", label: "Desktop" },
];

function pct(n: number) {
  return `${(n * 100).toFixed(0)}%`;
}

/**
 * Admin report: bounce rate and "save this result" / sign-up conversions split
 * by the page a visitor landed on and the device they used.
 */
export function LandingConversionsCard({
  enabled,
  window: win,
}: {
  enabled: boolean;
  window: LandingWindow;
}) {
  const [device, setDevice] = useState<"all" | DeviceKind>("all");
  const fetchRows = useServerFn(getLandingConversions);

  const { data, isLoading, error } = useQuery({
    queryKey: ["landing-conversions", win],
    queryFn: () => fetchRows({ data: { window: win } }),
    staleTime: 60_000,
    enabled,
  });

  const rows = useMemo(() => {
    const all = data?.byLanding ?? [];
    if (device === "all") {
      // Merge the per-device rows back into one row per landing page.
      const merged = new Map<
        string,
        {
          path: string;
          sessions: number;
          bounced: number;
          saveGateShown: number;
          saveGateClicks: number;
          signups: number;
        }
      >();
      for (const r of all) {
        const cur = merged.get(r.path) ?? {
          path: r.path,
          sessions: 0,
          bounced: 0,
          saveGateShown: 0,
          saveGateClicks: 0,
          signups: 0,
        };
        cur.sessions += r.sessions;
        cur.bounced += r.bounced;
        cur.saveGateShown += r.saveGateShown;
        cur.saveGateClicks += r.saveGateClicks;
        cur.signups += r.signups;
        merged.set(r.path, cur);
      }
      return Array.from(merged.values())
        .map((r) => ({
          ...r,
          bounceRate: r.sessions > 0 ? r.bounced / r.sessions : 0,
          saveGateClickRate: r.saveGateShown > 0 ? r.saveGateClicks / r.saveGateShown : 0,
        }))
        .sort((a, b) => b.sessions - a.sessions)
        .slice(0, 20);
    }
    return all.filter((r) => r.device === device).slice(0, 20);
  }, [data, device]);

  return (
    <Card className="mt-6 rounded-2xl border-border p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="flex items-center gap-2 font-display text-lg font-semibold">
            <LayoutList className="h-4 w-4 text-primary" /> Landing page & device conversions
          </h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Where visitors arrive, how many leave without a second page, and how many reach the
            “save this result” prompt or create an account.
          </p>
        </div>
        <div
          role="tablist"
          aria-label="Device filter"
          className="inline-flex rounded-full border border-border bg-surface-track p-1 text-xs"
        >
          {DEVICE_FILTERS.map((d) => (
            <button
              key={d.key}
              type="button"
              role="tab"
              aria-selected={device === d.key}
              onClick={() => setDevice(d.key)}
              className={`rounded-full px-3 py-1 font-medium transition ${
                device === d.key
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground"
              }`}
            >
              {d.label}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <p className="mt-3 rounded-lg bg-destructive/10 p-3 text-xs text-destructive">
          {(error as Error).message}
        </p>
      )}

      {isLoading ? (
        <p className="mt-4 text-sm text-muted-foreground">Loading…</p>
      ) : rows.length === 0 ? (
        <p className="mt-4 text-sm text-muted-foreground">
          No human sessions recorded for this window and device.
        </p>
      ) : (
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr className="text-left text-xs text-muted-foreground">
                <th className="pb-2 font-medium">Landing page</th>
                <th className="pb-2 text-right font-medium">Sessions</th>
                <th className="pb-2 text-right font-medium">Bounce</th>
                <th className="pb-2 text-right font-medium">Save prompt</th>
                <th className="pb-2 text-right font-medium">Save clicks</th>
                <th className="pb-2 text-right font-medium">Signups</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.path} className="border-t border-border">
                  <td className="max-w-[280px] truncate py-2 text-foreground" title={r.path}>
                    {r.path}
                  </td>
                  <td className="py-2 text-right tabular-nums text-muted-foreground">
                    {r.sessions}
                  </td>
                  <td className="py-2 text-right tabular-nums text-muted-foreground">
                    {pct(r.bounceRate)}
                  </td>
                  <td className="py-2 text-right tabular-nums text-muted-foreground">
                    {r.saveGateShown}
                  </td>
                  <td className="py-2 text-right tabular-nums text-muted-foreground">
                    {r.saveGateClicks}
                    {r.saveGateShown > 0 && (
                      <span className="ml-1 text-[11px]">({pct(r.saveGateClickRate)})</span>
                    )}
                  </td>
                  <td className="py-2 text-right tabular-nums text-foreground">{r.signups}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {data && data.byDevice.length > 0 && (
        <>
          <h3 className="mt-6 text-sm font-semibold text-foreground">Rolled up by device</h3>
          <div className="mt-2 overflow-x-auto">
            <table className="w-full min-w-[560px] text-sm">
              <thead>
                <tr className="text-left text-xs text-muted-foreground">
                  <th className="pb-2 font-medium">Device</th>
                  <th className="pb-2 text-right font-medium">Sessions</th>
                  <th className="pb-2 text-right font-medium">Bounce</th>
                  <th className="pb-2 text-right font-medium">Save prompt</th>
                  <th className="pb-2 text-right font-medium">Save clicks</th>
                  <th className="pb-2 text-right font-medium">Signups</th>
                </tr>
              </thead>
              <tbody>
                {data.byDevice.map((d) => (
                  <tr key={d.device} className="border-t border-border">
                    <td className="py-2 text-foreground">{DEVICE_LABELS[d.device]}</td>
                    <td className="py-2 text-right tabular-nums text-muted-foreground">
                      {d.sessions}
                    </td>
                    <td className="py-2 text-right tabular-nums text-muted-foreground">
                      {pct(d.bounceRate)}
                    </td>
                    <td className="py-2 text-right tabular-nums text-muted-foreground">
                      {d.saveGateShown}
                    </td>
                    <td className="py-2 text-right tabular-nums text-muted-foreground">
                      {d.saveGateClicks}
                    </td>
                    <td className="py-2 text-right tabular-nums text-foreground">{d.signups}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      <p className="mt-4 text-[11px] text-muted-foreground">
        Landing page = the first page of the session. Bounce = the session never reached a second
        page. Bots and crawlers are excluded using the same rules as the traffic numbers above.
      </p>
    </Card>
  );
}
