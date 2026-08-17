import { createContext, useContext } from "react";

/**
 * Chart draw-in motion budget. Phones repaint every frame of a Recharts
 * animation, so constrained devices get a shorter, less staggered draw-in and
 * never a full grid remount. Desktop keeps the slow "growing line" motion.
 */
export interface ChartMotion {
  /** Whether Recharts should animate at all. */
  animate: boolean;
  /** Draw-in duration in ms. */
  duration: number;
  /** Per-series delay in ms. */
  stagger: number;
  /** True on touch/small/low-core devices: skip remount-based replays. */
  lite: boolean;
}

export const FULL_CHART_MOTION: ChartMotion = {
  animate: true,
  duration: 900,
  stagger: 90,
  lite: false,
};

export const LITE_CHART_MOTION: ChartMotion = {
  animate: true,
  duration: 420,
  stagger: 30,
  lite: true,
};

export const STILL_CHART_MOTION: ChartMotion = {
  animate: false,
  duration: 0,
  stagger: 0,
  lite: true,
};

export const ChartMotionContext = createContext<ChartMotion>(FULL_CHART_MOTION);

export function useChartMotion(): ChartMotion {
  return useContext(ChartMotionContext);
}

/**
 * Recharts animation props for one series. `animate` is the caller's opt-out;
 * the shared motion budget decides how long and how staggered the draw-in is.
 */
export function useSeriesMotion(animate: boolean) {
  const motion = useChartMotion();
  const on = animate && motion.animate;
  return (index = 0) =>
    ({
      isAnimationActive: on,
      animationDuration: motion.duration,
      animationEasing: "ease-out" as const,
      animationBegin: on ? index * motion.stagger : 0,
    }) as const;
}
