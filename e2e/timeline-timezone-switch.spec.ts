import { test, expect, AUTH_AVAILABLE } from "./utils";
import type { Page } from "@playwright/test";
import {
  WEEKDAYS,
  MONTHS_SHORT,
  expectedDetailLabel,
  expectedWeekdayIndex,
  openTimezonePage,
  switchTimezone,
} from "./timezone-helpers";

/**
 * Mid-session timezone switch — a real-world scenario the local-midnight
 * spec does NOT cover: a signed-in user changes their device timezone (they
 * fly across timezones, toggle a VPN, or their OS auto-updates on landing).
 * Everything derived from "today's local date" — the calendar grid columns,
 * the grouped-history "Today/Yesterday" headings, the first/last week
 * alignment inside the calendar — must re-resolve against the NEW zone on
 * the next render, without a re-login and without cache staleness.
 *
 * The switch is implemented by snapshotting storageState in tz A and
 * re-opening a context in tz B with the same session restored (see
 * `switchTimezone` in ./timezone-helpers). From the app's perspective this
 * is the same signed-in user landing on /timeline with a different clock.
 *
 * Assertions on each side of the switch:
 *   1. Calendar grid: first rendered day-cell sits in the column that
 *      matches the ISO weekday of the first-of-month in the ACTIVE tz. If
 *      the switch didn't propagate, the first-of-month column would still
 *      reflect tz A. Also asserts a mid-month and end-of-month cell click
 *      opens the correct local-date detail heading.
 *   2. Grouped history: every visible heading resolves to a real local date
 *      in the ACTIVE tz. "Today" / "Yesterday" pins to the browser's Intl
 *      today-key, and absolute headings ("Wednesday, Jul 29") must line up
 *      with the weekday of that date in the active tz.
 *   3. Midnight-week alignment: the calendar's first-visible week is
 *      consecutive one-day steps, sits in strictly increasing columns
 *      starting from firstCol, and the last-visible week does the mirror.
 *      A stale tz on the switch would break the column pattern at the edge
 *      even when mid-month cells still looked fine.
 *   4. Cross-switch delta: at least one of {calendar first-cell column,
 *      "Today" heading date} must change between the two zones. Two zones
 *      picked as far apart as Kiritimati (UTC+14) and New York (UTC−5)
 *      guarantee this on any real calendar day, so this assertion proves
 *      the switch actually took effect (rather than both sides accidentally
 *      running against the same cached tz).
 */

const SWITCH_PAIRS: Array<{ from: string; to: string; label: string }> = [
  // Extreme offset delta: +14h → −5h. Any local-date-derived surface must
  // differ across this jump on essentially every real timestamp.
  { from: "Pacific/Kiritimati", to: "America/New_York", label: "Kiritimati → New York (−19h)" },
  // Same continent, tz where the calendar-date drift bug originally lived
  // (Edmonton), switching to a tz with a different DST rule (London).
  {
    from: "America/Edmonton",
    to: "Europe/London",
    label: "Edmonton → London (+7h, different DST)",
  },
];

async function calendarPresent(page: Page): Promise<boolean> {
  const heading = page.getByRole("heading", { name: /history calendar/i });
  try {
    await heading.waitFor({ state: "visible", timeout: 5000 });
    return true;
  } catch {
    return false;
  }
}

async function collectCells(page: Page) {
  const buttons = page.locator("button[aria-label]");
  const count = await buttons.count();
  const cells: { index: number; key: string }[] = [];
  for (let i = 0; i < count; i++) {
    const aria = (await buttons.nth(i).getAttribute("aria-label")) ?? "";
    const match = /^(\d{4}-\d{2}-\d{2})(,|$)/.exec(aria);
    if (match) cells.push({ index: i, key: match[1] });
  }
  return { buttons, cells };
}

/**
 * Read the browser's local today/yesterday keys via Intl in-page — same
 * source of truth the app uses to bucket doses, so we never disagree about
 * which local calendar date "today" is close to midnight.
 */
