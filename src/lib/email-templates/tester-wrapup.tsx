/* eslint-disable @typescript-eslint/no-use-before-define -- lint-baseline: pre-existing violations in this file; new files must not add these. */
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
}

const TesterWrapup = ({ name, feedbackUrl }: Props) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Day 14 of your DoseRoutine test — last call for feedback</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>That&apos;s 14 days — thank you</Heading>
        <Text style={text}>{name ? `Hi ${name},` : "Hi there,"}</Text>
        <Text style={text}>
          You&apos;ve reached the end of the two-week test window. Your feedback directly shaped
          what we fixed, and we&apos;re grateful for the time you gave it.
        </Text>

        <Section style={box}>
          <Text style={step}>
            <strong>Stay opted in</strong> so the test keeps counting — leaving the track early
            resets progress on our side.
          </Text>
          <Text style={step}>
            <strong>Your reward:</strong> we&apos;ll email your code for 3 months of DoseRoutine
            Pro, free, once your 14 days are confirmed.
          </Text>
          <Text style={step}>
            <strong>Last ask:</strong> anything still annoying you in the app?
          </Text>
        </Section>

        <Section style={{ textAlign: "center", margin: "24px 0" }}>
          <Button style={button} href={feedbackUrl}>
            Send final feedback
          </Button>
        </Section>

        <Hr style={hr} />

        <Text style={muted}>
          This is the last email in the tester sequence — you won&apos;t get more onboarding nudges
          from us.
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
  backgroundColor: "#0E7C86",
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
  component: TesterWrapup,
  subject: "Day 14 — thanks for testing DoseRoutine",
  displayName: "Tester: 14-day wrap-up",
  previewData: {
    name: "Alex",
    feedbackUrl: "mailto:support@doseroutine.com?subject=DoseRoutine%20tester%20feedback",
  },
};
