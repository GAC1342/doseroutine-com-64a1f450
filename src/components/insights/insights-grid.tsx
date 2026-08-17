import { useCallback, useMemo } from "react";
import { useNavigate } from "@tanstack/react-router";
import { InsightCard } from "@/components/insights/insight-card";
import {
  RotationChart,
  SeriesBarChart,
  SupplyBars,
  TrendAreaChart,
  TrendMultiLineChart,
} from "@/components/insights/insight-charts";
import {
  deltaAcross,
  hasData,
  latest,
  total,
} from "@/lib/insights/aggregate";
import type { InsightsData } from "@/lib/insights/data";
import type { InsightWindow } from "@/lib/insights/aggregate";
import { insightUnits } from "@/lib/insights/units";
import { cn } from "@/lib/utils";

export function InsightsGrid({
  data,
  showLinks = true,
  animate = true,
  animationKey,
  days,
}: {
  data: InsightsData;
  showLinks?: boolean;
  animate?: boolean;
  /** Selected time window — carried into drill-down links. */
  days?: InsightWindow;
  /** Change this (e.g. to the selected window) to replay the chart draw-in. */
  animationKey?: string | number;
}) {
  const navigate = useNavigate();
  const u = useMemo(() => insightUnits(data), [data]);
  /** Click a datapoint -> open that metric's detail page for the same window/point. */
  const drillTo = useCallback(
    (slug: string) =>
      showLinks
        ? (label: string) =>
            navigate({
              to: "/insights/$metric",
              params: { metric: slug },
              search: { ...(days ? { days } : {}), at: label },
            })
        : undefined,
    [navigate, showLinks, days],
  );

  const adherenceDelta = useMemo(() => deltaAcross(data.adherence, "avg"), [data.adherence]);
  const dosesDelta = useMemo(() => deltaAcross(data.dosesLogged, "sum"), [data.dosesLogged]);
  const weightDelta = useMemo(() => deltaAcross(data.weight, "avg"), [data.weight]);
  const minutesDelta = useMemo(() => deltaAcross(data.trainingMinutes, "sum"), [data.trainingMinutes]);
  const bodyFatDelta = useMemo(() => deltaAcross(data.bodyFat, "avg"), [data.bodyFat]);

  const adherenceNow = latest(data.adherence);
  const weightNow = latest(data.weight);
  const bodyFatNow = latest(data.bodyFat);
  const bucketWord = data.bucket === "day" ? "day" : "week";

  const bodyData = useMemo(
    () =>
      data.weight.map((p, i) => ({
        label: p.label,
        weight: p.value,
        bodyFat: data.bodyFat[i]?.value ?? null,
      })),
    [data.weight, data.bodyFat],
  );

  return (
    <div
      key={animationKey}
      className={cn(
        "grid gap-3 sm:grid-cols-2 xl:grid-cols-3",
        animationKey != null && "duration-500 animate-fade-in motion-reduce:animate-none",
      )}
    >
      <InsightCard
        title="Adherence"
        headline={u.percent(adherenceNow)}
        caption={`Doses taken on schedule per ${bucketWord}`}
        delta={adherenceDelta}
        deltaGoodWhen="up"
        hasData={hasData(data.adherence)}
        emptyText="Log a few doses and your adherence trend appears here."
        detailTo={showLinks ? "/insights/adherence" : undefined}
        href={showLinks ? "/timeline" : undefined}
        hrefLabel="View timeline"
      >
        <TrendAreaChart
          points={data.adherence}
          name="Adherence"
          valueSuffix="%"
          animate={animate}
          onPointClick={drillTo("adherence")}
        />
      </InsightCard>

      <InsightCard
        title="Doses logged"
        headline={u.count(total(data.dosesLogged))}
        caption={`Confirmed doses this window`}
        delta={dosesDelta}
        deltaGoodWhen="up"
        hasData={hasData(data.dosesLogged)}
        emptyText="Nothing logged in this window yet."
        detailTo={showLinks ? "/insights/doses" : undefined}
        href={showLinks ? "/today" : undefined}
        hrefLabel="Open today"
      >
        <SeriesBarChart
          points={data.dosesLogged}
          name="Doses"
          animate={animate}
          onPointClick={drillTo("doses")}
        />
      </InsightCard>

      <InsightCard
        title="Body weight"
        headline={u.weight(weightNow)}
        caption="From your check-ins"
        delta={weightDelta}
        deltaGoodWhen="down"
        deltaSuffix={u.weightUnit}
        hasData={hasData(data.weight)}
        emptyText="Add a check-in to start your body trend."
        detailTo={showLinks ? "/insights/weight" : undefined}
        href={showLinks ? "/checkins" : undefined}
        hrefLabel="Log a check-in"
      >
        <TrendMultiLineChart
          data={bodyData}
          animate={animate}
          series={[{ key: "weight", label: `Weight (${u.weightUnit})` }]}
          onPointClick={drillTo("weight")}
        />
      </InsightCard>

      <InsightCard
        title="Training volume"
        headline={u.duration(total(data.trainingMinutes))}
        caption={`${u.count(total(data.sessions), "completed session")}`}
        delta={minutesDelta}
        deltaGoodWhen="up"
        hasData={hasData(data.trainingMinutes)}
        emptyText="Log a workout to see your training volume."
        detailTo={showLinks ? "/insights/training" : undefined}
        href={showLinks ? "/fitness" : undefined}
        hrefLabel="Open fitness"
      >
        <SeriesBarChart
          points={data.trainingMinutes}
          name="Minutes"
          animate={animate}
          onPointClick={drillTo("training")}
        />
      </InsightCard>

      <InsightCard
        title="Injection rotation"
        headline={`${data.rotation.sites.length || 0} sites`}
        caption="Spread across sites to avoid overuse"
        hasData={data.rotation.sites.length > 0}
        emptyText="Log an injection site to see your rotation."
        detailTo={showLinks ? "/insights/rotation" : undefined}
        href={showLinks ? "/injection-sites" : undefined}
        hrefLabel="Open site map"
      >
        <RotationChart
          data={data.rotation.data}
          sites={data.rotation.sites}
          animate={animate}
          onPointClick={drillTo("rotation")}
        />
      </InsightCard>

      <InsightCard
        title="Vial supply"
        headline={data.vials.length ? `${u.count(data.vials.length)} tracked` : "—"}
        caption="Doses remaining before you reorder"
        hasData={data.vials.length > 0}
        emptyText="Add doses-per-vial to track your supply."
        detailTo={showLinks ? "/insights/supply" : undefined}
        href={showLinks ? "/costs" : undefined}
        hrefLabel="Manage vials"
      >
        <SupplyBars rows={data.vials} warnBelow={5} />
      </InsightCard>

      <InsightCard
        title="Monthly spend"
        headline={u.money(data.monthlySpendTotal)}
        caption="Estimated from vial price and dose frequency"
        hasData={data.spend.length > 0}
        emptyText="Add vial prices to see your monthly burn."
        detailTo={showLinks ? "/insights/spend" : undefined}
        href={showLinks ? "/costs" : undefined}
        hrefLabel="Open costs"
      >
        <SupplyBars rows={data.spend} />
      </InsightCard>

      <InsightCard
        title="Body fat"
        headline={u.percent(bodyFatNow, 1)}
        caption="From your check-ins"
        delta={bodyFatDelta}
        deltaGoodWhen="down"
        hasData={hasData(data.bodyFat)}
        emptyText="Record body fat in a check-in to track it."
        detailTo={showLinks ? "/insights/body-fat" : undefined}
        href={showLinks ? "/checkins" : undefined}
        hrefLabel="Log a check-in"
      >
        <TrendAreaChart
          points={data.bodyFat}
          name="Body fat"
          valueSuffix="%"
          animate={animate}
          onPointClick={drillTo("body-fat")}
        />
      </InsightCard>
    </div>
  );
}
