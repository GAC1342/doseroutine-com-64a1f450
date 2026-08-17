import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  CalendarCheck,
  CheckCircle2,
  Clock,
  Flame,
  Home,
  Minus,
  Pause,
  Play,
  Plus,
  RotateCcw,
  SkipForward,
  SlidersHorizontal,
  Target,
  Trash2,
} from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { DisclaimerFooter } from "@/components/disclaimer-footer";
import { BootyWorkoutChart } from "@/components/booty-workout-chart";
import { Progress } from "@/components/ui/progress";
import {
  clampGoal,
  clearGoal,
  DEFAULT_GOAL,
  GOAL_MAX,
  GOAL_MIN,
  goalProgress,
  loadGoal,
  saveGoal,
} from "@/lib/booty-workout-goal";
import {
  clearProgress,
  emptyProgress,
  computeStats,
  formatCompletedAt,
  formatDuration,
  formatMonthLabel,
  formatSessionDate,
  loadProgress,
  newSessionId,
  saveProgress,
  upsertSession,
  type BootyWorkoutProgress,
  type BootyWorkoutSession,
} from "@/lib/booty-workout-progress";
import {
  INTENSITY_PRESETS,
  REST_MAX,
  REST_MIN,
  STEP_SEC,
  WORK_MAX,
  WORK_MIN,
  defaultSettings,
  loadSettings,
  normalizeSettings,
  saveSettings,
  totalSecondsFor,
  type BootyWorkoutSettings,
} from "@/lib/booty-workout-settings";



import squatArt from "@/assets/routines/w-squat.jpg.asset.json";
import gluteBridgeArt from "@/assets/routines/w-glute-bridge.jpg.asset.json";
import donkeyKickArt from "@/assets/routines/w-donkey-kick.jpg.asset.json";
import fireHydrantArt from "@/assets/routines/w-fire-hydrant.jpg.asset.json";
import sumoSquatArt from "@/assets/routines/w-sumo-squat.jpg.asset.json";
import standingKickbackArt from "@/assets/routines/w-standing-kickback.jpg.asset.json";

export const Route = createFileRoute("/booty-workout")({
  head: () => ({
    meta: [
      { title: "10-Minute Booty Workout for Women — DoseRoutine" },
      {
        name: "description",
        content:
          "A no-equipment 10-minute glute workout for women: 8 moves, 45 seconds each, with anatomy illustrations and a built-in guided timer.",
      },
      { property: "og:title", content: "10-Minute Booty Workout for Women" },
      {
        property: "og:description",
        content:
          "Eight at-home glute exercises, 45 seconds each, with illustrations showing the muscles you work.",
      },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://doseroutine.com/booty-workout" },
      { name: "twitter:card", content: "summary" },
      { name: "twitter:title", content: "10-Minute Booty Workout for Women" },
      {
        name: "twitter:description",
        content:
          "Eight at-home glute exercises, 45 seconds each, with illustrations showing the muscles you work.",
      },
      { name: "robots", content: "index, follow, max-image-preview:large, max-snippet:-1" },
    ],
    links: [{ rel: "canonical", href: "https://doseroutine.com/booty-workout" }],
  }),
  component: BootyWorkoutPage,
});

type Move = {
  name: string;
  side?: string;
  art: string;
  alt: string;
  cue: string;
};



