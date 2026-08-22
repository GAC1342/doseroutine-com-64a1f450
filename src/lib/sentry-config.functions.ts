import { createServerFn } from "@tanstack/react-start";

/**
 * Returns the Sentry DSN from the server-side runtime secret so it never has
 * to be committed to the repo. A DSN is a public write-only ingest key, so
 * handing it to the browser is expected and safe.
 */
export const getSentryConfig = createServerFn({ method: "GET" }).handler(async () => {
  const dsn = process.env["SENTRY_DSN"] || process.env["VITE_SENTRY_DSN"] || "";
  return { dsn };
});
