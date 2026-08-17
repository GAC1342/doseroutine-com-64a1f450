import { test, expect, AUTH_AVAILABLE } from "./utils";
import type { Page } from "@playwright/test";
import {
  WEEKDAYS,
  MONTHS_SHORT,
  expectedDetailLabel,
  expectedWeekday,
  expectedWeekdayIndex,
  openTimezonePage,
  tzOffsetMinutes,
} from "./timezone-helpers";

/**
 * Verifies the Timeline "History calendar" always treats each cell as a
 * local-midnight calendar day in the user's timezone. Regression cover for
 * the Edmonton bug where `new Date('YYYY-MM-DD')` shifted the selected day
 * back by one because it parsed as UTC midnight.
 *
 * Browser engine coverage — MUST run in both Chromium and WebKit:
 *   Chromium proves the invariant holds for Android Chrome + desktop Chrome.
 *   WebKit proves it also holds for iOS Safari, whose Intl / Date impl has
 *   historically diverged from V8 (notably around DST and IANA zone parsing).
 *   The engine list is enforced below via `REQUIRED_ENGINES`; if a project
 *   is missing from playwright.config.ts, the spec fails loudly instead of
 *   silently skipping the coverage.
 *
 * Invariants asserted for every sampled cell across multiple months:
 *   1. The cell's aria-label starts with an ISO YYYY-MM-DD key.
 *   2. The cell's grid column (0=Sun..6=Sat) equals the weekday of that
 *      calendar date. If day keys were interpreted in the wrong zone, the
 *      first-of-month offset would drift and cells would land in the wrong
 *      column.
 *   3. Clicking the cell opens a detail panel whose heading reads
 *      "<Weekday>, <Mon> <D>" for that exact calendar date — proving the
 *      label is formatted at local midnight, not shifted by UTC parsing.
 */

const REQUIRED_ENGINES = ["chromium", "webkit"] as const;

// WEEKDAYS, MONTHS_SHORT, and Intl-based label helpers live in
// ./timezone-helpers so every zone-aware spec derives expected UI strings
// from the same Intl formatter the app uses. Do NOT re-hand-roll them here.

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
 * DST-transition invariant: any calendar day whose tz offset differs from
 * the previous day's offset is a spring-forward or fall-back day. On those
 * days the wall clock loses or gains an hour, but the *calendar date* must
 * still render as itself — Nov 3 stays Nov 3, not Nov 2, when clicked.
 *
 * Scans the rendered cells for a DST transition; if one is present, clicks
 * that cell and asserts the detail heading matches. Skips silently in
 * non-DST zones or months without a transition.
 */
async function assertDstTransitionCell(page: Page, tz: string, label: string) {
  const { buttons, cells } = await collectCells(page);
  let hit: { index: number; key: string } | null = null;
  let prevOffset = tzOffsetMinutes(cells[0].key, tz);
  for (let k = 1; k < cells.length; k++) {
    const off = tzOffsetMinutes(cells[k].key, tz);
    if (off !== prevOffset) {
      hit = cells[k];
      break;
    }
    prevOffset = off;
  }
  if (!hit) return; // no DST transition visible this month — nothing to assert
  const result = await assertCellOpensCorrectDetail(
    page,
    buttons,
    hit,
    `${label}: DST transition ${hit.key} in ${tz}`,
  );
  expect(result, `${label}: DST transition cell ${hit.key} was disabled — cannot verify`).toBe(
    "clicked",
  );
}

async function assertCellOpensCorrectDetail(
  page: Page,
  buttons: ReturnType<Page["locator"]>,
  cell: { index: number; key: string },
  label: string,
) {
  const btn = buttons.nth(cell.index);
  const disabled = await btn.isDisabled().catch(() => false);
  if (disabled) return "disabled" as const;

  await btn.scrollIntoViewIfNeeded();
  await btn.click();

  // Derive the expected heading via Intl (see timezone-helpers) so this spec
  // never disagrees with the app's own formatter on weekday/month labels.
  const heading = page.getByText(expectedDetailLabel(cell.key), { exact: true }).first();
  await expect(heading, `${label}: detail heading for ${cell.key}`).toBeVisible({ timeout: 5000 });

  // Collapse before moving on so we're not stacking open panels.
  await btn.click().catch(() => undefined);
  return "clicked" as const;
}

