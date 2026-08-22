import { Fragment, type ReactNode } from "react";
import { glossaryPattern, isGlossaryTerm } from "@/lib/spelling-glossary";

/**
 * Wraps project vocabulary (brand names, INN compound names) so spell checkers
 * — browser-side and crawler-side site audits — skip it instead of reporting a
 * misspelling. Purely presentational: no layout or styling change.
 */
export function Term({ children }: { children: ReactNode }) {
  return (
    <span translate="no" spellCheck={false} data-glossary-term="">
      {children}
    </span>
  );
}

/**
 * Renders a plain string with every known glossary term wrapped in <Term>.
 * Text that contains no glossary terms is returned untouched.
 */
export function GlossaryText({ children }: { children: string }) {
  const pattern = glossaryPattern();
  const parts: ReactNode[] = [];
  let last = 0;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(children)) !== null) {
    if (!isGlossaryTerm(match[0])) continue;
    if (match.index > last) parts.push(children.slice(last, match.index));
    parts.push(<Term key={`${match.index}-${match[0]}`}>{match[0]}</Term>);
    last = match.index + match[0].length;
  }
  if (parts.length === 0) return <>{children}</>;
  if (last < children.length) parts.push(children.slice(last));
  return (
    <>
      {parts.map((part, i) => (
        <Fragment key={i}>{part}</Fragment>
      ))}
    </>
  );
}
