import { describe, expect, it } from "vitest";
import {
  DEFAULT_CONFIG,
  TIMER_PRESETS,
  buildPhases,
  formatClock,
  phaseStartOffsets,
  positionAt,
  sanitizeConfig,
  totalSeconds,
  transitionCue,
} from "@/lib/interval-timer";

describe("sanitizeConfig", () => {
  it("clamps nonsense input instead of producing a zero-length workout", () => {
    const cfg = sanitizeConfig({ workSec: 0, rounds: 0, cycles: -3, restSec: -10 });
    expect(cfg.workSec).toBe(1);
    expect(cfg.rounds).toBe(1);
    expect(cfg.cycles).toBe(1);
    expect(cfg.restSec).toBe(0);
  });

  it("caps absurd values", () => {
    const cfg = sanitizeConfig({ workSec: 99999, rounds: 500 });
    expect(cfg.workSec).toBe(3600);
    expect(cfg.rounds).toBe(99);
  });
});

describe("buildPhases", () => {
  it("builds a classic Tabata: 10s prep + 8 work + 7 rests = 4:10", () => {
    const phases = buildPhases(TIMER_PRESETS.find((p) => p.id === "tabata")!.config);
    expect(phases.filter((p) => p.kind === "work")).toHaveLength(8);
    expect(phases.filter((p) => p.kind === "rest")).toHaveLength(7);
    expect(totalSeconds(phases)).toBe(10 + 8 * 20 + 7 * 10);
  });

  it("never ends on a rest interval", () => {
    const phases = buildPhases({ ...DEFAULT_CONFIG, rounds: 3, cycles: 2, cooldownSec: 0 });
    expect(phases.at(-1)?.kind).toBe("work");
  });

  it("inserts a cycle break between cycles only", () => {
    const phases = buildPhases({ ...DEFAULT_CONFIG, rounds: 2, cycles: 3, cycleRestSec: 60 });
    expect(phases.filter((p) => p.kind === "cycleRest")).toHaveLength(2);
  });

  it("omits rest phases entirely for EMOM-style configs", () => {
    const phases = buildPhases({ ...DEFAULT_CONFIG, restSec: 0, rounds: 5 });
    expect(phases.some((p) => p.kind === "rest")).toBe(false);
  });
});

describe("positionAt", () => {
  const phases = buildPhases({
    prepareSec: 5,
    workSec: 20,
    restSec: 10,
    rounds: 2,
    cycles: 1,
    cycleRestSec: 0,
    cooldownSec: 0,
  });

  it("counts down inside the prepare phase", () => {
    expect(positionAt(phases, 0).phase?.kind).toBe("prepare");
    expect(positionAt(phases, 0).remaining).toBe(5);
    expect(positionAt(phases, 4.2).remaining).toBe(1);
  });

  it("crosses into work exactly at the boundary", () => {
    expect(positionAt(phases, 5).phase?.kind).toBe("work");
    expect(positionAt(phases, 5).remaining).toBe(20);
  });

  it("reports done past the end and clamps overshoot", () => {
    const total = totalSeconds(phases);
    const pos = positionAt(phases, total + 500);
    expect(pos.done).toBe(true);
    expect(pos.remaining).toBe(0);
    expect(pos.elapsed).toBe(total);
  });

  it("tracks total remaining across phases", () => {
    const total = totalSeconds(phases);
    expect(positionAt(phases, 0).totalRemaining).toBe(total);
    expect(positionAt(phases, 30).totalRemaining).toBe(total - 30);
  });

  it("stays correct after a long screen-lock gap (derived, not accumulated)", () => {
    // 42s in should be round 2's work interval regardless of missed ticks.
    expect(positionAt(phases, 42).phase?.round).toBe(2);
    expect(positionAt(phases, 42).phase?.kind).toBe("work");
  });
});

describe("phaseStartOffsets", () => {
  it("gives skip targets aligned to phase starts", () => {
    const phases = buildPhases({ ...DEFAULT_CONFIG, prepareSec: 5, rounds: 2 });
    const offsets = phaseStartOffsets(phases);
    expect(offsets[0]).toBe(0);
    offsets.forEach((offset, i) => {
      if (i === 0) return;
      expect(positionAt(phases, offset).index).toBe(i);
    });
  });
});

describe("cues and formatting", () => {
  it("maps phases to the right cue", () => {
    expect(transitionCue("work")).toBe("work");
    expect(transitionCue("rest")).toBe("rest");
    expect(transitionCue("cycleRest")).toBe("rest");
    expect(transitionCue("prepare")).toBeNull();
  });

  it("formats clocks", () => {
    expect(formatClock(0)).toBe("0:00");
    expect(formatClock(9)).toBe("0:09");
    expect(formatClock(605)).toBe("10:05");
    expect(formatClock(3725)).toBe("1:02:05");
  });
});
