/**
 * Interaction rule / user-note source references.
 *
 * Stored refs come in a few shapes:
 *   "Label|https://example.com/paper"
 *   "https://example.com/paper"
 *   "PMID: 12345678"
 *   "doi:10.1000/xyz123"
 *   "Manufacturer labeling"            (no link — render as plain text)
 *
 * `parseSourceRef` normalizes all of them into a link when one can be
 * derived, with a short human label.
 */

export type ParsedSource = {
  /** Short human-readable label, e.g. "pubmed.ncbi.nlm.nih.gov" or "PMID 12345678". */
  label: string;
  /** Resolved absolute URL, or null when the ref is not linkable. */
  url: string | null;
  /** Where the link came from — used for small UI hints. */
  kind: "url" | "pubmed" | "doi" | "text";
};

function hostLabel(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

export function parseSourceRef(raw: string): ParsedSource | null {
  const ref = (raw ?? "").trim();
  if (!ref) return null;

  const [rawLabel, rawUrl] = ref.includes("|") ? ref.split("|") : [ref, ref];
  const candidate = (rawUrl ?? rawLabel ?? "").trim();
  let label = (rawLabel ?? "").trim();

  if (/^https?:\/\//i.test(candidate)) {
    if (!label || label === candidate) label = hostLabel(candidate);
    return { label, url: candidate, kind: "url" };
  }

  const pmid = candidate.match(/\bPMID:?\s*(\d{4,9})\b/i);
  if (pmid) {
    return {
      label: `PMID ${pmid[1]}`,
      url: `https://pubmed.ncbi.nlm.nih.gov/${pmid[1]}/`,
      kind: "pubmed",
    };
  }

  const doi = candidate.match(/\b(?:doi:\s*)?(10\.\d{4,9}\/\S+)/i);
  if (doi) {
    const id = doi[1].replace(/[).,;]+$/, "");
    return { label: `DOI ${id}`, url: `https://doi.org/${id}`, kind: "doi" };
  }

  return { label: label || candidate, url: null, kind: "text" };
}

/** Parse a list of refs, dropping empties and de-duplicating by url/label. */
export function parseSourceRefs(refs: readonly string[] | null | undefined): ParsedSource[] {
  const out: ParsedSource[] = [];
  const seen = new Set<string>();
  for (const raw of refs ?? []) {
    const parsed = parseSourceRef(raw);
    if (!parsed) continue;
    const key = (parsed.url ?? parsed.label).toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(parsed);
  }
  return out;
}

/** First linkable source in a list, if any. */
export function primarySource(refs: readonly string[] | null | undefined): ParsedSource | null {
  return parseSourceRefs(refs).find((s) => s.url) ?? null;
}
