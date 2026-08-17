import { useCallback, useEffect, useState } from "react";
import { BUILD_ID, assetUrl } from "@/lib/asset-url";

const POLL_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes
const ENDPOINT = "/api/public/build-id";

/** Match brand assets whose old-branded copies may be sitting in Cache Storage
 *  from a prior visit. Query strings vary (?v=BUILD_ID), so match by pathname. */
const BRAND_ASSET_RE =
  /\/(icon-[^/?#]+\.png|apple-touch-icon\.png|manifest\.webmanifest|splash\/[^/?#]+\.png)(\?|$)/i;

async function purgeBrandAssetCaches(): Promise<void> {
  try {
    if (typeof caches === "undefined") return;
    const names = await caches.keys();
    await Promise.allSettled(
      names.map(async (name) => {
        const cache = await caches.open(name);
        const reqs = await cache.keys();
        await Promise.allSettled(
          reqs.filter((r) => BRAND_ASSET_RE.test(r.url)).map((r) => cache.delete(r)),
        );
      }),
    );
  } catch {
    // Non-fatal — reload will still refetch with a new BUILD_ID.
  }
}

async function updateServiceWorkers(): Promise<void> {
  try {
    if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return;
    const regs = await navigator.serviceWorker.getRegistrations();
    await Promise.allSettled(regs.map((r) => r.update()));
  } catch {
    // Non-fatal.
  }
}

/** Reload after refreshing the manifest link so a fresh install picks up
 *  the newest name / icons. Already-installed PWAs cache the manifest at
 *  install time — those users need to reinstall — but web visitors and
 *  first-time installers get the newest metadata immediately. */
async function refreshManifestAndReload() {
  await Promise.allSettled([purgeBrandAssetCaches(), updateServiceWorkers()]);
  try {
    const link = document.querySelector<HTMLLinkElement>('link[rel="manifest"]');
    if (link) {
      // Force a fresh manifest fetch by re-inserting with a cache-busted URL.
      const fresh = link.cloneNode(true) as HTMLLinkElement;
      fresh.href = assetUrl("/manifest.webmanifest") + `&r=${Date.now()}`;
      link.parentNode?.replaceChild(fresh, link);
    }
  } catch {
    // Non-fatal — reload will still pull the new HTML with a new manifest URL.
  }
  window.location.reload();
}

async function fetchLatestBuildId(signal?: AbortSignal): Promise<string | null> {
  try {
    const res = await fetch(`${ENDPOINT}?t=${Date.now()}`, {
      cache: "no-store",
      credentials: "same-origin",
      signal,
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { id?: unknown };
    return typeof data.id === "string" ? data.id : null;
  } catch {
    return null;
  }
}

export function useBuildUpdateCheck() {
  const [updateAvailable, setUpdateAvailable] = useState(false);

  const check = useCallback(
    async (signal?: AbortSignal) => {
      if (updateAvailable) return; // Latch — no need to keep polling.
      const latest = await fetchLatestBuildId(signal);
      if (!latest || latest === "dev") return;
      if (latest !== BUILD_ID) setUpdateAvailable(true);
    },
    [updateAvailable],
  );

  useEffect(() => {
    if (BUILD_ID === "dev") return; // Skip in local dev.
    const ctrl = new AbortController();
    check(ctrl.signal);

    const interval = window.setInterval(() => check(), POLL_INTERVAL_MS);
    const onFocus = () => check();
    const onVisibility = () => {
      if (document.visibilityState === "visible") check();
    };
    const onOnline = () => check();

    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("online", onOnline);

    return () => {
      ctrl.abort();
      window.clearInterval(interval);
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("online", onOnline);
    };
  }, [check]);

  return { updateAvailable, reload: refreshManifestAndReload };
}
