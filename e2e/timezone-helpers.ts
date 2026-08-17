import type { Browser, BrowserContext, Page } from "@playwright/test";
import { signIn } from "./utils";

/**
 * Shared timezone + Intl-label helpers for calendar/timeline E2E specs.
 *
 * Two responsibilities:
 *   1. `openTimezonePage` — the single place any spec creates a Playwright
 *      context pinned to an IANA zone and signs in. Keeps `timezoneId`
 *      spelled once so a config change (locale, permissions, viewport) lands
 *      in every zone-aware test at once.
 *   2. `expected*` label formatters — every assertion that compares against
 *      rendered UI text derives its expected string from `Intl.DateTimeFormat`
 *      in the *same* timezone the browser context runs in. That way a spec
 *      never hand-rolls "Wednesday, Jul 29" from a UTC-parsed weekday index
 *      and drifts out of sync with what the app actually renders.
 *
 * All formatters accept an ISO YYYY-MM-DD `dayKey` and treat it as a pure
 * calendar date (anchored at 12:00 UTC to avoid any DST transition boundary).
 * The `tz` argument is only used to name the zone in error messages and, for
 * `tzOffsetMinutes`, to compute the wall-clock offset.
 */

export const WEEKDAYS = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
] as const;

export const MONTHS_SHORT = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
] as const;

export type Weekday = (typeof WEEKDAYS)[number];
export type MonthShort = (typeof MONTHS_SHORT)[number];

/**
 * Parse a YYYY-MM-DD key into a UTC-noon anchor. Noon is far from any DST
 * transition boundary and keeps the calendar date stable in every zone.
 */
function anchorForKey(dayKey: string): Date {
  const [y, m, d] = dayKey.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
}

/** en-US weekday name (Sunday..Saturday) for `dayKey` — tz-independent. */
export function expectedWeekday(dayKey: string): Weekday {
  const name = new Intl.DateTimeFormat("en-US", {
    timeZone: "UTC",
    weekday: "long",
  }).format(anchorForKey(dayKey));
  return name as Weekday;
}

/** en-US short month (Jan..Dec) for `dayKey`. */
export function expectedMonthShort(dayKey: string): MonthShort {
  const name = new Intl.DateTimeFormat("en-US", {
    timeZone: "UTC",
    month: "short",
  }).format(anchorForKey(dayKey));
  return name as MonthShort;
}

/** Day-of-month integer parsed straight from the ISO key. */
export function expectedDayOfMonth(dayKey: string): number {
  return Number(dayKey.slice(8, 10));
}

/** Sunday=0..Saturday=6 index — matches the calendar grid columns. */
export function expectedWeekdayIndex(dayKey: string): number {
  return WEEKDAYS.indexOf(expectedWeekday(dayKey));
}

/**
 * The exact string rendered by the app for a selected day's detail heading:
 * `"<Weekday>, <Mon> <D>"`. Never hand-assemble this in specs — call this
 * so any format change flows through one place.
 */
export function expectedDetailLabel(dayKey: string): string {
  return `${expectedWeekday(dayKey)}, ${expectedMonthShort(dayKey)} ${expectedDayOfMonth(dayKey)}`;
}

/**
 * Wall-clock UTC offset in minutes for `dayKey` at noon in `tz`. Two days
 * whose offsets differ straddle a DST transition.
 */
export function tzOffsetMinutes(dayKey: string, tz: string): number {
  const anchor = anchorForKey(dayKey);
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(anchor);
  const get = (k: string) => Number(parts.find((p) => p.type === k)!.value);
  const asIfUtc = Date.UTC(
    get("year"),
    get("month") - 1,
    get("day"),
    get("hour"),
    get("minute"),
    get("second"),
  );
  return (asIfUtc - anchor.getTime()) / 60_000;
}

/**
 * Open a fresh Playwright context in `tz`, sign the shared test user in, and
 * return the context + page. Callers own closing the context (usually in a
 * `finally`). Centralised so viewport, permissions, or locale can be adjusted
 * across every zone-aware spec in one edit.
 */
export async function openTimezonePage(
  browser: Browser,
  tz: string,
): Promise<{ context: BrowserContext; page: Page }> {
  const context = await browser.newContext({ timezoneId: tz });
  const page = await context.newPage();
  await signIn(page);
  return { context, page };
}

/**
 * Mid-session timezone switch. Playwright 1.61 has no `setTimezoneId` on a
 * live context, so the fastest reliable way to simulate a user's device
 * jumping tz (traveller, VPN, OS setting flip) is:
 *   1. Snapshot the current storageState (session cookies + localStorage) so
 *      the app treats the next context as the SAME signed-in session.
 *   2. Close the old context.
 *   3. Open a fresh context pinned to the new IANA zone and restore state.
 *   4. Land on `path` (default /timeline) — the caller then re-asserts every
 *      tz-derived surface (calendar grid, grouped headings, midnight-week
 *      alignment).
 *
 * Returning the new context+page mirrors `openTimezonePage` so specs use the
 * exact same teardown (`context.close()` in a `finally`).
 */
export async function switchTimezone(
  browser: Browser,
  previous: { context: BrowserContext; page: Page },
  tz: string,
  path: string = "/timeline",
): Promise<{ context: BrowserContext; page: Page }> {
  const storageState = await previous.context.storageState();
  await previous.context.close();
  const context = await browser.newContext({ timezoneId: tz, storageState });
  const page = await context.newPage();
  await page.goto(path);
  await page.waitForLoadState("networkidle").catch(() => undefined);
  return { context, page };
}
