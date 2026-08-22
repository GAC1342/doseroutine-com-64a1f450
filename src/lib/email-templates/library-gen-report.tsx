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

interface LibraryGenReportProps {
  status: "complete" | "batch_errors" | "progress";
  processed: number;
  succeeded: number;
  failed: number;
  remaining: number;
  total: number;
  errors?: Array<{ slug: string; err: string }>;
}

const LibraryGenReport = ({
  status,
  processed,
  succeeded,
  failed,
  remaining,
  total,
  errors = [],
}: LibraryGenReportProps) => {
  const heading =
    status === "complete"
      ? "Library generation complete"
      : status === "batch_errors"
        ? "Library generation — batch errors"
        : "Library generation — progress update";

  const done = total - remaining;
  return (
    <Html lang="en" dir="ltr">
      <Head />
      <Preview>{`${heading}: ${done}/${total} compounds have rich content`}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={h1}>{heading}</Heading>
          <Text style={text}>
            {done} of {total} compounds now have rich content ({remaining} remaining).
          </Text>
          <Section style={box}>
            <Text style={stat}>
              Processed this run: <strong>{processed}</strong>
            </Text>
            <Text style={stat}>
              Succeeded: <strong>{succeeded}</strong>
            </Text>
            <Text style={stat}>
              Failed: <strong>{failed}</strong>
            </Text>
          </Section>
          {errors.length > 0 && (
            <Section style={box}>
              <Text style={{ ...stat, fontWeight: 600 }}>Errors:</Text>
              {errors.slice(0, 20).map((e) => (
                <Text key={e.slug} style={errLine}>
                  <strong>{e.slug}</strong> — {e.err}
                </Text>
              ))}
              {errors.length > 20 && <Text style={errLine}>…and {errors.length - 20} more</Text>}
            </Section>
          )}
          <Text style={footer}>DoseRoutine library generator · automated report.</Text>
        </Container>
      </Body>
    </Html>
  );
};

export const template = {
  component: LibraryGenReport,
  subject: (d: Record<string, any>) =>
    d.status === "complete"
      ? `DoseRoutine library: generation complete (${d.total}/${d.total})`
      : d.status === "batch_errors"
        ? `DoseRoutine library: ${d.failed} error(s) in last batch`
        : `DoseRoutine library: progress ${d.total - d.remaining}/${d.total}`,
  displayName: "Library generator report",
  previewData: {
    status: "batch_errors",
    processed: 8,
    succeeded: 6,
    failed: 2,
    remaining: 300,
    total: 456,
    errors: [{ slug: "example", err: "AI 429: rate limited" }],
  },
} satisfies TemplateEntry;

const main = { backgroundColor: "#ffffff", fontFamily: "Arial, sans-serif" };
const container = { padding: "24px", maxWidth: "560px" };
const h1 = { fontSize: "20px", margin: "0 0 12px" };
const text = { fontSize: "14px", lineHeight: "20px", color: "#111" };
const box = { background: "#f6f7f9", padding: "12px 16px", borderRadius: "8px", margin: "12px 0" };
const stat = { fontSize: "13px", margin: "4px 0", color: "#111" };
const errLine = { fontSize: "12px", margin: "4px 0", color: "#a11", fontFamily: "monospace" };
const footer = { fontSize: "11px", color: "#666", marginTop: "20px" };
