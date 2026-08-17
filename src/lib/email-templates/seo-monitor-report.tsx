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

export interface SeoRegression {
  url: string;
  kind: "indexing" | "rich_result" | "description_suffix" | "fetch_error";
  before: string;
  after: string;
}

interface Props {
  checkedAt: string;
  totalChecked: number;
  regressions: SeoRegression[];
  summary: {
    indexed: number;
    notIndexed: number;
    missingSuffix: number;
    missingRichResults: number;
  };
}

const SeoMonitorReport = ({ checkedAt, totalChecked, regressions, summary }: Props) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>{`SEO monitor: ${regressions.length} regression(s) across ${totalChecked} URLs`}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>
          SEO monitor — {regressions.length} regression{regressions.length === 1 ? "" : "s"}
        </Heading>
        <Text style={text}>
          Run at {checkedAt}. Checked {totalChecked} priority URLs on doseroutine.com.
        </Text>
        <Section style={box}>
          <Text style={stat}>
            Indexed: <strong>{summary.indexed}</strong>
          </Text>
          <Text style={stat}>
            Not indexed: <strong>{summary.notIndexed}</strong>
          </Text>
          <Text style={stat}>
            Missing description suffix: <strong>{summary.missingSuffix}</strong>
          </Text>
          <Text style={stat}>
            Missing expected rich results: <strong>{summary.missingRichResults}</strong>
          </Text>
        </Section>
        {regressions.length > 0 && (
          <Section style={box}>
            <Text style={{ ...stat, fontWeight: 600 }}>Regressions (max 50 shown):</Text>
            {regressions.slice(0, 50).map((r, i) => (
              <Text key={`${r.url}-${i}`} style={errLine}>
                [{r.kind}] {r.before} → {r.after}
                <br />
                {r.url}
              </Text>
            ))}
          </Section>
        )}
        <Text style={footer}>DoseRoutine SEO monitor · doseroutine.com</Text>
      </Container>
    </Body>
  </Html>
);

export default SeoMonitorReport;

export const template: TemplateEntry = {
  component: SeoMonitorReport,
  subject: (d) => `[DoseRoutine SEO] ${d?.regressions?.length ?? 0} regression(s) detected`,
  displayName: "SEO monitor report",
  to: "Nikk.delibasic@gmail.com",
  previewData: {
    checkedAt: new Date().toISOString(),
    totalChecked: 32,
    regressions: [
      {
        url: "https://doseroutine.com/library/bpc-157",
        kind: "indexing",
        before: "PASS",
        after: "FAIL",
      },
      {
        url: "https://doseroutine.com/peptide-dosage-calculator",
        kind: "description_suffix",
        before: "present",
        after: "missing",
      },
    ],
    summary: { indexed: 30, notIndexed: 2, missingSuffix: 1, missingRichResults: 0 },
  },
};

const main: React.CSSProperties = {
  backgroundColor: "#f6f9fc",
  fontFamily: "ui-sans-serif, system-ui, -apple-system, sans-serif",
};
const container: React.CSSProperties = {
  backgroundColor: "#ffffff",
  margin: "0 auto",
  padding: "24px",
  maxWidth: "640px",
  borderRadius: "8px",
};
const h1: React.CSSProperties = {
  color: "#0E7C86",
  fontSize: "22px",
  fontWeight: 700,
  margin: "0 0 12px",
};
const text: React.CSSProperties = { color: "#111827", fontSize: "14px", lineHeight: "22px" };
const box: React.CSSProperties = {
  backgroundColor: "#f9fafb",
  padding: "12px 16px",
  borderRadius: "6px",
  margin: "12px 0",
};
const stat: React.CSSProperties = { color: "#111827", fontSize: "14px", margin: "4px 0" };
const errLine: React.CSSProperties = {
  color: "#7f1d1d",
  fontSize: "13px",
  margin: "8px 0",
  wordBreak: "break-all",
};
const footer: React.CSSProperties = { color: "#6b7280", fontSize: "12px", marginTop: "16px" };
