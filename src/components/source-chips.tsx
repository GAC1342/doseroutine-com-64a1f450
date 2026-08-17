import { ExternalLink } from "lucide-react";

/**
 * Renders `source_refs` from an interaction rule as clickable chips.
 * Each ref may be either a plain URL, a bare label, or "Label|URL".
 */
export function SourceChips({
  refs,
  className = "",
  showLabel = true,
}: {
  refs: string[];
  className?: string;
  showLabel?: boolean;
}) {
  if (!refs || refs.length === 0) return null;
  return (
    <div className={`flex flex-wrap items-center gap-1.5 ${className}`}>
      {showLabel && (
        <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          Sources
        </span>
      )}
      {refs.map((ref, i) => {
        const [rawLabel, rawUrl] = ref.includes("|") ? ref.split("|") : [ref, ref];
        const url = (rawUrl ?? rawLabel).trim();
        let label = (rawLabel ?? "").trim();
        if (!label || label === url) {
          try {
            label = new URL(url).hostname.replace(/^www\./, "");
          } catch {
            label = url;
          }
        }
        const isUrl = /^https?:\/\//i.test(url);
        return isUrl ? (
          <a
            key={i}
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 rounded-full bg-background/70 px-2 py-1 text-[11px] font-medium text-foreground hover:bg-background"
          >
            {label}
            <ExternalLink className="h-3 w-3" aria-hidden="true" />
          </a>
        ) : (
          <span
            key={i}
            className="inline-flex items-center rounded-full bg-background/70 px-2 py-1 text-[11px] font-medium text-muted-foreground"
          >
            {label}
          </span>
        );
      })}
    </div>
  );
}
