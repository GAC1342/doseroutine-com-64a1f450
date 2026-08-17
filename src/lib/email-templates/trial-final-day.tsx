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
  upgradeUrl: string;
  willRenew?: boolean;
}

const TrialFinalDay = ({ name, upgradeUrl, willRenew = true }: Props) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Last day of your DoseRoutine Pro trial</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>Your Pro trial ends today</Heading>
        <Text style={text}>{name ? `Hi ${name},` : "Hi there,"}</Text>
        <Text style={text}>
          {willRenew
            ? "This is the last day of your free trial. Your plan starts automatically after today — nothing to do if you want to keep Pro."
            : "This is the last day of your free trial. Pick a plan today to keep unlimited compounds, your Timeline, reminders and export."}
        </Text>

        <Section style={{ textAlign: "center", margin: "24px 0" }}>
          <Button style={button} href={upgradeUrl}>
            {willRenew ? "Manage my plan" : "Keep Pro — 1-tap checkout"}
          </Button>
        </Section>

        <Hr style={hr} />

        <Text style={muted}>
          Either way your account stays open — your stack, logs and history are yours and we never
          delete them. Questions? Just reply to this email.
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
  component: TrialFinalDay,
  subject: "Last day of your DoseRoutine Pro trial",
  displayName: "Trial final-day reminder (day 7)",
  previewData: {
    name: "Alex",
    upgradeUrl: "https://doseroutine.com/upgrade",
    willRenew: true,
  },
};