async function sampleAndAssertCells(page: Page, label: string) {
  const { buttons, cells } = await collectCells(page);
  expect(cells.length, `${label}: expected day cells in calendar`).toBeGreaterThanOrEqual(28);

  // The rendered grid is Sunday-first with pre-month blanks. The first cell
  // must therefore sit in the column matching the 1st's weekday — computed
  // via the shared Intl helper so the expected column derives from the
  // same source of truth as the app's rendered headings.
  const first = cells[0];
  const firstOfMonthKey = `${first.key.slice(0, 8)}01`;
  expect
    .soft(expectedWeekdayIndex(first.key), `${label}: first cell weekday`)
    .toBe(expectedWeekdayIndex(firstOfMonthKey));

  // Sample first, middle, and last cell — enough to catch a one-day drift
  // without paying for a full-month click loop.
  const samples = [cells[0], cells[Math.floor(cells.length / 2)], cells[cells.length - 1]];
  for (const cell of samples) {
    await assertCellOpensCorrectDetail(page, buttons, cell, label);
  }
}

/**
 * Boundary-week invariants: month transitions are where UTC-parse drift bites
 * hardest (e.g. Aug 1 rendering under a Saturday column in Edmonton because
 * `new Date('2026-08-01')` returned July 31 in the local zone). Assert EVERY
 * cell in the first and last weeks — not just samples — for both column
 * alignment and click-to-detail correctness. Also verifies calendar
 * continuity across the boundary: after navigating months, the last cell of
 * month N and the first cell of month N+1 must be consecutive calendar days.
 */
async function assertBoundaryWeeks(page: Page, label: string) {
  const { buttons, cells } = await collectCells(page);
  expect(cells.length, `${label}: boundary-week: expected day cells`).toBeGreaterThanOrEqual(28);

  const firstKey = cells[0].key;
  const lastKey = cells[cells.length - 1].key;
  const firstCol = expectedWeekdayIndex(firstKey);
  const lastCol = expectedWeekdayIndex(lastKey);

  // First week: from cells[0] through the first Saturday (inclusive).
  const firstWeek = cells.slice(0, 7 - firstCol);
  // Last week: from the last Sunday through cells[last].
  const lastWeek = cells.slice(cells.length - (lastCol + 1));

  // Column alignment: cells[k] in the first week must sit in column
  // (firstCol + k). Same idea reversed for the last week. If UTC parsing
  // shifted the day, this catches it immediately at the boundary.
  for (let k = 0; k < firstWeek.length; k++) {
    const cell = firstWeek[k];
    expect
      .soft(expectedWeekdayIndex(cell.key), `${label}: first-week cell ${cell.key} column`)
      .toBe(firstCol + k);
  }
  for (let k = 0; k < lastWeek.length; k++) {
    const cell = lastWeek[k];
    expect
      .soft(expectedWeekdayIndex(cell.key), `${label}: last-week cell ${cell.key} column`)
      .toBe(lastCol - (lastWeek.length - 1 - k));
  }

  // Consecutive-day continuity within each boundary week — proves no cell
  // was silently duplicated or skipped due to a DST offset near the edge.
  const dayMs = 86_400_000;
  const stepIsOneDay = (a: string, b: string) => {
    const [ay, am, ad] = a.split("-").map(Number);
    const [by, bm, bd] = b.split("-").map(Number);
    return Date.UTC(by, bm - 1, bd) - Date.UTC(ay, am - 1, ad) === dayMs;
  };
  for (let k = 1; k < firstWeek.length; k++) {
    expect(
      stepIsOneDay(firstWeek[k - 1].key, firstWeek[k].key),
      `${label}: first-week ${firstWeek[k - 1].key} → ${firstWeek[k].key} not consecutive`,
    ).toBe(true);
  }
  for (let k = 1; k < lastWeek.length; k++) {
    expect(
      stepIsOneDay(lastWeek[k - 1].key, lastWeek[k].key),
      `${label}: last-week ${lastWeek[k - 1].key} → ${lastWeek[k].key} not consecutive`,
    ).toBe(true);
  }

  // Click every non-disabled cell in each boundary week and assert the
  // detail heading matches — same invariant as sampleAndAssertCells but
  // applied exhaustively at the edges.
  for (const cell of [...firstWeek, ...lastWeek]) {
    await assertCellOpensCorrectDetail(page, buttons, cell, `${label}: boundary`);
  }

  return { firstKey, lastKey };
}

