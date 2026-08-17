import * as React from "react";
import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Section,
  Text,
} from "@react-email/components";
import type { TemplateEntry } from "./registry";

interface FailingUrl {
  url: string;
  status: number | null;
  errors: number;
  warnings: number;
  sampleMessages: string[];
}

interface Props {
  checkedAt: string;
  sitemapUrl: string;
  totalUrls: number;
  checkedUrls: number;
  urlsWithIssues: number;
  errorCount: number;
  warningCount: number;
  byCheck: { check: string; count: number }[];
  topFailures: FailingUrl[];
}

const CHECK_LABELS: Record<string, string> = {
  header_attribution: "X-Content-Attribution header",
  header_cite_as: 'Link rel="cite-as" header',
  visible_credit: "Visible credit line",
  jsonld_publisher: "JSON-LD publisher",
  meta_author: "meta author",
  canonical: "Canonical URL",
  fetch: "Page fetch failed",
};

const AttributionCrawlReport = ({
  checkedAt,
  sitemapUrl,
  totalUrls,
  checkedUrls,
  urlsWithIssues,
  errorCount,
  warningCount,
  byCheck,
  topFailures,
}: Props) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>{`Attribution check: ${errorCount} error(s) across ${checkedUrls} pages`}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>
          Content attribution check — {errorCount} error
          {errorCount === 1 ? "" : "s"}, {warningCount} warning
          {warningCount === 1 ? "" : "s"}
        </Heading>
        <Text style={text}>
          Crawled every public page in <a href={sitemapUrl}>{sitemapUrl}</a> as an AI scraper at{" "}
          {checkedAt}, verifying attribution headers, the visible credit line, and publisher
          JSON-LD.
        </Text>
        <Section style={box}>
          <Text style={stat}>
            URLs in sitemap: <strong>{totalUrls}</strong>
          </Text>
          <Text style={stat}>
            Checked this run: <strong>{checkedUrls}</strong>
          </Text>
          <Text style={stat}>
            Pages losing credit: <strong>{urlsWithIssues}</strong>
          </Text>
        </Section>

        {byCheck.length > 0 && (
          <Section>
            <Text style={text}>
              <strong>Failures by check</strong>
            </Text>
            {byCheck.map((b) => (
              <Text key={b.check} style={stat}>
                {CHECK_LABELS[b.check] ?? b.check}: <strong>{b.count}</strong>
              </Text>
            ))}
          </Section>
        )}

        {topFailures.length > 0 && (
          <Section>
            <Text style={text}>
              <strong>Affected pages</strong>
            </Text>
            {topFailures.map((f) => (
              <Section key={f.url}>
                <Text style={errLine}>
                  {f.url} {f.status ? `(HTTP ${f.status})` : "(no response)"}
                </Text>
                {f.sampleMessages.map((m, i) => (
                  <Text key={i} style={subLine}>
                    · {m}
                  </Text>
                ))}
              </Section>
            ))}
          </Section>
        )}

        <Text style={footer}>
          DoseRoutine attribution monitor · automated. Runs daily via pg_cron. Emails only when a
          page loses an attribution signal.
        </Text>
      </Container>
    </Body>
  </Html>
);

export const template = {
  component: AttributionCrawlReport,
  subject: (d: Record<string, any>) =>
    d.errorCount > 0
      ? `⚠️ DoseRoutine attribution: ${d.urlsWithIssues} page(s) losing credit`
      : d.warningCount > 0
        ? `DoseRoutine attribution: ${d.warningCount} warning(s) on ${d.urlsWithIssues} page(s)`
        : `DoseRoutine attribution: all ${d.checkedUrls} pages credited`,
  displayName: "Content attribution crawl report",
  to: "Nikk.delibasic@gmail.com",
  previewData: {
    checkedAt: new Date().toISOString(),
    sitemapUrl: "https://doseroutine.com/sitemap.xml",
    totalUrls: 602,
    checkedUrls: 602,
    urlsWithIssues: 1,
    errorCount: 2,
    warningCount: 0,
    byCheck: [
      { check: "visible_credit", count: 1 },
      { check: "jsonld_publisher", count: 1 },
    ],
    topFailures: [
      {
        url: "https://doseroutine.com/library/example",
        status: 200,
        errors: 2,
        warnings: 0,
        sampleMessages: [
          "No visible DoseRoutine credit line in the rendered page",
          "No JSON-LD node credits DoseRoutine as publisher/author",
        ],
      },
    ],
  },
} satisfies TemplateEntry;

const main = { backgroundColor: "#ffffff", fontFamily: "Arial, sans-serif" };
const container = { padding: "24px", maxWidth: "640px" };
const h1 = { fontSize: "20px", margin: "0 0 12px" };
const text = { fontSize: "14px", lineHeight: "20px", color: "#111" };
const box = {
  background: "#f6f7f9",
  padding: "12px 16px",
  borderRadius: "8px",
  margin: "12px 0",
};
const stat = { fontSize: "13px", margin: "4px 0", color: "#111" };
const errLine = {
  fontSize: "12px",
  margin: "10px 0 2px",
  color: "#a11",
  fontFamily: "monospace",
  wordBreak: "break-all" as const,
};
const subLine = {
  fontSize: "11px",
  margin: "2px 0 2px 12px",
  color: "#333",
  fontFamily: "monospace",
};
const footer = { fontSize: "11px", color: "#666", marginTop: "20px" };
