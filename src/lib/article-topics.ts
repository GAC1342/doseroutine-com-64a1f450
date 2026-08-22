/**
 * Topic tagging for /articles.
 *
 * Articles come from two sources (first-party markdown and the CMS), neither of
 * which carries a category field, so topics are derived from the slug, title
 * and description with a small keyword map. Deterministic and dependency-free
 * so the same chips render on the server and the client.
 */

export type ArticleTopic = {
  id: string;
  label: string;
  /** Lowercase substrings that assign an article to this topic. */
  keywords: string[];
};

export const ARTICLE_TOPICS: ArticleTopic[] = [
  {
    id: "reminders",
    label: "Reminders",
    keywords: ["reminder", "remind", "alarm", "notification", "adherence", "schedule"],
  },
  {
    id: "apps",
    label: "Apps & tools",
    keywords: ["app", "tracker", "tracking", "software", "tool"],
  },
  {
    id: "prescriptions",
    label: "Prescriptions",
    keywords: ["prescription", "pharmacy", "refill", "medication", "medicine", "pill"],
  },
  {
    id: "longevity",
    label: "Longevity",
    keywords: ["longevity", "aging", "ageing", "healthspan", "lifespan"],
  },
  {
    id: "peptides",
    label: "Peptides",
    keywords: [
      "peptide",
      "carbetocin",
      "oxytocin",
      "glp-1",
      "semaglutide",
      "tirzepatide",
      "retatrutide",
    ],
  },
  {
    id: "adhd",
    label: "ADHD & focus",
    keywords: ["adhd", "guanfacine", "intuniv", "clonidine", "focus", "attention"],
  },
  {
    id: "dosing",
    label: "Dosing",
    keywords: ["dose", "dosage", "dosing", "titration", "mg", "units"],
  },
  {
    id: "nutrition",
    label: "Nutrition & training",
    keywords: ["nutrition", "protein", "macro", "meal", "workout", "training", "exercise"],
  },
];

/** Free-text haystack for one article, lowercased. */
export function articleHaystack(parts: Array<string | undefined | null>): string {
  return parts
    .filter(Boolean)
    .join(" ")
    .toLowerCase()
    .replace(/[-_/]+/g, " ");
}

/** Topic ids that apply to an article, in ARTICLE_TOPICS order. */
export function topicsFor(parts: Array<string | undefined | null>): string[] {
  const hay = articleHaystack(parts);
  return ARTICLE_TOPICS.filter((topic) =>
    topic.keywords.some((k) => hay.includes(k.replace(/[-_]+/g, " "))),
  ).map((t) => t.id);
}

/** True when the article matches the selected topic (empty topic = all). */
export function matchesTopic(parts: Array<string | undefined | null>, topicId: string): boolean {
  if (!topicId) return true;
  return topicsFor(parts).includes(topicId);
}

/** Label lookup for rendering a chip. */
export function topicLabel(topicId: string): string {
  return ARTICLE_TOPICS.find((t) => t.id === topicId)?.label ?? topicId;
}
