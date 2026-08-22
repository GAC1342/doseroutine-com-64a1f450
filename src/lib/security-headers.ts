/**
 * Security response headers.
 *
 * Applied to every response in `src/server.ts`. The policy is intentionally
 * strict: a nonce plus `strict-dynamic` means an injected `<script>` tag can
 * never execute, even if some future bug lets attacker text reach the DOM.
 *
 * Development relaxes script rules (Vite's HMR client evaluates code and opens
 * a websocket) and reports instead of enforcing, so a local experiment never
 * breaks the preview while still surfacing violations in the console.
 */

import { STABLE_INLINE_SCRIPTS } from "./boot-script";

export interface SecurityHeaderOptions {
  /** Request URL — decides HSTS (https only) and dev-server allowances. */
  url: URL;
  /** True for text/html responses; non-HTML skips CSP and framing rules. */
  isHtml: boolean;
  /** Per-response nonce; required to enforce the script policy. */
  nonce?: string;
  /** `sha256-...` hashes of the inline scripts in this document. */
  scriptHashes?: string[];
  /** Relaxed + report-only. */
  dev?: boolean;
}

/** Origins the browser genuinely needs to reach. Everything else is blocked. */
const CONNECT_ORIGINS = [
  "https://*.supabase.co",
  "wss://*.supabase.co",
  "https://ai.gateway.lovable.dev",
];

const IMAGE_ORIGINS = [
  "https://wsrv.nl",
  "https://images.openfoodfacts.org",
  "https://world.openfoodfacts.org",
  "https://*.supabase.co",
];

/**
 * Where browsers post CSP violations. A same-origin public endpoint, so it
 * works for every visitor with no third-party allowance in the policy itself.
 * The classic failure this catches: a platform-injected script (e.g.
 * `/~flock.js`) getting blocked in real user traffic even though local checks
 * looked fine.
 */
export const CSP_REPORT_PATH = "/api/public/csp-report";
export const CSP_REPORT_GROUP = "csp-endpoint";
/** `Reporting-Endpoints` header value for the modern Reporting API (report-to). */
export const REPORTING_ENDPOINTS = `${CSP_REPORT_GROUP}="${CSP_REPORT_PATH}"`;

export const HSTS_VALUE = "max-age=63072000; includeSubDomains; preload";
export const REFERRER_POLICY = "strict-origin-when-cross-origin";
export const PERMISSIONS_POLICY = [
  // The meal/barcode scanner needs the camera; nothing else is used.
  "camera=(self)",
  "microphone=()",
  "geolocation=()",
  "payment=()",
  "usb=()",
  "interest-cohort=()",
].join(", ");

export function buildContentSecurityPolicy({
  nonce,
  scriptHashes = [],
  dev = false,
}: {
  nonce?: string;
  scriptHashes?: string[];
  dev?: boolean;
}): string {
  // Hashes are preferred over nonces in production: the response bytes are then
  // identical for every visitor, so the edge can cache the HTML and conditional
  // requests can 304. A nonce is still supported for callers that need one.
  const strict = Boolean(nonce) || scriptHashes.length > 0;
  const scriptSrc = ["'self'"];
  if (nonce) scriptSrc.push(`'nonce-${nonce}'`);
  for (const hash of scriptHashes) scriptSrc.push(`'${hash}'`);
  if (strict) scriptSrc.push("'strict-dynamic'");
  if (dev) scriptSrc.push("'unsafe-inline'", "'unsafe-eval'");
  // `https:` is ignored by browsers that honour strict-dynamic and acts as a
  // sane fallback for the ones that don't.
  if (strict && !dev) scriptSrc.push("https:");

  // `strict-dynamic` disables host allowlisting, which also blocks first-party
  // scripts the host platform injects into the published HTML (e.g. /~flock.js).
  // `script-src-elem` keeps those same-origin tags loadable without opening the
  // policy to third-party hosts or inline script.
  const scriptSrcElem = ["'self'"];
  if (nonce) scriptSrcElem.push(`'nonce-${nonce}'`);
  for (const hash of scriptHashes) scriptSrcElem.push(`'${hash}'`);
  if (dev) scriptSrcElem.push("'unsafe-inline'", "'unsafe-eval'");

  const connectSrc = ["'self'", ...CONNECT_ORIGINS];
  if (dev) connectSrc.push("ws:", "wss:", "http://localhost:*");

  const directives: Array<[string, string[]]> = [
    ["default-src", ["'self'"]],
    ["base-uri", ["'self'"]],
    ["object-src", ["'none'"]],
    ["frame-ancestors", ["'none'"]],
    ["form-action", ["'self'"]],
    ["script-src", scriptSrc],
    ["script-src-elem", scriptSrcElem],

    // React sets style attributes and our theme script writes inline styles;
    // there is no way to nonce those, and inline CSS is not an XSS vector here.
    ["style-src", ["'self'", "'unsafe-inline'"]],
    ["img-src", ["'self'", "data:", "blob:", ...IMAGE_ORIGINS]],
    ["font-src", ["'self'", "data:"]],
    ["connect-src", connectSrc],
    ["media-src", ["'self'", "blob:"]],
    ["worker-src", ["'self'", "blob:"]],
    ["manifest-src", ["'self'"]],
    // Stripe Checkout/Elements mounts its payment iframes from js.stripe.com.
    ["frame-src", ["'self'", "https://js.stripe.com", "https://hooks.stripe.com"]],
  ];

  const policy = directives.map(([name, values]) => `${name} ${values.join(" ")}`);
  if (!dev) policy.push("upgrade-insecure-requests");
  // Both spellings: `report-uri` is what Safari/older Chrome still honour,
  // `report-to` is the modern Reporting API (paired with Reporting-Endpoints).
  policy.push(`report-uri ${CSP_REPORT_PATH}`);
  policy.push(`report-to ${CSP_REPORT_GROUP}`);
  return policy.join("; ");
}

