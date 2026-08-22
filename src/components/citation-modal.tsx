import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { fetchCitation, type CitationResult } from "@/lib/citations.functions";
import { classifyCitationUrl } from "@/lib/citation-allowlist";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ExternalLink, Loader2 } from "lucide-react";
import { trackEvent } from "@/lib/analytics";
import { openExternalUrl } from "@/lib/external-link";

type CitationCtx = {
  open: (url: string, label?: string) => void;
};

const Ctx = createContext<CitationCtx | null>(null);

export function useCitationModal(): CitationCtx {
  const ctx = useContext(Ctx);
  if (!ctx) {
    // Graceful no-op if provider is missing — falls back to opening the link.
    return {
      open: (url) => {
        // H2 — route through the shared helper so the native shell hands the
        // citation to the OS browser instead of loading it chrome-less in-app.
        openExternalUrl(url);
      },
    };
  }
  return ctx;
}

/**
 * Wrap any subtree to intercept clicks on trusted-source anchors
 * (PubMed / NIH ODS / MedlinePlus / DailyMed / FDA / etc.) and open a
 * modal with a fetched snippet instead of navigating away.
 */
export function CitationProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<{ url: string; label?: string } | null>(null);
  const fetcher = useServerFn(fetchCitation);

  const open = useCallback((url: string, label?: string) => {
    trackEvent("citation_preview_opened", { url });
    setState({ url, label });
  }, []);

  const value = useMemo<CitationCtx>(() => ({ open }), [open]);

  // Delegates to the shared allowlist classifier so the client-side
  // "is this previewable?" check goes through the SAME parseSafeUrl
  // pipeline as the server SSRF guard. Never call `new URL(...)` here —
  // that would fork the parsing rules and drift from the allowlist.
  const isPreviewable = (href: string) => {
    const target = classifyCitationUrl(href);
    return target.kind !== "reject";
  };

  const handleClickCapture = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.defaultPrevented || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    if (e.button !== 0) return;
    const target = e.target as HTMLElement | null;
    const anchor = target?.closest?.("a") as HTMLAnchorElement | null;
    if (!anchor) return;
    if (anchor.dataset.noCitationModal === "true") return;
    const href = anchor.href;
    if (!href || !isPreviewable(href)) return;
    // Only block the navigation. Do NOT stopPropagation: the anchor's own
    // onClick (e.g. citation_source_open analytics in AuthoritySourceList)
    // must still run, otherwise engagement tracking silently dies for every
    // previewable publisher.
    e.preventDefault();
    open(href, anchor.textContent?.trim() || undefined);
  };

  const { data, isFetching, isError, error } = useQuery({
    queryKey: ["citation", state?.url ?? ""],
    enabled: !!state?.url,
    staleTime: 1000 * 60 * 60, // 1 hour
    queryFn: () => fetcher({ data: { url: state!.url } }) as Promise<CitationResult>,
  });

  return (
    <Ctx.Provider value={value}>
      <div onClickCapture={handleClickCapture}>{children}</div>
      <Dialog
        open={!!state}
        onOpenChange={(o) => {
          if (!o) setState(null);
        }}
      >
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="pr-8 text-left font-display text-lg leading-snug">
              {data?.title ?? state?.label ?? "Loading citation…"}
            </DialogTitle>
            {data?.source && (
              <DialogDescription className="text-left">
                {data.source}
                {data.meta?.journal && ` · ${data.meta.journal}`}
                {data.meta?.year && ` · ${data.meta.year}`}
                {data.meta?.pmid && ` · PMID ${data.meta.pmid}`}
              </DialogDescription>
            )}
          </DialogHeader>
          <div className="max-h-[55vh] overflow-y-auto rounded-lg border border-border bg-muted/30 p-4 text-sm leading-relaxed">
            {isFetching && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading source snippet…
              </div>
            )}
            {isError && (
              <p className="text-destructive">
                {(error as Error)?.message ?? "Unable to load this citation."}
              </p>
            )}
            {!isFetching && !isError && data && (
              <>
                {data.meta?.authors && (
                  <p className="mb-2 text-xs text-muted-foreground">{data.meta.authors}</p>
                )}
                <p className="whitespace-pre-wrap">{data.snippet}</p>
              </>
            )}
          </div>
          <DialogFooter className="gap-2 sm:justify-between">
            <p className="text-[11px] text-muted-foreground">
              Preview snippet only — always verify at the original source.
            </p>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setState(null)}>
                Close
              </Button>
              {state?.url && (
                <Button asChild>
                  <a
                    href={state.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    data-no-citation-modal="true"
                    onClick={() => trackEvent("citation_preview_open_source", { url: state.url })}
                  >
                    Open full source <ExternalLink className="ml-1.5 h-3.5 w-3.5" />
                  </a>
                </Button>
              )}
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Ctx.Provider>
  );
}
