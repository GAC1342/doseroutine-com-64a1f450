/**
 * Stable anchor ids for blog post section headings.
 *
 * Blog sections are rendered from data (no hand-written ids), so every
 * deep link into a section derives its fragment from the heading text with
 * this one function. Keeping it here means the renderer and the internal
 * linking plan can never drift apart.
 */

/** Slugify a section heading into a URL fragment (no leading "#"). */
export function sectionAnchorId(heading: string): string {
  return heading
    .toLowerCase()
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
