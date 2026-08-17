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
  daysLeft: number;
  upgradeUrl: string;
  willRenew?: boolean;
}

const TrialEnding = ({ name, daysLeft, upgradeUrl, willRenew = true }: Props) => {
  const when = daysLeft <= 0 ? "today" : daysLeft === 1 ? "tomorrow" : `in ${daysLeft} days`;
  return (
    <Html lang="en" dir="ltr">
      <Head />
      <Preview>Your DoseRoutine Pro trial ends {when}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={h1}>Your Pro trial ends {when}</Heading>
          <Text style={text}>{name ? `Hi ${name},` : "Hi there,"}</Text>
          <Text style={text}>
            {willRenew
              ? "Nothing to do if you want to keep Pro — your plan starts automatically when the trial ends."
              : "Your trial is set to end without a plan. Pick one to keep your Pro features running."}
          </Text>

          <Section style={box}>
            <Text style={step}>With Pro you keep:</Text>
            <Text style={step}>• Unlimited compounds in your stack</Text>
            <Text style={step}>• Your 30-day Timeline and dose history</Text>
            <Text style={step}>• Email and push dose reminders</Text>
            <Text style={step}>• The AI plan generator</Text>
            <Text style={step}>• Export and doctor-share summaries</Text>
          </Section>

          <Section style={{ textAlign: "center", margin: "24px 0" }}>
            <Button style={button} href={upgradeUrl}>
              {willRenew ? "Manage my plan" : "Keep Pro — 1-tap checkout"}
            </Button>
          </Section>

          <Hr style={hr} />

          <Text style={text}>
            If you decide Pro isn&apos;t for you, your account stays open. Your stack, your logs and
            your history are yours — we never delete them.
          </Text>
          <Text style={muted}>Questions? Just reply to this email and a human will answer.</Text>
        </Container>
      </Body>
    </Html>
  );
};

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
  component: TrialEnding,
  subject: (data: Record<string, any>) => {
    const d = Number(data?.daysLeft ?? 2);
    const when = d <= 0 ? "today" : d === 1 ? "tomorrow" : `in ${d} days`;
    return `Your DoseRoutine Pro trial ends ${when}`;
  },
  displayName: "Trial ending reminder (day 5-6)",
  previewData: {
    name: "Alex",
    daysLeft: 2,
    upgradeUrl: "https://doseroutine.com/upgrade",
    willRenew: true,
  },
};
