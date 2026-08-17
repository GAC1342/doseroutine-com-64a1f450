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
  code: string;
  message: string;
  severity: "error" | "warning";
}

interface Props {
  checkedAt: string;
  robotsUrl: string;
  sitemapUrl: string;
  failed: number;
  drifted?: boolean;
  issues: Issue[];
}

const RobotsHealthReport = ({
  checkedAt,
  robotsUrl,
  sitemapUrl,
  failed,
  drifted,
  issues,
}: Props) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>{`robots.txt health: ${failed} issue(s)`}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>
          robots.txt health check — {failed} issue{failed === 1 ? "" : "s"}
        </Heading>
        <Text style={text}>
          Automated check of <a href={robotsUrl}>{robotsUrl}</a> at {checkedAt}.
        </Text>
        <Section style={box}>
          <Text style={stat}>
            Expected sitemap: <strong>{sitemapUrl}</strong>
          </Text>
          <Text style={stat}>
            Issues found: <strong>{failed}</strong>
          </Text>
          <Text style={stat}>
            Rules match approved baseline: <strong>{drifted ? "NO — rules changed" : "yes"}</strong>
          </Text>
        </Section>
        {issues.length > 0 ? (
          <Section style={box}>
            {issues.map((i) => (
              <Text key={i.code} style={i.severity === "error" ? errLine : warnLine}>
                [{i.severity}] {i.code}
                <br />
                {i.message}
              </Text>
            ))}
          </Section>
        ) : (
          <Section style={box}>
            <Text style={stat}>
              Reachable, correct sitemap reference, no unintended noindex directives,
              Googlebot/Bingbot access verified, rules unchanged.
            </Text>
          </Section>
        )}
        <Text style={footer}>
          DoseRoutine robots.txt monitor · automated. Runs daily via pg_cron. Emails only on
          failures.
        </Text>
      </Container>
    </Body>
  </Html>
);

export const template = {
  component: RobotsHealthReport,
  subject: (d: Record<string, any>) =>
    d.failed > 0
      ? `⚠️ DoseRoutine robots.txt: ${d.failed} issue(s) found`
      : d.drifted
        ? "⚠️ DoseRoutine robots.txt: rules changed unexpectedly"
        : "DoseRoutine robots.txt: healthy",
  displayName: "robots.txt health report",
  to: "Nikk.delibasic@gmail.com",
  previewData: {
    checkedAt: new Date().toISOString(),
    robotsUrl: "https://doseroutine.com/robots.txt",
    sitemapUrl: "https://doseroutine.com/sitemap.xml",
    failed: 1,
    issues: [
      {
        code: "wrong_sitemap",
        message: "Sitemap directive points at https://my-stack-wise.com/sitemap.xml",
        severity: "error" as const,
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
