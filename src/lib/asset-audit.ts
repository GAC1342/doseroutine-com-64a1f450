/**
 * Lightweight pre-release asset audit.
 *
 * Complements the existing gates rather than duplicating them:
 *  - e2e/articles-perf.spec.ts gates page-level Core Web Vitals;
 *  - e2e/articles-images.spec.ts gates rendered image sizing;
 *  - this module names the *individual* asset that is too heavy or too slow,
 *    and checks the hero image is set up to paint fast (preload, priority,
 *    eager loading, modern format, sane pixel budget).
 *
 * Everything here is pure — no Playwright, no node:fs — so the same rules run
 * in unit tests and in the browser check.
 */

export type ResourceKind = "image" | "font" | "script" | "stylesheet" | "other";

export type AssetBudget = {
  /** Hard ceiling for a single asset, in transferred bytes. */
  maxBytes: number;
  /** Hard ceiling for how long one asset may take, in milliseconds. */
  maxDurationMs: number;
};

/**
 * Per-type budgets. Deliberately generous — this gate exists to catch the
 * 400KB hero JPEG someone dropped in, not to police every icon.
 */
export const ASSET_BUDGETS: Record<ResourceKind, AssetBudget> = {
  image: { maxBytes: 250_000, maxDurationMs: 1_500 },
  font: { maxBytes: 60_000, maxDurationMs: 1_500 },
  script: { maxBytes: 150_000, maxDurationMs: 1_500 },
  stylesheet: { maxBytes: 60_000, maxDurationMs: 1_500 },
  other: { maxBytes: 250_000, maxDurationMs: 1_500 },
};

/** Total transferred bytes a single page may pull on first load. */
export const MAX_PAGE_TRANSFER_BYTES = 1_200_000;

/** Fraction of a budget at which an asset becomes a warning rather than a pass. */
export const WARN_THRESHOLD = 0.8;

/** How much larger than its displayed box (times DPR) the hero may download. */
export const MAX_HERO_OVERSIZE_RATIO = 2;

/** Formats that should have a modern sibling before shipping as a hero. */
export const LEGACY_HERO_EXTENSIONS = [".png", ".jpg", ".jpeg"];

/** Per-route budget overrides, mirroring perf-budgets.json's routeOverrides. */
export const ROUTE_OVERRIDES: Record<
  string,
  { maxPageBytes?: number; budgets?: Partial<Record<ResourceKind, Partial<AssetBudget>>> }
> = {
  // The articles index renders many card thumbnails; allow a larger total.
  "/articles": { maxPageBytes: 1_500_000 },
};

export type Severity = "fail" | "warn";

export type AssetFinding = {
  severity: Severity;
  /** Asset URL, or the page path for page-level findings. */
  url: string;
  kind: ResourceKind;
  bytes: number;
  durationMs: number;
  message: string;
};

export type AuditedAsset = {
  url: string;
  kind: ResourceKind;
  /** Transferred bytes. 0 when the response had no measurable body. */
  bytes: number;
  durationMs: number;
  /** True when the request started before first contentful paint. */
  renderBlocking?: boolean;
};

export type HeroInfo = {
  url: string;
  bytes: number;
  durationMs: number;
  loading: string | null;
  fetchPriority: string | null;
  hasDimensions: boolean;
  /** True when the served HTML preloads this URL as an image. */
  preloaded: boolean;
  naturalWidth: number;
  naturalHeight: number;
  displayWidth: number;
  displayHeight: number;
  devicePixelRatio: number;
  /** True when a <picture> offers a modern (webp/avif) source. */
  hasModernSource: boolean;
};

export type OffscreenImage = {
  url: string;
  loading: string | null;
  aboveFold: boolean;
};

export type PageAuditInput = {
  path: string;
  assets: AuditedAsset[];
  hero: HeroInfo | null;
  offscreenImages?: OffscreenImage[];
};

