import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { CartesianGrid, Line, LineChart, XAxis, YAxis } from "recharts";
import { ArrowDown, ArrowUp, ChevronRight, Download, ExternalLink, Minus } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import {
  filterQueryRows,
  queryRowsToCsv,
  sortQueryRows,
  type DailyPoint,
  type QuerySortKey,
} from "@/lib/blog-post-search-detail";
import {
  getBlogPostSearchDetail,
  getBlogQueryTrend,
} from "@/lib/blog-post-search-detail.functions";

const CHART_CONFIG = {
  impressions: { label: "Impressions", color: "hsl(var(--chart-1))" },
  clicks: { label: "Clicks", color: "hsl(var(--chart-2))" },
  position: { label: "Avg position", color: "hsl(var(--chart-3))" },
} as const;

function pct(v: number): string {
  return `${(v * 100).toFixed(1)}%`;
}

function Delta({ value, invert = false }: { value: number | null; invert?: boolean }) {
  if (value === null || value === 0) {
    return (
      <span className="inline-flex items-center gap-0.5 text-xs text-muted-foreground">
        <Minus className="size-3" />0
      </span>
    );
  }
  const good = invert ? value < 0 : value > 0;
  const Icon = value > 0 ? ArrowUp : ArrowDown;
  return (
    <span
      className={`inline-flex items-center gap-0.5 text-xs ${good ? "text-primary" : "text-destructive"}`}
    >
      <Icon className="size-3" />
      {Math.abs(value) < 1 ? Math.abs(value).toFixed(1) : Math.round(Math.abs(value))}
    </span>
  );
}

function TrendChart({ daily, height = 220 }: { daily: DailyPoint[]; height?: number }) {
  if (daily.length < 2) {
    return (
      <p className="text-xs text-muted-foreground">
        Not enough daily data yet to draw a trend for this window.
      </p>
    );
  }
  return (
    <ChartContainer config={CHART_CONFIG} className="w-full" style={{ height }}>
      <LineChart data={daily} margin={{ left: 4, right: 8, top: 8, bottom: 0 }}>
        <CartesianGrid vertical={false} strokeDasharray="3 3" />
        <XAxis
          dataKey="date"
          tickLine={false}
          axisLine={false}
          tickMargin={8}
          minTickGap={24}
          tickFormatter={(v: string) => v.slice(5)}
        />
        <YAxis yAxisId="count" tickLine={false} axisLine={false} width={34} />
        <YAxis
          yAxisId="position"
          orientation="right"
          reversed
          tickLine={false}
          axisLine={false}
          width={30}
        />
        <ChartTooltip content={<ChartTooltipContent />} />
        <Line
          yAxisId="count"
          type="monotone"
          dataKey="impressions"
          stroke="var(--color-impressions)"
          strokeWidth={2}
          dot={false}
        />
        <Line
          yAxisId="count"
          type="monotone"
          dataKey="clicks"
          stroke="var(--color-clicks)"
          strokeWidth={2}
          dot={false}
        />
        <Line
          yAxisId="position"
          type="monotone"
          dataKey="position"
          stroke="var(--color-position)"
          strokeWidth={2}
          strokeDasharray="4 3"
          dot={false}
        />
      </LineChart>
    </ChartContainer>
  );
}

function QueryTrendRow({
  slug,
  query,
  days,
}: {
  slug: string;
  query: string;
  days: number;
}) {
  const fetchTrend = useServerFn(getBlogQueryTrend);
  const { data, isFetching } = useQuery({
    queryKey: ["admin", "blog-seo", "query-trend", slug, query, days],
    queryFn: () => fetchTrend({ data: { slug, query, days } }),
    staleTime: 300_000,
  });

  if (isFetching && !data) {
    return <p className="text-xs text-muted-foreground">Loading daily history…</p>;
  }
  if (data?.error) {
    return <p className="text-xs text-destructive">{data.error}</p>;
  }
  return <TrendChart daily={data?.daily ?? []} height={170} />;
}

type SortState = { key: QuerySortKey; direction: "asc" | "desc" };

const COLUMNS: Array<{ key: QuerySortKey; label: string; numeric: boolean }> = [
  { key: "query", label: "Query", numeric: false },
  { key: "impressions", label: "Impr.", numeric: true },
  { key: "clicks", label: "Clicks", numeric: true },
  { key: "ctr", label: "CTR", numeric: true },
  { key: "position", label: "Position", numeric: true },
];

