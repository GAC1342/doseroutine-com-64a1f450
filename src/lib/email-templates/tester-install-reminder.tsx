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
  daysSinceInvite?: number | null;
}

const TesterInstallReminder = ({ name, optInUrl, daysSinceInvite }: Props) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Your DoseRoutine tester invite is still waiting — two taps to install</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>Your tester invite is still open</Heading>
        <Text style={text}>{name ? `Hi ${name},` : "Hi there,"}</Text>
        <Text style={text}>
          We sent your DoseRoutine invite
          {typeof daysSinceInvite === "number" && daysSinceInvite > 0
            ? ` ${daysSinceInvite} days ago`
            : " recently"}
          , and it looks like the app isn&apos;t installed yet. It takes about two minutes.
        </Text>

        <Section style={box}>
          <Text style={step}>
            <strong>1.</strong> Open the link below <em>on your phone</em> (not desktop).
          </Text>
          <Text style={step}>
            <strong>2.</strong> Tap <strong>Become a tester</strong>, then install from the store
            link on that page.
          </Text>
          <Text style={step}>
            <strong>3.</strong> Sign in with the same email you used to join.
          </Text>
        </Section>

        <Section style={{ textAlign: "center", margin: "24px 0" }}>
          <Button style={button} href={optInUrl}>
            Install DoseRoutine
          </Button>
        </Section>

        <Text style={muted}>
          If the button doesn&apos;t work, paste this into your phone&apos;s browser: {optInUrl}
        </Text>

        <Hr style={hr} />

        <Text style={text}>
          Your 14 days start once you install, and finishing them earns you{" "}
          <strong>3 months of Pro, free</strong>.
        </Text>
        <Text style={muted}>
          Hit a snag installing? Reply to this email and tell us what you saw — we&apos;ll sort it
          out.
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
  component: TesterInstallReminder,
  subject: "Still need to install DoseRoutine? Here's your invite link",
  displayName: "Tester: install reminder (day 2)",
  previewData: {
    name: "Alex",
    optInUrl: "https://play.google.com/apps/internaltest/4701529032453556254",
    daysSinceInvite: 2,
  },
};
