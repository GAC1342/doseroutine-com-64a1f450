import { useMemo } from "react";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { formatBytes } from "@/lib/meal-photo-retention";
import { photoWeeklyBuckets, type MealPhotoRow } from "@/lib/use-meal-photos";

const config = {
  count: { label: "Photos", color: "var(--primary)" },
} satisfies ChartConfig;

export function MealPhotoStorageChart({
  photos,
  weeks = 8,
  className = "",
}: {
  photos: MealPhotoRow[];
  weeks?: number;
  className?: string;
}) {
  const data = useMemo(() => photoWeeklyBuckets(photos, new Date(), weeks), [photos, weeks]);
  const added = data.reduce((sum, b) => sum + b.count, 0);
  const latest = data[data.length - 1];

  return (
    <div className={className}>
      <div className="flex items-baseline justify-between gap-2">
        <p className="text-xs font-medium">Storage growth by week</p>
        <p className="text-[11px] text-muted-foreground">
          {added} photo{added === 1 ? "" : "s"} · {formatBytes(latest?.cumulativeBytes ?? 0)} in{" "}
          {weeks} weeks
        </p>
      </div>

      {added === 0 ? (
        <p className="mt-2 text-[11px] text-muted-foreground">
          No photos logged in the last {weeks} weeks — storage isn&apos;t growing right now.
        </p>
      ) : (
        <>
          <ChartContainer config={config} className="mt-2 aspect-[16/9] w-full">
            <BarChart data={data} margin={{ top: 8, right: 4, bottom: 0, left: -20 }}>
              <CartesianGrid vertical={false} strokeDasharray="3 3" />
              <XAxis
                dataKey="label"
                tickLine={false}
                axisLine={false}
                tick={{ fontSize: 10 }}
                minTickGap={8}
              />
              <YAxis
                allowDecimals={false}
                tickLine={false}
                axisLine={false}
                tick={{ fontSize: 10 }}
                width={32}
              />
              <ChartTooltip
                content={
                  <ChartTooltipContent
                    labelKey="label"
                    nameKey="count"
                    formatter={(value) => (
                      <span>
                        {Number(value)} photo{Number(value) === 1 ? "" : "s"} ·{" "}
                        {formatBytes(Number(value) * 180_000)}
                      </span>
                    )}
                  />
                }
              />
              <Bar dataKey="count" fill="var(--color-count)" radius={[4, 4, 0, 0]} maxBarSize={28} />
            </BarChart>
          </ChartContainer>

          {/* Text equivalent — bars alone are not announceable. */}
          <ul className="sr-only">
            {data.map((b) => (
              <li key={b.weekStart}>
                Week of {b.label}: {b.count} photos, about {formatBytes(b.approxBytes)}, running
                total {formatBytes(b.cumulativeBytes)}
              </li>
            ))}
          </ul>

          <p className="mt-1 text-[11px] text-muted-foreground">
            Sizes are estimated at about 180 KB per photo.
          </p>
        </>
      )}
    </div>
  );
}