/**
 * Header name/value pairs for a response. HSTS is emitted only over https —
 * sending it on a plain-http dev origin is meaningless and can pin localhost.
 */
export function buildSecurityHeaders(options: SecurityHeaderOptions): Record<string, string> {
  const { url, isHtml, nonce, scriptHashes, dev = false } = options;
  const headers: Record<string, string> = {
    "X-Content-Type-Options": "nosniff",
    "Referrer-Policy": REFERRER_POLICY,
    "Cross-Origin-Opener-Policy": "same-origin",
    "X-Permitted-Cross-Domain-Policies": "none",
  };

  if (url.protocol === "https:") headers["Strict-Transport-Security"] = HSTS_VALUE;

  if (isHtml) {
    headers["X-Frame-Options"] = "DENY";
    headers["Reporting-Endpoints"] = REPORTING_ENDPOINTS;
    headers["Permissions-Policy"] = PERMISSIONS_POLICY;
    const csp = buildContentSecurityPolicy({ nonce, scriptHashes, dev });
    headers[dev ? "Content-Security-Policy-Report-Only" : "Content-Security-Policy"] = csp;
  }

  return headers;
}

/** 128 bits of randomness, base64 — regenerated for every HTML response. */
export function createNonce(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

/**
 * Stamp the nonce onto every inline/module script the framework rendered.
 *
 * Only `<script` start tags are touched, and only when they don't already
 * carry a nonce, so the HTML body itself is never rewritten.
 */
export function applyNonceToHtml(html: string, nonce: string): string {
  return html.replace(
    /<script(?=[\s>])((?:[^>"']|"[^"]*"|'[^']*')*)>([\s\S]*?)<\/script\s*>/gi,
    (match, attrs: string, body: string) => {
      if (/\bnonce=/i.test(attrs)) return match;
      // Stable snippets are allowed by their sha256 hash instead. Leaving them
      // nonce-free keeps them valid when a browser replays a cached HTML body
      // after a 304 (where the stored policy carries an older nonce).
      if (STABLE_INLINE_SCRIPTS.includes(body)) return match;
      return `<script nonce="${nonce}"${attrs}>${body}</script>`;
    },
  );
}

/** sha256 sources for the stable snippets — computed once per worker. */
let stableHashesPromise: Promise<string[]> | undefined;
export function stableScriptHashes(): Promise<string[]> {
  stableHashesPromise ??= Promise.all(STABLE_INLINE_SCRIPTS.map(sha256Source));
  return stableHashesPromise;
}

async function sha256Source(source: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(source));
  let binary = "";
  for (const byte of new Uint8Array(digest)) binary += String.fromCharCode(byte);
  return `sha256-${btoa(binary)}`;
}

/** Every inline `<script>` body in the document, in source order. */
export function extractInlineScripts(html: string): string[] {
  const scripts: string[] = [];
  const re = /<script((?:[^>"']|"[^"]*"|'[^']*')*)>([\s\S]*?)<\/script\s*>/gi;
  let match: RegExpExecArray | null;
  while ((match = re.exec(html))) {
    const attrs = match[1] ?? "";
    // `src` scripts have no inline body to hash; `script-src-elem 'self'`
    // already covers the same-origin ones we load.
    if (/\bsrc\s*=/i.test(attrs)) continue;
    scripts.push(match[2] ?? "");
  }
  return scripts;
}

/** `sha256-<base64>` CSP source expressions for the document's inline scripts. */
export async function computeScriptHashes(html: string): Promise<string[]> {
  const seen = new Set<string>();
  for (const source of extractInlineScripts(html)) {
    seen.add(await sha256Source(source));
  }
  return [...seen];
}

/**
 * Apply the policy to a finished response.
 *
 * HTML gets a per-response nonce stamped onto every inline script the
 * framework rendered. Hash-only policies were tried and broke the published
 * site: the hosting layer injects extra inline scripts into the HTML after we
 * hash it, so those (and the hydration payload they run with) were refused.
 * Dev, non-HTML, 304s and bodiless responses only get the header set.
 */
export async function secureResponse(
  request: Request,
  response: Response,
  { dev = false }: { dev?: boolean } = {},
): Promise<Response> {
  const url = new URL(request.url);
  const isHtml = (response.headers.get("content-type") ?? "").includes("text/html");
  const inspectBody = isHtml && !dev && response.status !== 304 && Boolean(response.body);

  const nonce = inspectBody ? createNonce() : undefined;
  const rawHtml = inspectBody ? await response.text() : undefined;
  const html = rawHtml !== undefined && nonce ? applyNonceToHtml(rawHtml, nonce) : rawHtml;

  // Stable startup snippets are allowed by hash on every HTML response, so
  // they survive nonce rotation and cached-body revalidation.
  const scriptHashes = isHtml && !dev ? await stableScriptHashes() : undefined;

  const headers = new Headers(response.headers);
  for (const [name, value] of Object.entries(
    buildSecurityHeaders({ url, isHtml, nonce, scriptHashes, dev }),
  )) {
    headers.set(name, value);
  }

  return new Response(html ?? response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}
