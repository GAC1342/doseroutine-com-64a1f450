/* eslint-disable @typescript-eslint/no-explicit-any -- lint-baseline: pre-existing violations in this file. */
/* eslint-disable @typescript-eslint/no-use-before-define -- lint-baseline: pre-existing violations in this file; new files must not add these. */
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

interface DoseReminderProps {
  compoundName: string;
  doseText: string;
  timeText: string;
  markTakenUrl: string;
}

export const DoseReminderEmail = ({
  compoundName,
  doseText,
  timeText,
  markTakenUrl,
}: DoseReminderProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Time for {compoundName}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>Time for {compoundName}</Heading>
        <Text style={text}>
          {doseText ? `${doseText} · ` : ""}Scheduled at {timeText}.
        </Text>
        <Button style={button} href={markTakenUrl}>
          Mark as taken
        </Button>
        <Text style={footer}>
          Educational, not medical advice. You can adjust reminders anytime in DoseRoutine.
        </Text>
      </Container>
    </Body>
  </Html>
);

export default DoseReminderEmail;

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
  component: DoseReminderEmail,
  subject: (d: Record<string, any>) => `Time for ${d.compoundName}`,
  displayName: "Dose reminder",
  previewData: {
    compoundName: "Vitamin D3",
    doseText: "5000 IU",
    timeText: "8:00 AM",
    markTakenUrl: "https://example.com/today",
  },
};
