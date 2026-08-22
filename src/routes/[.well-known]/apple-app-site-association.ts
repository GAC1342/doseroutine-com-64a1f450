import { createFileRoute } from "@tanstack/react-router";
import { WEB_ONLY_PATH_PREFIXES } from "@/lib/deep-link";

/**
 * iOS Universal Links association file.
 *
 * Apple fetches https://doseroutine.com/.well-known/apple-app-site-association
 * (no extension, `application/json`, no redirects) when the app is installed.
 * Without it every https://doseroutine.com link opens Safari instead of the
 * app, even though the app declares the associated domain.
 *
 * Served from a route rather than public/ so the content type is guaranteed
 * and the Team ID can come from the environment.
 */
const BUNDLE_ID = "com.doseroutine.app";

function buildAssociation(teamId: string) {
  const appID = `${teamId}.${BUNDLE_ID}`;
  return {
    applinks: {
      details: [
        {
          appIDs: [appID],
          components: [
            // Keep server endpoints and machine-readable files in the browser.
            ...WEB_ONLY_PATH_PREFIXES.map((prefix) => ({
              "/": `${prefix}*`,
              exclude: true,
              comment: "server endpoint or machine-readable file",
            })),
            { "/": "*", comment: "all app routes open in DoseRoutine" },
          ],
        },
      ],
    },
    webcredentials: { apps: [appID] },
  };
}

export const Route = createFileRoute("/.well-known/apple-app-site-association")({
  server: {
    handlers: {
      GET: () => {
        const teamId = process.env["APPLE_TEAM_ID"];
        if (!teamId) {
          // Better to 404 than to publish an association pinned to a wrong
          // Team ID — Apple caches the file aggressively.
          return new Response("apple-app-site-association not configured", {
            status: 404,
            headers: { "content-type": "text/plain; charset=utf-8" },
          });
        }
        return new Response(JSON.stringify(buildAssociation(teamId)), {
          status: 200,
          headers: {
            "content-type": "application/json",
            "cache-control": "public, max-age=3600",
          },
        });
      },
    },
  },
});
