import { useEffect, useState } from "react";

type Status = "checking" | "indexable" | "noindex" | "unknown";

/**
 * Small build-verification badge: confirms the current environment is serving
 * this page WITHOUT noindex signals (X-Robots-Tag header or <meta name="robots">).
 * Hidden on the production canonical host so real visitors never see it.
 */
export function IndexStatusBadge() {
  const [status, setStatus] = useState<Status>("checking");
  const [detail, setDetail] = useState<string>("");
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const host = window.location.hostname;
    const isProd = host === "doseroutine.com" || host === "www.doseroutine.com";
    // Hidden for real visitors on production, but ?indexcheck=1 forces it on so
    // the live site's indexability can be verified (manually or by E2E).
    const forced = new URLSearchParams(window.location.search).get("indexcheck") === "1";
    if (isProd && !forced) return;
    setVisible(true);

    let cancelled = false;
    (async () => {
      const metaRobots = document
        .querySelector('meta[name="robots"]')
        ?.getAttribute("content")
        ?.toLowerCase();

      let headerRobots: string | null = null;
      try {
        const res = await fetch(window.location.href, {
          method: "HEAD",
          cache: "no-store",
          credentials: "omit",
        });
        headerRobots = res.headers.get("x-robots-tag");
      } catch {
        headerRobots = null;
      }
      if (cancelled) return;

      const headerNoindex = (headerRobots ?? "").toLowerCase().includes("noindex");
      const metaNoindex = (metaRobots ?? "").includes("noindex");

      if (headerNoindex || metaNoindex) {
        setStatus("noindex");
        setDetail(
          [
            headerNoindex ? `X-Robots-Tag: ${headerRobots}` : null,
            metaNoindex ? `meta robots: ${metaRobots}` : null,
          ]
            .filter(Boolean)
            .join(" · "),
        );
        return;
      }

      setStatus("indexable");
      setDetail(headerRobots ? `X-Robots-Tag: ${headerRobots}` : "no noindex header or meta tag");
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  if (!visible) return null;

  const styles: Record<Status, string> = {
    checking: "border-border text-muted-foreground",
    indexable: "border-secondary text-secondary",
    noindex: "border-destructive text-destructive",
    unknown: "border-border text-muted-foreground",
  };
  const labels: Record<Status, string> = {
    checking: "Checking index status…",
    indexable: "Indexable",
    noindex: "NOINDEX",
    unknown: "Index status unknown",
  };

  return (
    <span
      title={detail || undefined}
      aria-live="polite"
      data-testid="index-status-badge"
      data-status={status}
      data-detail={detail || undefined}
      className={`inline-flex shrink-0 items-center gap-1 rounded-full border px-2 py-1 text-[11px] font-semibold ${styles[status]}`}
    >
      <span aria-hidden="true" className="text-xs leading-none">
        {status === "indexable" ? "✓" : status === "noindex" ? "✕" : "•"}
      </span>
      {labels[status]}
    </span>
  );
}
