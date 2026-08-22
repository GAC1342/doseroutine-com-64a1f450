import { useCallback, useEffect, useState } from "react";
import { canonicalLinks } from "@/lib/hreflang";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { Dumbbell, Loader2, Check, ArrowRight, Share2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { AttributionFooter } from "@/components/attribution-footer";
import { supabase } from "@/integrations/supabase/client";
import { exerciseArt, exerciseArtAlt } from "@/lib/exercise-art";
import { workoutTypeLabel } from "@/lib/workout-types";
import {
  formatExerciseDetail,
  formatPace,
  routineSummary,
  type SharedRoutine,
} from "@/lib/shared-routine";
import { fetchSharedRoutine, recordSharedRoutineView } from "@/lib/shared-routine.functions";
import {
  consumePendingRoutineSave,
  rememberPendingRoutineSave,
  saveSharedRoutineToAccount,
} from "@/lib/routine-shares";

const OG_IMAGE = "https://doseroutine.com/og/doseroutine-home.jpg";

export const routineQuery = (publicId: string) =>
  queryOptions({
    queryKey: ["shared-routine", publicId],
    queryFn: (): Promise<SharedRoutine | null> => fetchSharedRoutine({ data: { publicId } }),
    staleTime: 60_000,
  });

export const Route = createFileRoute("/r/$publicId")({
  validateSearch: (search: Record<string, unknown>): { save?: boolean } =>
    search["save"] === "1" || search["save"] === true ? { save: true } : {},
  loader: async ({ context, params }) => {
    const routine = await context.queryClient.ensureQueryData(routineQuery(params.publicId));
    return { routine };
  },
  head: ({ params, loaderData }) => {
    const routine = loaderData?.routine ?? null;
    const name = routine?.routine_name ?? "Shared workout routine";
    const desc = routine
      ? routineSummary(routine)
      : "A workout routine shared from DoseRoutine — exercises, sets, reps, weight and rest.";
    const url = `https://doseroutine.com/r/${params.publicId}`;
    return {
      meta: [
        { title: `${name} — DoseRoutine` },
        { name: "description", content: desc },
        { name: "robots", content: "noindex, nofollow" },
        { property: "og:title", content: name },
        { property: "og:description", content: desc },
        { property: "og:type", content: "website" },
        { property: "og:url", content: url },
        { property: "og:site_name", content: "DoseRoutine" },
        { property: "og:image", content: OG_IMAGE },
        { property: "og:image:width", content: "1200" },
        { property: "og:image:height", content: "630" },
        { name: "twitter:card", content: "summary_large_image" },
        { name: "twitter:title", content: name },
        { name: "twitter:description", content: desc },
        { name: "twitter:image", content: OG_IMAGE },
      ],
      links: [...canonicalLinks(url)],
    };
  },
  errorComponent: () => <NotShared />,
  notFoundComponent: () => <NotShared />,
  component: SharedRoutinePage,
});

export function NotShared() {
  return (
    <main
      id="main-content"
      tabIndex={-1}
      className="mx-auto flex min-h-[60vh] max-w-lg flex-col items-center justify-center px-6 text-center"
    >
      <h1 className="font-display text-2xl font-semibold">This routine is no longer shared</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        The owner turned this link off, or the address is incorrect.
      </p>
      <Link
        to="/"
        className="mt-6 inline-flex h-11 items-center gap-2 rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground"
      >
        Go to DoseRoutine <ArrowRight className="h-4 w-4" />
      </Link>
    </main>
  );
}

function SharedRoutinePage() {
  const { publicId } = Route.useParams();
  const search = Route.useSearch();
  const navigate = useNavigate();
  const { data } = useSuspenseQuery(routineQuery(publicId));

  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // View counting, deduped per browser session.
  useEffect(() => {
    if (!data) return;
    const key = `doseroutine:viewed-routine:${publicId}`;
    try {
      if (window.sessionStorage.getItem(key)) return;
      window.sessionStorage.setItem(key, "1");
    } catch {
      /* private mode: count the view anyway */
    }
    void recordSharedRoutineView({ data: { publicId } }).catch(() => undefined);
  }, [data, publicId]);

  const save = useCallback(async () => {
    if (!data) return;
    setError(null);
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) {
      rememberPendingRoutineSave(publicId);
      const dest = encodeURIComponent(`/r/${publicId}?save=1`);
      window.location.assign(`/auth?redirect=${dest}`);
      return;
    }
    setSaving(true);
    try {
      await saveSharedRoutineToAccount(data);
      setSaved(true);
    } catch {
      setError("Could not save this routine. Try again.");
    } finally {
      setSaving(false);
    }
  }, [data, publicId]);

  // Finish the save the visitor started before signing in.
  useEffect(() => {
    if (!search.save || !data) return;
    const pending = consumePendingRoutineSave();
    void navigate({ to: "/r/$publicId", params: { publicId }, replace: true });
    if (pending && pending !== publicId) return;
    void save();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search.save, data]);

  if (!data) return <NotShared />;

  const pace = formatPace(data.target_pace_s);

  return (
    <main id="main-content" tabIndex={-1} className="min-h-dvh bg-background">
      <div className="mx-auto max-w-2xl px-4 pb-16 pt-8 sm:px-6">
        <div className="flex items-center justify-between gap-3">
          <Link to="/" className="text-xs font-semibold text-primary hover:underline">
            DoseRoutine
          </Link>
          <span className="inline-flex items-center gap-1 rounded-full bg-muted px-3 py-1 text-xs font-medium text-muted-foreground">
            <Share2 className="h-3 w-3" /> Shared routine · read-only
          </span>
        </div>

        <header className="mt-6">
          <h1 className="font-display text-3xl font-semibold tracking-tight">
            {data.routine_name}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">{routineSummary(data)}</p>
          {data.owner_name && (
            <p className="mt-1 text-sm text-muted-foreground">Shared by {data.owner_name}</p>
          )}
          <div className="mt-3 flex flex-wrap gap-2 text-xs">
            <Pill>{workoutTypeLabel(data.workout_type)}</Pill>
            {data.duration_min ? <Pill>{Math.round(data.duration_min)} min</Pill> : null}
            {data.rpe ? <Pill>RPE {Math.round(data.rpe)}</Pill> : null}
            {pace ? <Pill>{pace} pace</Pill> : null}
            {data.target_hr ? <Pill>{Math.round(data.target_hr)} bpm target</Pill> : null}
          </div>
        </header>

        {data.exercises.length === 0 ? (
          <Card className="mt-8 rounded-2xl border-border p-8 text-center text-sm text-muted-foreground">
            This routine doesn't list any exercises yet.
          </Card>
        ) : (
          <ol className="mt-6 space-y-3">
            {data.exercises.map((ex, index) => {
              const art = exerciseArt(ex.exercise);
              const detail = formatExerciseDetail(ex);
              return (
                <li
                  key={`${ex.exercise}-${index}`}
                  className="flex items-center gap-3 rounded-2xl border border-border bg-card p-3 shadow-sm"
                >
                  {art ? (
                    <img
                      src={art}
                      alt={exerciseArtAlt(ex.exercise)}
                      title={ex.exercise}
                      width={48}
                      height={48}
                      loading="lazy"
                      className="h-12 w-12 shrink-0 rounded-lg bg-muted object-cover"
                    />
                  ) : (
                    <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                      <Dumbbell className="h-5 w-5" aria-hidden />
                    </span>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">{ex.exercise}</p>
                    {detail && (
                      <p className="mt-0.5 font-mono text-xs text-muted-foreground">{detail}</p>
                    )}
                  </div>
                  <span className="shrink-0 text-xs font-medium text-muted-foreground">
                    {index + 1}
                  </span>
                </li>
              );
            })}
          </ol>
        )}

        <Card className="mt-8 rounded-2xl border-border p-5 text-center">
          <button
            type="button"
            onClick={() => void save()}
            disabled={saving || saved}
            className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground shadow-sm hover:bg-[color:var(--primary-hover)] disabled:opacity-60"
          >
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : saved ? (
              <Check className="h-4 w-4" />
            ) : null}
            {saved ? "Saved to your routines" : "Save to DoseRoutine"}
          </button>
          {error && (
            <p role="alert" className="mt-2 text-xs font-medium text-destructive">
              {error}
            </p>
          )}
          {saved ? (
            <Link
              to="/fitness"
              className="mt-3 inline-block text-xs font-semibold text-primary hover:underline"
            >
              Open it in your routines
            </Link>
          ) : (
            <p className="mt-2 text-xs text-muted-foreground">
              Free to start. Copies this routine into your own account.
            </p>
          )}
          <Link
            to="/install"
            className="mt-4 inline-block text-xs font-semibold text-primary hover:underline"
          >
            Get the app
          </Link>
        </Card>

        <p className="mt-6 text-center text-xs text-muted-foreground">
          Training information only — not medical advice. Illustrations are DoseRoutine's own.
        </p>
        <AttributionFooter />
      </div>
    </main>
  );
}

function Pill({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-full bg-muted px-3 py-1 font-medium text-muted-foreground">
      {children}
    </span>
  );
}
