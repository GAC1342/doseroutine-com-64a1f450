// Citation engagement analytics: which references readers actually rely on.
//
// Two events, both fire-and-forget on top of `trackEvent`:
//  - `citation_marker_click` — an inline [n] marker was activated.
//  - `citation_source_open`  — an outbound source link in the "Sources and
//    references" list was opened.
//
// Together they answer "which publishers do readers check, and from which
// page/section", without tracking anything about the reader.

import { trackEvent } from "@/lib/analytics";

export const CITATION_EVENTS = {
  markerClick: "citation_marker_click",
  sourceOpen: "citation_source_open",
} as const;

function currentPath(): string {
  if (typeof window === "undefined") return "";
  return window.location.pathname;
}

/** Publisher host for grouping, without fabricating anything when there is no URL. */
export function sourceHost(url?: string | null): string | null {
  if (!url) return null;
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return null;
  }
}

export function trackCitationMarkerClick(input: {
  /** Visible reference number, matching the sources list entry. */
  n: number;
  publisher: string;
  title?: string | null;
  url?: string | null;
  /** Section label the marker sits under, e.g. "Sources for Dosing". */
  section?: string | null;
}): void {
  trackEvent(CITATION_EVENTS.markerClick, {
    reference_number: input.n,
    publisher: input.publisher,
    title: input.title ?? null,
    host: sourceHost(input.url),
    section: input.section ?? null,
    path: currentPath(),
  });
}

export function trackCitationSourceOpen(input: {
  n: number;
  publisher: string;
  title?: string | null;
  url: string;
  isSearch?: boolean;
}): void {
  trackEvent(CITATION_EVENTS.sourceOpen, {
    reference_number: input.n,
    publisher: input.publisher,
    title: input.title ?? null,
    host: sourceHost(input.url),
    url: input.url,
    is_search_link: Boolean(input.isSearch),
    path: currentPath(),
  });
}