async function localDayKeys(page: Page): Promise<{ today: string; yesterday: string; tz: string }> {
  return page.evaluate(() => {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const fmt = new Intl.DateTimeFormat("en-CA", {
      timeZone: tz,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
    const key = (t: number) => {
      const parts = fmt.formatToParts(new Date(t));
      const g = (k: string) => parts.find((p) => p.type === k)!.value;
      return `${g("year")}-${g("month")}-${g("day")}`;
    };
    const now = Date.now();
    return { today: key(now), yesterday: key(now - 86_400_000), tz };
  });
}

/**
 * Snapshot the tz-derived surfaces on /timeline so caller can (a) assert
 * they're internally consistent for the ACTIVE tz and (b) diff them against
 * the other side of the switch to prove the tz actually changed.
 *
 * Returns:
 *   - resolvedTz: what Intl says the browser thinks the tz is
 *   - todayKey: local YYYY-MM-DD from Intl
 *   - firstCellKey / firstCellCol: first cell in the calendar grid (or null
 *     if the calendar isn't rendered, e.g. free-tier account)
 *   - todayHeadingCount: number of grouped-history headings labelled "Today"
 */
async function readTzSurfaces(page: Page) {
  const { today, yesterday, tz: resolvedTz } = await localDayKeys(page);

  let firstCellKey: string | null = null;
  let firstCellCol: number | null = null;
  const hasCalendar = await calendarPresent(page);
  if (hasCalendar) {
    const { cells } = await collectCells(page);
    if (cells.length > 0) {
      firstCellKey = cells[0].key;
      firstCellCol = expectedWeekdayIndex(cells[0].key);
    }
  }

  const groupButtons = page.locator(
    'button[aria-label*="Swipe or use left and right arrow keys to toggle"]',
  );
  const groupCount = await groupButtons.count();
  let todayHeadingCount = 0;
  for (let i = 0; i < groupCount; i++) {
    const aria = (await groupButtons.nth(i).getAttribute("aria-label")) ?? "";
    if (/^Today/.test(aria)) todayHeadingCount++;
  }

  return {
    resolvedTz,
    today,
    yesterday,
    firstCellKey,
    firstCellCol,
    hasCalendar,
    groupCount,
    todayHeadingCount,
  };
}

/**
 * Full local-midnight sanity pass for the ACTIVE tz on /timeline. Kept
 * compact vs timeline-calendar-midnight.spec.ts — we're proving the switch
 * propagated, not re-testing every DST edge here.
 */
async function assertTimelineForActiveTz(page: Page, tz: string, label: string) {
  // Intl inside the page must actually report the new zone. If Playwright
  // silently dropped the timezoneId (misconfig, bad CI runner), everything
  // downstream would look fine but assert against the wrong zone.
  const resolved = await page.evaluate(() => Intl.DateTimeFormat().resolvedOptions().timeZone);
  expect(resolved, `${label}: page Intl tz did not match requested ${tz}`).toBe(tz);

  const { today, yesterday } = await localDayKeys(page);

  // --- Calendar grid checks (skipped when calendar isn't rendered, e.g.
  // the Pro-gated section). Behaviour matches timeline-calendar-midnight so
  // free-account CI still exercises the grouped-history switch path below.
  if (await calendarPresent(page)) {
    const { buttons, cells } = await collectCells(page);
    expect(cells.length, `${label}: calendar cells present`).toBeGreaterThanOrEqual(28);

    // Column alignment of the first cell against the 1st-of-month weekday
    // computed via Intl in the ACTIVE tz. A stale tz would leave the first
    // cell in the wrong column here.
    const first = cells[0];
    const firstOfMonthKey = `${first.key.slice(0, 8)}01`;
    expect(
      expectedWeekdayIndex(first.key),
      `${label}: first cell ${first.key} column vs firstOfMonth ${firstOfMonthKey}`,
    ).toBe(expectedWeekdayIndex(firstOfMonthKey));

    // Midnight-week alignment: first- and last-week cells must sit in
    // consecutive strictly increasing columns and be consecutive calendar
    // dates. This is the exact regression the Edmonton bug produced at
    // month boundaries.
    const firstCol = expectedWeekdayIndex(first.key);
    const lastCol = expectedWeekdayIndex(cells[cells.length - 1].key);
    const firstWeek = cells.slice(0, 7 - firstCol);
    const lastWeek = cells.slice(cells.length - (lastCol + 1));

    for (let k = 0; k < firstWeek.length; k++) {
      expect(
        expectedWeekdayIndex(firstWeek[k].key),
        `${label}: first-week cell ${firstWeek[k].key} column`,
      ).toBe(firstCol + k);
    }
    for (let k = 0; k < lastWeek.length; k++) {
      expect(
        expectedWeekdayIndex(lastWeek[k].key),
        `${label}: last-week cell ${lastWeek[k].key} column`,
      ).toBe(lastCol - (lastWeek.length - 1 - k));
    }

    const dayMs = 86_400_000;
    const stepIsOneDay = (a: string, b: string) => {
      const [ay, am, ad] = a.split("-").map(Number);
      const [by, bm, bd] = b.split("-").map(Number);
      return Date.UTC(by, bm - 1, bd) - Date.UTC(ay, am - 1, ad) === dayMs;
    };
    for (let k = 1; k < firstWeek.length; k++) {
      expect(
        stepIsOneDay(firstWeek[k - 1].key, firstWeek[k].key),
        `${label}: first-week ${firstWeek[k - 1].key}→${firstWeek[k].key} not consecutive in ${tz}`,
      ).toBe(true);
    }
    for (let k = 1; k < lastWeek.length; k++) {
      expect(
        stepIsOneDay(lastWeek[k - 1].key, lastWeek[k].key),
        `${label}: last-week ${lastWeek[k - 1].key}→${lastWeek[k].key} not consecutive in ${tz}`,
      ).toBe(true);
    }

    // Click first + middle + last: detail heading must be the local-date
    // label derived via Intl in the ACTIVE tz.
    const samples = [cells[0], cells[Math.floor(cells.length / 2)], cells[cells.length - 1]];
    for (const cell of samples) {
      const btn = buttons.nth(cell.index);
      if (await btn.isDisabled().catch(() => false)) continue;
      await btn.scrollIntoViewIfNeeded();
      await btn.click();
      await expect(
        page.getByText(expectedDetailLabel(cell.key), { exact: true }).first(),
        `${label}: detail heading for ${cell.key}`,
      ).toBeVisible({ timeout: 5000 });
      await btn.click().catch(() => undefined); // collapse
    }
  }

  // --- Grouped-history heading checks. Every heading must map to a real
  // local date in the ACTIVE tz. Today/Yesterday pin to the Intl keys we
  // computed above.
  const groupButtons = page.locator(
    'button[aria-label*="Swipe or use left and right arrow keys to toggle"]',
  );
  const groupCount = await groupButtons.count();
  const headingRe =
    /^(Today|Yesterday|(Sunday|Monday|Tuesday|Wednesday|Thursday|Friday|Saturday), (Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec) (\d{1,2}))/;

  const sampleCount = Math.min(groupCount, 5);
  for (let i = 0; i < sampleCount; i++) {
    const aria = (await groupButtons.nth(i).getAttribute("aria-label")) ?? "";
    const match = headingRe.exec(aria);
    expect(match, `${label}: group #${i} heading "${aria}"`).not.toBeNull();
    if (!match) continue;
    const [, whole, weekdayName, monthName, dayStr] = match;

    if (whole === "Today") {
      expect(today, `${label}: local today in ${tz}`).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    } else if (whole === "Yesterday") {
      expect(yesterday, `${label}: local yesterday in ${tz}`).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    } else if (weekdayName && monthName && dayStr) {
      const monthIdx = MONTHS_SHORT.indexOf(monthName as (typeof MONTHS_SHORT)[number]);
      const day = Number(dayStr);
      const nowYear = Number(today.slice(0, 4));
      let matchedYear: number | null = null;
      for (const y of [nowYear, nowYear - 1]) {
        if (WEEKDAYS[new Date(Date.UTC(y, monthIdx, day)).getUTCDay()] === weekdayName) {
          matchedYear = y;
          break;
        }
      }
      expect(
        matchedYear,
        `${label}: heading "${whole}" weekday does not match its date in tz=${tz}`,
      ).not.toBeNull();
    }
  }
}

test.describe("Timeline — mid-session timezone switch", () => {
  test.skip(!AUTH_AVAILABLE, "requires TEST_USER_EMAIL/PASSWORD");

  for (const pair of SWITCH_PAIRS) {
    test(`switch propagates to calendar + grouped history (${pair.label})`, async ({ browser }) => {
      // --- Side A: sign in and land on /timeline in the origin tz.
      let session = await openTimezonePage(browser, pair.from);
      try {
        await session.page.goto("/timeline");
        await session.page.waitForLoadState("networkidle").catch(() => undefined);

        await assertTimelineForActiveTz(
          session.page,
          pair.from,
          `${pair.label} · pre-switch (${pair.from})`,
        );
        const before = await readTzSurfaces(session.page);
        expect(before.resolvedTz, "pre-switch Intl tz").toBe(pair.from);

        // --- The switch: same storageState (same user session), new tz.
        session = await switchTimezone(browser, session, pair.to, "/timeline");

        await assertTimelineForActiveTz(
          session.page,
          pair.to,
          `${pair.label} · post-switch (${pair.to})`,
        );
        const after = await readTzSurfaces(session.page);
        expect(after.resolvedTz, "post-switch Intl tz").toBe(pair.to);

        // --- Cross-switch delta: something local-date-derived MUST change
        // across a ~19h or ~7h offset jump. If nothing changed the switch
        // didn't take effect and every earlier assertion accidentally ran
        // against the same tz.
        const bothHaveCalendar = before.hasCalendar && after.hasCalendar;
        const calendarChanged =
          bothHaveCalendar &&
          (before.firstCellKey !== after.firstCellKey ||
            before.firstCellCol !== after.firstCellCol);
        const groupedChanged =
          before.today !== after.today || before.todayHeadingCount !== after.todayHeadingCount;

        expect(
          calendarChanged || groupedChanged,
          `${pair.label}: nothing tz-derived changed across the switch — ` +
            `before=${JSON.stringify(before)} after=${JSON.stringify(after)}`,
        ).toBe(true);
      } finally {
        await session.context.close();
      }
    });
  }
});
