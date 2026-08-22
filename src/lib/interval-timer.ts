/**
 * Interval / Tabata timer logic.
 *
 * All of the timing maths lives here as pure functions so the UI component
 * only has to render "what phase am I in and how long is left". That keeps the
 * timer testable, and — more importantly — lets the running clock be derived
 * from a single wall-clock start timestamp instead of accumulating setInterval
 * ticks. Phones throttle timers when the screen locks; deriving from
 * `Date.now()` means the timer is still correct when the user comes back.
 */

export type PhaseKind = "prepare" | "work" | "rest" | "cycleRest" | "cooldown";

export type TimerConfig = {
  /** Countdown before the first work interval. */
  prepareSec: number;
  workSec: number;
  restSec: number;
  /** Work + rest pairs inside one cycle. */
  rounds: number;
  /** How many times the whole round block repeats. */
  cycles: number;
  /** Longer breather between cycles. */
  cycleRestSec: number;
  cooldownSec: number;
};

export type Phase = {
  kind: PhaseKind;
  seconds: number;
  /** 1-based round inside the current cycle; 0 for prepare/cooldown. */
  round: number;
  /** 1-based cycle; 0 for prepare/cooldown. */
  cycle: number;
  label: string;
};

export const TIMER_LIMITS = {
  maxSeconds: 3600,
  maxRounds: 99,
  maxCycles: 20,
} as const;

export const DEFAULT_CONFIG: TimerConfig = {
  prepareSec: 10,
  workSec: 20,
  restSec: 10,
  rounds: 8,
  cycles: 1,
  cycleRestSec: 60,
  cooldownSec: 0,
};

export type TimerPreset = {
  id: string;
  name: string;
  blurb: string;
  config: TimerConfig;
};

export const TIMER_PRESETS: TimerPreset[] = [
  {
    id: "tabata",
    name: "Tabata",
    blurb: "20s hard / 10s easy × 8 — four minutes total.",
    config: { ...DEFAULT_CONFIG, workSec: 20, restSec: 10, rounds: 8, cycles: 1 },
  },
  {
    id: "tabata-double",
    name: "Double Tabata",
    blurb: "Two Tabata blocks with a minute between them.",
    config: { ...DEFAULT_CONFIG, workSec: 20, restSec: 10, rounds: 8, cycles: 2, cycleRestSec: 60 },
  },
  {
    id: "hiit-40-20",
    name: "HIIT 40/20",
    blurb: "40s work, 20s rest, 10 rounds.",
    config: { ...DEFAULT_CONFIG, workSec: 40, restSec: 20, rounds: 10, cycles: 1 },
  },
  {
    id: "emom",
    name: "EMOM",
    blurb: "Every minute on the minute, 10 minutes.",
    config: { ...DEFAULT_CONFIG, prepareSec: 10, workSec: 60, restSec: 0, rounds: 10, cycles: 1 },
  },
  {
    id: "strength-rest",
    name: "Strength sets",
    blurb: "45s set, 90s rest, 5 sets — for heavy lifting.",
    config: { ...DEFAULT_CONFIG, workSec: 45, restSec: 90, rounds: 5, cycles: 1 },
  },
  {
    id: "boxing",
    name: "Boxing rounds",
    blurb: "3 minute rounds with 60s corners, 6 rounds.",
    config: { ...DEFAULT_CONFIG, workSec: 180, restSec: 60, rounds: 6, cycles: 1 },
  },
];

const clampInt = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, Math.round(Number.isFinite(value) ? value : min)));

/** Keep a user-entered config inside sane bounds without silently zeroing work. */
export function sanitizeConfig(input: Partial<TimerConfig>): TimerConfig {
  const merged = { ...DEFAULT_CONFIG, ...input };
  return {
    prepareSec: clampInt(merged.prepareSec, 0, 300),
    workSec: clampInt(merged.workSec, 1, TIMER_LIMITS.maxSeconds),
    restSec: clampInt(merged.restSec, 0, TIMER_LIMITS.maxSeconds),
    rounds: clampInt(merged.rounds, 1, TIMER_LIMITS.maxRounds),
    cycles: clampInt(merged.cycles, 1, TIMER_LIMITS.maxCycles),
    cycleRestSec: clampInt(merged.cycleRestSec, 0, TIMER_LIMITS.maxSeconds),
    cooldownSec: clampInt(merged.cooldownSec, 0, TIMER_LIMITS.maxSeconds),
  };
}