test.describe("Timeline calendar — local-midnight invariant", () => {
  test.skip(!AUTH_AVAILABLE, "requires TEST_USER_EMAIL/PASSWORD");

  // Guard: this spec must actually execute in both Chromium and WebKit so the
  // iOS-Safari-style Date/Intl path is covered. If the project list drifts
  // and one engine stops running, fail loudly with an actionable message.
  test("runs across required browser engines", ({ browserName }) => {
    expect(
      REQUIRED_ENGINES,
      `spec must run in ${REQUIRED_ENGINES.join(" + ")}; current project uses ${browserName}. ` +
        `Check playwright.config.ts and run \`bun run test:e2e:calendar-midnight\`.`,
    ).toContain(browserName);
  });

  // Timezone matrix:
  //   America/Edmonton  — Mountain Time, observes DST (matches original bug)
  //   America/New_York  — Eastern Time, observes DST; broadest US user base
  //   Europe/London     — GMT/BST, DST on a different weekend than the US,
  //                       catches transition rules that only bite outside NA
  //   Pacific/Kiritimati — UTC+14, extreme positive offset (no DST)
  //   Asia/Tokyo        — UTC+9, no DST
  // The DST zones drive the month-navigation loop across spring-forward /
  // fall-back transitions in most of the year, and assertBoundaryWeeks'
  // consecutive-day continuity check catches any 23h/25h day mis-render.
  for (const tz of [
    "America/Edmonton",
    "America/New_York",
    "Europe/London",
    "Pacific/Kiritimati",
    "Asia/Tokyo",
  ]) {
    test(`day cells align to local midnight across months (${tz})`, async ({ browser }) => {
      // Shared helper owns the newContext({ timezoneId }) + signIn dance so
      // any zone-aware spec sets the tz the same way.
      const { context, page } = await openTimezonePage(browser, tz);
      try {
        await page.goto("/timeline");
        await page.waitForLoadState("networkidle").catch(() => undefined);

        // Grouped history renders even for free accounts — verify dose times
        // and per-day headings resolve against the *user's* local midnight,
        // not UTC. See assertGroupedHistoryDates for the exact invariants.
        await assertGroupedHistoryDates(page, tz, `${tz} · grouped history`);

        if (!(await calendarPresent(page))) {
          test.skip(true, "History calendar is Pro-only; account isn't Pro in this env");
          return;
        }

        // Current month first, then step back two months and forward again.
        // Each stop asserts (a) sampled cells + (b) EVERY cell in the first
        // and last weeks — the boundary zones where UTC-parse drift bites.
        await sampleAndAssertCells(page, `${tz} · current month`);
        const currentBounds = await assertBoundaryWeeks(page, `${tz} · current month`);
        await assertDstTransitionCell(page, tz, `${tz} · current month`);

        const prev = page.getByRole("button", { name: /previous month/i });
        await prev.click();
        await page.waitForLoadState("networkidle").catch(() => undefined);
        await sampleAndAssertCells(page, `${tz} · previous month`);
        const prevBounds = await assertBoundaryWeeks(page, `${tz} · previous month`);
        await assertDstTransitionCell(page, tz, `${tz} · previous month`);

        // Cross-month continuity: the previous month's last rendered day and
        // the current month's first rendered day MUST be consecutive
        // calendar dates. A UTC-parse bug at the boundary would leave a
        // gap or a duplicate here even when each month looked fine in
        // isolation.
        const dayMs = 86_400_000;
        const [py, pm, pd] = prevBounds.lastKey.split("-").map(Number);
        const [cy, cm, cd] = currentBounds.firstKey.split("-").map(Number);
        expect(
          Date.UTC(cy, cm - 1, cd) - Date.UTC(py, pm - 1, pd),
          `${tz}: prev-last ${prevBounds.lastKey} → curr-first ${currentBounds.firstKey} not consecutive`,
        ).toBe(dayMs);

        await prev.click();
        await page.waitForLoadState("networkidle").catch(() => undefined);
        await sampleAndAssertCells(page, `${tz} · two months back`);
        const twoBackBounds = await assertBoundaryWeeks(page, `${tz} · two months back`);
        await assertDstTransitionCell(page, tz, `${tz} · two months back`);
        const [ty, tm, td] = twoBackBounds.lastKey.split("-").map(Number);
        const [ppy, ppm, ppd] = prevBounds.firstKey.split("-").map(Number);
        expect(
          Date.UTC(ppy, ppm - 1, ppd) - Date.UTC(ty, tm - 1, td),
          `${tz}: two-back-last ${twoBackBounds.lastKey} → prev-first ${prevBounds.firstKey} not consecutive`,
        ).toBe(dayMs);

        const next = page.getByRole("button", { name: /next month/i });
        await next.click();
        await page.waitForLoadState("networkidle").catch(() => undefined);
        await sampleAndAssertCells(page, `${tz} · back to previous`);
        await assertBoundaryWeeks(page, `${tz} · back to previous`);
      } finally {
        await context.close();
      }
    });
  }
});