const MOVES: Move[] = [
  {
    name: "Squats",
    art: squatArt.url,
    alt: "Anatomy illustration of a woman in a deep bodyweight squat with the gluteus maximus shaded red.",
    cue: "Feet hip-width, chest tall, sit back through the hips and drive up through your heels.",
  },
  {
    name: "Glute bridges",
    art: gluteBridgeArt.url,
    alt: "Anatomy illustration of a woman performing a glute bridge with hips lifted and glutes shaded red.",
    cue: "Ribs down, squeeze the glutes at the top, lower without letting the hips crash.",
  },
  {
    name: "Donkey kicks",
    side: "Right",
    art: donkeyKickArt.url,
    alt: "Anatomy illustration of a woman on hands and knees kicking one bent leg back, glutes shaded red.",
    cue: "Keep the knee bent to 90°, press the heel to the ceiling, don't arch the low back.",
  },
  {
    name: "Donkey kicks",
    side: "Left",
    art: donkeyKickArt.url,
    alt: "Anatomy illustration of a woman on hands and knees kicking one bent leg back, glutes shaded red.",
    cue: "Same on the other side — square hips, slow and controlled beats fast and sloppy.",
  },
  {
    name: "Fire hydrants",
    side: "Right",
    art: fireHydrantArt.url,
    alt: "Anatomy illustration of a woman on hands and knees lifting a bent leg out to the side, gluteus medius shaded red.",
    cue: "Lift the knee out to the side only as far as the hips stay level.",
  },
  {
    name: "Fire hydrants",
    side: "Left",
    art: fireHydrantArt.url,
    alt: "Anatomy illustration of a woman on hands and knees lifting a bent leg out to the side, gluteus medius shaded red.",
    cue: "Brace the core so the torso doesn't rotate away from the working leg.",
  },
  {
    name: "Sumo squats",
    art: sumoSquatArt.url,
    alt: "Anatomy illustration of a woman in a wide-stance sumo squat with glutes and inner thighs shaded red.",
    cue: "Wide stance, toes turned out, knees track over the toes, squeeze at the top.",
  },
  {
    name: "Standing kickbacks",
    art: standingKickbackArt.url,
    alt: "Anatomy illustration of a woman standing and extending one leg straight behind, gluteus maximus shaded red.",
    cue: "Stand tall, extend the leg straight back from the hip, alternate sides as you go.",
  },
];

type Step = { move: Move; rest: boolean; seconds: number };

/** Build the work/rest step list for the chosen timing. */
function buildSteps(settings: BootyWorkoutSettings): Step[] {
  return MOVES.flatMap((move, i) => {
    const work: Step = { move, rest: false, seconds: settings.workSec };
    if (i === MOVES.length - 1 || settings.restSec <= 0) return [work];
    return [work, { move, rest: true, seconds: settings.restSec }];
  });
}

function moveLabel(move: Move) {
  return move.side ? `${move.name} (${move.side})` : move.name;
}