/** Expand a config into the exact ordered list of phases the user will run. */
export function buildPhases(raw: Partial<TimerConfig>): Phase[] {
  const cfg = sanitizeConfig(raw);
  const phases: Phase[] = [];

  if (cfg.prepareSec > 0) {
    phases.push({
      kind: "prepare",
      seconds: cfg.prepareSec,
      round: 0,
      cycle: 0,
      label: "Get ready",
    });
  }

  for (let cycle = 1; cycle <= cfg.cycles; cycle += 1) {
    for (let round = 1; round <= cfg.rounds; round += 1) {
      phases.push({
        kind: "work",
        seconds: cfg.workSec,
        round,
        cycle,
        label: `Work · round ${round} of ${cfg.rounds}`,
      });
      const isFinalRound = round === cfg.rounds;
      // No trailing rest at the very end of a cycle — the cycle rest (or the
      // finish) covers it, otherwise every workout ends on an idle countdown.
      if (cfg.restSec > 0 && !isFinalRound) {
        phases.push({
          kind: "rest",
          seconds: cfg.restSec,
          round,
          cycle,
          label: `Rest · next up round ${round + 1}`,
        });
      }
    }
    if (cycle < cfg.cycles && cfg.cycleRestSec > 0) {
      phases.push({
        kind: "cycleRest",
        seconds: cfg.cycleRestSec,
        round: 0,
        cycle,
        label: `Cycle break · ${cycle} of ${cfg.cycles} done`,
      });
    }
  }

  if (cfg.cooldownSec > 0) {
    phases.push({
      kind: "cooldown",
      seconds: cfg.cooldownSec,
      round: 0,
      cycle: 0,
      label: "Cool down",
    });
  }

  return phases;
}

export function totalSeconds(phases: Phase[]): number {
  return phases.reduce((sum, p) => sum + p.seconds, 0);
}

export type TimerPosition = {
  /** Index into the phase list, or -1 once the workout is complete. */
  index: number;
  phase: Phase | null;
  /** Whole seconds left in the current phase (counts 20 → 1). */
  remaining: number;
  /** Whole seconds left in the entire workout. */
  totalRemaining: number;
  elapsed: number;
  done: boolean;
};

/**
 * Where are we, given how many seconds have elapsed since the start?
 * Derived rather than accumulated, so a locked screen can't drift.
 */
export function positionAt(phases: Phase[], elapsedSec: number): TimerPosition {
  const total = totalSeconds(phases);
  const elapsed = Math.max(0, Math.min(total, elapsedSec));

  if (phases.length === 0 || elapsed >= total) {
    return { index: -1, phase: null, remaining: 0, totalRemaining: 0, elapsed, done: true };
  }

  let cursor = 0;
  for (let i = 0; i < phases.length; i += 1) {
    const phase = phases[i]!;
    const end = cursor + phase.seconds;
    if (elapsed < end) {
      return {
        index: i,
        phase,
        remaining: Math.ceil(end - elapsed),
        totalRemaining: Math.ceil(total - elapsed),
        elapsed,
        done: false,
      };
    }
    cursor = end;
  }

  return { index: -1, phase: null, remaining: 0, totalRemaining: 0, elapsed, done: true };
}

/** Second-offset at which each phase begins — used to skip forward/back. */
export function phaseStartOffsets(phases: Phase[]): number[] {
  const offsets: number[] = [];
  let cursor = 0;
  for (const phase of phases) {
    offsets.push(cursor);
    cursor += phase.seconds;
  }
  return offsets;
}

export function formatClock(seconds: number): string {
  const safe = Math.max(0, Math.round(seconds));
  const mins = Math.floor(safe / 60);
  const secs = safe % 60;
  if (mins >= 60) {
    const hrs = Math.floor(mins / 60);
    return `${hrs}:${String(mins % 60).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  }
  return `${mins}:${String(secs).padStart(2, "0")}`;
}

export type CueKind = "countdown" | "work" | "rest" | "finish" | null;

/**
 * Which audible/haptic cue belongs to this exact second? Called once per
 * whole-second tick; returns null for the many seconds that need no cue.
 */
export function cueFor(position: TimerPosition, previousRemaining: number | null): CueKind {
  if (position.done) return "finish";
  if (!position.phase) return null;
  // Only fire on the tick where the remaining second actually changed.
  if (previousRemaining !== null && previousRemaining === position.remaining) return null;
  if (position.remaining <= 3 && position.remaining > 0) return "countdown";
  if (previousRemaining === null) return null;
  return null;
}

/** The cue to play when the timer crosses into a new phase. */
export function transitionCue(kind: PhaseKind): CueKind {
  if (kind === "work") return "work";
  if (kind === "rest" || kind === "cycleRest" || kind === "cooldown") return "rest";
  return null;
}

export function describeConfig(cfg: TimerConfig): string {
  const parts = [`${cfg.workSec}s work`];
  if (cfg.restSec > 0) parts.push(`${cfg.restSec}s rest`);
  parts.push(`${cfg.rounds} round${cfg.rounds === 1 ? "" : "s"}`);
  if (cfg.cycles > 1) parts.push(`${cfg.cycles} cycles`);
  return parts.join(" · ");
}