/**
 * Read the browser's notion of "today" in the active tz so we can verify the
 * grouped-history "Today" / "Yesterday" headings resolve at *local* midnight,
 * not a UTC-shifted day. Returns YYYY-MM-DD keys derived via Intl in-page —
 * that way we never disagree with the app about which date "today" is when
 * the wall clock is close to midnight.
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
    const now = Date.now();
    const key = (t: number) => {
      const parts = fmt.formatToParts(new Date(t));
      const g = (k: string) => parts.find((p) => p.type === k)!.value;
      return `${g("year")}-${g("month")}-${g("day")}`;
    };
    return { today: key(now), yesterday: key(now - 86_400_000), tz };
  });
}

/**
 * Invariants for the grouped-history section (renders above the calendar):
 *   1. Every visible day-group heading is either "Today", "Yesterday", or
 *      "<Weekday>, <Mon> <D>" — and the weekday matches the ISO date it
 *      claims. A UTC-parse drift would produce Sunday-labeled entries for a
 *      Saturday date in Edmonton, etc.
 *   2. "Today" / "Yesterday" headings correspond to the actual local date in
 *      the browser's timezone (verified via Intl above).
 *   3. Dose times inside each expanded group render as "h:mm AM/PM" — proves
 *      `formatInTimeZone` is producing wall-clock times, not raw ISO offsets.
 */
/**
 * Convert a "h:mm AM/PM" wall-clock string into a minute-of-day integer so
 * intra-group row ordering can be compared numerically. Returns null when the
 * string doesn't match the expected format.
 */
function wallClockToMinutes(t: string): number | null {
  const m = /^(\d{1,2}):(\d{2}) (AM|PM)$/.exec(t);
  if (!m) return null;
  let h = Number(m[1]);
  const min = Number(m[2]);
  const ampm = m[3];
  if (h === 12) h = 0;
  if (ampm === "PM") h += 12;
  return h * 60 + min;
}

/**
 * Resolve a group heading's aria-label to an ISO YYYY-MM-DD key in the active
 * timezone. Handles "Today", "Yesterday", and "<Weekday>, <Mon> <D>" (year
 * inferred by finding the most recent year whose weekday matches). Returns
 * null if the heading doesn't parse.
 */
