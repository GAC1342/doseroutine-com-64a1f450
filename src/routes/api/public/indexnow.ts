// IndexNow submission endpoint.
//
// IndexNow lets us tell Bing, Yandex, Seznam and Naver that a URL changed
// instead of waiting for the next crawl. Google does not consume IndexNow,
// but the protocol is shared across the other engines and several AI answer
// engines crawl through Bing's index.
//
// Ownership is proven by hosting a key file at
//   https://doseroutine.com/<KEY>.txt   (contents = the key)
// which lives in public/ next to the other well-known files.
//
// Usage (manual or from a cron job):
//   GET  /api/public/indexnow?url=https://doseroutine.com/faq
//   POST /api/public/indexnow   { "urls": ["https://doseroutine.com/faq", ...] }
//
// Only doseroutine.com URLs are accepted, so an unauthenticated caller can
// never use this to submit somebody else's site or spam the endpoint with
// arbitrary hosts.

import { createFileRoute } from "@tanstack/react-router";
import type {} from "@tanstack/react-start";

const HOST = "doseroutine.com";
const KEY = "8f3c1d94a7b24e56b0d1f27c9a4e6033";
const KEY_LOCATION = `https://${HOST}/${KEY}.txt`;
const ENDPOINT = "https://api.indexnow.org/IndexNow";
const MAX_URLS = 100;

function sanitize(urls: string[]): string[] {
  const out: string[] = [];
  for (const raw of urls) {
    let u: URL;
    try {
      u = new URL(raw.trim());
    } catch {
      continue;
    }
    if (u.protocol !== "https:") continue;
    if (u.hostname !== HOST && u.hostname !== `www.${HOST}`) continue;
    u.hostname = HOST;
    u.hash = "";
    const href = u.toString();
    if (!out.includes(href)) out.push(href);
    if (out.length >= MAX_URLS) break;
  }
  return out;
}

async function submit(urls: string[]): Promise<Response> {
  const urlList = sanitize(urls);
  if (urlList.length === 0) {
    return Response.json(
      { ok: false, error: "No valid doseroutine.com https URLs" },
      { status: 400 },
    );
  }

  const res = await fetch(ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json; charset=utf-8" },
    body: JSON.stringify({ host: HOST, key: KEY, keyLocation: KEY_LOCATION, urlList }),
  });

  return Response.json(
    { ok: res.ok, status: res.status, submitted: urlList.length, urls: urlList },
    { status: res.ok ? 200 : 502 },
  );
}

export const Route = createFileRoute("/api/public/indexnow")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const params = new URL(request.url).searchParams;
        const urls = params.getAll("url");
        if (urls.length === 0) {
          return Response.json({
            ok: true,
            info: "Pass ?url=https://doseroutine.com/... (repeatable) or POST { urls: [...] }",
            keyLocation: KEY_LOCATION,
          });
        }
        return submit(urls);
      },
      POST: async ({ request }) => {
        let body: unknown;
        try {
          body = await request.json();
        } catch {
          return Response.json({ ok: false, error: "Invalid JSON body" }, { status: 400 });
        }
        const urls =
          body && typeof body === "object" && Array.isArray((body as { urls?: unknown }).urls)
            ? ((body as { urls: unknown[] }).urls.filter((u) => typeof u === "string") as string[])
            : [];
        return submit(urls);
      },
    },
  },
});
