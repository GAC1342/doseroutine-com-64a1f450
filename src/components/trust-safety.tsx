import { Link } from "@tanstack/react-router";
import { ShieldCheck } from "lucide-react";
import { SAFETY_POINTS, TRUST_FAQ, TRUST_FAQ_COMPACT, type TrustFaqPair } from "@/lib/trust-faq";

/**
 * Trust FAQ + safety/disclaimer block.
 *
 * Uses native <details>/<summary> so every answer is in the server-rendered
 * HTML with no JavaScript — crawlers and answer engines read the full text.
 *
 * Variants:
 *  - "full"        homepage: safety points + all six trust questions
 *  - "compact"     sign-up: safety points + the privacy/data questions
 *  - "safety-only" free tools: just the safety points, under the result
 */
export function TrustSafety({
  variant = "full",
  className = "",
  id = "trust-safety",
}: {
  variant?: "full" | "compact" | "safety-only";
  className?: string;
  id?: string;
}) {
  const pairs: readonly TrustFaqPair[] =
    variant === "full" ? TRUST_FAQ : variant === "compact" ? TRUST_FAQ_COMPACT : [];

  return (
    <section
      id={id}
      aria-labelledby={`${id}-heading`}
      data-testid={`trust-safety-${variant}`}
      className={`mx-auto max-w-3xl rounded-2xl border border-border bg-card p-6 shadow-sm sm:p-8 ${className}`}
    >
      <div className="flex items-start gap-3">
        <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
        <div className="min-w-0">
          <h2
            id={`${id}-heading`}
            className="font-display text-lg font-semibold tracking-tight text-foreground sm:text-xl"
          >
            How we handle safety and your data
          </h2>
          <ul className="mt-3 space-y-2 text-sm leading-relaxed text-muted-foreground">
            {SAFETY_POINTS.map((point) => (
              <li key={point} className="flex gap-2">
                <span aria-hidden="true" className="mt-2 h-1 w-1 shrink-0 rounded-full bg-primary" />
                <span>{point}</span>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-sm text-muted-foreground">
            Read the{" "}
            <Link to="/medical-disclaimer" className="font-medium text-primary underline">
              medical disclaimer
            </Link>
            ,{" "}
            <Link to="/editorial-policy" className="font-medium text-primary underline">
              editorial policy
            </Link>{" "}
            and{" "}
            <Link to="/sources" className="font-medium text-primary underline">
              how we source content
            </Link>
            .
          </p>
        </div>
      </div>

      {pairs.length > 0 ? (
        <div className="mt-6 divide-y divide-border rounded-2xl border border-border">
          {pairs.map((p) => (
            <details key={p.q} className="group p-4">
              <summary className="tap-target cursor-pointer list-none text-sm font-semibold text-foreground marker:hidden">
                {p.q}
              </summary>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{p.a}</p>
            </details>
          ))}
        </div>
      ) : null}

      {variant !== "safety-only" ? (
        <p className="mt-4 text-xs text-muted-foreground">
          More detail in our{" "}
          <Link to="/privacy" className="underline hover:text-foreground">
            privacy policy
          </Link>{" "}
          and{" "}
          <Link to="/faq" className="underline hover:text-foreground">
            full FAQ
          </Link>
          .
        </p>
      ) : null}
    </section>
  );
}