export type PageAuditResult = {
  path: string;
  totalBytes: number;
  findings: AssetFinding[];
  failures: AssetFinding[];
  warnings: AssetFinding[];
  passed: boolean;
};

function budgetFor(path: string, kind: ResourceKind): AssetBudget {
  const override = ROUTE_OVERRIDES[path]?.budgets?.[kind];
  return { ...ASSET_BUDGETS[kind], ...(override ?? {}) };
}

function pageByteBudget(path: string): number {
  return ROUTE_OVERRIDES[path]?.maxPageBytes ?? MAX_PAGE_TRANSFER_BYTES;
}

export function formatBytes(bytes: number): string {
  if (bytes >= 1_000_000) return `${(bytes / 1_000_000).toFixed(1)} MB`;
  if (bytes >= 1_000) return `${Math.round(bytes / 1_000)} KB`;
  return `${bytes} B`;
}

function extensionOf(url: string): string {
  const withoutQuery = url.split("?")[0].split("#")[0];
  const dot = withoutQuery.lastIndexOf(".");
  return dot === -1 ? "" : withoutQuery.slice(dot).toLowerCase();
}

/** Findings for one asset: over budget (fail), or in the warning band. */
export function auditAsset(asset: AuditedAsset, path = ""): AssetFinding[] {
  const budget = budgetFor(path, asset.kind);
  const findings: AssetFinding[] = [];
  const base = {
    url: asset.url,
    kind: asset.kind,
    bytes: asset.bytes,
    durationMs: asset.durationMs,
  };

  if (asset.bytes > budget.maxBytes) {
    findings.push({
      ...base,
      severity: "fail",
      message: `${formatBytes(asset.bytes)} exceeds the ${asset.kind} budget of ${formatBytes(budget.maxBytes)}`,
    });
  } else if (asset.bytes >= budget.maxBytes * WARN_THRESHOLD) {
    findings.push({
      ...base,
      severity: "warn",
      message: `${formatBytes(asset.bytes)} is within ${Math.round((1 - WARN_THRESHOLD) * 100)}% of the ${asset.kind} budget`,
    });
  }

  if (asset.durationMs > budget.maxDurationMs) {
    findings.push({
      ...base,
      severity: "fail",
      message: `took ${Math.round(asset.durationMs)}ms (budget ${budget.maxDurationMs}ms)`,
    });
  }

  if (asset.renderBlocking && asset.kind !== "stylesheet") {
    findings.push({ ...base, severity: "warn", message: "requested before first paint" });
  }

  return findings;
}

/** Hero-specific checks — the things that decide how fast the page feels. */
export function auditHero(hero: HeroInfo): AssetFinding[] {
  const base = {
    url: hero.url,
    kind: "image" as const,
    bytes: hero.bytes,
    durationMs: hero.durationMs,
  };
  const fail = (message: string): AssetFinding => ({ ...base, severity: "fail", message });
  const findings: AssetFinding[] = [];

  if (hero.loading === "lazy") findings.push(fail("hero image is lazy-loaded — delays LCP"));
  if (!hero.hasDimensions)
    findings.push(fail("hero image has no width/height — causes layout shift"));
  if (hero.fetchPriority !== "high")
    findings.push(fail('hero image is missing fetchpriority="high"'));
  if (!hero.preloaded) findings.push(fail("hero image is not preloaded in the route head()"));

  if (LEGACY_HERO_EXTENSIONS.includes(extensionOf(hero.url)) && !hero.hasModernSource) {
    findings.push(fail("hero image ships a legacy format with no webp/avif source"));
  }

  const displayedPixels =
    hero.displayWidth * hero.displayHeight * hero.devicePixelRatio * hero.devicePixelRatio;
  const downloadedPixels = hero.naturalWidth * hero.naturalHeight;
  if (displayedPixels > 0 && downloadedPixels > displayedPixels * MAX_HERO_OVERSIZE_RATIO) {
    const ratio = (downloadedPixels / displayedPixels).toFixed(1);
    findings.push(fail(`hero downloads ${ratio}x more pixels than it displays`));
  }

  return findings;
}

