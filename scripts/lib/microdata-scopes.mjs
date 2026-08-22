/**
 * Microdata scope parsing shared by the CI validator and its unit tests.
 *
 * Two failure modes are what audit tools report as "no micromarkup" AND
 * "has micromarkup" at the same time:
 *   • more than one page-level scope (duplicate/conflicting scopes),
 *   • a scope that declares an itemtype but carries no itemprop values.
 */

/** Page-level itemtypes — exactly one of these may exist per document. */
export const PAGE_TYPES = [
  "WebPage",
  "CollectionPage",
  "MedicalWebPage",
  "ItemPage",
  "AboutPage",
  "ProfilePage",
];

const SCOPE_TAG = /<([a-zA-Z][a-zA-Z0-9-]*)\b([^>]*\bitemscope\b[^>]*)>/g;

function attr(attrs, name) {
  const m = new RegExp(`\\b${name}=["']([^"']*)["']`).exec(attrs);
  return m ? m[1] : null;
}

/**
 * One entry per `itemscope` element, with its itemtype, the itemprop it is
 * attached to (nested scopes only), and the itemprop values that follow it
 * before the next scope opens.
 *
 * Slicing "this scope tag → next scope tag" is deliberate: it answers the only
 * question the audit asks — does this scope carry values, or is it empty?
 */
export function parseScopes(html) {
  const tags = [...html.matchAll(SCOPE_TAG)];
  return tags.map((m, i) => {
    const attrs = m[2];
    const start = (m.index ?? 0) + m[0].length;
    const end = tags[i + 1]?.index ?? html.length;
    const propNames = [...html.slice(start, end).matchAll(/\bitemprop=["']([^"']+)["']/g)].map(
      (p) => p[1],
    );
    // A scope whose very next element is a nested property scope (e.g.
    // FAQPage → itemprop="mainEntity") carries that itemprop as its value,
    // even though it sits on the child tag.
    const nestedProp = tags[i + 1]?.[2] ? attr(tags[i + 1][2], "itemprop") : null;
    if (nestedProp) propNames.push(nestedProp);
    return {
      tag: m[1].toLowerCase(),
      type: attr(attrs, "itemtype"),
      prop: attr(attrs, "itemprop"),
      props: propNames.length,
      propNames,
    };
  });
}

/** True when the itemtype is one of the page-level types. */
export function isPageType(itemtype) {
  if (!itemtype) return false;
  return PAGE_TYPES.some((t) => new RegExp(`schema\\.org/${t}$`).test(itemtype));
}

/**
 * Validates that a document renders exactly one page-level scope and that no
 * scope is empty or untyped. Returns human-readable problems.
 */
export function checkScopes(path, html) {
  const problems = [];
  const scopes = parseScopes(html);

  if (scopes.length === 0) {
    problems.push(`${path}: no itemscope elements at all`);
    return problems;
  }

  // A nested scope carries an itemprop (e.g. itemprop="publisher"); a
  // page-level scope does not.
  const pageScopes = scopes.filter((s) => isPageType(s.type) && !s.prop);
  if (pageScopes.length === 0) {
    problems.push(
      `${path}: no page-level microdata scope (expected one of ${PAGE_TYPES.join(", ")})`,
    );
  } else if (pageScopes.length > 1) {
    problems.push(
      `${path}: ${pageScopes.length} page-level scopes render (${pageScopes
        .map((s) => s.type)
        .join(", ")}) — exactly one is allowed`,
    );
  }

  for (const s of scopes) {
    if (!s.type) problems.push(`${path}: <${s.tag}> has itemscope without itemtype`);
    else if (s.props === 0) {
      problems.push(
        `${path}: empty microdata scope <${s.tag} itemtype="${s.type}"> has no itemprop values`,
      );
    }
  }

  return problems;
}
