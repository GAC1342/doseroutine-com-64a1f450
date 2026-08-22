import { Link } from "@tanstack/react-router";
import { CheckCircle2, XCircle, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PublicBackHeader } from "@/components/public-back-header";
import { AttributionFooter } from "@/components/attribution-footer";
import { AnswerFirst, AeoFaq } from "@/components/aeo-faq";
import { MarketingBlogLinks } from "@/components/marketing-blog-links";
import { PageProse } from "@/components/page-prose";
import { hreflangLinks, ogLocaleMeta } from "@/lib/hreflang";
import { breadcrumbScript } from "@/lib/breadcrumb-schema";
import { aeoFaqScript, answerPageScript } from "@/lib/aeo";
import { appItemListScript } from "@/lib/software-app-schema";
import { withDoseRoutineDescriptionSuffix } from "@/lib/seo-description";
import { pageCardMeta } from "@/lib/social-image-meta";
import type { Roundup, UseCase } from "@/lib/app-roundups";

const SITE = "https://doseroutine.com";

function Cell({ v }: { v: boolean | string }) {
  if (v === true) return <CheckCircle2 className="h-5 w-5 text-primary" aria-label="Yes" />;
  if (v === false) return <XCircle className="h-5 w-5 text-muted-foreground" aria-label="No" />;
  return <span className="text-sm text-muted-foreground">{v}</span>;
}

function baseMeta(
  title: string,
  description: string,
  url: string,
  image: ReturnType<typeof pageCardMeta> = [],
) {
  return [
    { name: "author", content: "DoseRoutine" },
    { name: "copyright", content: "© DoseRoutine — doseroutine.com" },
    { name: "publisher", content: "DoseRoutine" },
    { title },
    {
      name: "robots",
      content: "index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1",
    },
    { name: "description", content: description },
    { property: "og:title", content: title },
    { property: "og:description", content: description },
    { property: "og:type", content: "article" },
    { property: "og:url", content: url },
    { name: "twitter:card", content: "summary_large_image" },
    { name: "twitter:title", content: title },
    { name: "twitter:description", content: description },
    // Branded card + descriptive alt (never a generic "preview image").
    ...image,
    ...ogLocaleMeta("en"),
  ];
}

/** head() config for a roundup page. */
export function roundupHead(data: Roundup) {
  const url = `${SITE}/${data.slug}`;
  const description = withDoseRoutineDescriptionSuffix(data.descriptionLead);
  return {
    meta: baseMeta(data.title, description, url, pageCardMeta(data.slug, data.h1, "roundup")),
    links: [{ rel: "canonical", href: url }, ...hreflangLinks(`/${data.slug}`)],
    scripts: [
      breadcrumbScript(url, [{ name: data.h1, path: `/${data.slug}` }]),
      answerPageScript({
        url,
        name: data.title,
        description,
        datePublished: data.datePublished,
        dateModified: data.dateModified,
        shortAnswer: data.shortAnswer,
        about: data.picks.map((p) => p.name),
      }),
      appItemListScript(url, data.h1, data.picks),
      aeoFaqScript(url, data.faq),
    ],
  };
}

