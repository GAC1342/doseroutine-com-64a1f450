import { NotebookPen } from "lucide-react";

export type FounderNote = {
  /** Short heading for the observation, e.g. "Reconstitution volume". */
  title: string;
  /** First-person observation from tracking this in the app. */
  body: string;
};

/**
 * First-hand, first-person notes from building and self-tracking with
 * DoseRoutine. These are experience-based observations, not medical advice
 * or research claims — keep clinical statements in the sourced sections.
 */
export function FounderNotes({
  notes,
  heading = "Notes from tracking this myself",
  className = "",
}: {
  notes: FounderNote[];
  heading?: string;
  className?: string;
}) {
  if (notes.length === 0) return null;

  return (
    <section
      aria-labelledby="founder-notes-heading"
      className={`my-8 rounded-2xl border border-border bg-card p-5 ${className}`}
    >
      <div className="flex items-center gap-2">
        <NotebookPen className="h-4 w-4 text-primary" aria-hidden="true" />
        <h2
          id="founder-notes-heading"
          className="text-sm font-semibold uppercase tracking-wider text-primary"
        >
          {heading}
        </h2>
      </div>
      <p className="mt-2 text-xs text-muted-foreground">
        First-hand observations from using DoseRoutine day to day. Personal experience, not medical
        advice.
      </p>
      <ul className="mt-4 space-y-4">
        {notes.map((note) => (
          <li key={note.title}>
            <h3 className="text-sm font-semibold text-foreground">{note.title}</h3>
            <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{note.body}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}
