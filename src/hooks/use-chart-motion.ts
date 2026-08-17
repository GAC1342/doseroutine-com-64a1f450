import { useEffect, useState } from "react";
import {
  FULL_CHART_MOTION,
  LITE_CHART_MOTION,
  STILL_CHART_MOTION,
  type ChartMotion,
} from "@/lib/insights/chart-motion";

interface LiteNav extends Navigator {
  deviceMemory?: number;
  connection?: { saveData?: boolean };
}

function detect(): ChartMotion {
  if (typeof window === "undefined" || !window.matchMedia) return FULL_CHART_MOTION;
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return STILL_CHART_MOTION;
  const nav = navigator as LiteNav;
  const constrained =
    window.matchMedia("(pointer: coarse)").matches ||
    window.matchMedia("(max-width: 768px)").matches ||
    (nav.hardwareConcurrency ?? 8) <= 4 ||
    (nav.deviceMemory ?? 8) <= 4 ||
    nav.connection?.saveData === true;
  return constrained ? LITE_CHART_MOTION : FULL_CHART_MOTION;
}

/**
 * Motion budget for insight charts. Starts at the full desktop profile so SSR
 * and first paint agree, then narrows after hydration on phones, low-core
 * devices, or when the visitor asked for reduced motion.
 */
export function useChartMotionProfile(): ChartMotion {
  const [motion, setMotion] = useState<ChartMotion>(FULL_CHART_MOTION);

  useEffect(() => {
    setMotion(detect());
    const queries = [
      window.matchMedia("(prefers-reduced-motion: reduce)"),
      window.matchMedia("(pointer: coarse)"),
      window.matchMedia("(max-width: 768px)"),
    ];
    const onChange = () => setMotion(detect());
    queries.forEach((q) => q.addEventListener("change", onChange));
    return () => queries.forEach((q) => q.removeEventListener("change", onChange));
  }, []);

  return motion;
}
