import type { AeoFaqPair } from "@/lib/aeo";
import { faqAnchorId } from "@/lib/faq-snippet";

/**
 * Answer-first summary block.
 *
 * Rendered high on the page and marked `.dr-speakable-answer` so the
 * `speakable` spec in our JSON-LD points at it. Answer engines quote the
 * first self-contained factual paragraph they find — this makes sure that
 * paragraph is ours and is on-message.
 */
export function AnswerFirst({
  question,
  children,
}: {
  question: string;
  children: React.ReactNode;
}) {
  return (
    <section
      aria-label="Short answer"
      className="dr-speakable-answer mb-6 rounded-xl border border-primary/25 bg-primary/5 p-5"
    >
      <h2 className="text-sm font-semibold uppercase tracking-wide text-primary">{question}</h2>
      <p className="mt-2 text-sm leading-relaxed text-foreground">{children}</p>
    </section>
  );
}

/**
 * Visible FAQ that mirrors the FAQPage JSON-LD exactly.
 *
 * Uses native <details>/<summary> so the answer text is in the initial HTML
 * with no JavaScript — crawlers and answer engines that don't execute JS still
 * read every answer.
 */
export function AeoFaq({
  pairs,
  heading = "Frequently asked questions",
  id = "faq",
}: {
  pairs: AeoFaqPair[];
  heading?: string;
  id?: string;
}) {
  if (pairs.length === 0) return null;
  return (
    <section id={id} aria-labelledby={`${id}-heading`} className="mt-10">
      <h2 id={`${id}-heading`} className="font-display text-xl font-semibold text-foreground">
        {heading}
      </h2>
      <div className="mt-4 divide-y divide-border rounded-2xl border border-border bg-card">
        {pairs.map((p) => (
          <details key={p.q} id={faqAnchorId(p.q)} className="group scroll-mt-24 p-4">
            <summary className="tap-target cursor-pointer list-none text-sm font-semibold text-foreground marker:hidden">
              {p.q}
            </summary>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{p.a}</p>
          </details>
        ))}
      </div>
    </section>
  );
}
