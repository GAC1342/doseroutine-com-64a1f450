import { useState } from "react";
import { X } from "lucide-react";
import {
  MAX_TAGS,
  RATING_MAX,
  RATING_MIN,
  SLEEP_LABELS,
  STRESS_LABELS,
  SUGGESTED_TAGS,
  addTag,
  addTagsFromInput,
  removeTag,
} from "@/lib/session-context";

type Props = {
  tags: string[];
  onTagsChange: (tags: string[]) => void;
  sleepQuality: number | null;
  onSleepChange: (value: number | null) => void;
  stressLevel: number | null;
  onStressChange: (value: number | null) => void;
  /** Tags the user has used before, offered ahead of the generic suggestions. */
  recentTags?: string[];
};

function RatingRow({
  label,
  value,
  labels,
  onChange,
}: {
  label: string;
  value: number | null;
  labels: Record<number, string>;
  onChange: (value: number | null) => void;
}) {
  return (
    <div>
      <div className="flex items-baseline justify-between">
        <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
          {label}
        </span>
        <span className="text-[11px] text-muted-foreground">
          {value == null ? "Not set" : labels[value]}
        </span>
      </div>
      <div role="radiogroup" aria-label={label} className="mt-1 flex gap-1.5">
        {Array.from({ length: RATING_MAX - RATING_MIN + 1 }).map((_, i) => {
          const rating = RATING_MIN + i;
          const active = value === rating;
          return (
            <button
              key={rating}
              type="button"
              role="radio"
              aria-checked={active}
              aria-label={`${label}: ${labels[rating]}`}
              onClick={() => onChange(active ? null : rating)}
              className={`tap-target flex-1 rounded-xl border py-2 text-xs font-medium transition-colors ${
                active
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-card text-foreground/80 hover:border-foreground/30 hover:bg-muted hover:text-foreground"
              }`}
            >
              {rating}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function SessionContextFields({
  tags,
  onTagsChange,
  sleepQuality,
  onSleepChange,
  stressLevel,
  onStressChange,
  recentTags = [],
}: Props) {
  const [draft, setDraft] = useState("");

  const lower = new Set(tags.map((t) => t.toLowerCase()));
  const suggestions = [...recentTags, ...SUGGESTED_TAGS]
    .filter((t, i, arr) => arr.findIndex((x) => x.toLowerCase() === t.toLowerCase()) === i)
    .filter((t) => !lower.has(t.toLowerCase()))
    .slice(0, 8);

  function commitDraft() {
    if (!draft.trim()) return;
    onTagsChange(addTagsFromInput(tags, draft));
    setDraft("");
  }

  return (
    <div className="space-y-3 rounded-xl border border-border p-3">
      <div>
        <div className="flex items-baseline justify-between">
          <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
            Tags
          </span>
          <span className="text-[11px] text-muted-foreground">
            {tags.length}/{MAX_TAGS}
          </span>
        </div>

        {tags.length > 0 && (
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {tags.map((tag) => (
              <span
                key={tag}
                className="inline-flex items-center gap-1 rounded-full bg-primary/10 py-1 pl-2.5 pr-1 text-[11px] font-medium text-primary"
              >
                {tag}
                <button
                  type="button"
                  aria-label={`Remove tag ${tag}`}
                  onClick={() => onTagsChange(removeTag(tags, tag))}
                  className="rounded-full p-0.5 hover:bg-primary/20"
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            ))}
          </div>
        )}

        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === ",") {
              e.preventDefault();
              commitDraft();
            } else if (e.key === "Backspace" && draft === "" && tags.length > 0) {
              onTagsChange(tags.slice(0, -1));
            }
          }}
          onBlur={commitDraft}
          disabled={tags.length >= MAX_TAGS}
          placeholder={tags.length >= MAX_TAGS ? "Tag limit reached" : "deload, fasted, PR…"}
          aria-label="Add a session tag"
          className="tap-target mt-1.5 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none disabled:opacity-50"
        />

        {suggestions.length > 0 && tags.length < MAX_TAGS && (
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {suggestions.map((tag) => (
              <button
                key={tag}
                type="button"
                onClick={() => onTagsChange(addTag(tags, tag))}
                className="rounded-full border border-border px-2.5 py-1 text-[11px] text-muted-foreground hover:bg-muted"
              >
                + {tag}
              </button>
            ))}
          </div>
        )}
      </div>

      <RatingRow
        label="Sleep last night"
        value={sleepQuality}
        labels={SLEEP_LABELS}
        onChange={onSleepChange}
      />
      <RatingRow
        label="Stress today"
        value={stressLevel}
        labels={STRESS_LABELS}
        onChange={onStressChange}
      />
    </div>
  );
}
