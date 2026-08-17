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
  totalBlocks: number;
  topFailures: FailingUrl[];
}

const SchemaValidationReport = ({
  checkedAt,
  sitemapUrl,
  totalUrls,
  checkedUrls,
  urlsWithIssues,
  errorCount,
  warningCount,
  totalBlocks,
  topFailures,
}: Props) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>{`Structured data: ${errorCount} error(s), ${warningCount} warning(s) across ${checkedUrls} URLs`}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>
          Structured data check — {errorCount} error{errorCount === 1 ? "" : "s"}, {warningCount}{" "}
          warning{warningCount === 1 ? "" : "s"}
        </Heading>
        <Text style={text}>
          Automated JSON-LD validation of <a href={sitemapUrl}>{sitemapUrl}</a> at {checkedAt}.
        </Text>
        <Section style={box}>
          <Text style={stat}>
            URLs in sitemap: <strong>{totalUrls}</strong>
          </Text>
          <Text style={stat}>
            Checked this run: <strong>{checkedUrls}</strong>
          </Text>
          <Text style={stat}>
            JSON-LD blocks parsed: <strong>{totalBlocks}</strong>
          </Text>
          <Text style={stat}>
            URLs with issues: <strong>{urlsWithIssues}</strong>
          </Text>
          <Text style={stat}>
            Errors: <strong>{errorCount}</strong> · Warnings: <strong>{warningCount}</strong>
          </Text>
        </Section>
        {topFailures.length > 0 && (
          <Section style={box}>
            <Text style={{ ...stat, fontWeight: 600 }}>
              Top {topFailures.length} URLs with issues:
            </Text>
            {topFailures.map((f) => (
              <div key={f.url}>
                <Text style={errLine}>
                  [{f.status ?? "—"}] {f.errors} error(s), {f.warnings} warning(s)
                  <br />
                  {f.url}
                </Text>
                {f.sampleMessages.slice(0, 3).map((m, i) => (
                  <Text key={i} style={subLine}>
                    • {m}
                  </Text>
                ))}
              </div>
            ))}
          </Section>
        )}
        <Text style={footer}>
          DoseRoutine structured-data monitor · automated. Runs daily via pg_cron. Emails only on
          errors or warnings.
        </Text>
      </Container>
    </Body>
  </Html>
);

export const template = {
  component: SchemaValidationReport,
  subject: (d: Record<string, any>) =>
    d.errorCount > 0
      ? `⚠️ DoseRoutine schema: ${d.errorCount} JSON-LD error(s) on ${d.urlsWithIssues} URL(s)`
      : d.warningCount > 0
        ? `DoseRoutine schema: ${d.warningCount} warning(s) on ${d.urlsWithIssues} URL(s)`
        : `DoseRoutine schema: all ${d.checkedUrls} URLs clean`,
  displayName: "Structured data validation report",
  to: "Nikk.delibasic@gmail.com",
  previewData: {
    checkedAt: new Date().toISOString(),
    sitemapUrl: "https://doseroutine.com/sitemap.xml",
    totalUrls: 467,
    checkedUrls: 467,
    urlsWithIssues: 2,
    errorCount: 3,
    warningCount: 5,
    totalBlocks: 1400,
    topFailures: [
      {
        url: "https://doseroutine.com/library/example",
        status: 200,
        errors: 2,
        warnings: 1,
        sampleMessages: ["BreadcrumbList item 1 missing item URL", "Article missing headline"],
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
