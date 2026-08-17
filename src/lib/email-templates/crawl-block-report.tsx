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

interface Alert {
  url: string;
  code: string;
  severity: "error" | "warning";
  message: string;
}

interface Props {
  checkedAt: string;
  siteUrl: string;
  summary: { checked: number; allowed: number; blocked: number; errors: number; unknown: number };
  alerts: Alert[];
}

const CrawlBlockReport = ({ checkedAt, siteUrl, summary, alerts }: Props) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>{`Crawl watch: ${alerts.length} issue(s) across ${summary.checked} URLs`}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>
          Crawl watch — {alerts.length} issue{alerts.length === 1 ? "" : "s"}
        </Heading>
        <Text style={text}>
          Run at {checkedAt} against {siteUrl}. Read from Google's stored URL Inspection record for
          each watched URL.
        </Text>
        <Section style={box}>
          <Text style={stat}>
            Crawl allowed: <strong>{summary.allowed}</strong> / {summary.checked}
          </Text>
          <Text style={stat}>
            Blocked by robots: <strong>{summary.blocked}</strong>
          </Text>
          <Text style={stat}>
            Inspection errors: <strong>{summary.errors}</strong>
          </Text>
          <Text style={stat}>
            No data yet: <strong>{summary.unknown}</strong>
          </Text>
        </Section>
        {alerts.length > 0 ? (
          <Section style={box}>
            {alerts.map((a, i) => (
              <Text key={`${a.url}-${a.code}-${i}`} style={a.severity === "error" ? errLine : warnLine}>
                [{a.severity}] {a.url}
                <br />
                {a.message}
              </Text>
            ))}
          </Section>
        ) : (
          <Section style={box}>
            <Text style={stat}>
              Every watched URL reports robots.txt ALLOWED with a successful fetch.
            </Text>
          </Section>
        )}
        <Text style={footer}>
          DoseRoutine crawl-block watch · automated daily via pg_cron. Emails only when a URL is
          blocked or unfetchable.
        </Text>
      </Container>
    </Body>
  </Html>
);

export const template = {
  component: CrawlBlockReport,
  subject: (d: Record<string, any>) =>
    (d.alerts?.length ?? 0) > 0
      ? `⚠️ DoseRoutine crawl watch: ${d.alerts.length} URL issue(s)`
      : "DoseRoutine crawl watch: all URLs crawlable",
  displayName: "Crawl-block watch report",
  to: "Nikk.delibasic@gmail.com",
  previewData: {
    checkedAt: new Date().toISOString(),
    siteUrl: "sc-domain:doseroutine.com",
    summary: { checked: 10, allowed: 9, blocked: 1, errors: 0, unknown: 0 },
    alerts: [
      {
        url: "https://doseroutine.com/?lang=fr",
        code: "robots_blocked",
        severity: "error" as const,
        message: "robots.txt state is DISALLOWED (expected ALLOWED)",
      },
    ],
  },
} satisfies TemplateEntry;

const main = { backgroundColor: "#ffffff", fontFamily: "Arial, sans-serif" };
const container = { padding: "24px", maxWidth: "640px" };
const h1 = { fontSize: "20px", margin: "0 0 12px" };
const text = { fontSize: "14px", lineHeight: "20px", color: "#111" };
const box = { background: "#f6f7f9", padding: "12px 16px", borderRadius: "8px", margin: "12px 0" };
const stat = { fontSize: "13px", margin: "4px 0", color: "#111" };
const errLine = {
  fontSize: "12px",
  margin: "6px 0",
  color: "#a11",
  fontFamily: "monospace",
  wordBreak: "break-all" as const,
};
const warnLine = {
  fontSize: "12px",
  margin: "6px 0",
  color: "#a70",
  fontFamily: "monospace",
  wordBreak: "break-all" as const,
};
const footer = { fontSize: "11px", color: "#666", marginTop: "20px" };