export function RoundupPage({ data }: { data: Roundup }) {
  const url = `${SITE}/${data.slug}`;
  return (
    <div className="min-h-dvh bg-background">
      <PublicBackHeader />
      <main
        id="main-content"
        tabIndex={-1}
        className="container mx-auto max-w-4xl px-4 py-10 md:py-16"
      >
        <h1 className="text-3xl font-bold tracking-tight md:text-4xl">{data.h1}</h1>
        <p className="dr-speakable-intro mt-4 text-lg text-muted-foreground">{data.lead}</p>

        <div className="mt-6 flex flex-wrap gap-3">
          <Button size="lg" asChild>
            <Link to="/auth">
              Sign up free <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
          <Button size="lg" variant="outline" asChild>
            <Link to="/interaction-checker">Try the interaction checker</Link>
          </Button>
        </div>

        <div className="mt-10">
          <AnswerFirst question={data.question}>{data.shortAnswer}</AnswerFirst>
        </div>

        <section className="mt-10" aria-labelledby="picks-heading">
          <h2 id="picks-heading" className="text-2xl font-bold">
            The apps, ranked
          </h2>
          <ol className="mt-4 space-y-4">
            {data.picks.map((p, i) => (
              <li key={p.name}>
                <Card>
                  <CardContent className="space-y-2 p-6">
                    <div className="flex flex-wrap items-baseline gap-2">
                      <span className="text-xs font-semibold uppercase tracking-widest text-primary">
                        #{i + 1}
                      </span>
                      <h3 className="text-lg font-semibold">{p.name}</h3>
                      <span className="text-sm text-muted-foreground">— best for {p.bestFor}</span>
                    </div>
                    <p className="text-sm text-muted-foreground">{p.description}</p>
                  </CardContent>
                </Card>
              </li>
            ))}
          </ol>
        </section>

        <Card className="mt-10">
          <CardHeader>
            <CardTitle>Side-by-side comparison</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <caption className="sr-only">
                  Feature comparison of {data.comparisonColumns.join(", ")}
                </caption>
                <thead className="bg-muted/50">
                  <tr>
                    <th scope="col" className="p-4 text-left font-medium">
                      Feature
                    </th>
                    {data.comparisonColumns.map((c) => (
                      <th key={c} scope="col" className="p-4 text-center font-medium">
                        {c}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {data.comparisonRows.map((row) => (
                    <tr key={row.feature} className="border-t">
                      <th scope="row" className="p-4 text-left font-normal">
                        {row.feature}
                      </th>
                      {row.cells.map((v, i) => (
                        <td
                          key={`${row.feature}-${data.comparisonColumns[i]}`}
                          className="p-4 text-center"
                        >
                          <div className="flex justify-center">
                            <Cell v={v} />
                          </div>
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        <section className="mt-10" aria-labelledby="proof-heading">
          <h2 id="proof-heading" className="text-2xl font-bold">
            Why DoseRoutine leads this list
          </h2>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            {data.proof.map((f) => (
              <Card key={f.title}>
                <CardContent className="space-y-1 p-6">
                  <h3 className="font-semibold">{f.title}</h3>
                  <p className="text-sm text-muted-foreground">{f.body}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        <section className="mt-10" aria-labelledby="caveat-heading">
          <h2 id="caveat-heading" className="text-2xl font-bold">
            When something else is the better pick
          </h2>
          <p className="mt-3 text-muted-foreground">{data.caveat}</p>
        </section>

        <PageProse id={data.slug} />

        <MarketingBlogLinks pageKey={data.slug} />

        <AeoFaq pairs={data.faq} />

        <section className="mt-12 space-y-4 border-t pt-8 text-center">
          <h2 className="text-2xl font-bold">Get access to all DoseRoutine tools</h2>
          <p className="text-muted-foreground">Free to start. No card needed.</p>
          <Button size="lg" asChild>
            <Link to="/auth">
              Sign up free <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
          <p className="pt-4 text-xs text-muted-foreground">
            See also:{" "}
            {data.related.map((r, i) => (
              <span key={r.to}>
                {i > 0 ? " · " : ""}
                <a href={r.to} className="underline">
                  {r.label}
                </a>
              </span>
            ))}
            {" · "}
            <a href="/alternatives" className="underline">
              All app comparisons
            </a>
          </p>
        </section>
      </main>
      <AttributionFooter sourceUrl={url} />
    </div>
  );
}

/** head() config for a /for/<slug> use-case page. */
export function buildUseCaseHead(data: UseCase) {
  const url = `${SITE}/for/${data.slug}`;
  const description = withDoseRoutineDescriptionSuffix(data.descriptionLead);
  return {
    meta: baseMeta(data.title, description, url, pageCardMeta(data.slug, data.h1, "use-case")),
    links: [{ rel: "canonical", href: url }, ...hreflangLinks(`/for/${data.slug}`)],
    scripts: [
      breadcrumbScript(url, [
        { name: "Use cases", path: "/for" },
        { name: data.h1, path: `/for/${data.slug}` },
      ]),
      answerPageScript({
        url,
        name: data.title,
        description,
        datePublished: data.datePublished,
        dateModified: data.dateModified,
        shortAnswer: data.shortAnswer,
      }),
      aeoFaqScript(url, data.faq),
    ],
  };
}

export function UseCasePage({ data }: { data: UseCase }) {
  const url = `${SITE}/for/${data.slug}`;
  return (
    <div className="min-h-dvh bg-background">
      <PublicBackHeader />
      <main
        id="main-content"
        tabIndex={-1}
        className="container mx-auto max-w-3xl px-4 py-10 md:py-16"
      >
        <h1 className="text-3xl font-bold tracking-tight md:text-4xl">{data.h1}</h1>
        <p className="dr-speakable-intro mt-4 text-lg text-muted-foreground">{data.lead}</p>

        <div className="mt-6 flex flex-wrap gap-3">
          <Button size="lg" asChild>
            <Link to="/auth">
              Sign up free <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>

        <div className="mt-10">
          <AnswerFirst question={data.question}>{data.shortAnswer}</AnswerFirst>
        </div>

        <section className="mt-8" aria-labelledby="what-heading">
          <h2 id="what-heading" className="text-2xl font-bold">
            What you get
          </h2>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            {data.bullets.map((b) => (
              <Card key={b.title}>
                <CardContent className="space-y-1 p-6">
                  <h3 className="font-semibold">{b.title}</h3>
                  <p className="text-sm text-muted-foreground">{b.body}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        <MarketingBlogLinks pageKey={data.slug} />

        <AeoFaq pairs={data.faq} />

        <section className="mt-12 space-y-4 border-t pt-8 text-center">
          <h2 className="text-2xl font-bold">Get access to all DoseRoutine tools</h2>
          <p className="text-muted-foreground">Free to start. No card needed.</p>
          <Button size="lg" asChild>
            <Link to="/auth">
              Sign up free <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
          <p className="pt-4 text-xs text-muted-foreground">
            See also:{" "}
            {data.related.map((r, i) => (
              <span key={r.to}>
                {i > 0 ? " · " : ""}
                <a href={r.to} className="underline">
                  {r.label}
                </a>
              </span>
            ))}
            {" · "}
            <a href="/for" className="underline">
              All use cases
            </a>
          </p>
        </section>
      </main>
      <AttributionFooter sourceUrl={url} />
    </div>
  );
}
