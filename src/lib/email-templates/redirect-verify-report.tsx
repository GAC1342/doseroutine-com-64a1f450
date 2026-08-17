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
  url: string;
  code: string;
  message: string;
  severity: "error" | "warning";
}

interface Props {
  checkedAt: string;
  siteOrigin: string;
  robotsFetched?: boolean;
  summary: { total: number; passing: number; failing: number; warnings: number };
  issues: Issue[];
}

const RedirectVerifyReport = ({
  checkedAt,
  siteOrigin,
  robotsFetched,
  summary,
  issues,
}: Props) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>{`Redirect check: ${summary.failing} failing of ${summary.total}`}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>
          Redirect verification — {summary.failing} failing redirect
          {summary.failing === 1 ? "" : "s"}
        </Heading>
        <Text style={text}>
          Every redirecting URL on <a href={siteOrigin}>{siteOrigin}</a> was re-tested at{" "}
          {checkedAt}. Each one must answer 301, point at its exact canonical URL, land on a live
          page in one hop, and stay crawlable.
        </Text>
        <Section style={box}>
          <Text style={stat}>
            Redirects tested: <strong>{summary.total}</strong>
          </Text>
          <Text style={stat}>
            Passing: <strong>{summary.passing}</strong>
          </Text>
          <Text style={stat}>
            Failing: <strong>{summary.failing}</strong>
          </Text>
          <Text style={stat}>
            Warnings: <strong>{summary.warnings}</strong>
          </Text>
          <Text style={stat}>
            robots.txt readable: <strong>{robotsFetched === false ? "no" : "yes"}</strong>
          </Text>
        </Section>
        {issues.length > 0 ? (
          <Section style={box}>
            {issues.map((issue, i) => (
              <Text key={i} style={issue.severity === "error" ? errLine : warnLine}>
                [{issue.severity}] {issue.url} — {issue.message}
              </Text>
            ))}
          </Section>
        ) : (
          <Text style={text}>All redirects verified clean.</Text>
        )}
        <Text style={footer}>Automated redirect verification job — DoseRoutine</Text>
      </Container>
    </Body>
  </Html>
);

export const template = {
  component: RedirectVerifyReport,
  subject: (data: Record<string, any>) =>
    data?.summary?.failing
      ? `⚠️ DoseRoutine: ${data.summary.failing} redirect(s) failing verification`
      : "DoseRoutine redirects: all verified",
  displayName: "Redirect verification report",
  to: "Nikk.delibasic@gmail.com",
  previewData: {
    checkedAt: new Date().toISOString(),
    siteOrigin: "https://doseroutine.com",
    robotsFetched: true,
    summary: { total: 15, passing: 14, failing: 1, warnings: 0 },
    issues: [
      {
        url: "https://doseroutine.com/library/clomiphene",
        code: "wrong_status",
        message: "Redirect is HTTP 302; it must be a permanent 301 so link equity consolidates",
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
