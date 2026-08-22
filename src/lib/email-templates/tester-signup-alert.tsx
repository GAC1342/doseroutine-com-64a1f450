/* eslint-disable @typescript-eslint/no-use-before-define -- lint-baseline: pre-existing violations in this file; new files must not add these. */
import * as React from "react";
import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Section,
  Text,
} from "@react-email/components";
import type { TemplateEntry } from "./registry";

interface Props {
  email: string;
  name?: string | null;
  platform?: string | null;
  source?: string | null;
  signedUpAt: string;
  totalSignups?: number | null;
}

const TesterSignupAlert = ({ email, name, platform, source, signedUpAt, totalSignups }: Props) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>{`New closed-testing sign-up: ${email}`}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>New closed-testing sign-up</Heading>
        <Section style={box}>
          <Text style={row}>
            <strong>Email:</strong> {email}
          </Text>
          <Text style={row}>
            <strong>Name:</strong> {name || "—"}
          </Text>
          <Text style={row}>
            <strong>Platform:</strong> {platform || "not specified"}
          </Text>
          <Text style={row}>
            <strong>Source:</strong> {source || "closed-testing-page"}
          </Text>
          <Text style={row}>
            <strong>Signed up:</strong> {new Date(signedUpAt).toLocaleString()}
          </Text>
          {typeof totalSignups === "number" ? (
            <Text style={row}>
              <strong>Total signups so far:</strong> {totalSignups}
            </Text>
          ) : null}
        </Section>
        <Text style={text}>
          Next step: add this address to the Google Play closed-testing tester list, then send them
          the opt-in link. After 14 days of testing, email them a 3-month Pro reward code.
        </Text>
        <Text style={muted}>Full list: doseroutine.com/admin/testers</Text>
      </Container>
    </Body>
  </Html>
);

const main = {
  backgroundColor: "#ffffff",
  fontFamily: "-apple-system, BlinkMacSystemFont, sans-serif",
};
const container = { margin: "0 auto", padding: "24px", maxWidth: "600px" };
const h1 = { color: "#0E7C86", fontSize: "20px", fontWeight: 600, margin: "0 0 16px" };
const text = { color: "#333", fontSize: "14px", lineHeight: "22px" };
const box = {
  background: "#f8fafa",
  border: "1px solid #e6e6e6",
  borderRadius: 8,
  padding: 16,
  margin: "16px 0",
};
const row = { fontSize: "14px", color: "#333", margin: "6px 0" };
const muted = { color: "#888", fontSize: "12px" };

export const template: TemplateEntry = {
  component: TesterSignupAlert,
  subject: (d) => `[DoseRoutine] New tester sign-up: ${d.email}`,
  displayName: "Tester sign-up alert",
  previewData: {
    email: "alex@example.com",
    name: "Alex",
    platform: "android",
    source: "closed-testing-page",
    signedUpAt: new Date().toISOString(),
    totalSignups: 7,
  },
};
