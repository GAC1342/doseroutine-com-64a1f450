import { useState } from "react";
import { MessageSquarePlus, Check } from "lucide-react";
import { z } from "zod";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

const KINDS = [
  { value: "confusing", label: "A step is confusing" },
  { value: "suggestion", label: "Suggestion" },
  { value: "error", label: "Something is wrong" },
] as const;

const schema = z.object({
  kind: z.enum(["confusing", "suggestion", "error"]),
  message: z
    .string()
    .trim()
    .nonempty({ message: "Please tell us what was confusing." })
    .max(2000, { message: "Please keep it under 2000 characters." }),
});

/**
 * Per-chapter feedback form for the instruction manual.
 *
 * Collapsed by default so it never gets in the way of reading; opens into a
 * short form that writes to manual_feedback (RLS-scoped to the author).
 */
export function ManualChapterFeedback({
  chapterId,
  chapterTitle,
}: {
  chapterId: string;
  chapterTitle: string;
}) {
  const [open, setOpen] = useState(false);
  const [kind, setKind] = useState<(typeof KINDS)[number]["value"]>("confusing");
  const [message, setMessage] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [sent, setSent] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = schema.safeParse({ kind, message });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Please check your feedback.");
      return;
    }
    setError(null);
    setSaving(true);
    try {
      const { data: auth } = await supabase.auth.getUser();
      const userId = auth.user?.id;
      if (!userId) {
        setError("Please sign in again to send feedback.");
        return;
      }
      const { error: insertError } = await supabase.from("manual_feedback").insert({
        user_id: userId,
        chapter_id: chapterId.slice(0, 100),
        chapter_title: chapterTitle.slice(0, 200),
        kind: parsed.data.kind,
        message: parsed.data.message,
      });
      if (insertError) {
        setError("Couldn't send that just now. Please try again.");
        return;
      }
      setSent(true);
      setMessage("");
      setOpen(false);
      toast.success("Thanks — your feedback was sent.");
    } finally {
      setSaving(false);
    }
  }

  if (sent && !open) {
    return (
      <p className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
        <Check className="h-4 w-4 text-primary" aria-hidden="true" />
        Thanks — feedback sent for this chapter.{" "}
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="font-medium text-primary hover:underline"
        >
          Send more
        </button>
      </p>
    );
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="tap-target mt-4 inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
      >
        <MessageSquarePlus className="h-4 w-4" aria-hidden="true" />
        Something unclear in this chapter?
      </button>
    );
  }

  return (
    <form
      onSubmit={submit}
      className="mt-4 rounded-2xl border border-border bg-card p-4"
      aria-label={`Feedback on chapter: ${chapterTitle}`}
    >
      <fieldset>
        <legend className="text-sm font-semibold text-foreground">
          Report or suggest — {chapterTitle}
        </legend>
        <div className="mt-3 flex flex-wrap gap-2">
          {KINDS.map((k) => (
            <button
              key={k.value}
              type="button"
              onClick={() => setKind(k.value)}
              aria-pressed={kind === k.value}
              className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                kind === k.value
                  ? "bg-primary text-primary-foreground"
                  : "border border-border text-muted-foreground hover:text-foreground"
              }`}
            >
              {k.label}
            </button>
          ))}
        </div>
      </fieldset>

      <label htmlFor={`manual-feedback-${chapterId}`} className="sr-only">
        Your feedback
      </label>
      <textarea
        id={`manual-feedback-${chapterId}`}
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        maxLength={2000}
        rows={3}
        placeholder="Which step was confusing, and what would make it clearer?"
        className="mt-3 w-full rounded-xl border border-border bg-background p-3 text-sm focus:border-primary focus:outline-none"
      />
      <div className="mt-1 flex items-center justify-between text-xs text-muted-foreground">
        <span aria-live="polite" className={error ? "text-destructive" : undefined}>
          {error ?? "Only you and the DoseRoutine team can see this."}
        </span>
        <span>{message.length}/2000</span>
      </div>

      <div className="mt-3 flex gap-2">
        <button
          type="submit"
          disabled={saving}
          className="tap-target inline-flex items-center rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-60"
        >
          {saving ? "Sending…" : "Send feedback"}
        </button>
        <button
          type="button"
          onClick={() => {
            setOpen(false);
            setError(null);
          }}
          className="tap-target inline-flex items-center rounded-xl px-3 py-2 text-sm font-medium text-muted-foreground hover:text-foreground"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
