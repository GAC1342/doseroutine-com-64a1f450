import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Pause,
  Play,
  RotateCcw,
  SkipBack,
  SkipForward,
  Volume2,
  VolumeX,
  Vibrate,
  Maximize2,
  Star,
  Trash2,
  Minimize2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import {
  DEFAULT_CONFIG,
  TIMER_PRESETS,
  buildPhases,
  describeConfig,
  formatClock,
  phaseStartOffsets,
  positionAt,
  sanitizeConfig,
  totalSeconds,
  transitionCue,
  type CueKind,
  type PhaseKind,
  type TimerConfig,
} from "@/lib/interval-timer";
import {
  addFavorite,
  loadFavorites,
  removeFavorite,
  setFavoriteLockScreen,
  type FavoriteTimerPreset,
} from "@/lib/timer-favorites";

const STORAGE_KEY = "dr.workout-timer.config";
const PREFS_KEY = "dr.workout-timer.prefs";

type Prefs = { sound: boolean; vibrate: boolean; keepAwake: boolean };
const DEFAULT_PREFS: Prefs = { sound: true, vibrate: true, keepAwake: true };

function readStored<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? { ...fallback, ...(JSON.parse(raw) as object) } : fallback;
  } catch {
    return fallback;
  }
}

function writeStored(key: string, value: unknown) {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* private mode — the timer still works, it just won't remember */
  }
}

/** Short synthesized beeps — no audio files to download or fail to load. */
function useCueAudio(enabled: boolean) {
  const ctxRef = useRef<AudioContext | null>(null);

  const unlock = useCallback(() => {
    if (typeof window === "undefined") return;
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Safari prefix
      const Ctor = window.AudioContext ?? (window as any).webkitAudioContext;
      if (!Ctor) return;
      ctxRef.current ??= new Ctor();
      void ctxRef.current?.resume();
    } catch {
      /* audio is a nicety */
    }
  }, []);

  const play = useCallback(
    (cue: CueKind) => {
      if (!enabled || !cue) return;
      const ctx = ctxRef.current;
      if (!ctx) return;
      const tones: Record<Exclude<CueKind, null>, { freq: number; beeps: number; len: number }> = {
        countdown: { freq: 660, beeps: 1, len: 0.09 },
        work: { freq: 990, beeps: 2, len: 0.14 },
        rest: { freq: 440, beeps: 1, len: 0.22 },
        finish: { freq: 780, beeps: 3, len: 0.2 },
      };
      const tone = tones[cue];
      for (let i = 0; i < tone.beeps; i += 1) {
        const at = ctx.currentTime + i * (tone.len + 0.07);
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sine";
        osc.frequency.value = tone.freq;
        gain.gain.setValueAtTime(0.0001, at);
        gain.gain.exponentialRampToValueAtTime(0.28, at + 0.01);
        gain.gain.exponentialRampToValueAtTime(0.0001, at + tone.len);
        osc.connect(gain).connect(ctx.destination);
        osc.start(at);
        osc.stop(at + tone.len + 0.02);
      }
    },
    [enabled],
  );

  return { unlock, play };
}

function buzz(pattern: number | number[], enabled: boolean) {
  if (!enabled || typeof navigator === "undefined") return;
  try {
    navigator.vibrate?.(pattern);
  } catch {
    /* unsupported */
  }
  // Native iOS has no navigator.vibrate — go through Capacitor Haptics there.
  void (async () => {
    try {
      const { Haptics, ImpactStyle } = await import("@capacitor/haptics");
      await Haptics.impact({ style: ImpactStyle.Medium });
    } catch {
      /* web or plugin missing */
    }
  })();
}

const PHASE_STYLE: Record<PhaseKind, { tint: string; ring: string; word: string }> = {
  prepare: { tint: "bg-muted", ring: "text-muted-foreground", word: "Get ready" },
  work: { tint: "bg-primary/15", ring: "text-primary", word: "Work" },
  rest: { tint: "bg-secondary/20", ring: "text-secondary-foreground", word: "Rest" },
  cycleRest: { tint: "bg-secondary/20", ring: "text-secondary-foreground", word: "Cycle break" },
  cooldown: { tint: "bg-muted", ring: "text-muted-foreground", word: "Cool down" },
};

