// Helper to build BreadcrumbList JSON-LD entries for public pages.
const SITE = "https://doseroutine.com";

export type Crumb = { name: string; path: string };

export function breadcrumbSchema(pageUrl: string, crumbs: Crumb[]) {
  const items = [{ name: "Home", path: "/" }, ...crumbs];
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "@id": `${pageUrl}#breadcrumb`,
    itemListElement: items.map((c, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: c.name,
      item: c.path.startsWith("http") ? c.path : `${SITE}${c.path === "/" ? "/" : c.path}`,
    })),
  };
}

export function breadcrumbScript(pageUrl: string, crumbs: Crumb[]) {
  return {
    type: "application/ld+json" as const,
    children: JSON.stringify(breadcrumbSchema(pageUrl, crumbs)),
  };
}
