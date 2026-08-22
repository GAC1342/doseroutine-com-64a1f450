import { useEffect } from "react";
import {
  ConfidenceBadge,
  NoKnownInteractionLine,
  SharedMechanismNote,
} from "@/components/interaction-confidence";
import { Link } from "@tanstack/react-router";
import { X, ShieldCheck, Check } from "lucide-react";
import type { Database } from "@/integrations/supabase/types";
import { AuthoritySourceList } from "@/components/authority-source-list";
import {
  documentCitations,
  resolveInteractionSources,
  verificationLinks,
} from "@/lib/authority-sources";
import { VerifyAtList } from "@/components/verify-at-list";
import { useInteractionAcks } from "@/lib/interaction-acks";

type Severity = Database["public"]["Enums"]["severity_enum"];
type Category = Database["public"]["Enums"]["compound_cat"];

export type InteractionDetail = {
  a: { name: string; category: Category };
  b: { name: string; category: Category };
  severity: Severity;
  mechanism: string;
  recommendation: string;
  same_axis: boolean;
  matchedBy: "pair" | "category";
  source_refs: string[];
  confidence?: "established" | "plausible" | "theoretical" | "disputed";
  mechanism_shared_with?: string | null;
  no_known_interaction?: boolean;
  ackKey: string;
};

const SEV_STYLE: Record<Severity, { chip: string; label: string; ring: string }> = {
  avoid: {
    chip: "bg-destructive/15 text-destructive",
    label: "Avoid",
    ring: "border-destructive/40",
  },
  caution: {
    chip: "bg-[color:var(--caution)]/15 text-[color:var(--caution)]",
    label: "Caution",
    ring: "border-[color:var(--caution)]/40",
  },
  note: { chip: "bg-primary/10 text-primary", label: "Note", ring: "border-primary/30" },
  synergy: {
    chip: "bg-[color:var(--severity-synergy-bg)] text-[color:var(--severity-synergy)]",
    label: "Synergy",
    ring: "border-[color:var(--severity-synergy)]/30",
  },
};

const SEV_ACTION: Record<Severity, string> = {
  avoid: "Do not combine without a clinician's explicit go-ahead.",
  caution: "Combine only with clinician oversight and monitoring.",
  note: "Be aware, adjust timing or dose as recommended.",
  synergy: "Combination may be complementary — still verify context.",
};