export function WorkoutTimer({ className }: { className?: string }) {
  const [config, setConfig] = useState<TimerConfig>(DEFAULT_CONFIG);
  const [prefs, setPrefs] = useState<Prefs>(DEFAULT_PREFS);
  const [running, setRunning] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [focusMode, setFocusMode] = useState(false);
  const [wakeLockFailed, setWakeLockFailed] = useState(false);
  const [favorites, setFavorites] = useState<FavoriteTimerPreset[]>([]);
  const [favoriteName, setFavoriteName] = useState("");
  const [favoriteLock, setFavoriteLock] = useState(true);

  // Wall-clock anchor: elapsed = (now - startedAt)/1000 + offsetAtStart.
  const anchorRef = useRef<{ at: number; offset: number } | null>(null);
  const lastCueRef = useRef<{ index: number; second: number }>({ index: -2, second: -1 });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- WakeLockSentinel isn't in every lib.dom
  const wakeRef = useRef<any>(null);

  const { unlock, play } = useCueAudio(prefs.sound);

  useEffect(() => {
    setConfig(sanitizeConfig(readStored(STORAGE_KEY, DEFAULT_CONFIG)));
    setPrefs(readStored(PREFS_KEY, DEFAULT_PREFS));
    setFavorites(loadFavorites());
  }, []);

  const phases = useMemo(() => buildPhases(config), [config]);
  const total = useMemo(() => totalSeconds(phases), [phases]);
  const offsets = useMemo(() => phaseStartOffsets(phases), [phases]);
  const position = useMemo(() => positionAt(phases, elapsed), [phases, elapsed]);

  // ── Ticking ──────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!running) return;
    let frame = 0;
    const tick = () => {
      const anchor = anchorRef.current;
      if (anchor) {
        const next = anchor.offset + (Date.now() - anchor.at) / 1000;
        setElapsed(next >= total ? total : next);
        if (next >= total) setRunning(false);
      }
      frame = window.setTimeout(tick, 100);
    };
    tick();
    return () => window.clearTimeout(frame);
  }, [running, total]);

  // ── Cues ─────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!running) return;
    const second = position.remaining;
    const last = lastCueRef.current;
    if (last.index === position.index && last.second === second) return;

    const changedPhase = last.index !== position.index;
    lastCueRef.current = { index: position.index, second };

    if (position.done) {
      play("finish");
      buzz([180, 90, 180, 90, 260], prefs.vibrate);
      return;
    }
    if (changedPhase && position.phase) {
      const cue = transitionCue(position.phase.kind);
      play(cue);
      buzz(position.phase.kind === "work" ? [140, 70, 140] : 160, prefs.vibrate);
      return;
    }
    if (second <= 3 && second > 0) {
      play("countdown");
      buzz(45, prefs.vibrate);
    }
  }, [position, running, play, prefs.vibrate]);

  // ── Screen wake lock (lock-screen friendly mode) ─────────────────────────
  useEffect(() => {
    let cancelled = false;
    async function acquire() {
      if (!running || !prefs.keepAwake) return;
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- wakeLock is still vendor-gated in some browsers
        const wl = (navigator as any).wakeLock;
        if (!wl?.request) {
          setWakeLockFailed(true);
          return;
        }
        const sentinel = await wl.request("screen");
        if (cancelled) {
          void sentinel.release?.();
          return;
        }
        wakeRef.current = sentinel;
        setWakeLockFailed(false);
      } catch {
        setWakeLockFailed(true);
      }
    }
    void acquire();
    return () => {
      cancelled = true;
      try {
        void wakeRef.current?.release?.();
      } catch {
        /* already gone */
      }
      wakeRef.current = null;
    };
  }, [running, prefs.keepAwake]);

  // Re-acquire after the user returns from a locked screen or another tab.
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState !== "visible") return;
      // Re-derive from the wall clock so the display is instantly correct.
      const anchor = anchorRef.current;
      if (running && anchor) {
        const next = Math.min(total, anchor.offset + (Date.now() - anchor.at) / 1000);
        setElapsed(next);
      }
      if (running && prefs.keepAwake && !wakeRef.current) setPrefs((p) => ({ ...p }));
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [running, total, prefs.keepAwake]);

  const persistConfig = (next: TimerConfig) => {
    const safe = sanitizeConfig(next);
    setConfig(safe);
    writeStored(STORAGE_KEY, safe);
    reset(safe);
  };

  const persistPrefs = (patch: Partial<Prefs>) => {
    const next = { ...prefs, ...patch };
    setPrefs(next);
    writeStored(PREFS_KEY, next);
  };

  /** Save the current custom config as a named favourite. */
  const saveFavorite = () => {
    const name = favoriteName.trim() || describeConfig(config).slice(0, 40);
    setFavorites(addFavorite(favorites, { name, config, lockScreen: favoriteLock }));
    setFavoriteName("");
  };

  /**
   * One tap: load the favourite, apply lock-screen friendly mode when it was
   * saved that way, and start immediately from zero.
   */
  const startFavorite = (fav: FavoriteTimerPreset) => {
    unlock(); // inside the user gesture, or iOS stays silent
    const safe = sanitizeConfig(fav.config);
    setConfig(safe);
    writeStored(STORAGE_KEY, safe);
    if (fav.lockScreen) {
      persistPrefs({ keepAwake: true });
      setFocusMode(true);
    }
    lastCueRef.current = { index: -2, second: -1 };
    setElapsed(0);
    anchorRef.current = { at: Date.now(), offset: 0 };
    setRunning(true);
  };

  function reset(_cfg?: TimerConfig) {
    setRunning(false);
    setElapsed(0);
    anchorRef.current = null;
    lastCueRef.current = { index: -2, second: -1 };
  }

  const startPause = () => {
    unlock(); // must happen inside the user gesture or iOS stays silent
    if (running) {
      anchorRef.current = null;
      setRunning(false);
      return;
    }
    const from = position.done ? 0 : elapsed;
    anchorRef.current = { at: Date.now(), offset: from };
    setElapsed(from);
    setRunning(true);
  };

  const jumpToPhase = (delta: number) => {
    const currentIndex = position.done ? phases.length : position.index;
    const target = Math.max(0, Math.min(phases.length - 1, currentIndex + delta));
    const offset = offsets[target] ?? 0;
    setElapsed(offset);
    lastCueRef.current = { index: -2, second: -1 };
    if (running) anchorRef.current = { at: Date.now(), offset };
  };

  const phaseKind: PhaseKind = position.phase?.kind ?? "prepare";
  const style = PHASE_STYLE[phaseKind];
  const phaseSeconds = position.phase?.seconds ?? 1;
  const progress = position.phase ? 1 - position.remaining / phaseSeconds : 1;
  const workRoundsDone = phases
    .slice(0, Math.max(0, position.done ? phases.length : position.index))
    .filter((p) => p.kind === "work").length;
  const totalWorkRounds = phases.filter((p) => p.kind === "work").length;

  return (
    <div
      className={cn(
        "space-y-4",
        focusMode && "fixed inset-0 z-50 overflow-y-auto bg-background p-4",
        className,
      )}
    >
      {/* Clock */}
      <Card
        className={cn(
          "relative overflow-hidden rounded-3xl border-border p-6 text-center transition-colors",
          style.tint,
          focusMode && "min-h-[70vh] flex flex-col justify-center",
        )}
        aria-live="polite"
      >
        <div className="absolute inset-x-0 top-0 h-1.5 bg-border">
          <div
            className="h-full bg-primary transition-[width] duration-200"
            style={{ width: `${Math.min(100, Math.max(0, progress * 100))}%` }}
          />
        </div>

        <p className={cn("text-sm font-semibold uppercase tracking-[0.2em]", style.ring)}>
          {position.done ? "Finished" : style.word}
        </p>
        <p
          className={cn(
            "mt-2 font-display font-bold tabular-nums leading-none",
            focusMode ? "text-[22vw] sm:text-[16rem]" : "text-7xl sm:text-8xl",
          )}
        >
          {formatClock(position.done ? 0 : position.remaining)}
        </p>
        <p className="mt-3 text-sm text-muted-foreground">
          {position.done
            ? `${totalWorkRounds} rounds done — nice work.`
            : (position.phase?.label ?? "Ready")}
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          Round {Math.min(totalWorkRounds, workRoundsDone + (phaseKind === "work" ? 1 : 0))} /{" "}
          {totalWorkRounds} · {formatClock(position.totalRemaining)} left of {formatClock(total)}
        </p>

        <div className="mt-6 flex items-center justify-center gap-3">
          <Button
            type="button"
            variant="secondary"
            size="icon"
            aria-label="Previous interval"
            onClick={() => jumpToPhase(-1)}
          >
            <SkipBack className="h-5 w-5" />
          </Button>
          <Button
            type="button"
            size="lg"
            className="h-16 w-32 rounded-full text-lg"
            onClick={startPause}
          >
            {running ? <Pause className="mr-2 h-6 w-6" /> : <Play className="mr-2 h-6 w-6" />}
            {running ? "Pause" : position.elapsed > 0 && !position.done ? "Resume" : "Start"}
          </Button>
          <Button
            type="button"
            variant="secondary"
            size="icon"
            aria-label="Next interval"
            onClick={() => jumpToPhase(1)}
          >
            <SkipForward className="h-5 w-5" />
          </Button>
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
          <Button type="button" variant="ghost" size="sm" onClick={() => reset()}>
            <RotateCcw className="mr-1.5 h-4 w-4" /> Reset
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            aria-pressed={prefs.sound}
            onClick={() => {
              unlock();
              persistPrefs({ sound: !prefs.sound });
            }}
          >
            {prefs.sound ? (
              <Volume2 className="mr-1.5 h-4 w-4" />
            ) : (
              <VolumeX className="mr-1.5 h-4 w-4" />
            )}
            Sound {prefs.sound ? "on" : "off"}
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            aria-pressed={prefs.vibrate}
            onClick={() => persistPrefs({ vibrate: !prefs.vibrate })}
          >
            <Vibrate className="mr-1.5 h-4 w-4" /> Buzz {prefs.vibrate ? "on" : "off"}
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            aria-pressed={focusMode}
            onClick={() => setFocusMode((v) => !v)}
          >
            {focusMode ? (
              <Minimize2 className="mr-1.5 h-4 w-4" />
            ) : (
              <Maximize2 className="mr-1.5 h-4 w-4" />
            )}
            {focusMode ? "Exit big view" : "Big view"}
          </Button>
        </div>
      </Card>

      {!focusMode && (
        <>
          {/* Favourites */}
          <Card className="rounded-2xl border-border p-4">
            <h2 className="text-sm font-semibold">My favourites</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Save the round setup you use most and start it in one tap — lock-screen friendly mode
              keeps the screen awake and opens the big view automatically.
            </p>

            {favorites.length > 0 && (
              <ul className="mt-3 space-y-2">
                {favorites.map((fav) => (
                  <li
                    key={fav.id}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border p-3"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{fav.name}</p>
                      <p className="text-xs text-muted-foreground">{describeConfig(fav.config)}</p>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Button type="button" size="sm" onClick={() => startFavorite(fav)}>
                        <Play className="mr-1.5 h-4 w-4" /> Start
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        aria-pressed={fav.lockScreen}
                        title="Lock-screen friendly mode"
                        onClick={() =>
                          setFavorites(setFavoriteLockScreen(favorites, fav.id, !fav.lockScreen))
                        }
                      >
                        Lock screen: {fav.lockScreen ? "on" : "off"}
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        aria-label={`Delete favourite ${fav.name}`}
                        onClick={() => setFavorites(removeFavorite(favorites, fav.id))}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
            )}

            <div className="mt-3 flex flex-wrap items-end gap-2">
              <div className="min-w-[10rem] flex-1">
                <Label htmlFor="timer-fav-name" className="text-xs">
                  Name this setup
                </Label>
                <Input
                  id="timer-fav-name"
                  value={favoriteName}
                  maxLength={40}
                  placeholder="Morning Tabata"
                  onChange={(e) => setFavoriteName(e.target.value)}
                />
              </div>
              <Button
                type="button"
                variant={favoriteLock ? "default" : "secondary"}
                size="sm"
                aria-pressed={favoriteLock}
                onClick={() => setFavoriteLock((v) => !v)}
              >
                Lock screen: {favoriteLock ? "on" : "off"}
              </Button>
              <Button type="button" variant="secondary" size="sm" onClick={saveFavorite}>
                <Star className="mr-1.5 h-4 w-4" /> Save favourite
              </Button>
            </div>
          </Card>

          {/* Presets */}

          <Card className="rounded-2xl border-border p-4">
            <h2 className="text-sm font-semibold">Presets</h2>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              {TIMER_PRESETS.map((preset) => (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => persistConfig(preset.config)}
                  className="tap-target rounded-xl border border-border p-3 text-left transition hover:border-primary"
                >
                  <p className="text-sm font-medium">{preset.name}</p>
                  <p className="text-xs text-muted-foreground">{preset.blurb}</p>
                </button>
              ))}
            </div>
          </Card>

          {/* Custom config */}
          <Card className="rounded-2xl border-border p-4">
            <h2 className="text-sm font-semibold">Customize</h2>
            <p className="mt-1 text-xs text-muted-foreground">{describeConfig(config)}</p>
            <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
              {(
                [
                  ["prepareSec", "Get ready (s)"],
                  ["workSec", "Work (s)"],
                  ["restSec", "Rest (s)"],
                  ["rounds", "Rounds"],
                  ["cycles", "Cycles"],
                  ["cycleRestSec", "Cycle break (s)"],
                  ["cooldownSec", "Cool down (s)"],
                ] as [keyof TimerConfig, string][]
              ).map(([key, label]) => (
                <div key={key}>
                  <Label htmlFor={`timer-${key}`} className="text-xs">
                    {label}
                  </Label>
                  <Input
                    id={`timer-${key}`}
                    type="number"
                    inputMode="numeric"
                    min={0}
                    value={config[key]}
                    onChange={(e) => persistConfig({ ...config, [key]: Number(e.target.value) })}
                  />
                </div>
              ))}
            </div>
          </Card>

          {/* Lock-screen friendly mode */}
          <Card className="rounded-2xl border-border p-4">
            <h2 className="text-sm font-semibold">Lock-screen friendly</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Keeps the screen awake while the timer runs, and every interval change is announced
              with a beep and a buzz so you can set the phone down and just listen.
            </p>
            <Button
              type="button"
              variant={prefs.keepAwake ? "default" : "secondary"}
              size="sm"
              className="mt-3"
              aria-pressed={prefs.keepAwake}
              onClick={() => persistPrefs({ keepAwake: !prefs.keepAwake })}
            >
              Keep screen awake: {prefs.keepAwake ? "on" : "off"}
            </Button>
            {prefs.keepAwake && wakeLockFailed && (
              <p className="mt-2 text-xs text-muted-foreground">
                This browser won&apos;t let a web page hold the screen on. The timer still runs
                correctly if the screen locks — the countdown catches up from the clock, and cues
                keep playing while the tab is active.
              </p>
            )}
          </Card>
        </>
      )}
    </div>
  );
}
