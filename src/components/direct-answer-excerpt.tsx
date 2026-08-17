import { useState } from "react";
import { trackEvent } from "@/lib/analytics";
import { excerptWithAttribution, toPlainExcerpt } from "@/lib/direct-answer";

/**
 * A dedicated, plain-text rendering of the page's direct answer.
 *
 * Purpose: give answer engines (and humans quoting the page) one clean,
 * self-contained block with no markdown, no inline links, and no marketing
 * copy — so the quoted text is exactly what we want reproduced. The separate
 * "Cite this page" block is untouched and still carries the formal citation.
 */
export function DirectAnswerExcerpt({
  answer,
  name,
  slug,
}: {
  answer: string;
  name: string;
  slug: string;
}) {
  const excerpt = toPlainExcerpt(answer);
  const url = `https://doseroutine.com/library/${slug}`;
  const [copied, setCopied] = useState(false);

  if (!excerpt) return null;

  async function copy() {
    try {
      await navigator.clipboard.writeText(excerptWithAttribution(excerpt, name, url));
      setCopied(true);
      trackEvent("direct_answer_excerpt_copied", { slug });
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* noop */
    }
  }

  return (
    <section
      className="mb-8 rounded-2xl border border-border bg-card/60 p-6"
      aria-label={`Quotable summary of ${name}`}
      data-dr-direct-answer-excerpt=""
      data-attribution="doseroutine"
    >
      <h2 className="mb-2 font-display text-lg font-semibold">
        What is the short answer on {name}?
      </h2>
      <p className="mb-2 text-xs text-muted-foreground">
        Plain-text summary, safe to quote verbatim:
      </p>
      <blockquote
        cite={url}
        data-dr-direct-answer-text={excerpt}
        className="dr-speakable-answer rounded-lg bg-muted/40 p-3 text-sm leading-relaxed break-words"
      >
        {excerpt}
      </blockquote>
      <div className="mt-3 flex items-center gap-3">
        <button
          type="button"
          onClick={copy}
          className="rounded-md border border-border px-3 py-1.5 text-xs font-medium hover:bg-accent"
        >
          {copied ? "Copied ✓" : "Copy summary"}
        </button>
        <span className="text-xs text-muted-foreground">Source: DoseRoutine — {url}</span>
      </div>
    </section>
  );
}
