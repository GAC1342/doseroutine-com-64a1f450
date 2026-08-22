import { useId } from "react";
import type { NumberedSource } from "@/lib/authority-sources";
import { trackCitationMarkerClick } from "@/lib/citation-analytics";

/**
 * Inline per-claim citation markers, e.g. "[1][3]". Each marker is an in-page
 * link to the matching entry in the "Sources and references" list, so the
 * numbering a reader taps always resolves to a real publisher document.
 *
 * Accessibility notes:
 *  - Markers are wrapped in a `role="group"` with a screen-reader-only
 *    introduction, so a screen reader announces "Sources for this section:
 *    Reference 1, PubChem — ..." instead of a bare "[1]".
 *  - Each link has an explicit `aria-label` naming the reference number,
 *    publisher and title — a visible "[1]" alone is meaningless out of context.
 *  - `aria-describedby` points at the matching entry in the sources list, so
 *    the screen reader can announce the destination entry (and its publisher)
 *    as the link's description before the reader decides to follow it. A
 *    marker-local sr-only hint is also referenced so the announcement always
 *    ends with where activating the link goes, even if the sources list has
 *    not rendered yet.
 *  - Activating a marker (mouse, Enter or Space via the native link) moves
 *    keyboard focus to the target entry, which is focusable via `tabIndex={-1}`
 *    in `AuthoritySourceList`. Without this the hash change scrolls the page
 *    but leaves focus behind, stranding keyboard and screen-reader users.
 *  - Focus is visible through `focus-visible:ring-2`, and the tap area is
 *    padded so the marker stays comfortably tappable on touch screens.

 */
export function CitationMarkers({
  sources,
  idPrefix = "source",
  className = "",
  label = "Sources for this section",
}: {
  sources: readonly NumberedSource[];
  idPrefix?: string;
  className?: string;
  label?: string;
}) {
  const uid = useId();
  if (sources.length === 0) return null;

  const focusTarget = (id: string) => {
    if (typeof document === "undefined") return;
    // Defer past the router's hash navigation and re-render, otherwise the
    // re-render blurs the entry we just focused and keyboard users are
    // stranded back at the top of the page.
    const run = () => {
      const el = document.getElementById(id);
      // The browser handles scrolling from the hash; we only move focus so the
      // next Tab continues from the reference the reader jumped to.
      el?.focus({ preventScroll: true });
    };
    requestAnimationFrame(() => requestAnimationFrame(run));
  };

  return (
    <span
      role="group"
      aria-label={label}
      className={`inline-flex items-center gap-0.5 ${className}`}
    >
      <span className="sr-only">{label}: </span>
      <span id={`${uid}-hint`} className="sr-only">
        Jumps to this entry in the sources and references list at the end of the page.
      </span>
      {sources.map((s) => {
        const name = s.title ?? s.label;
        return (
          <a
            key={s.n}
            href={`#${idPrefix}-${s.n}`}
            role="doc-noteref"
            data-no-citation-modal="true"
            title={`${name} — ${s.publisher}`}
            aria-label={`Reference ${s.n}: ${name}, ${s.publisher}`}
            // Describe the destination: the sources-list entry itself first
            // (so the reader hears the numbered entry they'd land on), then a
            // short hint about what activating the marker does.
            aria-describedby={`${idPrefix}-${s.n} ${uid}-hint`}
            onClick={() => {
              trackCitationMarkerClick({
                n: s.n,
                publisher: s.publisher,
                title: s.title ?? null,
                url: s.url ?? null,
                section: label,
              });
              focusTarget(`${idPrefix}-${s.n}`);
            }}
            className="inline-flex min-h-6 min-w-4 items-center justify-center rounded px-0.5 align-super text-[10px] font-semibold leading-none text-primary underline decoration-primary/40 underline-offset-2 hover:decoration-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-background"
          >
            <span aria-hidden="true">[{s.n}]</span>
          </a>
        );
      })}
    </span>
  );
}
