/**
 * Single source of truth for the editorial author identity shown on blog
 * posts and referenced in structured data.
 *
 * Only claims that are true today live here: DoseRoutine content is written
 * and reviewed by the in-house editorial team, not by a licensed clinician.
 * Never add a named reviewer or a credential that cannot be verified.
 */
export const EDITORIAL_AUTHOR = {
  name: "DoseRoutine Editorial Team",
  orgId: "https://doseroutine.com/#organization",
  url: "https://doseroutine.com/about",
  /** One-line summary used under the headline and in the about card. */
  role: "Maintainers of the DoseRoutine compound library and interaction rule set",
  who: "The DoseRoutine Editorial Team maintains the compound library and the interaction rule set behind doseroutine.com.",
  what: "We summarise published trials, regulatory documents (FDA, EMA) and company announcements into plain-English updates. Every factual claim on a post is tied to a linked source below.",
  limits:
    "Posts are written and reviewed by the editorial team, not by a licensed clinician. This is educational reference content — it never recommends an amount for you to take.",
  contactEmail: "support@doseroutine.com",
} as const;

export type SourceKind = "Peer-reviewed" | "Regulatory" | "Trial registry" | "Announcement" | "Reference";

/** Classifies a source by its host so each entry carries a visible label. */
export function sourceKind(url: string): SourceKind {
  let host = "";
  try {
    host = new URL(url).hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    return "Reference";
  }
  if (
    host.endsWith("pubmed.ncbi.nlm.nih.gov") ||
    host.endsWith("ncbi.nlm.nih.gov") ||
    host.endsWith("nejm.org") ||
    host.endsWith("thelancet.com") ||
    host.endsWith("jamanetwork.com") ||
    host.endsWith("nature.com") ||
    host.endsWith("sciencedirect.com") ||
    host.endsWith("cochranelibrary.com") ||
    host.endsWith("doi.org")
  )
    return "Peer-reviewed";
  if (host.endsWith("clinicaltrials.gov") || host.endsWith("isrctn.com")) return "Trial registry";
  if (
    host.endsWith("fda.gov") ||
    host.endsWith("dailymed.nlm.nih.gov") ||
    host.endsWith("ema.europa.eu") ||
    host.endsWith("nih.gov") ||
    host.endsWith("who.int")
  )
    return "Regulatory";
  if (host.includes("investor") || host.includes("press") || host.includes("news")) return "Announcement";
  return "Reference";
}

/** Bare host shown next to a source link, e.g. `pubmed.ncbi.nlm.nih.gov`. */
export function sourceHost(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}
