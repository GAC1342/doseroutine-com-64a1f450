// Minimal RFC-5545 .ics generator for compound dose reminders.
// One VEVENT per time-of-day, recurring per the compound's frequency.

type IcsInput = {
  name: string;
  doseAmount?: number | null;
  doseUnit?: string | null;
  frequency?: string | null; // daily | weekly | custom
  timesOfDay?: string[] | null; // ["08:00", "20:00"]
  daysOfWeek?: number[] | null; // 0=Sun..6=Sat, for weekly
  withFood?: boolean | null;
  notes?: string | null;
  alarmMinutesBefore?: number; // default 0 = at start
};

function pad(n: number) {
  return n < 10 ? `0${n}` : String(n);
}

/** Local floating time (no Z) so calendars fire in the user's phone zone. */
function nextLocalDateTime(hhmm: string): string {
  const [h, m] = hhmm.split(":").map(Number);
  const now = new Date();
  const d = new Date(now);
  d.setHours(h ?? 8, m ?? 0, 0, 0);
  if (d.getTime() <= now.getTime()) d.setDate(d.getDate() + 1);
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}T${pad(d.getHours())}${pad(d.getMinutes())}00`;
}

function stamp(): string {
  const d = new Date();
  return `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}Z`;
}

function esc(s: string): string {
  return s.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\n/g, "\\n");
}

const WEEKDAY_CODES = ["SU", "MO", "TU", "WE", "TH", "FR", "SA"];

function buildRRule(input: IcsInput): string {
  const freq = (input.frequency ?? "daily").toLowerCase();
  if (freq === "weekly") {
    const days = (input.daysOfWeek ?? [])
      .map((d) => WEEKDAY_CODES[d])
      .filter(Boolean)
      .join(",");
    return days ? `RRULE:FREQ=WEEKLY;BYDAY=${days}` : "RRULE:FREQ=WEEKLY";
  }
  // "custom" without a rule falls back to daily so the reminder still fires.
  return "RRULE:FREQ=DAILY";
}

export function buildIcs(input: IcsInput): string {
  const times = input.timesOfDay?.length ? input.timesOfDay : ["08:00"];
  const dose = input.doseAmount ? `${input.doseAmount} ${input.doseUnit ?? ""}`.trim() : "";
  const summary = dose ? `${input.name} · ${dose}` : input.name;
  const descLines = [
    dose && `Dose: ${dose}`,
    input.withFood && "Take with food",
    input.notes && input.notes,
    "Reminder from DoseRoutine · Educational, not medical advice.",
  ].filter(Boolean) as string[];
  const description = esc(descLines.join("\n"));
  const rrule = buildRRule(input);
  const alarmMin = Math.max(0, input.alarmMinutesBefore ?? 0);
  const trigger = alarmMin === 0 ? "TRIGGER:PT0M" : `TRIGGER:-PT${alarmMin}M`;

  const events = times.map((t, i) => {
    const dtstart = nextLocalDateTime(t);
    const uid = `doseroutine-${input.name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${t.replace(":", "")}-${i}@doseroutine.com`;
    return [
      "BEGIN:VEVENT",
      `UID:${uid}`,
      `DTSTAMP:${stamp()}`,
      `DTSTART:${dtstart}`,
      `DURATION:PT5M`,
      rrule,
      `SUMMARY:${esc(summary)}`,
      `DESCRIPTION:${description}`,
      "BEGIN:VALARM",
      "ACTION:DISPLAY",
      `DESCRIPTION:${esc(summary)}`,
      trigger,
      "END:VALARM",
      "END:VEVENT",
    ].join("\r\n");
  });

  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//DoseRoutine//Dose Reminders//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    ...events,
    "END:VCALENDAR",
    "",
  ].join("\r\n");
}

export function downloadIcs(filename: string, ics: string) {
  const blob = new Blob([ics], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename.endsWith(".ics") ? filename : `${filename}.ics`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
