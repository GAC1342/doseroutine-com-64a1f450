import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Download, ExternalLink } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  KEYWORD_CLUSTERS,
  KEYWORD_PAGE_MAP,
  findCannibalization,
  keywordMapToCsv,
  plannedPages,
  totalMappedVolume,
  type KeywordCluster,
} from "@/lib/keyword-page-map";
import { briefsToCsv, pageBrief } from "@/lib/content-briefs";
import { internalLinkPlanToCsv, internalLinksFor, orphanPages } from "@/lib/internal-linking";
import { routeErrorComponent } from "@/components/route-error-panel";

function download(filename: string, contents: string) {
  const blob = new Blob([contents], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/** Cluster content brief for the page that owns this keyword. */
function BriefBlock({ path }: { path: string }) {
  const brief = pageBrief(path);
  if (!brief) return null;
  const { brief: b, faqs, supportingTerms } = brief;
  return (
    <details className="mt-3 rounded-lg border border-border p-3">
      <summary className="cursor-pointer text-xs font-semibold text-foreground">
        Content brief — {b.cluster} ({b.wordCount[0]}–{b.wordCount[1]} words)
      </summary>
      <p className="mt-2 text-xs text-muted-foreground">{b.searcherGoal}</p>

      <p className="mt-3 text-xs font-semibold text-foreground">Outline</p>
      <ol className="mt-1 list-decimal space-y-1 pl-5 text-xs text-muted-foreground">
        {b.outline.map((section) => (
          <li key={section.heading}>
            <span className="font-medium text-foreground">{section.heading}</span>
            {section.points.length > 0 && <> — {section.points.join("; ")}</>}
          </li>
        ))}
      </ol>

      <p className="mt-3 text-xs font-semibold text-foreground">FAQs to answer</p>
      <ul className="mt-1 list-disc pl-5 text-xs text-muted-foreground">
        {faqs.map((q) => (
          <li key={q}>{q}</li>
        ))}
      </ul>

      <p className="mt-3 text-xs font-semibold text-foreground">Supporting terms</p>
      <div className="mt-1 flex flex-wrap gap-1">
        {supportingTerms.map((t) => (
          <span key={t} className="rounded-full bg-muted px-2 py-0.5 text-[11px]">
            {t}
          </span>
        ))}
      </div>

      <p className="mt-3 text-xs text-muted-foreground">
        <span className="font-semibold text-foreground">Success:</span>{" "}
        {b.successCriteria.join(" · ")}
      </p>
      <p className="mt-1 text-xs text-muted-foreground">
        <span className="font-semibold text-foreground">CTA:</span> {b.primaryCta}
      </p>
      <p className="mt-1 text-xs text-muted-foreground">
        <span className="font-semibold text-foreground">Evidence:</span> {b.evidence}
      </p>
    </details>
  );
}

/** Internal links this page should carry, and why. */
function LinkBlock({ path }: { path: string }) {
  const links = internalLinksFor(path);
  if (links.length === 0) return null;
  return (
    <details className="mt-2 rounded-lg border border-border p-3">
      <summary className="cursor-pointer text-xs font-semibold text-foreground">
        Internal links to include ({links.length})
      </summary>
      <ul className="mt-2 space-y-2 text-xs">
        {links.map((link) => (
          <li key={link.path}>
            <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] uppercase tracking-wide">
              {link.kind}
            </span>{" "}
            <span className="font-medium text-foreground">{link.anchor}</span>{" "}
            <span className="text-muted-foreground">→ {link.path}</span>
            <p className="text-muted-foreground">{link.reason}</p>
          </li>
        ))}
      </ul>
    </details>
  );
}

export const Route = createFileRoute("/_authenticated/admin/keyword-map")({
  errorComponent: routeErrorComponent("admin-keyword-map"),
  head: () => ({
    meta: [
      { title: "Keyword → page map — DoseRoutine" },
      {
        name: "description",
        content:
          "Internal dashboard: which page owns each medication reminder keyword, search intent, funnel stage and coverage gaps.",
      },
      { property: "og:title", content: "Keyword → page map — DoseRoutine" },
      {
        property: "og:description",
        content: "Keyword ownership, intent and gaps for the medication reminder cluster.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: KeywordMapDashboard,
});

function KeywordMapDashboard() {
  const [cluster, setCluster] = useState<KeywordCluster | null>(null);

  const rows = useMemo(
    () => (cluster ? KEYWORD_PAGE_MAP.filter((r) => r.cluster === cluster) : KEYWORD_PAGE_MAP),
    [cluster],
  );
  const conflicts = useMemo(() => findCannibalization(), []);
  const gaps = useMemo(() => plannedPages(), []);
  const orphans = useMemo(() => orphanPages(), []);

  function downloadCsv() {
    const blob = new Blob([keywordMapToCsv(rows)], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "doseroutine-keyword-page-map.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="mx-auto w-full max-w-5xl px-4 pb-24 pt-6">
      <header className="mb-5">
        <h1 className="text-xl font-semibold text-foreground">Keyword → page map</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          One page owns each keyword. Volumes and difficulty are Semrush estimates for the US market
          — planning inputs, not published facts.
        </p>
      </header>

      <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Card className="p-3">
          <p className="text-xs text-muted-foreground">Keywords mapped</p>
          <p className="text-lg font-semibold">{KEYWORD_PAGE_MAP.length}</p>
        </Card>
        <Card className="p-3">
          <p className="text-xs text-muted-foreground">Est. searches/mo</p>
          <p className="text-lg font-semibold">{totalMappedVolume().toLocaleString()}</p>
        </Card>
        <Card className="p-3">
          <p className="text-xs text-muted-foreground">Pages to build</p>
          <p className="text-lg font-semibold">{gaps.length}</p>
        </Card>
        <Card className="p-3">
          <p className="text-xs text-muted-foreground">Overlaps</p>
          <p className="text-lg font-semibold">{conflicts.length}</p>
        </Card>
        <Card className="p-3">
          <p className="text-xs text-muted-foreground">Orphan pages</p>
          <p className="text-lg font-semibold">{orphans.length}</p>
        </Card>
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Button
          variant={cluster === null ? "default" : "outline"}
          size="sm"
          onClick={() => setCluster(null)}
        >
          All
        </Button>
        {KEYWORD_CLUSTERS.map((c) => (
          <Button
            key={c}
            variant={cluster === c ? "default" : "outline"}
            size="sm"
            onClick={() => setCluster(c)}
          >
            {c}
          </Button>
        ))}
        <Button variant="outline" size="sm" className="ml-auto" onClick={downloadCsv}>
          <Download className="mr-1 h-4 w-4" /> Keywords CSV
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => download("doseroutine-content-briefs.csv", briefsToCsv())}
        >
          <Download className="mr-1 h-4 w-4" /> Briefs CSV
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => download("doseroutine-internal-links.csv", internalLinkPlanToCsv())}
        >
          <Download className="mr-1 h-4 w-4" /> Links CSV
        </Button>
      </div>

      {conflicts.length > 0 && (
        <Card className="mb-4 border-destructive/40 bg-destructive/5 p-3 text-sm">
          <p className="font-semibold text-destructive">Keyword overlap detected</p>
          <ul className="mt-1 list-disc pl-5 text-muted-foreground">
            {conflicts.map((c) => (
              <li key={c.keyword}>
                “{c.keyword}” is targeted by {c.paths.join(", ")}
              </li>
            ))}
          </ul>
        </Card>
      )}

      <div className="space-y-3">
        {rows.map((row) => (
          <Card key={row.primaryKeyword} className="p-4">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <p className="font-semibold text-foreground">{row.primaryKeyword}</p>
                <p className="text-xs text-muted-foreground">
                  ~{row.volume.toLocaleString()} searches/mo
                  {row.difficulty !== null ? ` · difficulty ${row.difficulty}/100` : ""} ·{" "}
                  {row.intent} · {row.stage}
                </p>
              </div>
              <Badge variant={row.status === "live" ? "secondary" : "outline"}>
                {row.status === "live" ? "Page live" : "To build"}
              </Badge>
            </div>

            <p className="mt-2 text-sm text-muted-foreground">{row.pageJob}</p>

            <div className="mt-2 text-sm">
              {row.status === "live" ? (
                <Link
                  to={row.targetPath}
                  className="inline-flex items-center gap-1 font-medium text-primary"
                >
                  {row.targetPath} <ExternalLink className="h-3 w-3" />
                </Link>
              ) : (
                <span className="font-medium text-muted-foreground">{row.targetPath}</span>
              )}
            </div>

            <div className="mt-3 flex flex-wrap gap-1">
              {row.supportingKeywords.map((k) => (
                <span key={k} className="rounded-full bg-muted px-2 py-0.5 text-[11px]">
                  {k}
                </span>
              ))}
            </div>

            <ul className="mt-3 list-disc pl-5 text-xs text-muted-foreground">
              {row.questions.map((q) => (
                <li key={q}>{q}</li>
              ))}
            </ul>

            <BriefBlock path={row.targetPath} />
            <LinkBlock path={row.targetPath} />
          </Card>
        ))}
      </div>
    </div>
  );
}