function mmss(total: number) {
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

function elapsedAt(steps: Step[], index: number, remaining: number) {
  const safe = Math.min(index, steps.length - 1);
  return (
    steps.slice(0, safe).reduce((sum, s) => sum + s.seconds, 0) +
    (steps[safe].seconds - remaining)
  );
}


function Stepper({
  label,
  value,
  min,
  max,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (value: number) => void;
}) {
  const id = `booty-${label.replace(/\s+/g, "-").toLowerCase()}`;
  return (
    <div>
      <label htmlFor={id} className="block text-xs font-medium text-muted-foreground">
        {label}
      </label>
      <div className="mt-1 flex items-center gap-2">
        <button
          type="button"
          aria-label={`Decrease ${label.toLowerCase()}`}
          disabled={value <= min}
          onClick={() => onChange(Math.max(min, value - STEP_SEC))}
          className="tap-target flex h-9 w-9 items-center justify-center rounded-lg border border-border text-muted-foreground hover:bg-muted disabled:opacity-40"
        >
          <Minus className="h-4 w-4" />
        </button>
        <input
          id={id}
          type="number"
          inputMode="numeric"
          min={min}
          max={max}
          step={STEP_SEC}
          value={value}
          onChange={(e) => {
            const nextValue = Number(e.target.value);
            if (!Number.isFinite(nextValue)) return;
            onChange(Math.min(max, Math.max(min, Math.round(nextValue))));
          }}
          className="h-9 w-full rounded-lg border border-border bg-background px-2 text-center text-sm tabular-nums"
        />
        <button
          type="button"
          aria-label={`Increase ${label.toLowerCase()}`}
          disabled={value >= max}
          onClick={() => onChange(Math.min(max, value + STEP_SEC))}
          className="tap-target flex h-9 w-9 items-center justify-center rounded-lg border border-border text-muted-foreground hover:bg-muted disabled:opacity-40"
        >
          <Plus className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

function BootyWorkoutPage() {
  const [settings, setSettings] = useState<BootyWorkoutSettings>(defaultSettings);
  const [running, setRunning] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [remaining, setRemaining] = useState(defaultSettings.workSec);
  const [done, setDone] = useState(false);
  const [zoom, setZoom] = useState<Move | null>(null);
  const [history, setHistory] = useState<BootyWorkoutProgress>(emptyProgress);
  const [historyStatus, setHistoryStatus] = useState<"loading" | "error" | "success">("loading");
  const [restored, setRestored] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const zoomTrigger = useRef<HTMLElement | null>(null);
  const sessionRef = useRef<{ id: string; startedAt: string } | null>(null);

  const [goal, setGoal] = useState<number | null>(null);
  const [editingGoal, setEditingGoal] = useState(false);

  const updateGoal = useCallback((next: number) => {
    const value = clampGoal(next);
    setGoal(value);
    saveGoal(value);
  }, []);

  const removeGoal = useCallback(() => {
    setGoal(null);
    setEditingGoal(false);
    clearGoal();
  }, []);

  const stats = useMemo(
    () => (hydrated ? computeStats(history) : null),
    [hydrated, history],
  );
  const monthLabel = useMemo(
    () => (hydrated ? formatMonthLabel() : ""),
    [hydrated],
  );

  const steps = useMemo(() => buildSteps(settings), [settings]);
  const totalSeconds = useMemo(
    () => totalSecondsFor(MOVES.length, settings),
    [settings],
  );

  const step = steps[Math.min(stepIndex, steps.length - 1)];

  const loadHistory = useCallback(() => {
    setHistoryStatus("loading");
    try {
      const saved = loadProgress();
      if (saved) {
        setHistory(saved);
      }
      setHistoryStatus("success");
      return saved;
    } catch {
      setHistoryStatus("error");
      return null;
    }
  }, []);

  // Restore the last saved timing + position after hydration (client-only storage).
  useEffect(() => {
    const savedSettings = loadSettings();
    const active = savedSettings ?? defaultSettings;
    if (savedSettings) setSettings(savedSettings);
    const savedSteps = buildSteps(active);
    setRemaining(savedSteps[0].seconds);
    const saved = loadHistory();
    setGoal(loadGoal());
    setHydrated(true);
    if (!saved) return;
    if (saved.stepIndex > 0 && saved.stepIndex < savedSteps.length) {
      setStepIndex(saved.stepIndex);
      setRemaining(
        saved.remaining > 0 && saved.remaining <= savedSteps[saved.stepIndex].seconds
          ? saved.remaining
          : savedSteps[saved.stepIndex].seconds,
      );
      setRestored(true);
    }
  }, [loadHistory]);

  /** Change timing; resets the run so the new work/rest applies from the top. */
  const applySettings = useCallback((next: BootyWorkoutSettings) => {
    const normalized = normalizeSettings(next);
    setSettings(normalized);
    saveSettings(normalized);
    setRunning(false);
    setDone(false);
    setRestored(false);
    setStepIndex(0);
    setRemaining(normalized.workSec);
    sessionRef.current = null;
    setHistory((prev) => {
      const nextState = { ...prev, stepIndex: 0, remaining: normalized.workSec };
      saveProgress(nextState);
      return nextState;
    });
  }, []);


  const persist = useCallback((patch: Partial<BootyWorkoutProgress>) => {
    setHistory((prev) => {
      const nextState = { ...prev, ...patch };
      saveProgress(nextState);
      return nextState;
    });
  }, []);

  /** Write (or update) the history entry for the run currently in progress. */
  const recordSession = useCallback(
    (index: number, secondsLeft: number, completed: boolean) => {
      const active = sessionRef.current;
      if (!active) return;
      const worked = completed ? totalSeconds : elapsedAt(steps, index, secondsLeft);
      if (worked <= 0) return;
      const move = steps[Math.min(index, steps.length - 1)].move;
      const entry: BootyWorkoutSession = {
        id: active.id,
        startedAt: active.startedAt,
        endedAt: new Date().toISOString(),
        durationSec: worked,
        completed,
        lastMove: completed ? moveLabel(MOVES[MOVES.length - 1]) : moveLabel(move),
        lastMoveIndex: completed ? MOVES.length : MOVES.indexOf(move) + 1,
        totalMoves: MOVES.length,
      };
      setHistory((prev) => {
        const nextState: BootyWorkoutProgress = {
          ...prev,
          sessions: upsertSession(prev.sessions, entry),
        };
        saveProgress(nextState);
        return nextState;
      });
    },
    [steps, totalSeconds],
  );

  const startSession = useCallback(() => {
    if (sessionRef.current) return;
    sessionRef.current = { id: newSessionId(), startedAt: new Date().toISOString() };
  }, []);

  const complete = useCallback(() => {
    const completedAt = new Date().toISOString();
    setRunning(false);
    setDone(true);
    setRemaining(0);
    setRestored(false);
    recordSession(steps.length - 1, 0, true);
    sessionRef.current = null;
    setHistory((prev) => {
      const nextState: BootyWorkoutProgress = {
        ...prev,
        stepIndex: 0,
        remaining: 0,
        lastCompletedAt: completedAt,
        completions: prev.completions + 1,
      };
      saveProgress(nextState);
      return nextState;
    });
  }, [recordSession, steps.length]);

  const next = useCallback(() => {
    setStepIndex((i) => {
      if (i + 1 >= steps.length) {
        complete();
        return i;
      }
      setRemaining(steps[i + 1].seconds);
      persist({ stepIndex: i + 1, remaining: steps[i + 1].seconds });
      recordSession(i + 1, steps[i + 1].seconds, false);
      return i + 1;
    });
  }, [complete, persist, recordSession, steps]);

  useEffect(() => {
    if (!running) return;
    const id = window.setInterval(() => {
      setRemaining((r: number) => {
        if (r > 1) return r - 1;
        next();
        return 0;
      });
    }, 1000);
    return () => window.clearInterval(id);
  }, [running, next]);

  // Save the in-step countdown when the timer pauses or the page unmounts.
  useEffect(() => {
    if (!hydrated || done) return;
    if (running) return;
    persist({ stepIndex, remaining });
    recordSession(stepIndex, remaining, false);
  }, [hydrated, done, running, stepIndex, remaining, persist, recordSession]);

  const reset = useCallback(() => {
    setRunning(false);
    setDone(false);
    setStepIndex(0);
    setRestored(false);
    setRemaining(steps[0].seconds);
    sessionRef.current = null;
    persist({ stepIndex: 0, remaining: steps[0].seconds });
  }, [persist, steps]);

  /** Wipe streak, history and saved position — a true fresh start. */
  const resetAllProgress = useCallback(() => {
    setRunning(false);
    setDone(false);
    setStepIndex(0);
    setRestored(false);
    setRemaining(steps[0].seconds);
    sessionRef.current = null;
    clearProgress();
    setHistory({ ...emptyProgress, remaining: steps[0].seconds });
    saveProgress({ ...emptyProgress, remaining: steps[0].seconds });
  }, [steps]);


  const elapsed = useMemo(
    () => elapsedAt(steps, stepIndex, remaining),
    [steps, stepIndex, remaining],
  );
  const progress = Math.min(100, Math.round((elapsed / totalSeconds) * 100));

  const openZoom = (move: Move, el: HTMLElement) => {
    zoomTrigger.current = el;
    setZoom(move);
  };

  // "z" opens the illustration from a focused thumbnail and closes it again;
  // Escape is handled by the dialog itself.
  const onZoomTriggerKeyDown = (move: Move) => (event: React.KeyboardEvent<HTMLElement>) => {
    if (event.key.toLowerCase() === "z" && !event.metaKey && !event.ctrlKey && !event.altKey) {
      event.preventDefault();
      openZoom(move, event.currentTarget);
    }
  };




  return (
    <div className="mx-auto w-full max-w-2xl space-y-4 p-4 pb-24">
      <div className="flex items-center gap-2">
        <Link
          to="/fitness"
          className="tap-target -ml-1 flex items-center gap-1 rounded-lg px-2 py-1.5 text-sm text-muted-foreground hover:bg-muted"
        >
          <ArrowLeft className="h-4 w-4" /> Fitness
        </Link>
      </div>

      <header className="space-y-2">
        <h1 className="text-2xl font-bold leading-tight">10-Minute Booty Workout</h1>
        <p className="text-sm text-muted-foreground">
          Eight glute-focused moves for women, {settings.workSec} seconds each with{" "}
          {settings.restSec} seconds rest. No equipment, at home. Tap any illustration to see
          the working muscles full size.
        </p>
        <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1 rounded-full border border-border px-2.5 py-1">
            <Clock className="h-3.5 w-3.5" /> {mmss(totalSeconds)} total
          </span>
          <span className="inline-flex items-center gap-1 rounded-full border border-border px-2.5 py-1">
            <Home className="h-3.5 w-3.5" /> No equipment
          </span>
          <span className="rounded-full border border-border px-2.5 py-1">
            {MOVES.length} moves
          </span>
        </div>
      </header>

      {/* Guided timer */}
      <Card className="p-4">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">
              {done ? "Finished" : step.rest ? "Rest — next up" : `Move ${
                MOVES.indexOf(step.move) + 1
              } of ${MOVES.length}`}
            </p>
            <p className="truncate text-lg font-semibold">
              {done ? "Nice work" : moveLabel(step.move)}
            </p>
          </div>
          <p
            className="shrink-0 text-3xl font-bold tabular-nums"
            aria-live="polite"
            aria-label={`${remaining} seconds remaining`}
          >
            {mmss(remaining)}
          </p>
        </div>

        <div
          className="mt-3 h-2 w-full overflow-hidden rounded-full bg-muted"
          role="progressbar"
          aria-valuenow={progress}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="Workout progress"
        >
          <div
            className="h-full rounded-full bg-primary transition-[width] duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => {
              if (done) reset();
              if (done || !running) startSession();
              setRunning((r) => (done ? true : !r));
            }}

            className="tap-target inline-flex flex-1 items-center justify-center gap-2 rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground"
          >
            {running ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
            {done ? "Start again" : running ? "Pause" : elapsed > 0 ? "Resume" : "Start workout"}
          </button>
          <button
            type="button"
            onClick={next}
            disabled={done}
            className="tap-target inline-flex items-center justify-center gap-2 rounded-lg border border-border px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-muted disabled:opacity-50"
          >
            <SkipForward className="h-4 w-4" /> Skip
          </button>
          <button
            type="button"
            onClick={reset}
            className="tap-target inline-flex items-center justify-center gap-2 rounded-lg border border-border px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-muted"
          >
            <RotateCcw className="h-4 w-4" /> Reset
          </button>
        </div>

        {hydrated && restored && !done && (
          <p className="mt-3 rounded-lg bg-muted/60 p-2.5 text-xs text-muted-foreground">
            Picked up where you left off — move {MOVES.indexOf(step.move) + 1} of{" "}
            {MOVES.length}. Use Reset to start from the top.
          </p>
        )}

        {hydrated && history.lastCompletedAt && (
          <p className="mt-3 flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
            <CheckCircle2 className="h-3.5 w-3.5 text-primary" />
            <span>
              Last finished {formatCompletedAt(history.lastCompletedAt)}
              {history.completions > 1 ? ` · ${history.completions} sessions completed` : ""}
            </span>
            <time className="sr-only" dateTime={history.lastCompletedAt}>
              {new Date(history.lastCompletedAt).toLocaleString()}
            </time>
          </p>
        )}


        {done && (
          <Link
            to="/fitness"
            className="mt-3 block rounded-lg border border-border p-3 text-center text-sm font-medium hover:bg-muted"
          >
            Log this session in Fitness
          </Link>
        )}
      </Card>


      {/* Timing & intensity */}
      <Card className="p-4">
        <div className="flex items-center gap-2">
          <SlidersHorizontal className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
          <h2 className="text-base font-semibold">Timing &amp; intensity</h2>
        </div>
        <p className="mt-1 text-xs text-muted-foreground">
          Changing timing restarts the routine from the first move.
        </p>

        <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-3">
          {INTENSITY_PRESETS.map((preset) => {
            const selected = settings.preset === preset.id;
            return (
              <button
                key={preset.id}
                type="button"
                aria-pressed={selected}
                onClick={() =>
                  applySettings({
                    workSec: preset.workSec,
                    restSec: preset.restSec,
                    preset: preset.id,
                  })
                }
                className={`tap-target rounded-lg border p-2.5 text-left ${
                  selected
                    ? "border-primary bg-primary/5 ring-1 ring-primary"
                    : "border-border hover:bg-muted"
                }`}
              >
                <span className="block text-sm font-semibold">{preset.label}</span>
                <span className="block text-xs text-muted-foreground">
                  {preset.workSec}s work · {preset.restSec}s rest
                </span>
                <span className="mt-1 block text-xs text-muted-foreground">
                  {preset.description}
                </span>
              </button>
            );
          })}
        </div>

        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Stepper
            label="Work seconds"
            value={settings.workSec}
            min={WORK_MIN}
            max={WORK_MAX}
            onChange={(workSec) => applySettings({ ...settings, workSec })}
          />
          <Stepper
            label="Rest seconds"
            value={settings.restSec}
            min={REST_MIN}
            max={REST_MAX}
            onChange={(restSec) => applySettings({ ...settings, restSec })}
          />
        </div>

        <p className="mt-3 text-xs text-muted-foreground">
          {settings.preset === "custom" ? "Custom" : "Preset"} · {MOVES.length} moves ·{" "}
          {mmss(totalSeconds)} total
        </p>
      </Card>

      {/* Streak & month summary */}
      {hydrated && stats && (
        <Card className="p-4">
          <h2 className="text-base font-semibold">Your consistency</h2>
          <div className="mt-3 grid grid-cols-2 gap-3">
            <div className="rounded-lg border border-border bg-muted/40 p-3">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Flame className="h-4 w-4 text-primary" aria-hidden="true" />
                <span className="text-xs font-medium">Weekly streak</span>
              </div>
              <p className="mt-1 text-2xl font-semibold tabular-nums">
                {stats.weeklyStreak}
                <span className="ml-1 text-sm font-normal text-muted-foreground">
                  {stats.weeklyStreak === 1 ? "week" : "weeks"}
                </span>
              </p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {stats.weeklyStreak === 0
                  ? "Finish a workout to start your streak"
                  : stats.activeThisWeek
                    ? "This week is already logged"
                    : "Work out this week to keep it alive"}
              </p>
            </div>
            <div className="rounded-lg border border-border bg-muted/40 p-3">
              <div className="flex items-center gap-2 text-muted-foreground">
                <CalendarCheck
                  className="h-4 w-4 text-primary"
                  aria-hidden="true"
                />
                <span className="text-xs font-medium">{monthLabel}</span>
              </div>
              <p className="mt-1 text-2xl font-semibold tabular-nums">
                {stats.daysThisMonth}
                <span className="ml-1 text-sm font-normal text-muted-foreground">
                  {stats.daysThisMonth === 1 ? "day" : "days"}
                </span>
              </p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Completed out of {stats.daysElapsedThisMonth} days so far
              </p>
            </div>
          </div>

          {/* Monthly goal */}
          <div className="mt-3 rounded-lg border border-border p-3">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Target className="h-4 w-4 text-primary" aria-hidden="true" />
                <span className="text-xs font-medium">Monthly goal</span>
              </div>
              {goal === null ? (
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 px-3 text-xs"
                  onClick={() => {
                    updateGoal(DEFAULT_GOAL);
                    setEditingGoal(true);
                  }}
                >
                  Set a goal
                </Button>
              ) : (
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-8 px-3 text-xs"
                  aria-expanded={editingGoal}
                  onClick={() => setEditingGoal((v) => !v)}
                >
                  {editingGoal ? "Done" : "Edit"}
                </Button>
              )}
            </div>

            {goal === null ? (
              <p className="mt-2 text-xs text-muted-foreground">
                Pick how many days you want to complete this month and track your
                progress here.
              </p>
            ) : (
              (() => {
                const g = goalProgress(goal, stats.daysThisMonth);
                return (
                  <>
                    <p className="mt-2 text-sm font-medium tabular-nums">
                      {g.done} of {g.goal} days
                      <span className="ml-2 text-xs font-normal text-muted-foreground">
                        {g.percent}%
                      </span>
                    </p>
                    <Progress
                      value={g.percent}
                      className="mt-2 h-2"
                      aria-label={`Monthly goal progress: ${g.done} of ${g.goal} days completed in ${monthLabel}`}
                    />
                    <p className="mt-1.5 text-xs text-muted-foreground">
                      {g.reached
                        ? `Goal reached for ${monthLabel} — every extra day is a bonus.`
                        : g.onTrack
                          ? `${g.remaining} to go · ${g.daysLeftInMonth} ${g.daysLeftInMonth === 1 ? "day" : "days"} left in ${monthLabel}`
                          : `${g.remaining} to go but only ${g.daysLeftInMonth} ${g.daysLeftInMonth === 1 ? "day" : "days"} left — consider easing the goal.`}
                    </p>

                    {editingGoal && (
                      <div className="mt-3 border-t border-border pt-3">
                        <label
                          htmlFor="booty-monthly-goal"
                          className="block text-xs font-medium text-muted-foreground"
                        >
                          Days per month
                        </label>
                        <div className="mt-1 flex items-center gap-2">
                          <button
                            type="button"
                            aria-label="Decrease monthly goal"
                            disabled={goal <= GOAL_MIN}
                            onClick={() => updateGoal(goal - 1)}
                            className="tap-target flex h-9 w-9 items-center justify-center rounded-lg border border-border text-muted-foreground hover:bg-muted disabled:opacity-40"
                          >
                            <Minus className="h-4 w-4" aria-hidden="true" />
                          </button>
                          <input
                            id="booty-monthly-goal"
                            type="number"
                            inputMode="numeric"
                            min={GOAL_MIN}
                            max={GOAL_MAX}
                            value={goal}
                            onChange={(e) => {
                              const next = Number(e.target.value);
                              if (!Number.isFinite(next)) return;
                              updateGoal(next);
                            }}
                            className="h-9 w-full rounded-lg border border-border bg-background px-2 text-center text-sm tabular-nums"
                          />
                          <button
                            type="button"
                            aria-label="Increase monthly goal"
                            disabled={goal >= GOAL_MAX}
                            onClick={() => updateGoal(goal + 1)}
                            className="tap-target flex h-9 w-9 items-center justify-center rounded-lg border border-border text-muted-foreground hover:bg-muted disabled:opacity-40"
                          >
                            <Plus className="h-4 w-4" aria-hidden="true" />
                          </button>
                        </div>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="mt-2 h-8 px-2 text-xs text-muted-foreground"
                          onClick={removeGoal}
                        >
                          Remove goal
                        </Button>
                      </div>
                    )}
                  </>
                );
              })()
            )}
          </div>

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="outline" size="sm" className="mt-3 w-full gap-2">
                <Trash2 className="h-4 w-4" aria-hidden="true" />
                Reset progress
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Reset workout progress?</AlertDialogTitle>
                <AlertDialogDescription>
                  This clears your weekly streak, monthly completions and all
                  saved sessions for the 10-Minute Booty Workout, and starts the
                  routine over from the first move. Your timing settings stay as
                  they are. This can't be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Keep my progress</AlertDialogCancel>
                <AlertDialogAction onClick={resetAllProgress}>
                  Reset everything
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </Card>

      )}

      {/* Completion chart */}
      <Card className="p-4">
        <BootyWorkoutChart
          progress={history}
          status={hydrated ? historyStatus : "loading"}
          onRetry={loadHistory}
          scheduleTo="/fitness"
        />
      </Card>

      {/* Workout history */}
      {hydrated && history.sessions.length > 0 && (
        <Card className="p-4">
          <div className="flex items-baseline justify-between gap-2">
            <h2 className="text-base font-semibold">Workout history</h2>
            <span className="text-xs text-muted-foreground">
              {history.sessions.length} session
              {history.sessions.length === 1 ? "" : "s"}
            </span>
          </div>
          <ul className="mt-3 divide-y divide-border">
            {history.sessions.map((session: BootyWorkoutSession) => (
              <li key={session.id} className="flex items-start gap-3 py-2.5">
                <span
                  className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${
                    session.completed
                      ? "bg-primary/10 text-primary"
                      : "bg-muted text-muted-foreground"
                  }`}
                  aria-hidden="true"
                >
                  {session.completed ? (
                    <CheckCircle2 className="h-3.5 w-3.5" />
                  ) : (
                    <Clock className="h-3.5 w-3.5" />
                  )}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">
                    <time dateTime={session.endedAt}>
                      {formatSessionDate(session.endedAt)}
                    </time>
                    <span className="ml-2 font-normal text-muted-foreground">
                      {formatDuration(session.durationSec)}
                    </span>
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {session.completed
                      ? `Completed all ${session.totalMoves} moves`
                      : `Stopped on ${session.lastMove} — move ${session.lastMoveIndex} of ${session.totalMoves}`}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </Card>
      )}


      {/* Exercise list */}
      <ol className="space-y-3">
        {MOVES.map((move, i) => {
          const active = !done && step.move === move && !step.rest;
          return (
            <li key={`${move.name}-${move.side ?? ""}`}>
              <Card
                className={`flex items-center gap-3 p-3 ${
                  active ? "ring-2 ring-primary" : ""
                }`}
              >
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                  {i + 1}
                </span>
                <button
                  type="button"
                  onClick={(e) => openZoom(move, e.currentTarget)}
                  onKeyDown={onZoomTriggerKeyDown(move)}
                  aria-haspopup="dialog"
                  aria-expanded={zoom === move}
                  aria-keyshortcuts="Enter Space Z"
                  title={`Enlarge ${moveLabel(move)} illustration (Z)`}
                  aria-label={`Enlarge ${moveLabel(move)} illustration. ${move.alt}. Press Enter or Z to open, Escape to close.`}
                  className="tap-target shrink-0 cursor-zoom-in rounded-md focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                >
                  <img
                    src={move.art}
                    alt=""
                    aria-hidden="true"
                    width={64}
                    height={64}
                    loading="lazy"
                    className="h-16 w-16 rounded-md border border-border bg-background object-cover"
                  />
                </button>
                <div className="min-w-0">
                  <p className="text-sm font-semibold">{moveLabel(move)}</p>
                  <p className="text-xs text-muted-foreground">{settings.workSec} sec</p>
                  <p className="mt-1 text-xs text-muted-foreground">{move.cue}</p>
                </div>
              </Card>
            </li>
          );
        })}
      </ol>

      <p className="text-xs text-muted-foreground">
        Consistency is the key — run this every day or on alternating days, and stop if any
        movement causes pain.
      </p>

      <Dialog
        open={zoom !== null}
        onOpenChange={(open) => {
          if (!open) setZoom(null);
        }}
      >
        <DialogContent
          className="max-w-2xl p-0 sm:p-0"
          aria-keyshortcuts="Escape Z"
          onKeyDown={(event) => {
            if (
              event.key.toLowerCase() === "z" &&
              !event.metaKey &&
              !event.ctrlKey &&
              !event.altKey
            ) {
              event.preventDefault();
              setZoom(null);
            }
          }}
          onCloseAutoFocus={(event) => {
            const trigger = zoomTrigger.current;
            if (trigger && trigger.isConnected) {
              trigger.focus({ preventScroll: true });
              event.preventDefault();
            }
          }}
        >
          <DialogHeader className="sr-only">
            <DialogTitle>{zoom ? moveLabel(zoom) : "Exercise"} illustration</DialogTitle>
            <DialogDescription>{zoom?.alt}</DialogDescription>
          </DialogHeader>
          {zoom && (
            <figure className="flex flex-col items-center p-4 sm:p-6">
              <img
                src={zoom.art}
                alt=""
                aria-hidden="true"
                width={816}
                height={816}
                className="max-h-[70vh] w-full rounded-lg object-contain"
              />
              <figcaption className="mt-4 text-center">
                <span className="block text-sm font-medium">{moveLabel(zoom)}</span>
                <span className="mt-1 block text-xs text-muted-foreground">{zoom.cue}</span>
                <span className="mt-2 block text-xs text-muted-foreground">
                  Press <kbd className="rounded border border-border px-1">Esc</kbd> or{" "}
                  <kbd className="rounded border border-border px-1">Z</kbd> to close.
                </span>
              </figcaption>
            </figure>
          )}
        </DialogContent>
      </Dialog>

      <DisclaimerFooter />
    </div>
  );
}
