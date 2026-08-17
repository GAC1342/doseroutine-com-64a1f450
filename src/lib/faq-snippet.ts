/**
 * Featured-snippet rules for blog FAQs.
 *
 * Google lifts paragraph snippets of roughly 40-60 words (about 300
 * characters). Answers shorter than that rarely win the box because they do
 * not stand alone; longer ones get truncated mid-sentence. These helpers keep
 * the FAQ copy inside that window and give every question a stable anchor so
 * the FAQPage schema can point at the exact on-page block.
 */

export const FAQ_MIN_WORDS = 30;
export const FAQ_MAX_WORDS = 62;
export const FAQ_MAX_CHARS = 340;

/** Stable fragment id for an FAQ question (no leading "#"). */
export function faqAnchorId(question: string): string {
  return `faq-${question
    .toLowerCase()
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 70)
    .replace(/-+$/, "")}`;
}

export function faqWordCount(answer: string): number {
  return answer.trim().split(/\s+/).filter(Boolean).length;
}

/** True when an answer is long enough to stand alone but short enough to lift whole. */
export function isSnippetLengthAnswer(answer: string): boolean {
  const words = faqWordCount(answer);
  return words >= FAQ_MIN_WORDS && words <= FAQ_MAX_WORDS && answer.length <= FAQ_MAX_CHARS;
}
