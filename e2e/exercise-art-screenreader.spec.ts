import { test, expect } from "./utils";
import {
  activeElementInfo,
  openYogaWorkoutSheet,
  settle,
  yogaLightbox,
  yogaThumbnail,
} from "./exercise-art-helpers";

/**
 * Screen-reader contract for the workout-type illustration modal.
 *
 * VoiceOver and TalkBack cannot be driven from CI, so this suite asserts the
 * inputs they read: the computed accessibility tree (roles, accessible names,
 * accessible descriptions), the focus moves that trigger announcements, and
 * the absence of duplicate text that would make the caption be read twice.
 * The manual pass on real devices is scripted in
 * docs/accessibility/exercise-art-screen-reader.md — this suite is what keeps
 * that pass from silently regressing between device checks.
 *
 * What a screen reader announces on open, in order:
 *   1. "<Type> illustration, full size"  (dialog accessible name)
 *   2. "dialog"                          (role)
 *   3. the caption sentence              (accessible description)
 */

/** Reads the computed accessible name/description the way an AT would. */
async function accInfo(page: import("@playwright/test").Page, selector: string) {
  return page.evaluate((sel) => {
    const el = document.querySelector(sel);
    if (!el) return null;
    const text = (node: Element | null) => (node?.textContent ?? "").replace(/\s+/g, " ").trim();
    const fromIds = (attr: string) =>
      (el.getAttribute(attr) ?? "")
        .split(/\s+/)
        .filter(Boolean)
        .map((id) => text(document.getElementById(id)))
        .filter(Boolean)
        .join(" ");
    return {
      role: el.getAttribute("role"),
      ariaModal: el.getAttribute("aria-modal"),
      name: el.getAttribute("aria-label") || fromIds("aria-labelledby"),
      description: fromIds("aria-describedby"),
      /** Every string an AT would voice while swiping through the dialog. */
      spoken: Array.from(el.querySelectorAll("*"))
        .filter(
          (n) =>
            !n.closest('[aria-hidden="true"]') && n.children.length === 0 && text(n).length > 0,
        )
        .map((n) => text(n)),
    };
  }, selector);
}

const DIALOG = '[role="dialog"][data-art-dialog="Yoga"]';

