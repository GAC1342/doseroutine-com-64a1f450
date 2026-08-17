/**
 * Route → instruction-manual index.
 *
 * Every manual section optionally names the feature route it documents.
 * Inverting that gives each feature page a list of "here's the manual
 * chapter and steps for this screen" deep links, without hand-maintaining a
 * second mapping that can drift from the manual itself.
 */
import { MANUAL, type ManualChapter, type ManualSection } from "@/lib/manual";

export type ManualRouteLink = {
  chapterId: string;
  chapterNumber: number;
  chapterTitle: string;
  section: ManualSection;
};

const INDEX: Record<string, ManualRouteLink[]> = (() => {
  const out: Record<string, ManualRouteLink[]> = {};
  for (const chapter of MANUAL as ManualChapter[]) {
    for (const section of chapter.sections) {
      if (!section.route) continue;
      (out[section.route] ??= []).push({
        chapterId: chapter.id,
        chapterNumber: chapter.number,
        chapterTitle: chapter.title,
        section,
      });
    }
  }
  return out;
})();

/** Manual sections documenting the given app path (exact, then prefix match). */
export function manualSectionsForRoute(pathname: string): ManualRouteLink[] {
  const path = pathname.length > 1 ? pathname.replace(/\/+$/, "") : pathname;
  if (INDEX[path]) return INDEX[path];
  for (const route of Object.keys(INDEX)) {
    if (path.startsWith(route + "/")) return INDEX[route];
  }
  return [];
}
