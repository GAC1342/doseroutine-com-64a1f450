import * as React from "react";
import * as RechartsPrimitive from "recharts";

import { useChartTouchScrub } from "@/hooks/use-chart-touch-scrub";
import { cn } from "@/lib/utils";

// Format: { THEME_NAME: CSS_SELECTOR }
const THEMES = { light: "", dark: ".dark" } as const;

export type ChartConfig = {
  [k in string]: {
    label?: React.ReactNode;
    icon?: React.ComponentType;
  } & (
    | { color?: string; theme?: never }
    | { color?: never; theme: Record<keyof typeof THEMES, string> }
  );
};

type ChartContextProps = {
  config: ChartConfig;
  /** Pushes a plain-text description of the focused datapoint to the chart's live region. */
  announce?: (message: string) => void;
};

const ChartContext = React.createContext<ChartContextProps | null>(null);

function useChart() {
  const context = React.useContext(ChartContext);

  if (!context) {
    throw new Error("useChart must be used within a <ChartContainer />");
  }

  return context;
}


const ChartContainer = React.forwardRef<
  HTMLDivElement,
  React.ComponentProps<"div"> & {
    config: ChartConfig;
    children: React.ComponentProps<typeof RechartsPrimitive.ResponsiveContainer>["children"];
  }