test.describe("illustration modal screen-reader announcements", () => {
  test.use({ viewport: { width: 390, height: 844 } });
  test.describe.configure({ timeout: 120_000 });

  test("trigger exposes name, popup type and expanded state", async ({ authedPage: page }) => {
    await openYogaWorkoutSheet(page);
    const thumb = yogaThumbnail(page);
    await expect(thumb).toBeVisible();

    // The trigger's name must carry both the label and the caption, because on
    // a touch screen reader this is the only text read before activation.
    const label = await thumb.getAttribute("aria-label");
    expect(label).toMatch(/^Enlarge Yoga illustration\. .+/);
    expect(label!.length).toBeGreaterThan("Enlarge Yoga illustration. ".length + 10);

    // The decorative bitmap must not add a second, redundant announcement.
    const innerImg = thumb.locator("img").first();
    expect(await innerImg.getAttribute("alt")).toBe("");
    expect(await innerImg.getAttribute("aria-hidden")).toBe("true");

    expect(await thumb.getAttribute("aria-haspopup")).toBe("dialog");
    expect(await thumb.getAttribute("aria-expanded")).toBe("false");

    await thumb.focus();
    await page.keyboard.press("Enter");
    await expect(yogaLightbox(page)).toBeVisible();
    // State change is what TalkBack reports as "expanded". Query by CSS, not by
    // role: while the dialog is open Radix inerts the background, so the
    // trigger is (correctly) absent from the accessibility tree.
    await expect(page.locator('button[aria-label^="Enlarge Yoga illustration"]')).toHaveAttribute(
      "aria-expanded",
      "true",
    );
  });

  test("dialog announces label then caption, exactly once each", async ({ authedPage: page }) => {
    await openYogaWorkoutSheet(page);
    const thumb = yogaThumbnail(page);
    await thumb.focus();
    await page.keyboard.press("Enter");

    const dialog = yogaLightbox(page);
    await expect(dialog).toBeVisible();
    await settle(page);

    const info = (await accInfo(page, DIALOG))!;
    expect(info).not.toBeNull();

    // 1. Name — what VoiceOver reads immediately after "dialog". It must come
    // from a referenced DialogTitle (aria-labelledby), not a bare aria-label:
    // that is the one naming pattern VO/TalkBack/NVDA/JAWS all announce.
    expect(info.name).toBe("Yoga illustration, full size");
    const dialogEl = page.locator(DIALOG);
    await expect(dialogEl).toHaveAttribute("aria-labelledby", /.+/);
    expect(await dialogEl.getAttribute("aria-label")).toBeNull();
    // The referenced node must actually exist and hold the name.
    const titleText = await page
      .locator(`#${(await dialogEl.getAttribute("aria-labelledby"))!}`)
      .innerText();
    expect(titleText.replace(/\s+/g, " ").trim()).toBe("Yoga illustration, full size");
    // 2. Modality — without this, both readers keep exposing the page behind.
    expect(info.ariaModal).toBe("true");
    // 3. Description — the caption sentence, resolved through aria-describedby.
    expect(info.description.length).toBeGreaterThan(10);

    // The described-by target must be the *visible* caption, so swiping to the
    // caption repeats nothing new rather than voicing a hidden clone.
    const captionText = (await dialog.locator('figcaption span[id$="-desc"]').innerText())
      .replace(/\s+/g, " ")
      .trim();
    expect(info.description).toBe(captionText);

    // No sentence may appear twice in the readable text of the dialog.
    const duplicates = info.spoken.filter((t, i) => t.length > 12 && info.spoken.indexOf(t) !== i);
    expect(duplicates).toEqual([]);

    // The label line is present and distinct from the description.
    expect(info.spoken.some((t) => t === "Yoga")).toBe(true);
    expect(info.description).not.toBe("Yoga");

    // The full-size bitmap is decorative: the caption already says it.
    const img = dialog.locator("img").first();
    expect(await img.getAttribute("alt")).toBe("");
    expect(await img.getAttribute("aria-hidden")).toBe("true");
  });

  test("focus enters the dialog on open and returns to the trigger on close", async ({
    authedPage: page,
  }) => {
    await openYogaWorkoutSheet(page);
    const thumb = yogaThumbnail(page);
    await thumb.focus();
    await page.keyboard.press("Enter");

    const dialog = yogaLightbox(page);
    await expect(dialog).toBeVisible();

    // Focus must land inside the dialog — this is the move that makes both
    // readers switch context and start reading the dialog.
    await expect
      .poll(async () => (await activeElementInfo(page))?.insideArtDialog, { timeout: 5_000 })
      .toBe(true);

    // The page behind must be inert/hidden so swipe navigation cannot escape it.
    // Report the offenders rather than a bare boolean, so a regression names
    // the element that stayed exposed.
    const exposedOutside = await page.evaluate(() => {
      const dlg = document.querySelector('[data-art-dialog][aria-modal="true"]');
      if (!dlg) return ["no modal dialog found"];
      return Array.from(document.body.children)
        .filter((el) => !el.contains(dlg))
        .filter(
          (el) =>
            !(
              el.getAttribute("aria-hidden") === "true" ||
              el.hasAttribute("inert") ||
              el.getAttribute("data-aria-hidden") === "true" ||
              (el.textContent ?? "").trim() === ""
            ),
        )
        .map((el) => `${el.tagName.toLowerCase()}.${el.className || "(no class)"}`);
    });
    // Nested-dialog quirk: when the lightbox opens from inside the workout
    // sheet, Radix's aria-hidden manager hides the sheet's portal but restores
    // the app root (it was already hidden by the sheet). aria-modal="true" on
    // the lightbox is what keeps VoiceOver/TalkBack confined in that case, so
    // either real hiding or a declared modal boundary is acceptable — but one
    // of them must hold.
    const declaresModal = await dialog.getAttribute("aria-modal");
    if (exposedOutside.length > 0) {
      expect(declaresModal).toBe("true");
      // Whatever is still exposed must not be the sheet the modal came from.
      expect(exposedOutside.join(" ")).not.toContain('role="dialog"');
    } else {
      expect(exposedOutside).toEqual([]);
    }

    // The close button must be reachable and specifically named — "Close"
    // alone is ambiguous when several dialogs exist on a screen.
    const close = dialog.getByRole("button", { name: "Close Yoga illustration" });
    await expect(close).toBeVisible();
    expect(await close.getAttribute("aria-label")).toBe("Close Yoga illustration");
    // The X glyph must not add a second announcement.
    expect(await close.locator("svg").getAttribute("aria-hidden")).toBe("true");

    await page.keyboard.press("Escape");
    await expect(dialog).toBeHidden();

    // Focus return is what tells a screen-reader user where they came back to.
    const after = await activeElementInfo(page);
    // Focus must leave the lightbox. It lands back on the thumbnail, which
    // still lives inside the workout sheet dialog — so scope the check to the
    // illustration modal rather than "any dialog".
    expect(after?.insideArtDialog).toBe(false);
    expect(after?.label ?? "").toMatch(/^Enlarge Yoga illustration/);
    await expect(thumb).toHaveAttribute("aria-expanded", "false");
  });
});
