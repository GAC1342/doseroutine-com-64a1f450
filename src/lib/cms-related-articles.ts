/**
 * Contextual internal linking between snapshotted CMS articles.
 *
 * the CMS renders each post standalone, so the blog had no article-to-article
 * links at all: every post was a leaf with one inbound link from the index.
 * That wastes crawl equity and gives answer engines no topical neighbourhood
 * to reason about. Each slug below is tagged with topics, and the resolver
 * ranks siblings by shared topics (same language first) so every article ends
 * up with three contextual links plus one link into the matching DoseRoutine
 * tool or guide hub.
 */
import { articleLocale } from "./article-locale";

export type ArticleTopic =
  | "sleep"
  | "focus"
  | "blood-pressure"
  | "peptides"
  | "longevity"
  | "hormones"
  | "nutrition"
  | "supplements"
  | "weight"
  | "apps"
  | "safety";

type Entry = { title: string; topics: ArticleTopic[] };

const ARTICLES: Record<string, Entry> = {
  armodafinil: { title: "Armodafinil: uses, timing and wakefulness", topics: ["focus", "sleep"] },
  boldenone: { title: "Boldenone explained", topics: ["hormones", "safety"] },
  carbetocin: {
    title: "Carbetocin: what it is and how it works",
    topics: ["peptides", "hormones"],
  },
  "carbetocin-dose": { title: "Carbetocin dosing explained", topics: ["peptides", "hormones"] },
  clonidine: { title: "Clonidine: uses and timing", topics: ["blood-pressure", "focus", "sleep"] },
  "extended-release-melatonin": {
    title: "Extended-release melatonin",
    topics: ["sleep", "supplements"],
  },
  intuniv: { title: "Intuniv (guanfacine ER)", topics: ["focus", "blood-pressure"] },
  "lisdexamfetamine-brand-name": {
    title: "Lisdexamfetamine brand names",
    topics: ["focus"],
  },
  longevity: { title: "Longevity: what actually moves the needle", topics: ["longevity"] },
  "longevity-peptides": {
    title: "Longevity peptides",
    topics: ["longevity", "peptides"],
  },
  "meal-planning-app": { title: "Choosing a meal planning app", topics: ["nutrition", "apps"] },
  "pastillas-para-bajar-de-peso": {
    title: "Pastillas para bajar de peso",
    topics: ["weight", "safety"],
  },
  "ramelteon-drug-class": { title: "Ramelteon drug class", topics: ["sleep"] },
  "ranitidine-drug": { title: "Ranitidine: what happened", topics: ["safety"] },
  "science-of-longevity": {
    title: "The science of longevity",
    topics: ["longevity", "peptides"],
  },
  "what-is-guanfacine-used-for": {
    title: "What is guanfacine used for?",
    topics: ["focus", "blood-pressure"],
  },
  "yuka-app": { title: "Yuka app review", topics: ["nutrition", "apps"] },
  "zinc-bisglycinate-supplement": {
    title: "Zinc bisglycinate",
    topics: ["supplements", "nutrition"],
  },
};

export type RelatedLink = { href: string; title: string; description?: string };

/** One deeper DoseRoutine destination per topic, so the cluster is not a dead end. */
const TOPIC_HUBS: Record<ArticleTopic, RelatedLink> = {
  sleep: {
    href: "/goals/sleep",
    title: "Sleep stack guide",
    description: "What to take, when to take it, and how to track whether it works.",
  },
  focus: {
    href: "/goals/brain",
    title: "Brain and cognition guide",
    description: "Timing, stacking rules and interactions for focus support.",
  },
  "blood-pressure": {
    href: "/library",
    title: "Compound library",
    description: "Evidence summaries, timing and interaction checks for 300+ compounds.",
  },
  peptides: {
    href: "/peptides",
    title: "Peptide guides",
    description: "Reconstitution, dosing charts and protocol tracking.",
  },
  longevity: {
    href: "/goals/longevity",
    title: "Longevity protocol guide",
    description: "Build a longevity stack you can actually keep on schedule.",
  },
  hormones: {
    href: "/library",
    title: "Compound library",
    description: "Half-lives, timing windows and interaction warnings.",
  },
  nutrition: {
    href: "/food",
    title: "Meal and macro tracking",
    description: "Scan a meal or barcode and log calories, protein, carbs and fat.",
  },
  supplements: {
    href: "/library",
    title: "Supplement library",
    description: "Forms, absorption notes and what to separate from what.",
  },
  weight: {
    href: "/goals/weight-loss",
    title: "Weight-loss tracking guide",
    description: "Track doses, meals and body metrics in one timeline.",
  },
  apps: {
    href: "/vs/myfitnesspal",
    title: "DoseRoutine vs MyFitnessPal",
    description: "How a protocol-aware tracker differs from a calorie app.",
  },
  safety: {
    href: "/interactions",
    title: "Interaction checker",
    description: "Check what conflicts with what before you add it to a stack.",
  },
};

function score(a: ArticleTopic[], b: ArticleTopic[]): number {
  return a.filter((t) => b.includes(t)).length;
}

/**
 * Up to `limit` sibling articles, ranked by shared topics, preferring posts in
 * the same language so a Spanish reader is not sent to an English page first.
 */
export function relatedArticles(slug: string, limit = 3): RelatedLink[] {
  const self = ARTICLES[slug];
  if (!self) return [];
  const selfLang = articleLocale(slug).lang;

  return Object.entries(ARTICLES)
    .filter(([s]) => s !== slug)
    .map(([s, entry]) => {
      const shared = score(self.topics, entry.topics);
      const sameLang = articleLocale(s).lang === selfLang ? 1 : 0;
      return { slug: s, entry, rank: shared * 2 + sameLang };
    })
    .filter((c) => c.rank > 0)
    .sort((a, b) => b.rank - a.rank || a.slug.localeCompare(b.slug))
    .slice(0, limit)
    .map((c) => ({ href: `/articles/${c.slug}`, title: c.entry.title }));
}

/** The single best DoseRoutine hub link for this article's primary topic. */
export function articleTopicHub(slug: string): RelatedLink | null {
  const entry = ARTICLES[slug];
  const topic = entry?.topics[0];
  return topic ? TOPIC_HUBS[topic] : null;
}

/** Topics for a slug — used by the structured-data / linking report. */
export function articleTopics(slug: string): ArticleTopic[] {
  return ARTICLES[slug]?.topics ?? [];
}

export function relatedArticleSlugs(): string[] {
  return Object.keys(ARTICLES);
}