function resolveHeadingKey(aria: string, todayKey: string, yesterdayKey: string): string | null {
  const headingRe =
    /^(Today|Yesterday|(Sunday|Monday|Tuesday|Wednesday|Thursday|Friday|Saturday), (Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec) (\d{1,2}))/;
  const match = headingRe.exec(aria);
  if (!match) return null;
  const [, whole, weekdayName, monthName, dayStr] = match;
  if (whole === "Today") return todayKey;
  if (whole === "Yesterday") return yesterdayKey;
  if (!weekdayName || !monthName || !dayStr) return null;
  const monthIdx = MONTHS_SHORT.indexOf(monthName as (typeof MONTHS_SHORT)[number]);
  const day = Number(dayStr);
  const nowYear = Number(todayKey.slice(0, 4));
  for (const y of [nowYear, nowYear - 1]) {
    const wd = new Date(Date.UTC(y, monthIdx, day)).getUTCDay();
    if (WEEKDAYS[wd] === weekdayName) {
      return `${y}-${String(monthIdx + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    }
  }
  return null;
}

async function assertGroupedHistoryDates(page: Page, tz: string, label: string) {
  const groupButtons = page.locator(
    'button[aria-label*="Swipe or use left and right arrow keys to toggle"]',
  );
  const count = await groupButtons.count();
  if (count === 0) return; // account has no logged doses in this env — nothing to assert

  const { today, yesterday } = await localDayKeys(page);
  const headingRe =
    /^(Today|Yesterday|(Sunday|Monday|Tuesday|Wednesday|Thursday|Friday|Saturday), (Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec) (\d{1,2}))/;
  const timeRe = /^\d{1,2}:\d{2} (AM|PM)$/;

  // ---- Group-order invariant: headings resolve to ISO keys that are strictly
  // DESCENDING by local calendar date. If UTC parsing bled into the grouping
  // key, two events straddling local midnight would collapse into one group or
  // land out of order (yesterday appearing above today, etc.). The app sorts
  // grouped days newest-first (see timeline.tsx `grouped` memo), so any
  // deviation here is a real regression, not a cosmetic sort choice.
  const groupKeys: { index: number; aria: string; key: string }[] = [];
  for (let i = 0; i < count; i++) {
    const aria = (await groupButtons.nth(i).getAttribute("aria-label")) ?? "";
    const key = resolveHeadingKey(aria, today, yesterday);
    if (key) groupKeys.push({ index: i, aria, key });
  }
  for (let i = 1; i < groupKeys.length; i++) {
    const prev = groupKeys[i - 1];
    const curr = groupKeys[i];
    expect(
      prev.key > curr.key,
      `${label}: group order not strictly descending by local date in tz=${tz}: ` +
        `"${prev.aria}" (${prev.key}) at #${prev.index} then "${curr.aria}" (${curr.key}) at #${curr.index}`,
    ).toBe(true);
  }
  // Uniqueness: no two groups share a local date. A duplicate would prove the
  // grouping key drifted between events on the same local day.
  const seen = new Set<string>();
  for (const g of groupKeys) {
    expect(seen.has(g.key), `${label}: duplicate group for local date ${g.key} in tz=${tz}`).toBe(
      false,
    );
    seen.add(g.key);
  }

  // Cap at first 5 groups — enough to catch drift without a slow full sweep.
  const sampleCount = Math.min(count, 5);
  for (let i = 0; i < sampleCount; i++) {
    const btn = groupButtons.nth(i);
    const aria = (await btn.getAttribute("aria-label")) ?? "";
    const match = headingRe.exec(aria);
    expect(match, `${label}: group #${i} heading "${aria}"`).not.toBeNull();
    if (!match) continue;

    const [, whole, weekdayName, monthName, dayStr] = match;

    // Only absolute-date headings carry weekday/month info to cross-check.
    if (weekdayName && monthName && dayStr) {
      // Guess the year: the heading omits it, but the date must fall in the
      // last 12 months. Pick the most recent {year} for which (month, day)
      // yields the claimed weekday.
      const monthIdx = MONTHS_SHORT.indexOf(monthName as (typeof MONTHS_SHORT)[number]);
      const day = Number(dayStr);
      const nowYear = Number(today.slice(0, 4));
      let matched: string | null = null;
      for (const y of [nowYear, nowYear - 1]) {
        const wd = new Date(Date.UTC(y, monthIdx, day)).getUTCDay();
        if (WEEKDAYS[wd] === weekdayName) {
          matched = `${y}-${String(monthIdx + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
          break;
        }
      }
      expect(
        matched,
        `${label}: "${whole}" weekday does not match its date in tz=${tz}`,
      ).not.toBeNull();
    } else if (whole === "Today") {
      // Sanity: the app claims a "Today" group exists — the browser's local
      // today key must be a real ISO date (already true by construction, but
      // we log it into the assertion trail for triage).
      expect(today, `${label}: local today in ${tz}`).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    } else if (whole === "Yesterday") {
      expect(yesterday, `${label}: local yesterday in ${tz}`).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }

    // Expand the group and check dose-row times render as local wall-clock.
    const expanded = (await btn.getAttribute("aria-expanded")) === "true";
    if (!expanded) {
      await btn.scrollIntoViewIfNeeded();
      await btn.click();
    }
    const panelId = await btn.getAttribute("aria-controls");
    if (!panelId) continue;
    const panel = page.locator(`#${panelId}`);
    const rows = panel.locator('li[aria-label*=","]');
    const rowCount = await rows.count();
    // Full sweep (not sampled): every row must render a wall-clock time AND
    // the sequence must be monotonically non-increasing minute-of-day. The
    // app fetches events ordered by scheduled_at DESC (see timeline.tsx
    // line ~111) and preserves that order when grouping, so within one
    // local-date group the wall-clock times must step downward. If a UTC
    // ordering leaked in, an event whose UTC instant is earlier but whose
    // local wall-clock is later would land out of order here — e.g. a
    // 09:00 PM local event appearing above 11:00 PM local on the same day
    // in a positive-offset zone like Tokyo.
    const minutes: number[] = [];
    for (let r = 0; r < rowCount; r++) {
      const rowAria = (await rows.nth(r).getAttribute("aria-label")) ?? "";
      const time = rowAria.split(",")[0]?.trim() ?? "";
      expect(time, `${label}: group #${i} row #${r} time "${time}" not local wall-clock`).toMatch(
        timeRe,
      );
      const mm = wallClockToMinutes(time);
      expect(mm, `${label}: group #${i} row #${r} unparseable time "${time}"`).not.toBeNull();
      if (mm !== null) minutes.push(mm);
    }
    for (let r = 1; r < minutes.length; r++) {
      expect(
        minutes[r] <= minutes[r - 1],
        `${label}: group #${i} rows not ordered by local time desc in tz=${tz}: ` +
          `row #${r - 1}=${minutes[r - 1]}min then row #${r}=${minutes[r]}min ` +
          `(aria "${(await rows.nth(r - 1).getAttribute("aria-label")) ?? ""}" → ` +
          `"${(await rows.nth(r).getAttribute("aria-label")) ?? ""}")`,
      ).toBe(true);
    }
  }

  // Boundary-day pass: sweep every group heading looking for entries whose
  // day is either the 1st of a month or the last day of a month. These are
  // the exact dates where UTC-parse drift shifts a Sunday into Saturday (or
  // pushes a Jul 31 into Aug 1). Assert weekday-vs-date alignment for every
  // boundary hit — full loop, no sampling.
  for (let i = 0; i < count; i++) {
    const aria = (await groupButtons.nth(i).getAttribute("aria-label")) ?? "";
    const match = headingRe.exec(aria);
    if (!match) continue;
    const [, , weekdayName, monthName, dayStr] = match;
    if (!weekdayName || !monthName || !dayStr) continue;

    const day = Number(dayStr);
    const monthIdx = MONTHS_SHORT.indexOf(monthName as (typeof MONTHS_SHORT)[number]);
    const nowYear = Number(today.slice(0, 4));
    // Resolve which year this heading belongs to via the weekday it claims.
    let year: number | null = null;
    for (const y of [nowYear, nowYear - 1]) {
      if (WEEKDAYS[new Date(Date.UTC(y, monthIdx, day)).getUTCDay()] === weekdayName) {
        year = y;
        break;
      }
    }
    if (year === null) continue; // already asserted above

    // Last day of this month (JS: day 0 of next month).
    const lastDom = new Date(Date.UTC(year, monthIdx + 1, 0)).getUTCDate();
    const isBoundary = day === 1 || day === lastDom;
    if (!isBoundary) continue;

    const expectedWeekday = WEEKDAYS[new Date(Date.UTC(year, monthIdx, day)).getUTCDay()];
    expect(
      weekdayName,
      `${label}: boundary heading "${aria}" (${year}-${String(monthIdx + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}) expected ${expectedWeekday} in tz=${tz}`,
    ).toBe(expectedWeekday);
  }
}
