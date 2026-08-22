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

interface PathHit {
  path: string;
  hits: number;
  sample_referrer?: string | null;
}

interface Props {
  checkedAt: string;
  windowMinutes: number;
  hitsThisWindow: number;
  baselinePerWindow: number;
  threshold: number;
  topPaths: PathHit[];
  site: string;
}

const NotFoundSpikeReport = ({
  checkedAt,
  windowMinutes,
  hitsThisWindow,
  baselinePerWindow,
  threshold,
  topPaths,
  site,
}: Props) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>{`404 spike: ${hitsThisWindow} unknown-path hits in the last ${windowMinutes} min`}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>
          404 spike detected — {hitsThisWindow} hits in the last {windowMinutes} min
        </Heading>
        <Text style={text}>
          Automated 404 monitor on <a href={site}>{site}</a> at {checkedAt}.
        </Text>
        <Section style={box}>
          <Text style={stat}>
            Hits this window: <strong>{hitsThisWindow}</strong>
          </Text>
          <Text style={stat}>
            Baseline (avg / {windowMinutes} min, last 24h):{" "}
            <strong>{baselinePerWindow.toFixed(1)}</strong>
          </Text>
          <Text style={stat}>
            Alert threshold: <strong>{threshold}</strong>
          </Text>
        </Section>
        {topPaths.length > 0 && (
          <Section style={box}>
            <Text style={{ ...stat, fontWeight: 600 }}>Top missing paths:</Text>
            {topPaths.map((p) => (
              <Text key={p.path} style={row}>
                <strong>{p.hits}×</strong> {p.path}
                {p.sample_referrer ? (
                  <>
                    <br />
                    <span style={muted}>from {p.sample_referrer}</span>
                  </>
                ) : null}
              </Text>
            ))}
          </Section>
        )}
        <Text style={text}>
          Investigate broken internal links, stale sitemap entries, or a scraper probing your site.
        </Text>
      </Container>
    </Body>
  </Html>
);

const main = {
  backgroundColor: "#f6f9fc",
  fontFamily: "-apple-system, BlinkMacSystemFont, sans-serif",
};
const container = { margin: "0 auto", padding: "24px", maxWidth: "600px" };
const h1 = { color: "#0E7C86", fontSize: "20px", fontWeight: 600, margin: "0 0 16px" };
const text = { color: "#333", fontSize: "14px", lineHeight: "22px" };
const box = {
  background: "#fff",
  border: "1px solid #e6e6e6",
  borderRadius: 8,
  padding: 16,
  margin: "16px 0",
};
const stat = { fontSize: "14px", color: "#333", margin: "4px 0" };
const row = {
  fontSize: "13px",
  color: "#333",
  margin: "6px 0",
  borderBottom: "1px solid #f0f0f0",
  paddingBottom: 6,
};
const muted = { color: "#888", fontSize: "12px" };

export const template: TemplateEntry = {
  component: NotFoundSpikeReport,
  subject: (d) => `[DoseRoutine] 404 spike: ${d.hitsThisWindow} hits in ${d.windowMinutes} min`,
  displayName: "404 spike report",
  previewData: {
    checkedAt: new Date().toISOString(),
    windowMinutes: 60,
    hitsThisWindow: 84,
    baselinePerWindow: 6.2,
    threshold: 25,
    topPaths: [
      { path: "/library/creatin", hits: 42, sample_referrer: "https://www.google.com/" },
      { path: "/wp-admin", hits: 20, sample_referrer: null },
    ],
    site: "https://doseroutine.com",
  },
};

export default NotFoundSpikeReport;
