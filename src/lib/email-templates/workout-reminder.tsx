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

interface WorkoutReminderProps {
  /** "planned" = upcoming session, "missed" = nudge about a session not logged. */
  kind: "planned" | "missed";
  workoutName: string;
  timeText: string;
  detailText?: string;
  openUrl: string;
}

export const WorkoutReminderEmail = ({
  kind,
  workoutName,
  timeText,
  detailText,
  openUrl,
}: WorkoutReminderProps) => {
  const missed = kind === "missed";
  const heading = missed ? `Missed: ${workoutName}` : `Coming up: ${workoutName}`;
  return (
    <Html lang="en" dir="ltr">
      <Head />
      <Preview>{heading}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={h1}>{heading}</Heading>
          <Text style={text}>
            {missed
              ? `You planned ${workoutName} for ${timeText} and it isn't logged yet. Log it, move it, or skip it so your streak stays accurate.`
              : `${detailText ? `${detailText} · ` : ""}Starts at ${timeText}.`}
          </Text>
          <Button style={button} href={openUrl}>
            {missed ? "Update this session" : "Open your plan"}
          </Button>
          <Text style={footer}>
            Educational, not medical advice. You can adjust workout reminders anytime in
            DoseRoutine.
          </Text>
        </Container>
      </Body>
    </Html>
  );
};

export default WorkoutReminderEmail;

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
  component: WorkoutReminderEmail,
  subject: (d: Record<string, any>) =>
    d.kind === "missed" ? `Missed workout: ${d.workoutName}` : `Coming up: ${d.workoutName}`,
  displayName: "Workout reminder",
  previewData: {
    kind: "planned",
    workoutName: "Upper body strength",
    timeText: "6:30 PM",
    detailText: "45 min",
    openUrl: "https://example.com/fitness",
  },
};
