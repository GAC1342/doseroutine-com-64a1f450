import * as React from "react";
import {
  Body,
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
  email: string;
  platform?: "ios" | "android" | "desktop" | "other" | null;
  signedUpAt?: string;
  totalWaitlist?: number | null;
}

const AppLaunchAlert = ({ email, platform, signedUpAt, totalWaitlist }: Props) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>New DoseRoutine app-launch waitlist signup</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>New app-launch waitlist signup</Heading>
        <Text style={text}>
          Someone just joined the list to be notified when DoseRoutine launches on the App Store and
          Google Play.
        </Text>

        <Section style={box}>
          <Text style={step}>
            <strong>Email:</strong> {email}
          </Text>
          {platform && (
            <Text style={step}>
              <strong>Platform:</strong>{" "}
              {platform === "ios"
                ? "iPhone"
                : platform === "android"
                  ? "Android"
                  : platform === "desktop"
                    ? "Desktop"
                    : "Other"}
            </Text>
          )}
          {signedUpAt && (
            <Text style={step}>
              <strong>Signed up at:</strong> {signedUpAt}
            </Text>
          )}
          {typeof totalWaitlist === "number" && (
            <Text style={step}>
              <strong>Total waitlist:</strong> {totalWaitlist}
            </Text>
          )}
        </Section>

        <Hr style={hr} />

        <Text style={muted}>This is an internal notification. Do not forward.</Text>
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
const hr = { borderColor: "#e6e6e6", margin: "24px 0" };
const muted = { color: "#888", fontSize: "12px", lineHeight: "20px" };

export const template: TemplateEntry = {
  component: AppLaunchAlert,
  subject: "New DoseRoutine app-launch waitlist signup",
  displayName: "App launch waitlist alert",
  to:
    process.env.APP_LAUNCH_NOTIFY_EMAIL ||
    process.env.LIBRARY_GEN_NOTIFY_EMAIL ||
    "support@doseroutine.com",
  previewData: {
    email: "you@example.com",
    platform: "ios",
    signedUpAt: new Date().toISOString(),
    totalWaitlist: 42,
  },
};
