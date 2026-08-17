// Referrer-spam blocklist.
//
// These domains send fake referral hits and scraped/auto-generated backlinks.
// They are not real traffic and not real endorsements: they exist to get their
// own name in front of site owners looking at analytics. We drop them from the
// human traffic numbers so the dashboard stays honest, and we list them in the
// disavow file (public/seo/disavow.txt) so Google ignores the links.
//
// Matching is host-based and includes subdomains, so "www.thenet1.com" and
// "a.b.thenet1.com" both match "thenet1.com".

export const SPAM_REFERRER_DOMAINS: string[] = [
  // Reported in Search Console "Top linking sites" — scraper/link-farm networks.
  "thenet1.com",
  "similarpages.com",
  "odiasearch.com",
  // Long-standing analytics referral-spam networks.
  "semalt.com",
  "buttons-for-website.com",
  "darodar.com",
  "ilovevitaly.com",
  "hulfingtonpost.com",
  "best-seo-offer.com",
  "free-share-buttons.com",
  "site-auditor.online",
  "event-tracking.com",
];

function hostOf(referrer: string): string | null {
  const value = referrer.trim();
  if (!value) return null;
  try {
    return new URL(value.includes("://") ? value : `https://${value}`).hostname.toLowerCase();
  } catch {
    return null;
  }
}

/** True when a referrer URL (or bare host) belongs to a known spam network. */
export function isSpamReferrer(referrer: string | undefined | null): boolean {
  if (!referrer) return false;
  const host = hostOf(referrer);
  if (!host) return false;
  const bare = host.startsWith("www.") ? host.slice(4) : host;
  return SPAM_REFERRER_DOMAINS.some((d) => bare === d || bare.endsWith(`.${d}`));
}
