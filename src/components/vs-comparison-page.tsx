import { Link } from "@tanstack/react-router";
import { ArrowRight, CheckCircle2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageProse } from "@/components/page-prose";
import { ProseContainer } from "@/components/prose-container";
import { RelatedLinks } from "@/components/related-links";
import { PublicBackHeader } from "@/components/public-back-header";
import { AttributionFooter } from "@/components/attribution-footer";

export type VsRow = { feature: string; us: boolean | string; them: boolean | string };
export type VsFaq = { q: string; a: string };

function Check({ v }: { v: boolean | string }) {
  if (v === true) return <CheckCircle2 className="h-5 w-5 text-primary" aria-label="Yes" />;
  if (v === false) return <XCircle className="h-5 w-5 text-muted-foreground" aria-label="No" />;
  return <span className="text-sm text-muted-foreground">{v}</span>;
}

export type VsComparisonPageProps = {
  /** Competitor display name, e.g. "Bearable". */
  competitor: string;
  /** Small eyebrow label above the H1. */
  eyebrow: string;
  /** Page H1. */
  heading: string;
  /** Intro paragraph under the H1. */
  intro: string;
  comparison: VsRow[];
  /** Short paragraphs: when the competitor is still the right choice. */
  whenThem: string;
  /** Migration guidance paragraph. */
  migration: string;
  faq: VsFaq[];
  /** Canonical URL of this page, used for the attribution footer. */
  canonical: string;
  /** Route path, e.g. "/vs/bearable". */
  path: string;
  /** page-prose registry id. */
  proseId: string;
};

export function VsComparisonPage({
  competitor,
  eyebrow,
  heading,
  intro,
  comparison,
  whenThem,
  migration,
  faq,
  canonical,
  path,
  proseId,
}: VsComparisonPageProps) {
  return (
    <main id="main-content" tabIndex={-1} className="min-h-dvh bg-background">
      <PublicBackHeader />
      <section className="container mx-auto max-w-4xl px-4 py-12 md:py-20">
        <div className="mb-12 space-y-4 text-center">
          <span className="inline-block text-xs uppercase tracking-widest text-muted-foreground">
            {eyebrow}
          </span>
          <h1 className="text-4xl font-bold tracking-tight md:text-5xl">{heading}</h1>
          <p className="dr-speakable-intro mx-auto max-w-2xl text-lg text-muted-foreground">
            {intro}
          </p>
          <div className="flex flex-wrap justify-center gap-3 pt-2">
            <Button size="lg" asChild>
              <Link to="/install">
                Get started free <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <Link to="/best-dose-tracking-apps">See the full roundup</Link>
            </Button>
          </div>
        </div>

        <Card className="mb-12">
          <CardHeader>
            <CardTitle>DoseRoutine vs {competitor}</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="p-4 text-left font-medium">Feature</th>
                    <th className="p-4 text-center font-medium">DoseRoutine</th>
                    <th className="p-4 text-center font-medium">{competitor}</th>
                  </tr>
                </thead>
                <tbody>
                  {comparison.map((row) => (
                    <tr key={row.feature} className="border-t">
                      <td className="p-4">{row.feature}</td>
                      <td className="p-4 text-center">
                        <div className="flex justify-center">
                          <Check v={row.us} />
                        </div>
                      </td>
                      <td className="p-4 text-center">
                        <div className="flex justify-center">
                          <Check v={row.them} />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        <section className="mb-12">
          <h2 className="mb-4 text-2xl font-bold">When {competitor} is still the right choice</h2>
          <p className="text-muted-foreground">{whenThem}</p>
        </section>

        <section className="mb-12">
          <h2 className="mb-4 text-2xl font-bold">Moving your routine across</h2>
          <p className="text-muted-foreground">{migration}</p>
        </section>

        <section className="mb-12">
          <h2 className="mb-6 text-2xl font-bold">Frequently asked questions</h2>
          <div className="space-y-4">
            {faq.map((f) => (
              <Card key={f.q}>
                <CardContent className="p-6">
                  <h3 className="mb-2 font-semibold">{f.q}</h3>
                  <p className="dr-speakable-answer text-sm text-muted-foreground">{f.a}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        <div className="space-y-4 border-t py-8 text-center">
          <h2 className="text-2xl font-bold">Ready to switch?</h2>
          <p className="text-muted-foreground">
            Free to start. Pro is $9.99/month or $59.99/year. Cancel anytime.
          </p>
          <Button size="lg" asChild>
            <Link to="/install">
              Download DoseRoutine <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
          <p className="pt-4 text-xs text-muted-foreground">
            See also:{" "}
            <Link to="/best-dose-tracking-apps" className="underline">
              Best dose tracking apps
            </Link>{" "}
            ·{" "}
            <Link to="/vs" className="underline">
              All comparisons
            </Link>{" "}
            ·{" "}
            <Link to="/calculator" className="underline">
              All calculators
            </Link>
          </p>
        </div>
      </section>
      <RelatedLinks currentPath={path} kind="comparisons" />
      <ProseContainer>
        <PageProse id={proseId} />
      </ProseContainer>
      <AttributionFooter sourceUrl={canonical} />
    </main>
  );
}