/** Full page audit: every asset, the hero, page weight, and eager off-screen images. */
export function auditPage(input: PageAuditInput): PageAuditResult {
  const findings: AssetFinding[] = [];

  for (const asset of input.assets) findings.push(...auditAsset(asset, input.path));
  if (input.hero) findings.push(...auditHero(input.hero));

  const totalBytes = input.assets.reduce((sum, a) => sum + a.bytes, 0);
  const pageBudget = pageByteBudget(input.path);
  if (totalBytes > pageBudget) {
    findings.push({
      severity: "fail",
      url: input.path,
      kind: "other",
      bytes: totalBytes,
      durationMs: 0,
      message: `page transfers ${formatBytes(totalBytes)} (budget ${formatBytes(pageBudget)})`,
    });
  }

  for (const image of input.offscreenImages ?? []) {
    if (!image.aboveFold && image.loading !== "lazy" && image.url !== input.hero?.url) {
      findings.push({
        severity: "warn",
        url: image.url,
        kind: "image",
        bytes: 0,
        durationMs: 0,
        message: "below the fold but loads eagerly",
      });
    }
  }

  const failures = findings.filter((f) => f.severity === "fail");
  const warnings = findings.filter((f) => f.severity === "warn");
  return {
    path: input.path,
    totalBytes,
    findings,
    failures,
    warnings,
    passed: failures.length === 0,
  };
}

/** Worst offender first: failures before warnings, then by bytes. */
export function rankFindings(findings: AssetFinding[]): AssetFinding[] {
  return [...findings].sort((a, b) => {
    if (a.severity !== b.severity) return a.severity === "fail" ? -1 : 1;
    return b.bytes - a.bytes;
  });
}

/** Terminal-friendly report for one page. */
export function formatAssetReport(result: PageAuditResult): string {
  const header = `${result.path.padEnd(38)} total ${formatBytes(result.totalBytes).padStart(8)}   ${
    result.passed ? "PASS" : "FAIL"
  }`;
  const lines = rankFindings(result.findings).map(
    (f) =>
      `  ${f.severity === "fail" ? "FAIL" : "WARN"}  ${shortUrl(f.url).padEnd(28)} ${formatBytes(
        f.bytes,
      ).padStart(8)} ${`${Math.round(f.durationMs)}ms`.padStart(7)}  ${f.message}`,
  );
  return [header, ...lines].join("\n");
}

/** Markdown summary across every audited page, for a CI job summary. */
export function renderAuditMarkdown(results: PageAuditResult[]): string {
  const failing = results.filter((r) => !r.passed);
  const lines = [
    "# Asset audit",
    "",
    `${results.length} pages audited — ${failing.length} failing, ` +
      `${results.reduce((n, r) => n + r.warnings.length, 0)} warnings.`,
    "",
    "| Page | Transfer | Failures | Warnings |",
    "| --- | ---: | ---: | ---: |",
    ...results.map(
      (r) =>
        `| ${r.path} | ${formatBytes(r.totalBytes)} | ${r.failures.length} | ${r.warnings.length} |`,
    ),
  ];

  for (const result of failing) {
    lines.push("", `## ${result.path}`, "");
    for (const finding of rankFindings(result.failures)) {
      lines.push(`- \`${shortUrl(finding.url)}\` — ${finding.message}`);
    }
  }

  return `${lines.join("\n")}\n`;
}

function shortUrl(url: string): string {
  try {
    const { pathname } = new URL(url, "http://localhost");
    const name = pathname.split("/").filter(Boolean).pop() ?? pathname;
    return name.length > 28 ? `…${name.slice(-27)}` : name;
  } catch {
    return url.slice(-28);
  }
}