export function InteractionDetailDrawer({
  detail,
  onClose,
}: {
  detail: InteractionDetail | null;
  onClose: () => void;
}) {
  useEffect(() => {
    if (!detail) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [detail, onClose]);

  if (!detail) return null;
  const s = SEV_STYLE[detail.severity];

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-black/50"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={`Interaction details: ${detail.a.name} and ${detail.b.name}`}
    >
      <div
        className="h-full w-full max-w-md overflow-y-auto bg-background shadow-xl animate-in slide-in-from-right duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-border bg-background px-5 py-4">
          <h2 className="font-display text-lg font-semibold">Interaction details</h2>
          <button
            onClick={onClose}
            aria-label="Close"
            className="grid h-11 w-11 place-items-center rounded-lg text-muted-foreground hover:bg-card"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-5 px-5 py-5">
          <div className={`rounded-2xl border ${s.ring} bg-card/40 p-4`}>
            <span
              className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${s.chip}`}
            >
              {s.label}
            </span>
            <p className="mt-2 font-display text-lg font-semibold leading-tight">
              {detail.a.name} <span className="text-muted-foreground">×</span> {detail.b.name}
            </p>
            <p className="mt-1 text-[11px] uppercase tracking-wider text-muted-foreground">
              {detail.a.category} · {detail.b.category}
            </p>
          </div>

          <AckPanel detail={detail} />

          <Section title="Recommended action">
            <p className="text-sm text-foreground">{detail.recommendation}</p>
            <p className="mt-2 text-xs text-muted-foreground">{SEV_ACTION[detail.severity]}</p>
          </Section>

          <Section title="Mechanism">
            <p className="text-sm text-foreground">{detail.mechanism}</p>
            {detail.no_known_interaction ? (
              <NoKnownInteractionLine source={detail.source_refs[0]} className="mt-2 text-xs" />
            ) : (
              <SharedMechanismNote sharedWith={detail.mechanism_shared_with} />
            )}
          </Section>

          <Section title="Rule metadata">
            <dl className="grid grid-cols-[max-content_1fr] gap-x-3 gap-y-1.5 text-xs">
              <dt className="text-muted-foreground">Severity</dt>
              <dd className="text-foreground">{s.label}</dd>
              <dt className="text-muted-foreground">Matched by</dt>
              <dd className="text-foreground">
                {detail.matchedBy === "pair" ? "Direct compound pair" : "Category-level rule"}
              </dd>
              <dt className="text-muted-foreground">Same axis</dt>
              <dd className="text-foreground">
                {detail.same_axis ? "Yes — overlapping mechanism" : "No"}
              </dd>
              <dt className="text-muted-foreground">Confidence</dt>
              <dd className="text-foreground">
                <ConfidenceBadge confidence={detail.confidence} />
              </dd>
              <dt className="text-muted-foreground">Sources</dt>
              <dd className="text-foreground">{detail.source_refs.length}</dd>
            </dl>
          </Section>

          <SourceSections detail={detail} onClose={onClose} />

          <p className="text-[11px] text-muted-foreground">
            Educational summary, not medical advice. Always confirm with your pharmacist or
            physician before changing medications or supplements.
          </p>
        </div>
      </div>
    </div>
  );
}

function SourceSections({ detail, onClose }: { detail: InteractionDetail; onClose: () => void }) {
  const sources = resolveInteractionSources(detail.source_refs, detail.a.name, detail.b.name);
  // Numbered documents and unnumbered publisher search links are kept apart:
  // a search endpoint is somewhere to verify a claim, not a citation of it.
  const cited = documentCitations(sources);
  const verify = verificationLinks(sources);
  return (
    <>
      {cited.length > 0 && (
        <Section title="Sources cited">
          <AuthoritySourceList sources={cited} idPrefix="interaction-source" />
        </Section>
      )}
      {verify.length > 0 && (
        <Section title="Verify at">
          <VerifyAtList sources={verify} />
          <p className="mt-2 text-[11px] text-muted-foreground">
            Publisher search links — places to check this, not citations.
          </p>
        </Section>
      )}
      <Link
        to="/sources"
        onClick={onClose}
        className="inline-block text-xs text-muted-foreground underline underline-offset-4 hover:text-foreground"
      >
        How these interaction rules are sourced and reviewed
      </Link>
    </>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
        {title}
      </h3>
      <div className="mt-2">{children}</div>
    </div>
  );
}

function AckPanel({ detail }: { detail: InteractionDetail }) {
  const { isAcked, ackedAt, acknowledge, unacknowledge } = useInteractionAcks();
  const isMajor = detail.severity === "avoid" || detail.severity === "caution";
  if (!isMajor) return null;

  const acked = isAcked(detail.ackKey);
  const when = ackedAt(detail.ackKey);
  const whenText = when
    ? new Date(when).toLocaleString(undefined, {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
      })
    : null;

  if (acked) {
    return (
      <div className="rounded-2xl border border-[color:var(--severity-synergy)]/40 bg-[color:var(--severity-synergy-bg)] p-3">
        <div className="flex items-start gap-2">
          <ShieldCheck
            className="mt-0.5 h-5 w-5 shrink-0 text-[color:var(--severity-synergy)]"
            aria-hidden
          />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-[color:var(--severity-synergy)]">
              Reviewed and resolved
            </p>
            {whenText && (
              <p className="mt-0.5 text-[11px] text-[color:var(--severity-synergy)]/80">
                Acknowledged {whenText}
              </p>
            )}
            <button
              type="button"
              onClick={() => unacknowledge(detail.ackKey)}
              className="tap-target mt-2 inline-flex h-9 items-center rounded-lg border border-[color:var(--severity-synergy)]/40 bg-background px-3 text-[11px] font-semibold text-[color:var(--severity-synergy)] hover:bg-[color:var(--severity-synergy-bg)]"
            >
              Undo acknowledgement
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-destructive/40 bg-destructive/5 p-3">
      <p className="text-sm font-semibold text-destructive">
        Confirm you've reviewed this {detail.severity === "avoid" ? "AVOID" : "CAUTION"} interaction
      </p>
      <p className="mt-1 text-xs text-foreground">
        Read the recommended action, mechanism, and sources below. Acknowledging marks this
        interaction resolved in your stack.
      </p>
      <button
        type="button"
        onClick={() => acknowledge(detail.ackKey)}
        className="tap-target mt-3 inline-flex h-10 items-center gap-1.5 rounded-lg bg-destructive px-3 text-xs font-semibold text-white hover:brightness-95"
      >
        <Check className="h-3.5 w-3.5" /> I've reviewed this — mark resolved
      </button>
    </div>
  );
}
