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
  optInUrl: string;
}

const TesterTestBegins = ({ name, optInUrl }: Props) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>The DoseRoutine closed test is starting — here is your invite link</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>The DoseRoutine test is ready to begin</Heading>
        <Text style={text}>{name ? `Hi ${name},` : "Hi there,"}</Text>
        <Text style={text}>
          Thanks for signing up to test DoseRoutine. The closed testing track is now open, so you
          can install the app and get started.
        </Text>

        <Section style={box}>
          <Text style={step}>
            <strong>1.</strong> Open the invite link below on the Android device you&apos;ll test on
            and tap <strong>Become a tester</strong>.
          </Text>
          <Text style={step}>
            <strong>2.</strong> Install DoseRoutine from the Play Store link on that page.
          </Text>
          <Text style={step}>
            <strong>3.</strong> Add a few supplements or protocols and use the app naturally for 14
            days.
          </Text>
        </Section>

        <Section style={{ textAlign: "center", margin: "24px 0" }}>
          <Button style={button} href={optInUrl}>
            Join the test
          </Button>
        </Section>

        <Text style={muted}>
          If the button doesn&apos;t work, paste this into your browser: {optInUrl}
        </Text>

        <Hr style={hr} />

        <Text style={text}>
          Once you&apos;ve tested for 14 days we&apos;ll email you a code worth{" "}
          <strong>3 months of DoseRoutine Pro, free</strong>. Premium features are unlocked for you
          during the whole test.
        </Text>
        <Text style={muted}>
          Questions or something broken? Just reply to this email — a real person reads it.
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
  component: TesterTestBegins,
  subject: "Your DoseRoutine closed test is ready — here's your invite link",
  displayName: "Tester: test is set to begin",
  previewData: {
    name: "Alex",
    optInUrl: "https://play.google.com/apps/internaltest/4701529032453556254",
  },
};
