import * as React from "react";
import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Text,
} from "@react-email/components";
import type { TemplateEntry } from "./registry";

interface SubscriptionWelcomeProps {
  tier: string;
  appUrl: string;
}

export const SubscriptionWelcomeEmail = ({ tier, appUrl }: SubscriptionWelcomeProps) => {
  const tierLabel = "DoseRoutine Pro";
  const perks =
    "unlimited stack, Timeline, Reminders, AI Plan Generator, and the 30-day adherence heatmap";
  void tier;
  return (
    <Html lang="en" dir="ltr">
      <Head />
      <Preview>Welcome to {tierLabel}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={h1}>Welcome to {tierLabel}</Heading>
          <Text style={text}>Thanks for subscribing. Your account now includes {perks}.</Text>
          <Button style={button} href={appUrl}>
            Open DoseRoutine
          </Button>
          <Text style={footer}>
            Manage or cancel anytime from More → Manage subscription. Educational, not medical
            advice.
          </Text>
        </Container>
      </Body>
    </Html>
  );
};

export default SubscriptionWelcomeEmail;

const main = { backgroundColor: "#ffffff", fontFamily: "Arial, sans-serif" };
const container = { padding: "20px 25px" };
const h1 = { fontSize: "22px", fontWeight: "bold" as const, color: "#000000", margin: "0 0 20px" };
const text = { fontSize: "14px", color: "#55575d", lineHeight: "1.5", margin: "0 0 25px" };
const button = {
  backgroundColor: "#2E9E6B",
  color: "#ffffff",
  fontSize: "14px",
  borderRadius: "8px",
  padding: "12px 20px",
  textDecoration: "none",
};
const footer = { fontSize: "12px", color: "#999999", margin: "30px 0 0" };

export const template = {
  component: SubscriptionWelcomeEmail,
  subject: () => `Welcome to DoseRoutine Pro`,
  displayName: "Subscription welcome",
  previewData: {
    tier: "pro",
    appUrl: "https://example.com/today",
  },
} satisfies TemplateEntry;
