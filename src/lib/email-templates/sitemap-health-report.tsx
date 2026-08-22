/* eslint-disable @typescript-eslint/no-explicit-any -- lint-baseline: pre-existing violations in this file. */
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

interface Failure {
  url: string;
  reason: string;
  status?: number;
  finalUrl?: string;
  sitemap?: string;
}

interface Props {
  checkedAt: string;
  total: number;
  checked: number;
  failed: number;
  failures: Failure[];
  sitemapUrl: string;
  sitemapsChecked?: number;
}

const SitemapHealthReport = ({
  checkedAt,
  total,
  checked,
  failed,
  failures,
  sitemapUrl,
  sitemapsChecked,
}: Props) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>{`Sitemap health: ${failed} failure(s) across ${checked} URLs`}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>
          Sitemap health check — {failed} failure{failed === 1 ? "" : "s"}
        </Heading>
        <Text style={text}>
          Automated crawl of <a href={sitemapUrl}>{sitemapUrl}</a> at {checkedAt}.
        </Text>
        <Section style={box}>
          <Text style={stat}>
            Sitemap files fetched: <strong>{sitemapsChecked ?? 1}</strong>
          </Text>
          <Text style={stat}>
            URLs in sitemap: <strong>{total}</strong>
          </Text>
          <Text style={stat}>
            Checked this run: <strong>{checked}</strong>
          </Text>
          <Text style={stat}>
            Failed: <strong>{failed}</strong>
          </Text>
        </Section>
        {failures.length > 0 && (
          <Section style={box}>
            <Text style={{ ...stat, fontWeight: 600 }}>Failures (max 50 shown):</Text>
            {failures.slice(0, 50).map((f) => (
              <Text key={f.url} style={errLine}>
                [{f.status ?? "—"}] {f.reason}
                <br />
                {f.url}
                {f.sitemap ? (
                  <>
                    <br />
                    in {f.sitemap}
                  </>
                ) : null}
              </Text>
            ))}
            {failures.length > 50 && <Text style={errLine}>…and {failures.length - 50} more</Text>}
          </Section>
        )}
        <Text style={footer}>
          DoseRoutine sitemap monitor · automated. Runs daily via pg_cron. Emails only on failures.
        </Text>
      </Container>
    </Body>
  </Html>
);

export const template = {
  component: SitemapHealthReport,
  subject: (d: Record<string, any>) =>
    d.failed > 0
      ? `⚠️ DoseRoutine sitemap: ${d.failed} URL(s) failing crawl`
      : `DoseRoutine sitemap: all ${d.checked} URLs healthy`,
  displayName: "Sitemap health report",
  to: "Nikk.delibasic@gmail.com",
  previewData: {
    checkedAt: new Date().toISOString(),
    total: 467,
    checked: 467,
    failed: 2,
    sitemapsChecked: 4,
    failures: [
      { url: "https://doseroutine.com/library/example", reason: "HTTP error", status: 500 },
    ],
    sitemapUrl: "https://doseroutine.com/sitemap.xml",
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
const footer = { fontSize: "11px", color: "#666", marginTop: "20px" };
