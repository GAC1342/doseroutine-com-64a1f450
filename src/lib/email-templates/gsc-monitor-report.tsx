/* eslint-disable @typescript-eslint/no-use-before-define -- lint-baseline: pre-existing violations in this file; new files must not add these. */
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

interface Issue {
  kind: string;
  message: string;
  before?: string;
  after?: string;
}

interface Props {
  checkedAt: string;
  siteUrl: string;
  sitemapPath?: string | null;
  sitemapLastDownloaded?: string | null;
  sitemapErrors?: number | null;
  sitemapWarnings?: number | null;
  sitemapUrlCount?: number | null;
  indexed?: number | null;
  inspected?: number | null;
  clicks?: number | null;
  impressions?: number | null;
  issues: Issue[];
}

const GscMonitorReport = ({
  checkedAt,
  siteUrl,
  sitemapPath,
  sitemapLastDownloaded,
  sitemapErrors,
  sitemapWarnings,
  sitemapUrlCount,
  indexed,
  inspected,
  clicks,
  impressions,
  issues,
}: Props) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>{`Search Console: ${issues.length} issue(s)`}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>
          Search Console monitor — {issues.length} issue{issues.length === 1 ? "" : "s"}
        </Heading>
        <Text style={text}>
          Daily snapshot for <strong>{siteUrl}</strong> at {checkedAt}.
        </Text>
        <Section style={box}>
          <Text style={stat}>
            Sitemap: <strong>{sitemapPath ?? "—"}</strong>
          </Text>
          <Text style={stat}>
            Last fetched by Google: <strong>{sitemapLastDownloaded ?? "unknown"}</strong>
          </Text>
          <Text style={stat}>
            Sitemap errors / warnings:{" "}
            <strong>
              {sitemapErrors ?? 0} / {sitemapWarnings ?? 0}
            </strong>
          </Text>
          <Text style={stat}>
            URLs in sitemap: <strong>{sitemapUrlCount ?? "—"}</strong>
          </Text>
          <Text style={stat}>
            Indexed (monitored pages):{" "}
            <strong>
              {indexed ?? 0} of {inspected ?? 0}
            </strong>
          </Text>
          <Text style={stat}>
            Last 28 days:{" "}
            <strong>
              {clicks ?? 0} clicks · {impressions ?? 0} impressions
            </strong>
          </Text>
        </Section>
        {issues.length > 0 && (
          <Section style={box}>
            {issues.map((i, idx) => (
              <Text key={`${i.kind}-${idx}`} style={errLine}>
                [{i.kind}] {i.message}
                {i.before ? (
                  <>
                    <br />
                    {i.before} → {i.after}
                  </>
                ) : null}
              </Text>
            ))}
          </Section>
        )}
        <Text style={footer}>
          DoseRoutine Search Console monitor · automated daily via pg_cron. Emails only on issues.
        </Text>
      </Container>
    </Body>
  </Html>
);

const main = { backgroundColor: "#f6f7f9", fontFamily: "system-ui, -apple-system, sans-serif" };
const container = { margin: "0 auto", padding: "24px", maxWidth: "600px" };
const h1 = { fontSize: "20px", fontWeight: "600", color: "#0E7C86" };
const text = { fontSize: "14px", color: "#3c4149" };
const box = {
  backgroundColor: "#ffffff",
  borderRadius: "12px",
  padding: "16px",
  margin: "16px 0",
};
const stat = { fontSize: "14px", color: "#3c4149", margin: "4px 0" };
const errLine = { fontSize: "13px", color: "#b3261e", margin: "8px 0" };
const footer = { fontSize: "12px", color: "#8a8f98" };

export const template: TemplateEntry = {
  component: GscMonitorReport,
  subject: "Search Console monitor — DoseRoutine",
};

export default GscMonitorReport;