>(({ id, className, children, config, ...props }, ref) => {
  const uniqueId = React.useId();
  const chartId = `chart-${id || uniqueId.replace(/:/g, "")}`;
  const { ref: touchRef, scrubbing } = useChartTouchScrub<HTMLDivElement>();
  const announcerId = `${chartId}-announcer`;

  // One persistent live region per chart. Recharts unmounts and re-mounts the
  // tooltip card as the focus moves between datapoints, and screen readers skip
  // announcements from a region that disappears — so the region lives here and
  // only its text content changes.
  const [announcement, setAnnouncement] = React.useState("");
  const lastAnnouncement = React.useRef("");
  const announce = React.useCallback((message: string) => {
    if (message === lastAnnouncement.current) return;
    lastAnnouncement.current = message;
    setAnnouncement(message);
  }, []);

  const contextValue = React.useMemo(() => ({ config, announce }), [config, announce]);

  const setRefs = React.useCallback(
    (node: HTMLDivElement | null) => {
      touchRef.current = node;
      if (typeof ref === "function") ref(node);
      else if (ref) (ref as React.MutableRefObject<HTMLDivElement | null>).current = node;
    },
    [ref, touchRef],
  );
  // Point the focusable plot area at the live region so screen readers relate
  // the announcements to the chart the user is arrowing through. The SVG is
  // created by Recharts after layout, so watch for it instead of assuming it
  // exists on the first effect pass.
  React.useEffect(() => {
    const host = touchRef.current;
    if (!host) return;
    const apply = () => {
      const node = host.querySelector<SVGElement>(".recharts-surface");
      if (node && node.getAttribute("aria-describedby") !== announcerId) {
        node.setAttribute("aria-describedby", announcerId);
      }
      return Boolean(node);
    };
    if (apply()) return;
    const observer = new MutationObserver(() => {
      if (apply()) observer.disconnect();
    });
    observer.observe(host, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, [announcerId, touchRef]);


  return (
    <ChartContext.Provider value={contextValue}>
      <div
        data-chart={chartId}
        data-scrubbing={scrubbing ? "true" : undefined}
        ref={setRefs}
        className={cn(
          "flex aspect-video justify-center text-xs [&_.recharts-cartesian-axis-tick_text]:fill-muted-foreground [&_.recharts-cartesian-grid_line[stroke='#ccc']]:stroke-border/50 [&_.recharts-curve.recharts-tooltip-cursor]:stroke-border [&_.recharts-dot[stroke='#fff']]:stroke-transparent [&_.recharts-layer]:outline-none [&_.recharts-polar-grid_[stroke='#ccc']]:stroke-border [&_.recharts-radial-bar-background-sector]:fill-muted [&_.recharts-rectangle.recharts-tooltip-cursor]:fill-muted [&_.recharts-reference-line_[stroke='#ccc']]:stroke-border [&_.recharts-sector[stroke='#fff']]:stroke-transparent [&_.recharts-sector]:outline-none [&_.recharts-surface]:outline-none",
          "select-none data-[scrubbing=true]:touch-none",
          // Glide the crosshair, hovered bar and active dot toward the nearest
          // datapoint rather than teleporting between them.
          "[&_.recharts-tooltip-cursor]:transition-all [&_.recharts-tooltip-cursor]:duration-150 [&_.recharts-tooltip-cursor]:ease-out",
          "[&_.recharts-active-dot_circle]:transition-all [&_.recharts-active-dot_circle]:duration-150 [&_.recharts-active-dot_circle]:ease-out",
          "[&_.recharts-tooltip-wrapper]:transition-transform [&_.recharts-tooltip-wrapper]:duration-150 [&_.recharts-tooltip-wrapper]:ease-out",
          "motion-reduce:[&_.recharts-tooltip-wrapper]:transition-none",

          "motion-reduce:[&_.recharts-active-dot_circle]:transition-none motion-reduce:[&_.recharts-tooltip-cursor]:transition-none",
          // Keep a visible focus ring on the keyboard-navigable plot area.
          "[&_.recharts-wrapper:focus-visible]:rounded-md [&_.recharts-wrapper:focus-visible]:outline-2 [&_.recharts-wrapper:focus-visible]:outline-offset-2 [&_.recharts-wrapper:focus-visible]:outline-ring",
          className,
        )}
        {...props}
      >
        <ChartStyle id={chartId} config={config} />
        <RechartsPrimitive.ResponsiveContainer>{children}</RechartsPrimitive.ResponsiveContainer>
        <div
          id={announcerId}
          role="status"
          aria-live="polite"
          aria-atomic="true"
          className="sr-only"
        >
          {announcement}
        </div>
      </div>
    </ChartContext.Provider>

  );
});

ChartContainer.displayName = "Chart";

const ChartStyle = ({ id, config }: { id: string; config: ChartConfig }) => {
  const colorConfig = Object.entries(config).filter(([, config]) => config.theme || config.color);

  if (!colorConfig.length) {
    return null;
  }

  return (
    <style
      dangerouslySetInnerHTML={{
        __html: Object.entries(THEMES)
          .map(
            ([theme, prefix]) => `
${prefix} [data-chart=${id}] {
${colorConfig
  .map(([key, itemConfig]) => {
    const color = itemConfig.theme?.[theme as keyof typeof itemConfig.theme] || itemConfig.color;
    return color ? `  --color-${key}: ${color};` : null;
  })
  .join("\n")}
}
`,
          )
          .join("\n"),
      }}
    />
  );
};

/**
 * Flattens a tooltip label/value (string, number, or React node) into speech-
 * friendly text. Returns "" when nothing readable can be extracted.
 */
function toAnnouncementText(node: React.ReactNode): string {
  if (node === null || node === undefined || typeof node === "boolean") return "";
  if (typeof node === "string") return node.trim();
  if (typeof node === "number") return node.toLocaleString();
  if (Array.isArray(node)) {
    return node
      .map((child) => toAnnouncementText(child))
      .filter(Boolean)
      .join(" ")
      .trim();
  }
  if (React.isValidElement(node)) {
    const props = node.props as { children?: React.ReactNode };
    return toAnnouncementText(props?.children);
  }
  return "";
}

/**
 * Recharts discovers `<Tooltip>` by child component type, so this must be the
 * primitive itself — a wrapper component silently disables the tooltip. The
 * "glide to the nearest datapoint" feel is applied with CSS transitions on the
 * tooltip wrapper, cursor and active dot in `ChartContainer` instead.
 */
const ChartTooltip = RechartsPrimitive.Tooltip;


const ChartTooltipContent = React.forwardRef<
  HTMLDivElement,
  React.ComponentProps<typeof RechartsPrimitive.Tooltip> &
    React.ComponentProps<"div"> & {
      hideLabel?: boolean;
      hideIndicator?: boolean;
      indicator?: "line" | "dot" | "dashed";
      nameKey?: string;
      labelKey?: string;
    }
>(
  (
    {
      active,
      payload,
      className,
      indicator = "dot",
      hideLabel = false,
      hideIndicator = false,
      label,
      labelFormatter,
      labelClassName,
      formatter,
      color,
      nameKey,
      labelKey,
    },
    ref,
  ) => {
    const { config, announce } = useChart();

    const tooltipLabel = React.useMemo(() => {
      if (hideLabel || !payload?.length) {
        return null;
      }

      const [item] = payload;
      const key = `${labelKey || item?.dataKey || item?.name || "value"}`;
      const itemConfig = getPayloadConfigFromPayload(config, item, key);
      const value =
        !labelKey && typeof label === "string"
          ? config[label as keyof typeof config]?.label || label
          : itemConfig?.label;

      if (labelFormatter) {
        return (
          <div className={cn("font-medium", labelClassName)}>{labelFormatter(value, payload)}</div>
        );
      }

      if (!value) {
        return null;
      }

      return <div className={cn("font-medium", labelClassName)}>{value}</div>;
    }, [label, labelFormatter, payload, hideLabel, labelClassName, config, labelKey]);

    // Plain-text mirror of what the card shows, announced from the chart's
    // persistent live region rather than from this card (which unmounts as the
    // focus moves and would drop announcements).
    const spokenLabel = React.useMemo(() => {
      if (hideLabel) return "";
      const fromFormatter = labelFormatter ? labelFormatter(label, payload ?? []) : label;
      return toAnnouncementText(fromFormatter);
    }, [hideLabel, label, labelFormatter, payload]);

    const spokenValues = React.useMemo(() => {
      if (!payload?.length) return "";
      return payload
        .filter((item) => item.type !== "none")
        .map((item, index) => {
          const key = `${nameKey || item.name || item.dataKey || "value"}`;
          const itemConfig = getPayloadConfigFromPayload(config, item, key);
          const name = toAnnouncementText(itemConfig?.label ?? item.name ?? key);
          const formatted =
            formatter && item?.value !== undefined && item.name
              ? toAnnouncementText(formatter(item.value, item.name, item, index, item.payload))
              : toAnnouncementText(
                  typeof item.value === "number" ? item.value.toLocaleString() : item.value,
                );
          if (!formatted) return name;
          return name && !formatted.startsWith(name) ? `${name}: ${formatted}` : formatted;
        })
        .filter(Boolean)
        .join(", ");
    }, [payload, config, formatter, nameKey]);

    React.useEffect(() => {
      if (!announce) return;
      if (!active || !payload?.length) return;
      const message = [spokenLabel, spokenValues].filter(Boolean).join(". ");
      if (message) announce(message);
    }, [announce, active, payload, spokenLabel, spokenValues]);

    if (!active || !payload?.length) {
      return null;
    }

    const nestLabel = payload.length === 1 && indicator !== "dot";

    return (
      <div
        ref={ref}
        // The card is a visual echo of the live-region announcement; exposing
        // both would make screen readers read every datapoint twice.
        aria-hidden="true"
        className={cn(
          "grid min-w-[8rem] items-start gap-1.5 rounded-lg border border-border/50 bg-background px-2.5 py-1.5 text-xs shadow-xl",
          className,
        )}
      >


        {!nestLabel ? tooltipLabel : null}
        <div className="grid gap-1.5">
          {payload
            .filter((item) => item.type !== "none")
            .map((item, index) => {
              const key = `${nameKey || item.name || item.dataKey || "value"}`;
              const itemConfig = getPayloadConfigFromPayload(config, item, key);
              const indicatorColor = color || item.payload.fill || item.color;

              return (
                <div
                  key={item.dataKey}
                  className={cn(
                    "flex w-full flex-wrap items-stretch gap-2 [&>svg]:h-2.5 [&>svg]:w-2.5 [&>svg]:text-muted-foreground",
                    indicator === "dot" && "items-center",
                  )}
                >
                  {formatter && item?.value !== undefined && item.name ? (
                    formatter(item.value, item.name, item, index, item.payload)
                  ) : (
                    <>
                      {itemConfig?.icon ? (
                        <itemConfig.icon />
                      ) : (
                        !hideIndicator && (
                          <div
                            className={cn(
                              "shrink-0 rounded-[2px] border-(--color-border) bg-(--color-bg)",
                              {
                                "h-2.5 w-2.5": indicator === "dot",
                                "w-1": indicator === "line",
                                "w-0 border-[1.5px] border-dashed bg-transparent":
                                  indicator === "dashed",
                                "my-0.5": nestLabel && indicator === "dashed",
                              },
                            )}
                            style={
                              {
                                "--color-bg": indicatorColor,
                                "--color-border": indicatorColor,
                              } as React.CSSProperties
                            }
                          />
                        )
                      )}
                      <div
                        className={cn(
                          "flex flex-1 justify-between leading-none",
                          nestLabel ? "items-end" : "items-center",
                        )}
                      >
                        <div className="grid gap-1.5">
                          {nestLabel ? tooltipLabel : null}
                          <span className="text-muted-foreground">
                            {itemConfig?.label || item.name}
                          </span>
                        </div>
                        {item.value && (
                          <span className="font-mono font-medium tabular-nums text-foreground">
                            {item.value.toLocaleString()}
                          </span>
                        )}
                      </div>
                    </>
                  )}
                </div>
              );
            })}
        </div>
      </div>
    );
  },
);
ChartTooltipContent.displayName = "ChartTooltip";

const ChartLegend = RechartsPrimitive.Legend;

const ChartLegendContent = React.forwardRef<
  HTMLDivElement,
  React.ComponentProps<"div"> &
    Pick<RechartsPrimitive.LegendProps, "payload" | "verticalAlign"> & {
      hideIcon?: boolean;
      nameKey?: string;
    }
>(({ className, hideIcon = false, payload, verticalAlign = "bottom", nameKey }, ref) => {
  const { config } = useChart();

  if (!payload?.length) {
    return null;
  }

  return (
    <div
      ref={ref}
      className={cn(
        "flex items-center justify-center gap-4",
        verticalAlign === "top" ? "pb-3" : "pt-3",
        className,
      )}
    >
      {payload
        .filter((item) => item.type !== "none")
        .map((item) => {
          const key = `${nameKey || item.dataKey || "value"}`;
          const itemConfig = getPayloadConfigFromPayload(config, item, key);

          return (
            <div
              key={item.value}
              className={cn(
                "flex items-center gap-1.5 [&>svg]:h-3 [&>svg]:w-3 [&>svg]:text-muted-foreground",
              )}
            >
              {itemConfig?.icon && !hideIcon ? (
                <itemConfig.icon />
              ) : (
                <div
                  className="h-2 w-2 shrink-0 rounded-[2px]"
                  style={{
                    backgroundColor: item.color,
                  }}
                />
              )}
              {itemConfig?.label}
            </div>
          );
        })}
    </div>
  );
});
ChartLegendContent.displayName = "ChartLegend";

// Helper to extract item config from a payload.
function getPayloadConfigFromPayload(config: ChartConfig, payload: unknown, key: string) {
  if (typeof payload !== "object" || payload === null) {
    return undefined;
  }

  const payloadPayload =
    "payload" in payload && typeof payload.payload === "object" && payload.payload !== null
      ? payload.payload
      : undefined;

  let configLabelKey: string = key;

  if (key in payload && typeof payload[key as keyof typeof payload] === "string") {
    configLabelKey = payload[key as keyof typeof payload] as string;
  } else if (
    payloadPayload &&
    key in payloadPayload &&
    typeof payloadPayload[key as keyof typeof payloadPayload] === "string"
  ) {
    configLabelKey = payloadPayload[key as keyof typeof payloadPayload] as string;
  }

  return configLabelKey in config ? config[configLabelKey] : config[key as keyof typeof config];
}

export {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
  ChartStyle,
};
