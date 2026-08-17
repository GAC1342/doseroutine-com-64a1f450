/**
 * Build stamp — identifies the exact build that rendered a page.
 *
 * Both values are injected by Vite `define` at BUILD time (see vite.config.ts)
 * and change on every deploy. They are deliberately NOT derived from the
 * database (`last_reviewed`, `updated_at`) — those describe content, not the
 * deployed artifact, and stay frozen across deploys, which makes them useless
 * for answering "is the crawler seeing the current build?".
 */
declare const __BUILD_ID__: string;
declare const __BUILT_AT__: string;

export const BUILD_STAMP_ID: string =
  typeof __BUILD_ID__ === "string" && __BUILD_ID__ ? __BUILD_ID__ : "dev";

export const BUILT_AT: string =
  typeof __BUILT_AT__ === "string" && __BUILT_AT__
    ? __BUILT_AT__
    : new Date(0).toISOString().replace(/\.\d+Z$/, ".000Z");

/** Meta tags emitted on every server-rendered page. */
export const buildStampMeta = [
  { name: "dr-build", content: BUILD_STAMP_ID },
  { name: "dr-built-at", content: BUILT_AT },
];
