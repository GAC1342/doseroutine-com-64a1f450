import * as React from "react";
import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Preview,
  Section,
  Text,
} from "@react-email/components";
import type { TemplateEntry } from "./registry";

interface Props {
  name?: string | null;
  feedbackUrl: string;
  dayNumber?: number | null;
}

const TesterFeedbackPrompt = ({ name, feedbackUrl, dayNumber }: Props) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Two quick questions about your first week with DoseRoutine</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>How is week one going?</Heading>
        <Text style={text}>{name ? `Hi ${name},` : "Hi there,"}</Text>
        <Text style={text}>
          You&apos;re about {dayNumber ? `${dayNumber} days` : "a week"} into testing DoseRoutine.
          Two questions, 30 seconds — no form required, you can just reply to this email:
        </Text>

        <Section style={box}>
          <Text style={step}>
            <strong>1.</strong> What is the one thing that felt clunky, confusing, or broken?
          </Text>
          <Text style={step}>
            <strong>2.</strong> What is the one thing you&apos;d miss if we took it away?
          </Text>
        </Section>

        <Section style={{ textAlign: "center", margin: "24px 0" }}>
          <Button style={button} href={feedbackUrl}>
            Send feedback
          </Button>
        </Section>

        <Hr style={hr} />

        <Text style={text}>
          Keep opening the app on a few more days to finish your 14 — that&apos;s what unlocks your{" "}
          <strong>3 months of Pro, free</strong>.
        </Text>
        <Text style={muted}>
          Blunt feedback is the useful kind. We won&apos;t take it personally.
        </Text>
      </Container>
    </Body>
  </Html>
);

const main = {
  backgroundColor: "#ffffff",
  fontFamily: "-apple-system, BlinkMacSystemFont, sans-serif",
};
const container = { margin: "0 auto", padding: "24px", maxWidth: "600px" };
const h1 = { color: "#0E7C86", fontSize: "22px", fontWeight: 600, margin: "0 0 16px" };
const text = { color: "#333", fontSize: "15px", lineHeight: "24px" };
const step = { color: "#333", fontSize: "14px", lineHeight: "22px", margin: "6px 0" };
const box = {
  background: "#f8fafa",
  border: "1px solid #e6e6e6",
  borderRadius: 8,
  padding: 16,
  margin: "16px 0",
};
const button = {
  backgroundColor: "#FF6B5E",
  color: "#ffffff",
  borderRadius: 10,
  padding: "13px 26px",
  fontSize: "15px",
  fontWeight: 600,
  textDecoration: "none",
  display: "inline-block",
};
const hr = { borderColor: "#e6e6e6", margin: "24px 0" };
const muted = { color: "#888", fontSize: "12px", lineHeight: "20px" };

export const template: TemplateEntry = {
  component: TesterFeedbackPrompt,
  subject: "Two quick questions about your first week testing DoseRoutine",
  displayName: "Tester: feedback prompt (day 7)",
  previewData: {
    name: "Alex",
    feedbackUrl: "https://doseroutine.com/feedback?src=tester-day7",
    dayNumber: 7,
  },
};