export function BlogPostSearchDetailSheet({
  slug,
  title,
  days,
  open,
  onOpenChange,
}: {
  slug: string | null;
  title: string;
  days: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<SortState>({ key: "impressions", direction: "desc" });
  const [expanded, setExpanded] = useState<string | null>(null);
  const fetchDetail = useServerFn(getBlogPostSearchDetail);

  const { data, isFetching, error } = useQuery({
    queryKey: ["admin", "blog-seo", "detail", slug, days],
    queryFn: () => fetchDetail({ data: { slug: slug as string, days } }),
    enabled: open && Boolean(slug),
    staleTime: 300_000,
  });

  const rows = useMemo(() => {
    const all = data?.queries ?? [];
    return sortQueryRows(filterQueryRows(all, search), sort.key, sort.direction);
  }, [data?.queries, search, sort]);

  function toggleSort(key: QuerySortKey) {
    setSort((prev) =>
      prev.key === key
        ? { key, direction: prev.direction === "desc" ? "asc" : "desc" }
        : { key, direction: key === "query" || key === "position" ? "asc" : "desc" },
    );
  }

  function downloadCsv() {
    const blob = new Blob([queryRowsToCsv(rows)], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${slug}-queries-${days}d.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-3xl">
        <SheetHeader className="space-y-1 text-left">
          <SheetTitle className="pr-8 text-base">{title}</SheetTitle>
          <SheetDescription className="flex flex-wrap items-center gap-2 text-xs">
            <a
              href={data?.url ?? `https://doseroutine.com/blog/${slug}`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 hover:underline"
              aria-label={`Open the live post ${title} in a new tab`}
            >
              /blog/{slug}
              <ExternalLink className="size-3" />
            </a>
            {data?.period && (
              <span>
                {data.period.startDate} → {data.period.endDate} (vs {data.previous.startDate} →{" "}
                {data.previous.endDate})
              </span>
            )}
          </SheetDescription>
        </SheetHeader>

        <div className="mt-4 space-y-5">
          {error && (
            <p className="text-sm text-destructive">
              Couldn’t load this post: {(error as Error).message}
            </p>
          )}
          {data && !data.connected && <p className="text-sm text-muted-foreground">{data.error}</p>}
          {data?.connected && data.error && <p className="text-sm text-destructive">{data.error}</p>}
          {isFetching && !data && <p className="text-sm text-muted-foreground">Loading…</p>}

          {data?.totals && (
            <Card className="grid grid-cols-2 gap-3 p-4 text-sm sm:grid-cols-5">
              <Stat label="Impressions" value={String(data.totals.impressions)} />
              <Stat label="Clicks" value={String(data.totals.clicks)} />
              <Stat label="CTR" value={pct(data.totals.ctr)} />
              <Stat
                label="Avg position"
                value={data.totals.position ? data.totals.position.toFixed(1) : "—"}
              />
              <Stat label="Queries" value={String(data.totals.queries)} />
            </Card>
          )}

          {data && data.totals.impressions === 0 ? (
            <p className="text-sm text-muted-foreground">
              Search Console reports no impressions for this post in this window, so there are no
              queries to list yet. Try a longer period, or check that the post is indexed.
            </p>
          ) : (
            data && (
              <>
                <section className="space-y-2">
                  <h3 className="text-sm font-semibold">Daily trend</h3>
                  <TrendChart daily={data.daily} />
                </section>

                <section className="space-y-2">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h3 className="text-sm font-semibold">
                      All queries ({data.totals.queries})
                    </h3>
                    <div className="flex items-center gap-2">
                      <Input
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Filter queries"
                        aria-label="Filter the query list for this post"
                        className="h-8 w-40 sm:w-56"
                      />
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={downloadCsv}
                        aria-label={`Download the query list for ${title} as CSV`}
                      >
                        <Download className="mr-1 size-3.5" />
                        CSV
                      </Button>
                    </div>
                  </div>

                  <div className="overflow-x-auto rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-8" />
                          {COLUMNS.map((col) => (
                            <TableHead
                              key={col.key}
                              className={col.numeric ? "text-right" : undefined}
                            >
                              <button
                                type="button"
                                onClick={() => toggleSort(col.key)}
                                className="inline-flex items-center gap-1 hover:underline"
                                aria-label={`Sort queries by ${col.label}`}
                              >
                                {col.label}
                                {sort.key === col.key &&
                                  (sort.direction === "asc" ? (
                                    <ArrowUp className="size-3" />
                                  ) : (
                                    <ArrowDown className="size-3" />
                                  ))}
                              </button>
                            </TableHead>
                          ))}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {rows.map((row) => {
                          const isOpen = expanded === row.query;
                          return (
                            <>
                              <TableRow key={row.query}>
                                <TableCell className="align-top">
                                  <button
                                    type="button"
                                    onClick={() => setExpanded(isOpen ? null : row.query)}
                                    aria-label={`Show daily history for the query ${row.query}`}
                                    aria-expanded={isOpen}
                                  >
                                    <ChevronRight
                                      className={`size-4 transition-transform ${isOpen ? "rotate-90" : ""}`}
                                    />
                                  </button>
                                </TableCell>
                                <TableCell className="max-w-[18rem] align-top">
                                  <span className="block truncate" title={row.query}>
                                    {row.query}
                                  </span>
                                  {row.isNew && (
                                    <Badge variant="outline" className="mt-1 text-[10px]">
                                      New this period
                                    </Badge>
                                  )}
                                </TableCell>
                                <TableCell className="text-right align-top">
                                  <span className="inline-flex items-center gap-1">
                                    {row.impressions}
                                    <Delta value={row.deltaImpressions} />
                                  </span>
                                </TableCell>
                                <TableCell className="text-right align-top">
                                  <span className="inline-flex items-center gap-1">
                                    {row.clicks}
                                    <Delta value={row.deltaClicks} />
                                  </span>
                                </TableCell>
                                <TableCell className="text-right align-top">{pct(row.ctr)}</TableCell>
                                <TableCell className="text-right align-top">
                                  <span className="inline-flex items-center gap-1">
                                    {row.position ? row.position.toFixed(1) : "—"}
                                    <Delta value={row.deltaPosition} invert />
                                  </span>
                                </TableCell>
                              </TableRow>
                              {isOpen && slug && (
                                <TableRow key={`${row.query}-trend`}>
                                  <TableCell colSpan={6} className="bg-muted/40">
                                    <QueryTrendRow slug={slug} query={row.query} days={days} />
                                  </TableCell>
                                </TableRow>
                              )}
                            </>
                          );
                        })}
                        {rows.length === 0 && (
                          <TableRow>
                            <TableCell colSpan={6} className="text-sm text-muted-foreground">
                              No queries match “{search}”.
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </section>
              </>
            )
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="font-medium">{value}</dd>
    </div>
  );
}
