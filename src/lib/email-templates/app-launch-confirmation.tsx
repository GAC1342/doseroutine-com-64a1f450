/* eslint-disable @typescript-eslint/no-use-before-define -- lint-baseline: pre-existing violations in this file; new files must not add these. */
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
}

const AppLaunchConfirmation = ({ email, platform }: Props) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>You&apos;re on the DoseRoutine launch list</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>You&apos;re on the list</Heading>
        <Text style={text}>Hi there,</Text>
        <Text style={text}>
          Thanks for your interest in DoseRoutine. We&apos;ll email you as soon as the iPhone and
          Android apps are live in the App Store and Google Play.
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
        </Section>

        <Text style={text}>
          In the meantime, you can use DoseRoutine on the web at{" "}
          <a href="https://doseroutine.com" style={link}>
            doseroutine.com
          </a>{" "}
          and add it to your home screen for the app-like experience.
        </Text>

        <Hr style={hr} />

        <Text style={muted}>Questions? Just reply to this email — a real person reads it.</Text>
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
const link = { color: "#0E7C86", textDecoration: "underline" };
const hr = { borderColor: "#e6e6e6", margin: "24px 0" };
const muted = { color: "#888", fontSize: "12px", lineHeight: "20px" };

export const template: TemplateEntry = {
  component: AppLaunchConfirmation,
  subject: "You're on the DoseRoutine launch list",
  displayName: "App launch waitlist confirmation",
  previewData: { email: "you@example.com", platform: "ios" },
};
