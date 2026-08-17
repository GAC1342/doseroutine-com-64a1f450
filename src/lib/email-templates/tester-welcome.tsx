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
  name?: string | null;
  platform?: string | null;
}

const TesterWelcome = ({ name, platform }: Props) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>You&apos;re on the DoseRoutine tester list — here&apos;s what happens next</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>You&apos;re on the tester list</Heading>
        <Text style={text}>{name ? `Hi ${name},` : "Hi there,"}</Text>
        <Text style={text}>
          Thanks for putting your hand up to test DoseRoutine
          {platform === "ios" ? " on iPhone" : platform === "android" ? " on Android" : ""}. Here is
          exactly what to expect over the next couple of weeks.
        </Text>

        <Section style={box}>
          <Text style={step}>
            <strong>Next:</strong> we add your email to the testing track and send your invite link.
            That usually happens within a day or two.
          </Text>
          <Text style={step}>
            <strong>Then:</strong> tap the invite link on your phone, install the app, and use it
            normally — log a few supplements, set your reminder times, try the routine planner.
          </Text>
          <Text style={step}>
            <strong>Day 14:</strong> stay opted in for the full two weeks and we send you a code
            worth <strong>3 months of DoseRoutine Pro, free</strong>.
          </Text>
        </Section>

        <Hr style={hr} />

        <Text style={text}>
          One ask while you test: use the app on a few different days rather than all at once. That
          is what the store looks at, and it is what surfaces the rough edges we want to hear about.
        </Text>
        <Text style={muted}>
          Reply to this email any time with feedback, bugs, or ideas — a real person reads every
          one.
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
const hr = { borderColor: "#e6e6e6", margin: "24px 0" };
const muted = { color: "#888", fontSize: "12px", lineHeight: "20px" };

export const template: TemplateEntry = {
  component: TesterWelcome,
  subject: "You're on the DoseRoutine tester list — here's what happens next",
  displayName: "Tester: welcome (day 0)",
  previewData: { name: "Alex", platform: "android" },
};
